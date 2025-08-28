import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Pressable, Image } from 'react-native';
import { DraxView } from 'react-native-drax';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Type definitions (assuming they are defined elsewhere, simplified here for clarity)
interface CustomTimestamp {
  toDate: () => Date;
}

interface CardLabel {
  id: string;
  color: string;
  name: string;
}

interface CardData {
  id: string;
  title: string;
  order: number;
  listId: string;
  boardId: string;
  description?: string;
  dueDate?: string | CustomTimestamp | null;
  imageUrl?: string;
  createdAt?: string | CustomTimestamp;
  labels?: CardLabel[];
}

// Updated Props for the BoardList
interface BoardListProps {
  listId: string;
  listName: string;
  boardId: string;
  cards: CardData[];
  onAddCard: (listId: string, cardTitle: string) => Promise<void>;
  onDeleteCard: (listId: string, cardId: string) => void;
  onOpenCardDetail: (card: CardData) => void;
  onReorderCards: (listId: string, newCards: CardData[]) => void;
  onCardDrop: (card: CardData, targetListId: string) => void;
}

const BoardList: React.FC<BoardListProps> = ({
  listId,
  listName,
  cards,
  onAddCard,
  onDeleteCard,
  onOpenCardDetail,
  onReorderCards,
  onCardDrop,
}) => {
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;
  const [showAddCardInput, setShowAddCardInput] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAddCardInternal = async () => {
    if (!newCardTitle.trim()) return;
    Alert.alert('DEBUG', `Add Card button pressed for list ${listId} with title: ${newCardTitle}`);
    setIsAddingCard(true);
    try {
      await onAddCard(listId, newCardTitle.trim());
      setNewCardTitle('');
      setShowAddCardInput(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add card. Please try again.');
    } finally {
      setIsAddingCard(false);
    }
  };

  const listStyles = StyleSheet.create({
    listContainer: {
      width: 280,
      backgroundColor: 'transparent',
      borderRadius: 8,
      marginHorizontal: 10,
      paddingHorizontal: 14,
      paddingVertical: 0,
      alignSelf: 'flex-start',
      borderWidth: 2,
      borderColor: 'rgba(80,80,200,0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 12,
    },
    listTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    cardList: {
      paddingBottom: 4,
    },
    cardContainer: {
      marginBottom: 10,
      padding: 0,
      backgroundColor: 'rgb(24, 11, 102)',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    cardDragging: {
      opacity: 0.8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: '#FFFFFF',
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    emptyListText: {
      textAlign: 'center',
      color: '#8B949E',
      marginTop: 20,
    },
    addCardButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: 'transparent',
      borderRadius: 12,
      marginTop: 8,
    },
    addCardButtonText: {
      color: '#E0E0E0',
      marginLeft: 8,
      fontSize: 15,
      fontWeight: '600',
    },
    textInput: {
      backgroundColor: '#161B22',
      color: '#FFFFFF',
      padding: 12,
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#555',
    },
    addCardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

  if (isCollapsed) {
    // Use the same background color as the expanded list (do not use pastel)
    const bgColor = listStyles.listContainer.backgroundColor || '#1d2125';
    return (
      <View style={{ alignItems: 'center', marginHorizontal: 6 }}>
        {/* Icon above the pill */}
        <Pressable onPress={() => setIsCollapsed(false)} style={{ marginBottom: 4 }}>
          <MaterialIcons name="unfold-more" size={28} color="#888" />
        </Pressable>
        {/* The pill */}
        <View
          style={{
            width: 40,
            height: 180,
            backgroundColor: bgColor,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(80,80,200,0.15)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.10,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Rotated label */}
          <Pressable onPress={() => setIsCollapsed(false)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 15,
              transform: [{ rotate: '-90deg' }],
              textAlign: 'center',
              letterSpacing: 1,
              width: 140,
            }}>{listName}</Text>
          </Pressable>
          {/* Rotated card count at the bottom */}
          <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 14,
              transform: [{ rotate: '-90deg' }],
              textAlign: 'center',
              letterSpacing: 1,
            }}>{cards.length}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Use the same pastel color as collapsed
  const pastelColors = [
    '#e3fcef', // Green
    '#fffbe6', // Yellow
    '#ffe2cc', // Orange
    '#ffd6e5', // Red
    '#eae6ff', // Purple
    '#deebff', // Blue
    '#e6fcff', // Teal
    '#e4f7d2', // Lime
    '#f9eaff', // Magenta
    '#f4f5f7', // Default
  ];
  function pickPastelColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return pastelColors[Math.abs(hash) % pastelColors.length];
  }
  const bgColor = pickPastelColor(listId || listName || 'default');
  return (
    <View
      style={{
        ...listStyles.listContainer,
        backgroundColor: bgColor,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(80,80,200,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <DraxView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        receivingStyle={{ borderColor: currentThemeColors.primary, borderWidth: 2 }}
        onReceiveDragDrop={({ dragged: { payload } }) => {
          if (payload && payload.listId !== listId) {
            onCardDrop(payload, listId);
          }
        }}
      >
        <View style={listStyles.listHeader}>
          <Text style={listStyles.listTitle}>{listName}</Text>
          <Pressable onPress={() => setIsCollapsed((prev) => !prev)}>
            <Ionicons name="chevron-forward-outline" size={24} color={currentThemeColors.textSecondary} style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>
        </View>
        <View style={listStyles.cardList}>
          {cards.length === 0 ? (
            <Text style={listStyles.emptyListText}>No cards in this list.</Text>
          ) : (
            cards.map((card, idx) => (
              <Pressable key={card.id} onPress={() => onOpenCardDetail(card)}>
                <DraxView
                  style={listStyles.cardContainer}
                  draggingStyle={listStyles.cardDragging}
                  dragPayload={{ ...card }}
                  longPressDelay={150}
                  draggable>
                  {card.imageUrl ? (
                    <Image
                      source={{ uri: card.imageUrl }}
                      style={{
                        width: '100%',
                        height: 110,
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        marginBottom: 0,
                        resizeMode: 'cover',
                      }}
                    />
                  ) : null}
                  <View style={{ padding: 8, paddingTop: card.imageUrl ? 6 : 0 }}>
                    <Text style={listStyles.cardTitle}>{card.title}</Text>
                    {/* Details row (icons, numbers) can go here if needed */}
                  </View>
                </DraxView>
              </Pressable>
            ))
          )}
        </View>
        {/* Add Card Input */}
        <View style={{ paddingHorizontal: 4 }}>
          <TextInput
            style={listStyles.textInput}
            placeholder="Enter card title..."
            placeholderTextColor="#8B949E"
            value={newCardTitle}
            onChangeText={setNewCardTitle}
            autoFocus={false}
          />
          <View style={listStyles.addCardActions}>
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? '#238636' : '#238636',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  opacity: pressed ? 0.9 : 1,
                },
                isAddingCard && { backgroundColor: '#30363D' },
              ]}
              onPress={handleAddCardInternal}
              disabled={isAddingCard}>
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {isAddingCard ? 'Adding...' : 'Add Card'}
              </Text>
            </Pressable>
          </View>
        </View>
      </DraxView>
      {/* TEST BUTTON: Always visible, bright red */}
      <Pressable
        style={{ backgroundColor: 'red', padding: 16, margin: 8, borderRadius: 8, alignItems: 'center' }}
        onPress={() => Alert.alert('Test', 'Button pressed!')}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>TEST BUTTON</Text>
      </Pressable>
    </View>
  );
};

export default BoardList; 
