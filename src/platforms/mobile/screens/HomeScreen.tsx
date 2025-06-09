import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';
import { useFirebase } from '../../../contexts/FirebaseContext.tsx';
import type { FirebaseDocument } from '../../../shared/services/firebase/types.ts';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Assuming AuthContext.tsx exists in your contexts folder and provides currentUser
import { useAuth } from '../../../contexts/AuthContext.tsx';
import { useShows } from '../../../contexts/ShowsContext.tsx';
import { Picker } from '@react-native-picker/picker';

// Define a basic type for TodoBoard for now. This should be refined based on your actual data structure.
interface TodoBoard {
  id: string;
  name: string;
  ownerId: string;
  sharedWith?: string[];
  showId?: string;
  // ... other properties like createdAt, etc.
}

// Define a basic type for Task. Refine based on your actual data structure.
interface Task {
  id: string;
  title: string;
  assignedTo: string; // Assuming this field holds the user UID
  boardId?: string; // Optional: to link back to a board
  dueDate?: FirebaseFirestoreTypes.Timestamp | null; // Use Firestore Timestamp
  // ... other task properties
}

type RootStackParamList = {
  Home: undefined;
  PropsList: undefined;
  // Potentially add TodoBoardDetail or similar if you navigate to a board
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const router = useRouter();
  const { service } = useFirebase();
  const { user } = useAuth(); // Get user from useAuth()
  const { shows, selectedShow, setSelectedShow } = useShows();
  const [showPickerOpen, setShowPickerOpen] = useState(false);

  const [todoBoards, setTodoBoards] = useState<FirebaseDocument<TodoBoard>[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [errorBoards, setErrorBoards] = useState<string | null>(null);

  // New state for tasks
  const [userTasks, setUserTasks] = useState<FirebaseDocument<Task>[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  // New state for upcoming/overdue tasks
  const [upcomingOverdueTasks, setUpcomingOverdueTasks] = useState<FirebaseDocument<Task>[]>([]);
  const [loadingUpcomingOverdue, setLoadingUpcomingOverdue] = useState(true);
  const [errorUpcomingOverdue, setErrorUpcomingOverdue] = useState<string | null>(null);

  useEffect(() => {
    if (!service || !user?.uid) {
      setLoadingBoards(false);
      if (!user?.uid) {
        setErrorBoards('Not logged in. Cannot fetch todo boards.');
      }
      return;
    }

    setLoadingBoards(true);
    setErrorBoards(null);

    // Firestore does not support OR queries directly, so fetch both and merge client-side
    const unsubOwner = service.listenToCollection<TodoBoard>(
      'todo_boards',
      (boards: FirebaseDocument<TodoBoard>[]) => {
        setTodoBoards(prevBoards => {
          // Remove any boards not owned by the user (in case of overlap)
          const notOwned = prevBoards.filter(b => b.data?.ownerId !== user.uid && !(b.data?.sharedWith?.includes(user.uid)));
          return [
            ...notOwned,
            ...boards.filter(b => b.data?.ownerId === user.uid)
          ];
        });
        setLoadingBoards(false);
      },
      (err: Error) => {
        setErrorBoards(err.message || 'Failed to fetch todo_boards');
        setLoadingBoards(false);
      },
      { where: [['ownerId', '==', user.uid]] }
    );

    const unsubShared = service.listenToCollection<TodoBoard>(
      'todo_boards',
      (boards: FirebaseDocument<TodoBoard>[]) => {
        setTodoBoards(prevBoards => {
          // Remove any boards not shared with the user (in case of overlap)
          const notShared = prevBoards.filter(b => !(b.data?.sharedWith?.includes(user.uid)) && b.data?.ownerId !== user.uid);
          return [
            ...notShared,
            ...boards.filter(b => b.data?.sharedWith?.includes(user.uid))
          ];
        });
        setLoadingBoards(false);
      },
      (err: Error) => {
        setErrorBoards(err.message || 'Failed to fetch todo_boards');
        setLoadingBoards(false);
      },
      { where: [['sharedWith', 'array-contains', user.uid]] }
    );

    return () => {
      unsubOwner();
      unsubShared();
    };
  }, [service, user?.uid]);

  // useEffect for fetching tasks assigned to the user
  useEffect(() => {
    if (!service || !user?.uid) {
      setLoadingTasks(false);
      if (!user?.uid) {
        setErrorTasks('Not logged in. Cannot fetch tasks.');
      }
      return;
    }

    console.log(`HomeScreen: Subscribing to tasks for user ${user.uid}`);
    setLoadingTasks(true);
    setErrorTasks(null);

    const unsubscribeTasks = service.listenToCollection<Task>(
      'tasks', // Assuming this is your tasks collection name
      (tasks: FirebaseDocument<Task>[]) => {
        console.log(`HomeScreen: Received ${tasks.length} tasks.`);
        setUserTasks(tasks);
        setLoadingTasks(false);
      },
      (err: Error) => {
        console.error('HomeScreen: Error fetching tasks:', err);
        setErrorTasks(err.message || 'Failed to fetch tasks');
        setLoadingTasks(false);
      },
      // Assuming tasks are filtered by an 'assignedTo' field matching the user's UID
      { where: [['assignedTo', '==', user.uid]] } 
      // Add orderBy if needed, e.g., { orderBy: [['dueDate', 'asc']] }
    );

    return () => {
      console.log('HomeScreen: Unsubscribing from tasks.');
      unsubscribeTasks();
    };
  }, [service, user?.uid]);

  // useEffect for fetching upcoming/overdue tasks
  useEffect(() => {
    if (!service || !user?.uid) {
      setLoadingUpcomingOverdue(false);
      if (!user?.uid) {
        setErrorUpcomingOverdue('Not logged in. Cannot fetch upcoming tasks.');
      }
      return;
    }

    console.log(`HomeScreen: Subscribing to upcoming/overdue tasks for user ${user.uid}`);
    setLoadingUpcomingOverdue(true);
    setErrorUpcomingOverdue(null);

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Convert to Firestore Timestamps for the query
    // Note: If your dueDates are already Timestamps, this direct conversion for query might not be needed
    // depending on how Firestore handles date comparisons with native Date objects in queries via RNFirebase.
    // It's often safer to convert to Timestamp if the field is a Timestamp.
    // However, for RNFirebase, comparing a Timestamp field with a JS Date object in a `where` clause usually works.

    const unsubscribeUpcoming = service.listenToCollection<Task>(
      'tasks',
      (tasks: FirebaseDocument<Task>[]) => {
        console.log(`HomeScreen: Received ${tasks.length} tasks for upcoming/overdue check.`);
        // Further client-side filtering/sorting might be needed here if the query is broad
        // For now, we just set them. We'll sort and categorize in the render logic.
        setUpcomingOverdueTasks(
          tasks.sort((a, b) => {
            const timeA = a.data?.dueDate?.toDate()?.getTime() || 0;
            const timeB = b.data?.dueDate?.toDate()?.getTime() || 0;
            return timeA - timeB;
          })
        );
        setLoadingUpcomingOverdue(false);
      },
      (err: Error) => {
        console.error('HomeScreen: Error fetching upcoming/overdue tasks:', err);
        setErrorUpcomingOverdue(err.message || 'Failed to fetch upcoming/overdue tasks');
        setLoadingUpcomingOverdue(false);
      },
      {
        where: [
          ['assignedTo', '==', user.uid],
          // Fetch tasks due up to 3 days from now. Overdue tasks also match this.
          ['dueDate', '<=', threeDaysFromNow]
        ],
        orderBy: [['dueDate', 'asc']] // Order by due date ascending
      }
    );

    return () => {
      console.log('HomeScreen: Unsubscribing from upcoming/overdue tasks.');
      unsubscribeUpcoming();
    };
  }, [service, user?.uid]);

  // Helper function to categorize and format tasks
  const getTaskCategory = (dueDate: FirebaseFirestoreTypes.Timestamp | null | undefined): string => {
    if (!dueDate) return 'No due date';
    const taskDate = dueDate.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
    taskDate.setHours(0, 0, 0, 0); // Normalize taskDate to the start of the day

    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    return `Due in ${diffDays} days`;
  };

  const getTaskStyle = (dueDate: FirebaseFirestoreTypes.Timestamp | null | undefined): object => {
    if (!dueDate) return styles.listItemOkay;
    const taskDate = dueDate.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return styles.listItemOverdue; // Overdue
    if (diffDays === 0) return styles.listItemDueToday; // Due Today
    if (diffDays <= 3) return styles.listItemUpcoming; // Due within 3 days
    return styles.listItemOkay; // Due later or no date
  };

  // Filter todo boards by selected show
  const filteredBoards = selectedShow
    ? todoBoards.filter(b => b.data?.showId === selectedShow.id)
    : todoBoards;

  // Debug: Log selectedShow and shows whenever they change
  React.useEffect(() => {
    console.log('[DEBUG] selectedShow:', selectedShow);
  }, [selectedShow]);
  React.useEffect(() => {
    console.log('[DEBUG] shows:', shows);
  }, [shows]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Show Picker at the top */}
      <View style={{ width: '100%', marginBottom: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Select Show:</Text>
        <View style={{ borderWidth: 1, borderColor: '#e0e7ff', borderRadius: 8, backgroundColor: '#f0f4f8' }}>
          <Picker
            selectedValue={selectedShow?.id || ''}
            onValueChange={(itemValue) => {
              const show = shows.find(s => s.id === itemValue);
              console.log('[DEBUG] Picker onValueChange:', itemValue, show);
              if (show) setSelectedShow(show);
            }}
            enabled={shows.length > 0}
            style={{ width: '100%' }}
          >
            {shows.length === 0 ? (
              <Picker.Item label="No shows available" value="" />
            ) : (
              shows.map(show => (
                <Picker.Item key={show.id} label={show.name} value={show.id} />
              ))
            )}
          </Picker>
        </View>
      </View>
      {/* Show current show name above Props Bible */}
      <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e40af' }}>
          {selectedShow ? selectedShow.name : 'No show selected'}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Props Bible</Text>
        <Text style={styles.subtitle}>Your Digital Props Management Solution</Text>
        
        {/* Todo Boards Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>My Todo Boards</Text>
          {loadingBoards && <ActivityIndicator size="large" color="#1e40af" />}
          {errorBoards && <Text style={styles.errorText}>{errorBoards}</Text>}
          {!loadingBoards && !errorBoards && filteredBoards.length === 0 && (
            <Text>No todo boards found for this show.</Text>
          )}
          {!loadingBoards && !errorBoards && filteredBoards.length > 0 && (
            <FlatList
              data={filteredBoards}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.listItem} 
                  onPress={() => {
                    console.log("Navigating to /taskBoard with ID:", item.id);
                    router.push({ pathname: '/taskBoard/[boardId]', params: { boardId: item.id } });
                  }}
                >
                  <Text style={styles.listItemText}>{item.data?.name || 'Unnamed Board'}</Text>
                </TouchableOpacity>
              )}
              style={{ width: '100%' }}
            />
          )}
        </View>

        {/* Upcoming & Overdue Tasks Section (replaces View Props button) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Upcoming & Overdue Tasks</Text>
          {loadingUpcomingOverdue && <ActivityIndicator size="large" color="#1e40af" />}
          {errorUpcomingOverdue && <Text style={styles.errorText}>{errorUpcomingOverdue}</Text>}
          {!loadingUpcomingOverdue && !errorUpcomingOverdue && upcomingOverdueTasks.length === 0 && (
            <Text>No upcoming or overdue tasks assigned to you.</Text>
          )}
          {!loadingUpcomingOverdue && !errorUpcomingOverdue && upcomingOverdueTasks.length > 0 && (
            <FlatList
              data={upcomingOverdueTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.listItem, getTaskStyle(item.data?.dueDate)]} onPress={() => alert(`Task: ${item.data?.title}\nStatus: ${getTaskCategory(item.data?.dueDate)}`)}>
                  <Text style={styles.listItemText}>{item.data?.title || 'Unnamed Task'}</Text>
                  <Text style={styles.listItemSubText}>{getTaskCategory(item.data?.dueDate)}</Text>
                </TouchableOpacity>
              )}
              style={{ width: '100%' }}
            />
          )}
        </View>

        {/* My Tasks Section - general list */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>All My Tasks</Text>
          {loadingTasks && <ActivityIndicator size="large" color="#1e40af" />}
          {errorTasks && <Text style={styles.errorText}>{errorTasks}</Text>}
          {!loadingTasks && !errorTasks && userTasks.length === 0 && (
            <Text>No tasks assigned to you.</Text>
          )}
          {!loadingTasks && !errorTasks && userTasks.length > 0 && (
            <FlatList
              data={userTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => alert(`Task: ${item.data?.title}`)}>
                  <Text style={styles.listItemText}>{item.data?.title || 'Unnamed Task'}</Text>
                  {/* Optionally display due date or board name here */}
                </TouchableOpacity>
              )}
              style={{ width: '100%' }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  listItem: {
    backgroundColor: '#e0e7ff',
    padding: 15,
    borderRadius: 6,
    marginBottom: 10,
    width: '100%',
  },
  listItemText: {
    fontSize: 16,
    color: '#3730a3',
  },
  listItemSubText: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  listItemOkay: {
    backgroundColor: '#e0e7ff',
  },
  listItemUpcoming: {
    backgroundColor: '#fffac0',
    borderColor: '#fadf98',
    borderWidth: 1,
  },
  listItemDueToday: {
    backgroundColor: '#ffdac0',
    borderColor: '#ffb598',
    borderWidth: 1,
  },
  listItemOverdue: {
    backgroundColor: '#ffc0c0',
    borderColor: '#ff9898',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 