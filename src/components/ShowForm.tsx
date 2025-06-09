import React, { useState, useEffect, FormEvent, useRef, useCallback } from 'react';
import { PlusCircle, MinusCircle, Save, Upload, Trash2, AlertTriangle, X, Check, ChevronUp, ChevronDown, MapPin, Users, CalendarDays, Info, Building, Phone, Mail, Palette } from 'lucide-react';
import { VenueForm } from './VenueForm.tsx';
import { WysiwygEditor } from './WysiwygEditor.tsx';
import { HelpTooltip } from './HelpTooltip.tsx';
import type { Show, Venue, Contact, Act, Scene, ShowCollaborator } from '../shared/services/firebase/types.ts';
import { Address } from '../shared/types/address.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

interface ShowFormProps {
  mode: 'create' | 'edit';
  initialData?: Show;
  onSubmit: (data: Show) => void;
  onCancel?: () => void;
}

const initialFormState: Show = {
  id: '',
  name: '',
  description: '',
  acts: [{
    id: 1,
    name: '',
    description: '',
    scenes: [{ id: 1, name: '', setting: '', description: '' }]
  }],
  userId: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  collaborators: [],
  isTouringShow: false,
  venues: [],
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
  contacts: [],
  imageUrl: '',
  logoImage: undefined,
  rehearsalAddresses: [],
  storageAddresses: [],
  startDate: null,
  endDate: null,
  status: 'planning',
  defaultActId: undefined,
  defaultSceneId: undefined,
};

const defaultAddress: Address = {
  id: '', 
  name: '',
  companyName: '',
  street1: '',
  street2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'United Kingdom',
  nickname: '',
};

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-sm font-medium text-gray-300 mb-2">
      {children} <span className="text-primary">*</span>
    </span>
  );
}

