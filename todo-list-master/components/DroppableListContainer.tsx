import React, { useState, forwardRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { useDroppable } from '@dnd-kit/core';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

// Interface for List Data (ensure this matches the structure used in BoardScreen)
interface ListData {
  id: string;
  name: string;
  order: number;
}

// Props for the DroppableListContainer
interface DroppableListContainerProps {
    list: ListData;
    children: React.ReactNode;
    onDeleteList: (listId: string) => void;
    onUpdateListTitle: (listId: string, newTitle: string) => void;
}

// The DroppableListContainer component
const DroppableListContainer = forwardRef<
  View,
  DroppableListContainerProps
>(({ list, children, onDeleteList, onUpdateListTitle }, ref) => {
  const scheme = useColorScheme();
  const colorScheme: keyof typeof Colors = (scheme === 'dark' || scheme === 'light') ? scheme : 'light';
  const colors = Colors[colorScheme];

  const { setNodeRef } = useDroppable({ id: list.id });

  // State for editing list title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedListTitle, setEditedListTitle] = useState(list.name);

  // Update edited title if list.name prop changes from Firestore update
  useEffect(() => {
      if (!isEditingTitle) {
          setEditedListTitle(list.name);
      }
  }, [list.name, isEditingTitle]);

  const combinedRef = (node: View | null) => {
    setNodeRef(node as any); // Cast to any might be necessary depending on types
    if (typeof ref === 'function') { ref(node); } else if (ref) { ref.current = node; }
  };

  const handleDeletePress = () => {
    console.log(`[DroppableListContainer] Delete button pressed for list: ${list.id}`);
    onDeleteList(list.id);
  }

  const handleEditListTitlePress = () => {
    console.log(`[DroppableListContainer] Edit title press for list ${list.id}`);
    setEditedListTitle(list.name); // Reset to current name on edit start
    setIsEditingTitle(true);
  };

  const handleSaveListTitle = () => {
    const trimmedTitle = editedListTitle.trim();
    if (trimmedTitle && trimmedTitle !== list.name) {
        console.log(`[DroppableListContainer] Saving title for list ${list.id}: "${trimmedTitle}"`);
        onUpdateListTitle(list.id, trimmedTitle);
    } else {
        console.log(`[DroppableListContainer] List title unchanged or empty for ${list.id}, reverting.`);
        setEditedListTitle(list.name);
    }
    setIsEditingTitle(false);
  };

  return (
    <View ref={combinedRef} style={[styles.listContainer, { backgroundColor: colors.backgroundList }]}>
      <View style={styles.listHeader}>
          {isEditingTitle ? (
            <TextInput
                style={[styles.listTitleInput, { color: colors.text, borderBottomColor: colors.border }]}
                value={editedListTitle}
                onChangeText={setEditedListTitle}
                onBlur={handleSaveListTitle}
                onSubmitEditing={handleSaveListTitle}
                autoFocus={true}
                selectTextOnFocus={true}
                placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Pressable onPress={handleEditListTitlePress} style={styles.listTitlePressable}>
                 <Text style={[styles.listTitle, { color: colors.text }]}>{list.name}</Text>
            </Pressable>
          )}
          <Pressable onPress={handleDeletePress} style={styles.deleteListButton}>
             <Text style={[styles.deleteListButtonText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
      </View>
      {children}
    </View>
  );
});

// Export the component for use elsewhere
export default DroppableListContainer;

// Styles specific to the DroppableListContainer
const styles = StyleSheet.create({
  listContainer: {
    borderRadius: 6,
    padding: 10,
    marginHorizontal: 5,
    width: 270,
    minHeight: 60,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      minHeight: 30,
  },
  listTitlePressable: {
    flex: 1,
    marginRight: 5,
    paddingVertical: 3,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listTitleInput: {
      flex: 1,
      marginRight: 5,
      fontSize: 16,
      fontWeight: 'bold',
      borderBottomWidth: 1,
      paddingVertical: 3,
      paddingHorizontal: 2,
  },
  deleteListButton: {
      padding: 3,
      marginLeft: 5,
  },
  deleteListButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
  },
}); 