import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TextInput,
  Button,
  Alert,
  Pressable,
  Modal, // Keep Modal if used by copied code for delete confirmation
  TouchableOpacity, // Added for consistency if needed
} from 'react-native';
// import { View } from '@/components/Themed'; // OLD - from todo-list-master
import { View } from '../../src/components/Themed.tsx'; // CORRECTED PATH
// import { collection, query, where, onSnapshot, getFirestore, addDoc, DocumentData, QueryDocumentSnapshot, deleteDoc, getDocs, writeBatch, doc } from 'firebase/firestore'; // OLD
// import { auth as firebaseAuth } from '../_firebase/config'; // OLD - Rename to avoid conflict with getAuth()
import { useRouter, Stack } from 'expo-router';
// import { getAuth } from 'firebase/auth'; // OLD
// import Colors from '../../constants/Colors'; // OLD - from todo-list-master
// import { useColorScheme } from '../../components/useColorScheme'; // OLD - from todo-list-master

import { useAuth } from '../../src/contexts/AuthContext.tsx'; // CORRECTED PATH
import { useFirebase } from '../../src/contexts/FirebaseContext.tsx'; // CORRECTED PATH
import { useTheme } from '../../src/contexts/ThemeContext.tsx'; // CORRECTED PATH
import { LoadingScreen } from '../../src/components/LoadingScreen.tsx'; // CORRECTED PATH and component name
import { Ionicons } from '@expo/vector-icons'; // For icons if needed
import { lightTheme, darkTheme } from '../../src/styles/theme.ts'; // Import theme objects

// Define a type for our board data (can be moved to a shared types file later)
interface Board {
  id: string;
  name: string;
  ownerId?: string; // Ensure this matches Firestore structure
  createdAt?: any; // Or specific Timestamp type
}

