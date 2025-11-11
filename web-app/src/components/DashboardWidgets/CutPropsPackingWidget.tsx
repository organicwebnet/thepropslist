/**
 * Cut Props Packing Widget
 * 
 * Shows a list of props that have been cut from the show, grouped by packing destination
 * to help the props supervisor pack them correctly.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowLeft, Box } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import type { DashboardWidgetProps } from './types';
import type { Prop } from '../../types/props';

interface CutPropsPackingWidgetProps extends DashboardWidgetProps {
  props?: Prop[];
}

interface GroupedCutProps {
  returnToSource: Prop[];
  keepInCutBox: Prop[];
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

export const CutPropsPackingWidget: React.FC<CutPropsPackingWidgetProps> = ({
  props = [],
}) => {
  // Filter and group cut props by packing destination
  const groupedCutProps = useMemo((): GroupedCutProps => {
    const cutProps = props.filter(prop => {
      // Check if prop status is 'cut' (status may be string even if typed differently)
      const status = String(prop.status || '').toLowerCase();
      return status === 'cut';
    });

    const returnToSource: Prop[] = [];
    const keepInCutBox: Prop[] = [];

    cutProps.forEach(prop => {
      const source = prop.source?.toLowerCase() || '';
      
      // Props that need to go back: hired, rented, borrowed
      if (source === 'hired' || source === 'rented' || source === 'borrowed') {
        returnToSource.push(prop);
      } 
      // Props that stay with company: bought
      else if (source === 'bought') {
        keepInCutBox.push(prop);
      }
      // For other sources (made, owned, created), default to keeping in cut box
      else {
        keepInCutBox.push(prop);
      }
    });

    return {
      returnToSource,
      keepInCutBox,
    };
  }, [props]);

  const totalCutProps = groupedCutProps.returnToSource.length + groupedCutProps.keepInCutBox.length;

  const renderPropList = (propsList: Prop[], maxItems: number = 10) => {
    if (propsList.length === 0) return null;

    return (
      <div className="space-y-2">
        {propsList.slice(0, maxItems).map((prop) => (
          <Link
            key={prop.id}
            to={`/props/${prop.id}`}
            className="block p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 border border-pb-primary/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white mb-1 truncate">
                  {prop.name}
                </div>
                {prop.source && (
                  <div className="text-xs text-pb-gray">
                    Source: <span className="capitalize">{prop.source}</span>
                  </div>
                )}
                {prop.category && (
                  <div className="text-xs text-pb-gray mt-1">
                    Category: {prop.category}
                  </div>
                )}
              </div>
              <PropImageDisplay prop={prop} />
            </div>
          </Link>
        ))}
        {propsList.length > maxItems && (
          <div className="text-xs text-pb-gray text-center pt-2">
            +{propsList.length - maxItems} more prop{propsList.length - maxItems === 1 ? '' : 's'}
          </div>
        )}
      </div>
    );
  };

  return (
    <WidgetContainer
      widgetId="cut-props-packing"
      title="Cut Props Packing"
      loading={false}
    >
      {totalCutProps === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No cut props to pack</p>
          <p className="text-pb-gray text-xs mt-1">Props with status "cut" will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Return to Source Section */}
          {groupedCutProps.returnToSource.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeft className="w-4 h-4 text-orange-400" />
                <h4 className="text-sm font-semibold text-white">
                  Return to Source ({groupedCutProps.returnToSource.length})
                </h4>
              </div>
              <p className="text-xs text-pb-gray mb-3">
                These props need to be returned to their source (hired, rented, or borrowed)
              </p>
              {renderPropList(groupedCutProps.returnToSource)}
            </div>
          )}

          {/* Keep in Cut Box Section */}
          {groupedCutProps.keepInCutBox.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Box className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">
                  Cut Box - Keep ({groupedCutProps.keepInCutBox.length})
                </h4>
              </div>
              <p className="text-xs text-pb-gray mb-3">
                These props stay with the company and should be packed in the cut box
              </p>
              {renderPropList(groupedCutProps.keepInCutBox)}
            </div>
          )}

          {/* View All Link */}
          {totalCutProps > 0 && (
            <div className="pt-4 border-t border-pb-primary/20">
              <Link
                to={`/props?status=cut`}
                className="text-sm text-pb-primary hover:text-pb-secondary underline flex items-center gap-1"
              >
                View all {totalCutProps} cut prop{totalCutProps === 1 ? '' : 's'} →
              </Link>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

