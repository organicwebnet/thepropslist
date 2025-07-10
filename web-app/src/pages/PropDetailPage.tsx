import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { Prop } from '../../shared/types/props';
import { ArrowLeft, Pencil } from 'lucide-react';

function formatDate(value: any): string {
  if (!value) return 'N/A';
  if (typeof value === 'object' && value.seconds) {
    try {
      if (typeof value.toDate === 'function') {
        return value.toDate().toLocaleString();
      }
      return new Date(value.seconds * 1000).toLocaleString();
    } catch {
      return JSON.stringify(value);
    }
  }
  if (typeof value === 'string') return value;
  return String(value);
}

const PropDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    firebaseService.getDocument('props', id)
      .then(doc => {
        setProp(doc?.data as Prop || null);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load prop.');
        setLoading(false);
      });
  }, [id, firebaseService]);

  if (loading) return <DashboardLayout><div className="text-center text-pb-primary py-16">Loading prop...</div></DashboardLayout>;
  if (error || !prop) return <DashboardLayout><div className="text-center text-red-500 py-16">{error || 'Prop not found.'}</div></DashboardLayout>;

  const mainImage = prop.images?.find(img => img.isMain)?.url || prop.images?.[0]?.url || prop.imageUrl || '';

  const handleEdit = () => {
    if (id) navigate(`/props/${id}/edit`);
  };

  const renderField = (label: string, value: any, isDate = false) => (
    <div className="mb-2">
      <span className="font-semibold text-pb-primary">{label}:</span>{' '}
      <span className="text-white">{isDate ? formatDate(value) : (value ?? 'N/A')}</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-pb-primary hover:text-pb-accent">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-pb-darker/60 rounded-xl shadow-lg p-8 space-y-8 relative">
          {/* Edit Icon Button */}
          <button
            onClick={handleEdit}
            className="absolute top-4 right-4 bg-pb-primary hover:bg-pb-accent text-white rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-pb-primary transition"
            aria-label="Edit Prop"
            title="Edit Prop"
          >
            <Pencil className="w-5 h-5" />
          </button>
          {/* Header & Main Info */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0 w-48 h-48 rounded-lg overflow-hidden bg-pb-gray flex items-center justify-center">
              {mainImage ? (
                <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-pb-light/60">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white mb-2">{prop.name}</h1>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pb-primary/30 text-white">{prop.category}</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pb-accent/30 text-white">Qty: {prop.quantity}</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pb-gray text-white">{prop.status}</span>
              </div>
              {prop.description && <p className="text-pb-gray mb-4 whitespace-pre-line">{prop.description}</p>}
            </div>
          </div>
          {/* Gallery under main image */}
          {prop.images && prop.images.length > 1 && (
            <div className="mt-4 flex flex-col items-start">
              <div className="font-semibold text-pb-primary mb-2">Gallery</div>
              <div className="flex gap-2 flex-wrap">
                {prop.images.filter(img => !img.isMain && img.url !== mainImage).map(img => (
                  <img key={img.id} src={img.url} alt={img.caption || prop.name} className="w-20 h-20 object-cover rounded border border-pb-primary/30" />
                ))}
              </div>
            </div>
          )}
          {/* Assignment & Show Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Show', prop.showId)}
            {renderField('Act', prop.act)}
            {renderField('Scene', prop.sceneName || prop.scene)}
            {renderField('Location', prop.location || prop.currentLocation)}
            {renderField('Assignment', prop.assignment?.name || prop.assignment?.id)}
            {renderField('Checked Out To', prop.checkedOutDetails?.to)}
            {renderField('Checked Out At', prop.checkedOutDetails?.checkedOutAt, true)}
            {renderField('Expected Return', prop.checkedOutDetails?.expectedReturnAt, true)}
          </div>
          {/* Physical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Dimensions', (prop.length || prop.width || prop.height) ? `${prop.length || ''} x ${prop.width || ''} x ${prop.height || ''} ${prop.unit || ''}` : 'N/A')}
            {renderField('Depth', prop.depth)}
            {renderField('Weight', prop.weight ? `${prop.weight} ${prop.weightUnit || ''}` : 'N/A')}
            {renderField('Travel Weight', prop.travelWeight)}
            {renderField('Materials', prop.materials?.join(', '))}
            {renderField('Color', prop.color)}
            {renderField('Period', prop.period)}
            {renderField('Style', prop.style)}
            {renderField('Handedness', prop.handedness)}
            {renderField('Breakable', prop.isBreakable ? 'Yes' : 'No')}
            {renderField('Hazardous', prop.isHazardous ? 'Yes' : 'No')}
          </div>
          {/* Purchase & Rental */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Price', prop.price ? `£${prop.price}` : 'N/A')}
            {renderField('Source', prop.source)}
            {renderField('Source Details', prop.sourceDetails)}
            {renderField('Purchase URL', prop.purchaseUrl ? <a href={prop.purchaseUrl} className="text-pb-accent underline" target="_blank" rel="noopener noreferrer">{prop.purchaseUrl}</a> : 'N/A')}
            {renderField('Purchase Date', prop.purchaseDate, true)}
            {renderField('Rental Source', prop.rentalSource)}
            {renderField('Rental Due Date', prop.rentalDueDate, true)}
            {renderField('Rental Reference', prop.rentalReferenceNumber)}
            {renderField('Rental Info', 'N/A')}
          </div>
          {/* Manufacturer & Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Manufacturer', prop.manufacturer)}
            {renderField('Model', prop.model)}
            {renderField('Serial Number', prop.serialNumber)}
            {renderField('Barcode', prop.barcode)}
            {renderField('Warranty', prop.warranty ? JSON.stringify(prop.warranty) : 'N/A')}
          </div>
          {/* Usage, Handling, Safety */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Usage Instructions', prop.usageInstructions)}
            {renderField('Handling Instructions', prop.handlingInstructions)}
            {renderField('Safety Notes', prop.safetyNotes)}
            {renderField('Pre-Show Setup', prop.preShowSetupNotes)}
            {renderField('Pre-Show Setup Video', prop.preShowSetupVideo)}
            {renderField('Pre-Show Setup Duration', prop.preShowSetupDuration)}
            {renderField('Shipping Crate', prop.hasOwnShippingCrate ? 'Yes' : 'No')}
            {renderField('Shipping Crate Details', prop.shippingCrateDetails)}
            {renderField('Transport Notes', prop.transportNotes)}
            {renderField('Requires Special Transport', prop.requiresSpecialTransport ? 'Yes' : 'No')}
            {renderField('Transport Method', prop.transportMethod)}
          </div>
          {/* Status & Lifecycle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Status', prop.status)}
            {renderField('Status Notes', prop.statusNotes)}
            {renderField('Last Status Update', prop.lastStatusUpdate, true)}
            {renderField('Condition', prop.condition)}
            {renderField('Last Used At', prop.lastUsedAt, true)}
            {renderField('Last Modified At', prop.lastModifiedAt, true)}
            {renderField('Created At', prop.createdAt, true)}
            {renderField('Updated At', prop.updatedAt, true)}
            {renderField('Subcategory', prop.subcategory)}
            {renderField('Tags', prop.tags?.join(', '))}
          </div>
          {/* Maintenance & Inspection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Maintenance Notes', prop.maintenanceNotes)}
            {renderField('Last Maintenance Date', prop.lastMaintenanceDate, true)}
            {renderField('Next Maintenance Due', prop.nextMaintenanceDue, true)}
            {renderField('Last Inspection Date', prop.lastInspectionDate, true)}
            {renderField('Next Inspection Due', prop.nextInspectionDue, true)}
            {renderField('Repair Estimate', prop.repairEstimate)}
            {renderField('Repair Priority', prop.repairPriority)}
            {renderField('Assigned To', prop.assignedUserDetails?.map(u => u.name).join(', ') || prop.assignedTo?.join(', '))}
            {renderField('Maintenance History', prop.maintenanceHistory ? JSON.stringify(prop.maintenanceHistory) : 'N/A')}
            {renderField('Status History', prop.statusHistory ? JSON.stringify(prop.statusHistory) : 'N/A')}
          </div>
          {/* Storage & Logistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Storage Requirements', prop.storageRequirements)}
            {renderField('Return Due Date', prop.returnDueDate, true)}
            {renderField('Expected Return Date', prop.expectedReturnDate, true)}
            {renderField('Replacement Cost', prop.replacementCost)}
            {renderField('Replacement Lead Time', prop.replacementLeadTime)}
            {renderField('Travels Unboxed', prop.travelsUnboxed ? 'Yes' : 'No')}
            {renderField('Courier', prop.courier)}
            {renderField('Tracking Number', prop.trackingNumber)}
          </div>
          {/* Digital Assets & Media */}
          <div className="space-y-2">
            <div className="font-semibold text-pb-primary mb-2">Digital Assets</div>
            {prop.digitalAssets && prop.digitalAssets.length > 0 ? (
              <ul className="space-y-2">
                {prop.digitalAssets.map(asset => (
                  <li key={asset.id} className="flex items-center gap-2">
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-pb-accent hover:underline font-medium">{asset.name || asset.title || asset.url}</a>
                    <span className="text-xs text-pb-gray">[{asset.type}]</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-pb-gray">N/A</div>}
            {prop.videos && prop.videos.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold text-pb-primary mb-2">Videos</div>
                <ul className="space-y-2">
                  {prop.videos.map(video => (
                    <li key={video.id} className="flex items-center gap-2">
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-pb-accent hover:underline font-medium">{video.name || video.title || video.url}</a>
                      <span className="text-xs text-pb-gray">[{video.type}]</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {/* Notes & Custom Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pb-darker/40 rounded-lg p-4">
            {renderField('Notes', prop.notes)}
            {renderField('Public Notes', prop.publicNotes)}
            {renderField('Custom Fields', prop.customFields ? JSON.stringify(prop.customFields) : 'N/A')}
            {renderField('Scene Notes', prop.sceneNotes)}
            {renderField('Usage Notes', prop.usageNotes)}
            {renderField('Modification Details', prop.modificationDetails)}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default PropDetailPage; 