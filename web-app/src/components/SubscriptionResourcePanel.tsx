import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Package2, 
  Calendar, 
  Box, 
  Users, 
  Archive,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { Link } from 'react-router-dom';
import type { Prop } from '../types/props';
import type { BoardData } from '../types/taskManager';

interface ResourceUsage {
  shows: { used: number; limit: number; };
  props: { used: number; limit: number; };
  packingBoxes: { used: number; limit: number; };
  boards: { used: number; limit: number; };
  collaborators: { used: number; limit: number; };
  archivedShows: { used: number; limit: number; };
}

const SubscriptionResourcePanel: React.FC = () => {
  const { plan, effectiveLimits, canPurchaseAddOns } = useSubscription();
  const { service } = useFirebase();
  const { user } = useWebAuth();
  const [usage, setUsage] = useState<ResourceUsage>({
    shows: { used: 0, limit: 0 },
    props: { used: 0, limit: 0 },
    packingBoxes: { used: 0, limit: 0 },
    boards: { used: 0, limit: 0 },
    collaborators: { used: 0, limit: 0 },
    archivedShows: { used: 0, limit: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUsageData = async () => {
      try {
        setLoading(true);
        
        // Fetch all shows for the user
        const shows = await service.getDocuments('shows', {
          where: [['userId', '==', user.uid]]
        });
        
        // Fetch all props for the user's shows
        const showIds = shows.map(show => show.id);
        let allProps: Prop[] = [];
        
        if (showIds.length > 0) {
          const propsPromises = showIds.map(showId => 
            service.getDocuments('props', {
              where: [['showId', '==', showId]]
            })
          );
          const propsResults = await Promise.all(propsPromises);
          allProps = propsResults.flat().map(doc => ({ ...doc.data, id: doc.id } as Prop));
        }
        
        // Fetch all boards for the user's shows
        let allBoards: BoardData[] = [];
        if (showIds.length > 0) {
          const boardsPromises = showIds.map(showId => 
            service.getDocuments('todo_boards', {
              where: [['showId', '==', showId]]
            })
          );
          const boardsResults = await Promise.all(boardsPromises);
          allBoards = boardsResults.flat().map(doc => ({ ...doc.data, id: doc.id } as BoardData));
        }
        
        // Count packing boxes (assuming they're stored as a field in props or shows)
        const packingBoxesCount = allProps.reduce((count, prop) => {
          // Assuming packing boxes are counted from props with a specific category or field
          // This might need adjustment based on your actual data structure
          return count + (prop.quantity || 1);
        }, 0);
        
        // For now, we'll use a simplified approach for collaborators
        // In a real implementation, you'd count unique collaborators across all shows
        const collaboratorsCount = shows.reduce((count, show) => {
          return count + ((show.data as any).collaborators?.length || 0);
        }, 0);
        
        // Count archived shows (assuming there's an archived field)
        const archivedShowsCount = shows.filter(show => (show.data as any).archived).length;
        
        setUsage({
          shows: { used: shows.length, limit: effectiveLimits.shows },
          props: { used: allProps.length, limit: effectiveLimits.props },
          packingBoxes: { used: packingBoxesCount, limit: effectiveLimits.packingBoxes },
          boards: { used: allBoards.length, limit: effectiveLimits.boards },
          collaborators: { used: collaboratorsCount, limit: effectiveLimits.collaboratorsPerShow },
          archivedShows: { used: archivedShowsCount, limit: effectiveLimits.archivedShows },
        });
      } catch (error) {
        console.error('Error fetching usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [user, service, effectiveLimits]);

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (used: number, limit: number) => {
    const percentage = getUsagePercentage(used, limit);
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUpgradeText = () => {
    if (plan === 'free') {
      return 'Upgrade Plan';
    }
    if (canPurchaseAddOns) {
      return 'Buy Add-Ons';
    }
    return 'Upgrade';
  };

  const getUpgradeLink = () => {
    if (plan === 'free') {
      return '/profile';
    }
    if (canPurchaseAddOns) {
      return '/profile?tab=addons';
    }
    return '/profile';
  };

  const resourceItems = [
    {
      key: 'shows' as keyof ResourceUsage,
      label: 'Shows',
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      key: 'props' as keyof ResourceUsage,
      label: 'Props',
      icon: Package2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      key: 'packingBoxes' as keyof ResourceUsage,
      label: 'Packing Boxes',
      icon: Box,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    {
      key: 'boards' as keyof ResourceUsage,
      label: 'Boards',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      key: 'collaborators' as keyof ResourceUsage,
      label: 'Collaborators',
      icon: Users,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20'
    },
    {
      key: 'archivedShows' as keyof ResourceUsage,
      label: 'Archived Shows',
      icon: Archive,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20'
    }
  ];

  if (loading) {
    return (
      <div className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-6 border border-pb-primary/20">
        <div className="flex items-center space-x-2 mb-4">
          <Crown className="w-5 h-5 text-pb-accent" />
          <h3 className="text-lg font-semibold text-white">Subscription Resources</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-pb-gray">Loading usage data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-pb-darker/50 backdrop-blur-sm rounded-2xl p-6 border border-pb-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Crown className="w-5 h-5 text-pb-accent" />
          <h3 className="text-lg font-semibold text-white">Subscription Resources</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            plan === 'free' ? 'bg-gray-500/20 text-gray-400' :
            plan === 'starter' ? 'bg-blue-500/20 text-blue-400' :
            plan === 'standard' ? 'bg-purple-500/20 text-purple-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {plan?.toUpperCase() || 'FREE'}
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {resourceItems.map((item) => {
          const resourceUsage = usage[item.key];
          const percentage = getUsagePercentage(resourceUsage.used, resourceUsage.limit);
          const isAtLimit = resourceUsage.used >= resourceUsage.limit;
          const isNearLimit = resourceUsage.used >= resourceUsage.limit * 0.8;
          
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                    <item.icon className={`w-3 h-3 ${item.color}`} />
                  </div>
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-pb-gray'
                  }`}>
                    {resourceUsage.used} / {resourceUsage.limit}
                  </span>
                  {isAtLimit && (
                    <Zap className="w-3 h-3 text-red-400" />
                  )}
                </div>
              </div>
              
              {/* Bar Chart */}
              <div className="w-full bg-pb-primary/10 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${getUsageColor(resourceUsage.used, resourceUsage.limit)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Upgrade Button */}
      <div className="mt-6 pt-4 border-t border-pb-primary/20">
        <Link
          to={getUpgradeLink()}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-pb-primary to-pb-accent hover:from-pb-primary/80 hover:to-pb-accent/80 text-white rounded-lg transition-all duration-200 font-medium"
        >
          <Crown className="w-4 h-4" />
          <span>{getUpgradeText()}</span>
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionResourcePanel;
