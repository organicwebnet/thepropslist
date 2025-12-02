import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority } from '../../types/lifecycle';

interface StatusDropdownMobileProps {
  currentStatus: PropLifecycleStatus;
  propId?: string; // Optional propId for updating additional fields
  onStatusChange: (newStatus: PropLifecycleStatus, additionalData?: { cutPropsStorageContainer?: string; estimatedDeliveryDate?: string; notes?: string }) => Promise<void>;
  disabled?: boolean;
}

export const StatusDropdownMobile: React.FC<StatusDropdownMobileProps> = ({
  currentStatus,
  propId,
  onStatusChange,
  disabled = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showCutContainerModal, setShowCutContainerModal] = useState(false);
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);
  const [showReplacementReasonModal, setShowReplacementReasonModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cutContainerInput, setCutContainerInput] = useState('');
  const [deliveryDateInput, setDeliveryDateInput] = useState('');
  const [replacementReasonInput, setReplacementReasonInput] = useState('');
  const [detailsNotesInput, setDetailsNotesInput] = useState('');
  const [repairDetailsInput, setRepairDetailsInput] = useState('');
  const [pendingStatus, setPendingStatus] = useState<PropLifecycleStatus | null>(null);
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

    // Handle missing prop - show modal first
    if (newStatus === 'missing') {
      setPendingStatus(newStatus);
      setShowModal(false);
      setShowMissingModal(true);
      return;
    }

    // Handle cut status - prompt for storage container
    if (newStatus === 'cut') {
      setPendingStatus(newStatus);
      setShowModal(false);
      setShowCutContainerModal(true);
      return;
    }

    // Handle on_order status - prompt for delivery date
    if (newStatus === 'on_order') {
      setPendingStatus(newStatus);
      setShowModal(false);
      setShowDeliveryDateModal(true);
      return;
    }

    // Handle statuses that require details (repair, damage, maintenance, etc.)
    const statusesRequiringDetails: PropLifecycleStatus[] = [
      'damaged_awaiting_repair',
      'damaged_awaiting_replacement',
      'out_for_repair',
      'under_maintenance',
      'needs_modifying'
    ];
    
    if (statusesRequiringDetails.includes(newStatus)) {
      setPendingStatus(newStatus);
      setShowModal(false);
      setShowDetailsModal(true);
      return;
    }

    // For other statuses, proceed directly
    await proceedWithStatusChange(newStatus);
  };

  const proceedWithStatusChange = async (newStatus: PropLifecycleStatus, additionalData?: { cutPropsStorageContainer?: string; estimatedDeliveryDate?: string; notes?: string }) => {
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus, additionalData);
      setLocalStatus(newStatus);
      setShowModal(false);
      setShowMissingModal(false);
      setShowCutContainerModal(false);
      setShowDeliveryDateModal(false);
      setShowReplacementReasonModal(false);
      setShowDetailsModal(false);
      setCutContainerInput('');
      setDeliveryDateInput('');
      setReplacementReasonInput('');
      setDetailsNotesInput('');
      setRepairDetailsInput('');
      setPendingStatus(null);
    } catch (error: any) {
      // Check if it's a validation error (user-friendly message) or other error
      const errorMessage = error.message || 'Unknown error';
      const isValidationError = errorMessage.includes('Cannot change status from') || 
                                 errorMessage.includes('Valid options from');
      
      Alert.alert(
        isValidationError ? 'Invalid Status Change' : 'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
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

  // Filter out system statuses that shouldn't be shown in the dropdown
  const statusOptions = Object.keys(lifecycleStatusLabels)
    .filter((status) => status !== 'to_buy' && status !== 'checked_out') as PropLifecycleStatus[];

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

      {/* Missing Prop Modal */}
      <Modal
        visible={showMissingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowMissingModal(false);
          setPendingStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>Missing Prop - Action Required</Text>
            <Text style={styles.actionModalText}>
              This prop has been marked as missing. What action should be taken?
            </Text>
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cutButton]}
                onPress={async () => {
                  setShowMissingModal(false);
                  setShowCutContainerModal(true);
                }}
                accessibilityLabel="Cut from show"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Cut from Show</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.replaceButton]}
                onPress={() => {
                  setShowMissingModal(false);
                  setShowReplacementReasonModal(true);
                }}
                accessibilityLabel="Needs replacement"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Needs Replacement</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowMissingModal(false);
                  setPendingStatus(null);
                }}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cut Props Storage Container Modal */}
      <Modal
        visible={showCutContainerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCutContainerModal(false);
          setPendingStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>Storage Container Location</Text>
            <Text style={styles.actionModalText}>
              Please enter the storage container location for this cut prop:
            </Text>
            <TextInput
              style={styles.textInput}
              value={cutContainerInput}
              onChangeText={setCutContainerInput}
              placeholder="e.g., Container A, Box 3"
              placeholderTextColor="#888"
              autoFocus
              maxLength={100}
              accessibilityLabel="Storage container location input"
              accessibilityHint="Enter the storage container location for this cut prop"
            />
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => {
                  const trimmedContainer = cutContainerInput.trim();
                  if (!trimmedContainer) {
                    Alert.alert('Required', 'Storage container location is required for cut props.');
                    return;
                  }
                  // Sanitize input: remove any potentially harmful characters
                  const sanitized = trimmedContainer.replace(/[<>]/g, '');
                  const status = pendingStatus || 'cut';
                  proceedWithStatusChange(status, { cutPropsStorageContainer: sanitized });
                }}
                accessibilityLabel="Confirm storage container"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowCutContainerModal(false);
                  setCutContainerInput('');
                  setPendingStatus(null);
                }}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery Date Modal */}
      <Modal
        visible={showDeliveryDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDeliveryDateModal(false);
          setPendingStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>Expected Delivery Date</Text>
            <Text style={styles.actionModalText}>
              Please enter the expected delivery date (YYYY-MM-DD):
            </Text>
            <TextInput
              style={styles.textInput}
              value={deliveryDateInput}
              onChangeText={setDeliveryDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#888"
              autoFocus
              accessibilityLabel="Delivery date input"
              accessibilityHint="Enter the expected delivery date in YYYY-MM-DD format"
            />
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => {
                  const trimmedDate = deliveryDateInput.trim();
                  if (!trimmedDate) {
                    Alert.alert('Required', 'Delivery date is required for props on order.');
                    return;
                  }
                  // Validate date format
                  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                  if (!dateRegex.test(trimmedDate)) {
                    Alert.alert('Invalid Format', 'Please enter date in YYYY-MM-DD format.');
                    return;
                  }
                  // Validate actual date validity
                  const dateParts = trimmedDate.split('-');
                  const year = parseInt(dateParts[0], 10);
                  const month = parseInt(dateParts[1], 10);
                  const day = parseInt(dateParts[2], 10);
                  const dateObj = new Date(year, month - 1, day);
                  if (
                    dateObj.getFullYear() !== year ||
                    dateObj.getMonth() !== month - 1 ||
                    dateObj.getDate() !== day
                  ) {
                    Alert.alert('Invalid Date', 'Please enter a valid date.');
                    return;
                  }
                  const status = pendingStatus || 'on_order';
                  proceedWithStatusChange(status, { estimatedDeliveryDate: trimmedDate });
                }}
                accessibilityLabel="Confirm delivery date"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeliveryDateModal(false);
                  setDeliveryDateInput('');
                  setPendingStatus(null);
                }}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Replacement Reason Modal */}
      <Modal
        visible={showReplacementReasonModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowReplacementReasonModal(false);
          setReplacementReasonInput('');
          setPendingStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>Reason for Replacement</Text>
            <Text style={styles.actionModalText}>
              Please provide the reason for replacement:
            </Text>
            <TextInput
              style={styles.textInput}
              value={replacementReasonInput}
              onChangeText={setReplacementReasonInput}
              placeholder="Enter reason for replacement..."
              placeholderTextColor="#888"
              autoFocus
              multiline
              numberOfLines={3}
              accessibilityLabel="Replacement reason input"
              accessibilityHint="Enter the reason why this prop needs to be replaced"
            />
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => {
                  const trimmedReason = replacementReasonInput.trim();
                  const notes = trimmedReason
                    ? `Reason for replacement: ${trimmedReason}`
                    : undefined;
                  proceedWithStatusChange('damaged_awaiting_replacement', { notes });
                }}
                accessibilityLabel="Confirm replacement"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowReplacementReasonModal(false);
                  setReplacementReasonInput('');
                  setPendingStatus(null);
                }}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal for Statuses Requiring Details */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setDetailsNotesInput('');
          setRepairDetailsInput('');
          setPendingStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModalContent, { maxHeight: '80%' }]}>
            <Text style={styles.actionModalTitle}>
              {pendingStatus ? lifecycleStatusLabels[pendingStatus] : 'Status Update'} - Details Required
            </Text>
            <Text style={styles.actionModalText}>
              Please provide details about this status change. This information helps track the prop's condition and history.
            </Text>
            
            <Text style={[styles.actionModalText, { marginTop: 12, marginBottom: 8, fontWeight: '600' }]}>
              Notes (optional):
            </Text>
            <TextInput
              style={[styles.textInput, { minHeight: 80 }]}
              value={detailsNotesInput}
              onChangeText={setDetailsNotesInput}
              placeholder="Enter any notes about this status change..."
              placeholderTextColor="#888"
              autoFocus
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Status change notes input"
              accessibilityHint="Enter any notes about this status change"
            />

            {(pendingStatus === 'damaged_awaiting_repair' || 
              pendingStatus === 'out_for_repair' || 
              pendingStatus === 'under_maintenance' ||
              pendingStatus === 'needs_modifying') && (
              <>
                <Text style={[styles.actionModalText, { marginTop: 12, marginBottom: 8, fontWeight: '600' }]}>
                  Repair/Maintenance Details (recommended):
                </Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 100 }]}
                  value={repairDetailsInput}
                  onChangeText={setRepairDetailsInput}
                  placeholder="Describe what needs to be repaired or maintained..."
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  accessibilityLabel="Repair details input"
                  accessibilityHint="Describe what needs to be repaired or maintained"
                />
              </>
            )}

            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => {
                  // Combine notes and repair details
                  let combinedNotes = detailsNotesInput.trim();
                  if (repairDetailsInput.trim()) {
                    if (combinedNotes) {
                      combinedNotes += '\n\n--- Repair/Maintenance Details ---\n';
                    } else {
                      combinedNotes = '--- Repair/Maintenance Details ---\n';
                    }
                    combinedNotes += repairDetailsInput.trim();
                  }
                  
                  const status = pendingStatus;
                  if (!status) {
                    Alert.alert('Error', 'Status not set. Please try again.');
                    return;
                  }

                  // Warn if no details provided for repair-related statuses
                  if (!combinedNotes.trim() && 
                      (status === 'damaged_awaiting_repair' || 
                       status === 'out_for_repair' || 
                       status === 'under_maintenance')) {
                    Alert.alert(
                      'No Details Provided',
                      'No repair details provided. The props supervisor will need to determine what needs fixing. Continue anyway?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Continue',
                          onPress: () => {
                            proceedWithStatusChange(status, { notes: combinedNotes || '' });
                          }
                        }
                      ]
                    );
                    return;
                  }

                  proceedWithStatusChange(status, { notes: combinedNotes || '' });
                }}
                accessibilityLabel="Confirm status change"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setShowDetailsModal(false);
                  setDetailsNotesInput('');
                  setRepairDetailsInput('');
                  setPendingStatus(null);
                }}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
  actionModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  actionModalText: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  actionButtonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cutButton: {
    backgroundColor: '#ea580c',
  },
  replaceButton: {
    backgroundColor: '#dc2626',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButton: {
    backgroundColor: '#4b5563',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});



