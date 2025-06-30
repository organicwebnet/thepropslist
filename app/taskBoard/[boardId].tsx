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
import LinearGradient from 'react-native-linear-gradient';

import { Text as ThemedText, View as ThemedView } from '../../src/components/Themed';
import CardDetailPanel from '../../src/components/taskManager/CardDetailPanel';
import { useAuth } from '../../src/contexts/AuthContext';
import { useFirebase } from '../../src/contexts/FirebaseContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { BoardData, CardData, ListData, MemberData } from '../../src/shared/types/taskManager';
import { darkTheme, lightTheme } from '../../src/styles/theme';
import BoardList from '../../src/components/taskManager/BoardList';
import { useProps } from '../../src/hooks/useProps';
import { OfflineSyncManager } from '../../src/platforms/mobile/features/offline/OfflineSyncManager';
import type { Prop } from '../../src/shared/types/props';
import { SyncStatusBar } from '../../src/components/SyncStatusBar';

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
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({});
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Initialize OfflineSyncManager (mobile only)
  const offlineSyncManager = firebaseService?.firestore ? OfflineSyncManager.getInstance(firebaseService.firestore) : null;
  useEffect(() => {
    if (offlineSyncManager) {
      offlineSyncManager.initialize().catch(console.error);
    }
  }, [offlineSyncManager]);

  // --- Data Fetching ---
  useEffect(() => {
    if (!firebaseService || !boardId || !isFirebaseInitialized) return;
    setLoading(true);

    const boardPath = `todo_boards/${boardId}`;
    const listsPath = `${boardPath}/lists`;

    const unsubscribeBoard = firebaseService.listenToDocument<BoardData>(
      boardPath,
      boardDoc => {
        if (boardDoc.exists) {
          setBoard({ ...boardDoc.data, id: boardDoc.id });
        } else {
          setError('Board not found.');
        }
        setLoading(false);
      },
      err => {
        console.error('Error loading board:', err);
        setError('Could not load the board.');
        setLoading(false);
      },
    );

    const unsubscribeLists = firebaseService.listenToCollection<ListData>(
      listsPath,
      listDocs => {
        const sortedLists = listDocs
          .map(doc => ({ ...doc.data, id: doc.id } as ListData))
          .sort((a, b) => a.order - b.order);
        setLists(sortedLists);
      },
      err => {
        console.error('Error loading lists:', err);
        setError('Could not load lists.');
      },
    );

    firebaseService.getBoardMembers(boardId).then(setMembers).catch(console.error);

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
        cardDocs => {
          const sortedCards = cardDocs
            .map(doc => ({ ...doc.data, id: doc.id, listId: list.id } as CardData))
            .sort((a, b) => a.order - b.order);
          setCards(prev => {
            const updated = { ...prev, [list.id]: sortedCards };
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
    if (!lists) return;

    // Check for missing standard lists
    const existingListNames = lists.map(l => l.name);
    const missingStandardLists = STANDARD_LISTS.filter(l => !existingListNames.includes(l.name));

    if (missingStandardLists.length > 0) {
      missingStandardLists.forEach((list, idx) => {
        firebaseService.addList(boardId, {
          name: list.name,
          order: lists.length + idx,
          boardId,
        });
      });
    }
  }, [firebaseService, boardId, isFirebaseInitialized, lists]);

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
    [boardId, firebaseService, offlineSyncManager],
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
      maxHeight: '95%',
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
      </DefaultView>
    );
  }

  // Instead of just mapping lists, map STANDARD_LISTS in order, and for each, find the matching list and filter cards by the filter
  const orderedLists = STANDARD_LISTS.map(stdList => lists.find(l => l.name === stdList.name)).filter(Boolean);

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
                title: board?.name ?? 'Board',
                headerBackTitle: 'Back',
                headerTransparent: true,
                headerTintColor: '#FFFFFF',
              }}
            />
            <ScrollView
              horizontal
              style={[styles.listsContainer, { paddingTop: headerHeight }]}
              showsHorizontalScrollIndicator={false}>
              {orderedLists.map((list) => (
                list ? (
                  <BoardList
                    key={list.id}
                    listId={list.id}
                    listName={list.name}
                    boardId={boardId}
                    cards={cards[list.id]?.filter(card => {
                      const stdList = STANDARD_LISTS.find(l => l.name === list?.name);
                      // If card is linked to a prop, filter by prop status
                      if (card.propId) {
                        const prop = allProps.find(p => p.id === card.propId);
                        return prop && stdList && stdList.filter(prop);
                      }
                      // Otherwise, show in To-Do by default
                      return list?.name === 'To-Do';
                    }) || []}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                    onOpenCardDetail={(card: any) => router.setParams({ selectedCardId: card.id })}
                    onReorderCards={handleReorderCards}
                    onCardDrop={(card: any, targetListId: string) => {
                      if (card.listId !== targetListId && card.listId) {
                        handleMoveCard(card.id, card.listId, targetListId);
                      }
                    }}
                  />
                ) : null
              ))}
            </ScrollView>
            <CardDetailPanel
              isVisible={!!selectedCard}
              card={selectedCard}
              boardId={boardId!}
              lists={lists}
              allShowMembers={memoizedMembers}
              availableLabels={availableLabels}
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
        
        {/* Always visible bottom navigation */}
        <View style={styles.bottomNavigation}>
          <Pressable onPress={() => router.navigate('/(tabs)')} style={styles.navItem}>
            <Ionicons name="home" size={24} color="#c084fc" />
            <DefaultText style={styles.navText}>Home</DefaultText>
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
          <Pressable onPress={() => router.navigate('/(tabs)/profile')} style={styles.navItem}>
            <Ionicons name="person" size={24} color="#a3a3a3" />
            <DefaultText style={[styles.navText, { color: '#a3a3a3' }]}>Profile</DefaultText>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
};

export default TaskBoardDetailScreen;