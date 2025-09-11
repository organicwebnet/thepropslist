import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LabelPrintService } from '../../../src/shared/services/pdf/labelPrintService';
import { useShows } from '../../../src/contexts/ShowsContext';
import { useProps } from '../../../src/contexts/PropsContext';
import { usePacking } from '../../../src/hooks/usePacking';
import { PackingList } from '../../../src/components/packing/PackingList.native';
import type { PackedProp, PackingBox } from '../../../src/types/packing';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../src/styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import StyledText from '../../../src/components/StyledText';

export default function PackingListScreen() {
  const router = useRouter();
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { selectedShow, getShowById } = useShows();
  const { props: allProps, loading: propsLoading } = useProps();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  
  const [currentShow, setCurrentShow] = useState(selectedShow);
  const [showProps, setShowProps] = useState<any[]>([]);
  const [packingBoxes, setPackingBoxes] = useState<PackingBox[]>([]);
  
  // Get packing service for this show
  const {
    boxes,
    loading: packingLoading,
    operations,
    getDocument: getBoxById
  } = usePacking(showId);

  useEffect(() => {
    // Get show details if we have showId but no selectedShow
    const loadShow = async () => {
      if (showId && !currentShow) {
        const show = await getShowById(showId);
        if (show) {
          setCurrentShow(show);
        }
      }
    };
    loadShow();
  }, [showId, currentShow, getShowById]);

  useEffect(() => {
    // Filter props for the current show
    if (currentShow && allProps) {
      const filtered = allProps.filter(prop => prop.showId === currentShow.id);
      setShowProps(filtered);
    }
  }, [currentShow, allProps]);

  useEffect(() => {
    // Update local boxes state when packing service loads boxes
    if (boxes) {
      setPackingBoxes(boxes);
    }
  }, [boxes]);

  const handlePrintAllLabels = async () => {
    if (!currentShow) return;
    try {
      const makeQr = (boxId: string) => {
        const payload = JSON.stringify({ type: 'packingBox', id: boxId, showId: currentShow.id });
        return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(payload)}`;
      };
      const labels = (packingBoxes || []).map((box) => ({
        id: `${box.id}-label`,
        containerId: box.id,
        packListId: currentShow.id,
        qrCode: makeQr(box.id),
        containerName: box.name || 'Unnamed Box',
        containerStatus: (box as any).status || 'draft',
        propCount: box.props?.reduce((s, p) => s + (p.quantity || 1), 0) || 0,
        labels: (box as any).labels || [],
        url: `https://thepropslist.uk/c/${box.id}`,
        generatedAt: new Date(),
      }));
      const printer = new LabelPrintService();
      await printer.printLabels(labels);
    } catch (e) {
      console.warn('Print failed', e);
    }
  };

  const handleCreateBox = async (props: PackedProp[], boxName: string, actNumber?: number, sceneNumber?: number) => {
    if (!currentShow) return;
    
    try {
      await operations.createBox(
        props, 
        boxName, 
        `Packing box for ${currentShow.name}`, 
        actNumber || 0, 
        sceneNumber || 0
      );
    } catch (error) {
      console.error('Error creating packing box:', error);
      throw error;
    }
  };

  const handleUpdateBox = async (boxId: string, updates: Partial<PackingBox>) => {
    try {
      await operations.updateBox(boxId, updates);
    } catch (error) {
      console.error('Error updating packing box:', error);
      throw error;
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    try {
      await operations.deleteBox(boxId);
    } catch (error) {
      console.error('Error deleting packing box:', error);
      throw error;
    }
  };

  if (!currentShow) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centered}>
          <StyledText style={{ color: currentThemeColors.textPrimary, fontSize: 16 }}>
            Show not found. Please go back and select a show.
          </StyledText>
        </View>
      </LinearGradient>
    );
  }

  if (propsLoading || packingLoading) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
          <StyledText style={{ color: currentThemeColors.textPrimary, marginTop: 16 }}>
            Loading packing list...
          </StyledText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Stack.Screen options={{ 
        title: '',
        headerShown: true,
        headerStyle: { backgroundColor: '#18181b' },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() =>
                router.navigate({ pathname: '/(tabs)/packing/createBox', params: { showId: currentShow.id } } as any)
              }
              style={{ marginRight: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(192,132,252,0.85)', borderRadius: 8 }}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '600' }}>Add</Text>
            </TouchableOpacity>
            {packingBoxes.length > 0 && (
              <TouchableOpacity
                onPress={handlePrintAllLabels}
                style={{ marginRight: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(192,132,252,0.25)', borderRadius: 8 }}
              >
                <Feather name="printer" size={18} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '600' }}>Print</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      }} />
      
      <PackingList
        show={currentShow}
        boxes={packingBoxes}
        props={showProps}
        isLoading={packingLoading}
        onUpdateBox={handleUpdateBox}
        onDeleteBox={handleDeleteBox}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 