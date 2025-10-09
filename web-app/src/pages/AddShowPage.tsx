import React, { useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';
import { cleanFirestoreData } from '../utils/firestore';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, UploadCloud, Users, UserPlus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EntitySelectRefactored from '../components/EntitySelectRefactored';

// Add types for show state
interface Act {
  name: string;
  scenes: string[];
}
interface TeamMember {
  email: string;
  role: string;
  userId?: string;
  name?: string;
  avatarUrl?: string;
  status?: 'registered' | 'invited' | 'pending';
}
interface ShowFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  logoImage: File | null;
  acts: Act[];
  team: TeamMember[];
  stageManager: string;
  stageManagerEmail: string;
  propsSupervisor: string;
  propsSupervisorEmail: string;
  productionCompany: string;
  venues: string[];
  isTouringShow: boolean;
  status: string;
  rehearsalAddresses: string[];
  storageAddresses: string[];
  rehearsalStartDate: string;
  techWeekStartDate: string;
  firstPerformanceDate: string;
  pressNightDate: string;
  venueIds?: string[];
  rehearsalAddressIds?: string[];
  storageAddressIds?: string[];
}

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_production', label: 'In Production' },
  { value: 'in_rehearsals', label: 'In Rehearsals' },
  { value: 'in_tech', label: 'In Tech' },
  { value: 'running', label: 'Running' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'in_storage', label: 'In Storage' },
];

