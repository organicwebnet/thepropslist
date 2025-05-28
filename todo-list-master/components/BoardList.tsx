import React, { useState, forwardRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  Button,
  Alert,
  Pressable,
  ViewProps,
  Keyboard,
  Image,
} from 'react-native';
import { collection, getFirestore, addDoc, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
// dnd-kit imports
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy, // Strategy for sorting vertically
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities'; // For web transform styles
import { TapGestureHandler, State, TapGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import Colors from '../constants/Colors'; // Import Colors
import { useColorScheme } from './useColorScheme'; // Import useColorScheme
import { Ionicons } from '@expo/vector-icons'; // Import icons

// Define types
interface CardData {
  id: string;
  title: string;
  order: number;
  listId: string;
  boardId: string;
  description?: string; // Add description field
  dueDate?: Timestamp; // Add dueDate field
  imageUrl?: string; // Add imageUrl field
  createdAt?: any;
}

interface BoardListProps {
  listId: string;
  boardId: string;
  cards: CardData[];
  onDeleteCard: (listId: string, cardId: string) => void;
  onUpdateCardTitle: (listId: string, cardId: string, newTitle: string) => void;
  onOpenCardDetail: (card: CardData) => void; // Add prop to open detail modal
}

// Function to format date for display on card front
const formatDueDateBadge = (timestamp: Timestamp | undefined | null): string | null => {
    if (!timestamp) return null;
    const date = timestamp.toDate();
    // Simple format like "MMM D"
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// <<< Helper Function to Get Due Date Status >>>
const getDueDateStatus = (dueDate: Timestamp | undefined | null): 'ok' | 'soon' | 'overdue' | 'none' => {
    if (!dueDate) return 'none';

    const now = new Date();
    const due = dueDate.toDate();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
        return 'overdue'; // Overdue
    }
    if (diffHours <= 24) {
        return 'overdue'; // Due within 24 hours (treat as red)
    }
    if (diffHours <= 72) {
        return 'soon'; // Due within 3 days (amber)
    }
    return 'ok'; // Otherwise green
};

// New Draggable Card Component using forwardRef
// Export this component so it can be used in DragOverlay
export const DraggableCard = forwardRef<
  View,
  {
    card: CardData;
    onDelete: (listId: string, cardId: string) => void;
    onOpenDetail: (card: CardData) => void;
  }
>(({ card, onDelete, onOpenDetail }, ref) => { 
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { 
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: card.id, 
    data: { card },
  }); 

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }), [transform, transition, isDragging]);

  const combinedRef = (node: View | null) => {
     setNodeRef(node as any);
     if (typeof ref === 'function') { ref(node); } else if (ref) { ref.current = node; }
   };

   const onDeleteTapStateChange = ({ nativeEvent }: TapGestureHandlerStateChangeEvent) => {
     if (nativeEvent.state === State.ACTIVE) {
       console.log(`[DraggableCard] Delete tap activated for ${card.id}`);
       onDelete(card.listId, card.id);
     }
   };

  // Function to handle press on the main card area (now triggered by title)
  const handleCardPress = (event: any) => {
      console.log(`[DraggableCard] Title press for ${card.id}, opening detail.`);
      onOpenDetail(card);
  };

  const formattedDueDate = formatDueDateBadge(card.dueDate);
  const hasDescription = card.description && card.description.trim().length > 0;

  // <<< Calculate Due Date Status and Border Color >>>
  const dueDateStatus = getDueDateStatus(card.dueDate);
  const borderColor = useMemo(() => {
    switch (dueDateStatus) {
        case 'ok': return colors.dueDateOk;
        case 'soon': return colors.dueDateSoon;
        case 'overdue': return colors.dueDateOverdue;
        default: return undefined; // No border if no due date or status
    }
  }, [dueDateStatus, colors]);

  const borderStyle = useMemo(() => {
    return borderColor ? { borderColor: borderColor, borderWidth: 2 } : {}; // Add border only if color is defined
  }, [borderColor]);

  return (
    <View 
      ref={combinedRef} 
      style={[
        styles.cardContainer,
        style, 
        { backgroundColor: colors.backgroundSection, shadowColor: colors.shadow },
        borderStyle // <<< Apply dynamic border style here >>>
      ]}
    >
      {card.imageUrl && (
         <Image source={{ uri: card.imageUrl }} style={styles.cardCoverImage} />
      )}
      <View style={styles.cardInnerContent}> 
            {/* Top Row: Title Area + Delete Button */}              
            <View style={styles.topRowContainer}>
                {/* Drag Handle */}          
                <View style={styles.dragHandleArea} {...listeners}> 
                   <Ionicons name="reorder-two-outline" size={20} color={colors.textSecondary} />
                </View>
                {/* Title Area (NO listeners here) */}
                <View 
                    style={styles.cardTitleArea} 
                    // {...listeners} // REMOVE listeners from here
                >
                    {/* Pressable title opens modal */} 
                    <Pressable onPress={handleCardPress} style={styles.titlePressable}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
                    </Pressable>
                </View>
                {/* Delete Button */}                  
                <TapGestureHandler
                  onHandlerStateChange={onDeleteTapStateChange}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.deleteButtonWrapper}><Text style={[styles.deleteButtonText, { color: colors.buttonDestructiveBackground }]}>X</Text></View>
                </TapGestureHandler>
            </View>
            {/* Bottom Row: Badges Area */}
            {(hasDescription || formattedDueDate) && (
                <View style={styles.badgesContainer}>
                    {/* Description Badge */}
                    {hasDescription && (
                        <Ionicons 
                            name="reader-outline" 
                            size={16} 
                            color={colors.textSecondary} 
                            style={styles.badgeIcon}
                        />
                    )}
                    {/* Due Date Badge - Ensure this renders correctly */} 
                    {formattedDueDate && (
                        <View style={[styles.dueDateBadge, { backgroundColor: colors.background }]}>
                            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                            <Text style={[styles.dueDateText, { color: colors.textSecondary }]}>
                                {formattedDueDate}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    </View>
  );
});

const BoardList: React.FC<BoardListProps> = ({ listId, boardId, cards, onDeleteCard, onUpdateCardTitle, onOpenCardDetail }) => {
  const colorScheme = useColorScheme() ?? 'light'; // Get scheme inside BoardList
  const colors = Colors[colorScheme];

  // State for adding cards
  const [showAddCardInput, setShowAddCardInput] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  const db = getFirestore();

  // Function to add a new card
  const handleAddCard = async () => {
    if (!newCardTitle.trim()) {
      // Silently return or maybe shake input?
      return; 
    }
    if (!listId || !boardId) {
      Alert.alert('Error', 'Cannot add card: Missing board or list ID.');
      return;
    }

    setIsAddingCard(true);
    try {
      const cardsRef = collection(db, 'todo boards', boardId, 'lists', listId, 'todocards');
      await addDoc(cardsRef, {
        title: newCardTitle.trim(),
        order: cards.length, // Order based on length of cards prop
        createdAt: new Date(),
        listId: listId, // Store listId on card
        boardId: boardId, // Store boardId on card (needed for collectionGroup query)
      });
      setNewCardTitle(''); // Clear input
      setShowAddCardInput(false); // Hide input form
    } catch (err) {
      console.error("Error adding card: ", err);
      Alert.alert('Error', 'Could not add card.');
    } finally {
      setIsAddingCard(false);
    }
  };

  // Render function uses DraggableCard and passes onDeleteCard and onUpdateCardTitle
  const renderDraggableCard = ({ item }: { item: CardData }) => (
    <DraggableCard 
      card={item} 
      onDelete={onDeleteCard} 
      onOpenDetail={onOpenCardDetail}
    />
  );

  // Create an array of card IDs for SortableContext
  const cardIds = cards.map(card => card.id);

  return (
    <View style={styles.listContentContainer}>
      {cards.length === 0 && (
         // Apply theme color to placeholder text
         <Text style={[styles.noCardsText, { color: colors.textSecondary }]}>No cards yet.</Text>
      )}
      {/* Wrap the FlatList area with SortableContext */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <FlatList
            data={cards} 
            renderItem={renderDraggableCard}
            keyExtractor={item => item.id}
            style={styles.cardsList}
            scrollEnabled={false} // Disable FlatList scroll if parent ScrollView handles it
         />
      </SortableContext>
      {/* Add Card Button/Form */}
      {showAddCardInput ? (
        // Apply theme colors to form container
        <View style={[styles.addCardForm, { backgroundColor: colors.backgroundSection }]}> 
          {/* Apply theme colors to TextInput */}
          <TextInput
            placeholder="Enter card title..."
            value={newCardTitle}
            onChangeText={setNewCardTitle}
            style={[styles.addCardInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} // Theme
            placeholderTextColor={colors.textSecondary} // Theme
            autoFocus={true}
          />
          <View style={styles.addCardActions}>
            {/* Apply theme color to Button */}
            <Button 
              title="Add card" 
              onPress={handleAddCard} 
              disabled={isAddingCard} 
              color={colors.primary} // Theme
            />
            {/* Apply theme color to cancel text */}
            <Pressable onPress={() => setShowAddCardInput(false)} style={styles.cancelButton}>
               <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>X</Text> {/* Theme */}
            </Pressable>
          </View>
        </View>
      ) : (
        // Apply theme colors to button container and text
        <Pressable onPress={() => setShowAddCardInput(true)} style={[styles.addCardButton, { backgroundColor: colors.primaryLight + '80' }]}> {/* Theme */}
            <Text style={[styles.addCardButtonText, { color: colors.text }]}>+ Add a card</Text> {/* Theme */}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContentContainer: { // Styles for the View wrapping the cards FlatList and AddCard form
     flex: 1, 
  },
  cardsList: { // Style for the FlatList containing DraggableCards
    flex: 1,
  },
  cardContainer: {
    borderRadius: 6,
    paddingVertical: 8, // Adjusted padding
    paddingHorizontal: 10,
    marginVertical: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 1.22,
    elevation: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardCoverImage: {
    width: '100%',
    height: 100,
  },
  cardInnerContent: {
    flexDirection: 'column', // Stack rows vertically
    padding: 10,
  },
  topRowContainer: { // New container for title + delete
      flexDirection: 'row', 
      justifyContent: 'space-between',
      alignItems: 'center', // Center items vertically now
      marginBottom: 5, 
  },
  dragHandleArea: {
    paddingRight: 8, // Space between handle and title
    paddingVertical: 5, // Make it easier to grab
  },
  cardTitleArea: { 
    flex: 1, // Title takes remaining space
  },
  titlePressable: { 
    justifyContent: 'center',
    paddingVertical: 2, 
    minHeight: 20, 
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  badgeIcon: {
      marginRight: 8,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 5, 
  },
  dueDateText: {
      fontSize: 12,
  },
  deleteButtonWrapper: { 
      paddingLeft: 8,
      paddingVertical: 5,
  },
  deleteButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  addCardButton: {
     marginTop: 8,
     padding: 10,
     borderRadius: 3,
     backgroundColor: '#00000014',
  },
  addCardButtonText: {
     color: '#5e6c84',
  },
  addCardForm: { 
     marginTop: 8,
     backgroundColor: '#fff',
     borderRadius: 3,
     padding: 5, // Less padding than button
  },
  addCardInput: {
      backgroundColor: '#fff', // Already white, ensure it looks like input
      padding: 8,
      marginBottom: 5,
      fontSize: 14,
  },
  addCardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  cancelButton: {
      padding: 5,
  },
  cancelButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#6b778c',
  },
   errorText: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  noCardsText: {
    color: '#5e6c84',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default BoardList; // Ensure default export is present 