import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority } from '../../types/lifecycle';

interface StatusDropdownMobileProps {
  currentStatus: PropLifecycleStatus;
  onStatusChange: (newStatus: PropLifecycleStatus) => Promise<void>;
  disabled?: boolean;
}

export const StatusDropdownMobile: React.FC<StatusDropdownMobileProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [localStatus, setLocalStatus] = useState<PropLifecycleStatus>(currentStatus);

  // Update local status when prop status changes externally
  React.useEffect(() => {
    setLocalStatus(currentStatus);
  }, [currentStatus]);

  const handleStatusSelect = async (newStatus: PropLifecycleStatus) => {
    if (newStatus === localStatus || disabled || isUpdating) {
      setShowModal(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
      setLocalStatus(newStatus);
      setShowModal(false);
    } catch (error: any) {
      Alert.alert('Error', `Failed to update status: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: PropLifecycleStatus) => {
    const priority = lifecycleStatusPriority[status];
    switch (priority) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#6b7280';
      case 'active':
        return '#3b82f6';
      default:
        return '#8b5cf6';
    }
  };

  const statusOptions = Object.keys(lifecycleStatusLabels) as PropLifecycleStatus[];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
        ]}
        onPress={() => !disabled && !isUpdating && setShowModal(true)}
        disabled={disabled || isUpdating}
      >
        <View style={styles.dropdownContent}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(localStatus) },
            ]}
          />
          <Text style={styles.dropdownText} numberOfLines={1}>
            {lifecycleStatusLabels[localStatus] || localStatus}
          </Text>
          {!disabled && !isUpdating && (
            <MaterialIcons name="arrow-drop-down" size={20} color="#ffffff" />
          )}
          {isUpdating && (
            <MaterialIcons name="hourglass-empty" size={16} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={statusOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = item === localStatus;
                const statusColor = getStatusColor(item);
                return (
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      isSelected && styles.statusOptionSelected,
                    ]}
                    onPress={() => handleStatusSelect(item)}
                  >
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        isSelected && styles.statusOptionTextSelected,
                      ]}
                    >
                      {lifecycleStatusLabels[item]}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.statusList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dropdownButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdownText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusList: {
    maxHeight: 400,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  statusOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusOptionText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  statusOptionTextSelected: {
    fontWeight: '600',
  },
});

