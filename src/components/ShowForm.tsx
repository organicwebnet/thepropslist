import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Save, Upload } from 'lucide-react';
import { VenueForm } from './VenueForm';
import type { ShowFormData, Act, Scene, PropImage } from '../types';

interface ShowFormProps {
  onSubmit: (show: ShowFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: ShowFormData;
  mode?: 'create' | 'edit';
}

const initialActState: Act = {
  id: 1,
  scenes: [{ id: 1, name: '' }]
};

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-sm font-medium text-gray-300 mb-2">
      {children} <span className="text-primary">*</span>
    </span>
  );
}

export function ShowForm({ onSubmit, onCancel, initialData, mode = 'create' }: ShowFormProps) {
  const [formData, setFormData] = useState<ShowFormData>(
    initialData || {
      name: '',
      description: '',
      acts: [initialActState],
      venues: [],
      isTouringShow: false,
      contacts: [],
      imageUrl: '',
      logoImage: undefined,
      stageManager: '',
      stageManagerEmail: '',
      stageManagerPhone: '',
      propsSupervisor: '',
      propsSupervisorEmail: '',
      propsSupervisorPhone: '',
      productionCompany: '',
      productionContactName: '',
      productionContactEmail: '',
      productionContactPhone: ''
    }
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const addAct = () => {
    const newActId = formData.acts.length + 1;
    setFormData({
      ...formData,
      acts: [...formData.acts, { id: newActId, scenes: [{ id: 1, name: '' }] }]
    });
  };

  const addScene = (actId: number) => {
    setFormData({
      ...formData,
      acts: formData.acts.map(act => {
        if (act.id === actId) {
          return {
            ...act,
            scenes: [...act.scenes, { id: act.scenes.length + 1, name: '' }]
          };
        }
        return act;
      })
    });
  };

  const updateSceneName = (actId: number, sceneId: number, name: string) => {
    setFormData({
      ...formData,
      acts: formData.acts.map(act => {
        if (act.id === actId) {
          return {
            ...act,
            scenes: act.scenes.map(scene => {
              if (scene.id === sceneId) {
                return { ...scene, name };
              }
              return scene;
            })
          };
        }
        return act;
      })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If not a touring show, ensure only one venue is set
    const submitData = {
      ...formData,
      venues: formData.isTouringShow ? formData.venues : formData.venues.slice(0, 1)
    };
    await onSubmit(submitData);
    if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        acts: [initialActState],
        venues: [],
        isTouringShow: false,
        contacts: [],
        imageUrl: '',
        logoImage: undefined,
        stageManager: '',
        stageManagerEmail: '',
        stageManagerPhone: '',
        propsSupervisor: '',
        propsSupervisorEmail: '',
        propsSupervisorPhone: '',
        productionCompany: '',
        productionContactName: '',
        productionContactEmail: '',
        productionContactPhone: ''
      });
    }
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Enter show name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              rows={3}
              placeholder="Enter show description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Show Logo
            </label>
            <div className="flex items-center space-x-4">
              {formData.imageUrl && (
                <div className="relative w-24 h-24">
                  <img
                    src={formData.imageUrl}
                    alt="Show logo"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '', logoImage: undefined })}
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
                    <span className="text-sm">Click to upload logo</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // TODO: Implement actual file upload
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const newImage: PropImage = {
                              id: Date.now().toString(),
                              url: reader.result as string,
                              isMain: true,
                              uploadedAt: new Date().toISOString(),
                              caption: 'Show Logo'
                            };
                            setFormData({
                              ...formData,
                              imageUrl: reader.result as string,
                              logoImage: newImage
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
            
            {formData.acts.map((act) => (
              <div key={act.id} className="space-y-4 p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[var(--text-primary)]">Act {act.id}</h3>
                  <button
                    type="button"
                    onClick={() => addScene(act.id)}
                    className="text-sm text-primary hover:text-primary-light"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {act.scenes.map((scene) => (
                    <div key={scene.id} className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-secondary)]">Scene {scene.id}</span>
                      <input
                        type="text"
                        value={scene.name}
                        onChange={(e) => updateSceneName(act.id, scene.id, e.target.value)}
                        placeholder="Enter scene name"
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
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
                  setFormData({ 
                    ...formData, 
                    isTouringShow,
                    venues: isTouringShow ? [] : formData.venues.slice(0, 1)
                  });
                }}
                className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              />
              <span className="text-[var(--text-secondary)]">This is a touring show</span>
            </label>
          </div>

          {formData.isTouringShow ? (
            <VenueForm
              venues={formData.venues}
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
                value={formData.venues[0]?.name || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  venues: [{ ...formData.venues[0], name: e.target.value }]
                })}
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
                value={formData.stageManager}
                onChange={(e) => setFormData({ ...formData, stageManager: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter stage manager's name"
              />
              <input
                type="email"
                id="stageManagerEmail"
                required
                value={formData.stageManagerEmail}
                onChange={(e) => setFormData({ ...formData, stageManagerEmail: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter stage manager's email"
              />
              <input
                type="tel"
                id="stageManagerPhone"
                value={formData.stageManagerPhone}
                onChange={(e) => setFormData({ ...formData, stageManagerPhone: e.target.value })}
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
                value={formData.propsSupervisor}
                onChange={(e) => setFormData({ ...formData, propsSupervisor: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's name"
              />
              <input
                type="email"
                id="propsSupervisorEmail"
                required
                value={formData.propsSupervisorEmail}
                onChange={(e) => setFormData({ ...formData, propsSupervisorEmail: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter props supervisor's email"
              />
              <input
                type="tel"
                id="propsSupervisorPhone"
                value={formData.propsSupervisorPhone}
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
                value={formData.productionCompany}
                onChange={(e) => setFormData({ ...formData, productionCompany: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production company name"
              />
              <input
                type="text"
                id="productionContactName"
                required
                value={formData.productionContactName}
                onChange={(e) => setFormData({ ...formData, productionContactName: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact name"
              />
              <input
                type="email"
                id="productionContactEmail"
                required
                value={formData.productionContactEmail}
                onChange={(e) => setFormData({ ...formData, productionContactEmail: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact email"
              />
              <input
                type="tel"
                id="productionContactPhone"
                value={formData.productionContactPhone}
                onChange={(e) => setFormData({ ...formData, productionContactPhone: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="Enter production contact phone number (optional)"
              />
            </div>
          </div>

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