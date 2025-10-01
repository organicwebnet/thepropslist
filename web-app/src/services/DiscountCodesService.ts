import { doc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, runTransaction, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  value: number; // Percentage (0-100) or fixed amount in cents
  currency?: string;
  maxRedemptions?: number;
  timesRedeemed: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  appliesTo: 'all' | 'specific_plans';
  planIds?: string[];
  stripeCouponId?: string;
  stripePromotionCodeId?: string;
  createdAt: string;
  createdBy: string;
  lastUsed?: string;
}

export interface DiscountUsage {
  id: string;
  discountCodeId: string;
  userId: string;
  userEmail: string;
  planId: string;
  amount: number;
  discountAmount: number;
  usedAt: string;
  stripeSessionId?: string;
}

export interface DiscountAnalytics {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  mostUsedCode: string;
  averageDiscount: number;
}

interface CachedDiscountCode extends DiscountCode {
  cachedAt: number;
}

class DiscountCodesService {
  private readonly COLLECTION = 'discountCodes';
  private readonly USAGE_COLLECTION = 'discountUsage';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private cache = new Map<string, CachedDiscountCode>();

  /**
   * Sanitize discount code input
   */
  private sanitizeDiscountCode(code: string): string {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Validate discount code format
   */
  private validateDiscountCodeFormat(code: string): { valid: boolean; error?: string } {
    if (!code || code.length < 3) {
      return { valid: false, error: 'Discount code must be at least 3 characters long' };
    }
    
    if (code.length > 20) {
      return { valid: false, error: 'Discount code must be 20 characters or less' };
    }
    
    if (!/^[A-Z0-9]+$/.test(code)) {
      return { valid: false, error: 'Discount code can only contain letters and numbers' };
    }
    
    return { valid: true };
  }

  /**
   * Validate discount value
   */
  private validateDiscountValue(type: 'percentage' | 'fixed_amount', value: number): { valid: boolean; error?: string } {
    if (value <= 0) {
      return { valid: false, error: 'Discount value must be greater than 0' };
    }
    
    if (type === 'percentage' && value > 100) {
      return { valid: false, error: 'Percentage discount cannot exceed 100%' };
    }
    
    if (type === 'fixed_amount' && value > 10000) {
      return { valid: false, error: 'Fixed amount discount cannot exceed $100' };
    }
    
    return { valid: true };
  }

  /**
   * Create a new discount code
   */
  async createDiscountCode(discountData: Omit<DiscountCode, 'id' | 'timesRedeemed' | 'createdAt' | 'createdBy'>): Promise<string> {
    try {
      // Sanitize and validate input
      const sanitizedCode = this.sanitizeDiscountCode(discountData.code);
      
      const formatValidation = this.validateDiscountCodeFormat(sanitizedCode);
      if (!formatValidation.valid) {
        throw new Error(formatValidation.error);
      }
      
      const valueValidation = this.validateDiscountValue(discountData.type, discountData.value);
      if (!valueValidation.valid) {
        throw new Error(valueValidation.error);
      }

      // Check if code already exists
      const existingCode = await this.getDiscountCodeByCode(sanitizedCode);
      if (existingCode) {
        throw new Error('Discount code already exists');
      }

      // Create Stripe coupon first
      const createStripeCoupon = httpsCallable(getFunctions(), 'createStripeCoupon');
      const stripeResult = await createStripeCoupon({
        id: sanitizedCode,
        name: discountData.name.trim(),
        percent_off: discountData.type === 'percentage' ? discountData.value : undefined,
        amount_off: discountData.type === 'fixed_amount' ? discountData.value * 100 : undefined, // Convert to cents
        currency: discountData.currency || 'usd',
        max_redemptions: discountData.maxRedemptions,
        redeem_by: new Date(discountData.validUntil).getTime() / 1000
      });

      const stripeCouponId = (stripeResult.data as any).couponId;

      // Create promotion code
      const createPromotionCode = httpsCallable(getFunctions(), 'createStripePromotionCode');
      const promotionResult = await createPromotionCode({
        coupon: stripeCouponId,
        code: sanitizedCode,
        active: discountData.active
      });

      const stripePromotionCodeId = (promotionResult.data as any).promotionCodeId;

      // Save to Firestore
      const docRef = doc(collection(db, this.COLLECTION));
      const discountCode: DiscountCode = {
        id: docRef.id,
        ...discountData,
        code: sanitizedCode,
        name: discountData.name.trim(),
        description: discountData.description?.trim() || '',
        timesRedeemed: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'admin', // You'd get this from auth context
        stripeCouponId,
        stripePromotionCodeId
      };

      await setDoc(docRef, discountCode);
      return docRef.id;
    } catch (error) {
      console.error('Error creating discount code:', error);
      throw new Error('Failed to create discount code');
    }
  }

  /**
   * Get all discount codes
   */
  async getAllDiscountCodes(): Promise<DiscountCode[]> {
    try {
      const snapshot = await getDocs(collection(db, this.COLLECTION));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DiscountCode));
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      throw new Error('Failed to fetch discount codes');
    }
  }

  /**
   * Get active discount codes
   */
  async getActiveDiscountCodes(): Promise<DiscountCode[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('active', '==', true),
        where('validUntil', '>', new Date().toISOString())
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DiscountCode));
    } catch (error) {
      console.error('Error fetching active discount codes:', error);
      throw new Error('Failed to fetch active discount codes');
    }
  }

  /**
   * Get discount code by code string with caching
   */
  async getDiscountCodeByCode(code: string): Promise<DiscountCode | null> {
    try {
      const sanitizedCode = this.sanitizeDiscountCode(code);
      
      // Check cache first
      const cached = this.cache.get(sanitizedCode);
      if (cached && Date.now() - cached.cachedAt < this.CACHE_DURATION) {
        return cached;
      }
      
      const q = query(
        collection(db, this.COLLECTION),
        where('code', '==', sanitizedCode)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      const discountCode = {
        id: doc.id,
        ...doc.data()
      } as DiscountCode;
      
      // Cache the result
      this.cache.set(sanitizedCode, {
        ...discountCode,
        cachedAt: Date.now()
      });
      
      return discountCode;
    } catch (error) {
      console.error('Error fetching discount code by code:', error);
      throw new Error('Failed to fetch discount code');
    }
  }

  /**
   * Clear cache (useful for testing or when data changes)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(code: string, planId: string): Promise<{ valid: boolean; discount?: DiscountCode; error?: string }> {
    try {
      const discountCode = await this.getDiscountCodeByCode(code);
      
      if (!discountCode) {
        return { valid: false, error: 'Discount code not found' };
      }

      if (!discountCode.active) {
        return { valid: false, error: 'Discount code is inactive' };
      }

      const now = new Date();
      const validFrom = new Date(discountCode.validFrom);
      const validUntil = new Date(discountCode.validUntil);

      if (now < validFrom) {
        return { valid: false, error: 'Discount code is not yet valid' };
      }

      if (now > validUntil) {
        return { valid: false, error: 'Discount code has expired' };
      }

      if (discountCode.maxRedemptions && discountCode.timesRedeemed >= discountCode.maxRedemptions) {
        return { valid: false, error: 'Discount code has reached maximum redemptions' };
      }

      if (discountCode.appliesTo === 'specific_plans' && !discountCode.planIds?.includes(planId)) {
        return { valid: false, error: 'Discount code is not valid for this plan' };
      }

      return { valid: true, discount: discountCode };
    } catch (error) {
      console.error('Error validating discount code:', error);
      return { valid: false, error: 'Failed to validate discount code' };
    }
  }

  /**
   * Update discount code
   */
  async updateDiscountCode(id: string, updates: Partial<DiscountCode>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating discount code:', error);
      throw new Error('Failed to update discount code');
    }
  }

  /**
   * Record discount usage with atomic transaction
   */
  async recordDiscountUsage(usage: Omit<DiscountUsage, 'id'>): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        // Get current discount code data
        const discountDocRef = doc(db, this.COLLECTION, usage.discountCodeId);
        const discountDoc = await transaction.get(discountDocRef);
        
        if (!discountDoc.exists()) {
          throw new Error('Discount code not found');
        }
        
        const discountData = discountDoc.data() as DiscountCode;
        
        // Check if max redemptions reached
        if (discountData.maxRedemptions && discountData.timesRedeemed >= discountData.maxRedemptions) {
          throw new Error('Discount code has reached maximum redemptions');
        }
        
        // Record usage in Firestore
        const usageDocRef = doc(collection(db, this.USAGE_COLLECTION));
        transaction.set(usageDocRef, {
          id: usageDocRef.id,
          ...usage
        });

        // Update discount code redemption count atomically
        transaction.update(discountDocRef, {
          timesRedeemed: discountData.timesRedeemed + 1,
          lastUsed: usage.usedAt
        });
      });
    } catch (error) {
      console.error('Error recording discount usage:', error);
      throw new Error('Failed to record discount usage');
    }
  }

  /**
   * Get discount usage analytics
   */
  async getDiscountAnalytics(): Promise<DiscountAnalytics> {
    try {
      const codesSnapshot = await getDocs(collection(db, this.COLLECTION));
      const usageSnapshot = await getDocs(collection(db, this.USAGE_COLLECTION));

      const codes = codesSnapshot.docs.map(doc => doc.data() as DiscountCode);
      const usage = usageSnapshot.docs.map(doc => doc.data() as DiscountUsage);

      const totalCodes = codes.length;
      const activeCodes = codes.filter(code => code.active && new Date(code.validUntil) > new Date()).length;
      const totalRedemptions = usage.length;
      const totalDiscountGiven = usage.reduce((sum, u) => sum + u.discountAmount, 0);

      // Find most used code
      const codeUsageCount: { [key: string]: number } = {};
      usage.forEach(u => {
        codeUsageCount[u.discountCodeId] = (codeUsageCount[u.discountCodeId] || 0) + 1;
      });

      const mostUsedCodeId = Object.keys(codeUsageCount).reduce((a, b) => 
        codeUsageCount[a] > codeUsageCount[b] ? a : b, ''
      );

      const mostUsedCode = codes.find(c => c.id === mostUsedCodeId)?.code || 'N/A';
      const averageDiscount = totalRedemptions > 0 ? totalDiscountGiven / totalRedemptions : 0;

      return {
        totalCodes,
        activeCodes,
        totalRedemptions,
        totalDiscountGiven,
        mostUsedCode,
        averageDiscount
      };
    } catch (error) {
      console.error('Error fetching discount analytics:', error);
      throw new Error('Failed to fetch discount analytics');
    }
  }

  /**
   * Get discount usage history
   */
  async getDiscountUsageHistory(limitCount: number = 50): Promise<DiscountUsage[]> {
    try {
      const q = query(
        collection(db, this.USAGE_COLLECTION),
        orderBy('usedAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DiscountUsage));
    } catch (error) {
      console.error('Error fetching discount usage history:', error);
      throw new Error('Failed to fetch discount usage history');
    }
  }

  /**
   * Calculate discount amount
   */
  calculateDiscountAmount(originalAmount: number, discountCode: DiscountCode): number {
    if (discountCode.type === 'percentage') {
      return (originalAmount * discountCode.value) / 100;
    } else {
      // Fixed amount
      return Math.min(discountCode.value, originalAmount);
    }
  }

  /**
   * Format discount code for display
   */
  formatDiscountCode(discountCode: DiscountCode): string {
    if (discountCode.type === 'percentage') {
      return `${discountCode.value}% off`;
    } else {
      return `$${discountCode.value} off`;
    }
  }

  /**
   * Check if discount code is valid for a plan
   */
  isDiscountValidForPlan(discountCode: DiscountCode, planId: string): boolean {
    if (discountCode.appliesTo === 'all') return true;
    if (discountCode.appliesTo === 'specific_plans') {
      return discountCode.planIds?.includes(planId) || false;
    }
    return false;
  }
}

export const discountCodesService = new DiscountCodesService();
