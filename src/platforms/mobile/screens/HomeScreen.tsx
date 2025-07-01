import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { FAB } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFirebase } from '../../../contexts/FirebaseContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useShows } from '../../../contexts/ShowsContext';
import type { RootStackParamList } from '../../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';

// Define types locally to avoid import issues
import type { DocumentData, WhereClause } from '../../../shared/services/firebase/types';
import { maxBy } from 'lodash';
type TodoBoard = import('../../../shared/types/taskManager').BoardData & DocumentData;
type Task = import('../../../shared/types/tasks').Task;
type FirebaseDocument<T extends DocumentData> = import('../../../shared/services/firebase/types').FirebaseDocument<T>;

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  primary: '#bb86fc',
  text: '#ffffff',
  secondaryText: '#b3b3b3',
  accent: '#03dac6',
  border: '#2c2c2c',
  fab: '#bb86fc',
  pickerBg: '#1e1e1e',
};

interface InfoCardProps {
  title: string;
  data: any[];
  loading: boolean;
  error: string | null;
  onCardPress: (item: any) => void;
  onSeeAllPress: () => void;
  renderItem: (item: any) => string;
  emptyText: string;
}

export function HomeScreen() {
  const router = useRouter();
  const { service } = useFirebase();
  const { user } = useAuth();
  const { shows, selectedShow, setSelectedShow, loading: showsLoading } = useShows();
  
  const [todoBoards, setTodoBoards] = useState<FirebaseDocument<TodoBoard>[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [errorBoards, setErrorBoards] = useState<string | null>(null);

  const [upcomingTasks, setUpcomingTasks] = useState<FirebaseDocument<Task>[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  const filteredBoards = useMemo(() => {
    return todoBoards.filter(board => board.data?.showId === selectedShow?.id);
  }, [todoBoards, selectedShow?.id]);

  // Ref to manage nested card listeners to prevent memory leaks
  const cardListenersRef = useRef(new Map<string, (() => void)[]>());

  // Modal state for board creation
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingLock = useRef(false);

  // State for the FAB group
  const [fabOpen, setFabOpen] = useState(false);

  // Add this state to memoize the date range per selectedShow
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);

  const [boardCardCounts, setBoardCardCounts] = useState<Record<string, number>>({});

  const [defaultBoardCreated, setDefaultBoardCreated] = useState<Record<string, boolean>>({});
  const [boardCreateError, setBoardCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedShow?.id) return;
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    setDateRange({ start: now.toISOString(), end: twoWeeksFromNow.toISOString() });
  }, [selectedShow?.id]);

  // Board creation handler, now wrapped in useCallback and stabilized with a ref lock
  const handleCreateBoard = useCallback(async ({ isDefault = false } = {}) => {
    const boardName = isDefault ? selectedShow?.name || 'Default Board' : newBoardName;
    if (isCreatingLock.current) return;
    if (!boardName.trim()) {
      if (!isDefault) alert('Please enter a board name.');
      return;
    }
    if (!service || !user?.uid) {
      if (!isDefault) alert('Firebase service not ready or user not logged in.');
      return;
    }
    if (!selectedShow) {
      if (!isDefault) alert('Please select a show before creating a board.');
      return;
    }
    isCreatingLock.current = true;
    setIsCreating(true);
    setBoardCreateError(null);
    try {
      const boardData = {
        name: boardName.trim(),
        ownerId: user.uid,
        showId: selectedShow.id,
        sharedWith: [user.uid],
        createdAt: new Date().toISOString(),
      };
      await service.addDocument('todo_boards', boardData);
      if (!isDefault) {
        setNewBoardName('');
        setIsCreateModalVisible(false);
      }
    } catch (error) {
      setBoardCreateError((error as Error).message || 'Could not create board.');
      if (!isDefault) alert('Could not create board. Please try again.');
      console.error('Board creation error:', error);
    } finally {
      isCreatingLock.current = false;
      setIsCreating(false);
    }
  }, [selectedShow, newBoardName, user, service]);

  // Effect for fetching boards
  useEffect(() => {
    if (!service || !user?.uid || !selectedShow?.id) {
      setTodoBoards([]);
      setLoadingBoards(false);
      setErrorBoards(selectedShow ? null : 'Please select a show to view boards.');
      return;
    }
  
    setLoadingBoards(true);
    setErrorBoards(null);
  
    const boardQueryOptions: { where: WhereClause[] } = {
      where: [
        ['showId', '==', selectedShow.id],
        ['sharedWith', 'array-contains', user.uid],
      ],
    };

    // First, check if any boards exist for the current show.
    service.getCollection<TodoBoard>('todo_boards', {
      where: boardQueryOptions.where,
      limit: 1,
    }).then((existingBoards: FirebaseDocument<TodoBoard>[]) => {
      // If no boards exist, create a default one.
      if (existingBoards.length === 0) {
        // Use a flag to ensure this only runs once per show selection
        if (!defaultBoardCreated[selectedShow.id]) {
          setDefaultBoardCreated(prev => ({ ...prev, [selectedShow.id]: true }));
          handleCreateBoard({ isDefault: true });
        }
      }
    }).catch((err: Error) => {
      console.error("Error checking for existing boards:", err);
      setErrorBoards("Failed to check for boards.");
    });
  
    // Now, set up the listener for real-time updates.
    const unsubscribe = service.listenToCollection<TodoBoard>(
      'todo_boards',
      (boards) => {
        setTodoBoards(boards);
        setLoadingBoards(false);
      },
      (err: Error) => {
        setErrorBoards(err.message);
        setLoadingBoards(false);
      },
      { where: boardQueryOptions.where }
    );
  
    return () => unsubscribe();
  }, [service, user?.uid, selectedShow?.id, handleCreateBoard]);
  
  // Effect for fetching tasks
  useEffect(() => {
    setErrorTasks(null);
    if (!service || !user?.uid || !selectedShow?.id || !dateRange) {
      setUpcomingTasks([]);
      setLoadingTasks(false);
      if (!selectedShow) {
        setErrorTasks('Please select a show to view tasks.');
      }
      return;
    }

    setLoadingTasks(true);

    const unsubscribe = service.listenToCollection<Task>(
        'tasks',
        (tasks) => {
            if (!dateRange) {
              setUpcomingTasks([]);
              setLoadingTasks(false);
              return;
            }
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);

            const filteredAndSortedTasks = tasks
              .filter(task => {
                if (!task.data?.dueDate) return false;
                
                const dueDate = task.data.dueDate.toDate ? task.data.dueDate.toDate() : new Date(task.data.dueDate as any);
                return dueDate >= startDate && dueDate <= endDate;
              })
              .sort((a, b) => {
                const dateA = a.data?.dueDate ? (a.data.dueDate.toDate ? a.data.dueDate.toDate() : new Date(a.data.dueDate as any)) : 0;
                const dateB = b.data?.dueDate ? (b.data.dueDate.toDate ? b.data.dueDate.toDate() : new Date(b.data.dueDate as any)) : 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
              });

            setUpcomingTasks(filteredAndSortedTasks);
            setLoadingTasks(false);
        },
        (err: Error) => {
            setErrorTasks(err.message);
            setLoadingTasks(false);
        },
        { 
          where: [
            ['showId', '==', selectedShow.id],
            ['assignedTo', 'array-contains', user.uid],
          ]
        }
    );
    return () => unsubscribe();
}, [service, user?.uid, selectedShow?.id, dateRange]);

  // Fetch card counts for each board
  useEffect(() => {
    // This ref will hold the unsubscribe functions for the list listeners from THIS render
    const listUnsubs: (() => void)[] = [];

    if (!service || !filteredBoards.length) {
      setBoardCardCounts({});
      // No boards, so clear any lingering listeners if any exist
      cardListenersRef.current.forEach(unsubs => unsubs.forEach(u => u()));
      cardListenersRef.current.clear();
      return;
    }

    // Clear any listeners associated with boards that are no longer present
    const currentBoardIds = new Set(filteredBoards.map(b => b.id));
    for (const boardId of cardListenersRef.current.keys()) {
      if (!currentBoardIds.has(boardId)) {
        cardListenersRef.current.get(boardId)?.forEach(u => u());
        cardListenersRef.current.delete(boardId);
      }
    }

    filteredBoards.forEach(board => {
      const unsubLists = service.listenToCollection(
        `todo_boards/${board.id}/lists`,
        (lists) => {
          // When this callback fires, it means the lists for a board have changed.
          // We must clean up the old card listeners for THIS board.
          const oldCardUnsubs = cardListenersRef.current.get(board.id) ?? [];
          oldCardUnsubs.forEach(u => u());

          if (!lists.length) {
            setBoardCardCounts(prev => ({ ...prev, [board.id]: 0 }));
            cardListenersRef.current.set(board.id, []); // Store empty array for this board
            return;
          }

          const newCardUnsubs: (() => void)[] = [];
          const counts: Record<string, number> = {};

          lists.forEach(list => {
            counts[list.id] = 0; // Initialize count for this list
            const unsubCards = service.listenToCollection(
              `todo_boards/${board.id}/lists/${list.id}/cards`,
              (cards) => {
                counts[list.id] = cards.length;
                const totalForBoard = Object.values(counts).reduce((sum, count) => sum + count, 0);
                setBoardCardCounts(prev => ({ ...prev, [board.id]: totalForBoard }));
              },
              (error: Error) => console.error(`[CardListener Error] board ${board.id}, list ${list.id}:`, error)
            );
            newCardUnsubs.push(unsubCards);
          });

          // Store the new unsubscribe functions for the cards.
          cardListenersRef.current.set(board.id, newCardUnsubs);
        },
        (error: Error) => console.error(`[ListListener Error] board ${board.id}:`, error)
      );
      listUnsubs.push(unsubLists);
    });

    // This is the main cleanup function for the useEffect.
    return () => {
      listUnsubs.forEach(unsub => unsub());
      cardListenersRef.current.forEach(unsubArray => unsubArray.forEach(u => u()));
      cardListenersRef.current.clear();
    };
  }, [service, filteredBoards]);

  const renderWelcomeHeader = () => (
    <View style={styles.headerContainer}>
      <Image
        source={{ uri: user?.photoURL || `https://i.pravatar.cc/150?u=${user?.uid}` }}
        style={styles.avatar}
      />
      <View>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
      </View>
    </View>
  );

  const renderShowSelector = () => (
    <View style={styles.pickerContainer}>
      <Picker
        mode="dropdown"
        selectedValue={selectedShow?.id}
        onValueChange={(itemValue) => {
          const show = shows.find(s => s.id === itemValue);
          setSelectedShow(show || null);
        }}
        style={styles.picker}
        dropdownIconColor={darkColors.primary}
      >
        {showsLoading ? (
          <Picker.Item label="Loading shows..." value={null} key="loading-shows" />
        ) : (
          shows.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} color="#000000" />)
        )}
      </Picker>
    </View>
  );

  const renderInfoCard = ({ title, data, loading, error, onCardPress, onSeeAllPress, renderItem, emptyText }: InfoCardProps) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        {loading ? <ActivityIndicator color={darkColors.primary} /> :
         error ? <Text style={styles.errorText}>{error}</Text> :
         data.length === 0 ? <Text style={styles.emptyText}>{emptyText}</Text> :
         <FlatList
            data={data}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { onCardPress(item.id); }} style={styles.itemCard}>
                    {title === 'To-Do Boards' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.itemText, { fontSize: 18, fontWeight: 'bold' }]}>{renderItem(item)}</Text>
                        <Text style={[styles.cardCountText, { marginLeft: 8, marginTop: 0, fontSize: 16, fontWeight: 'bold' }]}>
                        {typeof boardCardCounts[item.id] === 'number' ? boardCardCounts[item.id] : ''}
                      </Text>
                      </View>
                    ) : (
                      <Text style={styles.itemText}>{renderItem(item)}</Text>
                    )}
                </TouchableOpacity>
            )}
          />
        }
      </View>
    </View>
  );

  const handleCreateNewBoard = () => {
    setNewBoardName('');
    setIsCreateModalVisible(true);
  };

  // Modal for creating a new board
  const renderCreateBoardModal = () => (
    <Modal
      visible={isCreateModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsCreateModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: '#181A2A' }]}>
          <Text style={[styles.modalTitle, { color: darkColors.text }]}>Create New Board</Text>
          <TextInput
            style={[styles.modalInput, { color: darkColors.text, backgroundColor: 'transparent', borderColor: darkColors.border }]}
            placeholder="Board Name"
            value={newBoardName}
            onChangeText={setNewBoardName}
            placeholderTextColor={darkColors.secondaryText}
            editable={!isCreating}
          />
          <View style={styles.modalButtonRow}>
            <Button title="Cancel" onPress={() => setIsCreateModalVisible(false)} color={darkColors.secondaryText} disabled={isCreating} />
            <Button title={isCreating ? 'Creating...' : 'Create'} onPress={() => handleCreateBoard()} color={darkColors.primary} disabled={isCreating} />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <LinearGradient
        colors={['#1e3a8a', '#6d28d9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={{ padding: 16 }}>
          {/* Removed 'Go to Props List' button */}
        </View>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {renderWelcomeHeader()}
            {renderShowSelector()}
            
            {!selectedShow && !showsLoading && (
              <View style={styles.centeredMessage}>
                <Ionicons name="information-circle-outline" size={48} color={darkColors.primary} />
                <Text style={styles.centeredMessageText}>Select a show to get started</Text>
              </View>
            )}

            {selectedShow && (
              <>
                {renderInfoCard({
                  title: "To-Do Boards",
                  data: filteredBoards,
                  loading: loadingBoards,
                  error: errorBoards,
                  onCardPress: (boardId) => router.navigate(`/taskBoard/${boardId}`),
                  onSeeAllPress: () => router.navigate('/(tabs)/todos'),
                  renderItem: (item) => item.data?.name || 'Untitled Board',
                  emptyText: "No boards found for this show. Creating one...",
                })}
                {renderInfoCard({
                  title: "Upcoming Tasks",
                  data: upcomingTasks,
                  loading: loadingTasks,
                  error: errorTasks,
                  onCardPress: (item) => router.navigate(`/tasks/${item.id}` as any),
                  onSeeAllPress: () => router.navigate('/(tabs)/tasks' as any),
                  renderItem: (item) => item.data?.title || 'Untitled Task',
                  emptyText: "No upcoming tasks for this show."
                })}
              </>
            )}
          </ScrollView>

          <FAB.Group
             visible={true}
             open={fabOpen}
             icon={fabOpen ? 'close' : 'plus'}
             actions={[
               {
                 icon: ({ color, size }) => (
                   <View style={{ position: 'relative' }}>
                     <Ionicons name="people-outline" size={size} color={color} />
                     <Ionicons
                       name="add-circle"
                       size={size * 0.4}
                       color={color}
                       style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: 'white', borderRadius: size * 0.2 }}
                     />
                   </View>
                 ),
                 label: 'Add Show',
                 onPress: () => router.navigate('/(tabs)/shows/create' as any),
                 style: styles.fabAction,
                 labelStyle: [styles.fabLabel, { marginLeft: 0, paddingLeft: 0, minWidth: 0 }],
               },
               {
                 icon: ({ color, size }) => (
                   <View style={{ position: 'relative' }}>
                     <Ionicons name="rose-outline" size={size} color={color} />
                     <Ionicons
                       name="add-circle"
                       size={size * 0.4}
                       color={color}
                       style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: 'white', borderRadius: size * 0.2 }}
                     />
                   </View>
                 ),
                 label: 'Add Prop',
                 onPress: () => router.navigate({ pathname: '/(tabs)/props/create', params: { showId: selectedShow?.id } }),
                 style: [styles.fabAction, { marginBottom: 0}],
                 labelStyle: [styles.fabLabel, { marginLeft: 0, paddingLeft: 0, minWidth: 0 }],
               },
               {
                 icon: ({ color, size }) => (
                   <View style={{ position: 'relative' }}>
                     <Ionicons name="cube-outline" size={size} color={color} />
                     <Ionicons
                       name="add-circle"
                       size={size * 0.4}
                       color={color}
                       style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: 'white', borderRadius: size * 0.2 }}
                     />
                   </View>
                 ),
                 label: 'Add Board',
                 onPress: handleCreateNewBoard,
                 style: [styles.fabAction, { marginBottom:52,}],
                 labelStyle: [styles.fabLabel, { marginLeft: 0, paddingLeft: 0, minWidth: 0 }],
               },
             ]}
             onStateChange={({ open }) => setFabOpen(open)}
             fabStyle={[styles.fab, { backgroundColor: '#c084fc' }]}
             color="#FFFFFF"
             backdropColor="transparent"
          />
          
          {renderCreateBoardModal()}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: { padding: 16, paddingBottom: 80 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  welcomeText: { color: darkColors.secondaryText, fontSize: 16 },
  userName: { color: darkColors.text, fontSize: 20, fontWeight: 'bold' },
  pickerContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: darkColors.border
  },
  picker: { color: darkColors.text },
  card: {
    backgroundColor: '#1d2125',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  seeAllText: { color: darkColors.primary, fontSize: 14 },
  cardContent: {
    minHeight: 100,
    justifyContent: 'center',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#111111',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginRight: 12,
    minWidth: 220,
    justifyContent: 'center',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    color: darkColors.secondaryText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: { color: 'red', alignSelf: 'center' },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#c084fc',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'transparent',
    elevation: 0,
    borderWidth: 0,
  },
  fabAction: {
    backgroundColor: 'rgba(30,30,30,0.7)',
  },
  fabLabel: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(30,30,30,0.7)',
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    gap: 12,
  },
  centeredMessageText: {
    marginTop: 16,
    color: darkColors.secondaryText,
    fontSize: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#181A2A',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    color: darkColors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: darkColors.border,
    borderRadius: 8,
    padding: 12,
    color: darkColors.text,
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cardCountText: {
    color: darkColors.secondaryText,
    fontSize: 13,
    marginTop: 4,
  },
  pickerBg: { backgroundColor: 'transparent' },
  background: { backgroundColor: 'transparent' },
  addButton: {
    marginTop: 16,
    backgroundColor: '#22272b',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
