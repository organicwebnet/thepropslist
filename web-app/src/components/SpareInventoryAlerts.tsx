import React from 'react';
import { Prop } from '../types/props';
import { Link } from 'react-router-dom';
import { checkLowInventory, getQuantityBreakdown, shouldUseSparesLogic } from '../utils/propQuantityUtils';

interface SpareInventoryAlertsProps {
  props: Prop[];
  onDismiss?: (propId: string) => void;
}

export const SpareInventoryAlerts: React.FC<SpareInventoryAlertsProps> = ({ props, onDismiss }) => {
  const lowInventoryProps = props.filter(prop => shouldUseSparesLogic(prop) && checkLowInventory(prop));

  if (lowInventoryProps.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-yellow-200 font-semibold mb-2">
            Low Spare Inventory Alert ({lowInventoryProps.length} {lowInventoryProps.length === 1 ? 'prop' : 'props'})
          </div>
          <div className="space-y-2">
            {lowInventoryProps.map(prop => {
              const breakdown = getQuantityBreakdown(prop);
              return (
                <div key={prop.id} className="flex items-center justify-between bg-yellow-500/10 rounded p-2">
                  <Link 
                    to={`/props/${prop.id}`}
                    className="flex-1 text-yellow-100 hover:text-yellow-50 transition-colors"
                  >
                    <div className="font-medium">{prop.name}</div>
                    <div className="text-sm text-yellow-200/80">
                      Only {breakdown.inStorage} spare{breakdown.inStorage !== 1 ? 's' : ''} remaining
                      {breakdown.inUse > 0 && ` (${breakdown.inUse} in use)`}
                    </div>
                  </Link>
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(prop.id)}
                      className="ml-2 text-yellow-300 hover:text-yellow-100 transition-colors"
                      title="Dismiss alert"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

