import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Button, Modal as RNModal, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '../../../src/contexts/FirebaseContext.tsx';
import { useShows } from '../../../src/contexts/ShowsContext.tsx';
import type { Prop, Show, Act, Scene } from '../../../src/shared/types/props.ts';
import type { FirebaseDocument } from '../../../src/shared/services/firebase/types.ts';
import { useTheme } from '../../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../../src/styles/theme.ts';
import StyledText from '../../../src/components/StyledText.tsx';
import { ChevronDown, ChevronUp, DownloadCloud } from 'lucide-react-native'; // For collapsible sections
import { PdfPreview } from '../../../src/components/PdfPreview.tsx'; // Import PdfPreview
import type { PdfGenerationOptions } from '../../../src/shared/types/pdf.ts';

// Helper to get displayable keys from Prop type
const getDisplayablePropKeys = (): (keyof Prop)[] => {
  const includedKeys: (keyof Prop)[] = [
    'name', 'description', 'category', 'price', 'quantity', 'length', 'width',
    'height', 'depth', 'unit', 'weight', 'weightUnit', 'travelWeight', 'source',
    'sourceDetails', 'purchaseUrl', 'rentalDueDate', 'act', 'scene', 'sceneName',
    'usageInstructions', 'maintenanceNotes', 'safetyNotes', 'handlingInstructions',
    'preShowSetupDuration', 'preShowSetupNotes', 'preShowSetupVideo',
    'shippingCrateDetails', 'transportMethod', 'transportNotes', 'status',
    'location', 'currentLocation', 'notes', 'tags', 'materials',
    'nextMaintenanceDue', 'modificationDetails', 'lastUsedAt', 'condition', 'purchaseDate', 'handedness',
    'isMultiScene', 'isConsumable', 'requiresPreShowSetup', 'hasOwnShippingCrate', 
    'requiresSpecialTransport', 'hasBeenModified', 'isBreakable', 'isHazardous',
    'storageRequirements',
  ];
  return includedKeys;
};

// Helper function to format field labels
const formatLabel = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<SectionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(colors);

  return (
    <View style={s.sectionContainer}>
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)} style={s.sectionHeader}>
        <StyledText style={s.sectionTitle}>{title}</StyledText>
        {isOpen ? <ChevronUp color={colors.text} size={20} /> : <ChevronDown color={colors.text} size={20} />}
      </TouchableOpacity>
      {isOpen && <View style={s.sectionContent}>{children}</View>}
    </View>
  );
};

