import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
// import * as QRCodeSvg from 'react-native-qrcode-svg'; // Reverting to original import for clarity with ts-ignore
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../src/styles/theme';
import { useLocations } from '../../src/hooks/useLocations.ts';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import StyledText from '../../src/components/StyledText.tsx';
import type { Location } from '../../src/types/locations.ts';

export default function LocationsListScreen() {
  const router = useRouter();
  const { selectedShow } = useShows();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);

  const { locations, loading, error } = useLocations(selectedShow?.id);
  const [selectedLocationForQR, setSelectedLocationForQR] = useState<Location | null>(null);

  const renderLocationItem = ({ item }: { item: Location }) => (
    <View style={s.itemContainer}>
      <View style={s.itemTextContainer}>
        <StyledText style={s.itemName}>{item.name}</StyledText>
        {item.description && <StyledText style={s.itemDescription}>{item.description}</StyledText>}
      </View>
      <TouchableOpacity 
        style={s.qrButton}
        onPress={() => setSelectedLocationForQR(item)}
      >
        <MaterialCommunityIcons name="qrcode-scan" size={24} color={currentThemeColors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (!selectedShow) {
    return (
      <View style={s.centeredMessageContainer}>
        <StyledText style={s.centeredMessageText}>Please select a show to view locations.</StyledText>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.centeredMessageContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centeredMessageContainer}>
        <StyledText style={s.errorText}>Error loading locations: {error.message}</StyledText>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen 
        options={{
          title: selectedShow ? `${selectedShow.name} - Locations` : 'Locations',
          headerRight: () => (
            <Link href="/locations/create" asChild>
              <TouchableOpacity style={{ marginRight: 15 }}>
                <Feather name="plus-circle" size={28} color={currentThemeColors.primary} />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />

      <FlatList
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<StyledText style={s.emptyListText}>No locations found for this show. Tap the + icon to create one.</StyledText>}
        contentContainerStyle={s.listContentContainer}
      />

      {selectedLocationForQR && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedLocationForQR}
          onRequestClose={() => setSelectedLocationForQR(null)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <StyledText style={s.modalTitle}>QR Code for: {selectedLocationForQR.name}</StyledText>
              {selectedLocationForQR.qrData ? (
                <View style={s.qrCodeContainer}>
                  {/* @ts-ignore TODO: Resolve QRCode type issue */}
                  <QRCode
                    value={selectedLocationForQR.qrData}
                    size={200}
                    backgroundColor={currentThemeColors.card}
                    color={currentThemeColors.text}
                  />
                </View>
              ) : (
                <StyledText style={s.errorText}>QR Data not available for this location.</StyledText>
              )}
              <TouchableOpacity style={s.closeButton} onPress={() => setSelectedLocationForQR(null)}>
                <StyledText style={s.closeButtonText}>Close</StyledText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = (themeColors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: themeColors.background,
  },
  centeredMessageText: { fontSize: 16, textAlign: 'center', color: themeColors.text },
  errorText: { fontSize: 14, textAlign: 'center', color: themeColors.error, margin: 10 },
  emptyListText: { fontSize: 14, textAlign: 'center', color: themeColors.textSecondary, marginTop: 30 },
  listContentContainer: { padding: 10 },
  itemContainer: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  itemTextContainer: { flex: 1, marginRight: 10 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: themeColors.text },
  itemDescription: { fontSize: 13, color: themeColors.textSecondary, marginTop: 4 },
  qrButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: themeColors.background, // Or a subtle background
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: themeColors.card,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '85%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: themeColors.text,
    textAlign: 'center'
  },
  qrCodeContainer: {
    padding: 10, // Add some padding around the QR code itself
    backgroundColor: themeColors.card, // Ensure QR code background matches if needed or is transparent
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  closeButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
  },
  closeButtonText: {
    color: themeColors.card, // Assuming primary button text is contrasting
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
