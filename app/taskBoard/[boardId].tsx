import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../src/theme.ts'; // Import theme objects
import { View as ThemedView } from '../../src/components/Themed.tsx';
import { LoadingScreen } from '../../src/components/LoadingScreen.tsx';
import { useAuth } from '../../src/contexts/AuthContext.tsx';
import { useFirebase } from '../../src/contexts/FirebaseContext.tsx';
import { Ionicons } from '@expo/vector-icons';

// --- NEW: Import Task Manager Components ---
import BoardList from '../../src/components/taskManager/BoardList.tsx';
import CardDetailPanel from '../../src/components/taskManager/CardDetailPanel.tsx';

// --- DNDKit Imports ---
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';

// Type definitions (ensure these are consistent with imported components and Firebase structure)
interface CustomTimestamp { // Placeholder, replace with your actual Firebase Timestamp type if different
    toDate: () => Date;
    // fromDate?: (date: Date) => any; // Example for Firebase v9 Timestamps
}
interface BoardData {
  id: string;
  name: string;
  ownerId?: string;
}
interface ListData {
  id: string;
  name: string;
  order: number;
  boardId?: string;
}
interface CardData {
  id: string;
  title: string;
  order: number;
  listId: string;
  boardId: string;
  description?: string;
  dueDate?: string | CustomTimestamp | null; // Allow string for ISO date strings from Firestore
  imageUrl?: string;
  linkUrl?: string;
  createdAt?: string | CustomTimestamp; // Allow string for ISO date strings
}

