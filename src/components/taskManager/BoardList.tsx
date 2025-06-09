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
  LayoutChangeEvent, // Import LayoutChangeEvent
} from 'react-native';
// import { collection, getFirestore, addDoc, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore'; // OLD - Firebase calls will be props

// --- DndKit Imports (Uncommented) ---
// import {
//   useSortable,
//   SortableContext,
//   verticalListSortingStrategy,
// } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';

// --- Gesture Handler (Commented out as it's tied to DraggableCard a lot) ---
// import { TapGestureHandler, State, TapGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';

// --- NEW: Project specific imports ---
// import Colors from '../constants/Colors'; // OLD
// import { useColorScheme } from './useColorScheme'; // OLD
import { useTheme } from '../../contexts/ThemeContext.tsx'; // Path from src/components/taskManager/ to src/contexts/
import { lightTheme, darkTheme } from '../../styles/theme.ts'; // Import theme objects from the correct path
import { Ionicons } from '@expo/vector-icons';

// --- React Native Gesture Handler & Reanimated IMPORTS ---
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  withSpring, 
  runOnJS
} from 'react-native-reanimated';

// Create an animated version of View
// const AnimatedView = Animated.createAnimatedComponent(View); // This was an attempt to fix, reverting
const AnimatedView = Animated.View; // Reverting to original state due to persistent TS errors

// Assuming CustomTimestamp is defined in your project's types or Firebase service types
// For now, let's use string for dates and handle parsing/formatting as needed.
interface CustomTimestamp {
    toDate: () => Date;
    // Add other properties if your CustomTimestamp is more complex
}

// Define types
interface CardLabel { // New interface for card labels
  id: string;
  color: string; // Hex color string
  name: string; // Made name required
}

interface CardData {
  id: string;
  title: string;
  order: number;
  listId: string;
  boardId: string;
  // Add width & height for drop calculations if known, or measure dynamically
  // width?: number; 
  // height?: number;
  description?: string;
  dueDate?: string | CustomTimestamp | null; // Allow string or CustomTimestamp
  imageUrl?: string;
  createdAt?: string | CustomTimestamp; // Allow string or CustomTimestamp
  labels?: CardLabel[]; // Added labels array
}

interface DraggableCardItemProps { // Renamed props interface for clarity
  card: CardData;
  listId: string;
  onDelete: (listId: string, cardId: string) => void;
  onOpenDetail: (card: CardData) => void;
  // New prop for handling the drop event from the parent (BoardScreen)
  onCardDrop: (card: CardData, finalGlobalX: number, finalGlobalY: number) => void; 
  // Prop to get the scroll offset of the parent BoardList's FlatList (if horizontal)
  // or the overall BoardScreen's ScrollView (if vertical lists in horizontal scroll)
  getBoardScrollOffset: () => { x: number, y: number }; 
}

