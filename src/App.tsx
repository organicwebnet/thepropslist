import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, getRedirectResult, GoogleAuthProvider, linkWithCredential } from 'firebase/auth';
import { AuthForm } from './components/AuthForm';
import { PropForm } from './components/PropForm';
import { PropList } from './components/PropList';
import { ShowList } from './components/ShowList';
import { Footer } from './components/Footer';

import { UserProfileModal } from './components/UserProfile';
import { ShareModal } from './components/ShareModal';
import { db, auth } from './lib/firebase';
import type { Prop, PropFormData } from './shared/types/props';
import type { Filters, Show, ShowFormData } from './types';
import { LogOut, PlusCircle, Pencil, Trash2, Plus } from 'lucide-react';
import ShowForm from './components/ShowForm';
import { SearchBar } from './components/SearchBar';
import { PropFilters } from './components/PropFilters';
import { ExportToolbar } from './components/ExportToolbar';
import { OnboardingGuide } from './components/OnboardingGuide';

const initialFilters: Filters = {
  search: '',
  act: undefined,
  scene: undefined,
  category: undefined
};

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [activeTab, setActiveTab] = useState<'props' | 'shows' | 'packing'>('props');
  const [selectedProp, setSelectedProp] = useState<Prop | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [showFormMode, setShowFormMode] = useState<'create' | 'edit'>('create');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!user) {
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
  }, [user, selectedShow]);

  useEffect(() => {
    if (!user || !selectedShow) {
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
  }, [user, selectedShow]);

  // Handle redirect result from Google Sign-in
  useEffect(() => {
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
  }, [user]);

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

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
        if (!profileDoc.exists() || !profileDoc.data().onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
    };

    checkOnboarding();
  }, [user]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters(initialFilters);
  };

  const handlePropSubmit = async (data: PropFormData) => {
    if (!user || !selectedShow) {
      setShowAuth(true);
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
    try {
      await deleteDoc(doc(db, 'props', id));
    } catch (error) {
      console.error('Error deleting prop:', error);
      alert('Failed to delete prop. Please try again.');
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    try {
      await updateDoc(doc(db, 'props', id), { price: newPrice });
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Failed to update price. Please try again.');
    }
  };

  const handleEdit = async (id: string, data: PropFormData) => {
    try {
      await updateDoc(doc(db, 'props', id), {
        ...data,
        lastModifiedAt: new Date().toISOString()
      });
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
    if (!selectedShow || !user) return;

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
    if (!selectedShow) return;

    try {
      const collaboratorToRemove = selectedShow.collaborators.find(c => c.email === email);
      if (!collaboratorToRemove) return;

      await updateDoc(doc(db, 'shows', selectedShow.id), {
        collaborators: arrayRemove(collaboratorToRemove)
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
    if (!user) {
      setShowAuth(true);
      return;
    }
    setShowFormMode('create');
    setEditingShow(null);
    setShowEditModal(true);
  };

  const handleShowSubmit = async (data: Show) => {
    console.log('=== HANDLESHOWSUBMIT ===');
    console.log('1. Received data:', data);
    
    if (!user) return;
    try {
      console.log('2. Mode:', showFormMode, 'editingShow:', editingShow?.id);
      
      if (showFormMode === 'edit' && editingShow) {
        console.log('3. Updating existing show:', editingShow.id);
        
        // Remove the id from the data object since Firestore doesn't allow it
        // Extract only the fields we want to update
        const updateData = {
          name: data.name,
          description: data.description,
          acts: data.acts,
          stageManager: data.stageManager,
          stageManagerEmail: data.stageManagerEmail,
          stageManagerPhone: data.stageManagerPhone,
          propsSupervisor: data.propsSupervisor,
          propsSupervisorEmail: data.propsSupervisorEmail, 
          propsSupervisorPhone: data.propsSupervisorPhone,
          productionCompany: data.productionCompany,
          productionContactName: data.productionContactName,
          productionContactEmail: data.productionContactEmail,
          productionContactPhone: data.productionContactPhone,
          venues: data.venues,
          isTouringShow: data.isTouringShow,
          contacts: data.contacts,
          imageUrl: data.imageUrl,
          userId: editingShow.userId,
          lastModifiedAt: new Date().toISOString()
        };
        
        console.log('4. Update data:', updateData);
        
        await updateDoc(doc(db, 'shows', editingShow.id), updateData);
        console.log('5. Show updated successfully');
        
        setEditingShow(null);
        setShowFormMode('create');
      } else {
        console.log('3. Creating new show');
        
        await addDoc(collection(db, 'shows'), {
          ...data,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          collaborators: []
        });
        console.log('4. Show created successfully');
      }
    } catch (error) {
      console.error('Error with show:', error);
      alert(`Failed to ${showFormMode} show. Please try again.`);
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this show? This will also delete all props associated with it.')) return;
    
    console.log('=== DELETE SHOW FUNCTION ===');
    console.log('1. Starting delete for show:', showId);
    console.log('2. Current user:', user.uid);
    
    try {
      // Delete all props associated with this show
      console.log('3. Querying props for deletion...');
      const propsQuery = query(collection(db, 'props'), where('showId', '==', showId));
      const propsSnapshot = await getDocs(propsQuery);
      console.log('4. Found', propsSnapshot.size, 'props to delete');
      
      const deletePromises = propsSnapshot.docs.map(doc => {
        console.log('- Deleting prop:', doc.id);
        return deleteDoc(doc.ref);
      });
      await Promise.all(deletePromises);
      console.log('5. Successfully deleted all props');
      
      // Finally delete the show itself
      console.log('6. Attempting to delete show document...');
      await deleteDoc(doc(db, 'shows', showId));
      console.log('7. Successfully deleted show');
      
    } catch (error) {
      console.error('Error deleting show:', error);
      if (error instanceof Error) {
        alert(`Failed to delete show: ${error.message}`);
      } else {
        alert('Failed to delete show. Please try again.');
      }
    }
  };

  const filteredProps = props.filter(prop => {
    const matchesSearch = prop.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (prop.description || '').toLowerCase().includes(filters.search.toLowerCase());
    const matchesAct = !filters.act || prop.act === filters.act;
    const matchesScene = !filters.scene || prop.scene === filters.scene;
    const matchesCategory = !filters.category || prop.category.toLowerCase() === filters.category.toLowerCase();
    const matchesStatus = !filters.status || prop.status === filters.status;
    return matchesSearch && matchesAct && matchesScene && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading props...</p>
        </div>
      </div>
    );
  }

  if (showAuth || !user) {
    // Commenting out - Auth handling should likely be in root layout or navigation logic
    // return <AuthForm onAuthSuccess={() => setShowAuth(false)} />;
    // Placeholder while refactoring:
    return <div className="flex justify-center items-center h-screen">Please Sign In</div>; 
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Props Bible</h1>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <button onClick={() => setShowProfile(true)} className="text-sm hover:text-[var(--highlight-color)] transition-colors">Profile</button>
                <button onClick={() => signOut(auth)} className="text-sm hover:text-red-400 transition-colors flex items-center gap-1">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
        {/* Removed TabNavigation component - integrate into layout if needed */}
        {/* Removed <Routes> and <Route> components */}
        {/* Content is now determined by Expo Router file structure */}
        
        {/* 
          Conditional Modals/Forms - these need to be moved to appropriate layouts/screens. 
          Commenting them out here temporarily to resolve prop errors.
        */}
        {/* {showEditModal && selectedProp && (
          <PropForm 
            prop={selectedProp} 
            onSubmit={handleEdit} 
            onCancel={() => setShowEditModal(false)} 
            showId={selectedShow?.id || ''} 
          />
        )} */}
        {/* {editingShow && (
          <ShowForm
            initialData={editingShow}
            onSubmit={handleShowSubmit}
            onCancel={() => setEditingShow(null)}
            mode={showFormMode}
          />
        )} */}
        {/* {showProfile && user && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />} */}
        {/* {showShareModal && selectedShow && (
          <ShareModal 
            show={selectedShow} 
            onClose={() => setShowShareModal(false)} 
            onAddCollaborator={handleAddCollaborator}
            onRemoveCollaborator={handleRemoveCollaborator}
            // currentUserEmail={user?.email || ''} // Prop required
          />
        )} */}
        {/* {showOnboarding && <OnboardingGuide onClose={() => setShowOnboarding(false)} /> /* onComplete prop required */}
        
        {/* Placeholder for where Expo Router will render the current screen */} 
        <p>Main content area - driven by Expo Router (app directory files)</p>
      </main>

      <Footer />
    </div>
  );
}

export default App;