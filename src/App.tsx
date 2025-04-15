import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthForm } from './components/AuthForm';
import { PropForm } from './components/PropForm';
import { PropList } from './components/PropList';

import { UserProfileModal } from './components/UserProfile';
import { ShareModal } from './components/ShareModal';
import { PropDetailPage } from './pages/PropDetailPage';
import { db, auth } from './lib/firebase';
import type { Prop, PropFormData, Filters, Show } from './types';
import { LogOut } from 'lucide-react';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    ...initialFilters,
    category: searchParams.get('category') || undefined
  });
  const navigate = useNavigate();

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

    const propsQuery = query(
      collection(db, 'props'),
      where('userId', '==', user.uid)
    );

    const showsUnsubscribe = onSnapshot(showsQuery, (snapshot) => {
      const showsData: Show[] = [];
      snapshot.forEach((doc) => {
        showsData.push({ id: doc.id, ...doc.data() } as Show);
      });
      setShows(showsData);
    });

    const propsUnsubscribe = onSnapshot(propsQuery, (snapshot) => {
      const propsData: Prop[] = [];
      snapshot.forEach((doc) => {
        propsData.push({ id: doc.id, ...doc.data() } as Prop);
      });
      setProps(propsData);
    });

    return () => {
      showsUnsubscribe();
      propsUnsubscribe();
    };
  }, [user]);

  // Load props for the selected show
  useEffect(() => {
    if (!user || !selectedShow) {
      setProps([]);
      setLoading(false);
      return;
    }

    const propsQuery = query(
      collection(db, 'props'),
      where('showId', '==', selectedShow.id)
    );

    const unsubscribe = onSnapshot(propsQuery, (snapshot) => {
      const propsData: Prop[] = [];
      snapshot.forEach((doc) => {
        propsData.push({ id: doc.id, ...doc.data() } as Prop);
      });
      setProps(propsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedShow]);

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
      const propData = {
        ...data,
        userId: user.uid,
        showId: selectedShow.id,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'props'), propData);
      navigate(`/props/${docRef.id}`);
    } catch (error) {
      console.error('Error adding prop:', error);
      alert('Failed to add prop. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'props', id));
      navigate('/');
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

  const filteredProps = props.filter(prop => {
    const matchesSearch = prop.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      prop.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesAct = !filters.act || prop.act === filters.act;
    const matchesScene = !filters.scene || prop.scene === filters.scene;
    const matchesCategory = !filters.category || prop.category.toLowerCase() === filters.category.toLowerCase();
    return matchesSearch && matchesAct && matchesScene && matchesCategory;
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <h1 className="text-4xl font-bold gradient-text tracking-tight"> The Props Bible</h1>
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
          <Route path="/" element={
            <>
              {user && (
                <>
                  {shows.length > 0 ? (
                    <div className="lg:grid lg:grid-cols-2 lg:gap-12">
                      <div className="lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
                        <div className="lg:h-full lg:overflow-y-auto lg:pr-6 scrollbar-hide">
                          <PropForm onSubmit={handlePropSubmit} />
                        </div>
                      </div>
                      <div className="mt-8 lg:mt-0 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-hide">
                        <PropList
                          props={filteredProps}
                          onDelete={handleDelete}
                          onUpdatePrice={handleUpdatePrice}
                          onEdit={handleEdit}
                          onCategoryClick={(category) => handleFilterChange({ ...filters, category })}
                          onShare={handleShowShare}
                          onSelect={handleShowSelect}
                          show={selectedShow || shows[0]}
                          filters={filters}
                          onFilterChange={handleFilterChange}
                          onFilterReset={handleFilterReset}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 gradient-border">
                      <p className="text-gray-400">No shows yet. Create your first show to get started!</p>
                      {/* TODO: Add show creation form */}
                    </div>
                  )}
                </>
              )}
            </>
          } />
        </Routes>
      </div>

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
    </div>
  );
}

export default App;