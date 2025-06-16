import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow';
import LinearGradient from 'react-native-linear-gradient';

import { useShows } from '../../src/contexts/ShowsContext.tsx';
import { usePacking } from '../../src/hooks/usePacking.ts';
import { PackingBox } from '../../src/types/packing.ts';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../src/styles/theme.ts';
import { QRScannerScreen } from '../../src/platforms/mobile/features/qr/QRScannerScreen.tsx';

export default function PackingScreen() {
  const router = useRouter();
  const { selectedShow, loading: showsLoading, error: showsError } = useShows();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  
  const { boxes, loading: boxesLoading, error: packingError } = usePacking(selectedShow?.id);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);

  const loading = showsLoading || (selectedShow && boxesLoading);
  const error = showsError || packingError;

  useEffect(() => {
    // This is a common pattern if Stack or other components need dynamic options based on hooks
    // However, for Expo Router, headerRight is typically set in _layout.tsx or directly in Stack.Screen
    // Let's try setting it directly in Stack.Screen for simplicity first.
  }, [currentThemeColors]);

  const handleViewBoxDetails = (boxId: string) => {
    if (!selectedShow) return;
    router.push(`/packing/box/${boxId}?showId=${selectedShow.id}`);
  };

  const handleCreateNewBox = () => {
    if (!selectedShow) return;
    router.push(`/packing/createBox?showId=${selectedShow.id}`);
  };

  const handleQRScanned = (data: Record<string, any>) => {
    setIsQRScannerVisible(false);
    console.log('Scanned QR Data:', data);
    if (data && data.type) {
      if (data.type === 'prop' && data.id) {
        Alert.alert('Prop Scanned', `ID: ${data.id}. (Next: Choose action)`);
      } else if (data.type === 'box' && data.id && selectedShow?.id) {
        Alert.alert('Box Scanned', `ID: ${data.id}. Navigating to box details...`);
        router.push(`/packing/box/${data.id}?showId=${selectedShow.id}`);
      } else {
        Alert.alert('Unknown QR Code', `Data: ${JSON.stringify(data)}`);
      }
    } else if (data && data.raw) {
      Alert.alert('Raw QR Data Scanned', data.raw);
    } else {
      Alert.alert('Scan Unsuccessful', 'Could not parse QR code data.');
    }
  };

  const styles = getStyles(currentThemeColors);

  if (isQRScannerVisible) {
    return (
      <QRScannerScreen 
        onScan={handleQRScanned} 
        onClose={() => setIsQRScannerVisible(false)} 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  if (!selectedShow) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Please select a show first from the Shows tab.</Text>
      </View>
    );
  }

  if (!boxes || boxes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>No packing boxes found for this show.</Text>
          <Text style={styles.messageTextSm}>You can create one using the '+' button.</Text>
        </View>
        <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
          radius: 4,
          opacity: 0.3,
          color: currentThemeColors.text === appLightTheme.colors.text ? '#000' : '#FFF',
          offset: [0, 2],
        })]}>
          <TouchableOpacity style={styles.fab} onPress={handleCreateNewBox}>
            <Ionicons name="add" size={30} color={currentThemeColors.text || currentThemeColors.text} />
          </TouchableOpacity>
        </ShadowedView>
      </View>
    );
  }

  const renderBoxItem = ({ item }: { item: PackingBox }) => (
    <TouchableOpacity 
      style={styles.boxItem} 
      onPress={() => handleViewBoxDetails(item.id)}
    >
      <Ionicons name="cube-outline" size={24} color={currentThemeColors.primary} style={styles.boxIcon} />
      <View style={styles.boxTextContainer}>
        <Text style={styles.boxName}>{item.name || 'Unnamed Box'}</Text>
        {item.description && <Text style={styles.boxDescription}>{item.description}</Text>}
        <Text style={styles.boxInfo}>
          Status: {item.status || 'N/A'} 
          {item.props && item.props.length > 0 ? ` | Items: ${item.props.reduce((acc, p) => acc + (p.quantity || 0), 0)}` : ' | Empty'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={currentThemeColors.textSecondary || currentThemeColors.text} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: selectedShow ? `Packing: ${selectedShow.name}` : 'Packing',
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsQRScannerVisible(true)} style={{ marginRight: 15 }}>
              <Ionicons name="qr-code-outline" size={28} color={currentThemeColors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={boxes}
        renderItem={renderBoxItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
      />
      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 4,
        opacity: 0.3,
        color: currentThemeColors.text === appLightTheme.colors.text ? '#000' : '#FFF',
        offset: [0, 2],
      })]}>
        <TouchableOpacity style={styles.fab} onPress={handleCreateNewBox}>
          <Ionicons name="add" size={30} color={currentThemeColors.text || currentThemeColors.text} />
        </TouchableOpacity>
      </ShadowedView>
    </View>
    </LinearGradient>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    padding: 20,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
     backgroundColor: themeColors.background,
  },
  messageText: {
    color: themeColors.text,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
   messageTextSm: {
    color: themeColors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  listContentContainer: {
    padding: 10,
  },
  boxItem: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  boxIcon: {
    marginRight: 15,
  },
  boxTextContainer: {
    flex: 1,
  },
  boxName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  boxDescription: {
    fontSize: 14,
    color: themeColors.text,
    opacity: 0.8,
    marginTop: 2,
  },
  boxInfo: {
    fontSize: 12,
    color: themeColors.text,
    opacity: 0.7,
    marginTop: 5,
  },
  fabShadowContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56, 
    height: 56,
    borderRadius: 28,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary, 
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 