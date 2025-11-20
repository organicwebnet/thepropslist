import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Prop } from '../shared/types/props';
import { UserProfile } from '../shared/types/auth';
import { useRoleBasedDataView } from '../shared/hooks/useRoleBasedDataView';
import { PropFieldCategory } from '../shared/types/dataViews';

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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!dataView) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No data view available</Text>
      </View>
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
      <View key={fieldName} style={[styles.fieldContainer, isPriority && styles.priorityField]}>
        <Text style={[styles.fieldLabel, isPriority && styles.priorityFieldLabel]}>
          {fieldDef?.label || fieldName}:
        </Text>
        <Text style={[styles.fieldValue, isPriority && styles.priorityFieldValue]}>
          {formatFieldValue(fieldName, value)}
        </Text>
      </View>
    );
  };

  const renderQuickActions = () => {
    if (quickActions.length === 0) return null;

    return (
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action}
            style={styles.quickActionButton}
            onPress={() => onQuickAction?.(action, prop)}
          >
            <Text style={styles.quickActionText}>
              {formatActionLabel(action)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderImages = () => {
    if (!config.showImages || !prop.images || prop.images.length === 0) return null;

    return (
      <View style={styles.imagesContainer}>
        {prop.images.slice(0, 2).map((image: any, index: number) => (
          <Image
            key={index}
            source={{ uri: image.url }}
            style={styles.propImage}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  };

  const renderStatusIndicator = () => {
    if (!config.showStatusIndicators || !prop.status) return null;

    return (
      <View style={[styles.statusIndicator, getStatusColor(prop.status)]}>
        <Text style={styles.statusText}>{prop.status}</Text>
      </View>
    );
  };

  // Compact card view - show only essential information
  const firstImage = prop.images && prop.images.length > 0 ? prop.images[0] : null;
  
  return (
    <TouchableOpacity 
      style={styles.compactCard}
      onPress={() => onPress?.(prop)}
      activeOpacity={0.7}
    >
      {/* Compact header with image, name and status */}
      <View style={styles.compactHeader}>
        {/* Image on the left */}
        {firstImage ? (
          <Image
            source={{ uri: firstImage.url }}
            style={styles.compactPropImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.compactImagePlaceholder}>
            <Text style={styles.compactImagePlaceholderText}>
              {(prop.name?.[0] || 'P').toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={styles.compactNameContainer}>
          <Text style={styles.compactPropName} numberOfLines={1}>
            {prop.name}
          </Text>
          {prop.category && (
            <Text style={styles.compactCategory} numberOfLines={1}>
              {prop.category}
            </Text>
          )}
        </View>
        {prop.status && (
          <View style={[styles.compactStatusBadge, getStatusColor(prop.status)]}>
            <Text style={styles.compactStatusText} numberOfLines={1}>
              {prop.status.replace(/_/g, ' ')}
            </Text>
          </View>
        )}
      </View>

      {/* Optional: Show description if available and short */}
      {prop.description && prop.description.length < 100 && (
        <Text style={styles.compactDescription} numberOfLines={2}>
          {prop.description}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Helper functions
function getFieldDefinition(fieldName: string) {
  // This would typically come from the field definitions
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
    label: fieldLabels[fieldName] || fieldName,
    category: PropFieldCategory.ADMINISTRATIVE,
    priority: 'medium' as const,
  };
}

function formatFieldValue(fieldName: string, value: any): string {
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

function getStatusColor(status: string) {
  const statusColors: Record<string, string> = {
    ready: '#10B981',
    in_progress: '#F59E0B',
    needs_work: '#EF4444',
    pending: '#6B7280',
    completed: '#10B981',
    damaged: '#EF4444',
    missing: '#EF4444',
    available: '#10B981',
    'in-use': '#3B82F6',
    maintenance: '#F59E0B',
    retired: '#6B7280',
    unknown: '#6B7280',
  };

  return { backgroundColor: statusColors[status.toLowerCase()] || '#6B7280' };
}

function getCardLayoutStyle(layout: 'compact' | 'detailed' | 'minimal') {
  switch (layout) {
    case 'compact':
      return styles.compactCard;
    case 'minimal':
      return styles.minimalCard;
    case 'detailed':
    default:
      return styles.detailedCard;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  compactPropImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  compactImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactImagePlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  compactNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  compactPropName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  compactCategory: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  compactStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  compactDescription: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 6,
    lineHeight: 18,
  },
  minimalCard: {
    padding: 6,
  },
  detailedCard: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  propName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  propImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 8,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  priorityField: {
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  priorityFieldLabel: {
    color: '#374151',
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  priorityFieldValue: {
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickActionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 4,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
