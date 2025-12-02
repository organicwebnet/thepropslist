import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as DefaultText,
  TextInput,
  View as DefaultView,
  View,
} from 'react-native';
import { FAB } from 'react-native-paper';
import { DraxProvider, DraxView, DraxList } from 'react-native-drax';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

import { Text as ThemedText, View as ThemedView } from '../../src/components/Themed';
import CardDetailPanel from '../../src/components/taskManager/CardDetailPanel';
import { useAuth } from '../../src/contexts/AuthContext';
import { useFirebase } from '../../src/platforms/mobile/contexts/FirebaseContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { BoardData, CardData, ListData, MemberData } from '../../src/shared/types/taskManager';
import { darkTheme, lightTheme } from '../../src/styles/theme';
import BoardList from '../../src/components/taskManager/BoardList';
import TodoView from '../../src/components/taskManager/TodoView';
import { useProps } from '../../src/hooks/useProps';
import { OfflineSyncManager } from '../../src/platforms/mobile/features/offline/OfflineSyncManager';
import type { Prop } from '../../src/shared/types/props';
import { SyncStatusBar } from '../../src/components/SyncStatusBar';
import { TaskCompletionService } from '../../src/shared/services/TaskCompletionService';

const LIST_WIDTH = 280;
const LIST_SPACING = 16;

// Define a type for the layout of the lists
interface ListLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Standard lists and their filtering logic
const STANDARD_LISTS = [
  { name: 'To-Do', filter: (prop: Prop) => !['to_buy', 'on_order', 'being_modified', 'damaged_awaiting_repair', 'out_for_repair'].includes(prop.status) },
  { name: 'Shopping', filter: (prop: Prop) => prop.status === 'to_buy' },
  { name: 'Deliveries', filter: (prop: Prop) => prop.status === 'on_order' },
  { name: 'Make', filter: (prop: Prop) => prop.status === 'being_modified' },
  { name: 'Repair', filter: (prop: Prop) => ['damaged_awaiting_repair', 'out_for_repair'].includes(prop.status) },
];

const centralStyles = StyleSheet.create({
  flex1: { flex: 1 },
  alignCenter: { alignItems: 'center' },
  flex1AlignCenter: { flex: 1, alignItems: 'center' },
  paddingVertical8: { paddingVertical: 8 },
  font12: { fontSize: 12 },
});

