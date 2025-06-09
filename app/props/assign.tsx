import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { QrCode, Package, Building, CheckCircle, XCircle, ArrowRight } from 'lucide-react-native';

import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../src/styles/theme.ts';
import { useFirebase } from '../../src/contexts/FirebaseContext.tsx';
import { QRScannerScreen } from '../../src/platforms/mobile/features/qr/QRScannerScreen.tsx';
import StyledText from '../../src/components/StyledText.tsx';
import type { Prop } from '../../src/shared/types/props.ts'; // To potentially fetch prop details if needed

type AssignStep = 'scanProp' | 'scanDestination' | 'confirm' | 'saving';

interface ScannedPropInfo {
  id: string;
  name?: string; 
  showId?: string;
}

interface ScannedDestinationInfo {
  id: string;
  type: 'location' | 'box';
  name?: string;
  showId?: string;
}

export default function AssignPropScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);
  const { service: firebaseService } = useFirebase(); // For direct Firestore updates

  const [currentStep, setCurrentStep] = useState<AssignStep>('scanProp');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProp, setScannedProp] = useState<ScannedPropInfo | null>(null);
  const [scannedDestination, setScannedDestination] = useState<ScannedDestinationInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetProcess = () => {
    setCurrentStep('scanProp');
    setScannedProp(null);
    setScannedDestination(null);
    setError(null);
    setIsProcessing(false);
  };

  const handleQrScan = async (data: Record<string, any>) => {
    setShowScanner(false);
    setError(null);
    console.log('AssignProp Scanned Data:', data);

    if (currentStep === 'scanProp') {
      if (data && data.type === 'prop' && data.id) {
        setScannedProp({ id: data.id, name: data.name || 'Unknown Prop', showId: data.showId });
        setCurrentStep('scanDestination');
      } else {
        setError('Invalid QR code. Please scan a Prop QR code.');
      }
    } else if (currentStep === 'scanDestination') {
      if (data && (data.type === 'location' || data.type === 'packingBox') && data.id) {
        setScannedDestination({
          id: data.id,
          type: data.type === 'packingBox' ? 'box' : 'location',
          name: data.name || (data.type === 'packingBox' ? 'Unknown Box' : 'Unknown Location'),
          showId: data.showId
        });
        setCurrentStep('confirm');
      } else {
        setError('Invalid QR code. Please scan a Location or Packing Box QR code.');
      }
    }
  };

  const handleConfirmAssignment = async () => {
    if (!scannedProp || !scannedDestination || !firebaseService?.updateDocument) {
      setError('Missing data or Firebase service not available.');
      return;
    }
    
    // Basic showId check if both items have it
    if (scannedProp.showId && scannedDestination.showId && scannedProp.showId !== scannedDestination.showId) {
        Alert.alert(
            'Show Mismatch',
            `The prop (${scannedProp.name || 'Prop'}) belongs to show ID ${scannedProp.showId}, but the destination (${scannedDestination.name || 'Destination'}) belongs to show ID ${scannedDestination.showId}. Are you sure you want to proceed?`,
            [
                { text: "Cancel", style: "cancel", onPress: () => { resetProcess(); } },
                { text: "Proceed Anyway", onPress: () => proceedWithAssignment() }
            ]
        );
        return;
    }
    proceedWithAssignment();
  };
  
  const proceedWithAssignment = async () => {
    if (!scannedProp || !scannedDestination || !firebaseService?.updateDocument) { // Redundant check but good for safety
        setError('Critical error before saving. Please restart.');
        return;
    }

    setCurrentStep('saving');
    setIsProcessing(true);
    setError(null);

    try {
      const assignmentData = {
        type: scannedDestination.type,
        id: scannedDestination.id,
        name: scannedDestination.name,
        assignedAt: new Date().toISOString(), 
      };

      // Update the prop document in Firestore
      // Assuming 'props' is the collection name for individual props
      await firebaseService.updateDocument('props', scannedProp.id, { assignment: assignmentData });

      Alert.alert('Success!', `Prop "${scannedProp.name}" assigned to ${scannedDestination.type} "${scannedDestination.name}".`);
      resetProcess();
      router.back(); // Or navigate to a success screen / props list
    } catch (e: any) {
      console.error('Error assigning prop:', e);
      setError(e.message || 'Failed to assign prop.');
      setCurrentStep('confirm'); // Go back to confirm step on error
    } finally {
      setIsProcessing(false);
    }
  }

  const renderStepContent = () => {
    if (isProcessing && currentStep !== 'saving') setIsProcessing(false); // Reset if stuck

    switch (currentStep) {
      case 'scanProp':
        return (
          <View style={s.stepContainer}>
            <Package size={60} color={currentThemeColors.primary} />
            <StyledText style={s.instructionText}>Scan the QR code on the PROP you want to assign.</StyledText>
            <TouchableOpacity style={s.scanButton} onPress={() => { setError(null); setShowScanner(true); }}>
              <QrCode size={20} color={s.scanButtonText.color} style={{ marginRight: 8 }} />
              <StyledText style={s.scanButtonText}>Scan Prop</StyledText>
            </TouchableOpacity>
          </View>
        );
      case 'scanDestination':
        return (
          <View style={s.stepContainer}>
            <StyledText style={s.infoText}>Prop Scanned: <StyledText style={s.boldText}>{scannedProp?.name || scannedProp?.id}</StyledText></StyledText>
            <Building size={60} color={currentThemeColors.primary} />
            <StyledText style={s.instructionText}>Now, scan the QR code of the LOCATION or BOX where this prop is being placed.</StyledText>
            <TouchableOpacity style={s.scanButton} onPress={() => { setError(null); setShowScanner(true); }}>
              <QrCode size={20} color={s.scanButtonText.color} style={{ marginRight: 8 }} />
              <StyledText style={s.scanButtonText}>Scan Destination</StyledText>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelButton} onPress={resetProcess}>
                <XCircle size={18} color={s.cancelButtonText.color} style={{ marginRight: 5 }}/>
                <StyledText style={s.cancelButtonText}>Start Over</StyledText>
            </TouchableOpacity>
          </View>
        );
      case 'confirm':
        return (
          <View style={s.stepContainer}>
            <StyledText style={s.confirmTitle}>Confirm Assignment</StyledText>
            <View style={s.confirmDetailsContainer}>
                <View style={s.confirmItemBoxLeft}>
                    <Package size={30} color={currentThemeColors.text} />
                    <StyledText style={s.confirmItemName}>{scannedProp?.name || scannedProp?.id}</StyledText>
                    <StyledText style={s.confirmItemSubText}>Prop</StyledText>
                </View>
                <ArrowRight size={30} color={currentThemeColors.textSecondary} style={s.arrowIcon} />
                <View style={s.confirmItemBoxRight}>
                    {scannedDestination?.type === 'box' ? 
                        <Package size={30} color={currentThemeColors.text} /> : 
                        <Building size={30} color={currentThemeColors.text} />
                    }
                    <StyledText style={s.confirmItemName}>{scannedDestination?.name || scannedDestination?.id}</StyledText>
                    <StyledText style={s.confirmItemSubText}>{scannedDestination?.type === 'box' ? 'Box' : 'Location'}</StyledText>
                </View>
            </View>
            <TouchableOpacity style={s.confirmButton} onPress={handleConfirmAssignment} disabled={isProcessing}>
              {isProcessing ? 
                <ActivityIndicator color={s.confirmButtonText.color} /> : 
                <><CheckCircle size={20} color={s.confirmButtonText.color} style={{ marginRight: 8 }} /><StyledText style={s.confirmButtonText}>Confirm & Save</StyledText></>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelButton} onPress={resetProcess} disabled={isProcessing}>
                 <XCircle size={18} color={s.cancelButtonText.color} style={{ marginRight: 5 }}/>
                <StyledText style={s.cancelButtonText}>Cancel</StyledText>
            </TouchableOpacity>
          </View>
        );
        case 'saving':
            return (
                <View style={s.stepContainer}>
                    <ActivityIndicator size="large" color={currentThemeColors.primary} />
                    <StyledText style={s.infoText}>Saving assignment...</StyledText>
                </View>
            );
      default:
        return <StyledText>Unknown step.</StyledText>;
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Assign Prop' }} />
      {error && <StyledText style={s.errorText}>{error}</StyledText>}
      {renderStepContent()}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <QRScannerScreen 
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)} 
        />
      </Modal>
    </View>
  );
}

const styles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 15, justifyContent: 'center' },
  stepContainer: { alignItems: 'center', padding: 20, width: '100%' },
  instructionText: { fontSize: 16, color: colors.text, textAlign: 'center', marginVertical: 20 },
  infoText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 15 },
  boldText: { fontWeight: 'bold', color: colors.text },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70%',
    marginBottom: 10,
  },
  scanButtonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' },
  confirmTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 25, textAlign: 'center' },
  confirmDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.listBackground,
    borderRadius: 8,
    padding: 20,
    marginBottom: 30,
    width: '100%',
  },
  confirmItemBoxLeft: { alignItems: 'center', flex:1, paddingRight:10 },
  confirmItemBoxRight: { alignItems: 'center', flex:1, paddingLeft:10 },
  arrowIcon: { marginHorizontal: 10 }, 
  confirmItemName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 5, textAlign: 'center' },
  confirmItemSubText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary, // Or your theme's success color
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70%',
    marginBottom: 10,
  },
  confirmButtonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' },
  cancelButton: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
    minWidth: '60%',
  },
  cancelButtonText: { color: colors.textSecondary, fontSize: 14 },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 15,
    fontSize: 14
  },
}); 