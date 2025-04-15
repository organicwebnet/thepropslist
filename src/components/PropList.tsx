import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Trash2, Theater, Edit, AlertTriangle, Calendar, FileText, Share2, ChevronsUp } from 'lucide-react';
import type { Prop, PropFormData, Show, Filters } from '../types';
import { ExportToolbar } from './ExportToolbar';
import { SearchBar } from './SearchBar';
import { PropFilters } from './PropFilters';

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
  const navigate = useNavigate();
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  return (
    <div className="space-y-4" ref={listRef}>
      <div className="space-y-4 sticky top-0 bg-[#0A0A0A] z-10 py-2">
        <div className="flex justify-between items-center">
          <h2 
            className="text-3xl font-bold text-white cursor-pointer hover:text-primary-light transition-colors"
            onClick={() => onSelect?.(show)}
          >
            {show.name}
          </h2>
          <div className="flex items-center gap-4">
            <ExportToolbar 
              props={props} 
              show={show} 
              onMergeProps={handleMergeProps}
              onDeleteProp={onDelete}
              onEditProp={handleEditProp}
            />
            {onShare && (
              <button
                onClick={() => onShare(show)}
                className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Share
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <SearchBar 
            value={filters.search}
            onChange={(value) => onFilterChange({ ...filters, search: value })}
          />
          <PropFilters
            filters={filters}
            onChange={onFilterChange}
            onReset={onFilterReset}
          />
        </div>
      </div>
      {props.map((prop) => (
        <div 
          key={prop.id}
          className="block bg-[#1A1A1A] border border-gray-800/50 rounded-lg overflow-hidden hover:border-gray-700 transition-colors cursor-pointer"
          onClick={() => navigate(`/props/${prop.id}`)}
        >
          <div className="flex">
            {/* Image Section */}
            <div className="relative w-[200px] h-[200px] flex-shrink-0 bg-black">
              {prop.images && prop.images.length > 0 ? (
                <>
                  <img
                    src={prop.images[currentImageIndices[prop.id] || 0].url}
                    alt={prop.name}
                    className="w-full h-full object-cover"
                  />
                  {prop.images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {prop.images.map((_, index) => (
                        <div 
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full ${index === (currentImageIndices[prop.id] || 0) ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  )}
                  {prop.images.length > 1 && (
                    <>
                      <button 
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = currentImageIndices[prop.id] || 0;
                          const prevIndex = (currentIndex - 1 + prop.images.length) % prop.images.length;
                          setCurrentImageIndices({
                            ...currentImageIndices,
                            [prop.id]: prevIndex
                          });
                        }}
                      >
                        ‹
                      </button>
                      <button 
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = currentImageIndices[prop.id] || 0;
                          const nextIndex = (currentIndex + 1) % prop.images.length;
                          setCurrentImageIndices({
                            ...currentImageIndices,
                            [prop.id]: nextIndex
                          });
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600">
                  <Package className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex-1 p-4 flex flex-col min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-white">
                      {prop.name}
                    </h3>
                    {prop.quantity > 1 && (
                      <span className="text-sm text-gray-400">
                        (Qty: {prop.quantity})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Theater className="h-4 w-4 text-primary-light" />
                    <span className="text-sm font-medium text-primary-light">
                      Act {prop.act}, Scene {prop.scene}
                    </span>
                    <span 
                      className="px-2 py-0.5 text-sm bg-gray-800 text-gray-300 rounded cursor-pointer hover:bg-gray-700"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCategoryClick?.(prop.category);
                      }}
                    >
                      {prop.category}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-400">{prop.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`Navigating to edit form for prop ${prop.id}`);
                      navigate(`/props/${prop.id}?edit=true`);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Edit prop"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => handleDelete(e, prop.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete prop"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">
                    ${prop.price.toFixed(2)} each
                  </span>
                  {onUpdatePrice && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newPrice = parseFloat(prompt('Enter new price:', prop.price.toString()) || '0');
                        if (!isNaN(newPrice) && newPrice >= 0) {
                          onUpdatePrice(prop.id, newPrice);
                        }
                      }}
                      className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      Update Price
                    </button>
                  )}
                </div>

                {prop.length && prop.width && prop.height && (
                  <div>
                    L: {prop.length} × W: {prop.width} × H: {prop.height} {prop.unit}
                  </div>
                )}
                
                {prop.rentalDueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Due: {new Date(prop.rentalDueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {prop.digitalAssets && prop.digitalAssets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span>
                      {prop.digitalAssets.length} digital {prop.digitalAssets.length === 1 ? 'asset' : 'assets'}
                    </span>
                  </div>
                )}
              </div>

              {prop.hasBeenModified && (
                <div className="mt-4 p-3 bg-[#2A2512] rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-500 font-medium">
                    <AlertTriangle className="h-5 w-5" />
                    Modified Prop
                  </div>
                  <p className="mt-1 text-sm text-gray-300">{prop.modificationDetails}</p>
                  {prop.lastModifiedAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      Modified on {new Date(prop.lastModifiedAt).toLocaleDateString()} at {new Date(prop.lastModifiedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors z-50"
          aria-label="Scroll to top"
        >
          <ChevronsUp className="h-5 w-5" />
        </button>
      )}

      {props.length === 0 && (
        <div className="text-center py-12 gradient-border">
          <p className="text-gray-400">No props added yet. Create your first prop to get started!</p>
        </div>
      )}
    </div>
  );
}