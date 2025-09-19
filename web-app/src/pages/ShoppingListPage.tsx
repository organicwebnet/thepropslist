import React, { useState, ChangeEvent } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { ImageCarousel } from '../components/ImageCarousel';
import { Plus, Package, ShoppingBag, Briefcase } from 'lucide-react';
// Removed unused useRef import
import type { Prop } from '../types/props';

// Types for shopping items and options
interface ShoppingOption {
  images: string[];
  price: number;
  notes: string;
  uploadedBy: string;
  status: string;
  shopName?: string;
  productUrl?: string;
  comment?: string;
}
interface ShoppingItem {
  id: string;
  type: 'prop' | 'material' | 'hired';
  description: string;
  requestedBy: string;
  status: string;
  lastUpdated: string;
  options: ShoppingOption[];
  quantity?: number;
  budget?: number;
  referenceImage?: string;
  note?: string;
  labels?: string[];
}

// Mock data for shopping items
const mockShoppingItems: ShoppingItem[] = [
  { id: '1', type: 'prop', description: 'Gold 1950s American lamp', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-01T10:00:00Z', quantity: 2, budget: 120, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=80', 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80'], price: 55, notes: 'Online option', uploadedBy: 'shopper2', status: 'pending', shopName: 'eBay', productUrl: 'https://www.ebay.co.uk/itm/123456', comment: '' },
    ] },
  { id: '2', type: 'prop', description: 'Vintage suitcase', requestedBy: 'designer', status: 'approved', lastUpdated: '2024-06-02T09:15:00Z', quantity: 1, budget: 60, options: [
      { images: ['https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=200&q=80'], price: 30, notes: 'Antique store', uploadedBy: 'shopper1', status: 'pending', shopName: 'Antique Alley' },
    ] },
  { id: '3', type: 'prop', description: 'Crystal decanter', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-03T08:30:00Z', quantity: 3, budget: 75, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 25, notes: 'Charity shop', uploadedBy: 'shopper2', status: 'pending', shopName: 'Oxfam' },
    ] },
  { id: '4', type: 'prop', description: 'Silver tray', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-04T07:45:00Z', quantity: 1, budget: 25, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 18, notes: 'eBay', uploadedBy: 'shopper1', status: 'pending', shopName: 'eBay', productUrl: 'https://www.ebay.co.uk/itm/654321' },
    ] },
  { id: '5', type: 'prop', description: 'Old rotary phone', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-05T06:10:00Z', quantity: 1, budget: 70, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 60, notes: 'Market', uploadedBy: 'shopper2', status: 'pending', shopName: 'Portobello Market' },
    ] },
  { id: '6', type: 'prop', description: 'Brass candlestick', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-06T05:20:00Z', quantity: 4, budget: 48, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 12, notes: 'Thrift store', uploadedBy: 'shopper1', status: 'pending', shopName: 'Barnardo’s' },
    ] },
  { id: '7', type: 'prop', description: 'Leather-bound book', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-07T04:35:00Z', quantity: 5, budget: 40, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 8, notes: 'Bookshop', uploadedBy: 'shopper2', status: 'pending', shopName: 'Waterstones' },
    ] },
  { id: '8', type: 'prop', description: 'Pocket watch', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-08T03:50:00Z', quantity: 2, budget: 50, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 22, notes: 'Antique fair', uploadedBy: 'shopper1', status: 'pending', shopName: 'Antique Fair' },
    ] },
  { id: '9', type: 'prop', description: 'Porcelain teapot', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-09T02:05:00Z', quantity: 1, budget: 20, options: [
      { images: ['https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80'], price: 15, notes: 'Online', uploadedBy: 'shopper2', status: 'pending', shopName: 'Etsy', productUrl: 'https://www.etsy.com/listing/123456' },
    ] },
  { id: '10', type: 'prop', description: 'Wooden walking stick', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-10T01:25:00Z', quantity: 2, budget: 30, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 10, notes: 'Charity shop', uploadedBy: 'shopper1', status: 'pending', shopName: 'British Heart Foundation' },
    ] },
  // Materials
  { id: '11', type: 'material', description: 'Red paint (for lamp)', requestedBy: 'maker', status: 'approved', lastUpdated: '2024-06-10T10:00:00Z', quantity: 3, budget: 36, options: [
      { images: ['https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=80'], price: 12, notes: 'B&Q', uploadedBy: 'shopper1', status: 'pending', shopName: 'B&Q', productUrl: 'https://www.diy.com/product/paint-red' },
    ] },
  { id: '12', type: 'material', description: 'Gold spray paint', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-09T09:10:00Z', quantity: 2, budget: 16, options: [
      { images: ['https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80'], price: 8, notes: 'Homebase', uploadedBy: 'shopper2', status: 'pending', shopName: 'Homebase', productUrl: 'https://www.homebase.co.uk/gold-spray-paint' },
    ] },
  { id: '13', type: 'material', description: 'Wood glue', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-08T08:20:00Z', quantity: 1, budget: 5, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 5, notes: 'Screwfix', uploadedBy: 'shopper1', status: 'pending', shopName: 'Screwfix' },
    ] },
  { id: '14', type: 'material', description: 'Fabric (red velvet)', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-07T07:30:00Z', quantity: 5, budget: 100, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 20, notes: 'Fabric shop', uploadedBy: 'shopper2', status: 'pending', shopName: 'Fabric World' },
    ] },
  { id: '15', type: 'material', description: 'Brass polish', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-06T06:40:00Z', quantity: 2, budget: 8, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 4, notes: 'Supermarket', uploadedBy: 'shopper1', status: 'pending', shopName: 'Tesco' },
    ] },
  { id: '16', type: 'material', description: 'Black thread', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-05T05:50:00Z', quantity: 4, budget: 8, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 2, notes: 'Haberdashery', uploadedBy: 'shopper2', status: 'pending', shopName: 'John Lewis' },
    ] },
  { id: '17', type: 'material', description: 'Masking tape', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-04T04:55:00Z', quantity: 2, budget: 6, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 3, notes: 'DIY store', uploadedBy: 'shopper1', status: 'pending', shopName: 'Wickes' },
    ] },
  { id: '18', type: 'material', description: 'Sandpaper', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-03T03:15:00Z', quantity: 10, budget: 10, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 1, notes: 'DIY store', uploadedBy: 'shopper2', status: 'pending', shopName: 'Screwfix' },
    ] },
  { id: '19', type: 'material', description: 'Super glue', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-02T02:35:00Z', quantity: 3, budget: 6, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 2, notes: 'Supermarket', uploadedBy: 'shopper1', status: 'pending', shopName: 'Tesco' },
    ] },
  { id: '20', type: 'material', description: 'White paint', requestedBy: 'maker', status: 'pending', lastUpdated: '2024-06-01T01:45:00Z', quantity: 2, budget: 20, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 10, notes: 'B&Q', uploadedBy: 'shopper2', status: 'pending', shopName: 'B&Q' },
    ] },
  // Hired Props
  { id: '21', type: 'hired', description: 'Antique gramophone (hired)', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-11T12:00:00Z', quantity: 1, budget: 80, options: [
      { images: ['https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80'], price: 80, notes: 'Hired from PropHire Ltd.', uploadedBy: 'shopper3', status: 'pending', shopName: 'PropHire Ltd.', productUrl: 'https://prophire.com/gramophone' },
    ] },
  { id: '22', type: 'hired', description: 'Victorian umbrella (hired)', requestedBy: 'designer', status: 'approved', lastUpdated: '2024-06-12T09:00:00Z', quantity: 2, budget: 50, options: [
      { images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'], price: 25, notes: 'Hired from Umbrella Hire Co.', uploadedBy: 'shopper2', status: 'approved', shopName: 'Umbrella Hire Co.', productUrl: 'https://umbrellahire.com/victorian' },
    ] },
  { id: '23', type: 'hired', description: 'Top hat (hired)', requestedBy: 'designer', status: 'pending', lastUpdated: '2024-06-13T15:30:00Z', quantity: 1, budget: 15, options: [
      { images: ['https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80'], price: 15, notes: 'Hired from Hats4Stage', uploadedBy: 'shopper1', status: 'pending', shopName: 'Hats4Stage', productUrl: 'https://hats4stage.com/top-hat' },
    ] },
];

