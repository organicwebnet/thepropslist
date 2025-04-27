import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Button, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { User } from 'firebase/auth';
import { Firestore, collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';

import { PropList } from '../../src/components/PropList';
import { Show } from '../../src/types';
import { Prop, PropFormData } from '../../src/shared/types/props';
import { PropForm } from '../../src/components/PropForm';
import { UserProfileModal } from '../../src/components/UserProfile';
import { ShareModal } from '../../src/components/ShareModal';
import { PropLifecycleStatus } from '../../src/types/lifecycle';
import { useFirebase } from '../../src/contexts/FirebaseContext';
import { useAuth } from '../../src/contexts/AuthContext';

export type Filters = {
  name: string;
  location: string;
  status?: PropLifecycleStatus;
  search: string;
};

const initialFilters: Filters = {
  name: '',
  location: '',
  status: undefined,
  search: '',
};

const LAST_SHOW_ID_KEY = 'lastSelectedShowId';

export default function PropsScreen() {
  console.log("--- Rendering: app/(tabs)/props.tsx ---");

  const router = useRouter();
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const { user } = useAuth();
  const [propsLoading, setPropsLoading] = useState(false);
  const [showsLoading, setShowsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddShowModal, setShowAddShowModal] = useState(false);
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [showEditPropModal, setShowEditPropModal] = useState(false);
  const [propToEdit, setPropToEdit] = useState<Prop | null>(null);
  const [showIdForNewProp, setShowIdForNewProp] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filteredProps, setFilteredProps] = useState<Prop[]>([]);
  
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
        const db = firebaseService.firestore();
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists() || !userDoc.data()?.onboardingCompleted) {
            console.log("User needs onboarding (checked in PropsScreen)");
            if (!userDoc.exists()) {
              await setDoc(userDocRef, { onboardingCompleted: false, createdAt: new Date().toISOString() });
            }
            setShowOnboarding(true);
          } else {
            setShowOnboarding(false);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
    };
    checkOnboarding();
  }, [user, firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (!user || !firebaseInitialized || !firebaseService) {
      setShows([]);
      setSelectedShow(null);
      setShowsLoading(false);
      return;
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
    const db = firebaseService.firestore();
    console.log(`Fetching shows for user ${user.uid}`);
    const q = query(collection(db, 'shows'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, querySnapshot => {
      const showsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Show));
      console.log("Fetched shows:", showsData.length);
      setShows(showsData);

      let showToSelect: Show | null = null;
      const attemptedId = initialShowIdAttempt.current;

      if (attemptedId && attemptedId !== 'error' && attemptedId !== 'no_storage') {
          const foundShow = showsData.find(s => s.id === attemptedId);
          if (foundShow) {
              console.log("Restoring show from localStorage ID:", attemptedId);
              showToSelect = foundShow;
          } else {
              console.log("Stored show ID not found in fetched list, selecting first.");
          }
          initialShowIdAttempt.current = 'used'; 
      }
      
      if (!showToSelect && showsData.length > 0) {
          console.log("Selecting first available show.");
          showToSelect = showsData[0];
      }
      
      if (selectedShow?.id !== showToSelect?.id) {
           setSelectedShow(showToSelect);
      }

      setShowsLoading(false);
    }, error => {
      console.error("Error fetching shows: ", error);
      setShowsLoading(false);
    });

    return () => {
      console.log("Cleaning up shows listener");
      unsubscribe();
    };
  }, [user, firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (!selectedShow || !firebaseInitialized || !firebaseService) {
      setProps([]);
      setPropsLoading(false);
      return;
    }
    setPropsLoading(true);
    const db = firebaseService.firestore();
    console.log(`Fetching props for show ${selectedShow.id}`);
    const q = query(collection(db, 'props'), where('showId', '==', selectedShow.id));
    const unsubscribe = onSnapshot(q, querySnapshot => {
      const propsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prop));
      console.log("Fetched props:", propsData.length);
      setProps(propsData);
      setPropsLoading(false);
    }, error => {
      console.error("Error fetching props: ", error);
      setPropsLoading(false);
    });

    return () => {
      console.log("Cleaning up props listener");
      unsubscribe();
    };
  }, [selectedShow, firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (!selectedShow) {
      setFilteredProps([]);
      return;
    }
    const filtered = props.filter(prop => {
      return (
        prop.showId === selectedShow.id &&
        (filters.name === '' || prop.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (filters.location === '' || (prop.location && prop.location.toLowerCase().includes(filters.location.toLowerCase()))) &&
        (filters.status === undefined || prop.status === filters.status)
      );
    });
    setFilteredProps(filtered);
  }, [props, filters, selectedShow]);

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

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  };

  const handleFilterReset = () => {
    setFilters(initialFilters);
  };

  const handleOpenAddPropModal = () => {
    if (selectedShow) {
      setShowIdForNewProp(selectedShow.id);
      setShowAddPropModal(true);
    } else {
      Alert.alert("No Show Selected", "Please select a show before adding a prop.");
    }
  };

  const handleCloseAddPropModal = () => {
    setShowAddPropModal(false);
    setShowIdForNewProp(null);
  };

  const handleOpenEditPropModal = (prop: Prop) => {
    setPropToEdit(prop);
    setShowEditPropModal(true);
  };

  const handleCloseEditPropModal = () => {
    setShowEditPropModal(false);
    setPropToEdit(null);
  };

  const handleAdd = async (formData: PropFormData) => {
    if (!user || !firebaseInitialized || !firebaseService || !showIdForNewProp) return;
    const db = firebaseService.firestore();
    try {
      const propDataToAdd = {
        ...formData,
        userId: user.uid,
        showId: showIdForNewProp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'props'), propDataToAdd);
      handleCloseAddPropModal();
    } catch (error) {
      console.error('Error adding prop:', error);
      Alert.alert('Error', 'Failed to add prop.');
    }
  };

  const handleUpdate = async (formData: PropFormData) => {
    if (!user || !firebaseInitialized || !firebaseService || !propToEdit) return;
    const db = firebaseService.firestore();
    try {
      const propRef = doc(db, 'props', propToEdit.id);
      const propDataToUpdate: Partial<Prop> = {
        ...formData,
        userId: user.uid,
        lastModifiedAt: formData.lastModifiedAt || undefined,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(propRef, propDataToUpdate as any);
      handleCloseEditPropModal();
    } catch (error) {
      console.error('Error updating prop:', error);
      Alert.alert('Error', 'Failed to update prop.');
    }
  };

  const handleDelete = async (propId: string) => {
    if (!user || !firebaseInitialized || !firebaseService) return;
    const db = firebaseService.firestore();
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
              await deleteDoc(doc(db, 'props', propId));
            } catch (error) {
              console.error('Error deleting prop:', error);
              Alert.alert('Error', 'Failed to delete prop.');
            }
          },
        },
      ]
    );
  };

  const handleSelectShow = (show: Show) => {
    setSelectedShow(show);
    setFilters(initialFilters);
  };

  const handleAddShow = async (showData: Omit<Show, 'id' | 'userId'>) => {
    if (!user || !firebaseInitialized || !firebaseService) return;
    const db = firebaseService.firestore();
    try {
      const newShowData = { 
        ...showData, 
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'shows'), newShowData);
      setShowAddShowModal(false);
    } catch (error) {
      console.error("Error adding show:", error);
      Alert.alert("Error", "Failed to add show.");
    }
  };

  const handleUpdateShow = async (showData: Show) => {
    if (!user || !firebaseInitialized || !firebaseService) return;
    const db = firebaseService.firestore();
    try {
      const showRef = doc(db, 'shows', showData.id);
      const showDataToUpdate: Partial<Show> = {
        ...showData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(showRef, showDataToUpdate);
    } catch (error) {
      console.error("Error updating show:", error);
      Alert.alert("Error", "Failed to update show.");
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!user || !firebaseInitialized || !firebaseService) return;
    const db = firebaseService.firestore();
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this show and all its props?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              const showRef = doc(db, 'shows', showId);
              batch.delete(showRef);
              const propsQuery = query(collection(db, 'props'), where('showId', '==', showId));
              const propsSnapshot = await getDocs(propsQuery);
              propsSnapshot.forEach((propDoc) => {
                batch.delete(doc(db, 'props', propDoc.id));
              });
              await batch.commit();
              if (selectedShow?.id === showId) {
                setSelectedShow(null);
              }
            } catch (error) {
              console.error("Error deleting show and props:", error);
              Alert.alert("Error", "Failed to delete show and its props.");
            }
          },
        },
      ]
    );
  };

  if (showsLoading) {
    return (
      <View style={styles.container} >
        <ActivityIndicator size="large" />
        <Text style={styles.messageText}>Loading Shows...</Text>
      </View>
    );
  }

  if (!showsLoading && shows.length === 0) {
    return (
      <View style={styles.container} >
        <Text style={styles.messageText}>No shows found. Add your first show!</Text>
        <Button title="Add Show" onPress={() => setShowAddShowModal(true)} />
      </View>
    );
  }

  if (!showsLoading && shows.length > 0 && !selectedShow) {
    return (
      <View style={styles.container} >
        <ActivityIndicator size="large" />
        <Text style={styles.messageText}>Selecting Show...</Text>
      </View>
    );
  }

  if (!showsLoading && selectedShow) {
    return (
      <View style={styles.fullFlexContainer}>
        {propsLoading ? (
          <View style={styles.container}><ActivityIndicator size="large" /><Text style={styles.messageText}>Loading Props...</Text></View>
        ) : (
          <View style={styles.listContainer}>
            <PropList 
              props={filteredProps} 
              onEdit={(prop) => handleOpenEditPropModal(prop)} 
              onDelete={handleDelete}
            />
          </View>
        )}

        <Modal visible={showProfile} onRequestClose={() => setShowProfile(false)} animationType="slide">
          {user && <UserProfileModal onClose={() => setShowProfile(false)} />} 
        </Modal>
        
        <Modal visible={showAddPropModal} onRequestClose={handleCloseAddPropModal} animationType="slide">
          <PropForm onSubmit={handleAdd} onCancel={handleCloseAddPropModal} show={selectedShow} />
        </Modal>

        <Modal visible={showEditPropModal} onRequestClose={handleCloseEditPropModal} animationType="slide">
          <PropForm 
            initialData={propToEdit ? { ...propToEdit } as PropFormData : undefined}
            onSubmit={handleUpdate} 
            onCancel={handleCloseEditPropModal} 
            show={selectedShow}
            mode="edit"
          />
        </Modal>

      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.messageText}>Something went wrong determining the state.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullFlexContainer: {
    flex: 1,
  },
  messageText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  listContainer: {
    flex: 1,
  },
}); 