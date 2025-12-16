/**
 * Package Tracking Widget
 * 
 * Shows packages (pack lists) that are being shipped to/from venues, rehearsal rooms,
 * suppliers, makers, and other addresses associated with the show.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, MapPin, Calendar, ArrowRight, ArrowLeft, CheckCircle, Clock, AlertCircle, Edit2, X } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import type { DashboardWidgetProps } from './types';
import { useFirebase } from '../../contexts/FirebaseContext';
import { DigitalPackListService } from '../../../shared/services/inventory/packListService';
import { DigitalInventoryService } from '../../../shared/services/inventory/inventoryService';
import { PropQRCodeService } from '../../../shared/services/qr/qrService';
import type { PackList } from '../../../shared/services/inventory/packListService';
import type { Address } from '../../../shared/services/addressService';

interface PackageTrackingWidgetProps extends DashboardWidgetProps {
  showId?: string;
  show?: {
    venueIds?: string[];
    rehearsalAddressIds?: string[];
    storageAddressIds?: string[];
  };
}

interface PackageItem {
  packList: PackList;
  direction: 'incoming' | 'outgoing';
  addressId: string;
  addressName?: string;
  addressType?: string;
}

export const PackageTrackingWidget: React.FC<PackageTrackingWidgetProps> = ({
  showId,
  show,
}) => {
  const { service } = useFirebase();
  const [packLists, setPackLists] = useState<PackList[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    dispatchDate: '',
    shippedDate: '',
    expectedDeliveryDate: '',
    arrivedDate: '',
    dispatchTime: '',
    shippedTime: '',
    expectedDeliveryTime: '',
    arrivedTime: '',
    courierName: '',
    trackingNumber: '',
    lost: false,
  });

  // Fetch pack lists and addresses
  useEffect(() => {
    if (!showId || !service) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize services
        const qrService = new PropQRCodeService();
        const inventoryService = new DigitalInventoryService(service, null as any, qrService);
        const packListService = new DigitalPackListService(
          service,
          qrService,
          inventoryService,
          window.location.origin
        );

        // Fetch pack lists for this show
        const lists = await packListService.listPackLists({ showId });
        setPackLists(lists);

        // Fetch all addresses associated with the show
        // First, get addresses by showId
        const addressDocs = await service.getDocuments('addresses', {
          where: [['showId', '==', showId]]
        });
        
        // Also get addresses by type that might be associated with the show
        // (venues, rehearsal, suppliers, makers, storage)
        const addressTypes = ['theatre', 'rehearsal', 'workshop', 'maker', 'supplier', 'storage'];
        const allAddresses: Address[] = [];
        const addressIdSet = new Set<string>();
        
        // Add addresses from showId query
        addressDocs.forEach(doc => {
          const addr = { ...doc.data, id: doc.id } as Address;
          if (addr.id && !addressIdSet.has(addr.id)) {
            allAddresses.push(addr);
            addressIdSet.add(addr.id);
          }
        });

        // Also fetch by type to catch any addresses that might be shared
        for (const type of addressTypes) {
          try {
            const typeDocs = await service.getDocuments('addresses', {
              where: [['type', '==', type]]
            });
            typeDocs.forEach(doc => {
              const addr = { ...doc.data, id: doc.id } as Address;
              // Avoid duplicates
              if (addr.id && !addressIdSet.has(addr.id)) {
                allAddresses.push(addr);
                addressIdSet.add(addr.id);
              }
            });
          } catch (err) {
            console.warn(`Failed to fetch addresses of type ${type}:`, err);
          }
        }

        // Also fetch addresses by IDs from show if available
        if (show) {
          const showAddressIds = [
            ...(show.venueIds || []),
            ...(show.rehearsalAddressIds || []),
            ...(show.storageAddressIds || []),
          ];

          for (const addressId of showAddressIds) {
            if (addressId && !addressIdSet.has(addressId)) {
              try {
                const doc = await service.getDocument('addresses', addressId);
                if (doc && doc.data) {
                  const addr = { ...doc.data, id: doc.id } as Address;
                  allAddresses.push(addr);
                  addressIdSet.add(addr.id);
                }
              } catch (err) {
                console.warn(`Failed to fetch address ${addressId}:`, err);
              }
            }
          }
        }

        setAddresses(allAddresses);
      } catch (err) {
        console.error('Failed to fetch package tracking data:', err);
        setError('Failed to load package tracking data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showId, service, show]);

  // Filter and process packages
  const packages = useMemo(() => {
    if (!packLists.length || !addresses.length) return [];

    const addressIds = new Set(addresses.map(a => a.id));
    const packageItems: PackageItem[] = [];

    for (const packList of packLists) {
      if (!packList.shipping) continue;

      const { toAddress, fromAddress } = packList.shipping;

      // Check if package is incoming (toAddress matches show addresses)
      if (toAddress && addressIds.has(toAddress)) {
        const address = addresses.find(a => a.id === toAddress);
        packageItems.push({
          packList,
          direction: 'incoming',
          addressId: toAddress,
          addressName: address?.name || address?.company || 'Unknown Address',
          addressType: address?.type,
        });
      }

      // Check if package is outgoing (fromAddress matches show addresses)
      if (fromAddress && addressIds.has(fromAddress)) {
        const address = addresses.find(a => a.id === fromAddress);
        packageItems.push({
          packList,
          direction: 'outgoing',
          addressId: fromAddress,
          addressName: address?.name || address?.company || 'Unknown Address',
          addressType: address?.type,
        });
      }
    }

    // Sort by expected delivery date (soonest first, then by shipped date, then by dispatch date)
    return packageItems.sort((a, b) => {
      const getSortDate = (item: PackageItem) => {
        const shipping = item.packList.shipping;
        if (shipping?.expectedDeliveryDate) {
          return new Date(shipping.expectedDeliveryDate).getTime();
        }
        if (shipping?.shippedDate) {
          return new Date(shipping.shippedDate).getTime();
        }
        if (shipping?.dispatchDate) {
          return new Date(shipping.dispatchDate).getTime();
        }
        return 0;
      };

      return getSortDate(a) - getSortDate(b);
    });
  }, [packLists, addresses]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getPackageStatus = (item: PackageItem) => {
    const shipping = item.packList.shipping;
    
    // Check if package is marked as lost
    if ((shipping as any)?.lost) {
      return {
        label: 'Lost',
        icon: AlertCircle,
        color: 'text-red-500 bg-red-500/10 border-red-500/20',
      };
    }
    
    // Check if package is delayed (expected delivery date passed but not arrived)
    const expectedDeliveryDate = shipping?.expectedDeliveryDate;
    if (expectedDeliveryDate && !shipping?.arrivedDate) {
      const expectedDate = new Date(expectedDeliveryDate);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Consider delayed if more than 1 day past expected delivery
      if (diffDays > 1 && shipping?.shippedDate) {
        return {
          label: 'Delayed',
          icon: AlertCircle,
          color: 'text-red-500 bg-red-500/10 border-red-500/20',
        };
      }
    }
    
    if (shipping?.arrivedDate) {
      return {
        label: 'Arrived',
        icon: CheckCircle,
        color: 'text-green-500 bg-green-500/10 border-green-500/20',
      };
    }
    
    if (shipping?.shippedDate) {
      return {
        label: 'In Transit',
        icon: Truck,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      };
    }
    
    if (shipping?.dispatchDate) {
      return {
        label: 'Dispatched',
        icon: Clock,
        color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      };
    }
    
    return {
      label: 'Pending',
      icon: Clock,
      color: 'text-pb-gray bg-pb-darker border-pb-primary/20',
    };
  };

  const getDeliveryDate = (item: PackageItem) => {
    const shipping = item.packList.shipping;
    return shipping?.expectedDeliveryDate || shipping?.shippedDate || shipping?.dispatchDate;
  };

  const getStatusPriority = (item: PackageItem) => {
    const shipping = item.packList.shipping;
    const deliveryDate = getDeliveryDate(item);
    
    if (shipping?.arrivedDate) return 0; // Arrived - lowest priority
    if (!deliveryDate) return 1; // No date - low priority
    
    const date = new Date(deliveryDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 2; // Overdue - high priority
    if (diffDays <= 3) return 3; // Due soon - highest priority
    if (diffDays <= 7) return 4; // Due this week - medium-high priority
    return 5; // Future - medium priority
  };

  // Sort by priority (overdue and due soon first)
  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => {
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // If same priority, sort by date
      const dateA = getDeliveryDate(a);
      const dateB = getDeliveryDate(b);
      if (dateA && dateB) {
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
      return 0;
    });
  }, [packages]);

  const incomingCount = packages.filter(p => p.direction === 'incoming').length;
  const outgoingCount = packages.filter(p => p.direction === 'outgoing').length;
  const overdueCount = packages.filter(p => {
    const status = getPackageStatus(p);
    return status.label === 'Delayed' || status.label === 'Lost';
  }).length;

  // Helper to convert ISO date to local date string for input
  const isoToLocalDate = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to convert ISO date to local time string for input
  const isoToLocalTime = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper to combine date and time into ISO string
  const combineDateAndTime = (dateStr: string, timeStr: string): string | undefined => {
    if (!dateStr) return undefined;
    if (!timeStr) {
      // If no time, set to start of day
      return new Date(dateStr + 'T00:00:00').toISOString();
    }
    return new Date(dateStr + 'T' + timeStr + ':00').toISOString();
  };

  // Initialize pack list service
  const getPackListService = () => {
    const qrService = new PropQRCodeService();
    const inventoryService = new DigitalInventoryService(service, null as any, qrService);
    return new DigitalPackListService(
      service,
      qrService,
      inventoryService,
      window.location.origin
    );
  };

  // Refresh data
  const refreshData = async () => {
    if (!showId || !service) return;
    try {
      const packListService = getPackListService();
      const lists = await packListService.listPackLists({ showId });
      setPackLists(lists);
    } catch (err) {
      console.error('Failed to refresh package data:', err);
    }
  };

  // Quick action: Mark as Shipped
  const handleMarkAsShipped = async (item: PackageItem) => {
    if (!service) return;
    setUpdating(true);
    try {
      const packListService = getPackListService();
      const now = new Date().toISOString();
      const shipping = {
        ...item.packList.shipping,
        shippedDate: now,
      };
      await packListService.updatePackList(item.packList.id, { shipping } as any);
      await refreshData();
    } catch (err) {
      console.error('Failed to update package status:', err);
      setError('Failed to update package status');
    } finally {
      setUpdating(false);
    }
  };

  // Quick action: Mark as Arrived
  const handleMarkAsArrived = async (item: PackageItem) => {
    if (!service) return;
    setUpdating(true);
    try {
      const packListService = getPackListService();
      const now = new Date().toISOString();
      const shipping = {
        ...item.packList.shipping,
        arrivedDate: now,
        // If not shipped yet, also set shipped date
        shippedDate: item.packList.shipping?.shippedDate || now,
        lost: false, // Clear lost status when arrived
      };
      await packListService.updatePackList(item.packList.id, { shipping } as any);
      await refreshData();
    } catch (err) {
      console.error('Failed to update package status:', err);
      setError('Failed to update package status');
    } finally {
      setUpdating(false);
    }
  };

  // Quick action: Mark as Lost
  const handleMarkAsLost = async (item: PackageItem) => {
    if (!service) return;
    setUpdating(true);
    try {
      const packListService = getPackListService();
      const shipping = {
        ...item.packList.shipping,
        lost: true,
      };
      await packListService.updatePackList(item.packList.id, { shipping } as any);
      await refreshData();
    } catch (err) {
      console.error('Failed to mark package as lost:', err);
      setError('Failed to mark package as lost');
    } finally {
      setUpdating(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (item: PackageItem) => {
    const shipping = item.packList.shipping || {};
    setEditForm({
      dispatchDate: isoToLocalDate(shipping.dispatchDate),
      shippedDate: isoToLocalDate(shipping.shippedDate),
      expectedDeliveryDate: isoToLocalDate(shipping.expectedDeliveryDate),
      arrivedDate: isoToLocalDate(shipping.arrivedDate),
      dispatchTime: isoToLocalTime(shipping.dispatchDate),
      shippedTime: isoToLocalTime(shipping.shippedDate),
      expectedDeliveryTime: isoToLocalTime(shipping.expectedDeliveryDate),
      arrivedTime: isoToLocalTime(shipping.arrivedDate),
      courierName: shipping.courierName || '',
      trackingNumber: shipping.trackingNumber || '',
      lost: (shipping as any)?.lost || false,
    });
    setEditingPackage(item);
  };

  // Save edits
  const handleSaveEdit = async () => {
    if (!editingPackage || !service) return;
    setUpdating(true);
    try {
      const packListService = getPackListService();
      const shipping = {
        ...editingPackage.packList.shipping,
        dispatchDate: combineDateAndTime(editForm.dispatchDate, editForm.dispatchTime),
        shippedDate: combineDateAndTime(editForm.shippedDate, editForm.shippedTime),
        expectedDeliveryDate: combineDateAndTime(editForm.expectedDeliveryDate, editForm.expectedDeliveryTime),
        arrivedDate: combineDateAndTime(editForm.arrivedDate, editForm.arrivedTime),
        courierName: editForm.courierName || undefined,
        trackingNumber: editForm.trackingNumber || undefined,
        lost: editForm.lost || undefined,
      };
      // If marked as arrived, clear lost status
      if (editForm.arrivedDate) {
        (shipping as any).lost = false;
      }
      await packListService.updatePackList(editingPackage.packList.id, { shipping } as any);
      await refreshData();
      setEditingPackage(null);
    } catch (err) {
      console.error('Failed to update package:', err);
      setError('Failed to update package');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <WidgetContainer
        title="Package Tracking"
        icon={<Package className="w-5 h-5" />}
        className="h-full"
        loading={true}
      />
    );
  }

  if (error) {
    return (
      <WidgetContainer
        title="Package Tracking"
        icon={<Package className="w-5 h-5" />}
        className="h-full"
        error={error}
      />
    );
  }

  if (sortedPackages.length === 0) {
    return (
      <WidgetContainer
        title="Package Tracking"
        icon={<Package className="w-5 h-5" />}
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center h-full py-8 text-pb-gray">
          <Package className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No packages in transit</p>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title="Package Tracking"
      icon={<Package className="w-5 h-5" />}
      className="h-full"
      headerActions={
        <Link
          to="/packing"
          className="text-xs text-pb-primary hover:text-pb-primary-light transition-colors"
        >
          View All
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-pb-gray">Total:</span>
            <span className="font-medium text-pb-primary">{sortedPackages.length}</span>
          </div>
          {incomingCount > 0 && (
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-green-500" />
              <span className="text-pb-gray">Incoming:</span>
              <span className="font-medium text-green-500">{incomingCount}</span>
            </div>
          )}
          {outgoingCount > 0 && (
            <div className="flex items-center gap-1">
              <ArrowLeft className="w-3 h-3 text-orange-500" />
              <span className="text-pb-gray">Outgoing:</span>
              <span className="font-medium text-orange-500">{outgoingCount}</span>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-pb-gray">Overdue:</span>
              <span className="font-medium text-red-500">{overdueCount}</span>
            </div>
          )}
        </div>

        {/* Packages List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {sortedPackages.slice(0, 10).map((item) => {
            const status = getPackageStatus(item);
            const StatusIcon = status.icon;
            const deliveryDate = getDeliveryDate(item);
            const isOverdue = deliveryDate && new Date(deliveryDate).getTime() < new Date().getTime() && !item.packList.shipping?.arrivedDate;

            const hasArrived = !!item.packList.shipping?.arrivedDate;
            const hasShipped = !!item.packList.shipping?.shippedDate;
            const isLost = !!(item.packList.shipping as any)?.lost;
            const isDelayedOrLost = status.label === 'Delayed' || status.label === 'Lost';

            return (
              <div
                key={`${item.packList.id}-${item.direction}-${item.addressId}`}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors group ${
                  isDelayedOrLost 
                    ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50' 
                    : 'bg-pb-darker border-pb-primary/10 hover:border-pb-primary/30'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {item.direction === 'incoming' ? (
                    <ArrowRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowLeft className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link
                      to={`/packing/${item.packList.id}`}
                      className="font-medium text-pb-primary hover:text-pb-primary-light transition-colors truncate flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.packList.name || 'Unnamed Package'}
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!hasArrived && !isLost && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkAsArrived(item);
                          }}
                          disabled={updating}
                          className="p-1.5 text-green-500 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
                          title="Mark as Arrived"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {!hasShipped && !hasArrived && !isLost && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkAsShipped(item);
                          }}
                          disabled={updating}
                          className="p-1.5 text-blue-500 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50"
                          title="Mark as Shipped"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                      {!hasArrived && !isLost && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkAsLost(item);
                          }}
                          disabled={updating}
                          className="p-1.5 text-red-500 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                          title="Mark as Lost"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        disabled={updating}
                        className="p-1.5 text-pb-primary hover:bg-pb-primary/20 rounded transition-colors disabled:opacity-50"
                        title="Edit Tracking Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{status.label}</span>
                    </div>
                    {deliveryDate && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                        isOverdue 
                          ? 'text-red-500 bg-red-500/10 border-red-500/20' 
                          : 'text-pb-gray bg-pb-darker border-pb-primary/20'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(deliveryDate)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-pb-gray">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">
                      {item.direction === 'incoming' ? 'To: ' : 'From: '}
                      {item.addressName}
                      {item.addressType && ` (${item.addressType})`}
                    </span>
                  </div>
                  {item.packList.shipping?.courierName && (
                    <div className="mt-1 text-xs text-pb-gray">
                      via {item.packList.shipping.courierName}
                      {item.packList.shipping.trackingNumber && ` - ${item.packList.shipping.trackingNumber}`}
                    </div>
                  )}
                  {item.packList.containers && item.packList.containers.length > 0 && (
                    <div className="mt-1 text-xs text-pb-gray">
                      {item.packList.containers.length} container{item.packList.containers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sortedPackages.length > 10 && (
          <div className="pt-2 border-t border-pb-primary/10">
            <Link
              to="/packing"
              className="text-xs text-pb-primary hover:text-pb-primary-light transition-colors flex items-center gap-1"
            >
              View {sortedPackages.length - 10} more
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPackage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !updating && setEditingPackage(null)}>
          <div 
            className="bg-pb-darker/90 border border-pb-primary/30 rounded-xl shadow-xl max-w-2xl w-full mx-4 md:mx-auto overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Edit Tracking Details
                </h3>
                <button
                  onClick={() => setEditingPackage(null)}
                  disabled={updating}
                  className="p-2 text-pb-gray hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">
                    {editingPackage.packList.name || 'Unnamed Package'}
                  </h4>
                  <p className="text-xs text-pb-gray">
                    {editingPackage.direction === 'incoming' ? 'Incoming' : 'Outgoing'} to {editingPackage.addressName}
                  </p>
                </div>

                {/* Date and Time Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Dispatch Date</label>
                    <input
                      type="date"
                      value={editForm.dispatchDate}
                      onChange={(e) => setEditForm({ ...editForm, dispatchDate: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Dispatch Time</label>
                    <input
                      type="time"
                      value={editForm.dispatchTime}
                      onChange={(e) => setEditForm({ ...editForm, dispatchTime: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Shipped Date</label>
                    <input
                      type="date"
                      value={editForm.shippedDate}
                      onChange={(e) => setEditForm({ ...editForm, shippedDate: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Shipped Time</label>
                    <input
                      type="time"
                      value={editForm.shippedTime}
                      onChange={(e) => setEditForm({ ...editForm, shippedTime: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={editForm.expectedDeliveryDate}
                      onChange={(e) => setEditForm({ ...editForm, expectedDeliveryDate: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Expected Delivery Time</label>
                    <input
                      type="time"
                      value={editForm.expectedDeliveryTime}
                      onChange={(e) => setEditForm({ ...editForm, expectedDeliveryTime: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Arrived Date</label>
                    <input
                      type="date"
                      value={editForm.arrivedDate}
                      onChange={(e) => setEditForm({ ...editForm, arrivedDate: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Arrived Time</label>
                    <input
                      type="time"
                      value={editForm.arrivedTime}
                      onChange={(e) => setEditForm({ ...editForm, arrivedTime: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Courier and Tracking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Courier Name</label>
                    <input
                      type="text"
                      value={editForm.courierName}
                      onChange={(e) => setEditForm({ ...editForm, courierName: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                      placeholder="e.g., DHL, FedEx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Tracking Number</label>
                    <input
                      type="text"
                      value={editForm.trackingNumber}
                      onChange={(e) => setEditForm({ ...editForm, trackingNumber: e.target.value })}
                      disabled={updating}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50"
                      placeholder="Enter tracking number"
                    />
                  </div>
                </div>

                {/* Lost Status */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.lost}
                      onChange={(e) => setEditForm({ ...editForm, lost: e.target.checked })}
                      disabled={updating || !!editForm.arrivedDate}
                      className="w-4 h-4 text-red-500 focus:ring-red-500 rounded border-white/20 bg-pb-darker/60"
                    />
                    <span className="text-sm text-white">Mark as Lost</span>
                  </label>
                  {editForm.arrivedDate && (
                    <p className="text-xs text-pb-gray/70 mt-1 ml-6">
                      Cannot mark as lost if package has arrived
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-pb-primary/20">
                  <button
                    onClick={() => setEditingPackage(null)}
                    disabled={updating}
                    className="px-4 py-2 text-pb-gray hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updating}
                    className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

