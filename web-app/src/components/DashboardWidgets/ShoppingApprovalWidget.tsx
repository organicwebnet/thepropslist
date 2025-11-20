/**
 * Shopping Approval Widget
 * 
 * Shows shopping items with options that need approval (status: 'pending')
 * to help supervisors review and approve shopping options.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Clock, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import type { DashboardWidgetProps } from './types';
import type { ShoppingItem, ShoppingOption } from '../../shared/types/shopping';
import { useFirebase } from '../../contexts/FirebaseContext';
import { ShoppingService } from '../../shared/services/shoppingService';
import type { FirebaseDocument } from '../../shared/services/firebase/types';

interface ShoppingApprovalWidgetProps extends DashboardWidgetProps {
  shoppingItems?: ShoppingItem[];
}

interface ItemWithPendingOptions {
  item: ShoppingItem;
  pendingOptions: ShoppingOption[];
  totalPendingCount: number;
  oldestPendingDate?: Date;
}

// Component for displaying option image with fallback
const OptionImageDisplay: React.FC<{ option: ShoppingOption }> = ({ option }) => {
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = option.images && option.images.length > 0 ? option.images[0] : null;
  
  if (!imageUrl || imageError) {
    return (
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-pb-darker border border-pb-primary/20 flex items-center justify-center">
        <ImageIcon className="w-5 h-5 text-pb-gray opacity-50" />
      </div>
    );
  }
  
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-pb-darker border border-pb-primary/20">
      <img
        src={imageUrl}
        alt="Option"
        className="w-full h-full object-cover"
        onError={() => {
          setImageError(true);
        }}
      />
    </div>
  );
};

export const ShoppingApprovalWidget: React.FC<ShoppingApprovalWidgetProps> = ({
  showId,
  shoppingItems: propShoppingItems,
}) => {
  const { service } = useFirebase();
  const [shoppingItems, setShoppingItems] = useState<FirebaseDocument<ShoppingItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load shopping items if not provided as prop
  useEffect(() => {
    if (propShoppingItems) {
      // Convert prop items to FirebaseDocument format
      setShoppingItems(
        propShoppingItems.map(item => ({
          id: item.id,
          data: item,
        }))
      );
      setLoading(false);
      return;
    }

    if (!showId || !service) {
      setLoading(false);
      return;
    }

    const shoppingService = new ShoppingService(service);
    setLoading(true);
    setError(null);

    const unsubscribe = shoppingService.listenToShoppingItems(
      (itemDocs) => {
        setShoppingItems(itemDocs);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading shopping items:', err);
        setError(err.message || 'Failed to load shopping items');
        setLoading(false);
      },
      showId
    );

    return unsubscribe;
  }, [showId, service, propShoppingItems]);

  // Filter items with pending options
  const itemsWithPendingOptions = useMemo((): ItemWithPendingOptions[] => {
    const now = new Date();
    const items: ItemWithPendingOptions[] = [];

    shoppingItems.forEach((itemDoc) => {
      const item = itemDoc.data;
      if (!item || !item.options || item.options.length === 0) return;

      // Find all pending options
      const pendingOptions = item.options.filter(
        (option: ShoppingOption) => option.status === 'pending'
      );

      if (pendingOptions.length === 0) return;

      // Find oldest pending option date
      let oldestPendingDate: Date | undefined;
      pendingOptions.forEach((option: ShoppingOption) => {
        const optionDate = option.createdAt 
          ? new Date(option.createdAt) 
          : option.addedAt 
          ? new Date(option.addedAt)
          : null;
        
        if (optionDate && (!oldestPendingDate || optionDate < oldestPendingDate)) {
          oldestPendingDate = optionDate;
        }
      });

      items.push({
        item,
        pendingOptions,
        totalPendingCount: pendingOptions.length,
        oldestPendingDate,
      });
    });

    // Sort by oldest pending date first (most urgent), then by total pending count
    return items.sort((a, b) => {
      if (a.oldestPendingDate && b.oldestPendingDate) {
        return a.oldestPendingDate.getTime() - b.oldestPendingDate.getTime();
      }
      if (a.oldestPendingDate) return -1;
      if (b.oldestPendingDate) return 1;
      return b.totalPendingCount - a.totalPendingCount;
    });
  }, [shoppingItems]);

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    return `£${value.toFixed(2)}`;
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysAgo = (date: Date | undefined): string => {
    if (!date) return '';
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const renderItem = (itemWithOptions: ItemWithPendingOptions) => {
    const { item, pendingOptions, oldestPendingDate } = itemWithOptions;
    const firstPendingOption = pendingOptions[0];

    return (
      <Link
        key={item.id}
        to={`/shopping?itemId=${item.id}`}
        className="block p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 border border-pb-primary/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-1 rounded text-xs font-semibold bg-orange-500 text-white">
                {pendingOptions.length} PENDING
              </div>
              {oldestPendingDate && (
                <div className="flex items-center gap-1 text-xs text-pb-gray">
                  <Clock className="w-3 h-3" />
                  <span>{getDaysAgo(oldestPendingDate)}</span>
                </div>
              )}
            </div>
            <div className="font-medium text-sm text-white mb-1 truncate">
              {item.description}
            </div>
            {firstPendingOption && (
              <div className="text-xs text-pb-gray space-y-1">
                {firstPendingOption.shopName && (
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    <span>{firstPendingOption.shopName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>Price: {formatCurrency(firstPendingOption.price)}</span>
                  {item.budget && (
                    <span className={`${
                      firstPendingOption.price > item.budget 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      (Budget: {formatCurrency(item.budget)})
                    </span>
                  )}
                </div>
                {firstPendingOption.uploadedByName && (
                  <div className="text-xs text-pb-gray">
                    Uploaded by: {firstPendingOption.uploadedByName}
                  </div>
                )}
              </div>
            )}
            {pendingOptions.length > 1 && (
              <div className="text-xs text-pb-gray mt-1">
                +{pendingOptions.length - 1} more option{pendingOptions.length - 1 === 1 ? '' : 's'} pending
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs px-2 py-0.5 rounded bg-pb-darker/50 text-pb-gray capitalize">
                {item.type}
              </div>
              {item.status && (
                <div className="text-xs px-2 py-0.5 rounded bg-pb-darker/50 text-pb-gray capitalize">
                  {item.status}
                </div>
              )}
            </div>
          </div>
          {firstPendingOption && (
            <OptionImageDisplay option={firstPendingOption} />
          )}
        </div>
      </Link>
    );
  };

  return (
    <WidgetContainer
      widgetId="shopping-approval-needed"
      title="Shopping Items Needing Approval"
      loading={loading}
      error={error}
    >
      {itemsWithPendingOptions.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No options need approval</p>
          <p className="text-pb-gray text-xs mt-1">Shopping options pending approval will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Show items with pending options */}
          {itemsWithPendingOptions.slice(0, 5).map(itemWithOptions => renderItem(itemWithOptions))}
          
          {itemsWithPendingOptions.length > 5 && (
            <div className="text-xs text-pb-gray text-center pt-2">
              +{itemsWithPendingOptions.length - 5} more item{itemsWithPendingOptions.length - 5 === 1 ? '' : 's'} with pending options
            </div>
          )}

          {/* View All Link */}
          <div className="pt-4 border-t border-pb-primary/20">
            <Link
              to="/shopping"
              className="text-sm text-pb-primary hover:text-pb-secondary underline flex items-center gap-1"
            >
              View all {itemsWithPendingOptions.length} item{itemsWithPendingOptions.length === 1 ? '' : 's'} needing approval →
            </Link>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

