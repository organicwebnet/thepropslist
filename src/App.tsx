import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, getRedirectResult, GoogleAuthProvider, linkWithCredential } from 'firebase/auth';
import { AuthForm } from './components/AuthForm';
import { PropForm } from './components/PropForm';
import { PropList } from './components/PropList';
import { ShowList } from './components/ShowList';
import { UserProfileModal } from './components/UserProfile';
import { ShareModal } from './components/ShareModal';
import { WebFirebaseService } from './platforms/web/services/firebase';
import type { Prop, PropFormData } from './shared/types/props';
import type { Filters, Show, ShowFormData } from './types';
import { LogOut, PlusCircle, Pencil, Trash2, Plus } from 'lucide-react';
import ShowForm from './components/ShowForm';
import { SearchBar } from './components/SearchBar';
import { PropFilters } from './components/PropFilters';
import { ExportToolbar } from './components/ExportToolbar';
import { OnboardingGuide } from './components/OnboardingGuide';
import Sidebar from './components/Sidebar';

const initialFilters: Filters = {
  search: '',
  act: undefined,
  scene: undefined,
  category: undefined
};

// Instantiate the service
const firebaseService = new WebFirebaseService();
// Get auth and db instances (assuming firestore() returns the db instance)
let auth: ReturnType<typeof firebaseService.auth> | null = null;
let db: ReturnType<typeof firebaseService.firestore> | null = null;

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth?.currentUser);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [activeTab, setActiveTab] = useState<'props' | 'shows' | 'packing'>('props');
  const [selectedProp, setSelectedProp] = useState<Prop | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [showFormMode, setShowFormMode] = useState<'create' | 'edit'>('create');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false); // State to track initialization

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      try {
        await firebaseService.initialize();
        auth = firebaseService.auth(); // Assign after initialization
        db = firebaseService.firestore(); // Assign after initialization
        setFirebaseInitialized(true);
        console.log('Firebase initialized in App.tsx');
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        // Handle initialization error (e.g., show error message)
      }
    };
    initFirebase();
  }, []);

  useEffect(() => {
    if (!firebaseInitialized || !auth) { // Wait for initialization and auth instance
      return;
    }
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setShowAuth(true);
        setShows([]);
        setProps([]);
        setSelectedShow(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [firebaseInitialized]); // Depend on initialization state

  useEffect(() => {
    if (!user || !db || !firebaseInitialized) { // Wait for user, db, and initialization
      return;
    }

    const showsQuery = query(
      collection(db, 'shows'),
      where('userId', '==', user.uid)
    );

    const showsUnsubscribe = onSnapshot(showsQuery, (snapshot) => {
      const showsData: Show[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure acts array is properly initialized with scenes
        const acts = Array.isArray(data.acts) ? data.acts.map((act: any) => ({
          ...act,
          id: act.id || 1,
          scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
            ...scene,
            id: scene.id || 1
          })) : []
        })) : [{
          id: 1,
          name: 'Act 1',
          scenes: [{ id: 1, name: 'Scene 1' }]
        }];

        showsData.push({
          id: doc.id,
          ...data,
          acts,
          collaborators: Array.isArray(data.collaborators) ? data.collaborators : []
        } as Show);
      });
      setShows(showsData);
      
      // Automatically select the first show if no show is currently selected
      if (showsData.length > 0 && !selectedShow) {
        console.log('Auto-selecting first show:', showsData[0].id);
        setSelectedShow(showsData[0]);
      }
    });

    return () => {
      showsUnsubscribe();
    };
  }, [user, selectedShow, firebaseInitialized]); // Depend on initialization state

  useEffect(() => {
    if (!user || !selectedShow || !db || !firebaseInitialized) { // Wait for user, show, db, and initialization
      setProps([]);
      setLoading(false);
      return;
    }

    console.log('Loading props for show:', selectedShow.id);
    console.log('Current user ID:', user.uid);

    const propsQuery = query(
      collection(db, 'props'),
      where('showId', '==', selectedShow.id)
    );

    console.log('Creating listener for props with query:', { showId: selectedShow.id });

    const unsubscribe = onSnapshot(propsQuery, (snapshot) => {
      try {
        console.log('Props snapshot received, document count:', snapshot.docs.length);
        const propsData: Prop[] = [];
        snapshot.forEach((doc) => {
          console.log('Processing prop document:', doc.id);
          propsData.push({ id: doc.id, ...doc.data() } as Prop);
        });
        console.log('Loaded props:', propsData.length);
        setProps(propsData);
        setLoading(false);
      } catch (error) {
        console.error('Error processing props data:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error in props snapshot listener:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedShow, firebaseInitialized]); // Depend on initialization state

  // Handle redirect result from Google Sign-in
  useEffect(() => {
    if (!firebaseInitialized || !auth || !db) { // Wait for initialization, auth, and db
       return;
    }
    const handleRedirectResult = async () => {
      try {
        // Check if there's a redirect result
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log('Redirect authentication result:', result);

          // Check if we were trying to link accounts
          const shouldLink = localStorage.getItem('linkGoogleAccount') === 'true';
          const linkEmail = localStorage.getItem('linkEmail');
          
          if (shouldLink && linkEmail && user) {
            console.log(`Attempting to link Google account to ${linkEmail}`);

            try {
              // Check if the Google account email matches the user's email
              const googleEmail = result.user.email;
              
              if (googleEmail !== linkEmail) {
                console.error('Email mismatch:', { googleEmail, linkEmail });
                window.alert('Please use the same Google account as your current email.');
                return;
              }
              
              // Get the credential from the redirect result
              const credential = GoogleAuthProvider.credentialFromResult(result);
              
              if (credential) {
                // Link the credential to the current user
                await linkWithCredential(user, credential);
                
                // Update the user profile in Firestore
                await setDoc(doc(db, 'userProfiles', user.uid), {
                  googleLinked: true,
                  photoURL: result.user.photoURL || user.photoURL,
                  displayName: result.user.displayName || user.displayName,
                  lastUpdated: new Date().toISOString()
                }, { merge: true });
                
                console.log('Successfully linked Google account');
                window.alert('Successfully linked your Google account!');
              } else {
                window.alert('Failed to link Google account. No valid credentials received.');
              }
            } catch (error: any) {
              console.error('Error linking account:', error);
              window.alert(error?.message || 'Failed to link Google account. The account may already be in use.');
            }
          }
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
        window.alert(error?.message || 'An error occurred while handling Google sign-in.');
      } finally {
        // Always clear the localStorage flags
        localStorage.removeItem('linkGoogleAccount');
        localStorage.removeItem('linkEmail');
      }
    };
    
    handleRedirectResult();
  }, [user, firebaseInitialized]); // Depend on initialization state

  // Add effect to sync activeTab with current route
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/shows')) {
      setActiveTab('shows');
    } else if (path.startsWith('/props')) {
      setActiveTab('props');
    } else if (path.startsWith('/packing')) {
      setActiveTab('packing');
    }
  }, []);

  // Check if onboarding is needed
  useEffect(() => {
    if (!user || !db || !firebaseInitialized) { // Wait for user, db, and initialization
      return;
    }
    const checkOnboarding = async () => {
      if (!user) { // This condition seems wrong, should likely be if(user)
        const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
        if (!profileDoc.exists() || !profileDoc.data().onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
    };

    checkOnboarding();
  }, [user, firebaseInitialized]); // Depend on initialization state

  // Add effect to log computed styles after mount & init
  useEffect(() => {
    if (firebaseInitialized) {
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        const styles = window.getComputedStyle(appContainer);
        console.log('--- Computed Styles for #app-container ---');
        console.log('Display:', styles.display); 
        console.log('Flex Direction:', styles.flexDirection); 
        console.log('Min Height:', styles.minHeight);
        console.log('Background Color:', styles.backgroundColor);
        console.log('Color:', styles.color);
        console.log('-----------------------------------------');
      } else {
        console.error('#app-container element not found');
      }
    }
  }, [firebaseInitialized]); // Rerun if firebase init state changes (primarily for first true)

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters(initialFilters);
  };

  const handlePropSubmit = async (data: PropFormData) => {
    if (!user || !selectedShow || !db || !firebaseInitialized) { // Check db and initialization
      console.error('User, selected show, or DB not available');
      return;
    }

    try {
      console.log('Creating prop for show:', selectedShow.id);
      const propData = {
        ...data,
        userId: user.uid,
        showId: selectedShow.id,
        createdAt: new Date().toISOString()
      };

      console.log('Prop data to be created:', propData);
      const docRef = await addDoc(collection(db, 'props'), propData);
      console.log('Created prop with ID:', docRef.id);
    } catch (error) {
      console.error('Error adding prop:', error);
      alert('Failed to add prop. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !firebaseInitialized) return; // Check db and initialization
    try {
      await deleteDoc(doc(db, 'props', id));
      console.log('Prop deleted successfully');
    } catch (error) {
      console.error('Error deleting prop:', error);
      alert('Failed to delete prop. Please try again.');
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (!db || !firebaseInitialized) return; // Check db and initialization
    const propRef = doc(db, 'props', id); // Use db instance
    try {
      await updateDoc(propRef, { price: newPrice });
      console.log('Prop price updated successfully');
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Failed to update price. Please try again.');
    }
  };

  const handleEdit = async (id: string, data: PropFormData) => {
    if (!db || !firebaseInitialized) return; // Check db and initialization
    const propRef = doc(db, 'props', id); // Use db instance
    try {
      await updateDoc(propRef, {
        ...data,
        lastModifiedAt: new Date().toISOString()
      });
      console.log('Prop updated successfully');
    } catch (error) {
      console.error('Error updating prop:', error);
      alert('Failed to update prop. Please try again.');
    }
  };

  const handleShowShare = (show: Show) => {
    setSelectedShow(show);
    setShowShareModal(true);
  };

  const handleAddCollaborator = async (email: string, role: 'editor' | 'viewer') => {
    if (!selectedShow || !user || !db || !firebaseInitialized) return;

    try {
      const collaborator = {
        email,
        role,
        addedAt: new Date().toISOString(),
        addedBy: user.email || ''
      };

      await updateDoc(doc(db, 'shows', selectedShow.id), {
        collaborators: arrayUnion(collaborator)
      });
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  };

  const handleRemoveCollaborator = async (email: string) => {
    if (!selectedShow || !db || !firebaseInitialized) return;
    const showRef = doc(db, 'shows', selectedShow.id);
    try {
      await updateDoc(showRef, {
        collaborators: arrayRemove(email)
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  };

  const handleShowSelect = (show: Show) => {
    setSelectedShow(show);
  };

  const handleCreateShow = async () => {
    if (!user || !db || !firebaseInitialized) return; // Check db and initialization

    const newShowData = {
      name: 'New Show',
      description: '',
      acts: [{ id: 1, name: 'Act 1', scenes: [{ id: 1, name: 'Scene 1' }] }],
      userId: user.uid,
      createdAt: new Date().toISOString(),
      collaborators: [],
      stageManager: '',
      stageManagerEmail: '',
      propsSupervisor: '',
      propsSupervisorEmail: '',
      productionCompany: '',
      productionContactName: '',
      productionContactEmail: '',
      venues: [],
      isTouringShow: false,
      contacts: [],
      lastUpdated: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'shows'), newShowData);
      console.log('New show created with ID:', docRef.id);
      // Optionally select the new show immediately
      // const newShow = { id: docRef.id, ...newShowData } as Show;
      // setSelectedShow(newShow);
    } catch (error) {
      console.error('Error creating new show:', error);
      alert('Failed to create new show. Please try again.');
    }
  };

  const handleShowSubmit = async (data: Show) => {
    if (!user || !db || !firebaseInitialized) return; // Check db and initialization

    console.log('Submitting show form data:', data);

    // Prepare the data for Firestore, ensuring acts/scenes have IDs if missing
    const showDataToSave = {
      ...data,
      userId: user.uid,
      lastUpdated: new Date().toISOString(),
      acts: (data.acts || []).map((act, actIndex) => ({
        id: act.id || actIndex + 1, // Ensure act ID
        name: act.name || `Act ${actIndex + 1}`,
        scenes: (act.scenes || []).map((scene, sceneIndex) => ({
          id: scene.id || sceneIndex + 1, // Ensure scene ID
          name: scene.name || `Scene ${sceneIndex + 1}`
        }))
      }))
    };

    try {
      if (showFormMode === 'edit' && editingShow) {
        console.log('Updating show:', editingShow.id);
        const showRef = doc(db, 'shows', editingShow.id);
        await updateDoc(showRef, showDataToSave);
        console.log('Show updated successfully');
      } else {
        console.log('Adding new show');
        const docRef = await addDoc(collection(db, 'shows'), showDataToSave);
        console.log('Show added successfully with ID:', docRef.id);
        // Optionally, select the newly created show
        // setSelectedShow({ ...showDataToSave, id: docRef.id });
      }
      setEditingShow(null);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving show:', error);
      // Consider adding user feedback here (e.g., toast notification)
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!db || !firebaseInitialized) return; // Check db and initialization
    console.log('Attempting to delete show:', showId);
    if (!window.confirm('Are you sure you want to delete this show and all its props? This cannot be undone.')) {
      return;
    }

    try {
      // Delete props associated with the show
      const propsQuery = query(collection(db, 'props'), where('showId', '==', showId));
      const propsSnapshot = await getDocs(propsQuery);
      const deletePromises: Promise<void>[] = [];
      propsSnapshot.forEach((propDoc) => {
        console.log('Deleting prop:', propDoc.id);
        deletePromises.push(deleteDoc(doc(db, 'props', propDoc.id)));
      });
      await Promise.all(deletePromises);
      console.log('Deleted associated props for show:', showId);

      // Delete the show document
      await deleteDoc(doc(db, 'shows', showId));
      console.log('Show deleted successfully:', showId);

      // Reset selected show if it was the one deleted
      if (selectedShow?.id === showId) {
        setSelectedShow(null);
        setShows(shows.filter(s => s.id !== showId));
        if (shows.length > 1) {
           setSelectedShow(shows.find(s => s.id !== showId) || null);
        }
      }
    } catch (error) {
      console.error('Error deleting show:', error);
    }
  };

  const handleLogout = async () => {
    if (!auth || !firebaseInitialized) return; // Check auth and initialization
    try {
      await signOut(auth);
      setUser(null);
      setProps([]);
      setShows([]);
      setSelectedShow(null);
      setShowAuth(true);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const filteredProps = props.filter(prop => {
    const searchLower = filters.search.toLowerCase();
    const nameMatch = prop.name.toLowerCase().includes(searchLower);
    const descriptionMatch = prop.description?.toLowerCase().includes(searchLower) ?? false;
    const categoryMatch = prop.category?.toLowerCase().includes(searchLower) ?? false;
    const actMatch = filters.act ? prop.act === filters.act : true;
    const sceneMatch = filters.scene ? prop.scene === filters.scene : true;

    return (nameMatch || descriptionMatch || categoryMatch) && actMatch && sceneMatch;
  });

  const handleExport = (format: 'pdf' | 'csv') => {
    console.log(`Exporting props in ${format} format...`);
    // Placeholder for export functionality
  };

  const handleOpenAddPropModal = () => {
    setSelectedProp(null);
    setShowEditModal(true);
  };
  
  const handleOpenEditPropModal = (prop: Prop) => {
    setSelectedProp(prop);
    setShowEditModal(true);
  };
  
  const handleOpenShowForm = (mode: 'create' | 'edit', show: Show | null = null) => {
      setShowFormMode(mode);
      setEditingShow(mode === 'edit' ? show : null);
      setShowEditModal(true);
  };

  if (loading || !firebaseInitialized) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (showAuth || !user) {
    return <AuthForm onClose={() => setShowAuth(false)} />;
  }

  return (
    <div id="app-container" className="flex h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-100 dark:bg-dark-card-bg border-b dark:border-dark-border text-gray-900 dark:text-dark-text-primary p-4 flex justify-between items-center shadow-md flex-shrink-0">
          <h1 className="text-2xl font-bold">Props Bible</h1>
          <div className="flex items-center space-x-4">
            {shows.length > 0 ? (
              <select
                value={selectedShow?.id || ''}
                onChange={(e) => {
                  const show = shows.find(s => s.id === e.target.value);
                  if (show) {
                    setSelectedShow(show);
                  } else {
                    setSelectedShow(null);
                  }
                }}
                className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-dark-border rounded px-3 py-1 text-gray-900 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
              >
                <option value="" disabled>Select a Show</option>
                {shows.map(show => (
                  <option key={show.id} value={show.id}>{show.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-gray-500 dark:text-dark-text-secondary">No shows available</span>
            )}
             <button 
                onClick={() => handleOpenShowForm('create')} 
                className="p-2 rounded-full text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-150"
                title="Add New Show"
              >
                  <PlusCircle size={20} />
              </button>
              {selectedShow && (
                 <button 
                    onClick={() => handleOpenShowForm('edit', selectedShow)} 
                    className="p-2 rounded-full hover:bg-gray-700 transition duration-150"
                    title="Edit Selected Show"
                  >
                      <Pencil size={20} />
                  </button>
              )}
             {selectedShow && (
                <button
                  onClick={() => handleDeleteShow(selectedShow.id)}
                  className="p-2 rounded-full hover:bg-red-700 text-red-500 hover:text-white transition duration-150"
                  title="Delete Selected Show"
                >
                  <Trash2 size={20} />
                </button>
              )}

            <button onClick={() => setShowProfile(true)} className="p-2 rounded-full hover:bg-gray-700">
              <img src={user.photoURL || '/default-avatar.png'} alt="User Profile" className="w-8 h-8 rounded-full" />
            </button>
            <button onClick={handleLogout} title="Logout" className="p-2 rounded-full hover:bg-gray-700">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-grow p-6">
          {!selectedShow ? (
            <div className="text-center text-gray-500">
              Please select a show or create a new one to view props.
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-white rounded shadow flex flex-wrap items-center justify-between gap-4">
                <SearchBar value={filters.search} onChange={(value) => handleFilterChange({ ...filters, search: value })} />
                <PropFilters filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
                <ExportToolbar props={filteredProps} show={selectedShow!} />
                 <button
                    onClick={handleOpenAddPropModal}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                    title="Add New Prop"
                  >
                    <Plus size={20} className="mr-2"/> Add Prop
                </button>
              </div>

              {loading ? (
                <div>Loading props...</div>
              ) : (
                <PropList
                  props={filteredProps}
                  onEdit={handleOpenEditPropModal}
                  onDelete={handleDelete}
                />
              )}
            </>
          )}
        </main>
      </div>

      {showEditModal && (
          <PropForm
            initialData={selectedProp ? {
                ...selectedProp,
                status: selectedProp.status || 'confirmed',
                // Convert Timestamp to string if it exists and is a Timestamp instance
                lastModifiedAt: selectedProp.lastModifiedAt && typeof selectedProp.lastModifiedAt === 'object' && 'toDate' in selectedProp.lastModifiedAt
                    ? (selectedProp.lastModifiedAt as any).toDate().toISOString() // Assuming it's a Firestore Timestamp-like object
                    : undefined,
             } : undefined}
            onSubmit={async (formData) => {
              if (selectedProp) {
                await handleEdit(selectedProp.id, formData);
              } else {
                await handlePropSubmit(formData);
              }
              setShowEditModal(false);
              setSelectedProp(null);
            }}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedProp(null);
            }}
            mode={selectedProp ? 'edit' : 'create'}
            show={selectedShow || undefined}
          />
        )}
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
      {showShareModal && selectedShow && user && (
        <ShareModal
          show={selectedShow}
          onClose={() => setShowShareModal(false)}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
          currentUserEmail={user.email || ''}
        />
      )}
      {showOnboarding && 
        <OnboardingGuide 
          show={showOnboarding} 
          onComplete={() => {
            console.log('Onboarding Complete callback fired in App.tsx');
            setShowOnboarding(false);
          }}
        />
      }
      {editingShow !== null && showEditModal && (
        <ShowForm
          initialData={editingShow}
          onSubmit={handleShowSubmit}
          onCancel={() => {
              setEditingShow(null);
              setShowEditModal(false);
          }}
          mode="edit"
        />
      )}
      {showFormMode === 'create' && !editingShow && showEditModal && (
          <ShowForm
            mode="create"
            onSubmit={handleShowSubmit}
            onCancel={() => {
                setShowEditModal(false);
            }}
           />
      )}
    </div>
  );
}

export default App;