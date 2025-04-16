import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, getRedirectResult, GoogleAuthProvider, linkWithCredential } from 'firebase/auth';
import { AuthForm } from './components/AuthForm';
import { PropForm } from './components/PropForm';
import { PropList } from './components/PropList';
import { ShowList } from './components/ShowList';
import { Footer } from './components/Footer';

import { UserProfileModal } from './components/UserProfile';
import { ShareModal } from './components/ShareModal';
import { PropDetailPage } from './pages/PropDetailPage';
import { ShowDetailPage } from './pages/ShowDetailPage';
import { db, auth } from './lib/firebase';
import type { Prop, PropFormData, Filters, Show, ShowFormData } from './types';
import { LogOut, PlusCircle, Pencil, Trash2, Plus } from 'lucide-react';
import ShowForm from './components/ShowForm';
import { SearchBar } from './components/SearchBar';
import { PropFilters } from './components/PropFilters';
import { ExportToolbar } from './components/ExportToolbar';
import { PackingPage } from './pages/PackingPage';
import { OnboardingGuide } from './components/OnboardingGuide';

const initialFilters: Filters = {
  search: '',
  act: undefined,
  scene: undefined,
  category: undefined
};

function TabNavigation({ activeTab, setActiveTab, navigate }: { activeTab: string; setActiveTab: (tab: 'props' | 'shows' | 'packing') => void; navigate: (path: string) => void }) {
  return (
    <div className="mb-6">
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('props');
              navigate('/props');
            }}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'props'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Props
          </button>
          <button
            onClick={() => {
              setActiveTab('shows');
              navigate('/shows');
            }}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'shows'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Shows
          </button>
          <button
            onClick={() => {
              setActiveTab('packing');
              navigate('/packing');
            }}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'packing'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Packing
          </button>
        </nav>
      </div>
    </div>
  );
}

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    ...initialFilters,
    category: searchParams.get('category') || undefined
  });
  const navigate = useNavigate();
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
    if (newFilters.category) {
      setSearchParams({ category: newFilters.category });
    } else {
      setSearchParams({});
    }
  };

  const handleFilterReset = () => {
    setFilters(initialFilters);
    setSearchParams({});
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
      navigate(`/props/${docRef.id}`);
    } catch (error) {
      console.error('Error adding prop:', error);
      alert('Failed to add prop. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'props', id));
      navigate('/props');
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
      navigate(`/props/${id}`);
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

  const handleShowClick = (showId: string) => {
    navigate(`/shows/${showId}`);
  };

  const handlePackingClick = (showId: string) => {
    navigate(`/packing/${showId}`);
  };

  const filteredProps = props.filter(prop => {
    const matchesSearch = prop.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      prop.description.toLowerCase().includes(filters.search.toLowerCase());
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <div className="container mx-auto px-6 py-8 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <h1 className="text-4xl font-bold gradient-text tracking-tight">The Props Bible</h1>
          {user && (
            <div className="flex items-center gap-6">
              <button
                onClick={async () => {
                  try {
                    await signOut(auth);
                  } catch (error) {
                    console.error('Error signing out:', error);
                    alert('Failed to sign out. Please try again.');
                  }
                }}
                className="btn-primary flex items-center gap-2 opacity-80 hover:opacity-100"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Sign Out</span>
              </button>
              <button
                onClick={() => setShowProfile(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors flex items-center gap-3"
                title="Profile & Settings"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm">Profile & Settings</span>
              </button>
            </div>
          )}
        </div>

        <Routes>
          <Route path="/props/:id" element={
            user ? (
              <PropDetailPage
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to view prop details</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
          <Route path="/shows/:id" element={
            user ? (
              <ShowDetailPage
                onEdit={(show) => {
                  setEditingShow(show);
                  setShowFormMode('edit');
                  navigate('/shows');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to view show details</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
          <Route path="/" element={
            user ? (
              <Navigate to="/props" replace />
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to view props</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
          <Route path="/props" element={
            user ? (
              <>
                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
                <div className="lg:grid lg:grid-cols-2 lg:gap-12">
                  <div className="lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
                    <div className="lg:h-full lg:overflow-y-auto lg:pr-6 scrollbar-hide">
                      <PropForm 
                        onSubmit={handlePropSubmit} 
                        show={selectedShow || shows[0]}
                      />
                    </div>
                  </div>
                  <div className="mt-8 lg:mt-0 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-hide">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        {(selectedShow || shows[0]) && (
                          <ExportToolbar show={selectedShow || shows[0]} props={filteredProps} />
                        )}
                      </div>
                    </div>
                    {(selectedShow || shows[0]) && (
                      <PropList
                        props={filteredProps}
                        onDelete={handleDelete}
                        onUpdatePrice={handleUpdatePrice}
                        onEdit={handleEdit}
                        show={selectedShow || shows[0]}
                        filters={filters}
                        onFilterChange={setFilters}
                        onFilterReset={() => setFilters(initialFilters)}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to view props</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
          <Route path="/shows" element={
            user ? (
              <>
                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
                <div className="lg:grid lg:grid-cols-2 lg:gap-12">
                  <div className="lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
                    <div className="lg:h-full lg:overflow-y-auto lg:pr-6 scrollbar-hide">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Shows</h2>
                      </div>
                      <ShowForm
                        mode={showFormMode}
                        initialData={showFormMode === 'edit' && editingShow ? {
                          id: editingShow.id,
                          name: editingShow.name,
                          description: editingShow.description,
                          acts: editingShow.acts,
                          userId: editingShow.userId,
                          createdAt: editingShow.createdAt,
                          collaborators: editingShow.collaborators || [],
                          stageManager: editingShow.stageManager,
                          stageManagerEmail: editingShow.stageManagerEmail,
                          stageManagerPhone: editingShow.stageManagerPhone || '',
                          propsSupervisor: editingShow.propsSupervisor,
                          propsSupervisorEmail: editingShow.propsSupervisorEmail,
                          propsSupervisorPhone: editingShow.propsSupervisorPhone || '',
                          productionCompany: editingShow.productionCompany,
                          productionContactName: editingShow.productionContactName,
                          productionContactEmail: editingShow.productionContactEmail,
                          productionContactPhone: editingShow.productionContactPhone || '',
                          venues: editingShow.venues || [],
                          isTouringShow: editingShow.isTouringShow || false,
                          contacts: editingShow.contacts || [],
                          imageUrl: editingShow.imageUrl || '',
                          logoImage: editingShow.logoImage
                        } : undefined}
                        onSubmit={handleShowSubmit}
                      />
                    </div>
                  </div>
                  <div className="mt-8 lg:mt-0 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-hide">
                    <div className="flex justify-between items-center mb-6">
                      <button
                        onClick={() => {
                          setEditingShow(null);
                          setShowFormMode('create');
                        }}
                        className="btn-primary flex items-center gap-2"
                      >
                        <PlusCircle className="h-5 w-5" />
                        <span>New Show</span>
                      </button>
                    </div>
                    <div className="gradient-border p-6">
                      <div className="space-y-4">
                        {shows.length > 0 ? (
                          shows.map((show) => (
                            <div
                              key={show.id}
                              className={`flex items-center justify-between p-4 border rounded-lg transition-colors relative ${
                                selectedShow?.id === show.id 
                                  ? 'bg-primary/5 border-primary border-2 shadow-lg' 
                                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--highlight-color)]'
                              }`}
                            >
                              {selectedShow?.id === show.id && (
                                <div className="absolute top-0 left-0 transform -translate-y-1/3 translate-x-1 z-10">
                                  <div className="bg-primary px-2 py-1 rounded-full text-xs font-medium text-white shadow-md whitespace-nowrap">
                                    Current Show
                                  </div>
                                </div>
                              )}
                              <div 
                                className="flex items-center gap-4 flex-1 cursor-pointer"
                                onClick={() => navigate(`/shows/${show.id}`)}
                              >
                                {show.imageUrl ? (
                                  <img
                                    src={show.imageUrl}
                                    alt={`${show.name} logo`}
                                    className={`w-12 h-12 rounded-lg object-cover border ${
                                      selectedShow?.id === show.id ? 'border-primary' : 'border-[var(--border-color)]'
                                    }`}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center">
                                    <span className="text-2xl font-semibold text-[var(--text-secondary)]">
                                      {show.name[0]}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{show.name}</h3>
                                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                                    {Array.isArray(show.acts) ? (
                                      <>
                                        {show.acts.length} Acts, {show.acts.reduce((total, act) => total + (Array.isArray(act.scenes) ? act.scenes.length : 0), 0)} Scenes
                                      </>
                                    ) : (
                                      'No acts defined'
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedShow(show);
                                    setActiveTab('props');
                                    navigate('/props');
                                  }}
                                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    selectedShow?.id === show.id
                                      ? 'bg-green-600 text-white font-bold' 
                                      : 'bg-primary text-white hover:bg-primary/90'
                                  }`}
                                  title="Select for Props"
                                  disabled={selectedShow?.id === show.id}
                                >
                                  {selectedShow?.id === show.id ? 'Current Show ✓' : 'Select for Props'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    console.log('Edit button clicked for show:', show);
                                    e.stopPropagation();
                                    if (editingShow?.id === show.id) {
                                      setEditingShow(null);
                                      setShowFormMode('create');
                                    } else {
                                      setEditingShow(show);
                                      setShowFormMode('edit');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                  }}
                                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--highlight-color)] transition-colors"
                                  title="Edit show"
                                >
                                  <Pencil className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteShow(show.id);
                                  }}
                                  className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                                  title="Delete show"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-[var(--text-secondary)]">No shows yet. Create your first show using the form.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to view shows</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
          <Route path="/packing/:showId" element={
            user ? (
              <PackingPage />
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to access packing lists</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
          <Route path="/packing" element={
            user ? (
              <>
                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-200">Select a Show to Pack</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shows.map(show => (
                      <div
                        key={show.id}
                        className={`flex items-center p-4 border rounded-lg transition-colors cursor-pointer relative ${
                          selectedShow?.id === show.id 
                            ? 'bg-primary/5 border-primary border-2 shadow-lg' 
                            : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--highlight-color)]'
                        }`}
                        onClick={() => navigate(`/packing/${show.id}`)}
                      >
                        {selectedShow?.id === show.id && (
                          <div className="absolute top-0 left-0 transform -translate-y-1/3 translate-x-1 z-10">
                            <div className="bg-primary px-2 py-1 rounded-full text-xs font-medium text-white shadow-md whitespace-nowrap">
                              Current Show
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          {show.imageUrl ? (
                            <img
                              src={show.imageUrl}
                              alt={`${show.name} logo`}
                              className={`w-12 h-12 rounded-lg object-cover border ${
                                selectedShow?.id === show.id ? 'border-primary ring-2 ring-primary' : 'border-[var(--border-color)]'
                              }`}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center">
                              <span className="text-2xl font-semibold text-[var(--text-secondary)]">
                                {show.name[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{show.name}</h3>
                            <p className="text-[var(--text-secondary)] text-sm mt-1">
                              {show.venues && show.venues.length > 0 ? show.venues[0].name : 'No venue specified'}
                            </p>
                            {selectedShow?.id === show.id && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white shadow-sm shadow-primary/30">
                                  Current Show
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Please sign in to access packing lists</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
                >
                  Sign In
                </button>
              </div>
            )
          } />
        </Routes>
      </div>

      <Footer />

      {showAuth && <AuthForm onClose={() => setShowAuth(false)} />}
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
      {showShareModal && selectedShow && (
        <ShareModal
          show={selectedShow}
          onClose={() => setShowShareModal(false)}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
          currentUserEmail={user?.email || ''}
        />
      )}
      
      {showOnboarding && (
        <OnboardingGuide 
          onClose={() => setShowOnboarding(false)}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

export default App;