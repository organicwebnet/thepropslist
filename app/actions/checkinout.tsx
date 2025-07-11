import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { useTheme } from '../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../src/styles/theme';
import { useFirebase } from '../../src/platforms/mobile/contexts/FirebaseContext';
import { QRScannerScreen } from '../../src/platforms/mobile/features/qr/QRScannerScreen';
import StyledText from '../../src/components/StyledText';
import type { Prop } from '../../src/shared/types/props';
import { PropLifecycleStatus, lifecycleStatusLabels, PropStatusUpdate } from '../../src/types/lifecycle';
import { useProps } from '../../src/contexts/PropsContext';
import { useAuth } from '../../src/contexts/AuthContext';

// Define the types of actions the user can take
type CheckInOutAction = 
  | 'initialScan'
  | 'selectAction'
  | 'checkingOut' // Form for checkout details
  | 'checkingIn_scanDestination' // Scan destination for check-in
  | 'updatingStatus' // Show list of statuses to pick from
  | 'editingCheckoutDetails'; // Form to edit existing checkout details

interface ScannedDestinationInfo {
  id: string;
  type: 'location' | 'box';
  name?: string;
}

export default function CheckInOutScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);
  const { service: firebaseService } = useFirebase();
  const { getPropById, updatePropLocally, props: allProps } = useProps();
  const { user } = useAuth();

  const [currentAction, setCurrentAction] = useState<CheckInOutAction>('initialScan');
  const [scannedProp, setScannedProp] = useState<Prop | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<'prop' | 'destination'>('prop');
  
  // Form states for various actions
  const [checkoutTo, setCheckoutTo] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [selectedNewStatus, setSelectedNewStatus] = useState<PropLifecycleStatus | null>(null);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to refresh scannedProp data from context if it changes
  useEffect(() => {
    if (scannedProp?.id) {
        const liveProp = allProps.find(p => p.id === scannedProp.id);
        if (liveProp && JSON.stringify(liveProp) !== JSON.stringify(scannedProp)) {
            setScannedProp(liveProp);
        }
    }
  }, [allProps, scannedProp]);

  // Pre-fill form when starting to edit checkout details
  useEffect(() => {
    if (currentAction === 'editingCheckoutDetails' && scannedProp?.checkedOutDetails) {
      setCheckoutTo(scannedProp.checkedOutDetails.to || '');
      setCheckoutNotes(scannedProp.checkedOutDetails.notes || '');
    }
  }, [currentAction, scannedProp]);

  const resetAll = useCallback(() => {
    setCurrentAction('initialScan');
    setScannedProp(null);
    setShowScanner(false);
    setCheckoutTo('');
    setCheckoutNotes('');
    setSelectedNewStatus(null);
    setStatusUpdateNotes('');
    setIsProcessing(false);
    setError(null);
  }, []);

  const generateStatusUpdateRecord = (previousStatus: PropLifecycleStatus, newStatus: PropLifecycleStatus, notes?: string): PropStatusUpdate => {
    return {
        id: Date.now().toString(), // Simple ID, consider UUID
        date: new Date().toISOString(),
        previousStatus,
        newStatus,
        updatedBy: user?.uid || 'unknown_user',
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
    };
  };

  const handleQrScan = async (data: Record<string, any>) => {
    setShowScanner(false);
    setError(null);
    setIsProcessing(true);

    if (scannerPurpose === 'prop') {
      if (data && data.type === 'prop' && data.id) {
        const propFromContext = getPropById(data.id);
        if (propFromContext) {
            setScannedProp(propFromContext);
            setCurrentAction('selectAction');
        } else {
            setError('Prop not found. Ensure data is synced or QR code is valid.');
            // resetAll(); // Keep current state to allow retry or manual input if added later
        }
      } else {
        setError('Invalid QR. Please scan a Prop QR code.');
      }
    } else if (scannerPurpose === 'destination') {
      if (data && (data.type === 'location' || data.type === 'packingBox') && data.id) {
        const destinationInfo: ScannedDestinationInfo = {
          id: data.id,
          type: data.type === 'packingBox' ? 'box' : 'location',
          name: data.name || (data.type === 'packingBox' ? 'Unknown Box' : 'Unknown Location'),
        };
        await processCheckIn(destinationInfo);
      } else {
        setError('Invalid QR. Please scan a Location or Box QR code for check-in.');
        // If scan fails, return to action selection for the current prop
        setCurrentAction('selectAction'); 
      }
    }
    setIsProcessing(false);
  };

  const processCheckout = async () => {
    if (!scannedProp || !firebaseService?.updateDocument || !user) return;
    setIsProcessing(true);
    try {
      const previousStatus = scannedProp.status;
      const newStatus: PropLifecycleStatus = 'checked_out';
      const newCheckoutDetails = {
        to: checkoutTo,
        notes: checkoutNotes,
        checkedOutAt: new Date().toISOString(),
      };
      const statusUpdate = generateStatusUpdateRecord(previousStatus, newStatus, `Checked out to: ${checkoutTo}`);
      
      const updates: Partial<Prop> = {
        status: newStatus,
        assignment: undefined,
        checkedOutDetails: newCheckoutDetails,
        statusHistory: FirebaseFirestoreTypes.FieldValue.arrayUnion(statusUpdate) as any,
      };

      await firebaseService.updateDocument('props', scannedProp.id, updates);
      const updatedLocalStatusHistory = [...(scannedProp.statusHistory || []), statusUpdate];
      updatePropLocally(scannedProp.id, { ...updates, statusHistory: updatedLocalStatusHistory, assignment: undefined });
      Alert.alert('Success', `Prop "${scannedProp.name}" checked out.`);
      resetAll();
    } catch (e: any) { setError(`Checkout failed: ${e.message}`); setIsProcessing(false); }
  };

  const processEditCheckoutDetails = async () => {
    if (!scannedProp || !firebaseService?.updateDocument || !user) return;
    setIsProcessing(true);
    try {
        const updatedCheckoutDetails = {
            ...(scannedProp.checkedOutDetails || {}),
            to: checkoutTo,
            notes: checkoutNotes,
        };
        await firebaseService.updateDocument('props', scannedProp.id, {
            checkedOutDetails: updatedCheckoutDetails,
        });
        updatePropLocally(scannedProp.id, { checkedOutDetails: updatedCheckoutDetails });
        Alert.alert('Success', `Checkout details for "${scannedProp.name}" updated.`);
        setCurrentAction('selectAction');
        const liveProp = getPropById(scannedProp.id); 
        if (liveProp) setScannedProp(liveProp);
    } catch (e: any) { setError(`Updating details failed: ${e.message}`); }
    setIsProcessing(false);
  };

  const processCheckIn = async (destination: ScannedDestinationInfo) => {
    if (!scannedProp || !firebaseService?.updateDocument || !user) return;
    setIsProcessing(true);
    try {
      const previousStatus = scannedProp.status;
      const newStatus: PropLifecycleStatus = 'available_in_storage';
      const assignmentData = {
        type: destination.type,
        id: destination.id,
        name: destination.name,
        assignedAt: new Date().toISOString(),
      };
      const statusUpdate = generateStatusUpdateRecord(previousStatus, newStatus, `Checked in to: ${destination.name}`);
      
      const updates: Partial<Prop> = {
        status: newStatus,
        assignment: assignmentData,
        checkedOutDetails: undefined,
        statusHistory: FirebaseFirestoreTypes.FieldValue.arrayUnion(statusUpdate) as any,
      };

      await firebaseService.updateDocument('props', scannedProp.id, updates);
      const updatedLocalStatusHistory = [...(scannedProp.statusHistory || []), statusUpdate];
      updatePropLocally(scannedProp.id, { ...updates, statusHistory: updatedLocalStatusHistory, checkedOutDetails: undefined });
      Alert.alert('Success', `Prop "${scannedProp.name}" checked in to ${destination.name}.`);
      resetAll();
    } catch (e: any) { setError(`Check-in failed: ${e.message}`); setIsProcessing(false); }
  };
  
  const processMarkInUse = async () => {
    if (!scannedProp || !firebaseService?.updateDocument || !user) return;
    setIsProcessing(true);
    try {
      const previousStatus = scannedProp.status;
      const newStatus: PropLifecycleStatus = 'in_use_on_set';
      const statusUpdate = generateStatusUpdateRecord(previousStatus, newStatus, `Marked as in use on set.`);
      
      const updates: Partial<Prop> = {
        status: newStatus,
        statusHistory: FirebaseFirestoreTypes.FieldValue.arrayUnion(statusUpdate) as any,
      };
      // Optional clearing of assignment/checkedOutDetails can be added here if needed
      // if (newStatus === 'in_use_on_set') { updates.assignment = undefined; updates.checkedOutDetails = undefined; }

      await firebaseService.updateDocument('props', scannedProp.id, updates);
      const updatedLocalStatusHistory = [...(scannedProp.statusHistory || []), statusUpdate];
      updatePropLocally(scannedProp.id, { ...updates, statusHistory: updatedLocalStatusHistory });
      Alert.alert('Success', `Prop "${scannedProp.name}" marked as In Use on Set.`);
      setCurrentAction('selectAction'); 
      const liveProp = getPropById(scannedProp.id); 
      if (liveProp) setScannedProp(liveProp);
    } catch (e: any) { setError(`Marking in use failed: ${e.message}`); }
    setIsProcessing(false);
  };
  
  const processStatusUpdate = async () => {
    if (!scannedProp || !selectedNewStatus || !firebaseService?.updateDocument || !user) return;
    setIsProcessing(true);
    try {
        const previousStatus = scannedProp.status;
        const statusUpdate = generateStatusUpdateRecord(previousStatus, selectedNewStatus, statusUpdateNotes);
        
        let updates: Partial<Prop> = {
            status: selectedNewStatus,
            statusNotes: statusUpdateNotes,
            statusHistory: FirebaseFirestoreTypes.FieldValue.arrayUnion(statusUpdate) as any,
        };

        if (selectedNewStatus === 'available_in_storage') {
            updates.checkedOutDetails = undefined; 
        } else if (selectedNewStatus === 'checked_out') {
            updates.assignment = undefined; 
        } else if (['missing', 'cut', 'ready_for_disposal'].includes(selectedNewStatus)) {
            updates.assignment = undefined;
            updates.checkedOutDetails = undefined;
        }

        await firebaseService.updateDocument('props', scannedProp.id, updates);
        const updatedLocalStatusHistory = [...(scannedProp.statusHistory || []), statusUpdate];
        updatePropLocally(scannedProp.id, { ...updates, statusHistory: updatedLocalStatusHistory });
        Alert.alert('Success', `Prop "${scannedProp.name}" status updated to ${lifecycleStatusLabels[selectedNewStatus]}.`);
        resetAll();
    } catch (e: any) { setError(`Status update failed: ${e.message}`); }
    setIsProcessing(false);
  }

  // --- Render Methods for different actions --- 
  const renderInitialScan = () => (
    <View style={s.stepContainer}>
        <MaterialCommunityIcons name="qrcode-scan" size={60} color={currentThemeColors.primary} />
        <StyledText style={s.instructionText}>Scan a Prop QR Code to begin.</StyledText>
        <TouchableOpacity style={s.scanButton} onPress={() => { setError(null); setScannerPurpose('prop'); setShowScanner(true); }} disabled={isProcessing}>
            <StyledText style={s.scanButtonText}>Scan Prop</StyledText>
        </TouchableOpacity>
        {/* Button to allow user to go back or cancel the whole operation */} 
        {router.canGoBack() && (
            <TouchableOpacity style={[s.actionButton, s.minorButton, {marginTop: 20}]} onPress={() => router.back()}>
                <StyledText style={s.minorButtonText}>Cancel / Go Back</StyledText>
            </TouchableOpacity>
        )}
    </View>
  );

  const renderSelectAction = () => {
    if (!scannedProp) return <StyledText>Error: No prop data. Please try scanning again.</StyledText>;
    
    const canCheckOut = scannedProp.status === 'available_in_storage';
    const canCheckIn = scannedProp.status === 'checked_out' || scannedProp.status === 'in_use_on_set';
    const showMarkInUseStd = scannedProp.status === 'available_in_storage'; // Not already in use, and available
    const showMoveToSet = scannedProp.status === 'checked_out'; // Checked out, offer to move to set

    return (
      <ScrollView style={{width: '100%'}} contentContainerStyle={s.stepContainerPadded}>
        <StyledText style={s.propNameDisplay}>{scannedProp.name}</StyledText>
        <StyledText style={s.propStatusDisplay}>Status: {lifecycleStatusLabels[scannedProp.status] || scannedProp.status}</StyledText>
        {scannedProp.assignment && <StyledText style={s.propDetailText}>Assigned to: {scannedProp.assignment.name} ({scannedProp.assignment.type})</StyledText>}
        {scannedProp.checkedOutDetails && (
            <View style={s.detailsBox}>
                <StyledText style={s.detailsTitle}>Checkout Details:</StyledText>
                <StyledText>To: {scannedProp.checkedOutDetails.to}</StyledText>
                {scannedProp.checkedOutDetails.notes && <StyledText>Notes: {scannedProp.checkedOutDetails.notes}</StyledText>}
                {scannedProp.checkedOutDetails.checkedOutAt && <StyledText>At: {new Date(scannedProp.checkedOutDetails.checkedOutAt).toLocaleString()}</StyledText>}
                <TouchableOpacity style={[s.actionButton, s.editButtonSmall, { alignSelf: 'flex-end'}]} onPress={() => setCurrentAction('editingCheckoutDetails')}>
                    <Feather name="edit-3" size={16} color={s.actionButtonText.color} />
                    <StyledText style={[s.actionButtonText, {fontSize: 13, marginLeft: 5}]}>Edit Details</StyledText>
                </TouchableOpacity>
            </View>
        )}

        <StyledText style={s.sectionTitle}>Actions:</StyledText>
        {canCheckOut && (
            <TouchableOpacity style={s.actionButton} onPress={() => setCurrentAction('checkingOut')}>
                <Feather name="log-out" size={20} color={s.actionButtonText.color} style={s.buttonIcon}/>
                <StyledText style={s.actionButtonText}>Check Out Prop</StyledText>
            </TouchableOpacity>
        )}
        {canCheckIn && (
            <TouchableOpacity style={s.actionButton} onPress={() => { setError(null); setScannerPurpose('destination'); setCurrentAction('checkingIn_scanDestination'); setShowScanner(true);}}>
                <Feather name="log-in" size={20} color={s.actionButtonText.color} style={s.buttonIcon}/>
                <StyledText style={s.actionButtonText}>Check In / Return to Storage</StyledText>
            </TouchableOpacity>
        )}
        {showMarkInUseStd && (
            <TouchableOpacity style={s.actionButton} onPress={processMarkInUse} disabled={isProcessing}>
                 <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={s.actionButtonText.color} style={s.buttonIcon}/>
                <StyledText style={s.actionButtonText}>Mark In Use on Set</StyledText>
            </TouchableOpacity>
        )}
        {showMoveToSet && (
             <TouchableOpacity style={[s.actionButton, s.secondaryActionButton]} onPress={processMarkInUse} disabled={isProcessing}>
                 <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={s.secondaryActionButtonText.color} style={s.buttonIcon}/>
                <StyledText style={s.secondaryActionButtonText}>Move to Set (Mark as In Use)</StyledText>
            </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.actionButton, s.minorButton]} onPress={() => setCurrentAction('updatingStatus')}>
            <Feather name="info" size={20} color={s.minorButtonText.color} style={s.buttonIcon}/>
            <StyledText style={s.minorButtonText}>Update General Status</StyledText>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionButton, s.cancelButton, {marginTop: 20}]} onPress={resetAll}>
            <Feather name="x-circle" size={20} color={s.cancelButtonText.color} style={s.buttonIcon}/>
            <StyledText style={s.cancelButtonText}>Scan Different Prop</StyledText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderCheckingOutForm = (isEditing: boolean) => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.formContainerKeyAvoid} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
    <ScrollView style={{width: '100%'}} contentContainerStyle={s.stepContainerPadded}>
        <StyledText style={s.formTitle}>{isEditing ? 'Edit Checkout Details' : 'Check Out Prop'}: {scannedProp?.name}</StyledText>
        <StyledText style={s.label}>To (Actor/Scene/Etc.):</StyledText>
        <TextInput style={s.input} value={checkoutTo} onChangeText={setCheckoutTo} placeholder="e.g., John Doe, Act I Scene 2" placeholderTextColor={currentThemeColors.textSecondary}/>
        <StyledText style={s.label}>Notes (Optional):</StyledText>
        <TextInput style={[s.input, s.textArea]} value={checkoutNotes} onChangeText={setCheckoutNotes} multiline placeholder="e.g., For rehearsal, needs batteries" placeholderTextColor={currentThemeColors.textSecondary}/>
        <TouchableOpacity 
            style={[s.confirmActionButton, (!checkoutTo.trim() && !isEditing) && s.disabledButton]} 
            onPress={isEditing ? processEditCheckoutDetails : processCheckout} 
            disabled={isProcessing || (!checkoutTo.trim() && !isEditing)}
        >
            {isProcessing ? <ActivityIndicator color={s.actionButtonText.color}/> : <StyledText style={s.actionButtonText}>{isEditing ? 'Save Changes' : 'Confirm Checkout'}</StyledText>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionButton, s.cancelButton]} onPress={() => setCurrentAction('selectAction')} disabled={isProcessing}>
            <StyledText style={s.cancelButtonText}>Cancel</StyledText>
        </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderUpdatingStatusForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.formContainerKeyAvoid} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
    <ScrollView style={{width: '100%'}} contentContainerStyle={s.stepContainerPadded}>
        <StyledText style={s.formTitle}>Update Status: {scannedProp?.name}</StyledText>
        <StyledText style={s.label}>New Status:</StyledText>
        <View style={s.statusSelectionContainer}>
            {(Object.keys(lifecycleStatusLabels) as PropLifecycleStatus[]).map(statusKey => (
                <TouchableOpacity 
                    key={statusKey} 
                    style={[s.statusOption, selectedNewStatus === statusKey && s.statusOptionSelected]}
                    onPress={() => setSelectedNewStatus(statusKey)}
                >
                    <StyledText style={[s.statusOptionText, selectedNewStatus === statusKey && s.statusOptionTextSelected]}>
                        {lifecycleStatusLabels[statusKey]}
                    </StyledText>
                </TouchableOpacity>
            ))}
        </View>
        <StyledText style={s.label}>Notes for Status Update (Optional):</StyledText>
        <TextInput style={[s.input, s.textArea]} value={statusUpdateNotes} onChangeText={setStatusUpdateNotes} multiline placeholder="Reason for status change..." placeholderTextColor={currentThemeColors.textSecondary}/>
        <TouchableOpacity style={[s.confirmActionButton, !selectedNewStatus && s.disabledButton]} onPress={processStatusUpdate} disabled={isProcessing || !selectedNewStatus}>
            {isProcessing ? <ActivityIndicator color={s.actionButtonText.color}/> : <StyledText style={s.actionButtonText}>Save New Status</StyledText>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionButton, s.cancelButton]} onPress={() => setCurrentAction('selectAction')} disabled={isProcessing}>
            <StyledText style={s.cancelButtonText}>Cancel</StyledText>
        </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderContent = () => {
    if (isProcessing && currentAction !== 'checkingOut' && currentAction !== 'updatingStatus' && currentAction !== 'editingCheckoutDetails') {
        return <View style={s.stepContainer}><ActivityIndicator size="large" color={currentThemeColors.primary} /><StyledText style={s.instructionText}>Processing...</StyledText></View>;
    }
    switch (currentAction) {
      case 'initialScan': return renderInitialScan();
      case 'selectAction': return renderSelectAction();
      case 'checkingOut': return renderCheckingOutForm(false);
      case 'editingCheckoutDetails': return renderCheckingOutForm(true); // Re-use form for editing
      case 'updatingStatus': return renderUpdatingStatusForm();
      case 'checkingIn_scanDestination': 
        return <View style={s.stepContainer}><ActivityIndicator size="large" color={currentThemeColors.primary} /><StyledText style={s.instructionText}>Ready to scan destination...</StyledText></View>;
      default: return <StyledText>Unknown action state. Please reset.</StyledText>;
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Prop Check In / Out' }} />
      {error && <View style={s.errorContainer}><StyledText style={s.errorText}>{error}</StyledText></View>}
      {renderContent()}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => {
          setShowScanner(false);
          // If user closes scanner modal without scanning, return to appropriate step
          if (currentAction === 'checkingIn_scanDestination' || currentAction === 'initialScan') {
            setCurrentAction('selectAction'); // Or back to initialScan if no prop was selected yet
          }
      }}>
        <QRScannerScreen 
            onScan={handleQrScan} 
            onClose={() => {
                setShowScanner(false);
                 if (currentAction === 'checkingIn_scanDestination' || currentAction === 'initialScan') {
                    setCurrentAction('selectAction');
                }
            }} 
        />
      </Modal>
    </View>
  );
}

