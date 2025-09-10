import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, ScrollView, Image, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useShows } from '../../../src/contexts/ShowsContext';
import { useProps } from '../../../src/contexts/PropsContext';
import { usePacking } from '../../../src/hooks/usePacking';
import type { Prop } from '../../../src/shared/types/props';
import type { PackingBox, PackedProp } from '../../../src/types/packing';
import { QRScannerScreen } from '../../../src/platforms/mobile/features/qr/QRScannerScreen';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../src/styles/theme';
import StyledText from '../../../src/components/StyledText';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface ScannedBoxResult {
  box: PackingBox;
  containsTargetProp: boolean;
  scannedAt: number; // For sorting or TTL
}

// To manage the mode of operation for the finder
type FinderMode = 'container' | 'prop';

export default function PropFinderScreen() {
  const router = useRouter();
  const { selectedShow } = useShows();
  const { props: allShowProps, loading: propsLoading } = useProps();
  const { boxes: allBoxesForShow, getDocument: getBoxById } = usePacking(selectedShow?.id);

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
  const [finderMode, setFinderMode] = useState<FinderMode>('container');
  const [manualCode, setManualCode] = useState('');
  const [manualLookupBox, setManualLookupBox] = useState<PackingBox | null>(null);
  const [scannedBox, setScannedBox] = useState<PackingBox | null>(null);
  const [scannerPurpose, setScannerPurpose] = useState<'container' | 'prop'>('container');

  const availablePropsForShow = selectedShow ? allShowProps.filter(p => p.showId === selectedShow.id) : [];
  const filteredPropsForModal = propSearchQuery
    ? availablePropsForShow.filter(p => p.name.toLowerCase().includes(propSearchQuery.toLowerCase()))
    : availablePropsForShow;

  const handleSelectTargetProp = (prop: Prop) => {
    setTargetProp(prop);
    setScannedBoxes([]);
    setShowPropSelectionModal(false);
    setPropSearchQuery('');
    setError(null);
    setFinderMode('prop');
  };

  const handleQrScan = async (data: Record<string, any>) => {
    console.log('PropFinder Scanned Data:', data);
    if (data && (data.type === 'prop' || data.type === 'PROP' || data.type === 'Prop') && (data.id || data.propId)) {
      // Scanned a prop label → jump to prop mode and locate containers
      const pid = data.id || data.propId;
      const found = availablePropsForShow.find(p => p.id === pid);
      if (found) {
        handleSelectTargetProp(found);
        setFinderMode('prop');
        setShowScanner(false);
        return;
      } else {
        setError('Prop not found in this show.');
        setShowScanner(false);
        return;
      }
    } else if (data && data.type === 'packingBox' && data.id) {
      setIsProcessingScan(true);
      setError(null);
      try {
        const fetchedBoxDoc = await getBoxById(data.id);
        if (fetchedBoxDoc && fetchedBoxDoc.data) {
          const { id: dataId, ...restOfData } = fetchedBoxDoc.data as any; // Exclude id from data if present
          const fetchedBox: PackingBox = { 
            id: fetchedBoxDoc.id, // Use the document ID from snapshot
            ...restOfData 
          } as PackingBox;
          setScannedBox(fetchedBox);
          const contains = targetProp ? !!fetchedBox.props?.some(p => p.propId === targetProp.id) : false;
          if (targetProp) {
            setScannedBoxes(prev => [
              { box: fetchedBox, containsTargetProp: contains, scannedAt: Date.now() },
              ...prev,
            ].sort((a, b) => b.scannedAt - a.scannedAt));
          }
        } else {
          setError(`Box with ID ${data.id} not found.`);
        }
      } catch (e: any) {
        console.error("Error processing scanned box:", e);
        setError(e.message || "Failed to process scanned box.");
      } finally {
        setIsProcessingScan(false);
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
        <Feather name="package" size={20} color={item.containsTargetProp ? currentThemeColors.primary : currentThemeColors.error} />
        <StyledText style={s.boxName}>{item.box.name || item.box.id}</StyledText>
      </View>
      <StyledText style={s.boxStatusText}>
        {item.containsTargetProp ? `Contains "${targetProp?.name}"` : `Does NOT contain "${targetProp?.name}"`}
      </StyledText>
      {item.box.description && <StyledText style={s.boxDescription}>Desc: {item.box.description}</StyledText>}
      <StyledText style={s.boxContentPreview}>Props in box: {item.box.props?.length || 0}</StyledText>
    </View>
  );

  const renderBoxDetails = (box: PackingBox) => (
    <View style={[s.scannedBoxItem, s.boxFound]}>
      <View style={s.boxItemHeader}>
        <Feather name="package" size={20} color={currentThemeColors.primary} />
        <StyledText style={s.boxName}>{box.name || box.id}</StyledText>
      </View>
      <StyledText style={s.boxStatusText}>GUID: {box.id}</StyledText>
      {box.description && <StyledText style={s.boxDescription}>{box.description}</StyledText>}
      <StyledText style={[s.boxStatusText, { marginTop: 4 }]}>Contents:</StyledText>
      {Array.isArray(box.props) && box.props.length > 0 ? (
        box.props.map((p, idx) => (
          <StyledText key={box.id + '-' + idx} style={s.boxContentPreview}>- {p.name} × {p.quantity}</StyledText>
        ))
      ) : (
        <StyledText style={s.boxContentPreview}>No items</StyledText>
      )}
    </View>
  );

  const renderContent = () => {
    if (finderMode === 'container') {
      return (
        <>
          <TouchableOpacity style={s.scanButton} onPress={() => { setError(null); setScannerPurpose('container'); setShowScanner(true); }} disabled={isProcessingScan}>
            {isProcessingScan ? (
              <ActivityIndicator color={currentThemeColors.card} />
            ) : (
              <>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color={currentThemeColors.card} style={{ marginRight: 8 }} />
                <StyledText style={s.scanButtonText}>Scan Container Label</StyledText>
              </>
            )}
          </TouchableOpacity>
          <View style={s.manualLookupRow}>
            <TextInput
              style={s.manualInput}
              placeholder="Enter container GUID"
              placeholderTextColor={currentThemeColors.textSecondary}
              value={manualCode}
              onChangeText={(t) => { setManualCode(t.trim()); setManualLookupBox(null); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!manualCode) return;
                try {
                  setIsProcessingScan(true);
                  setError(null);
                  const doc = await getBoxById(manualCode);
                  if (doc && doc.data) {
                    const { id: _ignored, ...rest } = doc.data as any;
                    setManualLookupBox({ id: doc.id, ...(rest as any) } as PackingBox);
                  } else {
                    setManualLookupBox(null);
                    setError(`Container ${manualCode} not found.`);
                  }
                } catch (e: any) {
                  setManualLookupBox(null);
                  setError(e.message || 'Lookup failed');
                } finally {
                  setIsProcessingScan(false);
                }
              }}
              style={s.lookupButton}
              disabled={isProcessingScan}
            >
              {isProcessingScan ? (
                <ActivityIndicator color={currentThemeColors.card} />
              ) : (
                <StyledText style={s.lookupButtonText}>Lookup</StyledText>
              )}
            </TouchableOpacity>
          </View>
          {scannedBox && renderBoxDetails(scannedBox)}
          {manualLookupBox && renderBoxDetails(manualLookupBox)}
        </>
      );
    }

    // Prop mode: show which containers hold the selected prop
    return (
      <>
        <View style={{ gap: 10 }}>
          <TouchableOpacity style={s.scanButton} onPress={() => setShowPropSelectionModal(true)}>
            <Feather name="search" size={18} color={currentThemeColors.card} style={{ marginRight: 8 }} />
            <StyledText style={s.scanButtonText}>{targetProp ? `Selected: ${targetProp.name}` : 'Select Prop to Locate'}</StyledText>
          </TouchableOpacity>
          <TouchableOpacity style={[s.scanButton, { backgroundColor: '#3A8CC1' }]} onPress={() => { setError(null); setScannerPurpose('prop'); setShowScanner(true); }}>
            <MaterialCommunityIcons name="qrcode-scan" size={20} color={currentThemeColors.card} style={{ marginRight: 8 }} />
            <StyledText style={s.scanButtonText}>Scan Prop Label</StyledText>
          </TouchableOpacity>
        </View>
        {targetProp ? (
          (() => {
            const matches = (allBoxesForShow || []).filter(b => Array.isArray(b.props) && b.props.some(p => p.propId === targetProp.id));
            if (matches.length === 0) {
              return <StyledText style={s.infoText}>No container found for this prop.</StyledText>;
            }
            return (
              <View>
                <StyledText style={[s.boxStatusText, { marginBottom: 6 }]}>Found in:</StyledText>
                {matches.map(b => (
                  <View key={b.id} style={[s.scannedBoxItem, s.boxFound]}>
                    <View style={s.boxItemHeader}>
                      <Feather name="package" size={20} color={currentThemeColors.primary} />
                      <StyledText style={s.boxName}>{b.name || b.id}</StyledText>
                    </View>
                    <StyledText style={s.boxStatusText}>GUID: {b.id}</StyledText>
                    <StyledText style={s.boxContentPreview}>Items: {b.props?.length || 0}</StyledText>
                  </View>
                ))}
              </View>
            );
          })()
        ) : (
          <StyledText style={s.infoText}>Pick a prop to locate its container.</StyledText>
        )}
      </>
    );
  };

  if (!selectedShow) {
    return <View style={s.centered}><StyledText>Please select a show first to use Prop Finder.</StyledText></View>;
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Find' }} />
      {/* Simple mode switch */}
      <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => setFinderMode('container')} style={[s.modeBtn, finderMode === 'container' && s.modeBtnActive]}>
          <StyledText style={[s.modeBtnText, finderMode === 'container' && s.modeBtnTextActive]}>Container</StyledText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFinderMode('prop')} style={[s.modeBtn, finderMode === 'prop' && s.modeBtnActive]}>
          <StyledText style={[s.modeBtnText, finderMode === 'prop' && s.modeBtnTextActive]}>Prop</StyledText>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={s.targetPropSelector} onPress={() => setShowPropSelectionModal(true)}>
        <Feather name="search" size={20} color={currentThemeColors.textSecondary} style={{marginRight: 8}}/>
        <StyledText style={s.targetPropText}>
          {targetProp ? `Searching for: ${targetProp.name}` : 'Tap to select Prop to find'}
        </StyledText>
      </TouchableOpacity>

      {targetProp && (
          <View style={s.targetPropDisplay}>
            {targetProp.primaryImageUrl ? 
                <Image source={{uri: targetProp.primaryImageUrl}} style={s.targetPropImage} /> : 
                <View style={s.targetPropImagePlaceholder}><Feather name="package" size={30} color={currentThemeColors.textSecondary}/></View>
            }
            <StyledText style={s.targetPropName}>{targetProp.name}</StyledText>
          </View>
      )}

      {error && 
        <View style={s.errorContainer}>
            <Feather name="alert-triangle" size={20} color={currentThemeColors.error} style={{marginRight: 8}}/>
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
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeBtnText: { color: colors.text },
  modeBtnTextActive: { color: colors.card, fontWeight: 'bold' },
  manualLookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  lookupButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupButtonText: { color: colors.card, fontWeight: 'bold' },
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
