import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
const QRCode = require('react-native-qrcode-svg');
import { useProps } from '../../../src/contexts/PropsContext.tsx'; // Adjusted path
import type { Prop } from '../../../src/shared/types/props.ts'; // Adjusted path
import { QRScannerService } from '../../../src/platforms/mobile/features/qr/QRScannerService.ts'; // Adjusted path
import { useTheme } from '../../../src/contexts/ThemeContext.tsx'; // Adjusted path
import { lightTheme, darkTheme } from '../../../src/styles/theme.ts'; // Adjusted path
import StyledText from '../../../src/components/StyledText.tsx'; // Adjusted path

export default function PropQrCodeScreen() {
  const params = useLocalSearchParams();
  const { props: allProps, loading: propsLoading, error: propsError } = useProps(); // Get all props from context
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);

  const [prop, setProp] = useState<Prop | null>(null);
  const [qrDataString, setQrDataString] = useState<string | null>(null);
  // Combined loading state
  const [effectiveLoading, setEffectiveLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const propId = typeof params.id === 'string' ? params.id : undefined;
  const qrService = QRScannerService.getInstance();

  useEffect(() => {
    if (propsError) {
      setError(propsError.message || 'Error loading props from context.');
      setEffectiveLoading(false);
      return;
    }

    if (!propId) {
      setError('Prop ID not provided.');
      setEffectiveLoading(false);
      return;
    }

    if (propsLoading) {
      setEffectiveLoading(true);
      return; // Wait for props to load from context
    }

    // Props have loaded, try to find the specific prop
    const fetchedProp = allProps.find(p => p.id === propId);

    if (fetchedProp) {
      setProp(fetchedProp);
      try {
        const dataToEncode = {
          type: 'prop',
          id: fetchedProp.id,
          name: fetchedProp.name,
          showId: fetchedProp.showId,
        };
        setQrDataString(qrService.generateQRData(dataToEncode));
        setError(null); // Clear previous errors
      } catch (e: any) {
        console.error("Error generating QR string:", e);
        setError("Failed to generate QR code data.");
        setQrDataString(null); // Ensure QR data is cleared on error
      }
    } else {
      setError('Prop not found in the current context.');
      setProp(null); // Clear prop if not found
      setQrDataString(null);
    }
    setEffectiveLoading(false);

  }, [propId, allProps, propsLoading, propsError, qrService]);

  if (effectiveLoading) { // Use combined loading state
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
        <StyledText>Loading QR Code...</StyledText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <StyledText style={s.errorText}>Error: {error}</StyledText>
      </View>
    );
  }

  if (!prop || !qrDataString) {
    return (
      <View style={s.centered}>
        <StyledText>Prop data or QR data not available.</StyledText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Stack.Screen options={{ title: `QR: ${prop.name}` }} />
      <StyledText style={s.headerTitle}>{prop.name}</StyledText>
      <StyledText style={s.subHeader}>Scan this QR code to view prop details.</StyledText>
      
      <View style={s.qrContainer}>
        {qrDataString && (
          // @ts-ignore TODO: Resolve QRCode type issue
          <QRCode
            value={qrDataString}
            size={250}
            color={currentThemeColors.text}
            backgroundColor={currentThemeColors.card}
            logoBackgroundColor='transparent'
          />
        )}
      </View>

      <View style={s.detailsContainer}>
        <StyledText style={s.detailItem}><StyledText style={s.detailLabel}>ID:</StyledText> {prop.id}</StyledText>
        <StyledText style={s.detailItem}><StyledText style={s.detailLabel}>Category:</StyledText> {prop.category || 'N/A'}</StyledText>
        <StyledText style={s.detailItem}><StyledText style={s.detailLabel}>Status:</StyledText> {prop.status || 'N/A'}</StyledText>
        <StyledText style={s.detailItem}><StyledText style={s.detailLabel}>Location:</StyledText> {prop.location || 'N/A'}</StyledText>
      </View>

      {/* Add instructions or a print button if needed later */}
    </ScrollView>
  );
}

const styles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailItem: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  detailLabel: {
    fontWeight: 'bold',
    color: colors.text,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
}); 