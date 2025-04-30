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
  console.log("[PropsScreen] Rendering...");

  const router = useRouter();
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
  
  const initialShowIdAttempt = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log("--- Programmatically redirecting from app/(tabs)/props.tsx to /props on web ---");
      router.replace('/props');
    }
  }, [router]);

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
      router.push('/props/add' as any);
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

  const renderContent = () => {
    if (propsLoading) {
      return (
        <View style={styles.contentLoadingContainer}> 
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.messageText}>Loading Props...</Text>
        </View>
      );
    } else {
      return (
        <PropList 
          props={props}
          onEdit={handleOpenEditPropPage}
          onDelete={handleDelete}
        />
      );
    }
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
    <View style={styles.fullFlexContainer}>
      {renderContent()}

      <Modal visible={showProfile} onRequestClose={() => setShowProfile(false)} animationType="slide">
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>User Profile Placeholder</Text></View> 
      </Modal>

      <Modal visible={showAddShowModal} onRequestClose={() => setShowAddShowModal(false)} animationType="slide">
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Add Show Modal Placeholder</Text></View> 
      </Modal>

      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenAddPropPage}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color="white" />
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
}); 