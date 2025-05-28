import React, { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Button,
  Alert,
  Pressable,
  Modal,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { collection, doc, getDoc, getFirestore, onSnapshot, query, orderBy, addDoc, collectionGroup, where, DocumentData, QueryDocumentSnapshot, updateDoc, writeBatch, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import { auth } from '../_firebase/config'; // Assuming relative path is correct
import BoardList, { DraggableCard } from '../../components/BoardList'; // Import DraggableCard too
import DroppableListContainer from '../../components/DroppableListContainer'; // Import the extracted component
// Import DndKit components
import { 
  DndContext, 
  DragEndEvent, // Type for drag end event
  DragStartEvent, // Import DragStartEvent
  DragOverlay,  // Import DragOverlay
  closestCenter, // Basic collision detection strategy 
  useDroppable // Import useDroppable
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'; // Import SortableContext for lists later?
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import Colors from '../../constants/Colors'; // Import Colors
import { useColorScheme } from '../../components/useColorScheme'; // Import useColorScheme
import CardDetailPanel from '../../components/CardDetailPanel'; // Import the new panel
import CalendarView from '../../components/CalendarView'; // Import CalendarView
import { Ionicons } from '@expo/vector-icons'; // For header icons
// <<< Add Firebase Storage imports
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

// Define types
interface BoardData {
  name: string;
  // Add other board fields if needed
}
interface ListData {
  id: string;
  name: string;
  order: number;
  // Add order if needed
}
interface CardData { id: string; title: string; order: number; listId: string; boardId: string; description?: string; dueDate?: Timestamp; imageUrl?: string; linkUrl?: string; createdAt?: any; }

export default function BoardScreen() {
  const colorScheme = useColorScheme() ?? 'light'; // Get color scheme
  const colors = Colors[colorScheme]; // Get theme colors
  const router = useRouter();

  const { boardId } = useLocalSearchParams<{ boardId: string }>(); // Type the param
  const [board, setBoard] = useState<BoardData | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  // Store cards keyed by listId
  const [cardsByListId, setCardsByListId] = useState<{ [key: string]: CardData[] }>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null); // State for dragged card ID
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board'); // State for view mode
  const [isPanelOpenToggled, setIsPanelOpenToggled] = useState(false); // <<< NEW state for toggle
  
  // State for adding lists
  const [showAddListInput, setShowAddListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);

  // --- Modal State ---
  const [isDeleteCardModalVisible, setIsDeleteCardModalVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<{ listId: string; cardId: string } | null>(null);
  const [isDeleteListModalVisible, setIsDeleteListModalVisible] = useState(false);
  const [listToDeleteId, setListToDeleteId] = useState<string | null>(null);
  const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false); // State for detail panel
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null); // State for selected card

  const db = getFirestore();

  // Effect 1: Handle Auth State Change
  useEffect(() => {
    if (!auth) {
        console.warn("BoardScreen: Auth service not ready on initial check, cannot set listener.");
        setAuthLoading(false); // Stop auth loading if service isn't even available
        setError("Auth service failed to initialize."); // Set an error
        return; // Cannot proceed
    }
    
    console.log("BoardScreen: Setting up auth state listener.");
    setAuthLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(`BoardScreen: Auth state confirmed - User logged in: ${user.uid}`);
        setUserId(user.uid);
        setError(null); 
      } else {
        console.log("BoardScreen: Auth state confirmed - User logged out.");
        setUserId(null);
        setError("User not authenticated.");
        router.replace('/login');
      }
      setAuthLoading(false);
    });

    return () => {
        console.log("BoardScreen: Cleaning up auth state listener.");
        unsubscribeAuth();
    };
  }, [auth, router]); // Run only once

  // Effect 2: Fetch Board Details and Lists (Depends on userId)
  useEffect(() => {
    // Don't run if auth is still loading, no userId, or no boardId
    if (authLoading || !userId || !boardId) {
      if (!authLoading && !userId) { setLoading(false); }
      else if (!boardId) { setError('Board ID is missing.'); setLoading(false); }
      return; 
    }
    
    // Reset state and set loading true
    setLoading(true);
    setError(null);
    setBoard(null);
    setLists([]);

    console.log(`BoardScreen: Fetching board details for ${boardId} by user ${userId}`);
    const boardRef = doc(db, 'todo boards', boardId);
    getDoc(boardRef).then(docSnap => {
      if (docSnap.exists() && docSnap.data().ownerId === userId) {
         setBoard(docSnap.data() as BoardData);
      } else if (docSnap.exists()) {
        setError('Access denied to this board.');
      } else {
        setError('Board not found.');
      }
    }).catch(err => {
      console.error("Error fetching board document: ", err);
      setError('Error loading board details.');
    }).finally(() => {
        // Always set loading false after board fetch attempt completes
        console.log("Board fetch finished, setting loading false.");
        setLoading(false); 
    });

    console.log(`BoardScreen: Setting up list listener for ${boardId}`);
    const listsRef = collection(db, 'todo boards', boardId, 'lists');
    const qLists = query(listsRef, orderBy('order', 'asc')); 

    const unsubscribeLists = onSnapshot(qLists, (querySnapshot) => {
      console.log("Lists snapshot received");
      const fetchedLists: ListData[] = [];
      querySnapshot.forEach((doc) => {
        fetchedLists.push({ id: doc.id, ...doc.data() } as ListData);
      });
      setLists(fetchedLists);
    }, (err) => {
      console.error("Error fetching lists: ", err);
      setError(prev => prev || 'Error loading lists.');
    });

    // Cleanup
    return () => {
      console.log(`BoardScreen: Cleaning up list listener for board ${boardId}`);
      unsubscribeLists();
    };

  }, [boardId, db, userId, authLoading]); // Dependencies remain the same

  // Fetch Cards - Simplified: Fetch all cards for the board initially
  useEffect(() => {
    if (!boardId) return;

    console.log(`BoardScreen: Setting up card listener for board ${boardId}`);
    
    const cardsRef = collectionGroup(db, 'todocards');
    const qCards = query(cardsRef, 
                         where("boardId", "==", boardId), 
                         orderBy('order', 'asc'));

    const unsubscribeCards = onSnapshot(qCards, (querySnapshot) => {
        console.log("Cards snapshot received");
        const newCardsByListId: { [key: string]: CardData[] } = {};
        querySnapshot.forEach((doc) => {
            const card = { id: doc.id, ...doc.data() } as CardData;
            // --- DEBUG LOG --- 
            console.log(`[BoardScreen Snapshot] Card Fetched: ID=${card.id}, Title="${card.title}", Desc Exists=${!!card.description}, DueDate=${card.dueDate}`);
            // --- END DEBUG LOG ---
            if (card.listId) {
                if (!newCardsByListId[card.listId]) {
                    newCardsByListId[card.listId] = [];
                }
                newCardsByListId[card.listId].push(card);
            }
        });
        // Ensure lists maintain order if they have no cards
        lists.forEach(list => {
            if (!newCardsByListId[list.id]) {
                newCardsByListId[list.id] = [];
            }
        });
        setCardsByListId(newCardsByListId);
    }, (err) => {
        console.error(`Error fetching cards for board ${boardId}: `, err);
        setError(prev => prev || 'Error loading cards.');
    });

    // Cleanup
    return () => {
        console.log(`BoardScreen: Cleaning up card listener for board ${boardId}`);
        unsubscribeCards();
    }

  }, [boardId, db, lists]); // Re-run if boardId or lists array changes

  // Function to add a new list
  const handleAddList = async () => {
    if (!newListName.trim() || !boardId || !auth?.currentUser?.uid) return;
    setIsAddingList(true);
    try {
      const listsRef = collection(db, 'todo boards', boardId, 'lists');
      await addDoc(listsRef, {
        name: newListName.trim(),
        order: lists.length, // Current length = next index
        createdAt: new Date(),
      });
      setNewListName('');
      setShowAddListInput(false);
    } catch (err) {
      console.error("Error adding list: ", err);
      Alert.alert('Error', 'Could not add list.');
    } finally {
      setIsAddingList(false);
    }
  };

  // --- Card Delete Handlers --- 
  const handleDeleteCard = (listId: string, cardId: string) => {
    console.log(`[BoardScreen] handleDeleteCard called for card ${cardId} in list ${listId}`); 
    if (!boardId || !listId || !cardId) {
        console.error("Missing IDs for delete handler");
        Alert.alert('Error', 'Cannot delete card: Missing information.');
        return;
    }
    console.log(`[BoardScreen] Setting state to show delete modal for ${cardId}`);
    setCardToDelete({ listId, cardId });
    setIsDeleteCardModalVisible(true);
  };

  const cancelCardDelete = () => {
    console.log("[BoardScreen] Cancel card delete action.");
    setIsDeleteCardModalVisible(false);
    setCardToDelete(null);
  };

  const confirmCardDelete = async () => {
    if (!cardToDelete || !boardId) {
        console.error("confirmCardDelete called without cardToDelete or boardId");
        cancelCardDelete();
        Alert.alert('Error', 'Could not perform delete.');
        return;
    }
    
    const { listId, cardId } = cardToDelete;
    console.log(`[BoardScreen] Confirming delete for card ${cardId} from list ${listId}`);
    
    setIsDeleteCardModalVisible(false); 
    setCardToDelete(null); 

    try {
      const cardDocRef = doc(db, 'todo boards', boardId, 'lists', listId, 'todocards', cardId);
      await deleteDoc(cardDocRef);
      console.log(`Card ${cardId} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting card: ", error);
      Alert.alert('Error', 'Could not delete the card.');
    }
  };

  // --- Card Title Update Handler ---
  const handleUpdateCardTitle = async (listId: string, cardId: string, newTitle: string) => {
      if (!boardId || !listId || !cardId) {
        console.error("Missing IDs for card title update");
        Alert.alert('Error', 'Cannot update card title: Missing information.');
        return;
      }
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) {
        console.warn("Card title update cancelled: New title is empty.");
        // No Alert needed, the component should ideally revert locally
        return;
      }

      console.log(`[BoardScreen] Updating title for card ${cardId} in list ${listId} to "${trimmedTitle}"`);
      try {
          const cardDocRef = doc(db, 'todo boards', boardId, 'lists', listId, 'todocards', cardId);
          await updateDoc(cardDocRef, { title: trimmedTitle });
          console.log(`Card ${cardId} title updated successfully.`);
          // No need to manually update local state, Firestore listener will handle it.
      } catch (error) {
          console.error("Error updating card title: ", error);
          Alert.alert('Error', 'Could not update the card title.');
          // Consider reverting optimistic update if one was implemented
      }
  };

  const handleUpdateCardDescription = async (listId: string, cardId: string, newDescription: string) => {
      if (!boardId || !listId || !cardId) {
        console.error("Missing IDs for card description update");
        Alert.alert('Error', 'Cannot update card description: Missing information.');
        return;
      }
      // No need to check if empty, allow clearing description
      console.log(`[BoardScreen] Updating description for card ${cardId} in list ${listId}`);
      try {
          const cardDocRef = doc(db, 'todo boards', boardId, 'lists', listId, 'todocards', cardId);
          // Use newDescription directly. If it's empty, description will be empty.
          await updateDoc(cardDocRef, { description: newDescription });
          console.log(`Card ${cardId} description updated successfully.`);
      } catch (error) {
          console.error("Error updating card description: ", error);
          Alert.alert('Error', 'Could not update the card description.');
      }
  };

  const handleUpdateCardDueDate = async (listId: string, cardId: string, newDueDate: Timestamp | null) => {
      if (!boardId || !listId || !cardId) {
        console.error("Missing IDs for card due date update");
        Alert.alert('Error', 'Cannot update card due date: Missing information.');
        return;
      }
      console.log(`[BoardScreen] Updating due date for card ${cardId} in list ${listId}`);
      try {
          const cardDocRef = doc(db, 'todo boards', boardId, 'lists', listId, 'todocards', cardId);
          // Update with the new Timestamp or null to remove it
          await updateDoc(cardDocRef, { dueDate: newDueDate }); 
          console.log(`Card ${cardId} due date updated successfully.`);
      } catch (error) {
          console.error("Error updating card due date: ", error);
          Alert.alert('Error', 'Could not update the card due date.');
      }
  };

  // --- List Delete Handlers ---
  const handleDeleteList = (listId: string) => {
      console.log(`[BoardScreen] handleDeleteList called for list ${listId}`);
      if (!boardId || !listId) {
          console.error("Missing IDs for list delete handler");
          Alert.alert('Error', 'Cannot delete list: Missing information.');
          return;
      }
      console.log(`[BoardScreen] Setting state to show delete list modal for ${listId}`);
      setListToDeleteId(listId);
      setIsDeleteListModalVisible(true);
  };
  
  const cancelListDelete = () => {
      console.log("[BoardScreen] Cancel list delete action.");
      setIsDeleteListModalVisible(false);
      setListToDeleteId(null);
  };
  
  const confirmListDelete = async () => {
      if (!listToDeleteId || !boardId) {
          console.error("confirmListDelete called without listToDeleteId or boardId");
          cancelListDelete();
          Alert.alert('Error', 'Could not perform list delete.');
          return;
      }
  
      const listId = listToDeleteId;
      console.log(`[BoardScreen] Confirming delete for list ${listId} and its cards.`);
      
      setIsDeleteListModalVisible(false);
      setListToDeleteId(null);
  
      try {
          const batch = writeBatch(db);
  
          // 1. Find all cards in the list
          const cardsQuery = query(collection(db, 'todo boards', boardId, 'lists', listId, 'todocards'));
          const cardsSnapshot = await getDocs(cardsQuery);
          console.log(`Found ${cardsSnapshot.size} cards to delete in list ${listId}.`);
          
          // 2. Add delete operation for each card to the batch
          cardsSnapshot.forEach((cardDoc) => {
              console.log(`Adding delete for card ${cardDoc.id} to batch.`);
              batch.delete(cardDoc.ref);
          });
  
          // 3. Add delete operation for the list itself
          const listDocRef = doc(db, 'todo boards', boardId, 'lists', listId);
          console.log(`Adding delete for list ${listId} to batch.`);
          batch.delete(listDocRef);
  
          // 4. Commit the batch
          await batch.commit();
          console.log(`List ${listId} and its cards deleted successfully.`);
      } catch (error) {
          console.error("Error deleting list and its cards: ", error);
          Alert.alert('Error', 'Could not delete the list.');
      }
  };

  // --- List Title Update Handler ---
  const handleUpdateListTitle = async (listId: string, newTitle: string) => {
      if (!boardId || !listId) {
        console.error("Missing IDs for list title update");
        Alert.alert('Error', 'Cannot update list title: Missing information.');
        return;
      }
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) {
        console.warn("List title update cancelled: New title is empty.");
        return;
      }

      console.log(`[BoardScreen] Updating title for list ${listId} to "${trimmedTitle}"`);
      try {
          const listDocRef = doc(db, 'todo boards', boardId, 'lists', listId);
          await updateDoc(listDocRef, { name: trimmedTitle });
          console.log(`List ${listId} title updated successfully.`);
          // Local state updates via Firestore listener
      } catch (error) {
          console.error("Error updating list title: ", error);
          Alert.alert('Error', 'Could not update the list title.');
      }
  };

  // --- Card Detail Panel Handlers ---
  const handleOpenCardDetail = (card: CardData) => {
      console.log(`[BoardScreen] Opening detail panel for card: ${card.id}`);
      setSelectedCard(card);
      setIsPanelOpenToggled(true); // <<< ALSO set toggle state to true
      // setIsDetailPanelVisible(true); // This state is no longer directly used for visibility
  };

  const handleCloseCardDetail = () => {
      console.log("[BoardScreen] Closing detail panel via panel's X button.");
      setSelectedCard(null); 
      setIsPanelOpenToggled(false); // <<< ALSO set toggle state to false
      // setIsDetailPanelVisible(false); // This state is no longer directly used for visibility
  };

  // <<< NEW handler for header toggle button
  const handleTogglePanelVisibility = () => {
    setIsPanelOpenToggled(prev => {
        const closing = !prev; // Are we closing the panel?
        if (closing) {
            console.log("[BoardScreen] Closing detail panel via header toggle.");
            setSelectedCard(null); // Clear selected card when toggling closed
        } else {
            console.log("[BoardScreen] Opening detail panel via header toggle (will show if a card is selected).");
            // If no card is selected, the panel still won't show, which is desired.
        }
        return !prev;
    });
  };

  // <<< Update the image handler >>>
  const handleUpdateCardImage = async (listId: string, cardId: string, imageUri: string | null) => {
    if (!boardId) {
        console.error("Cannot update image: boardId is missing.");
        throw new Error("Board context is missing."); // Throw error to be caught by caller
    }
    
    const storage = getStorage();
    const imagePath = `cardImages/${boardId}/${cardId}.jpg`; // Define a consistent path
    const imageRef = ref(storage, imagePath);
    const cardDocRef = doc(db, 'todo boards', boardId, 'lists', listId, 'todocards', cardId);

    if (imageUri) {
        // --- Upload Logic --- 
        console.log(`[BoardScreen] Uploading image for card ${cardId}. Local URI: ${imageUri}`);
        try {
            // 1. Fetch the image data as a blob
            const response = await fetch(imageUri);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            console.log(`Image fetched as blob. Size: ${blob.size}, Type: ${blob.type}`);

            // 2. Upload the blob to Firebase Storage (Resumable for progress)
            const uploadTask = uploadBytesResumable(imageRef, blob);

            // Optional: Listen to progress (can be enhanced later)
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
              }, 
              (error) => {
                console.error("Upload Error:", error);
                // Handle unsuccessful uploads (e.g., based on error.code)
                throw error; // Re-throw to be caught by outer catch
              }, 
              async () => {
                // 3. Upload completed successfully, now get the download URL
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log('File available at', downloadURL);
                    
                    // 4. Update Firestore with the download URL
                    await updateDoc(cardDocRef, { imageUrl: downloadURL });
                    console.log(`Firestore updated successfully for card ${cardId} with imageUrl.`);
                } catch (error) {
                    console.error("Error getting download URL or updating Firestore:", error);
                    throw error; // Propagate error
                }
              }
            );
            
            // Return the uploadTask promise to allow await in the caller (handleSave)
            await uploadTask; 

        } catch (error) {
            console.error("Error during image upload process:", error);
            Alert.alert("Upload Failed", "Could not upload the image. Please check network and permissions.");
            throw error; // Re-throw error so handleSave knows it failed
        }
    } else {
        // --- Delete Logic --- 
        console.log(`[BoardScreen] Removing image for card ${cardId}.`);
        try {
            // 1. Delete the file from Firebase Storage
            // Check if file exists before deleting? (Optional, deleteObject handles non-existent gracefully)
            await deleteObject(imageRef);
            console.log(`Image deleted from Storage at path: ${imagePath}`);

            // 2. Update Firestore, removing the imageUrl field
            await updateDoc(cardDocRef, { imageUrl: null }); // Set to null or use deleteField() 
            console.log(`Firestore updated successfully for card ${cardId}, removing imageUrl.`);

        } catch (error) {
             // If error is 'storage/object-not-found', we can potentially ignore it 
             // if we just want to ensure Firestore is updated.
            if ((error as any)?.code === 'storage/object-not-found') {
                console.warn(`Image not found in storage for card ${cardId}, but attempting Firestore update anyway.`);
                 try {
                    await updateDoc(cardDocRef, { imageUrl: null }); 
                    console.log(`Firestore updated successfully for card ${cardId}, removing imageUrl (image was already missing).`);
                 } catch (firestoreError) {
                    console.error("Error updating Firestore after failing to find image in Storage:", firestoreError);
                    Alert.alert("Update Failed", "Could not update card details after image removal attempt.");
                    throw firestoreError; // Throw the Firestore error
                 }
            } else {
                console.error("Error deleting image or updating Firestore:", error);
                Alert.alert("Removal Failed", "Could not remove the image.");
                throw error; // Re-throw other errors
            }
        }
    }
};

  // <<< NEW Handler for link URL update >>>
  const handleUpdateCardLinkUrl = async (listId: string, cardId: string, newLinkUrl: string | null) => {
      if (!boardId || !listId || !cardId) {
        console.error("Missing IDs for card link URL update");
        throw new Error("Cannot update link URL: Missing information.");
      }
      
      console.log(`[BoardScreen] Updating link URL for card ${cardId}`);
      try {
          const cardDocRef = doc(db, 'todo boards', boardId, 'lists', listId, 'todocards', cardId);
          // Update with the new URL string or null to remove it
          await updateDoc(cardDocRef, { linkUrl: newLinkUrl || null }); 
          console.log(`Card ${cardId} link URL updated successfully.`);
      } catch (error) {
          console.error("Error updating card link URL:", error);
          Alert.alert('Error', 'Could not update the card link URL.');
          throw error; // Re-throw
      }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    console.log("Drag started:", event.active.id);
    // Assuming only cards are draggable for now
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCardId(null);
    const { active, over } = event;
    console.log("[handleDragEnd] Event:", event);

    // Extract card data directly from the active drag item
    const cardData = active.data.current?.card as CardData | undefined;

    if (!over || !boardId || !cardData || active.id === over.id) {
        if (!cardData) console.log("[handleDragEnd] Aborting: Card data missing from active drag item.");
        else console.log("[handleDragEnd] Aborting: No valid drop target or no movement.");
        return;
    }

    const cardId = cardData.id;
    const originalListId = cardData.listId; // Get original list from drag data
    const rawOverId = over.id as string;

    console.log(`[handleDragEnd] Dragged Card Info: ID=${cardId}, Original List=${originalListId}`);

    // --- Determine the target list ID --- 
    let targetListId: string | null = null;
    
    // Check if dropped directly onto a list container
    if (lists.some(list => list.id === rawOverId)) {
        targetListId = rawOverId;
        console.log(`[handleDragEnd] Dropped directly onto list: ${targetListId}`);
    } else {
        // Assume dropped onto a card, find that card's listId from current state
        console.log(`[handleDragEnd] Dropped onto item ${rawOverId}, attempting to find parent list.`);
        for (const [listId, cards] of Object.entries(cardsByListId)) {
            if (cards.some(card => card.id === rawOverId)) {
                targetListId = listId;
                console.log(`[handleDragEnd] Found parent list for item ${rawOverId}: ${targetListId}`);
                break;
            }
        }
    }

    if (!targetListId) {
        console.log("[handleDragEnd] Could not determine target list ID from drop.");
        return;
    }
    // --- End Target List ID Determination ---

    // Prevent unnecessary updates if dropped in the same list
    if (originalListId === targetListId) {
        console.log("[handleDragEnd] Card dropped in same list. Calculating new order...");
        
        let newOrder: number | null = null; // To store the calculated order

        // --- Optimistic UI Update & Order Calculation --- 
        setCardsByListId(currentCardsByListId => {
            const listBeforeUpdate = currentCardsByListId[originalListId] || [];
            if (!listBeforeUpdate.length) { // List empty, nothing to reorder visually, but set order for Firestore
                newOrder = Date.now(); 
                return currentCardsByListId; 
            }

            const draggedItemIndex = listBeforeUpdate.findIndex(c => c.id === cardId);
            if (draggedItemIndex === -1) { 
                console.warn("Optimistic reorder failed: Couldn't find dragged item.");
                newOrder = Date.now(); // Fallback order
                return currentCardsByListId;
            }

            // Create a mutable copy for manipulation
            const updatedList = [...listBeforeUpdate];
            const [draggedItem] = updatedList.splice(draggedItemIndex, 1);

            // Find the target index based on over.id
            let targetIndex = -1;
            if (lists.some(list => list.id === over.id)) {
                targetIndex = updatedList.length; // Move to end
            } else {
                targetIndex = updatedList.findIndex(c => c.id === over.id);
                if (targetIndex === -1) { // Target item not found (maybe the list container), move to end
                     targetIndex = updatedList.length; 
                }
            }
            
            console.log(`Optimistic reorder: Target index ${targetIndex}`);

            // --- Calculate numerical order --- 
            const orderGap = 1000; // Gap for adding to end/start
            const prevItem = updatedList[targetIndex - 1];
            const nextItem = updatedList[targetIndex];

            if (!prevItem && !nextItem) { // List was empty or only contained dragged item
                 newOrder = Date.now(); // Use timestamp if list becomes empty after removing item
            } else if (!prevItem) { // Inserting at the beginning
                 newOrder = nextItem.order / 2;
            } else if (!nextItem) { // Inserting at the end
                 newOrder = prevItem.order + orderGap;
            } else { // Inserting in the middle
                 newOrder = (prevItem.order + nextItem.order) / 2;
            }
            console.log(`Calculated newOrder: ${newOrder}`);
            // --- End Order Calculation ---

            // Re-insert at calculated index with the calculated order
            updatedList.splice(targetIndex, 0, { ...draggedItem, order: newOrder }); 
            
            return {
                ...currentCardsByListId,
                [originalListId]: updatedList,
            };
        });

        // --- Firestore Update (Runs in background) --- 
        // Only proceed if we calculated a valid order
        if (newOrder !== null) { 
             try {
                 const cardDocRef = doc(db, 'todo boards', boardId, 'lists', originalListId, 'todocards', cardId);
                 await updateDoc(cardDocRef, { order: newOrder }); // Use calculated order
                 console.log(`Firestore update success for order of card ${cardId} to ${newOrder}.`);
             } catch (error) {
                 console.error(`Firestore update error for order of card ${cardId}: `, error);
                 // TODO: Revert optimistic update here? More complex.
                 Alert.alert('Error', 'Failed to save card reorder. Please refresh.');
             }
        } else {
             console.warn("Firestore update skipped: newOrder was null.");
        }
        return; // Stop execution, no need for batch write
    }

    // --- Firestore Update using Batch Write (Moving between lists) --- 
    console.log(`Batch Write: Move card ${cardId} from list ${originalListId} to list ${targetListId}`);
    try {
        // Create a batch
        const batch = writeBatch(db);

        // 1. Define ref for the original document location
        const originalCardRef = doc(db, 'todo boards', boardId, 'lists', originalListId, 'todocards', cardId);
        
        // 2. Define ref for the new document location
        const newCardRef = doc(db, 'todo boards', boardId, 'lists', targetListId, 'todocards', cardId);

        // 3. Prepare data for the new document (copy old, update listId & order)
        const newOrder = Date.now(); // Still using timestamp for simplicity
        const newCardData = { 
            ...cardData, // Spread original data (title, boardId, createdAt etc.)
            listId: targetListId, // Update listId
            order: newOrder // Update order
        };

        // 4. Add operations to the batch
        batch.delete(originalCardRef);       // Delete the original
        batch.set(newCardRef, newCardData); // Create the new one

        // 5. Commit the batch
        await batch.commit();
        console.log("Firestore batch write successful.");
      
      // Local state updates will be handled by the onSnapshot listener

    } catch (error) {
      console.error("Error performing batch write for card move: ", error);
      // If the error persists, investigate Firestore rules or data structure mismatch.
      Alert.alert('Error', 'Could not move card. Please try again.');
    }
  };

  // --- Find the currently dragged card data for DragOverlay ---
  const activeCardData = activeCardId ? 
      Object.values(cardsByListId)
            .flat()
            .find(card => card.id === activeCardId) 
      : null;

  // --- Derived State ---
  // Memoize the flattened list of all cards for the board
  const allCards = useMemo(() => {
      return Object.values(cardsByListId).flat();
  }, [cardsByListId]);

  // --- Header Buttons for View Toggle --- 
  const headerRightButtons = useCallback(() => (
    <View style={styles.headerButtonsContainer}>
        {/* Board/Calendar Toggles */}
        <Pressable onPress={() => setViewMode('board')} style={styles.headerButton} disabled={viewMode === 'board'}>
            <Ionicons name="list" size={24} color={viewMode === 'board' ? colors.primary : colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => setViewMode('calendar')} style={styles.headerButton} disabled={viewMode === 'calendar'}>
             <Ionicons name="calendar" size={24} color={viewMode === 'calendar' ? colors.primary : colors.textSecondary} />
        </Pressable>
        {/* <<< NEW Panel Toggle Button >>> */}
        <Pressable onPress={handleTogglePanelVisibility} style={styles.headerButton}> 
             <Ionicons 
                name="information-circle-outline" 
                size={24} 
                color={isPanelOpenToggled ? colors.primary : colors.textSecondary} // Indicate active state
            />
        </Pressable>
    </View>
  ), [viewMode, colors, isPanelOpenToggled]); // <<< Add isPanelOpenToggled dependency

  // --- Move Card Handler ---
  const handleMoveCard = async (cardId: string, originalListId: string, targetListId: string | '__DONE__') => {
    if (!boardId || !cardId || !originalListId || !targetListId) {
        console.error("Missing IDs for card move");
        throw new Error("Cannot move card: Missing information.");
    }

    let actualTargetListId = targetListId;

    // Handle the special "__DONE__" case
    if (targetListId === '__DONE__') {
        const doneList = lists.find(list => list.name.toLowerCase() === 'done');
        if (!doneList) {
            Alert.alert("Cannot Complete", "No list named 'Done' found on this board.");
            throw new Error("Done list not found"); // Prevent further action
        }
        actualTargetListId = doneList.id;
    }

    if (originalListId === actualTargetListId) {
        console.log("Card is already in the target list. No move needed.");
        return; // Don't do anything if the target is the same
    }

    console.log(`Moving card ${cardId} from list ${originalListId} to list ${actualTargetListId}`);

    try {
        const batch = writeBatch(db);
        const originalCardRef = doc(db, 'todo boards', boardId, 'lists', originalListId, 'todocards', cardId);
        const newCardRef = doc(db, 'todo boards', boardId, 'lists', actualTargetListId, 'todocards', cardId);

        // Need the card data to move it
        // Find the card data from the current state
        const cardToMove = cardsByListId[originalListId]?.find(c => c.id === cardId);

        if (!cardToMove) {
            console.error(`Cannot find card data for card ${cardId} in list ${originalListId}`);
            throw new Error("Card data not found for move.");
        }

        const newCardData = {
            ...cardToMove,
            listId: actualTargetListId,
            order: Date.now(), // Simple ordering for now when moving
        };

        batch.delete(originalCardRef);
        batch.set(newCardRef, newCardData);

        await batch.commit();
        console.log(`Card ${cardId} moved successfully to list ${actualTargetListId}.`);
        // Local state update will be handled by listeners

    } catch (error) {
        console.error("Error moving card:", error);
        Alert.alert("Error", "Could not move the card.");
        throw error; // Re-throw to indicate failure to handleSave
    }
  };

  if (loading || authLoading) { // Check authLoading too
    // Use theme colors for loading view
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={{ color: colors.text }}>Loading Board...</Text>
      </View>
    );
  }

  if (error) {
     // Use theme colors for error view
    return (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
            <Text style={[styles.errorText, { color: colors.buttonDestructiveBackground }]}>{error}</Text>
        </View>
    );
  }
  
  if (!board) {
    // Use theme colors for error view
    return (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
            <Text style={[styles.errorText, { color: colors.buttonDestructiveBackground }]}>
                Could not load board data or access denied.
            </Text>
        </View>
    );
  }

  return (
    <> 
      {/* Header Configuration */}      
      <Stack.Screen 
          options={{ 
              title: board?.name || 'Board', 
              headerTintColor: colors.text, 
              headerStyle: { backgroundColor: colors.backgroundSection },
              headerRight: headerRightButtons, // Add toggle buttons
          }} 
      />

      {/* Main Content Area -> This should be the container with row layout */}
      <View style={styles.mainContentRow}> 

         {/* Board/Calendar Area -> This needs flex: 1 */}
         <View style={styles.boardArea}> 
            {viewMode === 'board' ? (
              <DndContext 
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd} 
                  onDragCancel={() => setActiveCardId(null)}
                  collisionDetection={closestCenter}
              >
                  {/* Keep existing board layout */}
                  {/* <Text style={[styles.boardTitle, { color: colors.text }]}>{board.name}</Text> // Title is in header now */}
                  <ScrollView horizontal={true} style={styles.listsScrollView}>
                      {lists.map(list => (
                          <DroppableListContainer 
                              key={list.id} 
                              list={list}
                              onDeleteList={handleDeleteList}
                              onUpdateListTitle={handleUpdateListTitle}
                          >
                              {boardId && (
                                  <BoardList 
                                      listId={list.id} 
                                      boardId={boardId} 
                                      cards={cardsByListId[list.id] || []} 
                                      onDeleteCard={handleDeleteCard}
                                      onUpdateCardTitle={handleUpdateCardTitle}
                                      onOpenCardDetail={handleOpenCardDetail} 
                                  />
                              )}
                          </DroppableListContainer>
                      ))}
                      {/* Add List Component/Button */}
                      {/* Apply theme colors to container, button, form, input */}
                      <View style={[styles.addListContainer, { backgroundColor: showAddListInput ? colors.backgroundList : colors.primaryLight + '50' }]}> 
                          {showAddListInput ? (
                              <View style={styles.addListForm}> 
                                  <TextInput
                                      placeholder="Enter list title..."
                                      value={newListName}
                                      onChangeText={setNewListName}
                                      style={[styles.addListInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} // Theme colors
                                      placeholderTextColor={colors.textSecondary}
                                      autoFocus={true}
                                  />
                                  <View style={styles.addListActions}>
                                      {/* Use theme colors for button */}
                                      <Button 
                                          title={isAddingList ? "Adding..." : "Add list"} 
                                          onPress={handleAddList} 
                                          disabled={isAddingList} 
                                          color={colors.primary}
                                      />
                                      <Pressable onPress={() => setShowAddListInput(false)} style={styles.cancelButton}>
                                          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>X</Text> {/* Theme color */}
                                      </Pressable>
                                  </View>
                              </View>
                          ) : (
                              <Pressable onPress={() => setShowAddListInput(true)} style={[styles.addListButton, { backgroundColor: colors.primaryLight + '80' }]}> {/* Theme color */}
                                  <Text style={[styles.addListButtonText, { color: colors.text }]}>+ Add another list</Text>{/* Theme color */}
                              </Pressable>
                          )}
                      </View>
                  </ScrollView>
                  {/* Drag Overlay */} 
                  <DragOverlay>
                      {activeCardId && activeCardData ? (
                          <DraggableCard 
                              card={activeCardData} 
                              onDelete={() => {}} // Dummy handler for overlay
                              onOpenDetail={() => {}} // Dummy handler for overlay
                          /> 
                      ) : null}
                  </DragOverlay>
              </DndContext>
            ) : (
               // Render Calendar View 
               <CalendarView 
                  cards={allCards} 
                  colors={colors} 
                  onCardPress={handleOpenCardDetail} // Open detail panel when card in list is pressed
                  // onDayPress={(day) => console.log('Calendar day pressed', day)} // Optional day press handler
               />
            )}
         </View>
         
         {/* Detail Panel (Conditional Rendering Updated) */}
         {isPanelOpenToggled && selectedCard && ( 
           <CardDetailPanel
              card={selectedCard}
              colors={colors}
              lists={lists} // <<< Pass lists array
              onClose={handleCloseCardDetail}
              onUpdateTitle={handleUpdateCardTitle}
              onUpdateDescription={handleUpdateCardDescription}
              onUpdateDueDate={handleUpdateCardDueDate}
              onUpdateImage={handleUpdateCardImage}
              onUpdateLinkUrl={handleUpdateCardLinkUrl} // <<< Pass link handler
              onMoveCard={handleMoveCard} // <<< Pass move handler
              onDeleteCard={handleDeleteCard} // <<< Pass delete handler
           />
         )}

      </View> 
      
      {/* Modals remain outside the main row layout */}
      {/* Card Delete Modal */}
      <Modal
          animationType="fade"
          transparent={true}
          visible={isDeleteCardModalVisible}
          onRequestClose={cancelCardDelete} 
      >
         {/* Apply theme colors to modal overlay, content, text, buttons */}
         <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.backgroundSection }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Card</Text>
                  <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>Are you sure you want to delete this card?</Text>
                  <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonSecondaryBackground }]} onPress={cancelCardDelete}>
                          <Text style={[styles.modalButtonText, { color: colors.buttonSecondaryText }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonDestructiveBackground }]} onPress={confirmCardDelete}>
                          <Text style={[styles.modalButtonText, { color: colors.buttonDestructiveText }]}>Delete</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

      {/* List Delete Modal */}
      <Modal
          animationType="fade"
          transparent={true}
          visible={isDeleteListModalVisible}
          onRequestClose={cancelListDelete} 
      >
          {/* Apply theme colors to modal overlay, content, text, buttons */}
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.backgroundSection }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Delete List</Text>
                  <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>Are you sure you want to delete this list and all its cards?</Text>
                  <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonSecondaryBackground }]} onPress={cancelListDelete}>
                          <Text style={[styles.modalButtonText, { color: colors.buttonSecondaryText }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonDestructiveBackground }]} onPress={confirmListDelete}>
                          <Text style={[styles.modalButtonText, { color: colors.buttonDestructiveText }]}>Delete</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  container: {
    flex: 1,
    // backgroundColor applied dynamically
  },
  boardTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      margin: 15,
      // color applied dynamically
  },
  errorText: {
    // color applied dynamically
    fontSize: 16,
    textAlign: 'center', // Center error text
    paddingHorizontal: 20, // Add padding
  },
  listsScrollView: {
      flex: 1,
      paddingHorizontal: 5,
  },
  // listContainer style is removed (now in DroppableListContainer)
  // listHeader style is removed (now in DroppableListContainer)
  // deleteListButton style is removed (now in DroppableListContainer)
  // deleteListButtonText style is removed (now in DroppableListContainer)
  cardPlaceholder: { // Keep for potential future use
      // color: '#5e6c84',
      color: Colors.light.textSecondary, // Default or use theme
      fontSize: 14,
      marginTop: 10,
  },
  addListContainer: {
    // backgroundColor applied dynamically
    borderRadius: 6,
    marginHorizontal: 5,
    width: 270, 
    alignSelf: 'flex-start',
    padding: 8, 
  },
  addListButton: {
    padding: 10,
    borderRadius: 6,
    // backgroundColor applied dynamically
    alignItems: 'center',
  },
  addListButtonText: {
      // color applied dynamically
  },
  addListForm: {
      // backgroundColor applied dynamically
      padding: 8,
      borderRadius: 6,
  },
  addListInput: {
      // backgroundColor applied dynamically
      borderWidth: 1,
      // borderColor applied dynamically
      borderRadius: 3,
      padding: 8,
      marginBottom: 8,
      // color applied dynamically
  },
  addListActions: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  cancelButton: {
      marginLeft: 10,
      padding: 5,
  },
  cancelButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      // color applied dynamically
  },
  // --- Modal Styles --- 
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    // backgroundColor applied dynamically
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    // shadowColor: '#000', // Use theme shadow
    shadowColor: Colors.light.shadow, // Default or use theme
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    // color applied dynamically
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    // color applied dynamically
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  // Removed specific modal button background styles
  modalButtonText: {
    // color applied dynamically
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    marginRight: 10,
  },
  headerButton: {
    paddingHorizontal: 8,
  },
  mainContentRow: { // This holds the board and the panel side-by-side
      flex: 1, // Take remaining vertical space
      flexDirection: 'row',
  },
  boardArea: { // This holds the actual board (lists/cards) or calendar
      flex: 1, // Take available horizontal space (panel has fixed width)
      // No specific background needed, parent has it
  },
}); 