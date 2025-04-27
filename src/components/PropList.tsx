import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Package, Trash2, Theater, Edit, AlertTriangle, Calendar, FileText, Share2, ChevronsUp, Activity, HelpCircle } from 'lucide-react';
import type { PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, DimensionUnit } from '../shared/types/props';
import type { Show } from 'src/types'; 
import { Prop } from '@/shared/types/props'; 
import type { Filters } from '../types'; 
import { lifecycleStatusLabels, lifecycleStatusPriority, PropLifecycleStatus, StatusPriority } from '@/types/lifecycle';
import { ExportToolbar } from './ExportToolbar';
import { SearchBar } from './SearchBar';
import { PropFilters } from './PropFilters';
import { HelpTooltip } from './HelpTooltip';

interface PropListProps {
  props: Prop[];
  onDelete?: (id: string) => Promise<void>;
  onUpdatePrice?: (id: string, newPrice: number) => Promise<void>;
  onEdit?: (id: string, formData: PropFormData) => Promise<void>;
  onCategoryClick?: (category: string) => void;
  onShare?: (show: Show) => void;
  onSelect?: (show: Show) => void;
  show: Show;
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onFilterReset: () => void;
}

export function PropList({ 
  props, 
  onDelete, 
  onUpdatePrice, 
  onEdit, 
  onCategoryClick, 
  onShare, 
  onSelect, 
  show,
  filters,
  onFilterChange,
  onFilterReset
}: PropListProps) {
  const router = useRouter();
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sortField, setSortField] = useState<keyof Prop | 'statusPriority'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Default items per page

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      setShowScrollTop(target.scrollTop > 300);
    };

    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (listElement) {
        listElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    listRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onDelete && confirm('Are you sure you want to delete this prop?')) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('Error deleting prop:', error);
        alert('Failed to delete prop. Please try again.');
      }
    }
  };

  const handleMergeProps = async (original: Prop, duplicate: Prop) => {
    if (!onEdit) return;

    try {
      // Create merged prop data
      const mergedData: PropFormData = {
        ...original,
        quantity: original.quantity + duplicate.quantity,
        // If the props are used in different acts/scenes, mark as multi-scene
        isMultiScene: original.act !== duplicate.act || original.scene !== duplicate.scene
      };

      // Update the original prop with merged data
      await onEdit(original.id, mergedData);
      
      // Delete the duplicate
      if (onDelete) {
        await onDelete(duplicate.id);
      }
    } catch (error) {
      console.error('Error merging props:', error);
      alert('Failed to merge props. Please try again.');
    }
  };

  const handleEditProp = async (propId: string, updates: Partial<Prop>) => {
    if (!onEdit) return;
    // Convert Partial<Prop> to PropFormData by ensuring required fields are present
    const prop = props.find(p => p.id === propId);
    if (!prop) return;
    
    await onEdit(propId, {
      ...prop,
      ...updates,
      // Ensure required fields are present
      name: updates.name || prop.name,
      act: updates.act || prop.act,
      scene: updates.scene || prop.scene,
      category: updates.category || prop.category,
      price: updates.price || prop.price,
      quantity: updates.quantity || prop.quantity
    });
  };

  const getStatusSortValue = useCallback((status: PropLifecycleStatus | undefined): number => {
    if (!status) return 99; // Handle undefined status
    // Ensure the return value is a number
    const priorityMap: Record<StatusPriority, number> = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4 };
    const priority = lifecycleStatusPriority[status as PropLifecycleStatus]; // Cast status
    return priorityMap[priority] ?? 99;
  }, []);

  const getStatusColor = useCallback((status: string | undefined): string => {
    if (!status) return 'bg-gray-700';
    // Cast status to PropLifecycleStatus for safe indexing
    const priority = lifecycleStatusPriority[status as PropLifecycleStatus] || 'info';
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-green-500/20 text-green-400'; // info
    }
  }, []); // lifecycleStatusPriority is constant

  const getStatusLabel = useCallback((status: string | undefined): string => {
    if (!status) return 'Unknown';
    // Cast status to PropLifecycleStatus for safe indexing
    return lifecycleStatusLabels[status as PropLifecycleStatus] || status;
  }, []); // lifecycleStatusLabels is constant

  const sortedProps = useMemo(() => {
    if (!props || props.length === 0) return [];
    const sorted = [...props].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === 'statusPriority') {
        aValue = getStatusSortValue(a.status);
        bValue = getStatusSortValue(b.status);
      } else {
        aValue = a[sortField as keyof Prop];
        bValue = b[sortField as keyof Prop];
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });
    return sorted; // Ensure sortedProps returns the array
  }, [props, sortField, sortDirection]);

  const paginatedProps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    // Now sortedProps should be an array
    return sortedProps.slice(startIndex, endIndex);
  }, [sortedProps, currentPage, itemsPerPage]);

  const handleSort = (field: keyof Prop | 'statusPriority') => {
    const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1); // Reset to first page on sort
  };

  return (
    <div className="space-y-4 overflow-x-hidden" ref={listRef}>
      <div className="bg-[var(--bg-secondary)] sm:sticky sm:top-0 z-10">
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              {show.imageUrl ? (
                <img
                  src={show.imageUrl}
                  alt={`${show.name} logo`}
                  className="w-14 h-14 flex-shrink-0 rounded-lg object-cover border border-[var(--border-color)]"
                />
              ) : (
                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center show-initial-container">
                  <span className="text-2xl font-semibold text-[var(--text-secondary)]">
                    {show.name[0]}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h2 
                  className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] cursor-pointer hover:text-[var(--highlight-color)] transition-colors line-clamp-2 break-words"
                  onClick={() => router.push(`/shows/${show.id}` as any)}
                >
                  {show.name}
                </h2>
                <p className="text-[var(--text-secondary)] mt-1">
                  {props.length} Props • {props.reduce((sum, prop) => sum + (prop.quantity || 1), 0)} Total Items
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="w-full max-w-[300px]">
                <SearchBar 
                  value={filters.search}
                  onChange={(value) => onFilterChange({ ...filters, search: value })}
                />
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <PropFilters
                filters={filters}
                onChange={onFilterChange}
                onReset={onFilterReset}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 sm:mt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProps.map((prop: Prop) => (
            <div
              key={prop.id}
              className="bg-[var(--input-bg)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden flex flex-col cursor-pointer transform transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              onClick={() => router.push(`/shows/${show.id}/props/${prop.id}` as any)}
            >
              <div className="flex flex-col sm:hidden">
                <div className="relative w-full aspect-video bg-[var(--bg-primary)]">
                  {prop.images && prop.images.length > 0 ? (
                    <>
                      <img
                        src={prop.images[currentImageIndices[prop.id] || 0].url}
                        alt={prop.name}
                        className="w-full h-full object-cover"
                      />
                      {prop.images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {prop.images.map((_: PropImage, index: number) => (
                            <div 
                              key={index}
                              className={`w-1.5 h-1.5 rounded-full ${index === (currentImageIndices[prop.id] || 0) ? 'bg-white' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                          {prop.name}
                        </h3>
                        {prop.quantity > 1 && (
                          <span className="text-sm text-[var(--text-secondary)]">
                            (Qty: {prop.quantity})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Theater className="h-4 w-4 text-[var(--highlight-color)]" />
                        <span className="text-sm font-medium text-[var(--highlight-color)]">
                          Act {prop.act}, Scene {prop.scene}
                          {prop.sceneName && ` - ${prop.sceneName}`}
                        </span>
                        <span 
                          className="px-2 py-0.5 text-sm bg-[var(--highlight-bg)] text-[var(--highlight-color)] rounded cursor-pointer hover:bg-[var(--highlight-bg)]/80"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCategoryClick?.(prop.category);
                          }}
                        >
                          {prop.category}
                        </span>
                        {prop.status && prop.status !== 'confirmed' && (
                          <span className={`px-2 py-0.5 text-sm rounded flex items-center gap-1 ${getStatusColor(prop.status)}`}>
                            <Activity className="h-3 w-3" />
                            {lifecycleStatusLabels[prop.status]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(`Navigating to edit form for prop ${prop.id}`);
                          router.push(`/props/${prop.id}?edit=true` as any);
                        }}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--highlight-color)] transition-colors"
                        title="Edit prop"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => handleDelete(e, prop.id)}
                          className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                          title="Delete prop"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm">{prop.description}</p>
                  <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-primary)]">
                        ${prop.price.toFixed(2)} each
                      </span>
                    </div>

                    {prop.length && prop.width && prop.height && (
                      <div className="text-[var(--text-primary)]">
                        L: {prop.length} × W: {prop.width} × H: {prop.height} {prop.unit}
                      </div>
                    )}
                    
                    {prop.rentalDueDate && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Due: {new Date(prop.rentalDueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {prop.digitalAssets && prop.digitalAssets.length > 0 && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <FileText className="h-4 w-4 text-[var(--highlight-color)]" />
                        <span>
                          {prop.digitalAssets.length} digital {prop.digitalAssets.length === 1 ? 'asset' : 'assets'}
                        </span>
                      </div>
                    )}
                  </div>

                  {prop.hasBeenModified && (
                    <div className="mt-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <div className="flex items-center gap-2 text-[var(--highlight-color)] font-medium">
                        <AlertTriangle className="h-5 w-5" />
                        Modified Prop
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{prop.modificationDetails}</p>
                      {prop.lastModifiedAt && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Modified on {new Date(prop.lastModifiedAt).toLocaleDateString()} at {new Date(prop.lastModifiedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex">
                <div className="relative w-[200px] h-[200px] flex-shrink-0 bg-[var(--bg-primary)]">
                  {prop.images && prop.images.length > 0 ? (
                    <>
                      <img
                        src={prop.images[currentImageIndices[prop.id] || 0].url}
                        alt={prop.name}
                        className="w-full h-full object-cover"
                      />
                      {prop.images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {prop.images.map((_: PropImage, index: number) => (
                            <div 
                              key={index}
                              className={`w-1.5 h-1.5 rounded-full ${index === (currentImageIndices[prop.id] || 0) ? 'bg-white' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 flex flex-col min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                          {prop.name}
                        </h3>
                        {prop.quantity > 1 && (
                          <span className="text-sm text-[var(--text-secondary)]">
                            (Qty: {prop.quantity})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Theater className="h-4 w-4 text-[var(--highlight-color)]" />
                        <span className="text-sm font-medium text-[var(--highlight-color)]">
                          Act {prop.act}, Scene {prop.scene}
                          {prop.sceneName && ` - ${prop.sceneName}`}
                        </span>
                        <span 
                          className="px-2 py-0.5 text-sm bg-[var(--highlight-bg)] text-[var(--highlight-color)] rounded cursor-pointer hover:bg-[var(--highlight-bg)]/80"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCategoryClick?.(prop.category);
                          }}
                        >
                          {prop.category}
                        </span>
                        {prop.status && prop.status !== 'confirmed' && (
                          <span className={`px-2 py-0.5 text-sm rounded flex items-center gap-1 ${getStatusColor(prop.status)}`}>
                            <Activity className="h-3 w-3" />
                            {lifecycleStatusLabels[prop.status]}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[var(--text-secondary)]">{prop.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log(`Navigating to edit form for prop ${prop.id}`);
                          router.push(`/props/${prop.id}?edit=true` as any);
                        }}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--highlight-color)] transition-colors"
                        title="Edit prop"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => handleDelete(e, prop.id)}
                          className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                          title="Delete prop"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-primary)]">
                        ${prop.price.toFixed(2)} each
                      </span>
                    </div>

                    {prop.length && prop.width && prop.height && (
                      <div className="text-[var(--text-primary)]">
                        L: {prop.length} × W: {prop.width} × H: {prop.height} {prop.unit}
                      </div>
                    )}
                    
                    {prop.rentalDueDate && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Due: {new Date(prop.rentalDueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {prop.digitalAssets && prop.digitalAssets.length > 0 && (
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <FileText className="h-4 w-4 text-[var(--highlight-color)]" />
                        <span>
                          {prop.digitalAssets.length} digital {prop.digitalAssets.length === 1 ? 'asset' : 'assets'}
                        </span>
                      </div>
                    )}
                  </div>

                  {prop.hasBeenModified && (
                    <div className="mt-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <div className="flex items-center gap-2 text-[var(--highlight-color)] font-medium">
                        <AlertTriangle className="h-5 w-5" />
                        Modified Prop
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{prop.modificationDetails}</p>
                      {prop.lastModifiedAt && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Modified on {new Date(prop.lastModifiedAt).toLocaleDateString()} at {new Date(prop.lastModifiedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-[var(--button-bg)] text-[var(--button-text)] rounded-full shadow-lg hover:bg-[var(--button-hover)] transition-colors z-50"
          aria-label="Scroll to top"
        >
          <ChevronsUp className="h-5 w-5" />
        </button>
      )}

      {props.length === 0 && (
        <div className="text-center py-12 gradient-border">
          <p className="text-[var(--text-secondary)]">No props added yet. Create your first prop to get started!</p>
        </div>
      )}
    </div>
  );
}