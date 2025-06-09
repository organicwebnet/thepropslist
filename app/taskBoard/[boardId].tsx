import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  TouchableOpacity,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

import { Text as ThemedText, View as ThemedView } from '../../src/components/Themed';
import CardDetailPanel from '../../src/components/taskManager/CardDetailPanel';
import { useAuth } from '../../src/contexts/AuthContext';
import { useFirebase } from '../../src/contexts/FirebaseContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../src/styles/theme';
import type { BoardData, CardData, ListData, MemberData } from '../../src/shared/types/taskManager';
import type { FirebaseDocument } from '../../src/shared/services/firebase/types';

const LIST_WIDTH = 280;
const LIST_SPACING = 16;

const TaskBoardDetailScreen = () => {
  const params = useLocalSearchParams();
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
  const selectedCardId = Array.isArray(params.selectedCardId) ? params.selectedCardId[0] : params.selectedCardId;
  const selectedListId = Array.isArray(params.selectedListId) ? params.selectedListId[0] : params.selectedListId;
  const router = useRouter();
  const { service: firebaseService, isInitialized: isFirebaseInitialized, error: firebaseError } = useFirebase();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkTheme.colors : lightTheme.colors;

  const [board, setBoard] = useState<BoardData | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({});
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Modal State ---
  const [isAddListModalVisible, setAddListModalVisible] = useState(false);
  const [isAddCardModalVisible, setAddCardModalVisible] = useState(false);
  const [newCardListId, setNewCardListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');

  // --- FAB Speed Dial State ---
  const [fabOpen, setFabOpen] = useState(false);

  // --- Detail Panel State ---
  const selectedCard = useMemo(() => {
    if (!selectedCardId || !selectedListId || !cards[selectedListId]) return null;
    return cards[selectedListId].find(c => c.id === selectedCardId) ?? null;
  }, [selectedCardId, selectedListId, cards]);

  // --- Data Fetching ---
  useEffect(() => {
    if (!firebaseService || !boardId || !isFirebaseInitialized) return;
    setLoading(true);

    const unsubscribeBoard = firebaseService.listenToDocument<BoardData>(`todo_boards/${boardId}`,
      (boardFirebaseDoc) => {
        const boardDoc = boardFirebaseDoc.data;
        if (boardDoc) {
          setBoard({ ...boardDoc, id: boardFirebaseDoc.id });
        } else {
          setError('Board not found.');
        }
        setLoading(false);
      },
      (err) => {
        setError('Could not load the board.');
        setLoading(false);
      }
    );

    const unsubscribeLists = firebaseService.listenToCollection<ListData>(`todo_boards/${boardId}/lists`, (listFirebaseDocs) => {
      const listDocs = listFirebaseDocs.map(doc => ({ ...doc.data, id: doc.id }) as ListData);
      setLists(listDocs.sort((a, b) => a.order - b.order));
    }, (err) => {
      setError('Could not load lists.');
    });
    
    firebaseService.getBoardMembers(boardId).then(setMembers).catch(() => {});

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

    // Set up a listener for each list's cards subcollection
    const unsubscribes: (() => void)[] = [];
    const cardsByList: Record<string, CardData[]> = {};
    let isUnmounted = false;

    lists.forEach(list => {
      cardsByList[list.id] = [];
      const unsubscribe = firebaseService.listenToCollection<CardData>(
        `todo_boards/${boardId}/lists/${list.id}/cards`,
        (cardFirebaseDocs) => {
          if (isUnmounted) return;
          // Update only the cards for this list
          cardsByList[list.id] = cardFirebaseDocs
            .map(doc => ({ ...doc.data as CardData, id: doc.id }))
            .sort((a, b) => a.order - b.order);
          // To trigger a re-render, create a new object
          setCards(prev => ({ ...prev, [list.id]: cardsByList[list.id] }));
        },
        (err) => {
          // Optionally handle error
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      isUnmounted = true;
      unsubscribes.forEach(unsub => unsub());
    };
  }, [boardId, firebaseService, lists, isFirebaseInitialized]);

  // --- Handlers ---
  const handleAddList = async () => {
    if (!newListName.trim() || !user || !boardId) return;
    try {
      await firebaseService.addList(boardId, {
        name: newListName,
        order: lists.length,
      });
      setNewListName('');
      setAddListModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Could not add the new list.');
    }
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || !user || !newCardListId) return;
    try {
      await firebaseService.addCard(
        boardId,
        newCardListId,
        {
          title: newCardTitle,
          description: newCardDescription,
          order: cards[newCardListId]?.length || 0,
          assignedTo: [user.uid],
        }
      );
      setNewCardTitle('');
      setNewCardDescription('');
      setAddCardModalVisible(false);
      setNewCardListId(null);
    } catch (error) {
      Alert.alert('Error', 'Could not add the new card.');
    }
  };

  const handleMoveCard = async (cardId: string, originalListId: string, targetListId: string) => {
      if (!boardId) return;
      try {
        const newOrder = cards[targetListId]?.length || 0;
        await firebaseService.moveCardToList(boardId, cardId, originalListId, targetListId, newOrder);
        router.back();
      } catch (error) {
        Alert.alert('Error', 'Could not move the card.');
      }
  };

  const handleUpdateCard = async (cardId: string, listId: string, updates: Partial<CardData>) => {
    if (!boardId) return;
    try {
      await firebaseService.updateCard(boardId, listId, cardId, updates);
    } catch (error) {
        Alert.alert('Error', 'Could not update card details.');
    }
  };

  const handleDeleteCard = async (listId: string, cardId: string) => {
    if (!boardId) return;
    Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
                await firebaseService.deleteCard(boardId, listId, cardId);
                router.back();
            } catch (error) {
                Alert.alert('Error', 'Could not delete card.');
            }
        }},
    ]);
  };

  const renderCard = ({ item, drag, isActive }: RenderItemParams<CardData>) => (
    <Pressable
      key={item.id}
      onLongPress={drag}
      onPress={() => router.setParams({ selectedCardId: item.id, selectedListId: item.listId })}
      style={[styles.cardContainer, { backgroundColor: colors.card, opacity: isActive ? 0.7 : 1 }]}
    >
      <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
    </Pressable>
  );

  const renderList = ({ item, drag, isActive }: RenderItemParams<ListData>) => (
    <Pressable
      key={item.id}
      onLongPress={drag}
      style={{ opacity: isActive ? 0.7 : 1 }}
    >
      <DefaultView
        style={[styles.listContainer, { backgroundColor: colors.background, marginRight: LIST_SPACING }]}
      >
        <ThemedText style={styles.listHeader}>{item.name}</ThemedText>
        <DraggableFlatList
          data={cards[item.id] || []}
          keyExtractor={card => card.id}
          renderItem={renderCard}
          onDragEnd={({ data, from, to }) => handleReorderCards(item.id, data)}
          activationDistance={10}
          containerStyle={{ flex: 1, paddingHorizontal: 10 }}
          contentContainerStyle={{ flexGrow: 1 }}
        />
        <Pressable
          onPress={() => {
            setNewCardListId(item.id);
            setAddCardModalVisible(true);
          }}
          style={styles.addCardButton}
        >
          <ThemedText>+ Add a card</ThemedText>
        </Pressable>
      </DefaultView>
    </Pressable>
  );

  // Add handler for reordering lists
  const handleReorderLists = async (data: ListData[]) => {
    setLists(data);
    // Update order in Firestore
    await Promise.all(
      data.map((list, idx) =>
        firebaseService.updateDocument(`todo_boards/${boardId}/lists`, list.id, { order: idx })
      )
    );
  };

  // Add handler for reordering cards within a list
  const handleReorderCards = async (listId: string, data: CardData[]) => {
    setCards(prev => ({ ...prev, [listId]: data }));
    // Update order in Firestore
    await firebaseService.reorderCardsInList(boardId, listId, data.map((card, idx) => ({ ...card, order: idx })));
  };

  if (loading || !isFirebaseInitialized) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText>{!isFirebaseInitialized ? 'Connecting to services...' : 'Loading board...'}</ThemedText>
      </ThemedView>
    );
  }

  if (error || firebaseError) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={{ color: 'red', marginBottom: 16 }}>{error || firebaseError?.message}</ThemedText>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}><ThemedText>Go Back</ThemedText></Pressable>
        <Pressable onPress={() => { setError(null); setLoading(true); }}><ThemedText>Retry</ThemedText></Pressable>
      </ThemedView>
    );
  }

  if (!lists.length) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>No lists found for this board.</ThemedText>
        <Pressable onPress={() => setAddListModalVisible(true)} style={styles.addListButton}>
          <FontAwesome name="plus" size={16} color={colors.text} />
          <ThemedText style={{ marginLeft: 8 }}>Add List</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.fullScreen, { backgroundColor: colors.background }]}> 
        {board && <ThemedText style={styles.boardTitle}>{board.name}</ThemedText>}
        <DraggableFlatList
          data={lists}
          horizontal
          keyExtractor={list => list.id}
          renderItem={renderList}
          onDragEnd={({ data, from, to }) => handleReorderLists(data)}
          activationDistance={10}
          contentContainerStyle={{ flexGrow: 1, flexDirection: 'row', alignItems: 'flex-start' }}
          style={styles.listsScrollView}
        />

        {/* FAB Speed Dial */}
        <DefaultView style={styles.fabContainer} pointerEvents="box-none">
          {fabOpen && (
            <DefaultView style={styles.fabActionsContainer}>
              <TouchableOpacity
                style={[styles.fabAction, { backgroundColor: '#43A047' }]}
                onPress={() => {
                  setFabOpen(false);
                  if (lists.length > 0) {
                    setNewCardListId(lists[0].id);
                    setAddCardModalVisible(true);
                  } else {
                    setAddListModalVisible(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <FontAwesome name="credit-card" size={22} color="#fff" />
                <ThemedText style={styles.fabActionLabel}>Card</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fabAction, { backgroundColor: '#388E3C' }]}
                onPress={() => {
                  setFabOpen(false);
                  setAddListModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <FontAwesome name="columns" size={22} color="#fff" />
                <ThemedText style={styles.fabActionLabel}>List</ThemedText>
              </TouchableOpacity>
            </DefaultView>
          )}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setFabOpen(open => !open)}
            activeOpacity={0.7}
          >
            <Ionicons name={fabOpen ? 'close' : 'add'} size={32} color="#fff" />
          </TouchableOpacity>
        </DefaultView>

        {/* Modals */}
        <Modal
            animationType="slide"
            transparent={true}
            visible={isAddListModalVisible}
            onRequestClose={() => setAddListModalVisible(false)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setAddListModalVisible(false)}>
                <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
                    <ThemedText style={styles.modalTitle}>Add New List</ThemedText>
                    <TextInput
                        placeholder="List name"
                        value={newListName}
                        onChangeText={setNewListName}
                        style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                        placeholderTextColor={colors.textSecondary}
                    />
                    <Pressable style={styles.modalButton} onPress={handleAddList}>
                        <ThemedText>Add List</ThemedText>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>

        <Modal
            animationType="slide"
            transparent={true}
            visible={isAddCardModalVisible}
            onRequestClose={() => setAddCardModalVisible(false)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setAddCardModalVisible(false)}>
                <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
                    <ThemedText style={styles.modalTitle}>Add New Card</ThemedText>
                    <TextInput
                        placeholder="Card title"
                        value={newCardTitle}
                        onChangeText={setNewCardTitle}
                        style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                        placeholderTextColor={colors.textSecondary}
                    />
                    <TextInput
                        placeholder="Card description (optional)"
                        value={newCardDescription}
                        onChangeText={setNewCardDescription}
                        style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, marginTop: 10 }]}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                    />
                    <Pressable style={styles.modalButton} onPress={handleAddCard}>
                        <ThemedText>Add Card</ThemedText>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>

        {selectedCard && (
            <CardDetailPanel 
                isVisible={!!selectedCardId}
                card={selectedCard}
                lists={lists}
                allShowMembers={members}
                onClose={() => router.back()}
                onUpdateCard={handleUpdateCard}
                onMoveCard={handleMoveCard}
                onDeleteCard={handleDeleteCard}
                boardId={boardId || ''}
            />
        )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 16,
    },
    listsScrollView: {
        flex: 1,
    },
    listContainer: {
        width: LIST_WIDTH,
        borderRadius: 8,
        paddingVertical: 8,
        marginLeft: LIST_SPACING,
        height: '95%',
        alignSelf: 'flex-start'
    },
    listHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    cardContainer: {
        borderRadius: 6,
        padding: 12,
        marginVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
    },
    addCardButton: {
        padding: 12,
        borderRadius: 6,
        marginTop: 8,
    },
    addListButton: {
        width: LIST_WIDTH,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        flexDirection: 'row',
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
    modalInput: {
        height: 40,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        marginBottom: 16,
    },
    modalButton: {
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    fabContainer: {
        position: 'absolute',
        right: 24,
        bottom: 32,
        alignItems: 'flex-end',
        zIndex: 100,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#43A047',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    fabActionsContainer: {
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    fabAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginBottom: 12,
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    fabActionLabel: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 12,
        fontSize: 16,
    },
});

export default TaskBoardDetailScreen;