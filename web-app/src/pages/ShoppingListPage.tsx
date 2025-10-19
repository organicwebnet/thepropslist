import React, { useState, ChangeEvent, useEffect } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { ImageCarousel } from '../components/ImageCarousel';
import { Plus, Package, ShoppingBag, Briefcase } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { ShoppingService } from '../shared/services/shoppingService';
import { ShoppingItem, ShoppingOption } from '../shared/types/shopping';
import { FirebaseDocument } from '../shared/services/firebase/types';
import type { Prop } from '../types/props';

// Types are now imported from shared/types/shopping

// Mock data removed - now using real Firebase data

const TABS = [
  { key: 'prop', label: 'Props' },
  { key: 'material', label: 'Materials' },
  { key: 'hired', label: 'Hired Props' },
];

const ShoppingListPage: React.FC = () => {
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { user, loading: webAuthLoading } = useWebAuth();
  
  const [shoppingService, setShoppingService] = useState<ShoppingService | null>(null);
  const [items, setItems] = useState<FirebaseDocument<ShoppingItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prop' | 'material' | 'hired'>('prop');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [commentValue, setCommentValue] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [referenceModalOpen, setReferenceModalOpen] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [addOptionModalOpen, setAddOptionModalOpen] = useState(false);
  const [addOptionItemId, setAddOptionItemId] = useState<string | null>(null);
  const [newOption, setNewOption] = useState({
    shopName: '',
    price: '',
    notes: '',
    productUrl: '',
    images: [] as string[],
  });
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'prop' as 'prop' | 'material' | 'hired',
    description: '',
    quantity: 1,
    budget: 0,
    referenceImage: '',
    note: '',
    labels: [] as string[],
  });
  const [labelFilter, setLabelFilter] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  
  // Initialize shopping service when Firebase service is ready
  useEffect(() => {
    if (service) {
      setShoppingService(new ShoppingService(service));
    }
  }, [service]);

  // Load shopping items from Firebase
  useEffect(() => {
    if (!shoppingService || !user || webAuthLoading) return;
    
    setLoading(true);
    setError(null);
    
    const unsubscribe = shoppingService.listenToShoppingItems(
      (itemDocs) => {
        setItems(itemDocs);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading shopping items:', err);
        setError(err.message || 'Failed to load shopping items');
        setLoading(false);
      },
      currentShowId || undefined
    );

    return unsubscribe;
  }, [shoppingService, user, currentShowId, webAuthLoading]);

  // Clear action message after 2 seconds
  React.useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Local state to store moved props
  const [, setMovedProps] = useState<Prop[]>([]);

  // Effect: update item status to 'picked' if any option is 'buy' - handled by Firebase real-time updates

  const filteredItems = items
    .filter((item: FirebaseDocument<ShoppingItem>) => item.data?.type === activeTab)
    .filter((item: FirebaseDocument<ShoppingItem>) =>
      item.data?.description.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
    )
    .sort((a, b) => {
      const aTime = new Date(a.data?.lastUpdated || 0).getTime();
      const bTime = new Date(b.data?.lastUpdated || 0).getTime();
      return bTime - aTime;
    });

  const handleItemClick = (item: FirebaseDocument<ShoppingItem>) => {
    if (!item.data) return;
    setSelectedItem(item.data);
    setSelectedOptionIndex(0);
    setCommentValue(item.data.options[0]?.comment || '');
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
    setCommentValue('');
  };

  // When selectedOptionIndex changes, update commentValue
  React.useEffect(() => {
    if (selectedItem && selectedItem.options[selectedOptionIndex]) {
      setCommentValue(selectedItem.options[selectedOptionIndex].comment || '');
    }
  }, [selectedOptionIndex, selectedItem]);

  // Placeholder handlers for FAB actions
  const handleAddProp = () => {
    setNewItem({ type: 'prop', description: '', quantity: 1, budget: 0, referenceImage: '', note: '', labels: [] });
    setAddItemModalOpen(true);
    setFabOpen(false);
  };
  const handleAddMaterial = () => {
    setNewItem({ type: 'material', description: '', quantity: 1, budget: 0, referenceImage: '', note: '', labels: [] });
    setAddItemModalOpen(true);
    setFabOpen(false);
  };
  const handleAddHired = () => {
    setNewItem({ type: 'hired', description: '', quantity: 1, budget: 0, referenceImage: '', note: '', labels: [] });
    setAddItemModalOpen(true);
    setFabOpen(false);
  };

  // Helper to get reference image (first option image for prop/hired)
  // const _getReferenceImage = (item: ShoppingItem) => {
  //   if ((item.type === 'prop' || item.type === 'hired') && item.options.length > 0 && item.options[0].images.length > 0) {
  //     return item.options[0].images[0];
  //   }
  //   return null;
  // };

  // Handle image upload (multiple)
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileReaders: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      fileReaders.push(new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }));
    }
    Promise.all(fileReaders).then(imgs => {
      setNewOption(opt => ({ ...opt, images: [...opt.images, ...imgs] }));
    });
  };

  // Open add option modal for a specific item
  const openAddOptionModal = (itemId: string) => {
    setAddOptionItemId(itemId);
    setNewOption({ shopName: '', price: '', notes: '', productUrl: '', images: [] });
    setAddOptionModalOpen(true);
  };

  // Submit new option
  const handleAddOptionSubmit = () => {
    if (!addOptionItemId) return;
    if (!newOption.shopName || !newOption.price) {
      alert('Shop Name and Price are required.');
      return;
    }
    if (!newOption.images || newOption.images.length === 0) {
      alert('At least one image is required.');
      return;
    }
    if (shoppingService && addOptionItemId) {
      const optionData = {
        images: newOption.images,
        price: parseFloat(newOption.price),
        notes: newOption.notes,
        uploadedBy: 'currentUser',
        status: 'pending' as const,
        shopName: newOption.shopName,
        productUrl: newOption.productUrl,
        comment: '',
      };
      shoppingService.addOptionToItem(addOptionItemId, optionData);
    }
    setAddOptionModalOpen(false);
    setAddOptionItemId(null);
    setNewOption({ shopName: '', price: '', notes: '', productUrl: '', images: [] });
  };

  // Open edit modal for an item
  const openEditItemModal = (item: ShoppingItem) => {
    setEditItem({ ...item });
    setEditItemModalOpen(true);
  };

  // Handle edit item submit
  const handleEditItemSubmit = () => {
    if (!editItem) return;
    if (!editItem.description || !editItem.quantity || !editItem.budget) {
      alert('Description, Quantity, and Budget are required.');
      return;
    }
    if (shoppingService && editItem) {
      shoppingService.updateShoppingItem(editItem.id, {
        description: editItem.description,
        quantity: editItem.quantity,
        budget: editItem.budget,
        referenceImage: editItem.referenceImage,
        note: editItem.note,
        labels: editItem.labels,
      });
    }
    setEditItemModalOpen(false);
    setEditItem(null);
  };

  // Handle add item submit
  const handleAddItemSubmit = () => {
    if (!newItem.description || !newItem.quantity || !newItem.budget) {
      alert('Description, Quantity, and Budget are required.');
      return;
    }
    if (shoppingService) {
      const itemData = {
        type: newItem.type,
        description: newItem.description,
        requestedBy: 'currentUser',
        status: 'pending' as const,
        lastUpdated: new Date().toISOString(),
        options: [],
        quantity: newItem.quantity,
        budget: newItem.budget,
        referenceImage: newItem.referenceImage || undefined,
        note: newItem.note,
        labels: newItem.labels,
        showId: currentShowId || undefined,
      };
      shoppingService.addShoppingItem(itemData);
    }
    setAddItemModalOpen(false);
    setNewItem({ type: 'prop', description: '', quantity: 1, budget: 0, referenceImage: '', note: '', labels: [] });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Shopping List <span className="text-pb-accent">({items.length})</span></h1>
          <button className="px-4 py-2 rounded bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary transition-colors" onClick={() => setAddItemModalOpen(true)}>Add Request</button>
        </div>
        <div className="flex gap-4 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-t font-semibold focus:outline-none transition-colors ${activeTab === tab.key ? 'bg-pb-primary text-white' : 'bg-pb-darker/50 text-pb-gray hover:bg-pb-primary/20'}`}
              onClick={() => setActiveTab(tab.key as 'prop' | 'material' | 'hired')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Label filter dropdown */}
        <div className="mb-4 flex gap-2 items-center">
          <label className="text-xs text-pb-gray">Filter by label:</label>
          <select
            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
            value={labelFilter}
            onChange={e => setLabelFilter(e.target.value)}
          >
            <option value="">All</option>
            {Array.from(new Set(items.flatMap(item => item.data?.labels || []))).map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <div className="text-pb-gray">Loading shopping items...</div>
            </div>
          )}
          {error && (
            <div className="text-center py-8">
              <div className="text-red-400">Error: {error}</div>
            </div>
          )}
          {!loading && !error && filteredItems
            .filter(item => !labelFilter || (item.data?.labels || []).includes(labelFilter))
            .map(item => (
            <div key={item.id} className="bg-pb-darker/50 rounded-xl p-4 border border-pb-primary/20 cursor-pointer hover:bg-pb-primary/10">
              <div className="flex justify-between items-start">
                <div className="flex-1" onClick={() => handleItemClick(item)}>
                  <div className="flex items-center">
                    {/* Reference image thumbnail with badge */}
                    {(item.data?.type === 'prop' || item.data?.type === 'hired') && item.data?.referenceImage && (
                      <div className="relative mr-3">
                        <img
                          src={item.data.referenceImage}
                          alt="Reference"
                          className="inline-block w-12 h-12 object-cover rounded border border-pb-primary/40 cursor-pointer"
                          onClick={e => { e.stopPropagation(); setReferenceImageUrl(item.data?.referenceImage || null); setReferenceModalOpen(true); }}
                        />
                        <span className="absolute bottom-0 left-0 bg-pb-accent text-white text-[10px] px-1 py-0.5 rounded-tl rounded-br"></span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg text-white underline cursor-pointer" onClick={e => { e.stopPropagation(); openEditItemModal(item.data || null); }}>{item.data?.description}</span>
                      {item.data?.note && (
                        <div className="mt-1 text-xs text-pb-gray italic max-w-xs">{item.data.note}</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {/* Labels as badges */}
                        {(item.data?.labels && item.data.labels.length > 0) && (
                          <span className="flex flex-wrap gap-1">
                            {item.data.labels.map((label: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-0.5 rounded bg-orange-500 text-white text-sm font-extrabold shadow-sm border border-orange-600 tracking-wide uppercase"
                                style={{ letterSpacing: '0.04em' }}
                              >
                                {label}
                              </span>
                            ))}
                          </span>
                        )}
                        {typeof item.data?.quantity === 'number' && (
                          <span className="px-2 py-1 rounded bg-pb-primary/90 text-xs font-bold text-white">Qty: {item.data.quantity}</span>
                        )}
                        {typeof item.data?.budget === 'number' && (
                          <span className="px-2 py-1 rounded bg-pb-accent/90 text-xs font-bold text-white">Budget: £{item.data.budget}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[160px]">
                  <span className="text-sm text-pb-gray">Status: {item.data?.status}</span>
                  <span className="text-xs text-pb-gray mt-1">Last updated: {new Date(item.data?.lastUpdated || 0).toLocaleString()}</span>
                </div>
                {/* Move to Props button for prop/hired */}
                {(item.data?.type === 'prop' || item.data?.type === 'hired') && (
                  <div className="ml-4 flex flex-col items-end gap-2">
                    {item.data?.status === 'picked' && (
                      <button
                        className="mb-2 px-3 py-1 rounded bg-green-600 text-white text-xs font-bold shadow hover:bg-green-700 transition-colors"
                        onClick={() => {
                          if (shoppingService && item.data) {
                            shoppingService.updateShoppingItem(item.id, { status: 'bought' });
                          }
                        }}
                      >
                        Confirm Bought
                      </button>
                    )}
                    {item.data?.status === 'bought' && (
                      <button
                        className="px-3 py-1 rounded bg-orange-500 text-white text-xs font-bold shadow hover:bg-orange-600 transition-colors"
                        onClick={() => {
                          if (!item.data) return;
                          // Convert to Prop object (minimal fields for demo)
                          const newProp: Prop = {
                            id: item.id,
                            userId: 'currentUser',
                            showId: 'demoShow',
                            name: item.data.description,
                            description: item.data.note,
                            category: 'Hand Prop', // fallback to 'Other' if not in allowed list
                            price: item.data.options[0]?.price || 0,
                            quantity: item.data.quantity || 1,
                            source: 'bought',
                            status: 'active',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          setMovedProps(prev => [...prev, newProp]);
                          if (shoppingService) {
                            shoppingService.deleteShoppingItem(item.id);
                          }
                          // Optionally: show a toast or confirmation
                        }}
                      >
                        Move to Props
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {item.data?.options.map((opt: ShoppingOption, i: number) => {
                  let cardClass = 'bg-white/10';
                  let textClass = 'text-white';
                  if (opt.status === 'buy') {
                    cardClass = 'bg-green-600/80 border-green-400';
                    textClass = 'text-white';
                  } else if (opt.status === 'rejected') {
                    cardClass = 'bg-pb-gray/40 opacity-60 border-pb-gray';
                    textClass = 'text-pb-gray';
                  }
                  return (
                    <div key={i} className={`${cardClass} rounded p-2 flex flex-col items-center min-w-[120px] border`}> 
                      <div className="w-16 h-16 bg-pb-gray/20 rounded mb-2 flex items-center justify-center text-xs text-pb-gray">{opt.images.length > 0 ? <img src={opt.images[0]} alt="option" className="w-full h-full object-cover rounded" /> : 'No Image'}</div>
                      <div className={`${textClass} text-sm font-semibold mb-1`}>£{opt.price}</div>
                      <div className="text-xs text-pb-gray mb-1">{opt.notes}</div>
                      <div className="text-xs text-pb-accent">By: {opt.uploadedBy}</div>
                      {opt.status === 'maybe' && (
                        <span className="mt-1 px-2 py-0.5 rounded bg-pb-yellow text-xs font-bold text-black border border-pb-gray/30">Maybe</span>
                      )}
                    </div>
                  );
                })}
                <button
                  className={`px-2 py-1 rounded text-white text-xs font-semibold shadow transition-colors
                    ${item.data?.type === 'prop' ? 'bg-pb-accent hover:bg-pb-secondary' : ''}
                    ${item.data?.type === 'material' ? 'bg-pb-yellow hover:bg-yellow-500' : ''}
                    ${item.data?.type === 'hired' ? 'bg-pb-primary hover:bg-pb-secondary' : ''}
                  `.replace(/\s+/g, ' ')}
                  style={item.data?.type === 'material' ? { backgroundColor: '#FFD600', color: '#222' } : {}}
                  onClick={e => { e.stopPropagation(); openAddOptionModal(item.id); }}
                >
                  Add Option
                </button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-pb-gray text-center py-8">No items in this list.</div>
          )}
        </div>
        {/* Modal for item details */}
        {modalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-pb-darker rounded-xl p-6 max-w-lg w-full relative">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={handleCloseModal}>&times;</button>
              <h2 className="text-xl font-bold mb-2 text-white">{selectedItem.description} ({selectedItem.quantity || 1} x £{selectedItem.budget || 0})</h2>
              <div className="mb-4">
                <span className="px-2 py-1 rounded bg-pb-accent text-xs text-white uppercase">{selectedItem.type}</span>
                <span className="ml-2 text-xs text-pb-gray">Requested by: {selectedItem.requestedBy}</span>
              </div>
              {/* Reference image in modal, clickable for full size */}
              {(selectedItem.type === 'prop' || selectedItem.type === 'hired') && selectedItem.referenceImage && (
                <div className="mb-4 flex flex-col items-center">
                  <img
                    src={selectedItem.referenceImage}
                    alt="Reference"
                    className="w-40 h-40 object-cover rounded border border-pb-primary/40 cursor-pointer"
                    onClick={() => { setReferenceImageUrl(selectedItem.referenceImage || null); setReferenceModalOpen(true); }}
                  />
                  {/* No label under the image */}
                </div>
              )}
              {/* Option selector if multiple options */}
              {selectedItem.options.length > 1 && (
                <div className="flex gap-2 mb-2">
                  {selectedItem.options.map((_opt, i) => (
                    <button key={i} className={`px-2 py-1 rounded text-xs font-semibold ${i === selectedOptionIndex ? 'bg-pb-primary text-white' : 'bg-pb-gray/30 text-pb-gray'}`} onClick={() => setSelectedOptionIndex(i)}>{i + 1}</button>
                  ))}
                </div>
              )}
              {/* Image carousel or thumbnails for selected option */}
              <div className="mb-4">
                {selectedItem.options[selectedOptionIndex].images.length > 0 && (
                  <ImageCarousel images={selectedItem.options[selectedOptionIndex].images} />
                )}
              </div>
              {/* Comment textarea */}
              <div className="mb-4">
                <label htmlFor="comment" className="block text-xs text-pb-gray mb-1">Comment:</label>
                <textarea
                  id="comment"
                  className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                  rows={3}
                  value={commentValue}
                  onChange={e => {
                    setCommentValue(e.target.value);
                    if (!selectedItem) return;
                    const updatedOptions = [...selectedItem.options];
                    updatedOptions[selectedOptionIndex] = {
                      ...updatedOptions[selectedOptionIndex],
                      comment: e.target.value,
                    };
                    setSelectedItem({ ...selectedItem, options: updatedOptions });
                    setItems(prevItems => prevItems.map(item =>
                      item.id === selectedItem.id ? { ...item, options: updatedOptions } : item
                    ));
                  }}
                />
              </div>
              {/* Buttons for Reject, Maybe, and Buy */}
              <div className="flex gap-2 mb-2">
                <button
                  className={`px-4 py-2 rounded font-semibold shadow transition-colors ${selectedItem.options[selectedOptionIndex].status === 'rejected' ? 'bg-pb-red/80 text-white' : 'bg-pb-red text-white hover:bg-pb-red/80'}`}
                  onClick={() => {
                    const updatedOptions = [...selectedItem.options];
                    updatedOptions[selectedOptionIndex] = {
                      ...updatedOptions[selectedOptionIndex],
                      status: 'rejected',
                    };
                    setSelectedItem({ ...selectedItem, options: updatedOptions });
                    if (shoppingService && selectedItem) {
                      shoppingService.updateOption(selectedItem.id, selectedOptionIndex, { status: 'rejected' });
                    }
                    setActionMessage('Marked as rejected!');
                  }}
                >Reject</button>
                <button
                  className={`px-4 py-2 rounded font-semibold shadow transition-colors ${selectedItem.options[selectedOptionIndex].status === 'maybe' ? 'bg-pb-yellow/80 text-white' : 'bg-pb-yellow text-white hover:bg-pb-yellow/80'}`}
                  onClick={() => {
                    const updatedOptions = [...selectedItem.options];
                    updatedOptions[selectedOptionIndex] = {
                      ...updatedOptions[selectedOptionIndex],
                      status: 'maybe',
                    };
                    setSelectedItem({ ...selectedItem, options: updatedOptions });
                    if (shoppingService && selectedItem) {
                      shoppingService.updateOption(selectedItem.id, selectedOptionIndex, { status: 'maybe' });
                    }
                    setActionMessage('Marked as maybe!');
                  }}
                >Maybe</button>
                <button
                  className={`px-4 py-2 rounded font-semibold shadow transition-colors ${selectedItem.options[selectedOptionIndex].status === 'buy' ? 'bg-green-600 text-white' : 'bg-pb-accent text-white hover:bg-pb-secondary'}`}
                  onClick={() => {
                    const updatedOptions = [...selectedItem.options];
                    updatedOptions[selectedOptionIndex] = {
                      ...updatedOptions[selectedOptionIndex],
                      status: 'buy',
                    };
                    setSelectedItem({ ...selectedItem, options: updatedOptions });
                    if (shoppingService && selectedItem) {
                      shoppingService.updateOption(selectedItem.id, selectedOptionIndex, { status: 'buy' });
                    }
                    setActionMessage('Marked as bought!');
                  }}
                >Buy This</button>
              </div>
              {actionMessage && (
                <div className="mb-2 text-green-400 text-sm font-semibold animate-fade-in-fast">{actionMessage}</div>
              )}
              {/* Product details */}
              <div className="mb-2">
                {selectedItem.options[selectedOptionIndex].productUrl && (
                  <div className="mt-2">
                    <a href={selectedItem.options[selectedOptionIndex].productUrl} target="_blank" rel="noopener noreferrer" className="text-pb-accent underline font-semibold">View Product</a>
                    <span className="ml-2 text-white font-semibold">£{selectedItem.options[selectedOptionIndex].price}</span>
                  </div>
                )}
                <div className="text-xs text-pb-gray mb-1">{selectedItem.options[selectedOptionIndex].notes}</div>
                <div className="text-xs text-pb-accent">By: {selectedItem.options[selectedOptionIndex].uploadedBy}</div>
                <div className="text-xs text-pb-gray mt-1">Shop: {selectedItem.options[selectedOptionIndex].shopName || 'Unknown'}</div>
              </div>
            </div>
          </div>
        )}
        {/* Add Option Modal */}
        {addOptionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-pb-darker rounded-xl p-6 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setAddOptionModalOpen(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-white">Add Option</h2>
              {/* Image previews at the top */}
              <div className="mb-3">
                <div className="flex gap-2 mt-2 flex-wrap">
                  {newOption.images.map((img, i) => (
                    <img key={i} src={img} alt="preview" className="w-16 h-16 object-cover rounded border border-pb-primary/40" />
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Images</label>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Shop Name*</label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newOption.shopName} onChange={e => setNewOption(opt => ({ ...opt, shopName: e.target.value }))} />
              </div> 
              
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Price (£)*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newOption.price} onChange={e => setNewOption(opt => ({ ...opt, price: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Notes</label>
                <textarea className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" rows={2} value={newOption.notes} onChange={e => setNewOption(opt => ({ ...opt, notes: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Product URL</label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newOption.productUrl} onChange={e => setNewOption(opt => ({ ...opt, productUrl: e.target.value }))} />
              </div>
             
              <button className="w-full mt-4 py-2 rounded bg-pb-accent text-white font-semibold shadow hover:bg-pb-secondary transition-colors" onClick={handleAddOptionSubmit}>Add Option</button>
            </div>
          </div>
        )}
        {/* Edit Item Modal */}
        {editItemModalOpen && editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-pb-darker rounded-xl p-6 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setEditItemModalOpen(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-white">Edit Item</h2>
              {/* Reference image preview and upload */}
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Reference Image</label>
                {editItem.referenceImage && (
                  <img src={editItem.referenceImage} alt="Reference" className="w-20 h-20 object-cover rounded border border-pb-primary/40 mb-2" />
                )}
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setEditItem(item => item ? { ...item, referenceImage: reader.result as string } : item);
                  reader.readAsDataURL(file);
                }} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Title*</label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={editItem.description} onChange={e => setEditItem(item => item ? { ...item, description: e.target.value } : item)} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Note</label>
                <textarea className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" rows={2} value={editItem.note || ''} onChange={e => setEditItem(item => item ? { ...item, note: e.target.value } : item)} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Labels <span className="text-pb-gray">(comma separated, e.g. Screwfix, Flower Market)</span></label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={(editItem.labels || []).join(', ')} onChange={e => setEditItem(item => item ? { ...item, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean) } : item)} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Quantity*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={editItem.quantity ?? ''} onChange={e => setEditItem(item => item ? { ...item, quantity: Number(e.target.value) } : item)} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Budget (£)*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={editItem.budget ?? ''} onChange={e => setEditItem(item => item ? { ...item, budget: Number(e.target.value) } : item)} />
              </div>
              <button className="w-full mt-4 py-2 rounded bg-pb-accent text-white font-semibold shadow hover:bg-pb-secondary transition-colors" onClick={handleEditItemSubmit}>Save Changes</button>
            </div>
          </div>
        )}
        {/* Add Item Modal */}
        {addItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-pb-darker rounded-xl p-6 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setAddItemModalOpen(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-white">Add Request</h2>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Type*</label>
                <select className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.type} onChange={e => setNewItem(item => ({ ...item, type: e.target.value as 'prop' | 'material' | 'hired' }))}>
                  <option value="prop">Prop</option>
                  <option value="material">Material</option>
                  <option value="hired">Hired</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Title*</label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.description} onChange={e => setNewItem(item => ({ ...item, description: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Note</label>
                <textarea className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" rows={2} value={newItem.note} onChange={e => setNewItem(item => ({ ...item, note: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Labels <span className="text-pb-gray">(comma separated, e.g. Screwfix, Flower Market)</span></label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.labels.join(', ')} onChange={e => setNewItem(item => ({ ...item, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean) }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Quantity*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.quantity} onChange={e => setNewItem(item => ({ ...item, quantity: Number(e.target.value) }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Budget (£)*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.budget} onChange={e => setNewItem(item => ({ ...item, budget: Number(e.target.value) }))} />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-pb-gray mb-1">Reference Image</label>
                {newItem.referenceImage && (
                  <img src={newItem.referenceImage} alt="Reference" className="w-20 h-20 object-cover rounded border border-pb-primary/40 mb-2" />
                )}
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setNewItem(item => ({ ...item, referenceImage: reader.result as string }));
                  reader.readAsDataURL(file);
                }} />
              </div>
              <button className="w-full mt-4 py-2 rounded bg-pb-accent text-white font-semibold shadow hover:bg-pb-secondary transition-colors" onClick={handleAddItemSubmit}>Add Request</button>
            </div>
          </div>
        )}
        {/* Reference Image Fullscreen Modal */}
        {referenceModalOpen && referenceImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setReferenceModalOpen(false)}>
            <img src={referenceImageUrl} alt="Reference Full Size" className="max-w-full max-h-full rounded shadow-lg border-4 border-pb-accent" />
          </div>
        )}
        {/* Floating Action Button (FAB) */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            className="w-16 h-16 rounded-full bg-pb-accent text-white flex items-center justify-center shadow-lg hover:bg-pb-secondary transition-colors text-3xl focus:outline-none"
            onClick={() => setFabOpen(fab => !fab)}
            aria-label="Add"
          >
            <Plus className="w-8 h-8" />
          </button>
          {fabOpen && (
            <div className="absolute bottom-20 right-0 flex flex-col gap-3 bg-pb-darker rounded-xl shadow-lg p-4 border border-pb-primary/20 animate-fade-in">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded bg-pb-primary text-white font-semibold hover:bg-pb-secondary transition-colors"
                onClick={handleAddProp}
              >
                <Package className="w-5 h-5" /> Add Prop
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded bg-pb-primary text-white font-semibold hover:bg-pb-secondary transition-colors"
                onClick={handleAddMaterial}
              >
                <ShoppingBag className="w-5 h-5" /> Add Material
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded bg-pb-primary text-white font-semibold hover:bg-pb-secondary transition-colors"
                onClick={handleAddHired}
              >
                <Briefcase className="w-5 h-5" /> Add Hired
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ShoppingListPage; 