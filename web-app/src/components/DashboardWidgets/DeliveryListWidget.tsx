/**
 * Delivery List Widget
 * 
 * Shows a list of props that are on order, sorted by expected delivery date
 * to help track incoming deliveries.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Calendar, Package, ArrowLeft } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import type { DashboardWidgetProps } from './types';
import type { Prop } from '../../types/props';

interface DeliveryListWidgetProps extends DashboardWidgetProps {
  props?: Prop[];
}

// Component for displaying prop image with fallback
const PropImageDisplay: React.FC<{ prop: Prop }> = ({ prop }) => {
  const [imageError, setImageError] = React.useState(false);
  
  // Get image URL from various sources
  const imageUrl = prop.imageUrl || 
                  prop.primaryImageUrl || 
                  (prop.images && prop.images.length > 0 ? prop.images[0].url : null) ||
                  (prop.images && prop.images.find(img => img.isMain)?.url);
  
  if (!imageUrl || imageError) {
    return (
      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-pb-darker border border-pb-primary/20 flex items-center justify-center">
        <Package className="w-6 h-6 text-pb-gray opacity-50" />
      </div>
    );
  }
  
  return (
    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-pb-darker border border-pb-primary/20">
      <img
        src={imageUrl}
        alt={prop.name}
        className="w-full h-full object-cover"
        onError={() => {
          setImageError(true);
        }}
      />
    </div>
  );
};

export const DeliveryListWidget: React.FC<DeliveryListWidgetProps> = ({
  props = [],
}) => {
  // Filter and sort props on order by delivery date
  const deliveryProps = useMemo(() => {
    const onOrderProps = props.filter(prop => {
      const status = String(prop.status || '').toLowerCase();
      return status === 'on_order' && prop.estimatedDeliveryDate;
    });

    // Sort by delivery date (soonest first)
    return onOrderProps.sort((a, b) => {
      const dateA = a.estimatedDeliveryDate ? new Date(a.estimatedDeliveryDate).getTime() : 0;
      const dateB = b.estimatedDeliveryDate ? new Date(b.estimatedDeliveryDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [props]);

  const formatDeliveryDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getDeliveryStatus = (dateString?: string) => {
    if (!dateString) return 'info';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'critical';
    if (diffDays <= 3) return 'high';
    if (diffDays <= 7) return 'medium';
    return 'info';
  };

  if (deliveryProps.length === 0) {
    return (
      <WidgetContainer
        title="Delivery List"
        icon={<Truck className="w-5 h-5" />}
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center h-full py-8 text-pb-gray">
          <Truck className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No props on order</p>
        </div>
      </WidgetContainer>
    );
  }

  const overdueCount = deliveryProps.filter(prop => {
    if (!prop.estimatedDeliveryDate) return false;
    const date = new Date(prop.estimatedDeliveryDate);
    return date.getTime() < new Date().getTime();
  }).length;

  const dueSoonCount = deliveryProps.filter(prop => {
    if (!prop.estimatedDeliveryDate) return false;
    const date = new Date(prop.estimatedDeliveryDate);
    const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  return (
    <WidgetContainer
      title="Delivery List"
      icon={<Truck className="w-5 h-5" />}
      className="h-full"
      headerActions={
        <Link
          to="/props?status=on_order"
          className="text-xs text-pb-primary hover:text-pb-primary-light transition-colors"
        >
          View All
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-pb-gray">Total:</span>
            <span className="font-medium text-pb-primary">{deliveryProps.length}</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-pb-gray">Overdue:</span>
              <span className="font-medium text-red-500">{overdueCount}</span>
            </div>
          )}
          {dueSoonCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-pb-gray">Due Soon:</span>
              <span className="font-medium text-orange-500">{dueSoonCount}</span>
            </div>
          )}
        </div>

        {/* Props List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {deliveryProps.slice(0, 10).map((prop) => {
            const status = getDeliveryStatus(prop.estimatedDeliveryDate);
            const statusColors = {
              critical: 'bg-red-500/10 text-red-500 border-red-500/20',
              high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
              medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
              info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            };

            return (
              <Link
                key={prop.id}
                to={`/props/${prop.id}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-pb-darker border border-pb-primary/10 hover:border-pb-primary/30 transition-colors group"
              >
                <PropImageDisplay prop={prop} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-pb-primary group-hover:text-pb-primary-light transition-colors truncate">
                      {prop.name || 'Unnamed Prop'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${statusColors[status]}`}>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDeliveryDate(prop.estimatedDeliveryDate)}</span>
                    </div>
                    {prop.courier && (
                      <span className="text-xs text-pb-gray">
                        via {prop.courier}
                      </span>
                    )}
                  </div>
                  {prop.trackingNumber && (
                    <div className="mt-1 text-xs text-pb-gray">
                      Tracking: {prop.trackingNumber}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {deliveryProps.length > 10 && (
          <div className="pt-2 border-t border-pb-primary/10">
            <Link
              to="/props?status=on_order"
              className="text-xs text-pb-primary hover:text-pb-primary-light transition-colors flex items-center gap-1"
            >
              View {deliveryProps.length - 10} more
              <ArrowLeft className="w-3 h-3 rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

