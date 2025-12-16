import React, { useState, useEffect } from 'react';
import { Courier, CourierService } from '../../../shared/services/courierService';
import { FirebaseService } from '../../../shared/services/firebase/types';
import { Plus, X } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';

interface CourierSelectorProps {
  value: string; // Courier name string
  onChange: (courierName: string) => void;
  disabled?: boolean;
  service: FirebaseService;
  userId?: string; // Optional user ID for creating couriers
}

const CourierSelector: React.FC<CourierSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  service,
  userId,
}) => {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierIsTheater, setNewCourierIsTheater] = useState(false);
  const [addingCourier, setAddingCourier] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load couriers and seed defaults if empty
  useEffect(() => {
    const loadCouriers = async () => {
      setLoading(true);
      try {
        const courierService = new CourierService(service);
        let courierList = await courierService.listCouriers();
        
        // If no couriers exist, seed the database with default couriers
        if (courierList.length === 0) {
          await courierService.seedDefaultCouriers(userId);
          courierList = await courierService.listCouriers();
        }
        
        setCouriers(courierList);
      } catch (err) {
        console.error('Failed to load couriers:', err);
        setError('Failed to load couriers');
      } finally {
        setLoading(false);
      }
    };
    loadCouriers();
  }, [service, userId]);

  const handleAddCourier = async () => {
    if (!newCourierName.trim()) {
      setError('Courier name is required');
      return;
    }

    // Check if courier already exists
    const existing = couriers.find(c => c.name.toLowerCase() === newCourierName.trim().toLowerCase());
    if (existing) {
      setError('A courier with this name already exists');
      return;
    }

    setAddingCourier(true);
    setError(null);
    try {
      const courierService = new CourierService(service);
      const courierId = await courierService.createCourier({
        name: newCourierName.trim(),
        isTheaterSpecialist: newCourierIsTheater,
        metadata: {
          createdBy: userId || 'user',
          updatedBy: userId || 'user',
        },
      });
      
      // Reload couriers
      const courierList = await courierService.listCouriers();
      setCouriers(courierList);
      
      // Select the newly created courier
      const newCourier = courierList.find(c => c.id === courierId);
      if (newCourier) {
        onChange(newCourier.name);
      }
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewCourierName('');
      setNewCourierIsTheater(false);
    } catch (err) {
      console.error('Failed to add courier:', err);
      setError('Failed to add courier. Please try again.');
    } finally {
      setAddingCourier(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewCourierName('');
    setNewCourierIsTheater(false);
    setError(null);
  };

  // Separate couriers into mainstream and theater specialist
  const mainstreamCouriers = couriers.filter(c => !c.isTheaterSpecialist);
  const theaterCouriers = couriers.filter(c => c.isTheaterSpecialist);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-white">Courier Name</label>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={disabled || loading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-pb-primary hover:text-pb-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add new courier"
          >
            <Plus className="w-3 h-3" />
            Add Courier
          </button>
        </div>

        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || loading}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-8"
          >
            <option value="" className="bg-pb-darker text-white">Select courier...</option>
            
            {mainstreamCouriers.length > 0 && (
              <optgroup label="Mainstream Couriers" className="bg-pb-darker text-white">
                {mainstreamCouriers.map((courier) => (
                  <option key={courier.id} value={courier.name} className="bg-pb-darker text-white">
                    {courier.name}
                  </option>
                ))}
              </optgroup>
            )}
            
            {theaterCouriers.length > 0 && (
              <optgroup label="Theater Specialist Couriers" className="bg-pb-darker text-white">
                {theaterCouriers.map((courier) => (
                  <option key={courier.id} value={courier.name} className="bg-pb-darker text-white">
                    {courier.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-pb-gray/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Allow manual entry if courier not in list */}
        {value && !couriers.find(c => c.name === value) && (
          <div className="text-xs text-pb-gray/70 italic">
            Custom courier: {value}
          </div>
        )}

        {loading && (
          <div className="text-xs text-pb-gray/70">Loading couriers...</div>
        )}
      </div>

      {/* Add Courier Modal */}
      <ConfirmationModal
        isOpen={showAddModal}
        title="Add New Courier"
        message={
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Courier Name *</label>
              <input
                type="text"
                value={newCourierName}
                onChange={(e) => {
                  setNewCourierName(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                placeholder="e.g., DHL, FedEx, Theater Express"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !addingCourier) {
                    e.preventDefault();
                    handleAddCourier();
                  }
                }}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCourierIsTheater}
                  onChange={(e) => setNewCourierIsTheater(e.target.checked)}
                  className="w-4 h-4 text-pb-primary focus:ring-pb-primary"
                />
                <span className="text-sm text-white">Theater Specialist Courier</span>
              </label>
              <p className="text-xs text-pb-gray/70 mt-1 ml-6">
                Check this if this is a specialist theater courier
              </p>
            </div>
            {error && (
              <div className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        }
        confirmText="Add Courier"
        cancelText="Cancel"
        onConfirm={handleAddCourier}
        onCancel={handleCancelAdd}
        isLoading={addingCourier}
      />
    </>
  );
};

export default CourierSelector;

