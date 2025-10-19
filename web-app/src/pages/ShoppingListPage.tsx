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

  // Currency formatting helpers
  const formatCurrency = (value: string | number): string => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '' : num.toFixed(2);
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[£,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };
  
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
    budget: '',
    referenceImage: '',
    note: '',
    labels: [] as string[],
    act: '',
    scene: '',
    sceneName: '',
    length: '',
    width: '',
    height: '',
    diameter: '',
    unit: 'cm' as 'mm' | 'cm' | 'in' | 'm' | 'ft',
    weight: '',
    weightUnit: 'kg' as 'kg' | 'lb' | 'g' | 'oz',
    color: '',
    materials: [] as string[],
  });
  const [labelFilter, setLabelFilter] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [convertToPropModalOpen, setConvertToPropModalOpen] = useState(false);
  const [itemToConvert, setItemToConvert] = useState<ShoppingItem | null>(null);
  const [resolvedUserNames, setResolvedUserNames] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [confirmPurchaseModalOpen, setConfirmPurchaseModalOpen] = useState(false);
  const [purchaseToConfirm, setPurchaseToConfirm] = useState<{item: ShoppingItem, optionIndex: number} | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [actualPrice, setActualPrice] = useState<string>('');
  
  // Act/Scene options (matching props form)
  const [actOptions, setActOptions] = useState<{ id: string; name: string }[]>([]);
  const [sceneOptions, setSceneOptions] = useState<{ id: string; name: string }[]>([]);
  const [actsList, setActsList] = useState<any[]>([]);
  
  // Initialize shopping service when Firebase service is ready
  useEffect(() => {
    if (service && user) {
      // Load team members for notification targeting
      loadTeamMembers().then(teamMembers => {
        setShoppingService(new ShoppingService(service, teamMembers, {
          id: user.uid,
          roles: (user as any).roles || []
        }));
      }).catch(error => {
        console.warn('Failed to load team members, creating service without notifications:', error);
        // Fallback: create service without notification targeting
        setShoppingService(new ShoppingService(service));
      });
    }
  }, [service, user, currentShowId]);

  // Load team members for notification targeting
  const loadTeamMembers = async () => {
    if (!currentShowId) return [];
    
    try {
      // Load team members from the current show
      const showDoc = await service.getDocument('shows', currentShowId);
      const teamMembers = showDoc?.data?.teamMembers || [];
      
      // Also load from users collection for additional team data
      const users = await service.getDocuments('users');
      const userMap = new Map(users.map(u => [u.id, u.data]));
      
      const processedTeamMembers = teamMembers.map((member: any) => ({
        id: member.id || member.userId,
        roles: member.roles || ['team_member'],
        email: userMap.get(member.id || member.userId)?.email || member.email || '',
        displayName: userMap.get(member.id || member.userId)?.displayName || member.displayName || member.name || 'Unknown User'
      }));
      
      setTeamMembers(processedTeamMembers);
      return processedTeamMembers;
    } catch (error) {
      console.error('Error loading team members:', error);
      return [];
    }
  };

  // Resolve user name from user ID
  const resolveUserName = async (userId: string): Promise<string> => {
    // Check if we already have this user's name cached
    if (resolvedUserNames[userId]) {
      return resolvedUserNames[userId];
    }

    try {
      // Try to get user from team members first
      const teamMember = teamMembers.find(member => member.id === userId);
      if (teamMember) {
        const userName = teamMember.displayName || teamMember.email || 'Unknown User';
        if (process.env.NODE_ENV === 'development') {
          console.log(`Resolved user name for ${userId}: ${userName}`);
        }
        setResolvedUserNames(prev => ({ ...prev, [userId]: userName }));
        return userName;
      }

      // If not in team members, try to get from users collection
      if (service) {
        const userDoc = await service.getDocument('users', userId);
        if (userDoc?.data) {
          const userName = userDoc.data.displayName || userDoc.data.email || 'Unknown User';
          if (process.env.NODE_ENV === 'development') {
            console.log(`Resolved user name from users collection for ${userId}: ${userName}`);
          }
          setResolvedUserNames(prev => ({ ...prev, [userId]: userName }));
          return userName;
        }
      }

      // Try to get from team members collection as fallback
      if (service) {
        try {
          const teamDoc = await service.getDocument('team_members', userId);
          if (teamDoc?.data) {
            const userName = teamDoc.data.displayName || teamDoc.data.email || teamDoc.data.name || 'Unknown User';
            if (process.env.NODE_ENV === 'development') {
              console.log(`Resolved user name from team_members collection for ${userId}: ${userName}`);
            }
            setResolvedUserNames(prev => ({ ...prev, [userId]: userName }));
            return userName;
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`No team member found for ${userId}, trying other collections`);
          }
        }

        // Try to get from shows collection team members (nested structure)
        try {
          if (currentShowId) {
            const showDoc = await service.getDocument('shows', currentShowId);
            if (showDoc?.data?.teamMembers) {
              const teamMember = showDoc.data.teamMembers.find((member: any) => member.id === userId || member.uid === userId);
              if (teamMember) {
                const userName = teamMember.displayName || teamMember.name || teamMember.email || 'Unknown User';
                if (process.env.NODE_ENV === 'development') {
                  console.log(`Resolved user name from show team members for ${userId}: ${userName}`);
                }
                setResolvedUserNames(prev => ({ ...prev, [userId]: userName }));
                return userName;
              }
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`No show team member found for ${userId}`);
          }
        }
      }

      // Fallback to showing a shortened version of the user ID
      const shortId = userId.substring(0, 8) + '...';
      if (process.env.NODE_ENV === 'development') {
        console.log(`Using shortened ID for ${userId}: ${shortId}`);
      }
      setResolvedUserNames(prev => ({ ...prev, [userId]: shortId }));
      return shortId;
    } catch (error) {
      console.error('Failed to resolve user name:', error);
      const shortId = userId.substring(0, 8) + '...';
      setResolvedUserNames(prev => ({ ...prev, [userId]: shortId }));
      return shortId;
    }
  };

  // Fetch acts/scenes from the show document (matching props form logic)
  useEffect(() => {
    if (!currentShowId) { setActOptions([]); setSceneOptions([]); setActsList([]); return; }
    (async () => {
      try {
        const showDoc = await service.getDocument<any>('shows', currentShowId);
        const rawActs = showDoc?.data?.acts || [];
        const acts = (Array.isArray(rawActs) ? rawActs : []).map((a: any, idx: number) => ({
          id: String(a?.id ?? a?.name ?? idx),
          name: a?.name ?? a?.title ?? `Act ${idx + 1}`,
          scenes: Array.isArray(a?.scenes) ? a.scenes : [],
        }));
        setActsList(acts);
        setActOptions(acts.map(a => ({ id: a.id, name: a.name })));
        // preload scenes based on current act if set
        const chosenAct = acts.find(a => String(a.id) === String(newItem.act));
        const chosenScenes = (chosenAct?.scenes || []).map((s: any, i: number) => ({ id: String(s?.id ?? s?.name ?? i), name: s?.name ?? s?.title ?? String(s) }));
        setSceneOptions(chosenScenes);
      } catch {
        // fallback to flat collections
        try {
          const actDocs = await service.getDocuments('acts', { where: [['showId', '==', currentShowId]] });
          setActOptions(actDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name })));
        } catch { setActOptions([]); }
        try {
          const sceneDocs = await service.getDocuments('scenes', { where: [['showId', '==', currentShowId]] });
          setSceneOptions(sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name })));
        } catch { setSceneOptions([]); }
      }
    })();
  }, [service, currentShowId, newItem.act]);

  const handleActChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setNewItem(prev => ({ ...prev, act: value, sceneName: '' }));
    const chosenAct = actsList.find(a => String(a.id) === String(value));
    if (chosenAct && Array.isArray(chosenAct.scenes)) {
      const normalizedScenes = chosenAct.scenes.map((s: any, i: number) => ({ id: String(s?.id ?? s?.name ?? i), name: s?.name ?? s?.title ?? String(s) }));
      setSceneOptions(normalizedScenes);
    } else {
      try {
        const sceneDocs = await service.getDocuments('scenes', { where: [['showId', '==', currentShowId as string]] });
        setSceneOptions(sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name ?? doc.data.title })));
      } catch { setSceneOptions([]); }
    }
  };

  // Load shopping items from Firebase
  useEffect(() => {
    if (!shoppingService || !user || webAuthLoading) return;
    
    setLoading(true);
    setError(null);
    
    const unsubscribe = shoppingService.listenToShoppingItems(
      (itemDocs) => {
        setItems(itemDocs);
        setLoading(false);
        
        // Resolve user names for options and requestedBy fields
        itemDocs.forEach(item => {
          // Resolve requestedBy user name
          if (item.data?.requestedBy) {
            resolveUserName(item.data.requestedBy);
          }
          
          // Resolve user names for options that don't have uploadedByName
          if (item.data?.options) {
            item.data.options.forEach((option: ShoppingOption) => {
              if (!option.uploadedByName && option.uploadedBy) {
                resolveUserName(option.uploadedBy);
              }
              
              // Resolve user names for comment authors
              if (option.comments) {
                option.comments.forEach((comment: any) => {
                  if (!comment.authorName && comment.author) {
                    resolveUserName(comment.author);
                  }
                });
              }
            });
          }
        });
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

  // Clear validation errors after 5 seconds
  React.useEffect(() => {
    if (validationErrors.length > 0) {
      const timer = setTimeout(() => setValidationErrors([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [validationErrors]);

  // Enhanced form validation
  const validateForm = (item: typeof newItem): string[] => {
    const errors: string[] = [];
    
    if (!item.description.trim()) {
      errors.push('Description is required');
    }
    if (!item.quantity || item.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }
    if (!item.budget || parseCurrency(item.budget) <= 0) {
      errors.push('Budget must be greater than £0.00');
    }
    if (item.type === 'prop' && !item.referenceImage) {
      errors.push('Reference image is required for props');
    }
    if (item.type === 'material' && (!item.materials || item.materials.length === 0)) {
      errors.push('Materials list is required for material requests');
    }
    
    return errors;
  };

  // Convert shopping item to prop
  const handleConvertToProp = async (item: ShoppingItem) => {
    if (!service || !user || !currentShowId) {
      setValidationErrors(['Unable to convert item. Please ensure you are logged in and have a show selected.']);
      return;
    }

    try {
      // Create prop data from shopping item
      const propData = {
        name: item.description,
        description: item.note || item.description,
        category: item.type === 'prop' ? 'prop' : item.type === 'material' ? 'material' : 'hired',
        showId: currentShowId,
        act: item.act,
        scene: item.scene,
        sceneName: item.sceneName,
        length: item.length,
        width: item.width,
        height: item.height,
        depth: item.diameter, // Map diameter to depth for props
        unit: item.unit || 'cm',
        weight: item.weight,
        weightUnit: item.weightUnit || 'kg',
        color: item.color,
        materials: item.materials,
        source: item.type === 'hired' ? 'hired' : 'bought',
        price: item.actualCost || item.budget,
        quantity: item.quantity || 1,
        status: 'available',
        images: item.referenceImage ? [item.referenceImage] : [],
        notes: item.note,
        labels: item.labels,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to props collection
      await service.addDocument('props', propData);

      // Update shopping item status to 'bought' and mark as converted
      await shoppingService?.updateShoppingItem(item.id, {
        status: 'bought',
        actualCost: item.actualCost || item.budget,
        note: `${item.note || ''}\n\n[Converted to prop on ${new Date().toLocaleDateString()}]`.trim()
      });

      setActionMessage('Item successfully converted to prop!');
      setConvertToPropModalOpen(false);
      setItemToConvert(null);
    } catch (error) {
      console.error('Error converting item to prop:', error);
      setValidationErrors(['Failed to convert item to prop. Please try again.']);
    }
  };

  // Open convert to prop modal
  const openConvertToPropModal = (item: ShoppingItem) => {
    setItemToConvert(item);
    setConvertToPropModalOpen(true);
  };

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
    setNewItem({
      type: 'prop',
      description: '',
      quantity: 1,
      budget: '',
      referenceImage: '',
      note: '',
      labels: [],
      act: '',
      scene: '',
      sceneName: '',
      length: '',
      width: '',
      height: '',
      diameter: '',
      unit: 'cm',
      weight: '',
      weightUnit: 'kg',
      color: '',
      materials: []
    });
    setAddItemModalOpen(true);
    setFabOpen(false);
  };
  const handleAddMaterial = () => {
    setNewItem({
      type: 'material',
      description: '',
      quantity: 1,
      budget: '',
      referenceImage: '',
      note: '',
      labels: [],
      act: '',
      scene: '',
      sceneName: '',
      length: '',
      width: '',
      height: '',
      diameter: '',
      unit: 'cm',
      weight: '',
      weightUnit: 'kg',
      color: '',
      materials: []
    });
    setAddItemModalOpen(true);
    setFabOpen(false);
  };
  const handleAddHired = () => {
    setNewItem({
      type: 'hired',
      description: '',
      quantity: 1,
      budget: '',
      referenceImage: '',
      note: '',
      labels: [],
      act: '',
      scene: '',
      sceneName: '',
      length: '',
      width: '',
      height: '',
      diameter: '',
      unit: 'cm',
      weight: '',
      weightUnit: 'kg',
      color: '',
      materials: []
    });
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
  const handleAddOptionSubmit = async () => {
    if (!addOptionItemId) return;
    
    // Clear previous validation errors
    setValidationErrors([]);
    
    const priceValue = parseCurrency(newOption.price);
    const optionErrors: string[] = [];
    
    if (!newOption.shopName) {
      optionErrors.push('Shop name is required');
    }
    if (!priceValue || priceValue <= 0) {
      optionErrors.push('Price must be greater than £0.00');
    }
    if (!newOption.images || newOption.images.length === 0) {
      optionErrors.push('At least one image is required');
    }

    if (optionErrors.length > 0) {
      setValidationErrors(optionErrors);
      return;
    }

    if (!user) {
      setValidationErrors(['You must be logged in to add shopping options.']);
      return;
    }

    if (!shoppingService) {
      setValidationErrors(['Shopping service not available. Please try again.']);
      return;
    }

    try {
      const optionData = {
              images: newOption.images,
        price: priceValue,
              notes: newOption.notes,
        uploadedBy: user.uid,
        uploadedByName: user.displayName || user.email || 'Unknown User',
        status: 'pending' as const,
              shopName: newOption.shopName,
              productUrl: newOption.productUrl,
              comment: '',
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Adding option with data:', optionData);
        console.log('Item ID:', addOptionItemId);
        console.log('Shopping service available:', !!shoppingService);
        
        // Test if we can get the item first
        const testItem = await service.getDocument('shopping_items', addOptionItemId);
        console.log('Test item found:', !!testItem?.data);
      }
      
      await shoppingService.addOptionToItem(addOptionItemId, optionData);
      setActionMessage('Shopping option added successfully!');
    setAddOptionModalOpen(false);
    setAddOptionItemId(null);
    setNewOption({ shopName: '', price: '', notes: '', productUrl: '', images: [] });
    } catch (error) {
      console.error('Error adding shopping option:', error);
      console.error('Error details:', error);
      setValidationErrors([`Failed to add shopping option: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  // Open edit modal for an item
  const openEditItemModal = (item: ShoppingItem) => {
    setEditItem({ ...item });
    setEditItemModalOpen(true);
  };

  // Handle edit item submit
  const handleEditItemSubmit = async () => {
    if (!editItem) return;
    
    // Clear previous validation errors
    setValidationErrors([]);
    
    // Validate form
    const errors = validateForm({
      type: editItem.type || 'prop',
      description: editItem.description,
      quantity: editItem.quantity || 1,
      budget: formatCurrency(editItem.budget ?? ''),
      referenceImage: editItem.referenceImage || '',
      note: editItem.note || '',
      labels: editItem.labels || [],
      act: editItem.act?.toString() || '',
      scene: editItem.scene?.toString() || '',
      sceneName: editItem.sceneName || '',
      length: editItem.length?.toString() || '',
      width: editItem.width?.toString() || '',
      height: editItem.height?.toString() || '',
      diameter: editItem.diameter?.toString() || '',
      unit: editItem.unit || 'cm',
      weight: editItem.weight?.toString() || '',
      weightUnit: editItem.weightUnit || 'kg',
      color: editItem.color || '',
      materials: editItem.materials || []
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!shoppingService) {
      setValidationErrors(['Shopping service not available. Please try again.']);
      return;
    }

    try {
      await shoppingService.updateShoppingItem(editItem.id, {
        description: editItem.description,
        quantity: editItem.quantity,
        budget: editItem.budget,
        referenceImage: editItem.referenceImage,
        note: editItem.note,
        labels: editItem.labels,
        act: editItem.act,
        scene: editItem.scene,
        sceneName: editItem.sceneName,
        length: editItem.length,
        width: editItem.width,
        height: editItem.height,
        diameter: editItem.diameter,
        unit: editItem.unit,
        weight: editItem.weight,
        weightUnit: editItem.weightUnit,
        color: editItem.color,
        materials: editItem.materials,
      });
      setActionMessage('Item updated successfully!');
    setEditItemModalOpen(false);
    setEditItem(null);
    } catch (error) {
      console.error('Error updating shopping item:', error);
      setValidationErrors(['Failed to update item. Please try again.']);
    }
  };

  // Handle add item submit
  const handleAddItemSubmit = async () => {
    // Clear previous validation errors
    setValidationErrors([]);
    
    // Validate form
    const errors = validateForm(newItem);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!user) {
      setValidationErrors(['You must be logged in to add a shopping request.']);
      return;
    }

    if (!shoppingService) {
      setValidationErrors(['Shopping service not available. Please try again.']);
      return;
    }

    try {
      const budgetValue = parseCurrency(newItem.budget);
      const itemData = {
        type: newItem.type,
        description: newItem.description,
        requestedBy: user.uid,
        status: 'pending' as const,
        lastUpdated: new Date().toISOString(),
        options: [],
        quantity: newItem.quantity,
        budget: budgetValue,
        referenceImage: newItem.referenceImage || undefined,
        note: newItem.note,
        labels: newItem.labels,
        showId: currentShowId || undefined,
        act: newItem.act ? Number(newItem.act) : undefined,
        scene: newItem.scene ? Number(newItem.scene) : undefined,
        sceneName: newItem.sceneName || undefined,
        length: newItem.length ? Number(newItem.length) : undefined,
        width: newItem.width ? Number(newItem.width) : undefined,
        height: newItem.height ? Number(newItem.height) : undefined,
        diameter: newItem.diameter ? Number(newItem.diameter) : undefined,
        unit: newItem.unit,
        weight: newItem.weight ? Number(newItem.weight) : undefined,
        weightUnit: newItem.weightUnit,
        color: newItem.color || undefined,
        materials: newItem.materials.length > 0 ? newItem.materials : undefined,
      };
      
      await shoppingService.addShoppingItem(itemData);
      setActionMessage('Shopping request added successfully!');
    setAddItemModalOpen(false);
      setNewItem({ 
        type: 'prop', 
        description: '', 
        quantity: 1, 
        budget: '', 
        referenceImage: '', 
        note: '', 
        labels: [],
        act: '',
        scene: '',
        sceneName: '',
        length: '',
        width: '',
        height: '',
        diameter: '',
        unit: 'cm',
        weight: '',
        weightUnit: 'kg',
        color: '',
        materials: []
      });
    } catch (error) {
      console.error('Error adding shopping item:', error);
      setValidationErrors(['Failed to add shopping request. Please try again.']);
    }
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
                    <div 
                      key={i} 
                      className={`${cardClass} rounded p-2 flex flex-col items-center min-w-[120px] border cursor-pointer hover:scale-105 transition-transform`}
                      onClick={() => {
                        if (!item.data) return;
                        setSelectedItem(item.data);
                        setSelectedOptionIndex(i);
                        setCommentValue(opt.comment || '');
                        setModalOpen(true);
                      }}
                    > 
                      <div className="w-16 h-16 bg-pb-gray/20 rounded mb-2 flex items-center justify-center text-xs text-pb-gray">{opt.images.length > 0 ? <img src={opt.images[0]} alt="option" className="w-full h-full object-cover rounded" /> : 'No Image'}</div>
                      <div className={`${textClass} text-sm font-semibold mb-1`}>£{opt.price}</div>
                      <div className="text-xs text-pb-gray mb-1">{opt.notes}</div>
                      <div className="text-xs text-pb-accent">By: {opt.uploadedByName || resolvedUserNames[opt.uploadedBy] || 'Loading...'}</div>
                      {/* Status badge */}
                      {opt.status === 'pending' && (
                        <span className="mt-1 px-2 py-0.5 rounded bg-gray-600 text-xs font-bold text-white border border-gray-400">Pending</span>
                      )}
                      {opt.status === 'maybe' && (
                        <span className="mt-1 px-2 py-0.5 rounded bg-yellow-600 text-xs font-bold text-white border border-yellow-400">Maybe</span>
                      )}
                      {opt.status === 'buy' && (
                        <span className="mt-1 px-2 py-0.5 rounded bg-green-600 text-xs font-bold text-white border border-green-400">Buy</span>
                      )}
                      {opt.status === 'rejected' && (
                        <span className="mt-1 px-2 py-0.5 rounded bg-red-600 text-xs font-bold text-white border border-red-400">Rejected</span>
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
            <div className="bg-pb-darker rounded-xl p-6 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={handleCloseModal}>&times;</button>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white">{selectedItem.description} ({selectedItem.quantity || 1} x £{selectedItem.budget || 0})</h2>
                    {/* Status pill next to title */}
                    {selectedItem.options[selectedOptionIndex].status === 'pending' && (
                      <span className="px-3 py-1 rounded-full bg-gray-600 text-white text-sm font-semibold">Pending Review</span>
                    )}
                    {selectedItem.options[selectedOptionIndex].status === 'maybe' && (
                      <span className="px-3 py-1 rounded-full bg-yellow-600 text-white text-sm font-semibold">Maybe</span>
                    )}
                    {selectedItem.options[selectedOptionIndex].status === 'buy' && (
                      <span className="px-3 py-1 rounded-full bg-green-600 text-white text-sm font-semibold">Approved to Buy</span>
                    )}
                    {selectedItem.options[selectedOptionIndex].status === 'rejected' && (
                      <span className="px-3 py-1 rounded-full bg-red-600 text-white text-sm font-semibold">Rejected</span>
                    )}
                  </div>
                  <div>
                    <span className="px-2 py-1 rounded bg-pb-accent text-xs text-white uppercase">{selectedItem.type}</span>
                    <span className="ml-2 text-xs text-pb-gray">Requested by: {resolvedUserNames[selectedItem.requestedBy] || 'Loading...'}</span>
                  </div>
                </div>
                
                {/* Action Buttons - Top Right with more spacing from close button */}
                <div className="flex gap-2 flex-wrap mr-8">
                  <button
                    className={`px-3 py-1 rounded-lg font-semibold shadow transition-all duration-200 text-sm ${
                      updatingStatus === 'rejected' 
                        ? 'bg-red-400 text-white cursor-not-allowed opacity-75' 
                        : selectedItem.options[selectedOptionIndex].status === 'rejected' 
                          ? 'bg-red-600 text-white ring-2 ring-red-400' 
                          : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
                    }`}
                    disabled={updatingStatus === 'rejected'}
                    onClick={async () => {
                      if (updatingStatus) return; // Prevent multiple clicks
                      
                      setUpdatingStatus('rejected');
                      
                      const updatedOptions = [...selectedItem.options];
                      updatedOptions[selectedOptionIndex] = {
                        ...updatedOptions[selectedOptionIndex],
                        status: 'rejected',
                      };
                      
                      // Update local state immediately
                      setSelectedItem({ ...selectedItem, options: updatedOptions });
                      setItems(prevItems => prevItems.map(item =>
                        item.id === selectedItem.id ? { ...item, data: { ...item.data, options: updatedOptions } } : item
                      ));
                      
                      // Save to Firebase
                      if (shoppingService && selectedItem) {
                        try {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('Updating option status to rejected for item:', selectedItem.id, 'option:', selectedOptionIndex);
                          }
                          await shoppingService.updateOption(selectedItem.id, selectedOptionIndex, { status: 'rejected' });
                          if (process.env.NODE_ENV === 'development') {
                            console.log('Successfully updated option status to rejected');
                          }
                          setActionMessage('❌ Option rejected');
                        } catch (error) {
                          console.error('Failed to update option status:', error);
                          setActionMessage('❌ Failed to save status. Please try again.');
                        } finally {
                          setUpdatingStatus(null);
                        }
                      } else {
                        setUpdatingStatus(null);
                      }
                    }}
                  >
                    ❌ Reject
                  </button>
                  <button
                    className={`px-3 py-1 rounded-lg font-semibold shadow transition-all duration-200 text-sm ${
                      updatingStatus === 'maybe' 
                        ? 'bg-yellow-400 text-white cursor-not-allowed opacity-75' 
                        : selectedItem.options[selectedOptionIndex].status === 'maybe' 
                          ? 'bg-yellow-600 text-white ring-2 ring-yellow-400' 
                          : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105'
                    }`}
                    disabled={updatingStatus === 'maybe'}
                    onClick={async () => {
                      if (updatingStatus) return; // Prevent multiple clicks
                      
                      setUpdatingStatus('maybe');
                      
                      const updatedOptions = [...selectedItem.options];
                      updatedOptions[selectedOptionIndex] = {
                        ...updatedOptions[selectedOptionIndex],
                        status: 'maybe',
                      };
                      
                      // Update local state immediately
                      setSelectedItem({ ...selectedItem, options: updatedOptions });
                      setItems(prevItems => prevItems.map(item =>
                        item.id === selectedItem.id ? { ...item, data: { ...item.data, options: updatedOptions } } : item
                      ));
                      
                      // Save to Firebase
                      if (shoppingService && selectedItem) {
                        try {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('Updating option status to maybe for item:', selectedItem.id, 'option:', selectedOptionIndex);
                          }
                          await shoppingService.updateOption(selectedItem.id, selectedOptionIndex, { status: 'maybe' });
                          if (process.env.NODE_ENV === 'development') {
                            console.log('Successfully updated option status to maybe');
                          }
                          setActionMessage('🤔 Marked as maybe');
                        } catch (error) {
                          console.error('Failed to update option status:', error);
                          setActionMessage('🤔 Failed to save status. Please try again.');
                        } finally {
                          setUpdatingStatus(null);
                        }
                      } else {
                        setUpdatingStatus(null);
                      }
                    }}
                  >
                    🤔 Maybe
                  </button>
                  <button
                    className={`px-3 py-1 rounded-lg font-semibold shadow transition-all duration-200 text-sm ${
                      selectedItem.options[selectedOptionIndex].status === 'buy' 
                        ? 'bg-green-600 text-white ring-2 ring-green-400' 
                        : 'bg-green-500 text-white hover:bg-green-600 hover:scale-105'
                    }`}
                    onClick={() => {
                      // Open confirmation modal instead of directly marking as bought
                      setPurchaseToConfirm({ item: selectedItem, optionIndex: selectedOptionIndex });
                      setConfirmPurchaseModalOpen(true);
                    }}
                  >
                    ✅ Buy This
                  </button>
                </div>
              </div>
              {/* 2-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Reference Image */}
                <div className="space-y-4">
                  {(selectedItem.type === 'prop' || selectedItem.type === 'hired') && selectedItem.referenceImage && (
                    <div className="relative">
                      <img
                        src={selectedItem.referenceImage}
                        alt="Reference Image"
                        className="w-full max-w-sm h-auto object-cover rounded border-2 border-pb-primary/60 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                        onClick={() => { setReferenceImageUrl(selectedItem.referenceImage || null); setReferenceModalOpen(true); }}
                        title="Click to view full size"
                      />
                      {/* Label overlaid on image */}
                      <div className="absolute top-2 left-2 inline-flex items-center gap-2 px-3 py-1 bg-pb-primary/90 text-white text-sm rounded-full backdrop-blur-sm">
                        <span>📷</span>
                        <span>Reference Image</span>
                      </div>
                      <p className="text-xs text-pb-gray mt-2 text-center">Click to view full size</p>
                    </div>
                  )}
                </div>

                {/* Right Column - Shopping Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-pb-primary">Shopping Options</h3>
                  
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
                </div>
              </div>
              {/* Comments Section */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-pb-primary">Comments</label>
                </div>
                
                {/* Add new comment form */}
                <div className="mb-3">
                  <textarea
                    className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                    rows={3}
                    placeholder="Add a comment..."
                    value={commentValue}
                    onChange={e => setCommentValue(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      className="px-4 py-2 rounded bg-pb-accent text-white text-sm font-semibold hover:bg-pb-secondary transition-colors"
                      onClick={() => {
                        if (!commentValue.trim() || !user) return;
                        
                        const newComment = {
                          id: Date.now().toString(),
                          text: commentValue.trim(),
                          author: user.uid,
                          authorName: user.displayName || user.email || 'Unknown User',
                          timestamp: new Date().toISOString(),
                          type: 'supervisor' as const
                        };
                        
                        const updatedOptions = [...selectedItem.options];
                        const currentOption = updatedOptions[selectedOptionIndex];
                        const existingComments = currentOption.comments || [];
                        
                        updatedOptions[selectedOptionIndex] = {
                          ...currentOption,
                          comments: [...existingComments, newComment],
                          comment: commentValue.trim() // Keep for backward compatibility
                        };
                        
                        setSelectedItem({ ...selectedItem, options: updatedOptions });
                        setItems(prevItems => prevItems.map(item =>
                          item.id === selectedItem.id ? { ...item, options: updatedOptions } : item
                        ));
                        
                        // Save to Firebase
                        if (shoppingService && selectedItem) {
                          shoppingService.updateOption(selectedItem.id, selectedOptionIndex, { 
                            comments: updatedOptions[selectedOptionIndex].comments,
                            comment: commentValue.trim()
                          });
                        }
                        
                        // Clear the form
                        setCommentValue('');
                      }}
                      disabled={!commentValue.trim()}
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
                
                {/* Display existing comments in date/time order */}
                {selectedItem.options[selectedOptionIndex].comments && selectedItem.options[selectedOptionIndex].comments!.length > 0 && (
                  <div className="space-y-2">
                    {[...selectedItem.options[selectedOptionIndex].comments!]
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((comment, index) => (
                        <div key={comment.id || index} className="p-3 bg-pb-darker/50 rounded-lg border border-pb-gray/30">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-pb-accent">
                                {resolvedUserNames[comment.author] || comment.authorName || 'Unknown User'}
                              </span>
                              <span className="text-xs text-pb-gray">
                                {new Date(comment.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              comment.type === 'supervisor' ? 'bg-pb-primary text-white' :
                              comment.type === 'shopper' ? 'bg-pb-accent text-white' :
                              'bg-pb-gray text-white'
                            }`}>
                              {comment.type}
                            </span>
                          </div>
                          <p className="text-sm text-white">{comment.text}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              
              {/* Convert to Prop Button - only show if item has been marked as 'buy' */}
              {selectedItem.options.some(opt => opt.status === 'buy') && (
                <div className="mb-4">
                  <button
                    className="w-full px-4 py-2 rounded font-semibold shadow transition-colors bg-pb-primary text-white hover:bg-pb-primary/80"
                    onClick={() => openConvertToPropModal(selectedItem)}
                  >
                    🎭 Convert to Prop
                  </button>
                </div>
              )}
              
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
                <div className="text-xs text-pb-accent">By: {selectedItem.options[selectedOptionIndex].uploadedByName || resolvedUserNames[selectedItem.options[selectedOptionIndex].uploadedBy] || 'Loading...'}</div>
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
              
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <div className="text-red-200 font-semibold mb-1">Please fix the following errors:</div>
                  <ul className="text-red-100 text-sm list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                <input 
                  type="text" 
                  className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                  value={newOption.price} 
                  onChange={e => setNewOption(opt => ({ ...opt, price: e.target.value }))}
                  placeholder="0.00"
                />
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
                <div className="bg-pb-darker rounded-xl p-6 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setEditItemModalOpen(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-white">Edit Item</h2>
                  
                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <div className="text-red-200 font-semibold mb-1">Please fix the following errors:</div>
                      <ul className="text-red-100 text-sm list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
              </div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Basic Information */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-pb-primary mb-2">Basic Information</h3>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Title*</label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={editItem.description} onChange={e => setEditItem(item => item ? { ...item, description: e.target.value } : item)} />
              </div>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Note</label>
                <textarea className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" rows={2} value={editItem.note || ''} onChange={e => setEditItem(item => item ? { ...item, note: e.target.value } : item)} />
              </div>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Labels <span className="text-pb-gray">(comma separated, e.g. Screwfix, Flower Market)</span></label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={(editItem.labels || []).join(', ')} onChange={e => setEditItem(item => item ? { ...item, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean) } : item)} />
              </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                <label className="block text-xs text-pb-gray mb-1">Quantity*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={editItem.quantity ?? ''} onChange={e => setEditItem(item => item ? { ...item, quantity: Number(e.target.value) } : item)} />
              </div>
                        <div>
                <label className="block text-xs text-pb-gray mb-1">Budget (£)*</label>
                          <input 
                            type="text" 
                            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={formatCurrency(editItem.budget ?? '')} 
                            onChange={e => setEditItem(item => item ? { ...item, budget: parseCurrency(e.target.value) } : item)}
                            placeholder="0.00"
                          />
              </div>
                      </div>
                    </div>

                    {/* Right Column - Show Assignment & Dimensions */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-pb-primary mb-2">Show Assignment & Details</h3>
                      
                      {/* Reference Image */}
                      <div className="mb-2">
                        <label className="block text-xs text-pb-gray mb-1">
                          Reference Image <span className="text-pb-primary">*</span>
                          <span className="text-pb-gray ml-1">(Image showing what the prop should look like)</span>
                        </label>
                        {editItem.referenceImage && (
                          <div className="mb-2">
                            <div className="inline-flex items-center gap-2 px-2 py-1 bg-pb-primary/20 text-pb-primary text-xs rounded-full mb-2">
                              <span>📷</span>
                              <span>Reference Image</span>
                            </div>
                            <img src={editItem.referenceImage} alt="Reference Image" className="w-20 h-20 object-cover rounded border-2 border-pb-primary/60 shadow-lg" />
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-pb-primary file:text-white hover:file:bg-pb-secondary"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setEditItem(item => item ? { ...item, referenceImage: reader.result as string } : item);
                            reader.readAsDataURL(file);
                          }} 
                        />
                      </div>
              
                      {/* Act and Scene Fields */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs text-pb-gray mb-1">Act</label>
                          <select 
                            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.act ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, act: Number(e.target.value) } : item)}
                          >
                            <option value="">Select Act</option>
                            {actOptions.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-pb-gray mb-1">Scene</label>
                          <select 
                            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.sceneName ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, sceneName: e.target.value } : item)}
                          >
                            <option value="">Select Scene</option>
                            {sceneOptions.map(scene => <option key={scene.id} value={scene.name}>{scene.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      {/* Dimensions Fields */}
                      <div className="mb-3">
                        <label className="block text-xs text-pb-gray mb-1">Dimensions</label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.length ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, length: Number(e.target.value) } : item)}
                            placeholder="Length"
                            step="0.1"
                            min="0"
                          />
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.width ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, width: Number(e.target.value) } : item)}
                            placeholder="Width"
                            step="0.1"
                            min="0"
                          />
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.height ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, height: Number(e.target.value) } : item)}
                            placeholder="Height"
                            step="0.1"
                            min="0"
                          />
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.diameter ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, diameter: Number(e.target.value) } : item)}
                            placeholder="Diameter"
                            step="0.1"
                            min="0"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select 
                            className="w-20 p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary text-sm" 
                            value={editItem.unit ?? 'cm'} 
                            onChange={e => setEditItem(item => item ? { ...item, unit: e.target.value as 'mm' | 'cm' | 'in' | 'm' | 'ft' } : item)}
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                            <option value="in">in</option>
                            <option value="ft">ft</option>
                          </select>
                          <input 
                            type="number" 
                            className="flex-1 p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={editItem.weight ?? ''} 
                            onChange={e => setEditItem(item => item ? { ...item, weight: Number(e.target.value) } : item)}
                            placeholder="Weight"
                            step="0.1"
                            min="0"
                          />
                          <select 
                            className="w-16 p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary text-sm" 
                            value={editItem.weightUnit ?? 'kg'} 
                            onChange={e => setEditItem(item => item ? { ...item, weightUnit: e.target.value as 'kg' | 'lb' | 'g' | 'oz' } : item)}
                          >
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="mt-4 flex justify-center">
                    <button className="px-8 py-3 rounded bg-pb-accent text-white font-semibold shadow hover:bg-pb-secondary transition-colors" onClick={handleEditItemSubmit}>
                      Save Changes
                    </button>
                  </div>
            </div>
          </div>
        )}
        {/* Add Item Modal */}
        {addItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-pb-darker rounded-xl p-6 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setAddItemModalOpen(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-white">Add Request</h2>
                  
                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <div className="text-red-200 font-semibold mb-1">Please fix the following errors:</div>
                      <ul className="text-red-100 text-sm list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Basic Information */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-pb-primary mb-2">Basic Information</h3>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Type*</label>
                <select className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.type} onChange={e => setNewItem(item => ({ ...item, type: e.target.value as 'prop' | 'material' | 'hired' }))}>
                  <option value="prop">Prop</option>
                  <option value="material">Material</option>
                  <option value="hired">Hired</option>
                </select>
              </div>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Title*</label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.description} onChange={e => setNewItem(item => ({ ...item, description: e.target.value }))} />
              </div>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Note</label>
                <textarea className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" rows={2} value={newItem.note} onChange={e => setNewItem(item => ({ ...item, note: e.target.value }))} />
              </div>
                      
                      <div className="mb-2">
                <label className="block text-xs text-pb-gray mb-1">Labels <span className="text-pb-gray">(comma separated, e.g. Screwfix, Flower Market)</span></label>
                <input type="text" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.labels.join(', ')} onChange={e => setNewItem(item => ({ ...item, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean) }))} />
              </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                <label className="block text-xs text-pb-gray mb-1">Quantity*</label>
                <input type="number" className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" value={newItem.quantity} onChange={e => setNewItem(item => ({ ...item, quantity: Number(e.target.value) }))} />
              </div>
                        <div>
                <label className="block text-xs text-pb-gray mb-1">Budget (£)*</label>
                          <input 
                            type="text" 
                            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.budget} 
                            onChange={e => setNewItem(item => ({ ...item, budget: e.target.value }))}
                            placeholder="0.00"
                          />
              </div>
                      </div>
                    </div>

                    {/* Right Column - Show Assignment & Dimensions */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-pb-primary mb-2">Show Assignment & Details</h3>
                      
                      {/* Reference Image */}
                      <div className="mb-2">
                        <label className="block text-xs text-pb-gray mb-1">
                          Reference Image <span className="text-pb-primary">*</span>
                          <span className="text-pb-gray ml-1">(Image showing what the prop should look like)</span>
                        </label>
                {newItem.referenceImage && (
                          <div className="mb-2">
                            <div className="inline-flex items-center gap-2 px-2 py-1 bg-pb-primary/20 text-pb-primary text-xs rounded-full mb-2">
                              <span>📷</span>
                              <span>Reference Image</span>
                            </div>
                            <img src={newItem.referenceImage} alt="Reference Image" className="w-20 h-20 object-cover rounded border-2 border-pb-primary/60 shadow-lg" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-pb-primary file:text-white hover:file:bg-pb-secondary"
                          onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setNewItem(item => ({ ...item, referenceImage: reader.result as string }));
                  reader.readAsDataURL(file);
                          }}
                        />
              </div>
              
                      {/* Act and Scene Fields */}
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="block text-xs text-pb-gray mb-1">Act</label>
                          <select 
                            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.act} 
                            onChange={handleActChange}
                          >
                            <option value="">Select Act</option>
                            {actOptions.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-pb-gray mb-1">Scene</label>
                          <select 
                            className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.sceneName} 
                            onChange={e => setNewItem(item => ({ ...item, sceneName: e.target.value }))}
                          >
                            <option value="">Select Scene</option>
                            {sceneOptions.map(scene => <option key={scene.id} value={scene.name}>{scene.name}</option>)}
                          </select>
                        </div>
                      </div>
              
                      {/* Dimensions Fields */}
                      <div className="mb-2">
                        <label className="block text-xs text-pb-gray mb-1">Dimensions</label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.length} 
                            onChange={e => setNewItem(item => ({ ...item, length: e.target.value }))}
                            placeholder="Length"
                            step="0.1"
                            min="0"
                          />
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.width} 
                            onChange={e => setNewItem(item => ({ ...item, width: e.target.value }))}
                            placeholder="Width"
                            step="0.1"
                            min="0"
                          />
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.height} 
                            onChange={e => setNewItem(item => ({ ...item, height: e.target.value }))}
                            placeholder="Height"
                            step="0.1"
                            min="0"
                          />
                          <input 
                            type="number" 
                            className="p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.diameter} 
                            onChange={e => setNewItem(item => ({ ...item, diameter: e.target.value }))}
                            placeholder="Diameter"
                            step="0.1"
                            min="0"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select 
                            className="w-20 p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary text-sm" 
                            value={newItem.unit} 
                            onChange={e => setNewItem(item => ({ ...item, unit: e.target.value as 'mm' | 'cm' | 'in' | 'm' | 'ft' }))}
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                            <option value="in">in</option>
                            <option value="ft">ft</option>
                          </select>
                          <input 
                            type="number" 
                            className="flex-1 p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary" 
                            value={newItem.weight} 
                            onChange={e => setNewItem(item => ({ ...item, weight: e.target.value }))}
                            placeholder="Weight"
                            step="0.1"
                            min="0"
                          />
                          <select 
                            className="w-16 p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary text-sm" 
                            value={newItem.weightUnit} 
                            onChange={e => setNewItem(item => ({ ...item, weightUnit: e.target.value as 'kg' | 'lb' | 'g' | 'oz' }))}
                          >
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="mt-4 flex justify-center">
                    <button className="px-8 py-3 rounded bg-pb-accent text-white font-semibold shadow hover:bg-pb-secondary transition-colors" onClick={handleAddItemSubmit}>
                      Add Request
                    </button>
                  </div>
            </div>
          </div>
        )}
        {/* Reference Image Fullscreen Modal */}
        {referenceModalOpen && referenceImageUrl && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90" onClick={() => setReferenceModalOpen(false)}>
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pb-primary/20 text-pb-primary text-lg rounded-full">
                <span>📷</span>
                <span>Reference Image</span>
              </div>
            </div>
            <img src={referenceImageUrl} alt="Reference Image Full Size" className="max-w-full max-h-full rounded shadow-lg border-4 border-pb-accent" />
            <p className="mt-4 text-white text-sm opacity-75">Click anywhere to close</p>
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

      {/* Confirm Purchase Modal */}
      {confirmPurchaseModalOpen && purchaseToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-pb-darker rounded-xl p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto scrollbar-hide">
            <button className="absolute top-2 right-2 text-white text-xl" onClick={() => {
              setConfirmPurchaseModalOpen(false);
              setReceiptImage(null);
              setActualPrice('');
            }}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-white">Confirm Purchase</h2>
            
            <div className="mb-4">
              <p className="text-pb-gray mb-3">Upload your receipt to confirm this purchase:</p>
              
              {/* Item details */}
              <div className="bg-pb-darker/50 rounded-lg p-4 border border-pb-gray/30 mb-4">
                <h3 className="text-white font-semibold mb-2">{purchaseToConfirm.item.description}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-pb-gray">Estimated Price:</span>
                    <span className="text-white font-semibold">£{purchaseToConfirm.item.options[purchaseToConfirm.optionIndex].price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pb-gray">Quantity:</span>
                    <span className="text-white">{purchaseToConfirm.item.quantity || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pb-gray">Shop:</span>
                    <span className="text-white">{purchaseToConfirm.item.options[purchaseToConfirm.optionIndex].shopName || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Upload Section */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-pb-primary mb-2">
                  📄 Receipt Image <span className="text-red-400">*</span>
                </label>
                
                {receiptImage ? (
                  <div className="relative">
                    <img 
                      src={receiptImage} 
                      alt="Receipt" 
                      className="w-full max-w-sm h-auto rounded border-2 border-green-400 shadow-lg"
                    />
                    <button
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700"
                      onClick={() => setReceiptImage(null)}
                    >
                      ×
                    </button>
                    <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                      <span>✓</span>
                      <span>Receipt uploaded successfully</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-pb-gray/50 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="receipt-upload"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setReceiptImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <div className="text-pb-gray mb-2">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-pb-gray text-sm">Click to upload receipt image</p>
                      <p className="text-pb-gray text-xs mt-1">PNG, JPG, or JPEG files</p>
                    </label>
                  </div>
                )}
              </div>

              {/* Actual Price Input (Optional) */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-pb-primary mb-2">
                  💰 Actual Price Paid (Optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                  placeholder="Enter actual price if different from estimated"
                  value={actualPrice}
                  onChange={e => setActualPrice(e.target.value)}
                />
                <p className="text-xs text-pb-gray mt-1">Leave empty to use estimated price</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded bg-pb-gray text-white font-semibold hover:bg-pb-gray/80 transition-colors"
                onClick={() => {
                  setConfirmPurchaseModalOpen(false);
                  setReceiptImage(null);
                  setActualPrice('');
                }}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:bg-pb-gray/50 disabled:cursor-not-allowed"
                disabled={!receiptImage}
                onClick={() => {
                  if (!receiptImage || !user) return;
                  
                  // Mark as bought with receipt information
                  const updatedOptions = [...purchaseToConfirm.item.options];
                  const actualPriceValue = actualPrice.trim() ? parseFloat(actualPrice) : undefined;
                  
                  updatedOptions[purchaseToConfirm.optionIndex] = {
                    ...updatedOptions[purchaseToConfirm.optionIndex],
                    status: 'buy',
                    receiptImage: receiptImage,
                    receiptUploadedBy: user.uid,
                    receiptUploadedByName: user.displayName || user.email || 'Unknown User',
                    receiptUploadedAt: new Date().toISOString(),
                    actualPurchasePrice: actualPriceValue
                  };
                  
                  setSelectedItem({ ...purchaseToConfirm.item, options: updatedOptions });
                  setItems(prevItems => prevItems.map(item =>
                    item.id === purchaseToConfirm.item.id ? { ...item, options: updatedOptions } : item
                  ));
                  
                  // Save to Firebase
                  if (shoppingService) {
                    shoppingService.updateOption(purchaseToConfirm.item.id, purchaseToConfirm.optionIndex, { 
                      status: 'buy',
                      receiptImage: receiptImage,
                      receiptUploadedBy: user.uid,
                      receiptUploadedByName: user.displayName || user.email || 'Unknown User',
                      receiptUploadedAt: new Date().toISOString(),
                      actualPurchasePrice: actualPriceValue
                    });
                  }
                  
                  // Close confirmation modal and open convert to prop modal
                  setConfirmPurchaseModalOpen(false);
                  setReceiptImage(null);
                  setActualPrice('');
                  setItemToConvert(purchaseToConfirm.item);
                  setConvertToPropModalOpen(true);
                  setActionMessage('✅ Purchase confirmed with receipt! Ready to convert to prop.');
                }}
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Prop Modal */}
      {convertToPropModalOpen && itemToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-pb-darker rounded-xl p-6 max-w-md w-full relative max-h-[90vh] overflow-y-auto scrollbar-hide">
            <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setConvertToPropModalOpen(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-white">Convert to Prop</h2>
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="text-red-200 font-semibold mb-1">Please fix the following errors:</div>
                <ul className="text-red-100 text-sm list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mb-4">
              <p className="text-pb-gray mb-2">Are you sure you want to convert this shopping item to a prop?</p>
              <div className="bg-pb-primary/10 p-3 rounded-lg">
                <h3 className="font-semibold text-white">{itemToConvert.description}</h3>
                <p className="text-sm text-pb-gray">Type: {itemToConvert.type}</p>
                <p className="text-sm text-pb-gray">Quantity: {itemToConvert.quantity}</p>
                <p className="text-sm text-pb-gray">Budget: £{itemToConvert.budget}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                className="flex-1 px-4 py-2 rounded bg-pb-gray text-white font-semibold shadow hover:bg-pb-gray/80 transition-colors" 
                onClick={() => setConvertToPropModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-4 py-2 rounded bg-pb-primary text-white font-semibold shadow hover:bg-pb-primary/80 transition-colors" 
                onClick={() => handleConvertToProp(itemToConvert)}
              >
                Convert to Prop
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ShoppingListPage; 