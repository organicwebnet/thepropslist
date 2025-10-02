import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, getRedirectResult, GoogleAuthProvider, linkWithCredential, User as FirebaseUserJs } from 'firebase/auth';
import { arrayUnion, arrayRemove } from 'firebase/firestore';
import { AuthForm } from './components/AuthForm.tsx';
import { PropForm } from './components/PropForm.tsx';
import { PropList } from './components/PropList.tsx';
import { ShowList } from './components/ShowList.tsx';
import { UserProfileModal } from './components/UserProfile.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { WebFirebaseService } from './platforms/web/services/firebase.ts';
import type { Prop, PropFormData } from './shared/types/props.ts';
import type { Filters } from './types.ts';
import type { Show, ShowCollaborator, FirebaseDocument } from './shared/services/firebase/types.ts';
import type { ShowFormData } from './types/index.ts';
import { LogOut, PlusCircle, Pencil, Trash2, Plus } from 'lucide-react';
import ShowForm from './components/ShowForm.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { PropFilters } from './components/PropFilters.tsx';
import { ExportToolbar } from './components/ExportToolbar.tsx';
import { OnboardingGuide } from './components/OnboardingGuide.tsx';
import Sidebar from './components/Sidebar.tsx';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { ShowsProvider } from './contexts/ShowsContext.tsx';
import { PropsProvider } from './contexts/PropsContext.tsx';
import { FirebaseProvider, useFirebase } from './platforms/mobile/contexts/FirebaseContext';
// import { OfflineSyncProvider } from './contexts/OfflineSyncContext.tsx'; // Commented out as file not found
import { RootNavigator } from './navigation/RootNavigator.tsx';
import { useFonts } from './hooks/useFonts.ts';
// import SplashScreen from './screens/SplashScreen'; // Commented out as file not found
import React from "react";

const initialFilters: Filters = {
  search: '',
  act: undefined,
  scene: undefined,
  category: undefined
};