export default function TodoBoardsScreen() { // Renamed from BoardsTabScreen
  const { theme: themeName } = useTheme(); // Get the theme name ('light' or 'dark')
  const router = useRouter();
  const { user } = useAuth(); // NEW - Get user from your AuthContext
  const { service, isInitialized: firebaseInitialized } = useFirebase(); // NEW
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors; // Select colors object

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  // Dynamic styles based on your theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: currentThemeColors.background,
    },
    createBoardContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      alignItems: 'center',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
      padding: 10,
      marginRight: 10,
      borderRadius: 5,
      color: currentThemeColors.text,
      backgroundColor: currentThemeColors.inputBackground,
    },
    noBoardsText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: currentThemeColors.textSecondary || currentThemeColors.text,
    },
    boardItemContainer: {
      backgroundColor: currentThemeColors.card,
      padding: 15,
      borderRadius: 8,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    boardName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentThemeColors.text,
    },
    // Styles for Delete Modal (can be moved to a separate component)
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: currentThemeColors.card,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        color: currentThemeColors.text,
        fontSize: 18,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    // Add other styles from the original file as needed, adapting to theme
  });


  useEffect(() => {
    if (!firebaseInitialized || !user || !service) { // Check for service as well
      if (firebaseInitialized && !user) {
        setLoading(false);
        setBoards([]);
      }
      return;
    }

    // const firestore = service.firestore(); // No longer need direct instance for these operations
    const userId = user.uid;
    console.log(`Setting up Firestore listener for boards owned by ${userId}`);

    // const boardsRef = firestore.collection('todo_boards'); // OLD
    // const q = boardsRef.where("ownerId", "==", userId).orderBy("createdAt", "desc"); // OLD

    const unsubscribe = service.listenToCollection<Board>(
      'todo_boards',
      (fetchedDocs) => {
        // The service.listenToCollection likely returns documents with id and data separate
        // Adapt based on how your FirebaseDocument type is structured by the service
        const fetchedBoards = fetchedDocs.map(doc => ({
          id: doc.id,
          ...(doc.data || {}),
        } as Board));
        console.log("Fetched boards via service:", fetchedBoards);
        setBoards(fetchedBoards);
        setLoading(false);
      },
      (error: Error) => {
        console.error("Error fetching boards via service: ", error);
        Alert.alert("Error", "Could not fetch task boards.");
        setLoading(false);
      },
      { // QueryOptions
        where: [["ownerId", "==", userId]],
        orderBy: [["createdAt", "desc"]]
      }
    );

    return () => {
      console.log("Cleaning up Firestore listener for boards.");
      unsubscribe();
    };
  }, [firebaseInitialized, user, service]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      Alert.alert('Error', 'Please enter a board name.');
      return;
    }
    if (!firebaseInitialized || !user || !service) { // Check for service
      Alert.alert('Error', 'Firebase service not ready or user not logged in.');
      return;
    }

    setIsCreating(true);
    // const firestore = service.firestore(); // No longer need direct instance
    try {
      await service.addDocument('todo_boards', {
        name: newBoardName.trim(),
        ownerId: user.uid,
        // createdAt: new Date(), // Your service.addDocument might handle timestamps or expect a specific format
        // For now, let Firestore server set timestamp if service doesn't handle it automatically or if using serverTimestamp() through service
        // If your addDocument expects a specific Firebase Timestamp type, you'd need to import and use it.
        // Assuming service.addDocument can handle Date or it defaults to server timestamp.
        // Let's assume for now we need to provide a date that will be converted.
        createdAt: new Date().toISOString(), // Or use a specific Timestamp object if your service expects it
      });
      console.log("Board created successfully via service!");
      setNewBoardName('');
    } catch (error) {
      console.error("Error creating board via service: ", error);
      Alert.alert('Error', 'Could not create board. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNavigateToBoard = (boardId: string) => {
    // Alert.alert("Navigation Test", `Board ID: ${boardId}. Reached handleNavigateToBoard.`); // Ensure this is removed or commented out
    console.log(`TEST: Navigating to board: ${boardId}`); // Keep this for now
    router.push(`/taskBoard/${boardId}`); // Ensure this is uncommented
  };

  const openDeleteModal = (board: Board) => {
    setBoardToDelete(board);
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setBoardToDelete(null);
  };

  const confirmBoardDelete = async () => {
    if (!boardToDelete || !firebaseInitialized || !service) return; // Check for service

    const boardId = boardToDelete.id;
    closeDeleteModal();
    setLoading(true); // Indicate activity

    // const firestore = service.firestore(); // No longer need direct instance
    try {
      console.log(`Attempting to delete board via service: ${boardId}`);
      await service.deleteDocument('todo_boards', boardId);
      console.log(`Board ${boardId} deleted (document only) via service.`);
      // The onSnapshot listener (now service.listenToCollection) should update the UI.
    } catch (error) {
      console.error("Error deleting board via service: ", error);
      Alert.alert('Error', 'Could not delete the board.');
    } finally {
      setLoading(false);
    }
  };


  if (loading && boards.length === 0) { // Show loader only if no boards are displayed yet
    return <LoadingScreen />; // Use your app's loader, removed message prop if not supported
  }
  
  if (!user && firebaseInitialized) {
      return (
          <View style={styles.container}>
              <Text style={styles.noBoardsText}>Please log in to view task boards.</Text>
              {/* Optionally, add a login button */}
          </View>
      );
  }


  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Task Boards' }} />
      <View style={styles.createBoardContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Board Name"
          value={newBoardName}
          onChangeText={setNewBoardName}
          placeholderTextColor={currentThemeColors.placeholder || '#888'}
        />
        <Button
          title={isCreating ? "Creating..." : "Create Board"}
          onPress={handleCreateBoard}
          disabled={isCreating}
          color={currentThemeColors.primary}
        />
      </View>

      {boards.length === 0 && !loading ? (
        <Text style={styles.noBoardsText}>No boards found. Create one above!</Text>
      ) : (
        <FlatList
          data={boards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleNavigateToBoard(item.id)}>
              <View style={styles.boardItemContainer}>
                <Text style={styles.boardName}>{item.name}</Text>
                <Pressable onPress={() => openDeleteModal(item)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={24} color={currentThemeColors.error || 'red'} />
                </Pressable>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Delete Confirmation Modal */}
      {boardToDelete && (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isDeleteModalVisible}
            onRequestClose={closeDeleteModal}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Are you sure you want to delete the board "{boardToDelete.name}"?</Text>
                    <Text style={[styles.modalText, {fontSize: 14, color: currentThemeColors.textSecondary || '#888'}]}>
                        (Note: This will only delete the board itself. Lists and cards within it will be orphaned if not deleted by a Cloud Function.)
                    </Text>
                    <View style={styles.modalButtonContainer}>
                        <Button title="Cancel" onPress={closeDeleteModal} color={currentThemeColors.textSecondary || 'grey'}/>
                        <Button title="Delete" onPress={confirmBoardDelete} color={currentThemeColors.error || 'red'} />
                    </View>
                </View>
            </View>
        </Modal>
      )}
    </View>
  );
} 