export default function TaskBoardDetailScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const { theme: themeName } = useTheme(); // Get theme name
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors; // Select colors object
  const router = useRouter();

  const { user, loading: authLoadingState } = useAuth();
  const { service, isInitialized: firebaseInitialized } = useFirebase();

  const [board, setBoard] = useState<BoardData | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cardsByListId, setCardsByListId] = useState<{ [key: string]: CardData[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW State for Modal and selected card ---
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isCardDetailVisible, setIsCardDetailVisible] = useState(false);
  const [newListTitle, setNewListTitle] = useState(''); // For adding new list
  const [showAddListInput, setShowAddListInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false); // NEW state for image upload

  // --- DNDKit Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require the mouse to move by 10 pixels before activating
      // Allows for onPress events on draggable items.
      activationConstraint: {
        distance: 10,
      },
    })
  );

  useEffect(() => {
    if (!authLoadingState && !user) {
      console.log("TaskBoardDetailScreen: User logged out or not available.");
      setError("User not authenticated. Please log in.");
      setLoading(false);
    } else if (user) {
      console.log(`TaskBoardDetailScreen: User authenticated: ${user.uid}`);
      setError(null);
    }
  }, [user, authLoadingState, router]);

  useEffect(() => {
    if (authLoadingState || !firebaseInitialized || !service || !user || !boardId) {
      if (!authLoadingState && !firebaseInitialized && !user) {
        if (!error) setError("Cannot load board: Services not ready or user not logged in.");
      }
      return;
    }
    console.log("Effect 2 Triggered: Board Details Fetch. Current loading state:", loading);
    if (!loading) setLoading(true);
    setError(null);
    setBoard(null);
    console.log(`TaskBoardDetailScreen: Fetching board details for ${boardId} by user ${user.uid}`);
    service.getDocument<Omit<BoardData, 'id'>>('todo boards', boardId)
      .then(docSnap => {
        if (docSnap && docSnap.data) {
          const boardData = docSnap.data;
          if (boardData.ownerId === user.uid) {
            setBoard({ id: docSnap.id, ...boardData });
            setError(null);
          } else {
            setError('Access denied to this board.');
            setBoard(null);
          }
        } else {
          setError('Board not found.');
          setBoard(null);
        }
      }).catch(err => {
        console.error("Error fetching board document: ", err);
        setError('Error loading board details.');
        setBoard(null);
      }).finally(() => {
        console.log("Board detail fetch attempt finished. Current board state:", board);
      });
  }, [boardId, user, authLoadingState, firebaseInitialized, service]);

  useEffect(() => {
    if (!boardId || !firebaseInitialized || !service || !board) {
      setLists([]);
      if (board === null && !error && !authLoadingState && firebaseInitialized && service && user) {
          console.log("Effect 3: Board is null, not fetching lists.");
          setLoading(false);
      }
      return;
    }
    console.log("Effect 3 Triggered: Lists Fetch. Current board:", board.name);
    setLoading(true);
    const listCollectionPath = `todo boards/${board.id}/lists`;
    const unsubscribeLists = service.listenToCollection<Omit<ListData, 'id'>>(
        listCollectionPath,
        (docs) => {
            const fetchedLists = docs.map(d => ({ id: d.id, boardId: board.id, ...(d.data || {}) } as ListData));
            console.log("Lists snapshot received:", fetchedLists.length);
            setLists(fetchedLists);
            if (fetchedLists.length === 0) {
                console.log("No lists found for this board, setting cards to empty and loading to false.");
                setCardsByListId({});
                setLoading(false);
            }
        },
        (err) => {
            console.error("Error fetching lists: ", err);
            setError(prev => prev || 'Error loading lists.');
            setLoading(false);
        },
        { orderBy: [['order', 'asc']] }
    );
    return () => {
      console.log(`TaskBoardDetailScreen: Cleaning up list listener for board ${board.id}`);
      unsubscribeLists();
    };
  }, [board, firebaseInitialized, service, error, authLoadingState, user]);

  useEffect(() => {
    if (!board || lists.length === 0 || !firebaseInitialized || !service) {
        if (lists.length === 0 && board) {
             setCardsByListId({});
             setLoading(false);
        }
        return;
    }
    console.log(`Effect 4 Triggered: Cards Fetch for ${lists.length} lists. Board:`, board.name);
    setLoading(true);

    const fetchAllCards = async () => {
        try {
            const newCardsByList: { [key: string]: CardData[] } = {};
            for (const list of lists) {
                const cardDocs = await service.getDocuments<Omit<CardData, 'id'>>(
                    `todo boards/${board.id}/lists/${list.id}/todocards`,
                    { orderBy: [['order', 'asc']] }
                );
                newCardsByList[list.id] = cardDocs.map(doc => ({
                    id: doc.id,
                    boardId: board.id,
                    listId: list.id,
                    ...(doc.data || {})
                } as CardData));
            }
            setCardsByListId(newCardsByList);
            console.log("All cards fetched (one-time per list/board change):", Object.keys(newCardsByList).length + " lists processed.");
        } catch (err) {
            console.error("Error fetching all cards: ", err);
            setError(prev => prev || 'Error loading cards.');
        } finally {
            setLoading(false);
        }
    };

    fetchAllCards();
  }, [lists, board, firebaseInitialized, service]);

  // --- CRUD Handlers for Cards ---
  const handleAddCard = useCallback(async (listId: string, cardTitle: string) => {
    if (!service || !board) return;
    const newCard = {
      title: cardTitle,
      order: cardsByListId[listId]?.length || 0,
      listId,
      boardId: board.id,
      createdAt: new Date().toISOString(), // Or use server timestamp via FirebaseService
    };
    try {
      await service.addDocument(`todo boards/${board.id}/lists/${listId}/todocards`, newCard);
      // No need to update local state, listener will pick it up
    } catch (err) {
      console.error("Error adding card: ", err);
      Alert.alert("Error", "Could not add new card.");
    }
  }, [service, board, cardsByListId]);

  const handleDeleteCard = useCallback(async (listId: string, cardId: string) => {
    if (!service || !board) return;
    try {
      await service.deleteDocument(`todo boards/${board.id}/lists/${listId}/todocards`, cardId);
    } catch (err) {
      console.error("Error deleting card: ", err);
      Alert.alert("Error", "Could not delete card.");
    }
  }, [service, board]);

 const handleUpdateCard = useCallback(async (cardId: string, listId: string, updates: Partial<CardData>) => {
    if (!service || !board) return;
    setIsUploadingImage(false); // Reset first
    let finalUpdates = { ...updates };

    try {
      if (finalUpdates.imageUrl && finalUpdates.imageUrl.startsWith('file:///')) {
        setIsUploadingImage(true);
        const localImageUri = finalUpdates.imageUrl;
        const fileName = localImageUri.split('/').pop() || `image_${Date.now()}`;
        const storagePath = `task_card_images/${board.id}/${cardId}/${fileName}`;
        
        const downloadUrl = await service.uploadFile(storagePath, localImageUri);
        finalUpdates.imageUrl = downloadUrl;
        setIsUploadingImage(false);
      } else if (finalUpdates.imageUrl === undefined && updates.hasOwnProperty('imageUrl')) {
        finalUpdates.imageUrl = undefined;
      }

      await service.updateDocument(`todo boards/${board.id}/lists/${listId}/todocards`, cardId, finalUpdates);
      
      setSelectedCard(prev => prev ? { ...prev, ...finalUpdates } : null);
      setCardsByListId(prevCardsMap => {
        const newCardsMap = { ...prevCardsMap };
        if (newCardsMap[listId]) {
          newCardsMap[listId] = newCardsMap[listId].map(c => 
            c.id === cardId ? { ...c, ...finalUpdates } : c
          );
        }
        return newCardsMap;
      });

    } catch (err) {
      console.error("Error updating card or uploading image: ", err);
      Alert.alert("Error", "Could not update card details.");
      setIsUploadingImage(false);
    }
  }, [service, board, cardsByListId]);

  const handleMoveCard = useCallback(async (cardId: string, originalListId: string, targetListId: string) => {
    if (!service || !board || originalListId === targetListId) return;
    try {
        const cardToMove = cardsByListId[originalListId]?.find(c => c.id === cardId);
        if (!cardToMove) throw new Error("Card not found for move");

        // Ensure order is preserved or reset as needed
        const newCardData = { 
            ...cardToMove, 
            listId: targetListId, 
            order: cardsByListId[targetListId]?.length || 0 
        };
        
        // In a real scenario, use a batched write or a Cloud Function for atomicity
        // Changed addDocument to setDocument, assuming setDocument(collectionPath, docId, data) signature
        await service.setDocument(`todo boards/${board.id}/lists/${targetListId}/todocards`, cardId, newCardData);
        await service.deleteDocument(`todo boards/${board.id}/lists/${originalListId}/todocards`, cardId);
        
        // Manually update local state for smoother UI until listeners catch up
        setCardsByListId(prev => {
            const newPrev = { ...prev };
            newPrev[originalListId] = (newPrev[originalListId] || []).filter(c => c.id !== cardId);
            newPrev[targetListId] = [...(newPrev[targetListId] || []), newCardData].sort((a,b) => a.order - b.order);
            return newPrev;
        });
        setSelectedCard(null); // Clear selection as card has moved
        setIsCardDetailVisible(false); // Close modal

    } catch (err) {
        console.error("Error moving card: ", err);
        Alert.alert("Error", "Could not move card.");
    }
}, [service, board, cardsByListId]);

  const handleOpenCardDetail = useCallback((card: CardData) => {
    setSelectedCard(card);
    setIsCardDetailVisible(true);
  }, []);

  const handleCloseCardDetail = useCallback(() => {
    setIsCardDetailVisible(false);
    setSelectedCard(null);
  }, []);

  // --- CRUD Handlers for Lists ---
  const handleAddList = async () => {
    if (!service || !board || !newListTitle.trim()) return;
    const newList = {
      name: newListTitle.trim(),
      order: lists.length, // Simple order at the end
      boardId: board.id,
      createdAt: new Date().toISOString(),
    };
    try {
      await service.addDocument(`todo boards/${board.id}/lists`, newList);
      setNewListTitle('');
      setShowAddListInput(false);
    } catch (err) {
      console.error("Error adding list: ", err);
      Alert.alert("Error", "Could not add new list.");
    }
  };

  // --- DNDKit Drag End Handler ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("DragEnd Event: ", event);
    if (over && active.id !== over.id) {
      // active.id is the cardId
      // over.id could be a listId (if dropping on a list) or another cardId (if reordering within a list)
      // The data property of active/over can be used to pass more info (like original listId)
      console.log(`Card ${active.id} was dragged over ${over.id}`);
      
      // Placeholder for reordering logic
      // Determine if it's a card being moved to a new list or reordered within the same list.
      // Update cardsByListId state optimistically for now.
      // Then, call a function to update Firestore.

      // Example: If active.data.current.listId !== over.data.current.listId (if over is a list)
      // Or if over.data.current.type === 'list' vs 'card'

      // This part needs careful implementation based on how `over` identifies lists vs cards.
      // For now, just logging.
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: currentThemeColors.background },
    header: { padding: 15, borderBottomWidth: 1, borderBottomColor: currentThemeColors.border },
    boardNameText: { fontSize: 24, fontWeight: 'bold', color: currentThemeColors.headerText }, // Use headerText from theme
    idText: { fontSize: 12, color: currentThemeColors.textSecondary, marginTop: 2 }, 
    text: { fontSize: 16, color: currentThemeColors.text, marginVertical: 5 },
    listsScrollViewContainer: { flex: 1 },
    addListContainer: { padding: 10, borderTopWidth: 1, borderTopColor: currentThemeColors.border, backgroundColor: currentThemeColors.background }, // Use background from theme
    addListInput: { backgroundColor: currentThemeColors.inputBackground, color: currentThemeColors.text, padding: 10, borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: currentThemeColors.border },
    addListButtonRow: { flexDirection: 'row', justifyContent: 'space-around' }, 
    errorText: { color: currentThemeColors.error, textAlign: 'center', margin: 20, fontSize: 16 }, 
    uploadingOverlay: { 
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000 // Ensure it's on top
    }
  });

  if (authLoadingState) {
    return <LoadingScreen message="Authenticating..." />;
  }
  
  if (loading) { 
    return <LoadingScreen message={`Loading board ${boardId}...`} />;
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={styles.errorText}>{error}</Text>
      </ThemedView>
    );
  }

  if (!board) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text style={styles.errorText}>Board data could not be loaded or was not found.</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: board.name || 'Board' }} />
      <View style={styles.header}>
        <Text style={styles.boardNameText}>{board.name}</Text>
        <Text style={styles.idText}>ID: {board.id}</Text>
      </View>
      <Text style={styles.text}>Lists: {lists.length}</Text>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <ScrollView horizontal style={styles.listsScrollViewContainer}>
          {lists.map(list => (
            <BoardList
              key={list.id}
              listId={list.id}
              listName={list.name}
              boardId={board.id}
              cards={cardsByListId[list.id] || []}
              onAddCard={handleAddCard}
              onDeleteCard={handleDeleteCard}
              onOpenCardDetail={handleOpenCardDetail}
            />
          ))}
        </ScrollView>
      </DndContext>
      <View style={styles.addListContainer}>
        {showAddListInput ? (
            <View>
                <TextInput 
                    style={styles.addListInput}
                    placeholder="New list title..."
                    value={newListTitle}
                    onChangeText={setNewListTitle}
                    placeholderTextColor={currentThemeColors.placeholder} // Use placeholder from theme
                />
                <View style={styles.addListButtonRow}>
                    <Pressable onPress={handleAddList} style={{padding:10, backgroundColor: currentThemeColors.primary, borderRadius:5}}><Text style={{color: themeName === 'dark' ? darkTheme.colors.background : '#FFFFFF'}}>Add List</Text></Pressable>
                    <Pressable onPress={() => setShowAddListInput(false)} style={{padding:10}}><Text style={{color:currentThemeColors.textSecondary}}>Cancel</Text></Pressable>
                </View>
            </View>
        ) : (
            <Pressable onPress={() => setShowAddListInput(true)} style={{alignItems:'center', padding:10}}>
                <Ionicons name="add-circle-outline" size={28} color={currentThemeColors.primary} />
                <Text style={{color: currentThemeColors.primary}}>Add New List</Text>
            </Pressable>
        )}
      </View>
      {selectedCard && (
        <CardDetailPanel
          isVisible={isCardDetailVisible}
          card={selectedCard}
          lists={lists}
          onClose={handleCloseCardDetail}
          onUpdateCard={handleUpdateCard}
          onMoveCard={handleMoveCard}
          onDeleteCard={handleDeleteCard}
        />
      )}

      {isUploadingImage && (
          <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={currentThemeColors.primary || '#007AFF'} />
              <Text style={{color: '#FFFFFF', marginTop: 10}}>Uploading Image...</Text>
          </View>
      )}
    </ThemedView>
  );
} 