const TaskBoardDetailScreen = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
  const selectedCardId = Array.isArray(params.selectedCardId)
    ? params.selectedCardId[0]
    : params.selectedCardId;
  const router = useRouter();
  const { service: firebaseService, isInitialized: isFirebaseInitialized } = useFirebase();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkTheme.colors : lightTheme.colors;

  const [board, setBoard] = useState<BoardData | null>(null);
  const [show, setShow] = useState<any | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({});
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFromCache, setLoadingFromCache] = useState(true);
  const [syncingFromNetwork, setSyncingFromNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State to manage list layouts for drop detection
  const [listLayouts, setListLayouts] = useState<Record<string, ListLayout>>({});
  const listLayoutsRef = useRef(listLayouts);
  listLayoutsRef.current = listLayouts;

  const memoizedMembers = useMemo(() => members, [members]);
  const availableLabels = useMemo(() => {
    return [
      { id: 'label-1', name: 'Bug', color: '#d73a4a' },
      { id: 'label-2', name: 'Feature', color: '#0e8a16' },
      { id: 'label-3', name: 'Chore', color: '#fbca04' },
      { id: 'label-4', name: 'Design', color: '#1d76db' },
    ];
  }, []);

  // --- Modal State ---
  const [isAddListModalVisible, setAddListModalVisible] = useState(false);
  const [isAddCardModalVisible, setAddCardModalVisible] = useState(false);
  const [newCardListId, setNewCardListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');

  // --- FAB Speed Dial State ---
  const [fabOpen, setFabOpen] = useState(false);

  // --- View Mode State ---
  // Always use todo view (Microsoft Todo style) for Android app
  const [viewMode, setViewMode] = useState<'kanban' | 'todo'>('todo');

  // --- Detail Panel State ---
  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    for (const listId of Object.keys(cards)) {
      const card = cards[listId].find(c => c.id === selectedCardId);
      if (card) return card;
    }
    return null;
  }, [selectedCardId, cards]);

  const { props: allProps } = useProps(board?.showId);

  // Filter cards to only show tasks for the current show
  // Cards with propId must have a prop that belongs to the current show
  // Cards without propId are fine (they belong to the board which has the correct showId)
  const filteredCardsForShow = useMemo(() => {
    if (!board?.showId) return cards;
    
    const filtered: Record<string, CardData[]> = {};
    const propIds = new Set(allProps.map(p => p.id));
    
    Object.keys(cards).forEach(listId => {
      filtered[listId] = cards[listId].filter(card => {
        // If card has a propId, it must be in the current show's props
        if (card.propId) {
          return propIds.has(card.propId);
        }
        // Cards without propId belong to the board, so they're fine
        return true;
      });
    });
    
    return filtered;
  }, [cards, allProps, board?.showId]);

  // Initialize OfflineSyncManager (mobile only)
  const offlineSyncManager = firebaseService?.firestore ? OfflineSyncManager.getInstance(firebaseService.firestore) : null;
  useEffect(() => {
    if (offlineSyncManager) {
      offlineSyncManager.initialize().catch(console.error);
    }
  }, [offlineSyncManager]);

  // NEW: Load cached data immediately for fast startup
  useEffect(() => {
    if (!boardId || !offlineSyncManager) return;
    
    const loadCachedData = async () => {
      try {
        // Load all cached data in parallel for maximum speed
        const [cachedBoard, cachedLists, cachedCards] = await Promise.all([
          offlineSyncManager.getCachedDocument('todo_boards', boardId),
          offlineSyncManager.getCachedDocument('board_lists', boardId),
          offlineSyncManager.getCachedDocument('board_cards', boardId)
        ]);
        
        let hasAnyCache = false;
        
        if (cachedBoard) {
          setBoard(cachedBoard);
          hasAnyCache = true;
          
          // Load cached show data if available
          if (cachedBoard.showId) {
            const cachedShow = await offlineSyncManager.getCachedDocument('shows', cachedBoard.showId);
            if (cachedShow) {
              setShow(cachedShow);
            }
          }
        }

        if (cachedLists && Array.isArray(cachedLists)) {
          setLists(cachedLists);
          hasAnyCache = true;
        }

        if (cachedCards) {
          setCards(cachedCards);
          hasAnyCache = true;
        }
        
        if (hasAnyCache) {
          setLoading(false);
          setLoadingFromCache(false);
        }

      } catch (error) {
        console.error('Error loading cached data:', error);
      } finally {
        setLoadingFromCache(false);
      }
    };

    loadCachedData();
  }, [boardId, offlineSyncManager]);

  // Add refresh function for manual cache refresh
  const refreshData = useCallback(async () => {
    if (!firebaseService || !boardId) return;
    
    setSyncingFromNetwork(true);
    
    // Clear cache and reload
    if (offlineSyncManager) {
      // Force reload by setting state
      setLoading(true);
      // Network listeners will handle the rest
    }
    
    setTimeout(() => setSyncingFromNetwork(false), 2000); // Auto-hide after 2s
  }, [firebaseService, boardId, offlineSyncManager]);

  // Enhanced data fetching with caching
  useEffect(() => {
    if (!firebaseService || !boardId || !isFirebaseInitialized) return;
    
    // Only set loading to true if we don't have cached data
    if (!board && !lists.length) {
      setLoading(true);
    }
    
    // Indicate that we're syncing from network
    setSyncingFromNetwork(true);

    const boardPath = `todo_boards/${boardId}`;
    const listsPath = `${boardPath}/lists`;

    const unsubscribeBoard = firebaseService.listenToDocument<BoardData>(
      boardPath,
      async boardDoc => {
        if (boardDoc.exists) {
          const boardData = { ...boardDoc.data, id: boardDoc.id };
          setBoard(boardData);
          
          // Cache board data for fast loading next time
          if (offlineSyncManager) {
            await offlineSyncManager.cacheDocument('todo_boards', boardId, boardData);
          }
          
          // Fetch show data if showId exists
          if (boardData.showId) {
            try {
              const showDoc = await firebaseService.getDocument('shows', boardData.showId);
              if (showDoc && showDoc.exists && showDoc.data) {
                const showData = { ...showDoc.data, id: showDoc.id };
                setShow(showData);
                
                // Cache show data
                if (offlineSyncManager) {
                  await offlineSyncManager.cacheDocument('shows', boardData.showId, showData);
                }
              }
            } catch (err) {
              console.error('Error loading show:', err);
            }
          }
        } else {
          setError('Board not found.');
        }
        setLoading(false);
        setSyncingFromNetwork(false);
      },
      err => {
        console.error('Error loading board:', err);
        setError('Could not load the board.');
        setLoading(false);
        setSyncingFromNetwork(false);
      },
    );

    const unsubscribeLists = firebaseService.listenToCollection<ListData>(
      listsPath,
      async listDocs => {
        const sortedLists = listDocs
          .map(doc => ({ ...doc.data, id: doc.id } as ListData))
          .sort((a, b) => a.order - b.order);

        setLists(sortedLists);
        
        // Cache lists data for fast loading next time
        if (offlineSyncManager) {
          await offlineSyncManager.cacheDocument('board_lists', boardId, sortedLists);
        }
      },
      err => {
        console.error('Error loading lists:', err);
        setError('Could not load lists.');
      },
    );

    firebaseService.getBoardMembers(boardId).then(setMembers).catch((err) => {
      console.error('Error loading board members:', err);
      setMembers([]); // Set empty array on error
    });

    return () => {
      unsubscribeBoard();
      unsubscribeLists();
    };
  }, [boardId, firebaseService, isFirebaseInitialized]);

  useEffect(() => {
    if (!firebaseService || !boardId || lists.length === 0 || !isFirebaseInitialized) {
      setCards({});
      return;
    }

    const unsubscribes = lists.map(list => {
      const cardsPath = `todo_boards/${boardId}/lists/${list.id}/cards`;
      return firebaseService.listenToCollection<CardData>(
        cardsPath,
        async cardDocs => {
          const sortedCards = cardDocs
            .map(doc => ({ ...doc.data, id: doc.id, listId: list.id } as CardData))
            .sort((a, b) => a.order - b.order);

          setCards(prev => {
            const updated = { ...prev, [list.id]: sortedCards };
            
            // Cache all cards for the board for fast loading next time
            if (offlineSyncManager) {
              offlineSyncManager.cacheDocument('board_cards', boardId, updated);
            }
            
            return updated;
          });
        },
        err => {
          console.error(`Error loading cards for list ${list.id}:`, err);
        },
      );
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [boardId, firebaseService, lists, isFirebaseInitialized]);

  useEffect(() => {
    if (!firebaseService || !boardId || !isFirebaseInitialized) return;
    if (!lists || lists.length === 0) return;

    // Check for missing standard lists with better duplicate detection
    const existingListNames = lists.map(l => l.name?.toLowerCase().trim()).filter(Boolean);
    const missingStandardLists = STANDARD_LISTS.filter(stdList => {
      const stdListName = stdList.name.toLowerCase().trim();
      // Check for exact match or common variations
      return !existingListNames.some(existingName => {
        const variations = [
          stdListName,
          stdListName.replace(/-/g, ' '), // "to-do" -> "to do"
          stdListName.replace(/ /g, '-'), // "to do" -> "to-do"
          stdListName.replace(/s$/, ''),  // "deliveries" -> "delivery"
        ];
        return variations.includes(existingName);
      });
    });

    // Only create missing lists if we don't have any standard lists at all
    // This prevents creating duplicates when the effect runs multiple times
    if (missingStandardLists.length > 0 && existingListNames.length === 0) {
      console.log('Creating initial standard lists for board:', boardId);
      missingStandardLists.forEach((list, idx) => {
        firebaseService.addList(boardId, {
          name: list.name,
          order: lists.length + idx,
          boardId,
        });
      });
    }
  }, [firebaseService, boardId, isFirebaseInitialized, lists.length]); // Only depend on lists.length, not the entire lists array

  // --- Handlers ---
  const handleReorderLists = useCallback(
    async (data: ListData[]) => {
      if (!boardId) return;
      setLists(data);
      try {
        await firebaseService.reorderLists(boardId, data);
      } catch (err) {
        Alert.alert('Error', 'Failed to reorder lists.');
      }
    },
    [boardId, firebaseService],
  );

  const handleReorderCards = useCallback(
    async (listId: string, orderedCards: CardData[]) => {
      if (!boardId) return;
      setCards(prev => ({ ...prev, [listId]: orderedCards }));
      try {
        await firebaseService.reorderCardsInList(boardId, listId, orderedCards);
      } catch (err) {
        Alert.alert('Error', 'Failed to reorder cards.');
      }
    },
    [boardId, firebaseService],
  );

  const handleAddList = useCallback(async () => {
    if (!newListName.trim() || !user || !boardId) return;
    try {
      await firebaseService.addList(boardId, {
        name: newListName,
        order: lists.length,
      });
      setNewListName('');
      setAddListModalVisible(false);
    } catch (error) {
      console.error('Error adding list:', error);
      Alert.alert('Error', 'Could not add the new list.');
    }
  }, [boardId, firebaseService, newListName, user, lists]);

  // Handle adding card from modal
  const handleAddCard = useCallback(async () => {
    if (!newCardTitle.trim() || !user || !newCardListId) return;
    const cardData = {
      title: newCardTitle,
      description: newCardDescription,
      order: cards[newCardListId]?.length || 0,
      assignedTo: [user.uid],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      if (offlineSyncManager) {
        await offlineSyncManager.queueOperation('create', `todo_boards/${boardId}/lists/${newCardListId}/cards`, cardData);
      } else {
        await firebaseService.addCard(boardId, newCardListId, cardData);
      }
      setNewCardTitle('');
      setNewCardDescription('');
      setAddCardModalVisible(false);
      setNewCardListId(null);
    } catch (error) {
      console.error('Error adding card:', error);
      Alert.alert('Error', 'Could not add the new card.');
    }
  }, [boardId, firebaseService, newCardListId, newCardTitle, newCardDescription, user, cards, offlineSyncManager]);

  // Handle adding card from inline input in BoardList
  const handleAddCardFromList = useCallback(async (listId: string, cardTitle: string) => {
    if (!cardTitle.trim() || !user || !boardId) return;
    const cardData = {
      title: cardTitle.trim(),
      description: '',
      order: cards[listId]?.length || 0,
      assignedTo: [user.uid],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {

      if (offlineSyncManager) {
        await offlineSyncManager.queueOperation('create', `todo_boards/${boardId}/lists/${listId}/cards`, cardData);
      } else {
        await firebaseService.addCard(boardId, listId, cardData);
      }
    } catch (error) {
      console.error('Error adding card from list:', error);
      Alert.alert('Error', 'Could not add the new card.');
      throw error; // Re-throw so BoardList can handle the error state
    }
  }, [boardId, firebaseService, user, cards, offlineSyncManager]);

  const handleMoveCard = useCallback(
    async (cardId: string, originalListId: string, targetListId: string) => {
      if (!boardId || originalListId === targetListId) return;

      // Optimistic UI Update
      setCards(prevCards => {
        const newCards = { ...prevCards };
        const cardToMove = newCards[originalListId].find(c => c.id === cardId);
        if (!cardToMove) return prevCards;

        // Remove from original list
        newCards[originalListId] = newCards[originalListId].filter(c => c.id !== cardId);
        // Add to new list
        newCards[targetListId] = [...newCards[targetListId], { ...cardToMove, listId: targetListId }];

        return newCards;
      });

      try {
        const newOrder = cards[targetListId]?.length || 0;
        await firebaseService.moveCardToList(boardId, cardId, originalListId, targetListId, newOrder);
      } catch (error) {
        console.error('Error moving card:', error);
        Alert.alert('Error', 'Could not move the card. Reverting change.');
        // Revert UI on failure
        // (For simplicity, this example relies on the listener to correct the state)
      }
    },
    [boardId, firebaseService, cards],
  );

  const handleUpdateCard = useCallback(
    async (cardId: string, listId: string, updates: Partial<CardData>) => {
      if (!boardId) return;
      try {
        const currentCard = cards[listId]?.find(card => card.id === cardId);
        
        // Check if assignedTo is being updated and update prop status if assigned to maker
        if (updates.assignedTo !== undefined && currentCard?.propId && board?.showId) {
          const previousAssignedTo = currentCard.assignedTo || [];
          const newAssignedTo = updates.assignedTo || [];
          
          try {
            // Get show to check team roles
            const showDoc = await firebaseService.getDocument('shows', board.showId);
            if (showDoc?.data?.team) {
              const team = showDoc.data.team;
              // Check if any assigned user is a maker (prop_maker, props_carpenter, or similar)
              const assignedMakers = newAssignedTo.filter((userId: string) => {
                const role = team[userId];
                return role === 'prop_maker' || role === 'props_carpenter' || role === 'propmaker' || 
                       role === 'senior-propmaker' || role?.toLowerCase().includes('maker');
              });
              
              if (assignedMakers.length > 0) {
                // Get current prop status
                const propDoc = await firebaseService.getDocument('props', currentCard.propId);
                if (propDoc?.data) {
                  const currentPropStatus = propDoc.data.status;
                  let newStatus: string | null = null;
                  
                  // Update status based on current status
                  // Note: Only transition if the transition is valid according to STATUS_TRANSITIONS
                  // damaged_awaiting_repair cannot transition to out_for_repair (invalid transition)
                  // needs_modifying can transition to being_modified (valid transition)
                  if (currentPropStatus === 'needs_modifying') {
                    newStatus = 'being_modified';
                  }
                  
                  if (newStatus) {
                    // Update prop status
                    await firebaseService.updateDocument('props', currentCard.propId, {
                      status: newStatus,
                      lastStatusUpdate: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    
                    // Create status history entry
                    await firebaseService.addDocument(`props/${currentCard.propId}/statusHistory`, {
                      previousStatus: currentPropStatus,
                      newStatus: newStatus,
                      updatedBy: user?.uid || 'system',
                      date: new Date().toISOString(),
                      createdAt: new Date().toISOString(),
                      notes: `Status automatically updated when task assigned to maker`,
                      relatedTaskId: cardId,
                    });
                  }
                }
              }
            }
          } catch (statusUpdateError) {
            // Log error but don't fail the card update
            console.warn('Failed to update prop status when assigned to maker:', statusUpdateError);
          }
        }
        
        // Check if task is being marked as completed and log to prop maintenance history
        // Check both completed field and status field (status: 'done') to match web app behavior
        const hasStatusField = (updates as any).status !== undefined;
        const statusIsDone = (updates as any).status === 'done';
        const isCompleting = updates.completed === true || statusIsDone;
        
        if (currentCard && isCompleting) {
          // Check if card was previously completed (check both completed field and status field)
          const currentStatus = (currentCard as any).status;
          const wasCompleted = currentCard.completed || currentStatus === 'done' || false;
          const isNowCompleted = updates.completed === true || statusIsDone;
          
          // Only log when transitioning from incomplete to complete
          if (!wasCompleted && isNowCompleted && currentCard.propId) {
            try {
              // Create updated card data for logging
              // Ensure both completed and status are set to match web app behavior
              const updatedCard = { 
                ...currentCard, 
                ...updates, 
                completed: true,
                ...(hasStatusField ? { status: 'done' } : {})
              } as CardData;
              await TaskCompletionService.logCompletedTaskToProp({
                card: updatedCard,
                completedBy: user?.uid || 'unknown',
                firebaseService: firebaseService,
              });
              
              // Update prop status when repair/maintenance task is completed
              // Use valid transitions according to STATUS_TRANSITIONS rules
              if (TaskCompletionService.isRepairMaintenanceTask(updatedCard)) {
                try {
                  const propDoc = await firebaseService.getDocument('props', currentCard.propId);
                  if (propDoc?.data) {
                    const currentStatus = propDoc.data.status;
                    let newStatus: string | null = null;
                    
                    // Determine the correct new status based on current status and valid transitions
                    if (currentStatus === 'out_for_repair' || currentStatus === 'damaged_awaiting_repair') {
                      // These can transition to repaired_back_in_show
                      newStatus = 'repaired_back_in_show';
                    } else if (currentStatus === 'under_maintenance' || currentStatus === 'being_modified') {
                      // These must transition to available_in_storage (not repaired_back_in_show)
                      newStatus = 'available_in_storage';
                    }
                    
                    if (newStatus) {
                      await firebaseService.updateDocument('props', currentCard.propId, {
                        status: newStatus,
                        lastStatusUpdate: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                      
                      // Create status history entry
                      await firebaseService.addDocument(`props/${currentCard.propId}/statusHistory`, {
                        previousStatus: currentStatus,
                        newStatus: newStatus,
                        updatedBy: user?.uid || 'system',
                        date: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        notes: `Status automatically updated when repair/maintenance task completed`,
                        relatedTaskId: cardId,
                      });
                    }
                  }
                } catch (statusError) {
                  console.warn('Failed to update prop status when repair/maintenance task completed:', statusError);
                }
              }
            } catch (logError) {
              // Log error but don't fail the card update
              console.warn('Failed to log completed task to prop maintenance history:', logError);
            }
          }
        }
        
        if (offlineSyncManager) {
          await offlineSyncManager.queueOperation('update', `todo_boards/${boardId}/lists/${listId}/cards`, { ...updates, id: cardId });
        } else {
          await firebaseService.updateCard(boardId, listId, cardId, updates);
        }
      } catch (error) {
        console.error('Error updating card:', error);
        Alert.alert('Error', 'Could not update card details.');
      }
    },
    [boardId, firebaseService, offlineSyncManager, cards, user, board],
  );

  const handleDeleteCard = useCallback(
    async (listId: string, cardId: string) => {
      if (!boardId) return;
      Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (offlineSyncManager) {
                await offlineSyncManager.queueOperation('delete', `todo_boards/${boardId}/lists/${listId}/cards`, { id: cardId });
              } else {
                await firebaseService.deleteCard(boardId, listId, cardId);
              }
              router.back();
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Could not delete card.');
            }
          },
        },
      ]);
    },
    [boardId, firebaseService, router, offlineSyncManager],
  );

  const handleDeleteList = useCallback(
    async (listId: string) => {
      if (!boardId) return;
      const list = lists.find(l => l.id === listId);
      const listName = list?.name || 'this list';
      
      Alert.alert('Delete List', `Are you sure you want to delete "${listName}"? This will also delete all cards in this list.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (offlineSyncManager) {
                // Delete all cards in the list first
                const cardsInList = cards[listId] || [];
                for (const card of cardsInList) {
                  await offlineSyncManager.queueOperation('delete', `todo_boards/${boardId}/lists/${listId}/cards`, { id: card.id });
                }
                // Then delete the list
                await offlineSyncManager.queueOperation('delete', `todo_boards/${boardId}/lists`, { id: listId });
              } else {
                await firebaseService.deleteList(boardId, listId);
              }
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Could not delete list.');
            }
          },
        },
      ]);
    },
    [boardId, firebaseService, lists, cards, offlineSyncManager],
  );

  const handleEditList = useCallback(
    async (listId: string, newName: string) => {
      if (!boardId || !newName.trim()) return;
      
      try {
        if (offlineSyncManager) {
          await offlineSyncManager.queueOperation('update', `todo_boards/${boardId}/lists`, { 
            id: listId, 
            name: newName.trim() 
          });
        } else {
          await firebaseService.updateList(boardId, listId, { name: newName.trim() });
        }
      } catch (error) {
        console.error('Error updating list:', error);
        Alert.alert('Error', 'Could not update list name.');
      }
    },
    [boardId, firebaseService, offlineSyncManager],
  );

  // --- Mobile DnD Rendering ---
  // Store list layouts
  const onListLayout = (listId: string, layout: ListLayout) => {
    setListLayouts(prev => ({ ...prev, [listId]: layout }));
  };

  const fabActions = useMemo(() => {
    const actions = [
      {
        icon: 'plus',
        label: 'Add List',
        onPress: () => setAddListModalVisible(true),
        style: { backgroundColor: colors.primary },
        color: colors.text,
        labelTextColor: colors.text,
      },
    ];
    if (lists.length > 0) {
      actions.unshift({
        icon: 'card-plus-outline',
        label: 'Add Card',
        onPress: () => {
          setNewCardListId(lists[0].id);
          setAddCardModalVisible(true);
        },
        style: { backgroundColor: '#4CAF50' },
        color: 'white',
        labelTextColor: '#4CAF50',
      });
    }
    return actions;
  }, [lists, colors.primary, colors.text]);

  // Styles remain the same
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      borderRadius: 0,
      padding: 0,
      marginBottom: 16,
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listsContainer: {
      flex: 1,
    },
    listContainer: {
      width: LIST_WIDTH,
      borderRadius: 14,
      borderWidth: 0,
      borderColor: 'transparent',
      padding: 14,
      marginHorizontal: LIST_SPACING,
      alignSelf: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 4,
      paddingTop: 0,
    },
    listHeader: {
      fontSize: 19,
      fontWeight: 'bold',
      paddingHorizontal: 0,
      paddingVertical: 10,
      color: colors.text,
      borderBottomWidth: 0,
      backgroundColor: 'transparent',
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      marginBottom: 8,
      marginTop: 12,
      lineHeight: 24,
      textAlign: 'left',
    },
    listHeaderPressable: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
    },
    cardContainer: {
      borderRadius: 10,
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      marginVertical: 10,
      marginHorizontal: 10,
      elevation: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      padding: 0,
    },
    cardDragging: {
      transform: [{ scale: 1.04 }],
      shadowOpacity: 0.18,
      elevation: 4,
      zIndex: 2,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    dragHandle: {
      marginRight: 10,
      opacity: 0.7,
    },
    cardTitle: {
      fontSize: 16,
      color: '#222',
      textAlign: 'left',
      fontWeight: '400',
      flexShrink: 1,
    },
    addCardButton: {
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      alignItems: 'center',
      backgroundColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.10,
      shadowRadius: 2,
      elevation: 1,
    },
    addCardButtonText: {
      color: colors.card,
      fontWeight: 'bold',
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      width: '80%',
      padding: 20,
      borderRadius: 10,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    input: {
      height: 40,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 10,
      marginBottom: 16,
    },
    modalButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 6,
      alignItems: 'center',
      marginLeft: 10,
    },
    bottomNavigation: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      backgroundColor: '#18181b',
      borderTopWidth: 1,
      borderTopColor: '#c084fc',
      flexDirection: 'row',
      paddingBottom: 8,
      paddingTop: 8,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#c084fc',
      marginTop: 4,
    },
  });

  if (loading || !isFirebaseInitialized) {
    return (
      <DefaultView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <DefaultText style={{ color: colors.text, marginTop: 16, textAlign: 'center' }}>
          {loadingFromCache ? 'Loading from cache...' : 'Loading board...'}
        </DefaultText>
        {!loadingFromCache && (
          <DefaultText style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', fontSize: 12 }}>
            This should be faster next time with caching
          </DefaultText>
        )}
      </DefaultView>
    );
  }

  // Prioritize lists with cards first, then avoid duplicates
  const listsWithCards = lists.filter(l => cards[l.id] && cards[l.id].length > 0);
  const listsWithoutCards = lists.filter(l => !cards[l.id] || cards[l.id].length === 0);
  
  // Group lists by standard category to avoid duplicates
  const usedListIds = new Set<string>();
  const orderedLists: ListData[] = [];
  
  // 1. First, add all lists that have cards (these are most important)
  listsWithCards.forEach(list => {
    orderedLists.push(list);
    usedListIds.add(list.id);
  });
  
  // 2. Then add one representative for each standard list type (if not already added)
  STANDARD_LISTS.forEach(stdList => {
    const matchingList = lists.find(l => {
      if (usedListIds.has(l.id)) return false; // Skip if already added
      
      // Check exact match or variations
      if (l.name === stdList.name) return true;
      const variations = [
        stdList.name.replace(/-/g, ' '), // "To-Do" -> "To Do"
        stdList.name.replace(/ /g, '-'), // "To Do" -> "To-Do"
      ];
      return variations.includes(l.name);
    });
    
    if (matchingList) {
      orderedLists.push(matchingList);
      usedListIds.add(matchingList.id);
    }
  });
  
  // 3. Finally, add any remaining unique lists
  lists.forEach(list => {
    if (!usedListIds.has(list.id)) {
      orderedLists.push(list);
      usedListIds.add(list.id);
    }
  });


  return (
    <View style={centralStyles.flex1}>
      <SyncStatusBar />
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <DraxProvider>
          <DefaultView style={styles.container}>
            <Stack.Screen
              options={{
                title: show?.name || board?.name || 'Task Board',
                headerBackTitle: 'Back',
                headerTransparent: false,
                headerStyle: {
                  backgroundColor: '#2B2E8C',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: 18,
                },
              }}
            />
            
            {/* Custom Header with Title and Sync Indicator */}
            <View style={{
              backgroundColor: '#2B2E8C',
              paddingHorizontal: 16,
              paddingTop: insets.top,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#c084fc',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable 
                  onPress={() => router.back()}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </Pressable>
                <DefaultText style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: 'bold',
                  flex: 1,
                  textAlign: 'center',
                  marginHorizontal: 16,
                }}>
                  {show?.name || board?.name || 'Task Board'}
                </DefaultText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* View Mode Toggle - Hidden for Android (always showing todo view) */}
                  {syncingFromNetwork && (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  )}
                  <Pressable 
                    onPress={refreshData}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="refresh" size={20} color="#FFFFFF" opacity={0.7} />
                  </Pressable>
                </View>
              </View>
              
              {/* Show sync status */}
              {syncingFromNetwork && (
                <DefaultText style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  textAlign: 'center',
                  marginTop: 4,
                  opacity: 0.8,
                }}>
                  Syncing...
                </DefaultText>
              )}
            </View>
            
            {/* Render Todo View or Kanban View */}
            {viewMode === 'todo' ? (
              <TodoView
                boardId={boardId!}
                lists={orderedLists}
                cards={filteredCardsForShow}
                onAddCard={handleAddCardFromList}
                onUpdateCard={async (cardId: string, updates: Partial<CardData>) => {
                  // Find the list containing this card
                  const listId = Object.keys(cards).find(lid => cards[lid].some(card => card.id === cardId));
                  if (listId) {
                    await handleUpdateCard(cardId, listId, updates);
                  }
                }}
                onDeleteCard={(cardId: string) => {
                  // Find the list containing this card
                  const listId = Object.keys(cards).find(lid => cards[lid].some(card => card.id === cardId));
                  if (listId) {
                    handleDeleteCard(listId, cardId);
                  }
                }}
                selectedCardId={selectedCardId}
                loading={loading}
                error={error}
                allShowMembers={memoizedMembers}
                availableLabels={availableLabels}
              />
            ) : (
              <ScrollView
                horizontal
                style={[styles.listsContainer]}
                showsHorizontalScrollIndicator={false}>
                {orderedLists.map((list) => {
                if (!list) return null;
                
                const allCards = filteredCardsForShow[list.id] || [];
                
                const filteredCards = allCards.filter(card => {
                  // Find matching standard list using name variations
                  const stdList = STANDARD_LISTS.find(sl => {
                    if (sl.name === list?.name) return true;
                    const variations = [
                      sl.name.replace(/-/g, ' '),
                      sl.name.replace(/ /g, '-'),
                      sl.name.toLowerCase(),
                      sl.name.toUpperCase(),
                    ];
                    return list?.name && (
                      variations.includes(list.name) ||
                      variations.includes(list.name.replace(/-/g, ' ')) ||
                      variations.includes(list.name.replace(/ /g, '-'))
                    );
                  });
                  
                  // If card is linked to a prop, filter by prop status
                  if (card.propId) {
                    const prop = allProps.find(p => p.id === card.propId);
                    return prop && stdList && stdList.filter(prop);
                  }
                  // Otherwise, show all cards that don't have propId (regular todo cards)
                  return true;
                });
                

                

                
                return (
                  <BoardList
                    key={list.id}
                    listId={list.id}
                    listName={list.name}
                    boardId={boardId}
                    cards={filteredCards}
                    onAddCard={handleAddCardFromList}
                    onDeleteCard={handleDeleteCard}
                    onDeleteList={handleDeleteList}
                    onEditList={handleEditList}
                    onOpenCardDetail={(card: any) => router.setParams({ selectedCardId: card.id })}
                    onReorderCards={handleReorderCards}
                    onCardDrop={(card: any, targetListId: string) => {
                      if (card.listId !== targetListId && card.listId) {
                        handleMoveCard(card.id, card.listId, targetListId);
                      }
                    }}
                  />
                );
              })}
              </ScrollView>
            )}
            <CardDetailPanel
              isVisible={!!selectedCard}
              card={selectedCard}
              boardId={boardId!}
              lists={lists}
              allShowMembers={memoizedMembers}
              availableLabels={availableLabels}
              allCards={selectedCard ? cards[selectedCard.listId] || [] : []}
              onNavigateToCard={(card) => router.setParams({ selectedCardId: card.id })}
              onClose={() => router.replace(`/taskBoard/${boardId}`)}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onMoveCard={handleMoveCard}
            />
            {/* Add List Modal */}
            <Modal
              transparent
              visible={isAddListModalVisible}
              onRequestClose={() => setAddListModalVisible(false)}
              animationType="slide"
            >
              <DefaultView style={styles.modalOverlay}>
                <DefaultView style={[styles.modalContent, { backgroundColor: colors.card }]}>
                  <ThemedText style={styles.modalTitle}>Add New List</ThemedText>
                  <TextInput
                    placeholder="List Name"
                    value={newListName}
                    onChangeText={setNewListName}
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                    placeholderTextColor={colors.placeholder}
                  />
                  <DefaultView style={styles.modalButtonContainer}>
                    <Pressable onPress={() => setAddListModalVisible(false)} style={styles.modalButton}>
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>
                    <Pressable onPress={handleAddList} style={styles.modalButton}>
                      <ThemedText>Add</ThemedText>
                    </Pressable>
                  </DefaultView>
                </DefaultView>
              </DefaultView>
            </Modal>
            {/* Add Card Modal */}
            <Modal
              transparent
              visible={isAddCardModalVisible}
              onRequestClose={() => setAddCardModalVisible(false)}
              animationType="slide"
            >
              <DefaultView style={styles.modalOverlay}>
                <DefaultView style={[styles.modalContent, { backgroundColor: colors.card }]}>
                  <ThemedText style={styles.modalTitle}>Add New Card</ThemedText>
                  <TextInput
                    placeholder="Card Title"
                    value={newCardTitle}
                    onChangeText={setNewCardTitle}
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                    placeholderTextColor={colors.placeholder}
                  />
                  <TextInput
                    placeholder="Card Description (optional)"
                    value={newCardDescription}
                    onChangeText={setNewCardDescription}
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, marginTop: 10 }]}
                    placeholderTextColor={colors.placeholder}
                    multiline
                  />
                  <DefaultView style={styles.modalButtonContainer}>
                    <Pressable
                      onPress={() => {
                        setAddCardModalVisible(false);
                        setNewCardListId(null);
                      }}
                      style={styles.modalButton}
                    >
                      <ThemedText>Cancel</ThemedText>
                    </Pressable>
                    <Pressable onPress={handleAddCard} style={styles.modalButton}>
                      <ThemedText>Add</ThemedText>
                    </Pressable>
                  </DefaultView>
                </DefaultView>
              </DefaultView>
            </Modal>
          </DefaultView>
          {/* FAB for adding a new list */}
          <FAB.Group
            visible={true}
            open={fabOpen}
            icon={fabOpen ? 'close' : 'plus'}
            actions={[
              {
                icon: 'plus',
                label: 'Add List',
                onPress: () => setAddListModalVisible(true),
                style: { backgroundColor: '#c084fc' },
                labelStyle: { color: '#fff', backgroundColor: 'rgba(30,30,30,0.7)', paddingHorizontal: 8, borderRadius: 4 },
              },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            fabStyle={{
              position: 'absolute',
              margin: 16,
              right: 0,
              bottom: 20,
              backgroundColor: '#c084fc',
              borderRadius: 28,
              width: 56,
              height: 56,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: 'transparent',
              elevation: 0,
              borderWidth: 0,
            }}
                        style={{ marginBottom: 90 }}
            color="#FFFFFF"
            backdropColor="transparent"
          />
        </DraxProvider>
        
        {/* Bottom navigation to mirror main tabs for this standalone screen */}
        <View style={[styles.bottomNavigation, { borderTopColor: '#c084fc', backgroundColor: '#18181b' }]}>
          <Pressable onPress={() => router.navigate('/(tabs)')} style={styles.navItem}>
            <Ionicons name="home" size={24} color="#c084fc" />
            <DefaultText style={[styles.navText, { color: '#c084fc' }]}>Home</DefaultText>
          </Pressable>
          <Pressable onPress={() => router.navigate('/(tabs)/props')} style={styles.navItem}>
            <Ionicons name="cube" size={24} color="#a3a3a3" />
            <DefaultText style={[styles.navText, { color: '#a3a3a3' }]}>Props</DefaultText>
          </Pressable>
          <Pressable onPress={() => router.navigate('/(tabs)/shows')} style={styles.navItem}>
            <Ionicons name="film" size={24} color="#a3a3a3" />
            <DefaultText style={[styles.navText, { color: '#a3a3a3' }]}>Shows</DefaultText>
          </Pressable>
          <Pressable onPress={() => router.navigate('/(tabs)/packing')} style={styles.navItem}>
            <Ionicons name="cube-outline" size={24} color="#a3a3a3" />
            <DefaultText style={[styles.navText, { color: '#a3a3a3' }]}>Packing</DefaultText>
          </Pressable>
          <Pressable onPress={() => router.navigate('/(tabs)/help')} style={styles.navItem}>
            <Ionicons name="help-circle" size={24} color="#a3a3a3" />
            <DefaultText style={[styles.navText, { color: '#a3a3a3' }]}>Help</DefaultText>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
};

export default TaskBoardDetailScreen;