const AddShowPage: React.FC = () => {
  const { userProfile, user, loading: authLoading } = useWebAuth();
  const { setCurrentShowId } = useShowSelection();
  const { limits } = useSubscription();
  // Load form state from localStorage on component mount
  const getInitialFormState = (): ShowFormState => {
    try {
      const saved = localStorage.getItem('showFormState');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('AddShowPage: Form state restored from localStorage', {
          hasName: !!parsed.name,
          hasDescription: !!parsed.description,
          venueIds: parsed.venueIds?.length || 0
        });
        // Convert dates back to strings and handle file objects
        return {
          ...parsed,
          logoImage: null, // Don't restore file objects
        };
      }
    } catch (error) {
      console.warn('Failed to load form state from localStorage:', error);
    }
    
    // Default state
    console.log('AddShowPage: Using default form state');
    return {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      logoImage: null,
      acts: [{ name: '', scenes: [''] }],
      team: [{ email: '', role: '', status: 'pending' }],
      stageManager: '',
      stageManagerEmail: '',
      propsSupervisor: '',
      propsSupervisorEmail: '',
      productionCompany: '',
      venues: [''],
      isTouringShow: false,
      status: 'planning',
      rehearsalAddresses: [''],
      storageAddresses: [''],
      rehearsalStartDate: '',
      techWeekStartDate: '',
      firstPerformanceDate: '',
      pressNightDate: '',
      venueIds: [],
      rehearsalAddressIds: [],
      storageAddressIds: [],
    };
  };

  const [show, setShow] = useState<ShowFormState>(getInitialFormState());
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Set form restored state after component mounts
  React.useEffect(() => {
    const saved = localStorage.getItem('showFormState');
    if (saved) {
      setFormRestored(true);
    }
    setFormInitialized(true);
  }, []);

  // Debug: Log form state changes
  React.useEffect(() => {
    console.log('AddShowPage: Form state changed', show);
  }, [show]);

  // Function to manually cache form state (called before opening address modal)
  const cacheFormState = () => {
    try {
      localStorage.setItem('showFormState', JSON.stringify(show));
      console.log('AddShowPage: Form state manually cached before opening modal', {
        showName: show.name,
        venueIds: show.venueIds?.length || 0,
        formInitialized
      });
    } catch (error) {
      console.warn('Failed to manually cache form state:', error);
    }
  };

  // Save form state to localStorage whenever it changes
  React.useEffect(() => {
    // Only save after form is initialized to prevent saving during initial load
    if (!formInitialized) return;
    
    try {
      // Don't save if form is empty (initial state) or if we just restored from localStorage
      const hasContent = show.name || show.description || show.startDate || show.endDate || 
          show.venueIds?.length || show.rehearsalAddressIds?.length || show.storageAddressIds?.length ||
          show.stageManager || show.stageManagerEmail || show.propsSupervisor || show.propsSupervisorEmail ||
          show.productionCompany || show.acts.some(act => act.name) || show.team.some(member => member.email);
      
      if (hasContent) {
        localStorage.setItem('showFormState', JSON.stringify(show));
        console.log('AddShowPage: Form state saved to localStorage', { 
          hasContent, 
          showName: show.name,
          venueIds: show.venueIds?.length || 0,
          formInitialized
        });
      }
    } catch (error) {
      console.warn('Failed to save form state to localStorage:', error);
    }
  }, [show, formInitialized]);

  // Cleanup: Clear form state when component unmounts after successful submission
  React.useEffect(() => {
    return () => {
      if (formSubmitted) {
        localStorage.removeItem('showFormState');
        console.log('AddShowPage: Form state cleared on component unmount');
      }
    };
  }, [formSubmitted]);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentShowCount, setCurrentShowCount] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const navigate = useNavigate();
  const { service: firebaseService } = useFirebase();
  const [activeTab, setActiveTab] = useState<'details' | 'team'>('details');
  const [formRestored, setFormRestored] = useState(false);

  // Load current show count to check limits
  React.useEffect(() => {
    if (!user?.uid) return;
    
    let allShows: any[] = [];
    
    const updateCount = () => {
      // Deduplicate and count
      const uniqueShows = [...allShows];
      const seen = new Set();
      const deduplicated = uniqueShows.filter(show => {
        if (seen.has(show.id)) return false;
        seen.add(show.id);
        return true;
      });
      setCurrentShowCount(deduplicated.length);
    };
    
    // Listen to shows with createdBy field
    const createdByUnsubscribe = firebaseService.listenToCollection(
      'shows',
      (docs) => {
        const createdByShows = docs.filter(doc => doc.data.createdBy === user.uid);
        // Update allShows array
        allShows = allShows.filter(show => !createdByShows.find(s => s.id === show.id));
        allShows.push(...createdByShows);
        updateCount();
      },
      (err: Error) => {
        console.error('Error loading createdBy show count:', err);
      },
      { where: [['createdBy', '==', user.uid]] }
    );
    
    // Listen to shows with userId field
    const userIdUnsubscribe = firebaseService.listenToCollection(
      'shows',
      (docs) => {
        const userIdShows = docs.filter(doc => doc.data.userId === user.uid);
        // Update allShows array
        allShows = allShows.filter(show => !userIdShows.find(s => s.id === show.id));
        allShows.push(...userIdShows);
        updateCount();
      },
      (err: Error) => {
        console.error('Error loading userId show count:', err);
      },
      { where: [['userId', '==', user.uid]] }
    );
    
    return () => {
      createdByUnsubscribe && createdByUnsubscribe();
      userIdUnsubscribe && userIdUnsubscribe();
    };
  }, [user?.uid, firebaseService]);

  // Mock user lookup function
  const mockUserLookup = async (email: string) => {
    // Simulate a lookup: if email contains 'registered', return a mock user
    if (email.includes('registered')) {
      return {
        userId: 'user123',
        name: 'Registered User',
        avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=' + encodeURIComponent(email),
        status: 'registered' as const,
      };
    }
    return null;
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    console.log('AddShowPage: handleChange called', { name, value, type });
    if (type === 'checkbox' && 'checked' in e.target) {
      setShow(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setShow(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle logo upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setShow(prev => ({ ...prev, logoImage: file }));
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  };

  // Handle team array
  const handleTeamChange = async (idx: number, key: string, value: string) => {
    if (key === 'email') {
      // Lookup user on email change
      const user = await mockUserLookup(value);
      setShow(prev => ({
        ...prev,
        team: prev.team.map((member, i) =>
          i === idx
            ? {
                ...member,
                email: value,
                userId: user?.userId,
                name: user?.name,
                avatarUrl: user?.avatarUrl,
                status: user ? 'registered' : 'invited',
              }
            : member
        ),
      }));
    } else {
      setShow(prev => ({
        ...prev,
        team: prev.team.map((member, i) => i === idx ? { ...member, [key]: value } : member),
      }));
    }
  };
  const handleAddTeam = () => {
    setShow(prev => ({ ...prev, team: [...prev.team, { email: '', role: '', status: undefined }] }));
  };
  const handleRemoveTeam = (idx: number) => {
    setShow(prev => ({ ...prev, team: prev.team.filter((_, i) => i !== idx) }));
  };
  const handleInvite = (idx: number) => {
    setShow(prev => ({
      ...prev,
      team: prev.team.map((member, i) =>
        i === idx ? { ...member, status: 'pending' } : member
      ),
    }));
    // Here you would trigger an invite email/send to backend
  };

  // Handle acts (array of objects)
  const handleActNameChange = (idx: number, value: string) => {
    setShow(prev => ({
      ...prev,
      acts: prev.acts.map((act, i) => i === idx ? { ...act, name: value } : act),
    }));
  };
  const handleAddAct = () => {
    setShow(prev => ({ ...prev, acts: [...prev.acts, { name: '', scenes: [''] }] }));
  };
  const handleRemoveAct = (idx: number) => {
    setShow(prev => ({ ...prev, acts: prev.acts.filter((_, i) => i !== idx) }));
  };

  // Handle scenes within an act
  const handleSceneChange = (actIdx: number, sceneIdx: number, value: string) => {
    setShow(prev => ({
      ...prev,
      acts: prev.acts.map((act, i) =>
        i === actIdx
          ? { ...act, scenes: act.scenes.map((scene, j) => j === sceneIdx ? value : scene) }
          : act
      ),
    }));
  };
  const handleAddScene = (actIdx: number) => {
    setShow(prev => ({
      ...prev,
      acts: prev.acts.map((act, i) =>
        i === actIdx ? { ...act, scenes: [...act.scenes, ''] } : act
      ),
    }));
  };
  const handleRemoveScene = (actIdx: number, sceneIdx: number) => {
    setShow(prev => ({
      ...prev,
      acts: prev.acts.map((act, i) =>
        i === actIdx ? { ...act, scenes: act.scenes.filter((_, j) => j !== sceneIdx) } : act
      ),
    }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('AddShowPage: Form submitted');
    console.log('AddShowPage: Show data:', show);
    console.log('AddShowPage: Loading state:', loading);
    console.log('AddShowPage: Form submit event:', e);
    
    // Check required fields
    if (!show.name || !show.description || !show.startDate || !show.endDate) {
      console.error('AddShowPage: Missing required fields:', {
        name: show.name,
        description: show.description,
        startDate: show.startDate,
        endDate: show.endDate
      });
      setError('Please fill in all required fields (Show Name, Description, Start Date, End Date)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Check subscription limits
    if (currentShowCount >= limits.shows) {
      setUpgradeOpen(true);
      setLoading(false);
      return;
    }
    
    try {
      console.log('AddShowPage: Starting show creation process');
      console.log('AddShowPage: User:', user?.uid);
      console.log('AddShowPage: Firebase service:', !!firebaseService);
      
      let logoUrl = '';
      if (show.logoImage) {
        console.log('AddShowPage: Uploading logo image');
        // Upload logo to Firebase Storage
        const uploadResult = await firebaseService.uploadFile(`show_logos/${Date.now()}_${show.logoImage.name}`, show.logoImage) as unknown as { url: string } | undefined;
        if (uploadResult && uploadResult.url) {
          logoUrl = uploadResult.url;
        }
      }
      const showData = cleanFirestoreData({
        ...show,
        startDate: show.startDate,
        endDate: show.endDate,
        logoImage: logoUrl ? { url: logoUrl } : null,
        createdBy: user?.uid,
        createdAt: new Date(),
      });
      
      console.log('AddShowPage: Show data to be saved:', showData);
      const docId = await firebaseService.addDocument('shows', showData);
      console.log('AddShowPage: Show created with ID:', docId);
      setLoading(false);
      
      // Clear saved form state since show was successfully created
      localStorage.removeItem('showFormState');
      setFormSubmitted(true);
      console.log('AddShowPage: Form state cleared from localStorage');
      
      // Set the newly created show as the current show
      console.log('AddShowPage: About to set current show to:', docId);
      setCurrentShowId(docId as unknown as string);
      console.log('AddShowPage: Set current show to:', docId);
      
      // Check if user is in onboarding process
      const isOnboarding = !userProfile?.onboardingCompleted;
      
      console.log('AddShowPage: About to navigate, isOnboarding:', isOnboarding);
      if (isOnboarding) {
        // If in onboarding, go back to dashboard to continue onboarding flow
        console.log('AddShowPage: Navigating to dashboard');
        navigate('/');
      } else {
        // If onboarding is complete, go to the shows list page to see all shows
        console.log('AddShowPage: Navigating to shows list');
        navigate('/shows');
      }
    } catch (err: any) {
      console.error('AddShowPage: Error submitting form:', err);
      setError(err.message || 'Failed to add show.');
      setLoading(false);
    }
  };

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col min-h-screen">
          <div className="w-full max-w-6xl mx-auto py-10 px-4">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary"></div>
              <span className="ml-3 text-pb-gray">Loading...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state if user is not authenticated
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col min-h-screen">
          <div className="w-full max-w-6xl mx-auto py-10 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4 text-white">Access Denied</h1>
              <p className="text-pb-gray mb-6">You need to be logged in to create a show.</p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-pb-primary text-white rounded-lg hover:bg-pb-secondary transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-h-screen">
        <form onSubmit={handleSubmit} className="w-full max-w-6xl mx-auto bg-pb-darker/60 rounded-xl shadow-lg p-8 my-8 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">Add New Show</h1>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('showFormState');
                  window.location.reload();
                }}
                className="text-sm text-pb-gray hover:text-pb-primary underline"
                title="Clear saved form data"
              >
                Clear Form
              </button>
              <div className="text-sm text-pb-gray">
                Shows: {currentShowCount}/{limits.shows}
                {currentShowCount >= limits.shows && (
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="ml-2 text-pb-warning font-medium hover:text-pb-accent underline"
                  >
                    Limit reached - Upgrade
                  </button>
                )}
              </div>
            </div>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {formRestored && (
            <div className="bg-blue-500/20 border border-blue-500/30 text-blue-300 px-4 py-2 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <span>✓ Form data restored from previous session</span>
                <button
                  type="button"
                  onClick={() => setFormRestored(false)}
                  className="text-blue-300 hover:text-blue-100"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              className={`px-4 py-2 rounded-t-lg font-semibold transition-colors focus:outline-none ${activeTab === 'details' ? 'bg-pb-primary text-white' : 'bg-pb-darker text-pb-primary hover:bg-pb-primary/10'}`}
              onClick={() => setActiveTab('details')}
              aria-selected={activeTab === 'details'}
            >
              Show Details
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-t-lg font-semibold transition-colors focus:outline-none ${activeTab === 'team' ? 'bg-pb-primary text-white' : 'bg-pb-darker text-pb-primary hover:bg-pb-primary/10'}`}
              onClick={() => setActiveTab('team')}
              aria-selected={activeTab === 'team'}
            >
              <Users className="inline w-4 h-4 mr-1" /> Team & Collaborators
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Logo Upload (moved into Show Details tab) */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Logo Image</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-pb-primary/20 hover:bg-pb-primary/40 px-4 py-2 rounded-lg text-pb-primary">
                      <UploadCloud className="w-5 h-5" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo Preview" className="w-16 h-16 object-cover rounded border border-pb-primary/30" />
                    )}
                  </div>
                </div>
                {/* Name */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Show Name *</label>
                  <input name="name" value={show.name} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" />
                </div>
                {/* Description */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Description *</label>
                  <textarea name="description" value={show.description} onChange={handleChange} required rows={3} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" />
                </div>
                {/* Dates */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-pb-gray mb-1 font-medium">Start Date *</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        name="startDate" 
                        value={show.startDate} 
                        onChange={handleChange} 
                        required 
                        className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary date-input-light" 
                        style={{
                          colorScheme: 'dark',
                          WebkitCalendarPickerIndicator: {
                            filter: 'invert(1) brightness(1.5)',
                            opacity: 1,
                            cursor: 'pointer'
                          }
                        } as any}
                      />
                      <Calendar 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 cursor-pointer hover:text-white/80 transition-colors" 
                        onClick={() => {
                          const input = document.querySelector('input[name="startDate"]') as HTMLInputElement;
                          input?.showPicker?.();
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-pb-gray mb-1 font-medium">End Date *</label>
                    <div className="relative">
                      <input type="date" name="endDate" value={show.endDate} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary date-input-light" />
                      <Calendar 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 cursor-pointer hover:text-white/80 transition-colors" 
                        onClick={() => {
                          const input = document.querySelector('input[name="endDate"]') as HTMLInputElement;
                          input?.showPicker?.();
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Important Dates */}
                <fieldset className="mb-4 p-4 rounded-lg bg-pb-darker/40 border border-pb-primary/20">
                  <legend className="px-2 text-pb-primary font-semibold">Important Dates</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-pb-gray mb-1 font-medium">Start of Rehearsal</label>
                      <div className="relative">
                        <input type="date" name="rehearsalStartDate" value={show.rehearsalStartDate} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pr-10 text-white date-input-light" />
                        <Calendar 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 cursor-pointer hover:text-white/80 transition-colors" 
                          onClick={() => {
                            const input = document.querySelector('input[name="rehearsalStartDate"]') as HTMLInputElement;
                            input?.showPicker?.();
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-pb-gray mb-1 font-medium">Start of Tech Week</label>
                      <div className="relative">
                        <input type="date" name="techWeekStartDate" value={show.techWeekStartDate} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pr-10 text-white date-input-light" />
                        <Calendar 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 cursor-pointer hover:text-white/80 transition-colors" 
                          onClick={() => {
                            const input = document.querySelector('input[name="techWeekStartDate"]') as HTMLInputElement;
                            input?.showPicker?.();
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-pb-gray mb-1 font-medium">First Performance</label>
                      <div className="relative">
                        <input type="date" name="firstPerformanceDate" value={show.firstPerformanceDate} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pr-10 text-white date-input-light" />
                        <Calendar 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 cursor-pointer hover:text-white/80 transition-colors" 
                          onClick={() => {
                            const input = document.querySelector('input[name="firstPerformanceDate"]') as HTMLInputElement;
                            input?.showPicker?.();
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-pb-gray mb-1 font-medium">Press Night</label>
                      <div className="relative">
                        <input type="date" name="pressNightDate" value={show.pressNightDate} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pr-10 text-white date-input-light" />
                        <Calendar 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 cursor-pointer hover:text-white/80 transition-colors" 
                          onClick={() => {
                            const input = document.querySelector('input[name="pressNightDate"]') as HTMLInputElement;
                            input?.showPicker?.();
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>
                {/* Acts & Scenes */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Acts & Scenes</label>
                  {show.acts.map((act, actIdx) => (
                    <div key={actIdx} className="mb-4 p-3 rounded bg-pb-darker/40 border border-pb-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          value={act.name}
                          onChange={e => handleActNameChange(actIdx, e.target.value)}
                          placeholder="Act Name"
                          className="flex-1 rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                        />
                        <button type="button" onClick={() => handleRemoveAct(actIdx)} className="p-1 text-pb-accent hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="ml-4">
                        <label className="block text-pb-gray mb-1 font-medium">Scenes</label>
                        {act.scenes.map((scene, sceneIdx) => (
                          <div key={sceneIdx} className="flex items-center gap-2 mb-2">
                            <input
                              value={scene}
                              onChange={e => handleSceneChange(actIdx, sceneIdx, e.target.value)}
                              placeholder={`Scene ${sceneIdx + 1}`}
                              className="flex-1 rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                            />
                            <button type="button" onClick={() => handleRemoveScene(actIdx, sceneIdx)} className="p-1 text-pb-accent hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => handleAddScene(actIdx)} className="flex items-center gap-1 text-pb-primary hover:text-pb-accent mt-1"><Plus className="w-4 h-4" /> Add Scene</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={handleAddAct} className="flex items-center gap-1 text-pb-primary hover:text-pb-accent mt-1"><Plus className="w-4 h-4" /> Add Act</button>
                </div>
                {/* Stage Manager & Props Supervisor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-pb-gray mb-1 font-medium">Stage Manager</label>
                    <input name="stageManager" value={show.stageManager} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                    <input name="stageManagerEmail" value={show.stageManagerEmail} onChange={handleChange} placeholder="Email" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white mt-2" />
                  </div>
                  <div>
                    <label className="block text-pb-gray mb-1 font-medium">Props Supervisor</label>
                    <input name="propsSupervisor" value={show.propsSupervisor} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                    <input name="propsSupervisorEmail" value={show.propsSupervisorEmail} onChange={handleChange} placeholder="Email" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white mt-2" />
                  </div>
                </div>
                {/* Production Company */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Production Company</label>
                  <input name="productionCompany" value={show.productionCompany} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                {/* Venues */}
                <EntitySelectRefactored
                  label="Venue(s)"
                  type="venue"
                  selectedIds={show.venueIds || []}
                  onChange={(ids) => {
                    setShow(prev => ({ ...prev, venueIds: ids }));
                  }}
                  allowMultiple={show.isTouringShow}
                  onBeforeAddNew={cacheFormState}
                />
                {/* Touring Status */}
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isTouringShow" checked={show.isTouringShow} onChange={handleChange} id="isTouringShow" className="accent-pb-primary" />
                  <label htmlFor="isTouringShow" className="text-pb-gray font-medium">Touring Show</label>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Status</label>
                  <select name="status" value={show.status} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {/* Rehearsal Addresses */}
                <EntitySelectRefactored
                  label="Rehearsal Space(s)"
                  type="rehearsal"
                  selectedIds={show.rehearsalAddressIds || []}
                  onChange={(ids) => setShow(prev => ({ ...prev, rehearsalAddressIds: ids }))}
                  allowMultiple={true}
                  onBeforeAddNew={cacheFormState}
                />
                {/* Storage Addresses */}
                <EntitySelectRefactored
                  label="Storage Space(s)"
                  type="storage"
                  selectedIds={show.storageAddressIds || []}
                  onChange={(ids) => setShow(prev => ({ ...prev, storageAddressIds: ids }))}
                  allowMultiple={true}
                  onBeforeAddNew={cacheFormState}
                />
              </motion.div>
            )}
            {activeTab === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Team Members */}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Team Members</label>
                  {show.team.map((member, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center gap-2 mb-4 p-3 rounded bg-pb-darker/40 border border-pb-primary/20">
                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                        <input
                          type="email"
                          placeholder="Email address"
                          value={member.email}
                          onChange={e => handleTeamChange(idx, 'email', e.target.value)}
                          className="flex-1 rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                          required
                        />
                        <select
                          value={member.role}
                          onChange={e => handleTeamChange(idx, 'role', e.target.value)}
                          className="flex-1 rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                          required
                        >
                          <option value="">Select Role</option>
                          <option value="Stage Manager">Stage Manager</option>
                          <option value="Props Supervisor">Props Supervisor</option>
                          <option value="Designer">Designer</option>
                          <option value="Performer">Performer</option>
                          <option value="Other">Other</option>
                        </select>
                        <button type="button" onClick={() => handleRemoveTeam(idx)} className="p-1 text-pb-accent hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {/* Profile/Invite status */}
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        {member.status === 'registered' && (
                          <div className="flex items-center gap-2 text-pb-primary">
                            {member.avatarUrl && <img src={member.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full border border-pb-primary/30" />}
                            <span className="font-medium">{member.name || 'Registered User'}</span>
                            <span className="text-xs bg-pb-primary/20 px-2 py-1 rounded">Registered</span>
                          </div>
                        )}
                        {member.status === 'invited' && (
                          <button
                            type="button"
                            onClick={() => handleInvite(idx)}
                            className="px-3 py-1 rounded bg-pb-primary text-white text-xs hover:bg-pb-accent transition"
                          >
                            Invite
                          </button>
                        )}
                        {member.status === 'pending' && (
                          <span className="text-xs bg-pb-accent/20 px-2 py-1 rounded text-pb-accent">Invite Sent</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={handleAddTeam} className="flex items-center gap-1 text-pb-primary hover:text-pb-accent mt-1"><UserPlus className="w-4 h-4" /> Add Team Member</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || currentShowCount >= limits.shows}
            className="w-full py-3 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold text-lg shadow transition disabled:opacity-60 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Saving...' : currentShowCount >= limits.shows ? 'Show Limit Reached' : 'Add Show'}
          </motion.button>
        </form>
      </div>
      
      {/* Upgrade Modal */}
      {upgradeOpen && (
        <UpgradeModal 
          open={upgradeOpen} 
          onClose={() => setUpgradeOpen(false)} 
          reason={`You have reached your plan's show limit of ${limits.shows}. Upgrade to create more shows.`} 
        />
      )}
    </DashboardLayout>
  );
};

export default AddShowPage; 