export default function ShowForm({ mode, initialData, onSubmit, onCancel }: ShowFormProps) {
  // Make sure initialData has all required properties by merging with initialFormState
  const mergedInitialData = initialData ? {
    ...initialFormState,
    ...initialData,
    // Ensure nested properties always exist
    acts: (initialData.acts && initialData.acts.length > 0) ? initialData.acts : initialFormState.acts,
    venues: (initialData.venues && initialData.venues.length > 0) ? initialData.venues : initialFormState.venues,
    contacts: Array.isArray(initialData.contacts) ? initialData.contacts : [],
    rehearsalAddresses: Array.isArray(initialData.rehearsalAddresses) ? initialData.rehearsalAddresses : [],
    storageAddresses: Array.isArray(initialData.storageAddresses) ? initialData.storageAddresses : [],
  } : initialFormState;

  const [formData, setFormData] = useState<Show>(mergedInitialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      // Always merge with initialFormState to ensure all properties exist
      const mergedData = {
        ...initialFormState,
        ...initialData,
        // Ensure nested properties always exist
        acts: (initialData.acts && initialData.acts.length > 0) ? initialData.acts : initialFormState.acts,
        venues: (initialData.venues && initialData.venues.length > 0) ? initialData.venues : initialFormState.venues,
        contacts: Array.isArray(initialData.contacts) ? initialData.contacts : [],
        rehearsalAddresses: Array.isArray(initialData.rehearsalAddresses) ? initialData.rehearsalAddresses : [],
        storageAddresses: Array.isArray(initialData.storageAddresses) ? initialData.storageAddresses : [],
      };
      
      setFormData(mergedData);
    }
  }, [initialData, mode]);

  // References to store current editing values
  const actInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const sceneInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation with null/undefined checks
    if (!formData.name?.trim()) newErrors.name = 'Show name is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    if (!formData.stageManager?.trim()) newErrors.stageManager = 'Stage manager name is required';
    if (!formData.stageManagerEmail?.trim()) newErrors.stageManagerEmail = 'Stage manager email is required';
    if (!formData.propsSupervisor?.trim()) newErrors.propsSupervisor = 'Props supervisor name is required';
    if (!formData.propsSupervisorEmail?.trim()) newErrors.propsSupervisorEmail = 'Props supervisor email is required';
    if (!formData.productionCompany?.trim()) newErrors.productionCompany = 'Production company is required';
    if (!formData.productionContactName?.trim()) newErrors.productionContactName = 'Production contact name is required';
    if (!formData.productionContactEmail?.trim()) newErrors.productionContactEmail = 'Production contact email is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.stageManagerEmail && !emailRegex.test(formData.stageManagerEmail)) {
      newErrors.stageManagerEmail = 'Invalid email format';
    }
    if (formData.propsSupervisorEmail && !emailRegex.test(formData.propsSupervisorEmail)) {
      newErrors.propsSupervisorEmail = 'Invalid email format';
    }
    if (formData.productionContactEmail && !emailRegex.test(formData.productionContactEmail)) {
      newErrors.productionContactEmail = 'Invalid email format';
    }

    // Phone validation (optional fields)
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (formData.stageManagerPhone && !phoneRegex.test(formData.stageManagerPhone)) {
      newErrors.stageManagerPhone = 'Invalid phone format';
    }
    if (formData.propsSupervisorPhone && !phoneRegex.test(formData.propsSupervisorPhone)) {
      newErrors.propsSupervisorPhone = 'Invalid phone format';
    }
    if (formData.productionContactPhone && !phoneRegex.test(formData.productionContactPhone)) {
      newErrors.productionContactPhone = 'Invalid phone format';
    }

    // Validate at least one venue for non-touring shows
    if (!formData.isTouringShow && (!formData.venues?.[0] || !formData.venues[0].name?.trim() || !formData.venues[0].address?.street1?.trim())) {
      newErrors.venue = 'Venue name and at least Street 1 are required for non-touring shows';
    }

    // Validate acts and scenes
    if (!formData.acts || formData.acts.length === 0) {
      newErrors.acts = 'At least one act is required';
    } else {
      formData.acts.forEach((act: Act, actIndex: number) => {
        if (!act || !act.scenes || act.scenes.length === 0) {
          newErrors[`act_${actIndex}_scenes`] = `At least one scene is required in Act ${actIndex + 1}`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const isValid = validateForm();
      
      if (!isValid) {
        return;
      }

      setIsSubmitting(true);
      
      // Prepare submission data with proper defaults for any potentially undefined fields
      const submissionData: Show = {
        id: formData.id || '',
        name: formData.name || '',
        description: formData.description || '',
        acts: formData.acts || [],
        userId: formData.userId || '',
        createdAt: mode === 'create' ? new Date().toISOString() : (formData.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        collaborators: formData.collaborators || [],
        stageManager: formData.stageManager || '',
        stageManagerEmail: formData.stageManagerEmail || '',
        stageManagerPhone: formData.stageManagerPhone || '',
        propsSupervisor: formData.propsSupervisor || '',
        propsSupervisorEmail: formData.propsSupervisorEmail || '',
        propsSupervisorPhone: formData.propsSupervisorPhone || '',
        productionCompany: formData.productionCompany || '',
        productionContactName: formData.productionContactName || '',
        productionContactEmail: formData.productionContactEmail || '',
        productionContactPhone: formData.productionContactPhone || '',
        startDate: formData.startDate || new Date().toISOString(),
        endDate: formData.endDate || new Date().toISOString(),
        venues: formData.isTouringShow ? (formData.venues || []) : [(formData.venues && formData.venues[0]) || { name: '', address: defaultAddress, startDate: '', endDate: '', notes: '' }],
        isTouringShow: !!formData.isTouringShow,
        contacts: formData.contacts || [],
        imageUrl: formData.imageUrl || '',
        logoImage: formData.logoImage,
        rehearsalAddresses: formData.rehearsalAddresses || [],
        storageAddresses: formData.storageAddresses || [],
      };

      await onSubmit(submissionData);

      if (mode === 'create') {
        // Reset form after successful creation
        setFormData(initialFormState);
      }
    } catch (error) {
      setErrors({
        submit: `Failed to submit the form: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVenuesChange = (updatedVenues: Venue[]) => {
    setFormData((prevData: Show) => ({ ...prevData, venues: updatedVenues }));
  };

  const handleAddAddress = (type: 'rehearsal' | 'storage') => {
    const field = type === 'rehearsal' ? 'rehearsalAddresses' : 'storageAddresses';
    setFormData((prevData: Show) => ({
      ...prevData,
      [field]: [...(prevData[field] || []), { ...defaultAddress, id: `new-${Date.now()}` }]
    }));
  };

  const handleRemoveAddress = (type: 'rehearsal' | 'storage', index: number) => {
    const field = type === 'rehearsal' ? 'rehearsalAddresses' : 'storageAddresses';
    setFormData((prevData: Show) => ({
      ...prevData,
      [field]: (prevData[field] || []).filter((_: Address, i: number) => i !== index)
    }));
  };

  const handleAddressFieldChange = (type: 'rehearsal' | 'storage', index: number, field: keyof Address, value: string) => {
    const listField = type === 'rehearsal' ? 'rehearsalAddresses' : 'storageAddresses';
    setFormData((prevData: Show) => {
      const updatedList = (prevData[listField] || []).map((addr: Address, i: number) => {
        if (i === index) {
          return { ...addr, [field]: value };
        }
        return addr;
      });
      return { ...prevData, [listField]: updatedList };
    });
  };

  const handleActChange = (actIndex: number, value: string) => {
    // Store the reference to the input element for focus management
    const inputKey = `act-${actIndex}`;
    if (actInputRefs.current[inputKey]) {
      actInputRefs.current[inputKey].value = value;
    }
    
    // Update state with a slight delay to prevent focus loss
    setTimeout(() => {
      setFormData((prevData: Show) => {
        const updatedActs = [...(prevData.acts || [])];
        
        if (!updatedActs[actIndex]) {
          updatedActs[actIndex] = {
            id: actIndex + 1,
            name: value,
            scenes: []
          };
        } else {
          updatedActs[actIndex].name = value;
        }
        
        return {
          ...prevData,
          acts: updatedActs
        };
      });
    }, 0);
  };

  const handleSceneChange = (actIndex: number, sceneIndex: number, value: string) => {
    // Store the reference to the input element for focus management
    const inputKey = `scene-${actIndex}-${sceneIndex}`;
    if (sceneInputRefs.current[inputKey]) {
      sceneInputRefs.current[inputKey].value = value;
    }
    
    // Update state with a slight delay to prevent focus loss
    setTimeout(() => {
      setFormData((prevData: Show) => {
        const updatedActs = [...(prevData.acts || [])];
        
        if (!updatedActs[actIndex]) {
          updatedActs[actIndex] = {
            id: actIndex + 1,
            name: '',
            scenes: []
          };
        }
        
        if (!updatedActs[actIndex].scenes) {
          updatedActs[actIndex].scenes = [];
        }
        
        if (!updatedActs[actIndex].scenes[sceneIndex]) {
          updatedActs[actIndex].scenes[sceneIndex] = {
            id: sceneIndex + 1,
            name: value
          };
        } else {
          updatedActs[actIndex].scenes[sceneIndex].name = value;
        }
        
        return {
          ...prevData,
          acts: updatedActs
        };
      });
    }, 0);
  };

  const addAct = () => {
    const newAct: Act = {
      id: (formData.acts?.length || 0) + 1,
      name: '',
      scenes: [{ id: 1, name: '' }]
    };
    
    // Use functional update to prevent focus loss
    setFormData((prevData: Show) => ({
      ...prevData,
      acts: [...(prevData.acts || []), newAct]
    }));
  };

  const addScene = (actIndex: number) => {
    // Use functional update to prevent focus loss
    setFormData((prevData: Show) => {
      const updatedActs = [...(prevData.acts || [])];
      if (!updatedActs[actIndex]) {
        return prevData; // Act doesn't exist
      }
      
      const newScene: Scene = {
        id: (updatedActs[actIndex].scenes || []).length + 1,
        name: ''
      };
      
      // Ensure scenes array exists
      if (!updatedActs[actIndex].scenes) {
        updatedActs[actIndex].scenes = [];
      }
      
      updatedActs[actIndex].scenes.push(newScene);
      return {
        ...prevData,
        acts: updatedActs
      };
    });
  };

  const removeAct = (actIndex: number) => {
    // Use functional update to prevent focus loss
    setFormData((prevData: Show) => {
      if (!(prevData.acts || []).length || (prevData.acts || []).length <= 1) {
        return prevData; // Don't remove if it's the last act
      }
      
      const updatedActs = (prevData.acts || []).filter((act: Act, i: number) => i !== actIndex);
      
      // Ensure act IDs are sequential
      updatedActs.forEach((act: Act, idx: number) => {
        act.id = idx + 1;
      });
      
      return {
        ...prevData,
        acts: updatedActs
      };
    });
  };

  const removeScene = (actIndex: number, sceneIndex: number) => {
    // Use functional update to prevent focus loss
    setFormData((prevData: Show) => {
      const updatedActs = [...(prevData.acts || [])];
      if (!updatedActs[actIndex] || 
          !updatedActs[actIndex].scenes || 
          updatedActs[actIndex].scenes.length <= 1) {
        return prevData; // Don't remove if it's the last scene
      }
      
      const updatedScenes = updatedActs[actIndex].scenes.filter((scene: Scene, i: number) => i !== sceneIndex);
      
      // Ensure scene IDs are sequential
      updatedScenes.forEach((scene: Scene, idx: number) => {
        scene.id = idx + 1;
      });
      
      updatedActs[actIndex].scenes = updatedScenes;
      return {
        ...prevData,
        acts: updatedActs
      };
    });
  };

  const handleDescriptionChange = (content: string) => {
    setFormData((prevData: Show) => ({...prevData, description: content}));
  };
  
  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    setFormData((prevData: Show) => {
      const updatedContacts = [...(prevData.contacts || [])];
      if (updatedContacts[index]) {
        updatedContacts[index] = { ...updatedContacts[index], [field]: value };
      }
      return { ...prevData, contacts: updatedContacts };
    });
  };

  const addContact = () => {
    setFormData((prevData: Show) => ({
      ...prevData,
      contacts: [...(prevData.contacts || []), { id: `new-${Date.now()}`, name: '', email: '', phone: '', role: '' } as Contact]
    }));
  };

  const removeContact = (index: number) => {
    setFormData((prevData: Show) => ({
      ...prevData,
      contacts: (prevData.contacts || []).filter((_: Contact, i: number) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="gradient-border p-6">
      <div className="grid gap-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'Create New Show' : 'Edit Show'}
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Show Name <span className="text-primary">*</span>
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Show Name Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use the official production title</li>
                    <li>Include version/year if applicable</li>
                    <li>Be consistent with marketing materials</li>
                  </ul>
                </div>
              } />
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name || ''}
              onChange={(e) => {
                setFormData(prevData => ({
                  ...prevData,
                  name: e.target.value
                }));
              }}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Enter show name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Description <span className="text-primary">*</span>
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Description Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Brief overview of the production</li>
                    <li>Key themes or style elements</li>
                    <li>Special requirements or notes</li>
                  </ul>
                </div>
              } />
            </label>
            <WysiwygEditor
              value={formData.description || ''}
              onChange={handleDescriptionChange}
              placeholder="Enter show description"
              minHeight={120}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Show Image
            </label>
            <div className="flex items-center space-x-4">
              {formData.imageUrl && (
                <div className="relative w-24 h-24">
                  <img
                    src={formData.imageUrl}
                    alt="Show image"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-center w-full">
                  <label className="w-full flex flex-col items-center px-4 py-6 bg-[var(--input-bg)] text-[var(--text-secondary)] rounded-lg border-2 border-dashed border-[var(--border-color)] cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm">Click to upload image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({
                              ...formData,
                              imageUrl: reader.result as string
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  PNG, JPG or GIF (max. 2MB)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Acts and Scenes
            </div>
            
            {(formData.acts || []).map((act, actIndex) => (
              <div key={`act-${actIndex}-${act.id}`} className="space-y-4 p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[var(--text-primary)]">Act {actIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeAct(actIndex)}
                    className="text-sm text-primary hover:text-primary-light"
                  >
                    <MinusCircle className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    defaultValue={act.name || ''}
                    ref={(el) => {
                      if (el) actInputRefs.current[`act-${actIndex}`] = el;
                    }}
                    onChange={(e) => handleActChange(actIndex, e.target.value)}
                    onBlur={(e) => handleActChange(actIndex, e.target.value)}
                    placeholder="Enter act name"
                    className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
                  />
                  {act.scenes.map((scene, sceneIndex) => (
                    <div key={`scene-${actIndex}-${sceneIndex}-${scene.id}`} className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-secondary)]">Scene {sceneIndex + 1}</span>
                      <input
                        type="text"
                        defaultValue={scene.name || ''}
                        ref={(el) => {
                          if (el) sceneInputRefs.current[`scene-${actIndex}-${sceneIndex}`] = el;
                        }}
                        onChange={(e) => handleSceneChange(actIndex, sceneIndex, e.target.value)}
                        onBlur={(e) => handleSceneChange(actIndex, sceneIndex, e.target.value)}
                        placeholder="Enter scene name"
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeScene(actIndex, sceneIndex)}
                        className="text-sm text-primary hover:text-primary-light"
                      >
                        <MinusCircle className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => addScene(actIndex)}
                  className="text-sm text-primary hover:text-primary-light"
                >
                  <PlusCircle className="h-5 w-5" />
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addAct}
              className="flex items-center gap-2 text-primary hover:text-primary-light"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Add Act</span>
            </button>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isTouringShow}
                onChange={(e) => {
                  const isTouringShow = e.target.checked;
                  setFormData(prevData => ({
                    ...prevData, 
                    isTouringShow,
                    venues: isTouringShow ? prevData.venues || [] : (prevData.venues || []).slice(0, 1)
                  }));
                }}
                className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              />
              <span className="text-[var(--text-secondary)]">This is a touring show</span>
            </label>
          </div>

          <div>
            <label htmlFor="stageManager" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Stage Manager <span className="text-primary">*</span>
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Stage Manager Contact:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Primary point of contact</li>
                    <li>Responsible for show coordination</li>
                    <li>Include all contact methods</li>
                  </ul>
                </div>
              } />
            </label>
            <div className="space-y-3">
              <input
                type="text"
                id="stageManager"
                required
                value={formData.stageManager || ''}
                onChange={(e) => setFormData((prevData: Show) => ({
                  ...prevData,
                  stageManager: e.target.value
                }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter stage manager's name"
              />
              <input
                type="email"
                id="stageManagerEmail"
                required
                value={formData.stageManagerEmail || ''}
                onChange={(e) => setFormData((prevData: Show) => ({
                  ...prevData,
                  stageManagerEmail: e.target.value
                }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter stage manager's email"
              />
              <input
                type="tel"
                id="stageManagerPhone"
                value={formData.stageManagerPhone || ''}
                onChange={(e) => setFormData((prevData: Show) => ({
                  ...prevData,
                  stageManagerPhone: e.target.value
                }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter stage manager's phone number (optional)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="propsSupervisor" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Props Supervisor <span className="text-primary">*</span>
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Props Supervisor Role:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Manages all prop-related matters</li>
                    <li>Handles maintenance and repairs</li>
                    <li>Coordinates with production team</li>
                  </ul>
                </div>
              } />
            </label>
            <div className="space-y-3">
              <input
                type="text"
                id="propsSupervisor"
                required
                value={formData.propsSupervisor || ''}
                onChange={(e) => setFormData((prevData: Show) => ({ ...prevData, propsSupervisor: e.target.value }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's name"
              />
              <input
                type="email"
                id="propsSupervisorEmail"
                required
                value={formData.propsSupervisorEmail || ''}
                onChange={(e) => setFormData((prevData: Show) => ({ ...prevData, propsSupervisorEmail: e.target.value }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's email"
              />
              <input
                type="tel"
                id="propsSupervisorPhone"
                value={formData.propsSupervisorPhone || ''}
                onChange={(e) => setFormData((prevData: Show) => ({ ...prevData, propsSupervisorPhone: e.target.value }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's phone number (optional)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="productionCompany" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Production Company <span className="text-primary">*</span>
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Production Details:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Official company name</li>
                    <li>Primary contact person</li>
                    <li>Billing and legal information</li>
                  </ul>
                </div>
              } />
            </label>
            <div className="space-y-3">
              <input
                type="text"
                id="productionCompany"
                required
                value={formData.productionCompany || ''}
                onChange={(e) => setFormData((prevData: Show) => ({
                  ...prevData,
                  productionCompany: e.target.value
                }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production company name"
              />
              <input
                type="text"
                id="productionContactName"
                required
                value={formData.productionContactName || ''}
                onChange={(e) => setFormData((prevData: Show) => ({
                  ...prevData,
                  productionContactName: e.target.value
                }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact name"
              />
              <input
                type="email"
                id="productionContactEmail"
                required
                value={formData.productionContactEmail || ''}
                onChange={(e) => setFormData((prevData: Show) => ({ ...prevData, productionContactEmail: e.target.value }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact email"
              />
              <input
                type="tel"
                id="productionContactPhone"
                value={formData.productionContactPhone || ''}
                onChange={(e) => setFormData((prevData: Show) => ({ ...prevData, productionContactPhone: e.target.value }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact phone number (optional)"
              />
            </div>
          </div>

          {/* --- Rehearsal Addresses Section --- */}
          <div className="venue-section mt-6">
            <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">Rehearsal Spaces</label>
                <button
                    type="button"
                    onClick={() => handleAddAddress('rehearsal')}
                    className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Rehearsal Space
                </button>
            </div>
            {(formData.rehearsalAddresses || []).map((addr, index) => (
                <div key={addr.id || index} className="p-3 mb-2 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-2 relative">
                    <button 
                        type="button" 
                        onClick={() => handleRemoveAddress('rehearsal', index)} 
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-400"
                    >
                        <MinusCircle className="h-4 w-4" />
                    </button>
                    {(Object.keys(defaultAddress) as Array<keyof Address>)
                        .filter((key: keyof Address) => key !== 'id')
                        .map((addressKey: keyof Address) => (
                            <div key={addressKey}>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    {addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                                </label>
                                <input
                                    type="text"
                                    value={addr[addressKey] || ''}
                                    onChange={(e) => handleAddressFieldChange('rehearsal', index, addressKey, e.target.value)}
                                    className="w-full bg-[#1F1F1F] border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                                    placeholder={addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                                />
                            </div>
                    ))}
                </div>
            ))}
             {(!formData.rehearsalAddresses || formData.rehearsalAddresses.length === 0) && (
                 <p className="text-xs text-gray-500 italic">No rehearsal spaces added.</p>
             )}
          </div>

          {/* --- Storage Addresses Section --- */}
          <div className="venue-section mt-6">
            <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">Storage Locations</label>
                 <button
                    type="button"
                    onClick={() => handleAddAddress('storage')}
                    className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Storage Location
                </button>
            </div>
             {(formData.storageAddresses || []).map((addr, index) => (
                <div key={addr.id || index} className="p-3 mb-2 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-2 relative">
                     <button 
                        type="button" 
                        onClick={() => handleRemoveAddress('storage', index)} 
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-400"
                    >
                        <MinusCircle className="h-4 w-4" />
                    </button>
                    {(Object.keys(defaultAddress) as Array<keyof Address>)
                        .filter((key: keyof Address) => key !== 'id')
                        .map((addressKey: keyof Address) => (
                            <div key={addressKey}>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                    {addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                                </label>
                                <input
                                    type="text"
                                    value={addr[addressKey] || ''}
                                    onChange={(e) => handleAddressFieldChange('storage', index, addressKey, e.target.value)}
                                    className="w-full bg-[#1F1F1F] border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                                    placeholder={addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                                />
                            </div>
                     ))}
                </div>
            ))}
             {(!formData.storageAddresses || formData.storageAddresses.length === 0) && (
                 <p className="text-xs text-gray-500 italic">No storage locations added.</p>
             )}
          </div>

          {/* Show validation errors */}
          {Object.keys(errors).length > 0 && (
            <div className="w-full p-3 bg-red-500/10 border border-red-500 rounded text-red-500">
              <h3 className="font-bold mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-medium text-white hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] transition-colors"
            >
              {mode === 'edit' ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Show
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}