// Instantiate the service
const firebaseService = new WebFirebaseService();
// Get auth and db instances (assuming firestore() returns the db instance)
// let auth: ReturnType<typeof firebaseService.auth> | null = null; // Old: CustomAuth | null
const webAuthInstance: import('firebase/auth').Auth | null = null; // New: Firebase JS Auth | null
// let db: ReturnType<typeof firebaseService.firestore> | null = null;

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  // User state will be FirebaseUserJs | null due to webAuthInstance.currentUser and onAuthStateChanged
  const [user, setUser] = useState(webAuthInstance?.currentUser); 
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
        // auth = firebaseService.auth(); // Old
        // webAuthInstance = firebaseService.getFirebaseAuthJsInstance(); // New
        // webAuthInstance = firebaseService.getFirestoreJsInstance(); // Removed invalid assignment
        // db = firebaseService.firestore(); 
        setFirebaseInitialized(true);
    
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        // Handle initialization error (e.g., show error message)
      }
    };
    initFirebase();
  }, []);

  useEffect(() => {
    if (!firebaseInitialized || !webAuthInstance) { // New guard
      return;
    }
    const unsubscribeAuth = onAuthStateChanged(webAuthInstance, (user) => {
      setUser(user as FirebaseUserJs | null);
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
    if (!user || !firebaseInitialized || !firebaseService) { 
      return;
    }
    const showsUnsubscribe = firebaseService.listenToCollection<Show>(
      'shows',
      (docs: FirebaseDocument<Show>[]) => {
        const showsData = docs.map((doc: FirebaseDocument<Show>) => {
          const data = { ...doc.data }; // Clone data to safely delete id if it exists
          if ('id' in data && typeof data.id !== 'undefined') {
            delete (data as any).id;
          }
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
          return { ...data, id: doc.id, acts, collaborators: Array.isArray(data.collaborators) ? data.collaborators : [] } as Show;
        }).filter(Boolean) as Show[];
        
        setShows(showsData);
        if (showsData.length > 0 && !selectedShow) {
          setSelectedShow(showsData[0]);
        }
      },
      (error: Error) => console.error('Error listening to shows:', error),
      { where: [['userId', '==', user.uid]] }
    );
    return () => {
      if (showsUnsubscribe) showsUnsubscribe();
    };
  }, [user, selectedShow, firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (!user || !selectedShow || !firebaseInitialized || !firebaseService) { // Wait for user, show, firebaseService, and initialization
      setProps([]);
      setLoading(false);
      return;
    }

    // Use firebaseService.listenToCollection for props
    const propsUnsubscribe = firebaseService.listenToCollection<Prop>(
      'props',
      (docs: FirebaseDocument<Prop>[]) => {
        const propsData = docs.map((doc: FirebaseDocument<Prop>) => ({ ...doc.data, id: doc.id } as Prop));
        setProps(propsData);
        setLoading(false);
      },
      (error: Error) => {
        console.error('Error in props snapshot listener:', error);
        setLoading(false);
      },
      { where: [['showId', '==', selectedShow.id]] } // QueryOptions
    );

    return () => {
      if (propsUnsubscribe) propsUnsubscribe();
    };
  }, [user, selectedShow, firebaseInitialized, firebaseService]); // Add firebaseService

  // Handle redirect result from Google Sign-in
  useEffect(() => {
    if (!firebaseInitialized || !webAuthInstance || !firebaseService) { // Use firebaseService instead of db
       return;
    }
    const currentAuth = webAuthInstance;

    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(currentAuth);
        if (result && user) { // ensure user is not null
          const shouldLink = localStorage.getItem('linkGoogleAccount') === 'true';
          const linkEmail = localStorage.getItem('linkEmail');
          
          if (shouldLink && linkEmail) {
            const googleEmail = result.user.email;
            if (googleEmail !== linkEmail) {
              console.error('Email mismatch:', { googleEmail, linkEmail });
              window.alert('Please use the same Google account as your current email.');
              return;
            }
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential) {
              await linkWithCredential(user as FirebaseUserJs, credential); // Cast user
              
              // Use firebaseService.setDocument
              const firebaseUserForSet = user as FirebaseUserJs;
              try {
                await firebaseService.setDocument('userProfiles', firebaseUserForSet.uid, { 
                  googleLinked: true,
                  photoURL: result.user.photoURL || firebaseUserForSet.photoURL,
                  displayName: result.user.displayName || firebaseUserForSet.displayName,
                  lastUpdated: new Date().toISOString()
                }, { merge: true });
                window.alert('Successfully linked your Google account!');
              } catch (e) {
                console.error("Error updating user profile after link:", e);
                window.alert('Failed to update profile after linking. Please try again.');
              }
            } else {
              window.alert('Failed to link Google account. No valid credentials received.');
            }
            localStorage.removeItem('linkGoogleAccount');
            localStorage.removeItem('linkEmail');
          } else if (!shouldLink) {
            // This is a fresh sign-in, not an account link
            const firebaseUserForGet = result.user as FirebaseUserJs;
            const profileDocSnap = await firebaseService.getDocument('userProfiles', firebaseUserForGet.uid);
            
            if (!profileDocSnap || !profileDocSnap.data?.onboardingCompleted) {
              setShowOnboarding(true);
            } 
          }
        }
      } catch (error: any) {
        console.error("Error handling redirect result:", error);
        
        let errorMessage = 'Authentication failed. Please try again.';
        
        switch (error.code) {
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.';
            break;
          case 'auth/unauthorized-domain':
            errorMessage = 'This domain is not authorized for Google Sign-in. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Google Sign-in is not enabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please wait a moment and try again.';
            break;
          default:
            // Check for SSL/certificate related errors
            if (error.message?.includes('NET::ERR_CERT') || error.message?.includes('certificate')) {
              errorMessage = 'SSL certificate error. Please try refreshing the page or contact support if the issue persists.';
            } else if (error.message?.includes('firebaseapp.com')) {
              errorMessage = 'Domain configuration error. Please contact support.';
            }
        }
        
        window.alert(errorMessage);
      }
    };

    if (document.readyState === "complete") { // Ensure DOM is ready for localStorage interaction
        handleRedirectResult();
    } else {
        window.addEventListener('load', handleRedirectResult);
        return () => window.removeEventListener('load', handleRedirectResult);
    }
  }, [firebaseInitialized, webAuthInstance, user, firebaseService]); // Add firebaseService, user

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
    if (!user || !firebaseInitialized || !firebaseService) { // Wait for user, firebaseService, and initialization
      return;
    }
    const checkOnboarding = async () => {
      if (user) {
        const profileDocSnap = await firebaseService.getDocument('userProfiles', user.uid);
        if (!profileDocSnap || !profileDocSnap.data?.onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
    };
    checkOnboarding();
  }, [user, firebaseInitialized, firebaseService]); // Depend on initialization state



  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters(initialFilters);
  };

  const handlePropSubmit = async (data: PropFormData) => {
    if (!user || !selectedShow || !firebaseService) return; // Use firebaseService
    const propData = { ...data, userId: user.uid, showId: selectedShow.id, createdAt: new Date().toISOString() };
    try {
      await firebaseService.addDocument('props', propData); // Use firebaseService.addDocument
      setShowEditModal(false);
    } catch (e) {
      console.error("Error adding prop: ", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firebaseService) return; // Use firebaseService
    try {
      await firebaseService.deleteDocument('props', id); // Use firebaseService.deleteDocument
    } catch (e) {
      console.error("Error deleting prop: ", e);
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (!firebaseService) return; // Use firebaseService
    try {
      await firebaseService.updateDocument('props', id, { price: newPrice }); // Use firebaseService.updateDocument
    } catch (e) {
      console.error("Error updating prop price: ", e);
    }
  };

  const handleEdit = async (id: string, data: PropFormData) => {
    if (!firebaseService) return; // Use firebaseService
    try {
      await firebaseService.updateDocument('props', id, data); // Use firebaseService.updateDocument
      setShowEditModal(false);
    } catch (e) {
      console.error("Error editing prop: ", e);
    }
  };

  const handleShowShare = (show: Show) => {
    setSelectedShow(show);
    setShowShareModal(true);
  };

  const handleAddCollaborator = async (email: string, role: 'editor' | 'viewer') => {
    if (!selectedShow || !user || !firebaseService) return;
    const collaborator = { email, role, addedBy: user.email, addedAt: new Date().toISOString() };
    try {
      await firebaseService.updateDocument('shows', selectedShow.id, { collaborators: arrayUnion(collaborator) });
      const updatedShowDoc = await firebaseService.getDocument<Show>('shows', selectedShow.id);
      if (updatedShowDoc && updatedShowDoc.data) {
        setSelectedShow({ ...updatedShowDoc.data, id: updatedShowDoc.id });
      }
      setShowShareModal(false);
    } catch (e) {
      console.error("Error adding collaborator: ", e);
    }
  };

  const handleRemoveCollaborator = async (email: string) => {
    if (!selectedShow || !user) return;
    try {
      const collaboratorToRemove = selectedShow.collaborators?.find((c: ShowCollaborator) => c.email === email);
      if (collaboratorToRemove) {
        await firebaseService.updateDocument('shows', selectedShow.id, { collaborators: arrayRemove(collaboratorToRemove) });
        const updatedShowDoc = await firebaseService.getDocument<Show>('shows', selectedShow.id);
        if (updatedShowDoc && updatedShowDoc.data) {
          setSelectedShow({ ...updatedShowDoc.data, id: updatedShowDoc.id });
        }
      }
    } catch (e) {
      console.error("Error removing collaborator: ", e);
    }
  };

  const handleShowSelect = (show: Show) => {
    setSelectedShow(show);
  };

  const handleCreateShow = async () => {
    if (!user || !firebaseService) return;
    const newShowData: Omit<Show, 'id'> & { userId: string; createdAt: string } = {
      name: 'New Show',
      userId: user.uid,
      description: '',
      startDate: null,
      endDate: null,
      imageUrl: '',
      stageManager: '',
      stageManagerEmail: '',
      stageManagerPhone: '',
      propsSupervisor: '',
      propsSupervisorEmail: '',
      propsSupervisorPhone: '',
      productionCompany: '',
      productionContactName: '',
      productionContactEmail: '',
      productionContactPhone: '',
      isTouringShow: false,
      venues: [],
      acts: [{ id: 1, name: 'Act 1', scenes: [{ id: 1, name: 'Scene 1', setting: '', description: '' }], description: '' }],
      collaborators: [],
      contacts: [],
      status: 'planning',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      defaultActId: '1',
      defaultSceneId: '1'
    };
    try {
      const docRef = await firebaseService.addDocument('shows', newShowData as any);
      if (docRef) {
        const fullNewShow = { ...newShowData, id: docRef.id } as Show;
        setSelectedShow(fullNewShow);
        handleOpenShowForm('edit', fullNewShow);
      }
    } catch (e) {
      console.error("Error creating show: ", e);
    }
  };

  const handleShowSubmit = async (data: Show) => {
    if (!user || !firebaseService) return; // Use firebaseService
    setLoading(true);
    try {
      if (editingShow && editingShow.id) {
        // Update existing show
        const showDataToSave = { ...data };
        delete (showDataToSave as any).id; // Remove id before saving, Firestore uses document ID
        await firebaseService.setDocument('shows', editingShow.id, showDataToSave); // Use firebaseService.setDocument
        setEditingShow(null);
      } else {
        // Create new show
        const showDataToSave = { ...data, userId: user.uid, createdAt: new Date().toISOString() };
        delete (showDataToSave as any).id;
        const docRef = await firebaseService.addDocument('shows', showDataToSave);
        if (docRef) {
          setSelectedShow({ ...data, id: docRef.id }); 
        }
      }
      setShowFormMode('create');
      // Refresh shows list implicitly by onSnapshot listener
    } catch (e) {
      console.error("Error saving show: ", e);
      // Potentially show an error to the user
    } finally {
      setLoading(false);
      setEditingShow(null); // Close modal/form
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!user || !firebaseService) return; // Added firebaseService check
    setLoading(true);
    try {
      // First, delete all props associated with the show
      const propsSnapshot = await firebaseService.getDocuments<Prop>('props', { where: [['showId', '==', showId]] });
      const deletePromises = propsSnapshot.map((propDoc: FirebaseDocument<Prop>) => firebaseService.deleteDocument('props', propDoc.id));
      await Promise.all(deletePromises);

      // Then, delete the show itself
      await firebaseService.deleteShow(showId);

      setShows(prevShows => prevShows.filter(s => s.id !== showId));
      if (selectedShow?.id === showId) {
        setSelectedShow(shows.length > 0 ? shows[0] : null);
      }
    } catch (e) {
      console.error("Error deleting show and its props: ", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!webAuthInstance || !firebaseService) return; // Use firebaseService for signOut
    try {
      // await signOut(webAuthInstance); // Old direct call
      await firebaseService.signOut(); // Use service method
      setUser(null);
      setProps([]);
      setShows([]);
      setSelectedShow(null);
      setShowAuth(true);
      setShowProfile(false);
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
                      <h1 className="text-2xl font-bold">The Props List</h1>
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
                <SearchBar value={filters.search} onChange={(value: string) => handleFilterChange({ ...filters, search: value })} />
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

      {showAuth && <AuthForm onClose={() => setShowAuth(false)} />}
      {showProfile && (
        <UserProfileModal 
          onClose={() => setShowProfile(false)} 
        />
      )}
      {showShareModal && selectedShow && (
        <ShareModal
          show={selectedShow}
          onClose={() => setShowShareModal(false)}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
          currentUserEmail={user.email || ''}
        />
      )}
      {showEditModal && selectedShow && (
        <PropForm
          initialData={selectedProp ? { ...selectedProp } as PropFormData : undefined}
          mode={selectedProp ? 'edit' : 'create'}
          show={selectedShow}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedProp(null);
          }}
          onSubmit={handlePropSubmit}
        />
      )}
      {editingShow && (
          <ShowForm 
              mode={showFormMode}
              initialData={editingShow} 
              onSubmit={handleShowSubmit}
              onCancel={() => setEditingShow(null)}
          />
      )}
       {showOnboarding && (
        <OnboardingGuide show={showOnboarding} onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default App;
