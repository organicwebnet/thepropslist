import React, { useState, forwardRef, useMemo } from 'react'; // Removed useEffect, useCallback for now
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList, // Will be used by SortableContext
  TextInput,
  Button,
  Alert,
  Pressable,
  Image,
} from 'react-native';
// import { collection, getFirestore, addDoc, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore'; // OLD - Firebase calls will be props

// --- DndKit Imports (Uncommented) ---
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Gesture Handler (Commented out as it's tied to DraggableCard a lot) ---
// import { TapGestureHandler, State, TapGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';

// --- NEW: Project specific imports ---
// import Colors from '../constants/Colors'; // OLD
// import { useColorScheme } from './useColorScheme'; // OLD
import { useTheme } from '../../contexts/ThemeContext.tsx'; // Path from src/components/taskManager/ to src/contexts/
import { lightTheme, darkTheme } from '../../theme.ts'; // Import theme objects
import { Ionicons } from '@expo/vector-icons';

// Assuming CustomTimestamp is defined in your project's types or Firebase service types
// For now, let's use string for dates and handle parsing/formatting as needed.
interface CustomTimestamp {
    toDate: () => Date;
    // Add other properties if your CustomTimestamp is more complex
}

// Define types
interface CardData {
  id: string;
  title: string;
  order: number;
  listId: string;
  boardId: string;
  description?: string;
  dueDate?: string | CustomTimestamp | null; // Allow string or CustomTimestamp
  imageUrl?: string;
  createdAt?: string | CustomTimestamp; // Allow string or CustomTimestamp
}

interface BoardListProps {
  listId: string;
  listName: string; // Added to display list name
  boardId: string;
  cards: CardData[];
  onAddCard: (listId: string, cardTitle: string) => Promise<void>; // Make async
  onDeleteCard: (listId: string, cardId: string) => void;
  onOpenCardDetail: (card: CardData) => void;
  // Add props for list title editing and list deletion if needed here
  // onUpdateListTitle: (listId: string, newTitle: string) => void;
  // onDeleteList: (listId: string) => void;
}

const parseDate = (dateValue: string | CustomTimestamp | undefined | null): Date | null => {
    if (!dateValue) return null;
    if (typeof dateValue === 'string') return new Date(dateValue);
    if (dateValue && typeof (dateValue as CustomTimestamp).toDate === 'function') {
        return (dateValue as CustomTimestamp).toDate();
    }
    return null; // Or throw error
};

const formatDueDateBadge = (dateValue: string | CustomTimestamp | undefined | null): string | null => {
    const date = parseDate(dateValue);
    if (!date) return null;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getDueDateStatus = (dateValue: string | CustomTimestamp | undefined | null): 'ok' | 'soon' | 'overdue' | 'none' => {
    const date = parseDate(dateValue);
    if (!date) return 'none';

    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'overdue';
    if (diffHours <= 72) return 'soon'; // Changed from 24 to 72 for 'soon' to be more distinct from overdue
    return 'ok';
};

// Renamed to DraggableCardItem and re-integrated useSortable
const DraggableCardItem = forwardRef<
  View,
  {
    card: CardData;
    onDelete: (listId: string, cardId: string) => void;
    onOpenDetail: (card: CardData) => void;
    // useSortable provides attributes and listeners, so direct color passing might be less critical if styles are managed by sortable state
  }
>(({ card, onDelete, onOpenDetail }, ref_unused) => { // ref_unused as setNodeRef will be the primary ref
  const { theme: themeName } = useTheme();
  const currentColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // zIndex: isDragging ? 100 : 0, // Optional: for better visual feedback
  };

  const handleCardPress = () => { onOpenDetail(card); };
  const formattedDueDate = formatDueDateBadge(card.dueDate);
  const hasDescription = card.description && card.description.trim().length > 0;
  const dueDateStatus = getDueDateStatus(card.dueDate);
  const borderColor = useMemo(() => {
    switch (dueDateStatus) {
        case 'ok': return currentColors.dueDateOk;
        case 'soon': return currentColors.dueDateSoon;
        case 'overdue': return currentColors.dueDateOverdue;
        default: return undefined;
    }
  }, [dueDateStatus, currentColors]);

  const borderStyle = useMemo(() => {
    return borderColor ? { borderColor: borderColor, borderWidth: 2, borderRadius: 6 } : { borderRadius: 6 };
  }, [borderColor]);

  const cardStyles = StyleSheet.create({
    cardContainer: { marginBottom: 8, padding: 10, backgroundColor: currentColors.card, shadowColor: currentColors.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 1.00, elevation: 1 },
    cardCoverImage: { width: '100%', height: 100, borderRadius: 4, marginBottom: 5 },
    cardInnerContent: {}, 
    topRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' , marginBottom: 4},
    cardTitleArea: { flex: 1 },
    titlePressable: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '500', color: currentColors.text },
    deleteButtonWrapper: { paddingHorizontal: 8, paddingVertical: 4 },
    badgesContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    badgeIcon: { marginRight: 8 },
    dueDateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: currentColors.background },
    dueDateText: { fontSize: 12, color: currentColors.textSecondary },
    dragHandle: { paddingHorizontal: 5 } // Style for a drag handle if you add one
  });

  return (
    // Apply setNodeRef to the root draggable element
    // Spread attributes and listeners typically on a specific drag handle or the whole card
    <View ref={setNodeRef} style={[cardStyles.cardContainer, borderStyle, style]} {...attributes} {...listeners}>
        {/* Optional: Explicit Drag Handle (e.g., an Icon)
        <View style={cardStyles.dragHandle} {...attributes} {...listeners}>
            <Ionicons name="reorder-three-outline" size={24} color={currentColors.textSecondary} />
        </View> 
        */} 
      {card.imageUrl && (
         <Image source={{ uri: card.imageUrl }} style={cardStyles.cardCoverImage} />
      )}
      <View style={cardStyles.cardInnerContent}>
            <View style={cardStyles.topRowContainer}>
                <View style={cardStyles.cardTitleArea}>
                    <Pressable onPress={handleCardPress} style={cardStyles.titlePressable}>
                        <Text style={cardStyles.cardTitle}>{card.title}</Text>
                    </Pressable>
                </View>
                <Pressable onPress={() => onDelete(card.listId, card.id)} hitSlop={10} style={cardStyles.deleteButtonWrapper}>
                  <Ionicons name="close-circle-outline" size={22} color={currentColors.error} />
                </Pressable>
            </View>
            {(hasDescription || formattedDueDate) && (
                <View style={cardStyles.badgesContainer}>
                    {hasDescription && (
                        <Ionicons name="reader-outline" size={16} color={currentColors.textSecondary} style={cardStyles.badgeIcon}/>
                    )}
                    {formattedDueDate && (
                        <View style={cardStyles.dueDateBadge}>
                            <Ionicons name="calendar-outline" size={12} color={currentColors.textSecondary} style={{ marginRight: 3 }} />
                            <Text style={cardStyles.dueDateText}>{formattedDueDate}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    </View>
  );
});

// Main BoardList component
const BoardList: React.FC<BoardListProps> = ({ listId, listName, boardId, cards, onAddCard, onDeleteCard, onOpenCardDetail }) => {
  const { theme: themeName } = useTheme(); // Get theme name
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors; // Select colors object
  // Removed localAppColors

  const [showAddCardInput, setShowAddCardInput] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  const handleAddCardInternal = async () => {
    if (!newCardTitle.trim()) return;
    if (!listId || !boardId) {
      Alert.alert('Error', 'Cannot add card: Missing board or list ID.');
      return;
    }
    setIsAddingCard(true);
    try {
      await onAddCard(listId, newCardTitle.trim()); // Call prop
      setNewCardTitle('');
      setShowAddCardInput(false);
    } catch (err) {
      console.error("Error adding card via prop: ", err);
      Alert.alert('Error', 'Could not add card.');
    } finally {
      setIsAddingCard(false);
    }
  };

  // Styles for BoardList, using currentThemeColors
  const listStyles = StyleSheet.create({
      listContainer: { width: 270, backgroundColor: currentThemeColors.listBackground, borderRadius: 8, padding: 10, marginRight: 10, maxHeight: '95%' }, // Max height to encourage scrolling within list
      listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
      listTitle: { fontSize: 18, fontWeight: 'bold', color: currentThemeColors.text },
      // Menu button placeholder style
      listMenuButton: { padding:5 },
      cardsScrollView: { flexGrow: 1 }, // Allows ScrollView to take available space
      addCardContainer: { marginTop: 10 },
      input: { backgroundColor: currentThemeColors.inputBackground, color: currentThemeColors.text, padding: 10, borderRadius: 4, marginBottom: 8, borderWidth: 1, borderColor: currentThemeColors.border },
      buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
      noCardsText: { color: currentThemeColors.textSecondary, fontStyle:'italic', textAlign:'center', marginTop: 20 }
  });

  // Uncommented and using cards prop
  const cardIds = useMemo(() => cards.map(c => c.id), [cards]);

  return (
    <View style={listStyles.listContainer}>
        <View style={listStyles.listHeader}>
            <Text style={listStyles.listTitle}>{listName}</Text>
            {/* Placeholder for list menu (delete, rename list) */}
            {/* <Pressable style={listStyles.listMenuButton} onPress={() => console.log('List menu for ', listId)}>
                <Ionicons name="ellipsis-horizontal" size={20} color={currentThemeColors.textSecondary} />
            </Pressable> */}
        </View>

        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}> 
            <FlatList 
                data={cards}
                renderItem={({ item }) => (
                    <DraggableCardItem 
                        card={item} 
                        onDelete={onDeleteCard} 
                        onOpenDetail={onOpenCardDetail} 
                    />
                )}
                keyExtractor={item => item.id}
                style={listStyles.cardsScrollView}
                // showsVerticalScrollIndicator={false} // Optional: if you want to hide scrollbar inside list
            />
        </SortableContext>

        <View style={listStyles.addCardContainer}>
        {showAddCardInput ? (
          <View>
            <TextInput
              style={listStyles.input}
              placeholder="Enter card title..."
              value={newCardTitle}
              onChangeText={setNewCardTitle}
              autoFocus
              placeholderTextColor={currentThemeColors.placeholder} // Use placeholder from theme
            />
            <View style={listStyles.buttonContainer}>
                <Button title="Add Card" onPress={handleAddCardInternal} disabled={isAddingCard} color={currentThemeColors.primary} />
                <Button title="Cancel" onPress={() => {setShowAddCardInput(false); setNewCardTitle('');}} color={currentThemeColors.textSecondary}/>
            </View>
          </View>
        ) : (
          <Button title="+ Add Card" onPress={() => setShowAddCardInput(true)} color={currentThemeColors.primary} />
        )}
      </View>
    </View>
  );
};

export default BoardList; 