interface BoardListProps {
  listId: string;
  listName: string; // Added to display list name
  boardId: string;
  cards: CardData[];
  onAddCard: (listId: string, cardTitle: string) => Promise<void>; // Make async
  onDeleteCard: (listId: string, cardId: string) => void;
  onOpenCardDetail: (card: CardData) => void;
  // Pass the new props from parent (TaskBoardDetailScreen)
  onCardDrop: (card: CardData, finalGlobalX: number, finalGlobalY: number) => void;
  getBoardScrollOffset: () => { x: number, y: number };
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
  PanGestureHandler, // Changed View to PanGestureHandler
  DraggableCardItemProps
>(({ card, listId, onDelete, onOpenDetail, onCardDrop, getBoardScrollOffset }, ref) => { // ref from forwardRef might not be directly used on AnimatedView if PanGestureHandler is the immediate child
  const { theme: themeName } = useTheme();
  const currentColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

  const isDraggingActive = useSharedValue(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Store initial coordinates of the card item itself relative to its parent for accurate drop calculation
  const itemLayout = useSharedValue({ x: 0, y: 0, width: 0, height: 0 });

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number, startY: number }>({
    onStart: (_, ctx) => {
      'worklet';
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      isDraggingActive.value = true;
    },
    onActive: (event, ctx) => {
      'worklet';
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      'worklet';
      // No longer need to manually calculate finalX, finalY based on itemLayout and scrollOffset here
      // const boardScrollOffsetFromCard = runOnJS(getBoardScrollOffset)() as ({ x: number; y: number } | undefined);
      // const finalX = itemLayout.value.x + event.translationX - (boardScrollOffsetFromCard?.x || 0);
      // const finalY = itemLayout.value.y + event.translationY - (boardScrollOffsetFromCard?.y || 0);
      
      // Use absoluteX and absoluteY from the event for screen coordinates
      runOnJS(onCardDrop)(card, event.absoluteX, event.absoluteY);
      
      translateX.value = withSpring(0); 
      translateY.value = withSpring(0);
      isDraggingActive.value = false;
    },
  });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: withSpring(isDraggingActive.value ? 1.05 : 1) }, // Scale up when dragging
      ],
      zIndex: isDraggingActive.value ? 1000 : 1, // Bring to front when dragging
      elevation: isDraggingActive.value ? 10 : 1, // Android shadow
      shadowOpacity: isDraggingActive.value ? 0.3 : 0.18, // iOS shadow
      shadowRadius: isDraggingActive.value ? 10 : 1.00,
    };
  });

  const handleCardPress = () => { 
    if (!isDraggingActive.value) { // Only open detail if not currently being dragged (or just finished)
        runOnJS(onOpenDetail)(card); 
    }
  };
  const formattedDueDate = formatDueDateBadge(card.dueDate);
  const hasDescription = card.description && card.description.trim().length > 0;
  const dueDateStatus = getDueDateStatus(card.dueDate);
  
  const cardBorderColor = useMemo(() => {
    switch (dueDateStatus) {
        case 'ok': return currentColors.dueDateOk;
        case 'soon': return currentColors.dueDateSoon;
        case 'overdue': return currentColors.dueDateOverdue;
        default: return undefined;
    }
  }, [dueDateStatus, currentColors]);

  const borderStyle = useMemo(() => {
    return cardBorderColor ? { borderColor: cardBorderColor, borderWidth: 2, borderRadius: 6 } : { borderRadius: 6 };
  }, [cardBorderColor]);

  const cardStyles = StyleSheet.create({
    cardContainer: { 
      marginBottom: 8, 
      padding: 10, 
      backgroundColor: currentColors.background || '#FFFFFF', // White background for cards
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.18, 
      shadowRadius: 1.00, 
      elevation: 1 
    },
    labelsContainer: { // New style for labels row
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 5,
    },
    labelStrip: { // Style for individual label strips
      height: 8,
      width: 32,
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 4, // In case they wrap
    },
    cardCoverImage: { width: '100%', height: 100, borderRadius: 4, marginBottom: 5 },
    cardInnerContent: {}, 
    topRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' , marginBottom: 4},
    cardTitleArea: { flex: 1 },
    titlePressable: { flex: 1 },
    cardTitle: { 
      fontSize: 16, 
      fontWeight: '500', 
      color: currentColors.text || '#171717', // Explicit dark color for text on light card
    },
    deleteButtonWrapper: { paddingHorizontal: 8, paddingVertical: 4 },
    badgesContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    badgeIcon: { 
      marginRight: 8,
      // The Ionicons component itself will get a color prop below
    },
    dueDateBadge: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 6, 
      paddingVertical: 2, 
      borderRadius: 4, 
      backgroundColor: currentColors.background, // This might need to be light if card is white and theme is dark
                                               // Or make it transparent and rely on text color
    },
    dueDateText: { 
      fontSize: 12, 
      color: currentColors.textSecondary || '#525252', // Explicit dark secondary color
    },
  });

  return (
    <PanGestureHandler
      ref={ref} 
      onGestureEvent={gestureHandler}
    >
      <AnimatedView 
        style={[cardStyles.cardContainer, borderStyle, animatedCardStyle]}
        onLayout={(event: LayoutChangeEvent) => { 
          const { x, y, width, height } = event.nativeEvent.layout;
          itemLayout.value = { x, y, width, height };
        }}
      >
        {card.labels && card.labels.length > 0 && (
          <View style={cardStyles.labelsContainer}>
            {card.labels.map(label => (
              <View key={label.id} style={[cardStyles.labelStrip, { backgroundColor: label.color }]} />
            ))}
          </View>
        )}
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
                  <Pressable onPress={() => onDelete(listId, card.id)} hitSlop={10} style={cardStyles.deleteButtonWrapper}>
                    <Ionicons name="close-circle-outline" size={22} color={currentColors.error} />
                  </Pressable>
              </View>
              {(hasDescription || formattedDueDate) && (
                  <View style={cardStyles.badgesContainer}>
                      {hasDescription && (
                          <Ionicons name="reader-outline" size={16} color={currentColors.textSecondary || '#525252'} style={cardStyles.badgeIcon}/>
                      )}
                      {formattedDueDate && (
                          <View style={cardStyles.dueDateBadge}>
                              <Ionicons name="calendar-outline" size={12} color={currentColors.textSecondary || '#525252'} style={{ marginRight: 3 }} />
                              <Text style={cardStyles.dueDateText}>{formattedDueDate}</Text>
                          </View>
                      )}
                  </View>
              )}
          </View>
      </AnimatedView>
    </PanGestureHandler>
  );
});

