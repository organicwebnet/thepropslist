import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Platform, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScanLine, ListChecks, Filter, Search } from 'lucide-react-native';
import { useProps } from '@/contexts/PropsContext.tsx';
import { useShows } from '@/contexts/ShowsContext.tsx';
import type { Prop, PropCategory } from '@/shared/types/props.ts';
import { propCategories } from '@/shared/types/props.ts';
import type { Act, Scene } from '@/shared/services/firebase/types.ts';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle.ts';
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow';
import PropCard from '../../../src/shared/components/PropCard/index.tsx';
import { QRScannerScreen } from '../../../src/platforms/mobile/features/qr/QRScannerScreen.tsx';
import { Picker } from '@react-native-picker/picker';

// Map enum values to display names for status filter
const statusDisplayMap: Record<PropLifecycleStatus | 'All', string> = {
  All: 'All Statuses',
  ...lifecycleStatusLabels
};

// Native screen component for the Props tab
export default function PropsTabScreen() {
  const { props, loading, error } = useProps();
  const { selectedShow, setSelectedShowById } = useShows();
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PropCategory | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<PropLifecycleStatus | 'All'>('All');
  const [selectedAct, setSelectedAct] = useState<number | 'All'>('All');
  const [selectedScene, setSelectedScene] = useState<number | 'All'>('All');
  const [showFilterControls, setShowFilterControls] = useState(false);

  const handleAddProp = () => {
    if (!selectedShow?.id) {
        Alert.alert("Please select a show first."); 
        return;
    }
    router.push({ pathname: '/props/create', params: { showId: selectedShow.id } } as any);
  };

  const handleNavigateToPropFinder = () => {
    if (!selectedShow?.id) {
      Alert.alert("No Show Selected", "Please select a show first to use the Prop Finder.");
      return;
    }
    router.push('/packing/find');
  };

  const handleNavigateToCheckInOut = () => {
    if (!selectedShow?.id) {
        Alert.alert("Please select a show first to manage check-ins/outs."); 
        return;
    }
    router.push('/actions/checkinout');
  };

  const onEditPress = (propId: string) => {
    if (!selectedShow?.id) {
        Alert.alert("Error", "No show selected. Cannot determine context for editing prop.");
        return;
    }
    router.push({ pathname: `/props_native/${propId}/edit`, params: { propId: propId } } as any);
  };

  const handleQrScan = (data: Record<string, any>) => {
    setShowScanner(false);
    console.log('QR Scanned Data:', data);
    if (data && data.type === 'prop' && data.id && data.showId) {
      if (!selectedShow || selectedShow.id !== data.showId) {
        console.log(`Scanned prop from a different show. Current: ${selectedShow?.id}, Scanned: ${data.showId}. Switching show...`);
        setSelectedShowById(data.showId);
      }
      router.push(`/propsTab/${data.id}`);
    } else if (data && data.type === 'prop' && data.id && !data.showId) {
      Alert.alert("Legacy QR Code", "This QR code doesn't specify a show. Attempting to find prop in current show.");
      router.push(`/propsTab/${data.id}`);
    } else {
      Alert.alert("Scan Error", "Scanned QR code is not a valid prop QR code or is missing information.");
    }
  };

  const availableActs = useMemo(() => selectedShow?.acts || [], [selectedShow]);
  const availableScenes = useMemo(() => {
    if (selectedAct === "All" || !selectedShow?.acts) return [];
    return selectedShow.acts.find((act: Act) => act.id === selectedAct)?.scenes || [];
  }, [selectedShow, selectedAct]);

  const filteredProps = useMemo(() => {
    if (!selectedShow) return [];
    return props.filter((p: Prop) => {
      if (p.showId !== selectedShow.id) return false;
      if (searchTerm && 
          !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !(p.description || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && p.status !== selectedStatus) return false;
      if (selectedAct !== 'All' && !p.isMultiScene && p.act !== selectedAct) return false;
      if (selectedScene !== 'All' && !p.isMultiScene && p.scene !== selectedScene) return false;
      return true;
    });
  }, [props, selectedShow, searchTerm, selectedCategory, selectedStatus, selectedAct, selectedScene]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }
 
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading props: {error.message}</Text>
      </View>
    );
  }
  
  if (!selectedShow) {
       return (
         <View style={styles.centered}>
            <Text style={styles.infoText}>Please select a show to view props.</Text>
            <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.scanButtonPlaceholder}>
              <Ionicons name="qr-code-outline" size={24} color="#FFF" />
              <Text style={styles.scanButtonText}>Scan Prop to Find Show</Text>
            </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: selectedShow ? `${selectedShow.name} - Props` : 'Props',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowFilterControls(!showFilterControls)} style={{ marginRight: Platform.OS === 'ios' ? 10 : 15 }}>
                <Filter size={26} color={"#FFFFFF"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNavigateToPropFinder} style={{ marginRight: Platform.OS === 'ios' ? 10 : 15 }}>
                <Search size={26} color={"#FFFFFF"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNavigateToCheckInOut} style={{ marginRight: Platform.OS === 'ios' ? 10 : 15 }}>
                <ListChecks size={28} color={"#FFFFFF"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowScanner(true)} style={{ marginRight: Platform.OS === 'ios' ? 0 : 15 }}>
                <Ionicons name="qr-code-outline" size={28} color={"#FFFFFF"} />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
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

      {showFilterControls && (
        <ScrollView style={styles.filterContainer} nestedScrollEnabled={true}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name or description..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          
          <Text style={styles.pickerLabel}>Category</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(itemValue) => setSelectedCategory(itemValue as PropCategory | 'All')}
              style={styles.picker}
              dropdownIconColor="#FFFFFF"
            >
              <Picker.Item label="All Categories" value="All" color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
              {propCategories.map(category => (
                <Picker.Item key={category} label={category} value={category} color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
              ))}
            </Picker>
          </View>

          <Text style={styles.pickerLabel}>Status</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedStatus}
              onValueChange={(itemValue) => setSelectedStatus(itemValue as PropLifecycleStatus | 'All')}
              style={styles.picker}
              dropdownIconColor="#FFFFFF"
            >
              {Object.entries(statusDisplayMap).map(([value, label]) => (
                 <Picker.Item key={value} label={label} value={value} color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
              ))}
            </Picker>
          </View>

          {selectedShow && availableActs.length > 0 && (
            <>
              <Text style={styles.pickerLabel}>Act</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedAct}
                  onValueChange={(itemValue) => setSelectedAct(itemValue as number | 'All')}
                  style={styles.picker}
                  dropdownIconColor="#FFFFFF"
                  enabled={availableActs.length > 0}
                >
                  <Picker.Item label="All Acts" value="All" color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
                  {availableActs.map((act: Act) => (
                    <Picker.Item key={act.id} label={act.name || `Act ${act.id}`} value={act.id} color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
                  ))}
                </Picker>
              </View>
            </>
          )}

          {selectedShow && selectedAct !== 'All' && availableScenes.length > 0 && (
             <>
              <Text style={styles.pickerLabel}>Scene</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedScene}
                  onValueChange={(itemValue) => setSelectedScene(itemValue as number | 'All')}
                  style={styles.picker}
                  dropdownIconColor="#FFFFFF"
                  enabled={availableScenes.length > 0}
                >
                  <Picker.Item label="All Scenes" value="All" color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
                  {availableScenes.map((scene: Scene) => (
                    <Picker.Item key={scene.id} label={scene.name || `Scene ${scene.id}`} value={scene.id} color={Platform.OS === 'android' ? '#9CA3AF' : undefined}/>
                  ))}
                </Picker>
              </View>
            </>
          )}
        </ScrollView>
      )}

      <FlatList
        data={filteredProps}
        keyExtractor={(item: Prop) => item.id}
        renderItem={({ item }: { item: Prop }) => (
          <PropCard 
            prop={item} 
            onEditPress={() => onEditPress(item.id)} 
            onDeletePress={() => Alert.alert("Delete", `Placeholder for deleting ${item.name}`)} 
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.centeredListContent}>
            <Text style={styles.infoText}>No props found for {selectedShow.name}.</Text>
          </View>
        )}
        contentContainerStyle={filteredProps.length === 0 ? styles.centeredListContent : styles.listPadding}
      />

      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 4,
        opacity: 0.3,
        color: '#000',
        offset: [0, 2],
      })]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddProp}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </ShadowedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111827', 
  },
  centeredListContent: {
    flexGrow: 1, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPadding: { 
    paddingHorizontal: 8,
    paddingBottom: 80,
    paddingTop: 10,
  },
  errorText: {
    color: '#EF4444', 
    fontSize: 16,
    textAlign: 'center',
  },
  infoText: {
      color: '#9CA3AF', 
      fontSize: 16,
      textAlign: 'center',
  },
  propItem: {
    backgroundColor: '#1F2937',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16, 
    borderRadius: 8,
  },
  propName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
   propDescription: {
      fontSize: 14,
      color: '#9CA3AF',
      marginTop: 4,
   },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabShadowContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    right: 20,
    bottom: 20,
  },
  scanButtonPlaceholder: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: '#1F2937', 
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    maxHeight: Platform.OS === 'ios' ? 280 : 260,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#374151',
    color: '#F9FAFB',
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  pickerLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 5,
    marginLeft: 5, 
  },
  pickerWrapper: {
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 10,
    height: Platform.OS === 'ios' ? undefined : 50,
    justifyContent: Platform.OS === 'android' ? 'center' : undefined,
  },
  picker: {
    color: '#F9FAFB',
    height: Platform.OS === 'ios' ? 120 : 50,
    width: '100%',
  },
}); 