import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
const QRCode = require('react-native-qrcode-svg');
import { usePacking } from '../../../src/hooks/usePacking.ts'; // Adjusted path
import type { PackingBox } from '../../../src/types/packing.ts'; // Adjusted path
import { QRScannerService } from '../../../src/platforms/mobile/features/qr/QRScannerService.ts'; // Adjusted path
import { useTheme } from '../../../src/contexts/ThemeContext.tsx'; // Adjusted path
import { lightTheme, darkTheme } from '../../../src/styles/theme.ts'; // Adjusted path
import StyledText from '../../../src/components/StyledText.tsx'; // Adjusted path

export default function BoxQrCodeScreen() {
  const { boxId, showId } = useLocalSearchParams<{ boxId: string; showId: string }>();
  const { getDocument, loading: packingLoading, error: packingError } = usePacking(showId);
  const [box, setBox] = useState<PackingBox | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;

  useEffect(() => {
    if (!boxId || !showId) {
      setError("Box ID or Show ID is missing.");
      setLoading(false);
      return;
    }

    const fetchBox = async () => {
      setLoading(true);
      setError(null);
      try {
        const boxDoc = await getDocument(boxId);
        if (boxDoc && boxDoc.data) {
          // Ensure the document ID is used and not overwritten.
          // Destructure data and explicitly exclude a potential 'id' field from it.
          const { id: dataId, ...restOfData } = boxDoc.data as any; 
          const fetchedBox: PackingBox = { 
            id: boxDoc.id, // Use the canonical document ID
            ...restOfData 
          } as PackingBox;
          setBox(fetchedBox);
          
          // Get an instance of the service to call the method
          const qrService = QRScannerService.getInstance();
          const generatedQrData = qrService.generateQRData({
            type: 'packingBox',
            id: fetchedBox.id,
            name: fetchedBox.name,
            showId: fetchedBox.showId,
          });
          setQrData(generatedQrData);
        } else {
          setError('Box not found.');
        }
      } catch (e: any) {
        console.error("Error fetching box for QR code:", e);
        setError(e.message || 'Failed to fetch box data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBox();
  }, [boxId, showId, getDocument]);

  const s = styles(currentThemeColors);

  if (loading || packingLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
        <StyledText>Loading QR Code...</StyledText>
      </View>
    );
  }

  if (error || packingError) {
    return (
      <View style={s.centered}>
        <StyledText style={s.errorText}>Error: {error || packingError?.message}</StyledText>
      </View>
    );
  }

  if (!box || !qrData) {
    return (
      <View style={s.centered}>
        <StyledText>Box data or QR data not available.</StyledText>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: `QR Code for Box: ${box.name || 'Unnamed'}` }} />
      <StyledText style={s.title}>Scan this QR Code for Box</StyledText>
      <StyledText style={s.boxName}>{box.name || 'Unnamed Box'}</StyledText>
      {box.description && <StyledText style={s.description}>Description: {box.description}</StyledText>}
      <View style={s.qrContainer}>
        <QRCode
          value={qrData}
          size={250}
          color={currentThemeColors.text}
          backgroundColor={currentThemeColors.background}
        />
      </View>
      <StyledText style={s.qrDataText}>QR Data: {qrData}</StyledText>
    </View>
  );
}

const styles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  boxName: {
    fontSize: 18,
    marginBottom: 5,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: colors.card, // Or directly use colors.background if no distinct card needed
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrDataText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 15,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
}); 