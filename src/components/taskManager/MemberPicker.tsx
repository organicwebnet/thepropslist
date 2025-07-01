import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MemberData } from '../../shared/types/taskManager.ts'; // CHANGED to .ts
import { useTheme } from '../../contexts/ThemeContext.tsx'; // CHANGED extension to .tsx
import { lightTheme, darkTheme } from '../../styles/theme.ts'; // CHANGED to .ts

interface MemberPickerProps {
  isVisible: boolean;
  allUsers: MemberData[]; // CHANGED from allAvailableMembers
  cardCurrentMembers: MemberData[];
  onClose: () => void;
  onSaveMembers: (updatedMembers: MemberData[]) => void;
  // Potentially a callback for when a new member is created if that's handled within this picker
  // onNewMemberCreated?: (newMember: MemberData) => void; 
}

const MemberPicker: React.FC<MemberPickerProps> = ({
  isVisible,
  allUsers, // CHANGED from allAvailableMembers
  cardCurrentMembers,
  onClose,
  onSaveMembers,
}) => {
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

  const [searchText, setSearchText] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<MemberData[]>([]);

  useEffect(() => {
    // Initialize selectedMembers based on cardCurrentMembers when the component/modal becomes visible
    // or when cardCurrentMembers prop changes.
    if (isVisible) {
      setSelectedMembers([...cardCurrentMembers]);
    }
  }, [cardCurrentMembers, isVisible]);

  const handleToggleMemberSelection = (member: MemberData) => {
    setSelectedMembers(prevSelected => {
      const isAlreadySelected = prevSelected.find(m => m.id === member.id);
      if (isAlreadySelected) {
        return prevSelected.filter(m => m.id !== member.id);
      } else {
        return [...prevSelected, member];
      }
    });
  };

  const filteredMembers = allUsers.filter(member => // CHANGED from allAvailableMembers
    member.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSave = () => {
    onSaveMembers(selectedMembers);
    onClose(); // Close picker after saving
  };

  const renderMemberItem = ({ item }: { item: MemberData }) => {
    const isSelected = selectedMembers.find(m => m.id === item.id);
    return (
      <Pressable
        style={[
          styles.memberItem,
          { backgroundColor: currentThemeColors.listBackground },
          isSelected && { backgroundColor: currentThemeColors.primary }
        ]}
        onPress={() => handleToggleMemberSelection(item)}
      >
        <Text style={[styles.memberName, { color: currentThemeColors.text }]}>
          {item.name + (item.avatarInitials ? " (" + item.avatarInitials + ")" : '')} 
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={currentThemeColors.primary} />
        )}
      </Pressable>
    );
  };
  
  // Placeholder for adding a new member UI/functionality
  const handleAddNewMember = () => {
    // This would likely open another modal or inline form
    // TODO: Implement add new member functionality
    // If a new member is created, it should be added to allUsers
    // and potentially selected. This might involve a callback to the parent.
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: currentThemeColors.background,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      height: '80%', // Take up most of the screen
      backgroundColor: currentThemeColors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: currentThemeColors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: currentThemeColors.text,
    },
    searchInput: {
      height: 45,
      backgroundColor: currentThemeColors.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 15,
      fontSize: 16,
      color: currentThemeColors.text,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
      marginVertical: 15,
    },
    memberListContainer: {
      flex: 1, // Allows FlatList to scroll
    },
    memberItem: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: currentThemeColors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 6,
      marginBottom: 5,
    },
    memberName: {
      fontSize: 16,
    },
    noResultsText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: currentThemeColors.textSecondary,
    },
    addNewMemberButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      backgroundColor: currentThemeColors.listBackground, // Similar to member item
      borderRadius: 6,
      marginTop: 10, // Space above the button
      borderWidth: 1,
      borderColor: currentThemeColors.primary, // Use primary color for border to make it stand out
    },
    addNewMemberButtonText: {
      marginLeft: 10,
      fontSize: 16,
      color: currentThemeColors.primary, // Use primary color for text
      fontWeight: 'bold',
    },
    footerContainer: {
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: currentThemeColors.border,
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    actionButton: {
      backgroundColor: currentThemeColors.primary,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      color: currentThemeColors.card,
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButton: {
      backgroundColor: currentThemeColors.card,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },
    cancelButtonText: {
      color: currentThemeColors.text, // Text color for cancel might differ
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Assign Members</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close-circle-outline" size={28} color={currentThemeColors.textSecondary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
              placeholderTextColor={currentThemeColors.placeholder}
              value={searchText}
              onChangeText={setSearchText}
            />

            {/* "Add New Member" Button - Placeholder */}
            <Pressable style={styles.addNewMemberButton} onPress={handleAddNewMember}>
                <Ionicons name="person-add-outline" size={22} color={currentThemeColors.primary} />
                <Text style={styles.addNewMemberButtonText}>Add New Member</Text>
            </Pressable>

            <View style={styles.memberListContainer}>
              <FlatList
                data={filteredMembers}
                renderItem={renderMemberItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                  <Text style={styles.noResultsText}>
                    {allUsers.length === 0 ? "No members available." : "No members found."} {/* CHANGED from allAvailableMembers */}
                  </Text>
                }
              />
            </View>

            <View style={styles.footerContainer}>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={handleSave}>
                <Text style={styles.actionButtonText}>Save</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default MemberPicker;    