// Main BoardList component
const BoardList: React.FC<BoardListProps> = ({ listId, listName, boardId, cards, onAddCard, onDeleteCard, onOpenCardDetail, onCardDrop, getBoardScrollOffset }) => {
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

  const [showAddCardInput, setShowAddCardInput] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  const handleAddCardInternal = async () => {
    if (!newCardTitle.trim()) return;
    if (!listId || !boardId) {
      Alert.alert("Error", "List ID or Board ID is missing. Cannot add card.");
      return;
    }
    setIsAddingCard(true);
    try {
      await onAddCard(listId, newCardTitle.trim());
      setNewCardTitle('');
      setShowAddCardInput(false);
    } catch (error) {
      Alert.alert("Error", "Failed to add card. Please try again.");
    } finally {
      setIsAddingCard(false);
    }
  };

  // Styles specific to BoardList
  const listStyles = StyleSheet.create({
    listContainer: {
      width: 280, 
      backgroundColor: currentThemeColors.listBackground || '#F0F0F0', // Light gray fallback
      borderRadius: 8,
      padding: 10,
      marginHorizontal: 5, 
      overflow: 'visible',
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: currentThemeColors.border,
      marginBottom: 10,
    },
    listTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentThemeColors.text, // Primary text color for title
    },
    listOptionsButton: { // Style for the new options button
      padding: 5,
    },
    cardsScrollView: {
      flexGrow: 1, 
    },
    addCardButton: { // Changed to be more text-like
      // backgroundColor: currentThemeColors.primary, // Removed background
      paddingVertical: 10,
      borderRadius: 5,
      alignItems: 'flex-start', // Align text to the left like Trello
      marginTop: 10,
    },
    addCardButtonText: {
      color: currentThemeColors.textSecondary, // Darker text, less prominent than primary
      fontSize: 15, // Slightly smaller
      // fontWeight: 'bold', // Not bold
    },
    addCardInputContainer: {
      marginTop: 10,
    },
    textInput: {
      backgroundColor: currentThemeColors.inputBackground,
      color: currentThemeColors.text,
      padding: 10,
      borderRadius: 5,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },
    addCardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    emptyListText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentThemeColors.textSecondary,
      textAlign: 'center',
      marginTop: 20,
    },
    cardsContainerScroll: {
      padding: 10,
    },
  });

  return (
    <View style={listStyles.listContainer}>
      <View style={listStyles.listHeader}>
        <Text style={listStyles.listTitle}>{listName}</Text>
        <Pressable style={listStyles.listOptionsButton} onPress={() => console.log('List options for:', listId)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={currentThemeColors.textSecondary} />
        </Pressable>
      </View>

      {/* <SortableContext REMOVED> */}
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => ( 
            <DraggableCardItem
              card={item}
              listId={listId} 
              onDelete={onDeleteCard} 
              onOpenDetail={onOpenCardDetail}
              onCardDrop={onCardDrop}
              getBoardScrollOffset={getBoardScrollOffset}
            />
          )}
          ListEmptyComponent={<Text style={listStyles.emptyListText}>No cards in this list.</Text>}
          contentContainerStyle={listStyles.cardsContainerScroll}
          // nestedScrollEnabled={true} // Consider if FlatList is inside another ScrollView
        />
      {/* </SortableContext REMOVED> */}
    </View>
  );
};

export default BoardList; 