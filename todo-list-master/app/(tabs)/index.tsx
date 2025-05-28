import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TextInput,
  Button,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { View } from '@/components/Themed';
import { collection, query, where, onSnapshot, getFirestore, addDoc, DocumentData, QueryDocumentSnapshot, deleteDoc, getDocs, writeBatch, doc } from 'firebase/firestore';
import { auth as firebaseAuth } from '../_firebase/config'; // Rename to avoid conflict with getAuth()
import { useRouter } from 'expo-router'; // Import useRouter
import { getAuth } from 'firebase/auth';
import Colors from '../../constants/Colors'; // Import Colors
import { useColorScheme } from '../../components/useColorScheme'; // Import useColorScheme

// Define a type for our board data
interface Board {
  id: string;
  name: string;
  // Add other fields if needed, e.g., createdAt
}

export default function BoardsTabScreen() {
  const colorScheme = useColorScheme() ?? 'light'; // Get color scheme
  const colors = Colors[colorScheme]; // Get theme colors

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardName, setNewBoardName] = useState(''); // State for new board name
  const [isCreating, setIsCreating] = useState(false); // State for creation loading
  const router = useRouter(); // Initialize router

  // --- Board Delete Modal State ---
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    // Add check for auth object itself
    if (!auth) {
        console.log("Auth service not initialized yet, cannot fetch boards.");
        setLoading(false);
        setBoards([]);
        return; // Exit if auth service isn't ready
    }
    
    const currentUser = auth.currentUser;

    // Explicitly check currentUser before accessing uid
    if (!currentUser || !currentUser.uid) { 
      console.log("No user logged in or UID missing, cannot fetch boards.");
      setLoading(false);
      setBoards([]); 
      return; // Exit if no user or uid
    }

    const userId = currentUser.uid; // Store uid in a variable after check
    console.log(`Setting up Firestore listener for boards owned by ${userId}`);
    
    // Query boards collection where ownerId matches the current user's UID
    const boardsRef = collection(db, 'todo boards');
    const q = query(boardsRef, where("ownerId", "==", userId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBoards: Board[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        // Explicitly cast doc.data() or ensure type safety
        const data = doc.data() as { name: string; /* other expected fields */ }; 
        fetchedBoards.push({
          id: doc.id,
          name: data.name || 'Unnamed Board' // Handle potential missing name
        });
      });
      console.log("Fetched boards:", fetchedBoards);
      setBoards(fetchedBoards);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching boards: ", error);
      setLoading(false);
      // Optionally show an error message to the user
    });

    // Cleanup listener on unmount
    return () => {
        console.log("Cleaning up Firestore listener for boards.");
        unsubscribe();
    }
  }, [auth.currentUser]); // Re-run if user changes

  // Function to handle board creation
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      Alert.alert('Error', 'Please enter a board name.');
      return;
    }
    
    // Check if auth object is available first
    if (!auth) {
        Alert.alert('Error', 'Authentication service is not ready.');
        console.error("Cannot create board: Auth service not initialized.");
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
        Alert.alert('Error', 'You must be logged in to create a board.');
        return;
    }

    setIsCreating(true);
    const db = getFirestore();
    try {
      const boardsRef = collection(db, 'todo boards');
      await addDoc(boardsRef, {
        name: newBoardName.trim(),
        ownerId: currentUser.uid,
        createdAt: new Date(), // Optional: add a timestamp
      });
      console.log("Board created successfully!");
      setNewBoardName(''); // Clear input field
    } catch (error) {
      console.error("Error creating board: ", error);
      Alert.alert('Error', 'Could not create board. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Function to handle navigating to a board
  const handleNavigateToBoard = (boardId: string) => {
    console.log(`Navigating to board: ${boardId}`);
    router.push(`/board/${boardId}`);
  };

  // --- Board Delete Handlers ---
  const handleDeleteBoard = (board: Board) => {
    console.log(`[BoardsScreen] handleDeleteBoard called for board ${board.id} (${board.name})`);
    setBoardToDelete(board);
    setIsDeleteModalVisible(true);
  };

  const cancelBoardDelete = () => {
    console.log("[BoardsScreen] Cancel board delete.");
    setIsDeleteModalVisible(false);
    setBoardToDelete(null);
  };

  const confirmBoardDelete = async () => {
    if (!boardToDelete) {
      console.error("confirmBoardDelete called with no board selected.");
      cancelBoardDelete();
      return;
    }

    const boardId = boardToDelete.id;
    console.log(`[BoardsScreen] Confirming delete for board ${boardId}`);
    setIsDeleteModalVisible(false);
    setBoardToDelete(null);
    setLoading(true); // Show loading indicator during delete

    try {
      // NOTE: This client-side recursive delete can be slow/unreliable for large boards.
      // A Cloud Function is the recommended approach for production.
      const batch = writeBatch(db);
      let operationCount = 0; // Track operations for potential batch splitting
      const maxBatchOps = 499; // Firestore batch limit (slightly under 500)

      // 1. Get all lists
      const listsRef = collection(db, 'todo boards', boardId, 'lists');
      const listsSnapshot = await getDocs(listsRef);
      console.log(`Found ${listsSnapshot.size} lists in board ${boardId}`);

      // 2. For each list, get all cards and add deletes to batch
      for (const listDoc of listsSnapshot.docs) {
          const listId = listDoc.id;
          console.log(`Processing list ${listId}`);
          const cardsRef = collection(db, 'todo boards', boardId, 'lists', listId, 'todocards');
          const cardsSnapshot = await getDocs(cardsRef);
          console.log(`  Found ${cardsSnapshot.size} cards`);
          
          cardsSnapshot.forEach((cardDoc) => {
              batch.delete(cardDoc.ref);
              operationCount++;
              // TODO: Handle batch splitting if operationCount > maxBatchOps
              // (Requires committing current batch and starting a new one)
          });

          // 3. Add list delete to batch
          batch.delete(listDoc.ref);
          operationCount++;
           // TODO: Handle batch splitting
      }

      // 4. Add board delete to batch
      const boardDocRef = doc(db, 'todo boards', boardId);
      batch.delete(boardDocRef);
      operationCount++;
      // TODO: Handle batch splitting

      console.log(`Committing batch with ${operationCount} delete operations.`);
      await batch.commit();
      console.log(`Board ${boardId} and its contents deleted successfully.`);
      // UI update will happen via the board listener

    } catch (error) {
        console.error("Error deleting board and contents: ", error);
        Alert.alert('Error', 'Could not delete the board. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={{ color: colors.text }}>Loading Boards...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Input and Button for Creating Boards */}
      <View style={styles.createBoardContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="New Board Name"
          value={newBoardName}
          onChangeText={setNewBoardName}
          placeholderTextColor={colors.textSecondary}
        />
        <Button 
          title={isCreating ? "Creating..." : "Create Board"} 
          onPress={handleCreateBoard} 
          disabled={isCreating} 
          color={colors.primary}
        />
      </View>

      {/* Display existing boards or message */}
      {boards.length === 0 && !loading ? (
        <Text style={[styles.noBoardsText, { color: colors.textSecondary }]}>No boards found. Create one above!</Text>
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleNavigateToBoard(item.id)} style={[styles.boardItem, { backgroundColor: colors.backgroundSection }]}>
              <Text style={[styles.boardName, { color: colors.text }]}>{item.name}</Text>
              <Pressable 
                onPress={() => handleDeleteBoard(item)} 
                style={styles.deleteBoardButton} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.deleteBoardButtonText, { color: colors.buttonDestructiveBackground }]}>✕</Text>
              </Pressable>
            </Pressable>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* --- Board Delete Confirmation Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={cancelBoardDelete}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSection }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Board</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to delete the board "{boardToDelete?.name || ''}" 
              and all its lists and cards? This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, { backgroundColor: colors.buttonSecondaryBackground }]} onPress={cancelBoardDelete}>
                <Text style={[styles.modalButtonText, { color: colors.buttonSecondaryText }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: colors.buttonDestructiveBackground }]} onPress={confirmBoardDelete}>
                <Text style={[styles.modalButtonText, { color: colors.buttonDestructiveText }]}>Delete Board</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  createBoardContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    marginRight: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  noBoardsText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 30,
  },
  list: {
    width: '100%',
    marginTop: 10,
  },
  listContent: {
    alignItems: 'center', 
  },
  boardItem: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 5,
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardName: {
    fontSize: 18,
    flexShrink: 1,
    marginRight: 10,
  },
  deleteBoardButton: {
    padding: 5,
  },
  deleteBoardButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
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
  },
  modalButtonText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
