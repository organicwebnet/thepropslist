import { useAuth } from '../../../src/contexts/AuthContext';
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import { BoardData } from '../../../src/shared/types/taskManager';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

const TaskBoardsListScreen = () => {
  const { service: firebaseService, isInitialized } = useFirebase();
  const { user } = useAuth();
  const router = useRouter();

  const [boards, setBoards] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized || !user) return;

    setLoading(true);
    const unsubscribe = firebaseService.listenToCollection<BoardData>(
      'todo_boards',
      (data) => {
        const boardDocs = data.map(doc => ({ ...doc.data, id: doc.id }));
        setBoards(boardDocs);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch boards:", err);
        setError('Could not load task boards.');
        setLoading(false);
      },
      {
        where: [['sharedWith', 'array-contains', user.uid]],
      }
    );

    return () => unsubscribe();
  }, [isInitialized, user, firebaseService]);

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={boards}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          style={styles.itemContainer}
          onPress={() => router.navigate(`/taskBoard/${item.id}`)}
        >
          <Text style={styles.itemText}>{item.name}</Text>
        </Pressable>
      )}
      ListEmptyComponent={() => (
        <View style={styles.centered}>
          <Text>No task boards found.</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  itemContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 18,
  },
});

export default TaskBoardsListScreen; 
