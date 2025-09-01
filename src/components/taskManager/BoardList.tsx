import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Pressable, Image } from 'react-native';
import { DraxView } from 'react-native-drax';
import { useTheme } from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFirebase } from '../../platforms/mobile/contexts/FirebaseContext';

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
  boardId,
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

  // --- @mention state for add-new-card title ---
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showPropSearch, setShowPropSearch] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showContainerSearch, setShowContainerSearch] = useState(false);
  const [propSearchText, setPropSearchText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [containerSearchText, setContainerSearchText] = useState('');
  const [propSuggestions, setPropSuggestions] = useState<{id: string, name: string}[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [containerSuggestions, setContainerSuggestions] = useState<{id: string, name: string}[]>([]);

  // Fetch props/containers for @mentions
  const { service: firebaseService } = useFirebase();
  const [allProps, setAllProps] = useState<{id: string, name: string}[]>([]);
  const [allContainers, setAllContainers] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (!firebaseService || !boardId) return;
    firebaseService.getDocument('todo_boards', boardId).then((doc: any) => {
      const showId = doc?.data?.showId;
      // Props
      firebaseService.getCollection('props')
        .then((snapshot: any) => {
          const items = snapshot?.docs ? snapshot.docs
            .filter((d: any) => (showId ? d.data?.showId === showId : true))
            .map((d: any) => ({ id: d.id, name: d.data?.name || 'Unnamed Prop' })) : [];
          setAllProps(items);
        })
        .catch(() => setAllProps([{ id: 'prop1', name: 'Sample Prop' }]));
      // Containers
      firebaseService.getCollection('packing_boxes')
        .then((snapshot: any) => {
          const items = snapshot?.docs ? snapshot.docs
            .filter((d: any) => (showId ? d.data?.showId === showId : true))
            .map((d: any) => ({ id: d.id, name: d.data?.name || 'Unnamed Box' })) : [];
          setAllContainers(items);
        })
        .catch(() => setAllContainers([{ id: 'cont1', name: 'Sample Box' }]));
    }).catch(() => {
      setAllProps([{ id: 'prop1', name: 'Sample Prop' }]);
      setAllContainers([{ id: 'cont1', name: 'Sample Box' }]);
    });
  }, [firebaseService, boardId]);

  const closeMentionSystem = () => {
    setShowMentionMenu(false);
    setShowPropSearch(false);
    setShowUserSearch(false);
    setShowContainerSearch(false);
    setPropSearchText('');
    setUserSearchText('');
    setContainerSearchText('');
    setPropSuggestions([]);
    setUserSuggestions([]);
    setContainerSuggestions([]);
  };

  const handleTitleChangeWithMentions = (text: string) => {
    setNewCardTitle(text);
    // Quick-create prop with @P:Name
    const quickCreateMatch = text.match(/@P:([^\n]+)$/);
    if (quickCreateMatch && quickCreateMatch[1].trim()) {
      (async () => {
        try {
          const name = quickCreateMatch[1].trim();
          const now = new Date().toISOString();
          const created = await firebaseService.addDocument<any>('props', {
            name,
            showId: undefined,
            category: 'Other',
            price: 0,
            quantity: 1,
            status: 'confirmed',
            createdAt: now,
            updatedAt: now,
          });
          const propLink = `[@${name}](prop:${created.id})`;
          setNewCardTitle(text.replace(/@P:[^\n]+$/, propLink + ' '));
        } catch (err) {
          console.error('Failed to quick-create prop from @P:', err);
        }
      })();
      return;
    }
    if (!showMentionMenu && !showPropSearch && !showUserSearch && !showContainerSearch) {
      if (text.endsWith('@prop ') || text.endsWith('@prop')) {
        setShowPropSearch(true);
        setPropSearchText('');
        setPropSuggestions(allProps);
      } else if (text.endsWith('@box ') || text.endsWith('@box')) {
        setShowContainerSearch(true);
        setContainerSearchText('');
        setContainerSuggestions(allContainers);
      } else if (text.endsWith('@user ') || text.endsWith('@user')) {
        setShowUserSearch(true);
        setUserSearchText('');
        // If you have a members list, set suggestions here
      } else if (text.endsWith('@') && !text.endsWith('@@')) {
        setShowMentionMenu(true);
      }
    }
  };

  const handleSelectPropFromList = (prop: {id: string, name: string}) => {
    const propLink = `[@${prop.name}](prop:${prop.id})`;
    const updated = newCardTitle.endsWith('@') ? newCardTitle.slice(0, -1) + propLink + ' ' : newCardTitle + ' ' + propLink + ' ';
    setNewCardTitle(updated);
    setShowPropSearch(false);
    setShowMentionMenu(false);
    setPropSearchText('');
    setPropSuggestions([]);
  };

  const handleSelectContainerFromList = (container: {id: string, name: string}) => {
    const ref = `[@${container.name}](container:${container.id})`;
    const updated = newCardTitle.endsWith('@') ? newCardTitle.slice(0, -1) + ref + ' ' : newCardTitle + ' ' + ref + ' ';
    setNewCardTitle(updated);
    setShowContainerSearch(false);
    setShowMentionMenu(false);
    setContainerSearchText('');
    setContainerSuggestions([]);
  };

  const handleSelectUserFromList = (user: any) => {
    const mention = `@${user?.name || 'user'}`;
    const updated = newCardTitle.endsWith('@') ? newCardTitle.slice(0, -1) + mention + ' ' : newCardTitle + ' ' + mention + ' ';
    setNewCardTitle(updated);
    setShowUserSearch(false);
    setShowMentionMenu(false);
    setUserSearchText('');
    setUserSuggestions([]);
  };

  const handleAddCardInternal = async () => {
    if (!newCardTitle.trim()) return;
    if (showMentionMenu || showPropSearch || showUserSearch || showContainerSearch) return;
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
            onChangeText={handleTitleChangeWithMentions}
            autoFocus={false}
          />
          {/* Mention Menu */}
          {showMentionMenu && (
            <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 6 }}>
              <Text style={{ color: '#000', fontWeight: 'bold', marginBottom: 6 }}>Mention Type</Text>
              <Pressable onPress={() => { setShowMentionMenu(false); setShowPropSearch(true); setPropSearchText(''); setPropSuggestions(allProps); }} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                <Text style={{ color: '#000' }}>Prop</Text>
              </Pressable>
              <Pressable onPress={() => { setShowMentionMenu(false); setShowContainerSearch(true); setContainerSearchText(''); setContainerSuggestions(allContainers); }} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                <Text style={{ color: '#000' }}>Box/Container</Text>
              </Pressable>
              <Pressable onPress={() => { setShowMentionMenu(false); setShowUserSearch(true); setUserSearchText(''); }} style={{ paddingVertical: 8 }}>
                <Text style={{ color: '#000' }}>User</Text>
              </Pressable>
            </View>
          )}

          {/* Prop Search */}
          {showPropSearch && (
            <View style={{ backgroundColor: '#374151', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="cube" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>Search Props:</Text>
                <Pressable onPress={closeMentionSystem} style={{ padding: 4 }}>
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </Pressable>
              </View>
              <TextInput
                style={{ backgroundColor: '#2D3748', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8 }}
                placeholder="Type to search props..."
                placeholderTextColor="#9CA3AF"
                value={propSearchText}
                onChangeText={(t) => { setPropSearchText(t); setPropSuggestions((allProps || []).filter(p => p.name.toLowerCase().includes(t.toLowerCase()))); }}
              />
              {propSuggestions.map((p) => (
                <Pressable key={p.id} onPress={() => handleSelectPropFromList(p)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: '#fff' }}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* User Search */}
          {showUserSearch && (
            <View style={{ backgroundColor: '#374151', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="person" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>Search Users:</Text>
                <Pressable onPress={closeMentionSystem} style={{ padding: 4 }}>
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </Pressable>
              </View>
              <TextInput
                style={{ backgroundColor: '#2D3748', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8 }}
                placeholder="Type to search users..."
                placeholderTextColor="#9CA3AF"
                value={userSearchText}
                onChangeText={(t) => { setUserSearchText(t); /* setUserSuggestions(...) when available */ }}
              />
              {userSuggestions.map((u, idx) => (
                <Pressable key={idx.toString()} onPress={() => handleSelectUserFromList(u)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: '#fff' }}>{u?.name || 'User'}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Container Search */}
          {showContainerSearch && (
            <View style={{ backgroundColor: '#374151', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="archive" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>Search Containers:</Text>
                <Pressable onPress={closeMentionSystem} style={{ padding: 4 }}>
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </Pressable>
              </View>
              <TextInput
                style={{ backgroundColor: '#2D3748', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8 }}
                placeholder="Type to search containers..."
                placeholderTextColor="#9CA3AF"
                value={containerSearchText}
                onChangeText={(t) => { setContainerSearchText(t); setContainerSuggestions((allContainers || []).filter(c => c.name.toLowerCase().includes(t.toLowerCase()))); }}
              />
              {containerSuggestions.map((c) => (
                <Pressable key={c.id} onPress={() => handleSelectContainerFromList(c)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: '#fff' }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
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
