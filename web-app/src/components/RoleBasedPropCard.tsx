import { Prop } from '../types/props';
import { UserProfile } from '../../shared/types/auth';
import { useRoleBasedDataView } from '../../../src/hooks/useRoleBasedDataView';
import { PropFieldCategory } from '../../../src/shared/types/dataViews';

interface RoleBasedPropCardProps {
  prop: Prop;
  user: UserProfile | null;
  onPress?: (prop: Prop) => void;
  onQuickAction?: (action: string, prop: Prop) => void;
  showId?: string;
}

export function RoleBasedPropCard({ 
  prop, 
  user, 
  onPress, 
  onQuickAction,
  showId 
}: RoleBasedPropCardProps) {
  const { 
    dataView, 
    loading, 
    error, 
    isFieldVisible, 
    getPriorityFields, 
    getQuickActions 
  } = useRoleBasedDataView(user, showId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-5">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-5">
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!dataView) {
    return (
      <div className="flex items-center justify-center p-5">
        <div className="text-red-500 text-sm">No data view available</div>
      </div>
    );
  }

  const priorityFields = getPriorityFields();
  const quickActions = getQuickActions();
  const config = dataView.config;

  const renderField = (fieldName: string, value: any) => {
    if (!isFieldVisible(fieldName)) return null;

    const isPriority = priorityFields.includes(fieldName);
    const fieldDef = getFieldDefinition(fieldName);

    return (
      <div key={fieldName} className={`mb-1 ${isPriority ? 'bg-gray-50 p-2 rounded mb-2' : ''}`}>
        <div className={`text-xs font-medium text-gray-500 mb-1 ${isPriority ? 'text-gray-700 font-semibold' : ''}`}>
          {fieldDef?.label || fieldName}:
        </div>
        <div className={`text-sm text-gray-900 ${isPriority ? 'font-medium' : ''}`}>
          {formatFieldValue(fieldName, value)}
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    if (quickActions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
        {quickActions.map((action: string) => (
          <button
            key={action}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium transition-colors"
            onClick={() => onQuickAction?.(action, prop)}
          >
            {formatActionLabel(action)}
          </button>
        ))}
      </div>
    );
  };

  const renderImages = () => {
    if (!config.showImages || !prop.images || prop.images.length === 0) return null;

    return (
      <div className="flex gap-2 mb-3">
        {prop.images.slice(0, 2).map((image, index) => (
          <img
            key={index}
            src={image.url}
            alt={`${prop.name} image ${index + 1}`}
            className="w-15 h-15 object-cover rounded"
          />
        ))}
      </div>
    );
  };

  const renderStatusIndicator = () => {
    if (!config.showStatusIndicators || !prop.status) return null;

    return (
      <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(prop.status)}`}>
        {prop.status}
      </div>
    );
  };

  const cardLayoutClass = getCardLayoutClass(config.cardLayout);

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${cardLayoutClass}`}
      onClick={() => onPress?.(prop)}
    >
      {/* Header with name and status */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
          {prop.name}
        </h3>
        {renderStatusIndicator()}
      </div>

      {/* Images */}
      {renderImages()}

      {/* Priority fields first */}
      {priorityFields.map(fieldName => {
        const value = prop[fieldName as keyof Prop];
        return renderField(fieldName, value);
      })}

      {/* Other visible fields */}
      {Object.entries(prop).map(([fieldName, value]) => {
        if (priorityFields.includes(fieldName)) return null; // Already rendered
        return renderField(fieldName, value);
      })}

      {/* Quick actions */}
      {renderQuickActions()}
    </div>
  );
}

// Helper functions
function getFieldDefinition(_fieldName: string) {
  const fieldLabels: Record<string, string> = {
    location: 'Location',
    currentLocation: 'Current Location',
    act: 'Act',
    scene: 'Scene',
    description: 'Description',
    usageInstructions: 'Usage Instructions',
    maintenanceNotes: 'Maintenance Notes',
    condition: 'Condition',
    status: 'Status',
    category: 'Category',
    price: 'Price',
    quantity: 'Quantity',
    dimensions: 'Dimensions',
    weight: 'Weight',
    source: 'Source',
    safetyNotes: 'Safety Notes',
    isHazardous: 'Hazardous',
    isBreakable: 'Breakable',
  };

  return {
    label: fieldLabels[_fieldName] || _fieldName,
    category: PropFieldCategory.ADMINISTRATIVE,
    priority: 'medium' as const,
  };
}

function formatFieldValue(_fieldName: string, value: any): string {
  if (value === null || value === undefined) return 'N/A';
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'None';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

function formatActionLabel(action: string): string {
  const actionLabels: Record<string, string> = {
    updateLocation: 'Update Location',
    addMaintenanceNote: 'Add Note',
    reportIssue: 'Report Issue',
    markReady: 'Mark Ready',
    updateStatus: 'Update Status',
    addNote: 'Add Note',
    uploadImage: 'Add Image',
    requestMaterials: 'Request Materials',
    updateDescription: 'Edit Description',
    addImage: 'Add Image',
    updatePrice: 'Update Price',
    findSource: 'Find Source',
    updateShipping: 'Update Shipping',
    editProp: 'Edit',
    deleteProp: 'Delete',
    duplicateProp: 'Duplicate',
    exportData: 'Export',
    manageTeam: 'Manage Team',
    manageSystem: 'Manage System',
    customizeViews: 'Customize',
    viewDetails: 'View Details',
  };

  return actionLabels[action] || action;
}

function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    ready: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    needs_work: 'bg-red-500',
    pending: 'bg-gray-500',
    completed: 'bg-green-500',
    damaged: 'bg-red-500',
    missing: 'bg-red-500',
  };

  return statusColors[status] || 'bg-gray-500';
}

function getCardLayoutClass(layout: 'compact' | 'detailed' | 'minimal'): string {
  switch (layout) {
    case 'compact':
      return 'p-3';
    case 'minimal':
      return 'p-2';
    case 'detailed':
    default:
      return 'p-4';
  }
}
