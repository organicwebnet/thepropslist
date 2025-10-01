import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface SubscriptionMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  paidUsers: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalRevenue: number;
  churnRate: number;
  conversionRate: number;
}

export interface PlanBreakdown {
  planId: string;
  planName: string;
  userCount: number;
  revenue: number;
  percentage: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
  activeSubscriptions: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  lastLoginAt: string;
  photoURL?: string;
}

class SubscriptionsAnalyticsService {
  /**
   * Get comprehensive subscription metrics
   */
  async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    try {
      // Get all user profiles
      const userProfilesRef = collection(db, 'userProfiles');
      const userProfilesSnapshot = await getDocs(userProfilesRef);
      
      const users = userProfilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate metrics
      const totalUsers = users.length;
      const freeUsers = users.filter(user => 
        !(user as any).subscriptionPlan || (user as any).subscriptionPlan === 'free'
      ).length;
      const paidUsers = totalUsers - freeUsers;
      
      const activeSubscriptions = users.filter(user => 
        (user as any).subscriptionStatus === 'active' && (user as any).subscriptionPlan !== 'free'
      ).length;

      // Calculate revenue (simplified - you might want to get this from Stripe)
      const monthlyRevenue = users
        .filter(user => (user as any).subscriptionPlan === 'starter' && (user as any).subscriptionStatus === 'active')
        .length * 9; // $9 for starter monthly
      
      const yearlyRevenue = users
        .filter(user => (user as any).subscriptionPlan === 'standard' && (user as any).subscriptionStatus === 'active')
        .length * 190; // $190 for standard yearly
      
      const totalRevenue = monthlyRevenue + yearlyRevenue;

      // Calculate conversion rate
      const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

      // Calculate churn rate (simplified - you'd need historical data for accurate calculation)
      const churnRate = 5; // Placeholder - implement based on your churn calculation logic

      return {
        totalUsers,
        activeSubscriptions,
        freeUsers,
        paidUsers,
        monthlyRevenue,
        yearlyRevenue,
        totalRevenue,
        churnRate,
        conversionRate
      };
    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      throw new Error('Failed to fetch subscription metrics');
    }
  }

  /**
   * Get plan breakdown
   */
  async getPlanBreakdown(): Promise<PlanBreakdown[]> {
    try {
      const userProfilesRef = collection(db, 'userProfiles');
      const userProfilesSnapshot = await getDocs(userProfilesRef);
      
      const users = userProfilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const planCounts: { [key: string]: { count: number; revenue: number } } = {
        free: { count: 0, revenue: 0 },
        starter: { count: 0, revenue: 0 },
        standard: { count: 0, revenue: 0 },
        pro: { count: 0, revenue: 0 }
      };

      // Count users by plan
      users.forEach(user => {
        const plan = (user as any).subscriptionPlan || 'free';
        if (planCounts[plan]) {
          planCounts[plan].count++;
          
          // Calculate revenue based on plan
          if (plan === 'starter' && (user as any).subscriptionStatus === 'active') {
            planCounts[plan].revenue += 9; // Monthly
          } else if (plan === 'standard' && (user as any).subscriptionStatus === 'active') {
            planCounts[plan].revenue += 19; // Monthly
          } else if (plan === 'pro' && (user as any).subscriptionStatus === 'active') {
            planCounts[plan].revenue += 39; // Monthly
          }
        }
      });

      const totalUsers = users.length;
      // const totalRevenue = Object.values(planCounts).reduce((sum, plan) => sum + plan.revenue, 0); // Not used in current implementation

      return Object.entries(planCounts).map(([planId, data]) => ({
        planId,
        planName: this.getPlanDisplayName(planId),
        userCount: data.count,
        revenue: data.revenue,
        percentage: totalUsers > 0 ? (data.count / totalUsers) * 100 : 0
      }));
    } catch (error) {
      console.error('Error fetching plan breakdown:', error);
      throw new Error('Failed to fetch plan breakdown');
    }
  }

  /**
   * Get recent users
   */
  async getRecentUsers(limitCount: number = 10): Promise<UserProfile[]> {
    try {
      const userProfilesRef = collection(db, 'userProfiles');
      const q = query(
        userProfilesRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as UserProfile));
    } catch (error) {
      console.error('Error fetching recent users:', error);
      throw new Error('Failed to fetch recent users');
    }
  }

  /**
   * Get users by subscription plan
   */
  async getUsersByPlan(planId: string): Promise<UserProfile[]> {
    try {
      const userProfilesRef = collection(db, 'userProfiles');
      const q = query(
        userProfilesRef,
        where('subscriptionPlan', '==', planId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as UserProfile));
    } catch (error) {
      console.error('Error fetching users by plan:', error);
      throw new Error('Failed to fetch users by plan');
    }
  }

  /**
   * Get user growth data (simplified - you'd want to implement proper date aggregation)
   */
  async getUserGrowthData(days: number = 30): Promise<UserGrowthData[]> {
    try {
      // This is a simplified implementation
      // In a real app, you'd want to aggregate data by date
      const userProfilesRef = collection(db, 'userProfiles');
      const snapshot = await getDocs(userProfilesRef);
      
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group by creation date (simplified)
      const growthData: UserGrowthData[] = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const newUsers = users.filter(user => {
          const userDate = new Date((user as any).createdAt);
          return userDate.toISOString().split('T')[0] === dateStr;
        }).length;
        
        const totalUsers = users.filter(user => {
          const userDate = new Date((user as any).createdAt);
          return userDate <= date;
        }).length;
        
        const activeSubscriptions = users.filter(user => {
          const userDate = new Date((user as any).createdAt);
          return userDate <= date && 
                 (user as any).subscriptionStatus === 'active' && 
                 (user as any).subscriptionPlan !== 'free';
        }).length;
        
        growthData.push({
          date: dateStr,
          newUsers,
          totalUsers,
          activeSubscriptions
        });
      }
      
      return growthData;
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      throw new Error('Failed to fetch user growth data');
    }
  }

  /**
   * Get plan display name
   */
  private getPlanDisplayName(planId: string): string {
    const planNames: { [key: string]: string } = {
      free: 'Free',
      starter: 'Starter',
      standard: 'Standard',
      pro: 'Pro'
    };
    
    return planNames[planId] || planId;
  }

  /**
   * Get subscription status color
   */
  getSubscriptionStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      active: 'text-green-400 bg-green-500/10 border-green-500/30',
      inactive: 'text-red-400 bg-red-500/10 border-red-500/30',
      canceled: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
      past_due: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    };
    
    return colors[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }

  /**
   * Get plan color
   */
  getPlanColor(planId: string): string {
    const colors: { [key: string]: string } = {
      free: 'bg-gray-500',
      starter: 'bg-blue-500',
      standard: 'bg-purple-500',
      pro: 'bg-yellow-500'
    };
    
    return colors[planId] || 'bg-gray-500';
  }
}

export const subscriptionsAnalyticsService = new SubscriptionsAnalyticsService();