export default function MobilePdfOptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { getShowById } = useShows();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);

  const [show, setShow] = useState<Show | null>(null);
  const [propData, setPropData] = useState<Prop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const showId = typeof params.showId === 'string' ? params.showId : undefined;

  // PDF Customization State
  const [checkedActs, setCheckedActs] = useState<Record<string, boolean>>({});
  const [checkedScenes, setCheckedScenes] = useState<Record<string, boolean>>({});
  const [imageCount, setImageCount] = useState<number>(1);
  const [showFilesQR, setShowFilesQR] = useState<boolean>(false);
  const [showVideosQR, setShowVideosQR] = useState<boolean>(false);
  const [selectedFields, setSelectedFields] = useState<Record<keyof Prop, boolean>>(() => {
    const initialFields: Record<string, boolean> = {};
    const defaultSelected: (keyof Prop)[] = ['name', 'category', 'description', 'location', 'status', 'quantity', 'condition', 'imageUrl', 'act', 'scene'];
    getDisplayablePropKeys().forEach(key => {
      initialFields[key as string] = defaultSelected.includes(key);
    });
    return initialFields as Record<keyof Prop, boolean>;
  });
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [imageWidthOption, setImageWidthOption] = useState<'small' | 'medium' | 'full'>('medium');
  // Columns state might be complex for mobile HTML rendering, starting with 1 or 2 basic options
  const [columns, setColumns] = useState<number>(1); 

  // New state for showing PdfPreview Modal
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [currentPdfOptions, setCurrentPdfOptions] = useState<PdfGenerationOptions | null>(null);

  const displayablePropKeys = getDisplayablePropKeys();

  useEffect(() => {
    if (!showId || !firebaseInitialized || !firebaseService || !getShowById) {
      setError('Missing dependencies to load data.');
      setIsLoading(false);
      return;
    }

    let propsUnsubscribe: (() => void) | null = null;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const showData = await getShowById(showId);
        if (!showData) throw new Error(`Show with ID ${showId} not found.`);
        setShow(showData);

        propsUnsubscribe = firebaseService.listenToCollection<Prop>(
          'props',
          (propDocs: FirebaseDocument<Prop>[]) => {
            const extractedData = propDocs.map(doc => ({ ...doc.data, id: doc.id } as Prop));
            setPropData(extractedData);
            setIsLoading(false);
          },
          (err: Error) => {
            setError('Failed to load props.');
            setIsLoading(false);
          },
          { where: [['showId', '==', showId]] }
        );
      } catch (fetchError: any) {
        setError(fetchError.message || 'Error loading show data.');
        setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      if (propsUnsubscribe) propsUnsubscribe();
    };
  }, [showId, firebaseInitialized, firebaseService, getShowById]);

  useEffect(() => {
    if (show?.acts) {
      const initialActs: Record<string, boolean> = {};
      const initialScenes: Record<string, boolean> = {};
      show.acts.forEach((act: Act) => {
        initialActs[String(act.id)] = true; // Default to checked
        act.scenes?.forEach((scene: Scene) => {
          initialScenes[String(scene.id)] = true; // Default to checked
        });
      });
      setCheckedActs(initialActs);
      setCheckedScenes(initialScenes);
    }
  }, [show]);

  const filteredPropData = useMemo(() => {
    if (!show) return [];
    return propData.filter(p => {
      const actMatch = !p.act || checkedActs[String(p.act)] !== false; // If no act or act is checked (or not in checkedActs, implying check all)
      const sceneMatch = !p.scene || checkedScenes[String(p.scene)] !== false; // If no scene or scene is checked
      return actMatch && sceneMatch;
    });
  }, [propData, checkedActs, checkedScenes, show]);

  const handleGeneratePdf = () => {
    if (!show) {
      Alert.alert("Error", "Show data is not available.");
      return;
    }
    const pdfOptions: PdfGenerationOptions = {
      selectedFields,
      layout,
      columns,
      imageCount,
      imageWidthOption,
      showFilesQR,
      showVideosQR,
      title: `${show.name} - Props List` // Example title
    };
    setCurrentPdfOptions(pdfOptions);
    setShowPdfPreviewModal(true);
    console.log("Opening PDF Preview with options:", pdfOptions);
    console.log("Filtered props for PDF:", filteredPropData.length);
  };
  
  const renderSwitchOption = (label: string, value: boolean, onValueChange: (newValue: boolean) => void) => (
    <View style={s.optionRow}>
      <StyledText style={s.optionLabel}>{label}</StyledText>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#767577", true: currentThemeColors.primary }} thumbColor={value ? currentThemeColors.primary : "#f4f3f4"} />
    </View>
  );

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator size="large" color={currentThemeColors.primary} /><StyledText>Loading PDF Options...</StyledText></View>;
  }
  if (error) {
    return <View style={s.centered}><StyledText style={s.errorText}>Error: {error}</StyledText></View>;
  }
  if (!show) {
    return <View style={s.centered}><StyledText>Show not found.</StyledText></View>;
  }

  return (
    <>
      <ScrollView style={s.container}>
        <Stack.Screen options={{ title: `PDF Options: ${show?.name || ''}` }} />
        <StyledText style={s.headerTitle}>Customize PDF for "{show?.name}"</StyledText>
        <StyledText style={s.subHeader}>({filteredPropData.length} props selected based on filters)</StyledText>

        <CollapsibleSection title="Layout & Format" defaultOpen>
          {renderSwitchOption("Layout: Landscape", layout === 'landscape', (val) => setLayout(val ? 'landscape' : 'portrait'))}
          <View style={s.optionRow}>
            <StyledText style={s.optionLabel}>Columns:</StyledText>
            <View style={s.horizontalPicker}>
              {[1, 2].map(num => (
                <TouchableOpacity key={`col-count-${num}`} onPress={() => setColumns(num)} style={[s.pickerButton, columns === num && s.pickerButtonSelected]}>
                  <StyledText style={s.pickerButtonText}>{num}</StyledText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </CollapsibleSection>

        <CollapsibleSection title="Filters: Acts & Scenes">
          {show?.acts && show.acts.length > 0 ? show.acts.map((act: Act) => (
            <View key={`act-${act.id}`} style={s.filterGroup}>
              {renderSwitchOption(act.name || `Act ${act.id}`, checkedActs[String(act.id)] !== false, (val) => setCheckedActs(prev => ({...prev, [String(act.id)]: val})))}
              {checkedActs[String(act.id)] !== false && act.scenes && act.scenes.length > 0 && (
                <View style={s.sceneList}>
                  {act.scenes.map((scene: Scene) => (
                    <View key={`scene-${scene.id}`} style={s.sceneItem}>
                      {renderSwitchOption(scene.name || `Scene ${scene.id}`, checkedScenes[String(scene.id)] !== false, (val) => setCheckedScenes(prev => ({...prev, [String(scene.id)]: val})))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )) : <StyledText style={s.infoText}>No acts defined for this show.</StyledText>}
        </CollapsibleSection>

        <CollapsibleSection title="Content: Fields to Include">
          {displayablePropKeys.map(key => (
            <View key={`field-${key}`} style={s.fieldItem}>
              {renderSwitchOption(formatLabel(key), selectedFields[key] === true, (val) => setSelectedFields(prev => ({...prev, [key]: val})))}
            </View>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Image Options">
          <View style={s.optionRow}>
            <StyledText style={s.optionLabel}>Images per Prop (0-5):</StyledText>
            <View style={s.horizontalPicker}>
              {[0, 1, 2, 3, 4, 5].map(num => (
                <TouchableOpacity key={`img-count-${num}`} onPress={() => setImageCount(num)} style={[s.pickerButton, imageCount === num && s.pickerButtonSelected]}>
                  <StyledText style={s.pickerButtonText}>{num}</StyledText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.optionRow}>
            <StyledText style={s.optionLabel}>Image Width:</StyledText>
            <View style={s.horizontalPicker}>
              {( ['small', 'medium', 'full'] as const).map(opt => (
                <TouchableOpacity key={`img-width-${opt}`} onPress={() => setImageWidthOption(opt)} style={[s.pickerButton, imageWidthOption === opt && s.pickerButtonSelected]}>
                  <StyledText style={s.pickerButtonText}>{formatLabel(opt)}</StyledText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </CollapsibleSection>
        
        <CollapsibleSection title="QR Code Options">
          {renderSwitchOption("Show QR for Files", showFilesQR, setShowFilesQR)}
          {renderSwitchOption("Show QR for Videos", showVideosQR, setShowVideosQR)}
        </CollapsibleSection>

        <TouchableOpacity style={s.generateButton} onPress={handleGeneratePdf}>
          <DownloadCloud color={currentThemeColors.card} size={22} style={{marginRight: 10}} />
          <StyledText style={s.generateButtonText}>Preview PDF</StyledText>
        </TouchableOpacity>
      </ScrollView>

      {showPdfPreviewModal && currentPdfOptions && show && (
        <RNModal
          visible={showPdfPreviewModal}
          animationType="slide"
          onRequestClose={() => setShowPdfPreviewModal(false)}
        >
          <PdfPreview 
            props={filteredPropData} 
            show={show} 
            options={currentPdfOptions} // Pass the collected options
            onClose={() => setShowPdfPreviewModal(false)} 
          />
        </RNModal>
      )}
    </>
  );
}

const styles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  subHeader: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: colors.listBackground,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionContent: {
    padding: 15,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontSize: 16,
    color: colors.text,
    flexShrink: 1, 
    marginRight: 10,
  },
  fieldItem: {
    // Similar to optionRow but might not need border if last item handled by section
     flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterGroup: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  sceneList: {
    marginTop: 5,
    paddingLeft: 15,
  },
  sceneItem: {
    paddingVertical: 5,
  },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.inputBackground,
    borderRadius: 5,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  horizontalPicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    marginHorizontal: 15,
  },
  generateButtonText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  infoText: {
      color: colors.textSecondary,
      fontStyle: 'italic',
      paddingVertical: 10,
  }
}); 