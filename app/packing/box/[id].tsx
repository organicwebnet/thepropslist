import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePacking } from '../../../src/hooks/usePacking.ts';
import { PackingBox, PackedProp } from '../../../src/types/packing.ts';
import { useTheme } from '../../../src/contexts/ThemeContext.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../../src/styles/theme.ts';
import { QRScannerScreen } from '../../../src/platforms/mobile/features/qr/QRScannerScreen.tsx';
import { useFirebase } from '../../../src/contexts/FirebaseContext.tsx';
import { Prop } from '../../../src/shared/types/props.ts';
import QuantityInputModal from '../../../src/components/modals/QuantityInputModal.tsx';

export default function BoxDetailScreen() {
  const router = useRouter();
  const { id: boxId, showId } = useLocalSearchParams<{ id: string, showId: string }>();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getStyles(currentThemeColors);

  const { service: firebaseService } = useFirebase();
  const { boxes, loading: boxesLoading, error: packingError, operations } = usePacking(showId);
  const [box, setBox] = useState<PackingBox | null | undefined>(undefined);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [isQuantityModalVisible, setIsQuantityModalVisible] = useState(false);
  const [currentScannedProp, setCurrentScannedProp] = useState<Prop | null>(null);
  const [currentPropInitialQuantity, setCurrentPropInitialQuantity] = useState(0);

  useEffect(() => {
    if (showId && boxId && !boxesLoading && boxes.length > 0) {
      const foundBox = boxes.find((b: PackingBox) => b.id === boxId);
      setBox(foundBox || null);
    } else if (!boxesLoading && boxes.length === 0 && boxId) {
        setBox(null);
    }
  }, [boxId, showId, boxes, boxesLoading]);

  const handleViewPropDetails = (propId: string) => {
    router.push(`/propsTab/${propId}`); 
  };

  const handleQuantitySubmit = useCallback(async (newQuantity: number) => {
    setIsQuantityModalVisible(false);
    if (!currentScannedProp || !box || !box.props || !boxId || !showId) {
      Alert.alert('Error', 'Cannot update quantity. Missing data.');
      setCurrentScannedProp(null);
      return;
    }

    setIsProcessingQR(true);
    let updatedPackedProps: PackedProp[];
    const existingPackedPropIndex = box.props.findIndex(p => p.propId === currentScannedProp.id);

    if (newQuantity <= 0) {
        if (existingPackedPropIndex > -1) {
            updatedPackedProps = box.props.filter((_: PackedProp, index: number) => index !== existingPackedPropIndex);
            Alert.alert('Prop Removed', `${currentScannedProp.name || 'Prop'} removed from the box.`);
        } else {
            Alert.alert('Info', `${currentScannedProp.name || 'Prop'} was not in the box.`);
            setIsProcessingQR(false);
            setCurrentScannedProp(null);
            return;
        }
    } else if (existingPackedPropIndex > -1) {
      updatedPackedProps = box.props.map((p: PackedProp, index: number) => 
        index === existingPackedPropIndex 
          ? { ...p, quantity: newQuantity } 
          : p
      );
      Alert.alert('Prop Updated', `${currentScannedProp.name || 'Prop'} quantity set to ${newQuantity}.`);
    } else {
      const newPackedProp: PackedProp = {
        propId: currentScannedProp.id,
        name: currentScannedProp.name || 'Unnamed Prop',
        quantity: newQuantity,
        weight: currentScannedProp.weight || 0,
        weightUnit: currentScannedProp.weightUnit || 'kg',
        isFragile: currentScannedProp.isBreakable || false,
      };
      updatedPackedProps = [...box.props, newPackedProp];
      Alert.alert('Prop Added', `${currentScannedProp.name || 'Prop'} added with quantity ${newQuantity}.`);
    }

    try {
      await operations.updateBox(boxId, { props: updatedPackedProps });
    } catch (updateError: any) {
      console.error('Error updating box with prop quantity:', updateError);
      Alert.alert('Update Error', `Failed to save prop to box: ${updateError.message}`);
    } finally {
      setIsProcessingQR(false);
      setCurrentScannedProp(null);
    }
  }, [currentScannedProp, box, boxId, showId, operations]);

  const handlePropQRScanned = useCallback(async (qrData: Record<string, any>) => {
    setIsQRScannerVisible(false);
    if (qrData && qrData.type === 'prop' && qrData.id) {
      const propId = qrData.id as string;
      setIsProcessingQR(true);
      try {
        if (!firebaseService?.getDocument) {
          Alert.alert('Error', 'Firebase service is not available.');
          setIsProcessingQR(false); return;
        }
        const propDoc = await firebaseService.getDocument<Prop>('props', propId);
        if (propDoc && propDoc.data) {
          const { id: dataId, ...restOfData } = propDoc.data;
          const fetchedProp = { id: propDoc.id, ...restOfData } as Prop;
          
          setCurrentScannedProp(fetchedProp);
          const existing = box?.props?.find((p: PackedProp) => p.propId === fetchedProp.id);
          setCurrentPropInitialQuantity(existing?.quantity || 0);
          setIsQuantityModalVisible(true);

        } else {
          Alert.alert('Prop Not Found', `Could not find prop ID: ${propId}`);
        }
      } catch (error: any) {
        Alert.alert('Error', `Failed to fetch prop: ${error.message}`);
      } finally {
        setIsProcessingQR(false);
      }
    } else {
      Alert.alert('Invalid QR', 'Scanned QR not a valid prop QR code.');
    }
  }, [firebaseService, box, operations]);

  if (isQRScannerVisible) {
    return (
      <QRScannerScreen 
        onScan={handlePropQRScanned} 
        onClose={() => setIsQRScannerVisible(false)} 
      />
    );
  }

  if (boxesLoading || box === undefined || isProcessingQR) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
        {isProcessingQR && <Text style={styles.loadingText}>Processing...</Text>}
      </View>
    );
  }

  if (packingError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {packingError.message}</Text>
      </View>
    );
  }

  if (!box) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Box not found.</Text>
      </View>
    );
  }

  const renderPackedPropItem = ({ item }: { item: PackedProp }) => (
    <TouchableOpacity style={styles.propItem} onPress={() => handleViewPropDetails(item.propId)}>
      <Ionicons name="ellipse-outline" size={18} color={currentThemeColors.text} style={styles.propIcon} />
      <View style={styles.propTextContainer}>
        <Text style={styles.propName}>{item.name || 'Unnamed Prop'}</Text>
        <Text style={styles.propInfo}>Quantity: {item.quantity}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={currentThemeColors.text} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: box.name || 'Box Details' }} />
      
      <View style={styles.headerSection}>
        <Text style={styles.boxName}>{box.name || 'Unnamed Box'}</Text>
        {box.description && <Text style={styles.boxDescription}>{box.description}</Text>}
        <Text style={styles.boxStatus}>Status: {box.status || 'N/A'}</Text>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={() => setIsQRScannerVisible(true)} disabled={isProcessingQR}>
        <Ionicons name="qr-code-outline" size={24} color={styles.scanButtonText.color} />
        <Text style={styles.scanButtonText}>Scan Prop QR to Add/Update</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Packed Props ({box.props?.length || 0})</Text>
      {(box.props?.length || 0) === 0 ? (
        <Text style={styles.emptyListText}>This box is currently empty.</Text>
      ) : (
        <FlatList
          data={box.props}
          renderItem={renderPackedPropItem}
          keyExtractor={(item) => item.propId}
        />
      )}

      {currentScannedProp && (
         <QuantityInputModal
          isVisible={isQuantityModalVisible}
          onClose={() => {
            setIsQuantityModalVisible(false);
            setCurrentScannedProp(null);
          }}
          onSubmit={handleQuantitySubmit}
          propName={currentScannedProp.name || 'Unknown Prop'}
          initialQuantity={currentPropInitialQuantity}
        />
      )}
    </View>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: themeColors.background,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  headerSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: themeColors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  boxName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 4,
  },
  boxDescription: {
    fontSize: 16,
    color: themeColors.text,
    opacity: 0.8,
    marginBottom: 8,
  },
  boxStatus: {
    fontSize: 14,
    color: themeColors.text,
    opacity: 0.7,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  scanButtonText: {
    color: themeColors.card,
    fontSize: 16,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 10,
    marginTop: 10,
  },
  propItem: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  propIcon: {
    marginRight: 15,
  },
  propTextContainer: {
    flex: 1,
  },
  propName: {
    fontSize: 16,
    fontWeight: '500',
    color: themeColors.text,
  },
  propInfo: {
    fontSize: 13,
    color: themeColors.text,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyListText: {
    fontSize: 16,
    color: themeColors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 20,
  },
}); 