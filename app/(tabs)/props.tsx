import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Button, Alert, ActivityIndicator, Platform, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import type { FirebaseDocument } from '@/shared/services/firebase/types'; 
import type { QueryOptions } from '@/shared/services/firebase/types'; 
import { Ionicons } from '@expo/vector-icons';

import { PropList } from '../../src/components/PropList';
import { Show } from '../../src/types';
import { Prop, PropFormData } from '../../src/shared/types/props';
import { PropForm } from '../../src/components/PropForm';
import { NativePropForm } from '../../src/components/NativePropForm';
import { UserProfileModal } from '../../src/components/UserProfile';
import { ShareModal } from '../../src/components/ShareModal';
import { PropLifecycleStatus } from '../../src/types/lifecycle';
import { useFirebase } from '../../src/contexts/FirebaseContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { LoadingScreen } from '../../src/components/LoadingScreen';

const LAST_SHOW_ID_KEY = 'lastSelectedShowId';

export default function PropsScreen() {
  const router = useRouter();
  const isWeb = typeof window !== 'undefined';

  // --- Force render null on web --- 
  if (isWeb) {
      console.warn("[PropsScreen] Detected web environment - rendering null to prevent mobile UI display.");
      return null; // Render nothing on web
  }
  // --- End force null --- 

  // --- Mobile-only hooks and state below ---
  console.log("[PropsScreen] Rendering mobile content..."); 

  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const { user } = useAuth();
  console.log(`[PropsScreen] State: user=${user?.uid}, firebaseInitialized=${firebaseInitialized}`);
  const [propsLoading, setPropsLoading] = useState(false);
  const [showsLoading, setShowsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddShowModal, setShowAddShowModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [selectedPropForEdit, setSelectedPropForEdit] = useState<Prop | null>(null);
  
  const initialShowIdAttempt = useRef<string | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user && firebaseInitialized && firebaseService) {
         console.log("Onboarding check temporarily disabled pending service refactor.");
         // TODO: Refactor using firebaseService methods (getDocument, setDocument) 
         // or ensure correct SDK functions (doc, getDoc, setDoc) are imported 
         // for the mobile platform if direct access is needed.
      }
    };
    checkOnboarding();
  }, [user, firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (!user || !firebaseInitialized || !firebaseService?.listenToCollection) {
      setShows([]);
      setSelectedShow(null);
      setShowsLoading(false);
      return () => {};
    }

    if (initialShowIdAttempt.current === null && typeof window !== 'undefined' && window.localStorage) { 
        try {
            initialShowIdAttempt.current = localStorage.getItem(LAST_SHOW_ID_KEY);
            if (initialShowIdAttempt.current) {
                 console.log('Attempting to restore show ID:', initialShowIdAttempt.current);
            }
        } catch (e) {
            console.error("Failed to read show ID from localStorage:", e);
            initialShowIdAttempt.current = 'error';
        }
    } else if (initialShowIdAttempt.current === null) {
        initialShowIdAttempt.current = 'no_storage';
    }

    setShowsLoading(true);
    console.log(`Fetching shows for user ${user.uid} using service`);

    const queryOptions: QueryOptions = {
      where: [['userId', '==', user.uid]],
    };

    const unsubscribeShows = firebaseService.listenToCollection<Show>(
      'shows',
      (showDocs: FirebaseDocument<Show>[]) => {
        const showsData = showDocs.map(doc => ({ id: doc.id, ...doc.data } as Show));
        console.log("Fetched shows via service:", showsData.length);
        setShows(showsData);

        let showToSelect: Show | null = null;
        const attemptedId = initialShowIdAttempt.current;

        if (attemptedId && attemptedId !== 'error' && attemptedId !== 'no_storage') {
            const foundShow = showsData.find((s: Show) => s.id === attemptedId);
            if (foundShow) {
                console.log("Restoring show from localStorage ID:", attemptedId);
                showToSelect = foundShow;
            } else {
                console.log("Stored show ID not found in fetched list, selecting first.");
            }
            initialShowIdAttempt.current = 'used'; 
        }
        
        if (!showToSelect && showsData.length > 0) {
            showToSelect = showsData[0];
        }
        
        if (selectedShow?.id !== showToSelect?.id) {
             setSelectedShow(showToSelect);
        }

        setShowsLoading(false);
      },
      (error: Error) => {
        console.error("Error fetching shows via service: ", error);
        setShowsLoading(false);
      },
      queryOptions
    );

    return () => {
      console.log("Cleaning up shows listener (service)");
      if (unsubscribeShows) {
         unsubscribeShows();
      }
    };
  }, [user, firebaseInitialized, firebaseService]);

  useEffect(() => {
    console.log(`[PropsScreen] Props Fetch Effect Triggered. SelectedShow ID: ${selectedShow?.id}, Initialized: ${firebaseInitialized}`);
    if (!selectedShow || !firebaseInitialized || !firebaseService?.listenToCollection) {
      console.log(`[PropsScreen] Props Fetch Effect: Skipping fetch (Show: ${!!selectedShow}, Initialized: ${firebaseInitialized}, Service: ${!!firebaseService?.listenToCollection})`);
      setProps([]);
      setPropsLoading(false);
      return () => {};
    }
    
    setPropsLoading(true);
    console.log(`[PropsScreen] Fetching props for show ${selectedShow.id} using service`);

    const queryOptions: QueryOptions = {
      where: [['showId', '==', selectedShow.id]],
    };

    const unsubscribeProps = firebaseService.listenToCollection<Prop>(
      'props',
      (propDocs: FirebaseDocument<Prop>[]) => {
        const propsData = propDocs.map(doc => ({ id: doc.id, ...doc.data } as Prop));
        console.log(`[PropsScreen] Fetched props via service: ${propsData.length}`);
        setProps(propsData);
        setPropsLoading(false);
      },
      (error: Error) => {
        console.error("[PropsScreen] Error fetching props via service: ", error);
        setPropsLoading(false);
      },
      queryOptions
    );

    return () => {
      console.log("[PropsScreen] Cleaning up props listener (service)");
      if (unsubscribeProps) {
        unsubscribeProps();
      }
    };
  }, [selectedShow, firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (selectedShow && typeof window !== 'undefined' && window.localStorage) {
        try {
            localStorage.setItem(LAST_SHOW_ID_KEY, selectedShow.id);
            console.log('Saved last selected show ID:', selectedShow.id);
        } catch (e) {
            console.error("Failed to save show ID to localStorage:", e);
        }
    }
  }, [selectedShow]);

  const handleOpenAddPropPage = () => {
    if (selectedShow) {
      router.push('/props/new' as any);
    } else {
      Alert.alert("No Show Selected", "Please select a show before adding a prop.");
    }
  };

  const handleOpenEditPropPage = (prop: Prop) => {
    router.push(`/props/${prop.id}/edit`);
  };

  const handleDelete = async (propId: string) => {
    if (!user || !firebaseInitialized || !firebaseService?.deleteDocument) { 
      console.error("Delete Prop Error: Service not available.");
      Alert.alert('Error', 'Could not delete prop.');
      return; 
    }
    
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this prop?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firebaseService.deleteDocument('props', propId);
              console.log("Prop deleted with ID:", propId);
            } catch (error) {
              console.error('Error deleting prop via service:', error);
              Alert.alert('Error', 'Failed to delete prop.');
            }
          },
        },
      ]
    );
  };

  const handleSelectShow = (show: Show) => {
    setSelectedShow(show);
  };

  const handleAddShow = async (showData: Omit<Show, 'id' | 'userId'>) => {
    if (!user || !firebaseInitialized || !firebaseService?.addDocument) { 
       console.error("Add Show Error: User or Service missing.");
       Alert.alert('Error', 'Could not add show.');
      return; 
    }
    
    try {
      const newShowData: Omit<Show, 'id'> = { 
        ...showData, 
        userId: user.uid,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
      };
      await firebaseService.addDocument('shows', newShowData);
      console.log("Show added successfully");
      setShowAddShowModal(false);
    } catch (error) {
      console.error("Error adding show via service:", error);
      Alert.alert("Error", "Failed to add show.");
    }
  };

  const handleUpdateShow = async (showData: Show) => {
    if (!user || !firebaseInitialized || !firebaseService?.updateDocument) { 
      console.error("Update Show Error: User or Service missing.");
       Alert.alert('Error', 'Could not update show.');
      return; 
    }
    
    try {
      const showDataToUpdate: Partial<Show> = {
        ...showData, 
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      await firebaseService.updateDocument('shows', showData.id, showDataToUpdate);
      console.log("Show updated successfully:", showData.id);
    } catch (error) {
      console.error("Error updating show via service:", error);
      Alert.alert("Error", "Failed to update show.");
    } 
  };

  const handleDeleteShow = async (showId: string) => {
    if (!user || !firebaseInitialized || !firebaseService?.deleteDocument || !firebaseService?.runTransaction || !firebaseService?.listenToCollection) { 
      console.error("Delete Show Error: Service or required methods (delete, transaction, listen) missing.");
      Alert.alert('Error', 'Could not delete show. Service capabilities missing.');
      return; 
    }
    
    let propIdsToDelete: string[] = [];
    let unsubscribePropsFetch: (() => void) | null = null;
    const propsQueryOptions: QueryOptions = { where: [['showId', '==', showId]] };
    
    console.log(`Fetching props for show ${showId} before delete confirmation...`);
    try {
       unsubscribePropsFetch = firebaseService.listenToCollection<Prop>(
          'props',
          (propDocs: FirebaseDocument<Prop>[]) => {
             propIdsToDelete = propDocs.map((doc: FirebaseDocument<Prop>) => doc.id);
             console.log(`Found ${propIdsToDelete.length} props associated with show ${showId}.`);
             if (unsubscribePropsFetch) {
                 unsubscribePropsFetch();
                 unsubscribePropsFetch = null;
             }
             showDeleteConfirmation(showId, propIdsToDelete);
          },
          (error: Error) => {
             console.error("Error fetching props before delete:", error);
             if (unsubscribePropsFetch) {
                 unsubscribePropsFetch();
                 unsubscribePropsFetch = null;
             }
             Alert.alert("Error", "Could not fetch props to delete. Aborting delete operation.");
          },
          propsQueryOptions
       );
       setTimeout(() => {
           if (unsubscribePropsFetch) { 
              console.warn("Timeout waiting for props fetch before delete confirmation. Proceeding without prop deletion confirmation.");
              unsubscribePropsFetch();
              unsubscribePropsFetch = null;
              showDeleteConfirmation(showId, []);
           }
       }, 5000);

    } catch (fetchError) {
        console.error("Error setting up props listener for delete:", fetchError);
        Alert.alert("Error", "Could not initiate prop check for deletion.");
        return;
    }
    
    const showDeleteConfirmation = (showIdToDelete: string, fetchedPropIds: string[]) => {
        Alert.alert(
          "Confirm Delete",
          `Are you sure you want to delete this show and its ${fetchedPropIds.length} associated props?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  if (!firebaseService?.runTransaction) { 
                      throw new Error("Transaction capability became unavailable.");
                  }
                  await firebaseService.runTransaction(async (transaction) => {
                      fetchedPropIds.forEach((propId: string) => {
                          transaction.delete('props', propId); 
                      });
                      
                      transaction.delete('shows', showIdToDelete);
                  });
                  
                  console.log("Show and its props deleted successfully:", showIdToDelete);
                  if (selectedShow?.id === showIdToDelete) {
                    setSelectedShow(null);
                  }
                } catch (error) {
                  console.error("Error deleting show and props via service transaction:", error);
                  Alert.alert("Error", "Failed to delete show and its props.");
                }
              },
            },
          ]
        );
    }
  };

  const handleCreatePropWeb = async (formData: PropFormData) => {
    console.log("Creating prop (Web):", formData);
    // TODO: Implement actual creation via firebaseService.addDocument
    // Requires selectedShow.id
  };

  const handleUpdatePropWeb = async (formData: PropFormData) => {
    if (!selectedPropForEdit) return;
    console.log(`Updating prop ${selectedPropForEdit.id} (Web):`, formData);
    // TODO: Implement actual update via firebaseService.updateDocument
  };

  const mapPropToFormData = (prop: Prop): PropFormData => {
    console.warn("mapPropToFormData not fully implemented. Using direct cast.");
    // TODO: Implement proper mapping, ensuring all PropFormData fields exist
    return { ...initialFormState, ...prop } as PropFormData; // Basic spread, might miss nested/optional fields
  };

  const handleExportPdf = () => Alert.alert("Export PDF", "Feature not yet implemented.");
  const handleExportCsv = () => Alert.alert("Export CSV", "Feature not yet implemented.");
  const handleRemoveDuplicates = () => Alert.alert("Remove Duplicates", "Feature not yet implemented.");

  const renderMobileContent = () => {
    if (showsLoading || (selectedShow && propsLoading)) {
        return (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FBBF24" />
          </View>
        );
    }
    if (!selectedShow) {
        return (
          <View style={styles.centered}>
            <Text style={styles.infoText}>Please select a show.</Text>
            {/* TODO: Add show selector for mobile? */} 
          </View>
        );
    }
    return (
      <PropList 
          props={props} 
          onEdit={handleOpenEditPropPage}
          onDelete={handleDelete}
      />
    );
  };

  console.log(`[PropsScreen] Preparing to render. propsLoading=${propsLoading}, showsLoading=${showsLoading}, selectedShow=${selectedShow?.id}`);

  if (showsLoading) {
    return <LoadingScreen message="Loading shows..." />;
  }

  if (!selectedShow) {
    return (
      <View style={styles.container}><Text style={styles.infoText}>Please select a show</Text></View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TODO: Add Mobile Header with Show Selector? */} 
      {selectedShow && <Text style={styles.showTitle}>{selectedShow.name}</Text>}
      {renderMobileContent()}
      {selectedShow && (
         <TouchableOpacity
            style={styles.fab}
            onPress={handleOpenAddPropPage} // Mobile uses FAB to navigate
            activeOpacity={0.7}
         >
            <Ionicons name="add" size={30} color="#FFFFFF" />
         </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 10,
  },
  infoText: {
    color: '#D1D5DB',
    fontSize: 16,
    textAlign: 'center',
  },
  fullFlexContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  messageText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFFFFF',
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#2D2D2D',
  },
  searchInput: {
    backgroundColor: '#4A4A4A',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  filterPlaceholder: {
    color: '#9CA3AF',
    paddingVertical: 8,
    marginBottom: 5,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrapper: {
  },
  listContainer: {
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  filterToggleText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
  },
  contentLoadingContainer: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#0EA5E9',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#111827', // Dark background for the whole screen
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#D1D5DB',
    fontSize: 16,
  },
  showTitle: { // Style for the show title
      fontSize: 22,
      fontWeight: 'bold',
      color: '#FBBF24', // Accent color
      textAlign: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
      backgroundColor: '#1F2937', // Slightly lighter background for emphasis
      borderBottomWidth: 1,
      borderBottomColor: '#374151',
  },
  webContainer: { // Web main container
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1F2937',
  },
  webListColumn: { // Web left column
    flex: 1, // Adjust ratio if needed (e.g., flex: 2)
    borderRightWidth: 1,
    borderColor: '#333',
  },
  webFormColumn: { // Web right column
    flex: 1, // Adjust ratio if needed (e.g., flex: 1)
    backgroundColor: '#111827' // Slightly different bg for form area
  },
  webListHeader: { // Header for web list column
     padding: 15,
     borderBottomWidth: 1,
     borderColor: '#333',
     backgroundColor: '#1A1A1A', // Header background
  },
  webColumnTitle: { // Title style for web column
     fontSize: 18,
     fontWeight: '600',
     color: '#E5E7EB',
     marginBottom: 10,
  },
  webButtonContainer: { // Container for buttons in web header
     flexDirection: 'row',
     justifyContent: 'flex-start', // Or space-around
     gap: 10,
  },
});

const initialFormState: PropFormData = { price: 0, name: '', category: 'Other', quantity: 1, status: 'confirmed', source: 'bought', images: [], digitalAssets: [], weightUnit: 'kg', unit: 'cm', act: 1, scene: 1 }; 