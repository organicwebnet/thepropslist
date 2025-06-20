import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, ScrollView, Image, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import { useProps } from '../../src/contexts/PropsContext.tsx';
import { usePacking } from '../../src/hooks/usePacking';
import type { Prop } from '../../src/shared/types/props.ts';
import type { PackingBox, PackedProp } from '../../src/types/packing.ts';
import { QRScannerScreen } from '../../src/platforms/mobile/features/qr/QRScannerScreen.tsx';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../src/styles/theme';
import StyledText from '../../src/components/StyledText.tsx';
import { Search, Package, QrCode, AlertTriangle, Info } from 'lucide-react-native';

interface ScannedBoxResult {
  box: PackingBox;
  containsTargetProp: boolean;
  scannedAt: number; // For sorting or TTL
}

// To manage the mode of operation for the finder
type FinderMode = 'showAssignment' | 'scanBoxes';

export default function PropFinderScreen() {
  const router = useRouter();
  const { selectedShow } = useShows();
  const { props: allShowProps, loading: propsLoading } = useProps();
  const { getDocument: getBoxById } = usePacking(selectedShow?.id);

  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);

  const [targetProp, setTargetProp] = useState<Prop | null>(null);
  const [propSearchQuery, setPropSearchQuery] = useState('');
  const [showPropSelectionModal, setShowPropSelectionModal] = useState(false);
  
  const [scannedBoxes, setScannedBoxes] = useState<ScannedBoxResult[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finderMode, setFinderMode] = useState<FinderMode>('showAssignment');

  const availablePropsForShow = selectedShow ? allShowProps.filter(p => p.showId === selectedShow.id) : [];
  const filteredPropsForModal = propSearchQuery
    ? availablePropsForShow.filter(p => p.name.toLowerCase().includes(propSearchQuery.toLowerCase()))
    : availablePropsForShow;

  const handleSelectTargetProp = (prop: Prop) => {
    setTargetProp(prop);
    setScannedBoxes([]); // Reset scanned boxes when a new prop is selected
    setShowPropSelectionModal(false);
    setPropSearchQuery('');
    setError(null);
    // If prop has an assignment, default to showing that. Otherwise, go to scan boxes mode.
    setFinderMode(prop.assignment ? 'showAssignment' : 'scanBoxes'); 
  };

  const handleQrScan = async (data: Record<string, any>) => {
    console.log('PropFinder Scanned Data:', data);
    if (!targetProp) {
      setError("Please select a target prop first.");
      setShowScanner(false); // Close scanner if no target prop
      return;
    }

    if (data && data.type === 'packingBox' && data.id) {
      setIsProcessingScan(true);
      setError(null);
      try {
        // Check if box already scanned to prevent duplicates in this session
        if (scannedBoxes.some(sb => sb.box.id === data.id)) {
            setError(`Box ${data.name || data.id} already scanned.`);
            // Potentially allow re-scan or just inform
            // setShowScanner(false); // Scanner remains open
            setIsProcessingScan(false);
            return;
        }

        const fetchedBoxDoc = await getBoxById(data.id);
        if (fetchedBoxDoc && fetchedBoxDoc.data) {
          const { id: dataId, ...restOfData } = fetchedBoxDoc.data as any; // Exclude id from data if present
          const fetchedBox: PackingBox = { 
            id: fetchedBoxDoc.id, // Use the document ID from snapshot
            ...restOfData 
          } as PackingBox;
          const contains = !!fetchedBox.props?.some(p => p.propId === targetProp.id);
          setScannedBoxes(prev => [
            { box: fetchedBox, containsTargetProp: contains, scannedAt: Date.now() },
            ...prev, // Add new scan to the top
          ].sort((a, b) => b.scannedAt - a.scannedAt)); // Keep sorted by newest scan first
        } else {
          setError(`Box with ID ${data.id} not found.`);
          // setShowScanner(false); // Scanner remains open even if box not found, user might scan another
        }
      } catch (e: any) {
        console.error("Error processing scanned box:", e);
        setError(e.message || "Failed to process scanned box.");
        // setShowScanner(false); // Scanner remains open on error, user might try again
      } finally {
        setIsProcessingScan(false);
        // setShowScanner(false); // REMOVED: Keep scanner open for continuous scanning
      }
    } else {
      setError("Scanned QR is not a valid Packing Box QR code.");
      setShowScanner(false); // Close on invalid scan type
    }
  };

  const renderPropSelectItem = ({ item }: { item: Prop }) => (
    <TouchableOpacity style={s.modalItem} onPress={() => handleSelectTargetProp(item)}>
      <StyledText style={s.modalItemText}>{item.name}</StyledText>
      {item.category && <StyledText style={s.modalItemSubText}>Category: {item.category}</StyledText>}
    </TouchableOpacity>
  );

  const renderScannedBoxItem = ({ item }: { item: ScannedBoxResult }) => (
    <View style={[s.scannedBoxItem, item.containsTargetProp ? s.boxFound : s.boxNotFound]}>
      <View style={s.boxItemHeader}>
        <Package size={20} color={item.containsTargetProp ? currentThemeColors.primary : currentThemeColors.error} />
        <StyledText style={s.boxName}>{item.box.name || item.box.id}</StyledText>
      </View>
      <StyledText style={s.boxStatusText}>
        {item.containsTargetProp ? `Contains "${targetProp?.name}"` : `Does NOT contain "${targetProp?.name}"`}
      </StyledText>
      {item.box.description && <StyledText style={s.boxDescription}>Desc: {item.box.description}</StyledText>}
      <StyledText style={s.boxContentPreview}>Props in box: {item.box.props?.length || 0}</StyledText>
    </View>
  );

  const renderContent = () => {
    if (!targetProp) {
        return <StyledText style={s.infoText}>Select a prop above to start finding.</StyledText>;
    }

    if (finderMode === 'showAssignment' && targetProp.assignment) {
        const assignment = targetProp.assignment;
        return (
            <View style={s.assignmentInfoContainer}>
                <Info size={24} color={currentThemeColors.primary} style={{marginBottom: 8}} />
                <StyledText style={s.assignmentTitle}>Current Assignment:</StyledText>
                <StyledText style={s.assignmentText}>
                    Prop "<StyledText style={s.boldText}>{targetProp.name}</StyledText>" is assigned to:
                </StyledText>
                <StyledText style={s.assignmentDetailText}>
                    Type: <StyledText style={s.boldText}>{assignment.type === 'box' ? 'Box' : 'Location'}</StyledText>
                </StyledText>
                <StyledText style={s.assignmentDetailText}>
                    Name: <StyledText style={s.boldText}>{assignment.name || assignment.id}</StyledText>
                </StyledText>
                {assignment.assignedAt && 
                    <StyledText style={s.assignmentDetailText}>
                        Assigned At: <StyledText style={s.boldText}>{new Date(assignment.assignedAt).toLocaleString()}</StyledText>
                    </StyledText>
                }
                <TouchableOpacity style={s.scanButton} onPress={() => setFinderMode('scanBoxes')} >
                    <QrCode size={20} color={currentThemeColors.card} style={{marginRight: 8}} />
                    <StyledText style={s.scanButtonText}>Verify or Scan Other Boxes</StyledText>
                </TouchableOpacity>
            </View>
        );
    }

    // Fallback to scanBoxes mode or if no assignment
    return (
        <>
            <TouchableOpacity style={s.scanButton} onPress={() => { setError(null); setShowScanner(true); }} disabled={isProcessingScan}>
                {isProcessingScan ? 
                <ActivityIndicator color={currentThemeColors.card} /> : 
                <><QrCode size={20} color={currentThemeColors.card} style={{marginRight: 8}} /><StyledText style={s.scanButtonText}>Scan Box QR Code</StyledText></>}
            </TouchableOpacity>
            <FlatList
                data={scannedBoxes}
                renderItem={renderScannedBoxItem}
                keyExtractor={(item, index) => item.box.id + index.toString()}
                ListEmptyComponent={<StyledText style={s.infoText}>Scan packing boxes to see if they contain "{targetProp.name}".</StyledText>}
                style={s.resultsList}
            />
        </>
    );
  }

  if (!selectedShow) {
    return <View style={s.centered}><StyledText>Please select a show first to use Prop Finder.</StyledText></View>;
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Prop Finder' }} />
      
      <TouchableOpacity style={s.targetPropSelector} onPress={() => setShowPropSelectionModal(true)}>
        <Search size={20} color={currentThemeColors.textSecondary} style={{marginRight: 8}}/>
        <StyledText style={s.targetPropText}>
          {targetProp ? `Searching for: ${targetProp.name}` : 'Tap to select Prop to find'}
        </StyledText>
      </TouchableOpacity>

      {targetProp && (
          <View style={s.targetPropDisplay}>
            {targetProp.primaryImageUrl ? 
                <Image source={{uri: targetProp.primaryImageUrl}} style={s.targetPropImage} /> : 
                <View style={s.targetPropImagePlaceholder}><Package size={30} color={currentThemeColors.textSecondary}/></View>
            }
            <StyledText style={s.targetPropName}>{targetProp.name}</StyledText>
          </View>
      )}

      {error && 
        <View style={s.errorContainer}>
            <AlertTriangle size={20} color={currentThemeColors.error} style={{marginRight: 8}}/>
            <StyledText style={s.errorText}>{error}</StyledText>
        </View>
      }
      
      {renderContent()}

      <Modal
        visible={showPropSelectionModal}
        animationType="slide"
        onRequestClose={() => setShowPropSelectionModal(false)}
      >
        <View style={s.modalContainer}>
          <StyledText style={s.modalTitle}>Select Prop to Find</StyledText>
          <TextInput 
            style={s.searchInput}
            placeholder="Search props..."
            value={propSearchQuery}
            onChangeText={setPropSearchQuery}
            placeholderTextColor={currentThemeColors.textSecondary}
          />
          {propsLoading ? 
            <ActivityIndicator /> : 
            <FlatList data={filteredPropsForModal} renderItem={renderPropSelectItem} keyExtractor={item => item.id} />
          }
          <TouchableOpacity style={s.closeModalButton} onPress={() => setShowPropSelectionModal(false)}>
            <StyledText style={s.closeModalButtonText}>Cancel</StyledText>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => { if(!isProcessingScan) setShowScanner(false); }}
      >
        <QRScannerScreen 
          onScan={handleQrScan}
          onClose={() => { if(!isProcessingScan) setShowScanner(false); }} 
        />
      </Modal>
    </View>
  );
}

