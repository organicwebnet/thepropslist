import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { PlusCircle, MinusCircle, Save, Upload } from 'lucide-react';
import { VenueForm } from './VenueForm';
import type { ShowFormData, Act, Scene, PropImage, Show, Venue } from '../types';
import { WysiwygEditor } from './WysiwygEditor';

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
    scenes: [{ id: 1, name: '' }]
  }],
  userId: '',
  createdAt: new Date().toISOString(),
  collaborators: [],
  isTouringShow: false,
  venues: [{
    name: '',
    address: '',
    startDate: '',
    endDate: '',
    notes: ''
  }],
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
  imageUrl: ''
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
    contacts: Array.isArray(initialData.contacts) ? initialData.contacts : []
  } : initialFormState;

  const [formData, setFormData] = useState<Show>(mergedInitialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form data when initialData changes
  useEffect(() => {
    console.log('ShowForm initialData changed:', initialData);
    console.log('Current mode:', mode);
    
    if (initialData) {
      // Always merge with initialFormState to ensure all properties exist
      const mergedData = {
        ...initialFormState,
        ...initialData,
        // Ensure nested properties always exist
        acts: (initialData.acts && initialData.acts.length > 0) ? initialData.acts : initialFormState.acts,
        venues: (initialData.venues && initialData.venues.length > 0) ? initialData.venues : initialFormState.venues,
        contacts: Array.isArray(initialData.contacts) ? initialData.contacts : []
      };
      
      console.log('Setting form data to:', mergedData);
      setFormData(mergedData);
    }
  }, [initialData, mode]);

  // References to store current editing values
  const actInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const sceneInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const validateForm = (): boolean => {
    console.log('Running form validation with data:', formData);
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
    if (!formData.isTouringShow && (!formData.venues?.[0] || !formData.venues[0].name?.trim())) {
      newErrors.venue = 'Venue is required for non-touring shows';
    }

    // Validate acts and scenes
    if (!formData.acts || formData.acts.length === 0) {
      newErrors.acts = 'At least one act is required';
    } else {
      formData.acts.forEach((act, actIndex) => {
        if (!act.scenes || act.scenes.length === 0) {
          newErrors[`act_${actIndex}_scenes`] = `At least one scene is required in Act ${actIndex + 1}`;
        }
      });
    }

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    console.log('Form submission started');
    e.preventDefault();
    
    try {
      const isValid = validateForm();
      console.log('Form validation result:', isValid);
      console.log('Form validation errors:', errors);
      
      if (!isValid) {
        console.log('Form validation failed, aborting submission');
        return;
      }

      console.log('Form is valid, proceeding with submission');
      setIsSubmitting(true);
      
      // Prepare submission data with proper defaults for any potentially undefined fields
      const submissionData: Show = {
        id: formData.id || '',
        name: formData.name || '',
        description: formData.description || '',
        acts: formData.acts || [],
        userId: formData.userId || '',
        createdAt: mode === 'create' ? new Date().toISOString() : (formData.createdAt || new Date().toISOString()),
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
        // If not a touring show, ensure only one venue
        venues: formData.isTouringShow ? (formData.venues || []) : [(formData.venues && formData.venues[0]) || { name: '', address: '', startDate: '', endDate: '', notes: '' }],
        isTouringShow: !!formData.isTouringShow,
        contacts: formData.contacts || [],
        imageUrl: formData.imageUrl || ''
      };

      console.log('Submitting data:', submissionData);
      await onSubmit(submissionData);
      console.log('Form submission completed successfully');

      if (mode === 'create') {
        // Reset form after successful creation
        setFormData(initialFormState);
        console.log('Form reset to initial state after creation');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({
        submit: `Failed to submit the form: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
      console.log('Form submission process completed, isSubmitting set to false');
    }
  };

  const handleVenueChange = (index: number, value: string) => {
    console.log(`Changing venue ${index} name to:`, value);
    // Create a new copy of venues only once
    const updatedVenues = [...(formData.venues || [])];
    
    // Check if the venue exists, if not create it
    if (!updatedVenues[index]) {
      updatedVenues[index] = {
        name: value,
        address: '',
        startDate: '',
        endDate: '',
        notes: ''
      };
    } else {
      // If it exists, just update the name without creating a new object
      updatedVenues[index].name = value;
    }
    
    // Update the form data once with the new venues array
    setFormData(prevData => ({
      ...prevData,
      venues: updatedVenues
    }));
  };

  const addVenue = () => {
    if (formData.isTouringShow) {
      const newVenue: Venue = {
        name: '',
        address: '',
        startDate: '',
        endDate: '',
        notes: ''
      };
      setFormData({
        ...formData,
        venues: [...formData.venues, newVenue]
      });
    }
  };

  const removeVenue = (index: number) => {
    if (formData.venues.length > 1) {
      const updatedVenues = formData.venues.filter((_, i) => i !== index);
      setFormData({ ...formData, venues: updatedVenues });
    }
  };

  const handleActChange = (actIndex: number, value: string) => {
    console.log(`Changing act ${actIndex} name to:`, value);
    
    // Store the reference to the input element for focus management
    const inputKey = `act-${actIndex}`;
    if (actInputRefs.current[inputKey]) {
      actInputRefs.current[inputKey].value = value;
    }
    
    // Update state with a slight delay to prevent focus loss
    setTimeout(() => {
      setFormData(prevData => {
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
    console.log(`Changing act ${actIndex} scene ${sceneIndex} name to:`, value);
    
    // Store the reference to the input element for focus management
    const inputKey = `scene-${actIndex}-${sceneIndex}`;
    if (sceneInputRefs.current[inputKey]) {
      sceneInputRefs.current[inputKey].value = value;
    }
    
    // Update state with a slight delay to prevent focus loss
    setTimeout(() => {
      setFormData(prevData => {
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
      id: formData.acts.length + 1,
      name: '',
      scenes: [{ id: 1, name: '' }]
    };
    
    // Use functional update to prevent focus loss
    setFormData(prevData => ({
      ...prevData,
      acts: [...(prevData.acts || []), newAct]
    }));
  };

  const addScene = (actIndex: number) => {
    // Use functional update to prevent focus loss
    setFormData(prevData => {
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
    setFormData(prevData => {
      if (!(prevData.acts || []).length || (prevData.acts || []).length <= 1) {
        return prevData; // Don't remove if it's the last act
      }
      
      const updatedActs = (prevData.acts || []).filter((_, i) => i !== actIndex);
      
      // Ensure act IDs are sequential
      updatedActs.forEach((act, idx) => {
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
    setFormData(prevData => {
      const updatedActs = [...(prevData.acts || [])];
      if (!updatedActs[actIndex] || 
          !updatedActs[actIndex].scenes || 
          updatedActs[actIndex].scenes.length <= 1) {
        return prevData; // Don't remove if it's the last scene
      }
      
      const updatedScenes = updatedActs[actIndex].scenes.filter((_, i) => i !== sceneIndex);
      
      // Ensure scene IDs are sequential
      updatedScenes.forEach((scene, idx) => {
        scene.id = idx + 1;
      });
      
      updatedActs[actIndex].scenes = updatedScenes;
      return {
        ...prevData,
        acts: updatedActs
      };
    });
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
            <RequiredLabel>Show Name</RequiredLabel>
            <input
              type="text"
              id="name"
              required
              value={formData.name || ''}
              onChange={(e) => {
                console.log('Changing show name to:', e.target.value);
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
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <WysiwygEditor
              value={formData.description || ''}
              onChange={(value) => setFormData(prevData => ({
                ...prevData,
                description: value
              }))}
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
            
            {formData.acts.map((act, actIndex) => (
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

          {formData.isTouringShow ? (
            <VenueForm
              venues={formData.venues || []}
              onChange={(venues) => setFormData({ ...formData, venues })}
            />
          ) : (
            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Venue
              </label>
              <input
                type="text"
                id="venue"
                value={(formData.venues && formData.venues[0] && formData.venues[0].name) || ''}
                onChange={(e) => handleVenueChange(0, e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter venue name"
              />
            </div>
          )}

          <div>
            <label htmlFor="stageManager" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Stage Manager <span className="text-primary">*</span>
            </label>
            <div className="space-y-3">
              <input
                type="text"
                id="stageManager"
                required
                value={formData.stageManager || ''}
                onChange={(e) => setFormData(prevData => ({
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
                onChange={(e) => setFormData(prevData => ({
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
                onChange={(e) => setFormData(prevData => ({
                  ...prevData,
                  stageManagerPhone: e.target.value
                }))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter stage manager's phone number (optional)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="propsSupervisor" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Props Supervisor <span className="text-primary">*</span>
            </label>
            <div className="space-y-3">
              <input
                type="text"
                id="propsSupervisor"
                required
                value={formData.propsSupervisor || ''}
                onChange={(e) => setFormData({ ...formData, propsSupervisor: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's name"
              />
              <input
                type="email"
                id="propsSupervisorEmail"
                required
                value={formData.propsSupervisorEmail || ''}
                onChange={(e) => setFormData({ ...formData, propsSupervisorEmail: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's email"
              />
              <input
                type="tel"
                id="propsSupervisorPhone"
                value={formData.propsSupervisorPhone || ''}
                onChange={(e) => setFormData({ ...formData, propsSupervisorPhone: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's phone number (optional)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="productionCompany" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Production Company <span className="text-primary">*</span>
            </label>
            <div className="space-y-3">
              <input
                type="text"
                id="productionCompany"
                required
                value={formData.productionCompany || ''}
                onChange={(e) => setFormData(prevData => ({
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
                onChange={(e) => setFormData(prevData => ({
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
                onChange={(e) => setFormData({ ...formData, productionContactEmail: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact email"
              />
              <input
                type="tel"
                id="productionContactPhone"
                value={formData.productionContactPhone || ''}
                onChange={(e) => setFormData({ ...formData, productionContactPhone: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact phone number (optional)"
              />
            </div>
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