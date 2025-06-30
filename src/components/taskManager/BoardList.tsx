import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Pressable, Image } from 'react-native';
import { DraxView } from 'react-native-drax';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

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
      backgroundColor: '#1d2125',
      borderRadius: 8,
      marginHorizontal: 10,
      paddingHorizontal: 14,
      paddingVertical: 0,
      alignSelf: 'flex-start',
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
      backgroundColor: '#111111',
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
    return (
      <View style={{
        width: 44,
        height: 220,
        backgroundColor: '#1d2125',
        borderRadius: 22,
        marginHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
      }}>
        <Pressable onPress={() => setIsCollapsed(false)} style={{ alignItems: 'center' }}>
          <Ionicons name="chevron-back-outline" size={22} color={currentThemeColors.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
        </Pressable>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16,
            transform: [{ rotate: '-90deg' }],
            width: 160,
            textAlign: 'center',
          }}>{listName}</Text>
        </View>
        <View style={{
          backgroundColor: '#222',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 2,
          marginBottom: 2,
        }}>
          <Text style={{ color: '#bdbdbd', fontWeight: 'bold', fontSize: 16 }}>{cards.length}</Text>
        </View>
      </View>
    );
  }

  return (
    <DraxView
      style={listStyles.listContainer}
      receivingStyle={{ borderColor: currentThemeColors.primary, borderWidth: 2 }}
      onReceiveDragDrop={({ dragged: { payload } }) => {
        if (payload && payload.listId !== listId) {
          onCardDrop(payload, listId);
        }
      }}>
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
      {showAddCardInput ? (
        <View style={{ paddingHorizontal: 4 }}>
          <TextInput
            style={listStyles.textInput}
            placeholder="Enter card title..."
            placeholderTextColor="#8B949E"
            value={newCardTitle}
            onChangeText={setNewCardTitle}
            autoFocus
            onBlur={() => !newCardTitle && setShowAddCardInput(false)}
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
            <Pressable onPress={() => setShowAddCardInput(false)}>
              <Ionicons name="close" size={28} color="#8B949E" />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={listStyles.addCardButton} onPress={() => setShowAddCardInput(true)}>
          <Ionicons name="add" size={22} color="#E0E0E0" />
          <Text style={listStyles.addCardButtonText}>Add a card</Text>
        </Pressable>
      )}
    </DraxView>
  );
};

export default BoardList; 