const styles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  targetPropSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetPropText: { fontSize: 16, color: colors.text, flex: 1 }, 
  targetPropDisplay: {
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.listBackground,
    borderRadius: 8,
  },
  targetPropImage: { width: 80, height: 80, borderRadius: 6, marginBottom: 8 },
  targetPropImagePlaceholder: { 
    width: 80, height: 80, borderRadius: 6, marginBottom: 8, 
    backgroundColor: colors.inputBackground, justifyContent: 'center', alignItems: 'center' 
  },
  targetPropName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '90%',
    alignSelf: 'center'
  },
  scanButtonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' },
  resultsList: { flex: 1, width: '100%' },
  scannedBoxItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
  },
  boxItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  boxName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: colors.text,
  },
  boxStatusText: {
    fontSize: 14,
    marginBottom: 4,
    color: colors.text,
  },
  boxDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  boxContentPreview: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  boxFound: {
    borderColor: colors.primary,
    backgroundColor: colors.background
  },
  boxNotFound: {
    borderColor: colors.error,
    backgroundColor: colors.background
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 50,
    paddingHorizontal: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  searchInput: {
    height: 44,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemSubText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeModalButton: {
    marginTop: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    flex: 1,
    fontSize: 14,
  },
  infoText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  assignmentInfoContainer: {
    padding: 15,
    backgroundColor: colors.card,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  assignmentText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  assignmentDetailText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.text,
  }
}); 