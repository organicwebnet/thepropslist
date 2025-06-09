import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    FlatList,
    TouchableOpacity,
    Alert,
    ScrollView
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../theme.ts';
import { Ionicons } from '@expo/vector-icons';
import type { MemberData } from '../../shared/types/taskManager.ts';
import { v4 as uuidv4 } from 'uuid'; // For generating temporary IDs

interface MemberPickerProps {
    isVisible: boolean;
    allUsers: MemberData[];
    selectedMembers: MemberData[];
    onClose: () => void;
    onSave: (newSelectedMembers: MemberData[]) => void;
    onNewMemberCreated: (newMember: MemberData) => void;
}

const MemberPicker: React.FC<MemberPickerProps> = ({
    isVisible,
    allUsers,
    selectedMembers,
    onClose,
    onSave,
    onNewMemberCreated,
}) => {
    const { theme: themeName } = useTheme();
    const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

    const [currentSelected, setCurrentSelected] = useState<MemberData[]>([]);
    const [displayableUsers, setDisplayableUsers] = useState<MemberData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberInitials, setNewMemberInitials] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [showAddMemberForm, setShowAddMemberForm] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Initialize with allUsers, ensuring upstream changes are reflected.
            // Consider a more robust merging strategy if allUsers can change frequently
            // while the picker is open and has locally added (but unsaved) new members.
            setDisplayableUsers(allUsers || []);
            setCurrentSelected(selectedMembers || []);
            setSearchTerm(''); // Reset search term when modal opens
            // Keep add member form state unless explicitly closed
        } else {
            // Reset form when modal is closed, if desired
            // setShowAddMemberForm(false);
            // setNewMemberName('');
            // setNewMemberInitials('');
            setNewMemberEmail('');
        }
    }, [isVisible, allUsers, selectedMembers]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) {
            return displayableUsers;
        }
        return displayableUsers.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.avatarInitials && user.avatarInitials.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm, displayableUsers]);

    const toggleUserSelection = (user: MemberData) => {
        setCurrentSelected(prevSelected => {
            const isAlreadySelected = prevSelected.find(u => u.id === user.id);
            if (isAlreadySelected) {
                return prevSelected.filter(u => u.id !== user.id);
            } else {
                return [...prevSelected, user];
            }
        });
    };

    const handleAddNewMember = () => {
        if (!newMemberName.trim()) {
            Alert.alert("Validation Error", "Member name cannot be empty.");
            return;
        }
        const trimmedEmail = newMemberEmail.trim();
        if (!trimmedEmail) {
            Alert.alert("Validation Error", "Member email cannot be empty.");
            return;
        }
        // Basic email validation (does not cover all edge cases)
        if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
            Alert.alert("Validation Error", "Please enter a valid email address.");
            return;
        }

        const newMember: MemberData = {
            id: uuidv4(), // Generate a temporary unique ID
            name: newMemberName.trim(),
            email: trimmedEmail,
            avatarInitials: newMemberInitials.trim() || undefined,
        };

        onNewMemberCreated(newMember); // Inform parent component

        // Add to current displayable list and select it
        setDisplayableUsers(prevUsers => [...prevUsers, newMember]);
        setCurrentSelected(prevSelected => [...prevSelected, newMember]);

        // Reset form
        setNewMemberName('');
        setNewMemberInitials('');
        setNewMemberEmail('');
        setShowAddMemberForm(false);
    };

    const handleSave = () => {
        onSave(currentSelected);
        onClose(); // Typically save implies closing
        setNewMemberName('');
        setNewMemberInitials('');
        setNewMemberEmail('');
    };

    const handleClose = () => {
        // Reset internal state before closing if changes shouldn't persist
        // For example, if `allUsers` prop is the single source of truth when reopening
        setCurrentSelected(selectedMembers); // Revert to original selections
        setSearchTerm('');
        setShowAddMemberForm(false);
        setNewMemberName('');
        setNewMemberInitials('');
        setNewMemberEmail('');
        onClose();
    }

    const renderUserItem = ({ item }: { item: MemberData }) => {
        const isSelected = currentSelected.find(u => u.id === item.id);
        return (
            <TouchableOpacity onPress={() => toggleUserSelection(item)} style={styles.userItem}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.avatarInitials || item.name.substring(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.userName}>{item.name}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color={currentThemeColors.primary} />}
            </TouchableOpacity>
        );
    };

    const styles = StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: currentThemeColors.modalOverlay,
            justifyContent: 'center',
            alignItems: 'center',
        },
        panel: {
            width: '90%',
            maxHeight: '85%',
            backgroundColor: currentThemeColors.modalBackground,
            borderRadius: 10,
            padding: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: currentThemeColors.border,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: currentThemeColors.text,
        },
        searchSection: {
            marginBottom: 10,
        },
        input: {
            height: 45,
            borderColor: currentThemeColors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            marginBottom: 10,
            color: currentThemeColors.text,
            backgroundColor: currentThemeColors.inputBackground,
            fontSize: 16,
        },
        userListContainer: {
             maxHeight: 250, // Adjust as needed
        },
        userItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: currentThemeColors.border,
        },
        avatarPlaceholder: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: currentThemeColors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        avatarText: {
            color: currentThemeColors.card,
            fontWeight: 'bold',
            fontSize: 16,
        },
        userName: {
            flex: 1,
            fontSize: 16,
            color: currentThemeColors.text,
        },
        addMemberSection: {
            marginTop: 15,
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: currentThemeColors.border,
        },
        addMemberTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: currentThemeColors.text,
            marginBottom: 10,
        },
        formButton: {
            backgroundColor: currentThemeColors.primary,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 5,
        },
        formButtonText: {
            color: currentThemeColors.card || '#FFFFFF',
            fontWeight: 'bold',
            fontSize: 16,
        },
        toggleAddFormButton: {
            backgroundColor: currentThemeColors.card,
             paddingVertical: 10,
            paddingHorizontal: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 10,
            borderWidth: 1,
            borderColor: currentThemeColors.border,
        },
        toggleAddFormButtonText: {
             color: currentThemeColors.text,
             fontWeight: 'bold',
        },
        actionsFooter: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: currentThemeColors.border,
        },
        footerButton: {
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center',
            flex: 1,
        },
        saveButton: {
            backgroundColor: currentThemeColors.primary,
            marginRight: 5,
        },
        cancelButton: {
            backgroundColor: currentThemeColors.card,
            marginLeft: 5,
            borderWidth: 1,
            borderColor: currentThemeColors.border,
        },
        buttonTextPrimary: {
            color: currentThemeColors.card || '#FFFFFF',
            fontWeight: 'bold',
        },
        buttonTextSecondary: {
            color: currentThemeColors.text,
            fontWeight: 'bold',
        }
    });

    if (!isVisible) return null;

    return (
        <Modal
            transparent={true}
            visible={isVisible}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Assign Members</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={28} color={currentThemeColors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchSection}>
                        <TextInput
                            style={styles.input}
                            placeholder="Search members..."
                            placeholderTextColor={currentThemeColors.placeholder}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>
                    
                    <View style={styles.userListContainer}>
                        <FlatList
                            data={filteredUsers}
                            renderItem={renderUserItem}
                            keyExtractor={(item) => item.id}
                            ListEmptyComponent={<Text style={{color: currentThemeColors.textSecondary, textAlign: 'center', marginVertical: 10}}>No members found.</Text>}
                        />
                    </View>

                    <View style={styles.addMemberSection}>
                        {!showAddMemberForm ? (
                            <TouchableOpacity onPress={() => setShowAddMemberForm(true)} style={styles.toggleAddFormButton}>
                                <Text style={styles.toggleAddFormButtonText}>+ Add New Member</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <Text style={styles.addMemberTitle}>Define New Member</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Member's Full Name"
                                    placeholderTextColor={currentThemeColors.placeholder}
                                    value={newMemberName}
                                    onChangeText={setNewMemberName}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Member's Email"
                                    placeholderTextColor={currentThemeColors.placeholder}
                                    value={newMemberEmail}
                                    onChangeText={setNewMemberEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Avatar Initials (e.g., JD)"
                                    placeholderTextColor={currentThemeColors.placeholder}
                                    value={newMemberInitials}
                                    onChangeText={setNewMemberInitials}
                                    maxLength={3} // Optional: limit initials length
                                />
                                <TouchableOpacity onPress={handleAddNewMember} style={styles.formButton}>
                                    <Text style={styles.formButtonText}>Add and Assign Member</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowAddMemberForm(false)} style={[styles.formButton, {backgroundColor: currentThemeColors.card, marginTop: 8, borderWidth: 1, borderColor: currentThemeColors.border}]}>
                                   <Text style={[styles.formButtonText, {color: currentThemeColors.text}]}>Cancel Add</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <View style={styles.actionsFooter}>
                        <TouchableOpacity onPress={handleClose} style={[styles.footerButton, styles.cancelButton]}>
                            <Text style={styles.buttonTextSecondary}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={[styles.footerButton, styles.saveButton]}>
                            <Text style={styles.buttonTextPrimary}>Save Members</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default MemberPicker; 