const styles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stepContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  stepContainerPadded: { flexGrow: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10 },
  formContainerKeyAvoid: { flex: 1, width: '100%' },
  instructionText: { fontSize: 16, color: colors.text, textAlign: 'center', marginVertical: 20 },
  propNameDisplay: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
  propStatusDisplay: { fontSize: 17, color: colors.textSecondary, marginBottom: 12, textAlign: 'center' },
  propDetailText: { fontSize: 15, color: colors.textSecondary, marginBottom: 5, textAlign: 'center' },
  detailsBox: { backgroundColor: colors.card, padding: 12, borderRadius: 8, marginVertical:12, width: '95%', alignSelf: 'center' },
  detailsTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 6 }, 
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: colors.primary, marginTop: 18, marginBottom:12, textAlign: 'center' },
  scanButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 35, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minWidth: '70%' },
  scanButtonText: { color: colors.card, fontSize: 17, fontWeight: 'bold' },
  actionButton: { flexDirection: 'row', backgroundColor: colors.primary, padding: 14, borderRadius: 8, marginVertical: 12, alignItems: 'center', justifyContent: 'center', width: '90%', alignSelf: 'center' },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  secondaryActionButton: { backgroundColor: colors.primary, },
  secondaryActionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  minorButton: { backgroundColor: colors.card, borderWidth:1, borderColor: colors.border },
  minorButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  editButtonSmall: { backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginVertical: 5, minWidth: 120 },
  confirmActionButton: { flexDirection: 'row', backgroundColor: colors.primary, padding: 14, borderRadius: 8, marginVertical: 12, alignItems: 'center', justifyContent: 'center', width: '90%', alignSelf: 'center' },
  confirmActionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  cancelButton: { backgroundColor: colors.card, borderWidth:1, borderColor: colors.border },
  cancelButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  disabledButton: { backgroundColor: colors.border },
  buttonIcon: { marginRight: 10 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 18, textAlign: 'center' },
  label: { fontSize: 15, color: colors.text, marginTop:12, marginBottom: 6, alignSelf: 'flex-start', width: '90%', marginLeft:'5%' },
  input: { backgroundColor: colors.inputBackground, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12, width: '90%', alignSelf:'center' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  statusSelectionContainer: { width: '90%', alignSelf: 'center', marginBottom: 10 },
  statusOption: { padding: 12, marginVertical: 6, borderRadius: 8, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  statusOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusOptionText: { fontSize: 16, color: colors.text, textAlign: 'center' },
  statusOptionTextSelected: { color: 'white', fontWeight: 'bold' },
  errorContainer: { backgroundColor: colors.background, padding: 10, marginHorizontal:15, borderRadius: 6, borderWidth: 1, borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center' },
}); 