const TABS = [
  { key: 'prop', label: 'Props' },
  { key: 'material', label: 'Materials' },
  { key: 'hired', label: 'Hired Props' },
];

const ShoppingListPage: React.FC = () => {
  const [items, setItems] = useState<ShoppingItem[]>(mockShoppingItems);
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
  // Clear action message after 2 seconds
  React.useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Local state to store moved props
  const [movedProps, setMovedProps] = useState<Prop[]>([]);

  // Effect: update item status to 'picked' if any option is 'buy'
  React.useEffect(() => {
    setItems(prevItems => prevItems.map(item => {
      if ((item.type === 'prop' || item.type === 'hired') && item.options.some(opt => opt.status === 'buy')) {
        if (item.status !== 'picked') {
          return { ...item, status: 'picked' };
        }
      }
      return item;
    }));
  }, [items]);

  const filteredItems = items
    .filter((item: ShoppingItem) => item.type === activeTab)
    .filter((item: ShoppingItem) =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  const handleItemClick = (item: ShoppingItem) => {
    setSelectedItem(item);
    setSelectedOptionIndex(0);
    setCommentValue(item.options[0]?.comment || '');
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
  const getReferenceImage = (item: ShoppingItem) => {
    if ((item.type === 'prop' || item.type === 'hired') && item.options.length > 0 && item.options[0].images.length > 0) {
      return item.options[0].images[0];
    }
    return null;
  };

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
    setItems(prevItems => prevItems.map(item => {
      if (item.id === addOptionItemId) {
        return {
          ...item,
          options: [
            ...item.options,
            {
              images: newOption.images,
              price: parseFloat(newOption.price),
              notes: newOption.notes,
              uploadedBy: 'currentUser',
              status: 'pending',
              shopName: newOption.shopName,
              productUrl: newOption.productUrl,
              comment: '',
            },
          ],
        };
      }
      return item;
    }));
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
    setItems(prevItems => prevItems.map(item =>
      item.id === editItem.id ? { ...item, description: editItem.description, quantity: editItem.quantity, budget: editItem.budget, referenceImage: editItem.referenceImage, note: editItem.note, labels: editItem.labels } : item
    ));
    setEditItemModalOpen(false);
    setEditItem(null);
  };

  // Handle add item submit
  const handleAddItemSubmit = () => {
    if (!newItem.description || !newItem.quantity || !newItem.budget) {
      alert('Description, Quantity, and Budget are required.');
      return;
    }
    setItems(prevItems => [
      {
        id: (Date.now() + Math.random()).toString(),
        type: newItem.type,
        description: newItem.description,
        requestedBy: 'currentUser',
        status: 'pending',
        lastUpdated: new Date().toISOString(),
        options: [],
        quantity: newItem.quantity,
        budget: newItem.budget,
        referenceImage: newItem.referenceImage || undefined,
        note: newItem.note,
        labels: newItem.labels,
      },
      ...prevItems,
    ]);
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
            {Array.from(new Set(items.flatMap(item => item.labels || []))).map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          {filteredItems
            .filter(item => !labelFilter || (item.labels || []).includes(labelFilter))
            .map(item => (
            <div key={item.id} className="bg-pb-darker/50 rounded-xl p-4 border border-pb-primary/20 cursor-pointer hover:bg-pb-primary/10">
              <div className="flex justify-between items-start">
                <div className="flex-1" onClick={() => handleItemClick(item)}>
                  <div className="flex items-center">
                    {/* Reference image thumbnail with badge */}
                    {(item.type === 'prop' || item.type === 'hired') && item.referenceImage && (
                      <div className="relative mr-3">
                        <img
                          src={item.referenceImage}
                          alt="Reference"
                          className="inline-block w-12 h-12 object-cover rounded border border-pb-primary/40 cursor-pointer"
                          onClick={e => { e.stopPropagation(); setReferenceImageUrl(item.referenceImage || null); setReferenceModalOpen(true); }}
                        />
                        <span className="absolute bottom-0 left-0 bg-pb-accent text-white text-[10px] px-1 py-0.5 rounded-tl rounded-br"></span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg text-white underline cursor-pointer" onClick={e => { e.stopPropagation(); openEditItemModal(item); }}>{item.description}</span>
                      {item.note && (
                        <div className="mt-1 text-xs text-pb-gray italic max-w-xs">{item.note}</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {/* Labels as badges */}
                        {(item.labels && item.labels.length > 0) && (
                          <span className="flex flex-wrap gap-1">
                            {item.labels.map((label, idx) => (
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
                        {typeof item.quantity === 'number' && (
                          <span className="px-2 py-1 rounded bg-pb-primary/90 text-xs font-bold text-white">Qty: {item.quantity}</span>
                        )}
                        {typeof item.budget === 'number' && (
                          <span className="px-2 py-1 rounded bg-pb-accent/90 text-xs font-bold text-white">Budget: £{item.budget}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[160px]">
                  <span className="text-sm text-pb-gray">Status: {item.status}</span>
                  <span className="text-xs text-pb-gray mt-1">Last updated: {new Date(item.lastUpdated).toLocaleString()}</span>
                </div>
                {/* Move to Props button for prop/hired */}
                {(item.type === 'prop' || item.type === 'hired') && (
                  <div className="ml-4 flex flex-col items-end gap-2">
                    {item.status === 'picked' && (
                      <button
                        className="mb-2 px-3 py-1 rounded bg-green-600 text-white text-xs font-bold shadow hover:bg-green-700 transition-colors"
                        onClick={() => {
                          setItems(prevItems => prevItems.map(it => it.id === item.id ? { ...it, status: 'bought' } : it));
                        }}
                      >
                        Confirm Bought
                      </button>
                    )}
                    {item.status === 'bought' && (
                      <button
                        className="px-3 py-1 rounded bg-orange-500 text-white text-xs font-bold shadow hover:bg-orange-600 transition-colors"
                        onClick={() => {
                          // Convert to Prop object (minimal fields for demo)
                          const newProp: Prop = {
                            id: item.id,
                            userId: 'currentUser',
                            showId: 'demoShow',
                            name: item.description,
                            description: item.note,
                            category: 'Hand Prop', // fallback to 'Other' if not in allowed list
                            price: item.options[0]?.price || 0,
                            quantity: item.quantity || 1,
                            source: 'bought',
                            status: 'in-use',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          setMovedProps(prev => [...prev, newProp]);
                          setItems(prevItems => prevItems.filter(it => it.id !== item.id));
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
                {item.options.map((opt, i) => {
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
                    ${item.type === 'prop' ? 'bg-pb-accent hover:bg-pb-secondary' : ''}
                    ${item.type === 'material' ? 'bg-pb-yellow hover:bg-yellow-500' : ''}
                    ${item.type === 'hired' ? 'bg-pb-primary hover:bg-pb-secondary' : ''}
                  `.replace(/\s+/g, ' ')}
                  style={item.type === 'material' ? { backgroundColor: '#FFD600', color: '#222' } : {}}
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
                  {selectedItem.options.map((opt, i) => (
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
                    setItems(prevItems => prevItems.map(item =>
                      item.id === selectedItem.id ? { ...item, options: updatedOptions } : item
                    ));
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
                    setItems(prevItems => prevItems.map(item =>
                      item.id === selectedItem.id ? { ...item, options: updatedOptions } : item
                    ));
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
                    setItems(prevItems => prevItems.map(item =>
                      item.id === selectedItem.id ? { ...item, options: updatedOptions } : item
                    ));
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