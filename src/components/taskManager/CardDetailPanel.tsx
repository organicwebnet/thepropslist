import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    Platform,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Linking,
    Modal
} from 'react-native';

// import Colors from '../constants/Colors'; // OLD
import { useTheme } from '../../contexts/ThemeContext.tsx'; // NEW
import { lightTheme, darkTheme } from '../../theme.ts'; // Import theme objects

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
// import { Timestamp } from 'firebase/firestore'; // OLD - use string/CustomTimestamp
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // Uncommented
import { Picker } from '@react-native-picker/picker';

// WYSIWYG and HTML rendering commented out for now
// import Editor from 'react-simple-wysiwyg';
// import RenderHTML from 'react-native-render-html';

// Type Definitions (ensure consistency with other components)
interface CustomTimestamp { // Ensure this matches project-wide definition
    toDate: () => Date;
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
    linkUrl?: string;
    createdAt?: string | CustomTimestamp;
}

interface ListData { // From original, ensure it matches your main ListData type
  id: string;
  name: string;
  order: number;
}

// Props for the Panel
interface CardDetailPanelProps {
    isVisible: boolean;
    card: CardData | null;
    lists: ListData[]; // To populate the move-to-list picker
    onClose: () => void;
    onUpdateCard: (cardId: string, listId: string, updates: Partial<CardData>) => Promise<void>; // Consolidated update
    onMoveCard: (cardId: string, originalListId: string, targetListId: string) => Promise<void>;
    onDeleteCard: (listId: string, cardId: string) => Promise<void>; // Make async
    // onUploadImage: (cardId: string, localUri: string) => Promise<string | null>; // For later
}

const parseDate = (dateValue: string | CustomTimestamp | undefined | null): Date | null => {
    if (!dateValue) return null;
    if (typeof dateValue === 'string') return new Date(dateValue);
    if (dateValue && typeof (dateValue as CustomTimestamp).toDate === 'function') {
        return (dateValue as CustomTimestamp).toDate();
    }
    return null;
};

const CardDetailPanel: React.FC<CardDetailPanelProps> = ({
    isVisible,
    card,
    lists,
    onClose,
    onUpdateCard,
    onMoveCard,
    onDeleteCard,
    // onUploadImage // For later
}) => {
    const { theme: themeName } = useTheme();
    const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors; // Select colors object

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedListIdToMove, setSelectedListIdToMove] = useState<string>('');
    const [editedLinkUrl, setEditedLinkUrl] = useState<string>('');
    const [editedImageUri, setEditedImageUri] = useState<string | null | undefined>(undefined); // To track picked/removed image. `undefined` means no change yet.
    const [isImageUploading, setIsImageUploading] = useState(false); // For UI feedback, though actual upload is parent's task

    const resetLocalState = (currentCard: CardData | null) => {
        if (currentCard) {
            setEditedTitle(currentCard.title || '');
            setEditedDescription(currentCard.description || '');
            setSelectedDueDate(parseDate(currentCard.dueDate));
            setEditedImageUri(currentCard.imageUrl); // Initialize with current imageUrl
            setSelectedListIdToMove(currentCard.listId);
            setEditedLinkUrl(currentCard.linkUrl || '');
        } else {
            setEditedImageUri(null); // For a new card scenario if ever used
        }
    };

    useEffect(() => {
        resetLocalState(card);
        if (isVisible) {
            setIsEditing(card ? false : true); // If card exists, start in view mode.
        } else {
            setIsEditing(false);
        }
    }, [card, isVisible]);

    const pickImage = async () => {
        // Request media library permissions
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You need to allow access to your photos to attach an image.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8, // Reduce quality slightly for faster uploads
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setEditedImageUri(result.assets[0].uri);
            if(!isEditing) setIsEditing(true); // Enter edit mode if image changed
        }
    };

    const handleRemoveImage = () => {
        setEditedImageUri(null); // Set to null to signify removal
        if(!isEditing) setIsEditing(true); // Enter edit mode if image changed
    };

    const handleSave = async () => {
        if (!card) return;
        //setIsImageUploading(true); // Indicate start, parent will handle actual upload

        const updates: Partial<CardData> = {};
        const trimmedTitle = editedTitle.trim();
        if (trimmedTitle && trimmedTitle !== card.title) updates.title = trimmedTitle;
        if (editedDescription !== (card.description || '')) updates.description = editedDescription;
        const trimmedLinkUrl = editedLinkUrl.trim();
        if (trimmedLinkUrl !== (card.linkUrl || '')) {
             if (trimmedLinkUrl && !trimmedLinkUrl.startsWith('http://') && !trimmedLinkUrl.startsWith('https://')){
                Alert.alert("Invalid Link", "Please enter a valid URL starting with http:// or https://");
                return;
             }
             updates.linkUrl = trimmedLinkUrl || undefined;
        }
        const originalDueDate = parseDate(card.dueDate)?.getTime();
        const newDueDate = selectedDueDate?.getTime();
        if (originalDueDate !== newDueDate) {
            updates.dueDate = selectedDueDate ? selectedDueDate.toISOString() : null;
        }

        // Handle image update
        if (editedImageUri !== card.imageUrl) { // If it has changed from original
            updates.imageUrl = editedImageUri === null ? undefined : editedImageUri; // Ensure undefined if null
        }
        
        let listMoved = false;
        if (selectedListIdToMove && selectedListIdToMove !== card.listId && selectedListIdToMove !== '__DELETE__') {
            try {
                await onMoveCard(card.id, card.listId, selectedListIdToMove);
                listMoved = true;
            } catch (error) { console.error("Error moving card:", error); Alert.alert("Error", "Could not move card."); return; }
        }

        // Check if there are any updates to save, including a change in imageUrl
        const hasFieldUpdates = Object.keys(updates).some(key => key !== 'imageUrl');
        const imageChanged = updates.imageUrl !== undefined && updates.imageUrl !== card.imageUrl;

        if ((hasFieldUpdates || imageChanged) && !listMoved) {
            try {
                // If only imageUrl changed to undefined (removed) and it was already undefined/null, no need to update.
                // However, the current check `updates.imageUrl !== card.imageUrl` handles this.
                await onUpdateCard(card.id, card.listId, updates);
            } catch (error) { console.error("Error updating card:", error); Alert.alert("Error", "Could not update card details."); return; }
        }
        
        //setIsImageUploading(false);
        setIsEditing(false);
        if(listMoved) onClose();
    };

    const handleDelete = async () => {
        if (!card) return;
        Alert.alert(
            "Delete Card",
            `Are you sure you want to delete "${card.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        try {
                            await onDeleteCard(card.listId, card.id);
                            onClose(); // Close panel after deletion
                        } catch (error) {
                            console.error("Error deleting card:", error);
                            Alert.alert("Error", "Could not delete card.");
                        }
                    }
                }
            ]
        );
    };

    const onDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (newDate) {
            setSelectedDueDate(newDate);
            if (!isEditing) setIsEditing(true); // Auto-enter edit mode if date is changed
        }
    };

    const styles = StyleSheet.create({
        overlay: { flex: 1, backgroundColor: currentThemeColors.modalOverlay, justifyContent: 'center', alignItems: 'center' },
        panel: { width: '90%', maxHeight: '85%', backgroundColor: currentThemeColors.modalBackground, borderRadius: 10, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
        titleInput: { fontSize: 20, fontWeight: 'bold', color: currentThemeColors.text, flex: 1, borderWidth: isEditing ? 1 : 0, borderColor: isEditing ? currentThemeColors.border : 'transparent', padding: isEditing ? 8 : 0, borderRadius: 4 },
        titleText: { fontSize: 20, fontWeight: 'bold', color: currentThemeColors.text, flex: 1 },
        closeButton: { padding: 5 },
        contentScrollView: { marginBottom: 15 },
        section: { marginBottom: 15 },
        label: { fontSize: 14, color: currentThemeColors.textSecondary, marginBottom: 5 },
        descriptionInput: { minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: currentThemeColors.border, padding: 10, borderRadius: 4, color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBackground },
        descriptionText: { fontSize: 15, color: currentThemeColors.text, lineHeight: 22 },
        datePickerButton: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: currentThemeColors.inputBackground, borderRadius: 4, borderWidth:1, borderColor: currentThemeColors.border, marginBottom:10 },
        dateText: { fontSize: 15, color: currentThemeColors.text },
        removeDateButton: { alignSelf: 'flex-start', marginTop: 5 },
        removeDateText: { color: currentThemeColors.error },
        picker: { backgroundColor: currentThemeColors.inputBackground, color: currentThemeColors.text, borderRadius: 4, borderWidth: 1, borderColor: currentThemeColors.border, marginBottom:10 },
        pickerItem: { color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBackground }, // Note: Picker styling is limited on iOS
        linkInput: { borderWidth: 1, borderColor: currentThemeColors.border, padding: 10, borderRadius: 4, color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBackground },
        linkText: { color: currentThemeColors.primary, textDecorationLine: 'underline' },
        actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, borderTopWidth: 1, borderTopColor: currentThemeColors.border, paddingTop: 15 },
        editButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.primary, borderRadius: 4 },
        saveButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.primary, borderRadius: 4 },
        cancelButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.textSecondary, borderRadius: 4 },
        buttonText: { color: '#FFFFFF', fontWeight: 'bold' },
        deleteButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.error, borderRadius: 4 },
        imagePreview: { width: '100%', height: 200, borderRadius: 6, marginBottom: 10, backgroundColor: currentThemeColors.border },
        imageButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
        imageButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.primary, borderRadius: 4, marginHorizontal: 5 },
        removeImageButton: { backgroundColor: currentThemeColors.error },
        uploadingIndicator: { marginVertical: 10 }
    });

    if (!card) return null; // Don't render if no card is selected

    return (
        <Modal
            transparent={true}
            visible={isVisible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.panel}>
                    <View style={styles.header}>
                        {isEditing ? (
                            <TextInput
                                style={styles.titleInput}
                                value={editedTitle}
                                onChangeText={setEditedTitle}
                                placeholder="Card Title"
                                placeholderTextColor={currentThemeColors.placeholder}
                            />
                        ) : (
                            <Text style={styles.titleText}>{card.title}</Text>
                        )}
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close-circle-outline" size={28} color={currentThemeColors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.contentScrollView}>
                        {/* Image Section */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Image</Text>
                            {(editedImageUri || card.imageUrl) && !isEditing && (
                                <Image source={{ uri: editedImageUri || card.imageUrl }} style={styles.imagePreview} resizeMode="cover"/>
                            )}
                            {isEditing && editedImageUri && (
                                 <Image source={{ uri: editedImageUri }} style={styles.imagePreview} resizeMode="cover"/>
                            )}
                            {isEditing && !editedImageUri && (
                                <View style={[styles.imagePreview, {justifyContent:'center', alignItems:'center'}]}><Text style={{color: currentThemeColors.textSecondary}}>No Image</Text></View>
                            )}
                            {isEditing && (
                                <View style={styles.imageButtonsContainer}>
                                    <Pressable onPress={pickImage} style={styles.imageButton}><Text style={styles.buttonText}>Pick Image</Text></Pressable>
                                    {editedImageUri && (
                                        <Pressable onPress={handleRemoveImage} style={[styles.imageButton, styles.removeImageButton]}><Text style={styles.buttonText}>Remove</Text></Pressable>
                                    )}
                                </View>
                            )}
                            {isImageUploading && <ActivityIndicator size="large" color={currentThemeColors.primary} style={styles.uploadingIndicator} />}
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Description</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.descriptionInput}
                                    value={editedDescription}
                                    onChangeText={setEditedDescription}
                                    multiline
                                    placeholder="Add a description..."
                                    placeholderTextColor={currentThemeColors.placeholder}
                                />
                            ) : (
                                <Text style={styles.descriptionText}>{card.description || "No description."}</Text>
                                // RenderHTML would go here if used
                            )}
                        </View>

                        {/* Due Date */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Due Date</Text>
                            <Pressable onPress={() => isEditing && setShowDatePicker(true)} style={styles.datePickerButton} disabled={!isEditing}>
                                <Text style={styles.dateText}>{selectedDueDate ? selectedDueDate.toLocaleDateString() : 'Set Due Date'}</Text>
                            </Pressable>
                            {isEditing && selectedDueDate && (
                                <Pressable onPress={() => setSelectedDueDate(null)} style={styles.removeDateButton}>
                                    <Text style={styles.removeDateText}>Remove Due Date</Text>
                                </Pressable>
                            )}
                            {showDatePicker && (
                                <DateTimePicker
                                    value={selectedDueDate || new Date()} // Default to now if null
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                />
                            )}
                        </View>
                        
                        {/* Link URL */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Link URL</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.linkInput}
                                    value={editedLinkUrl}
                                    onChangeText={setEditedLinkUrl}
                                    placeholder="https://example.com"
                                    keyboardType="url"
                                    autoCapitalize="none"
                                    placeholderTextColor={currentThemeColors.placeholder}
                                />
                            ) : card.linkUrl ? (
                                <Pressable onPress={() => Linking.openURL(card.linkUrl!)}>
                                    <Text style={styles.linkText}>{card.linkUrl}</Text>
                                </Pressable>
                            ) : (
                                <Text style={styles.descriptionText}>No link attached.</Text>
                            )}
                        </View>

                        {/* Move List Picker (only in edit mode) */}
                        {isEditing && (
                            <View style={styles.section}>
                                <Text style={styles.label}>Move to List</Text>
                                <Picker
                                    selectedValue={selectedListIdToMove}
                                    onValueChange={(itemValue) => setSelectedListIdToMove(itemValue as string)}
                                    style={styles.picker}
                                    itemStyle={styles.pickerItem} // Only works on iOS for individual items
                                    dropdownIconColor={currentThemeColors.text}
                                >
                                    {lists.map(list => (
                                        <Picker.Item key={list.id} label={list.name} value={list.id} color={Platform.OS === 'android' ? currentThemeColors.text : undefined}/>
                                    ))}
                                    {/* Option to delete card by moving to a pseudo-list - handled by handleSave */}
                                    {/* <Picker.Item label="--- DELETE CARD --- " value="__DELETE__" color={currentColors.error} /> */}
                                </Picker>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.actionsRow}>
                        {isEditing ? (
                            <View style={{flexDirection:'row', justifyContent: 'space-between', flex:1}}>
                                <Pressable onPress={handleSave} style={styles.saveButton}><Text style={styles.buttonText}>Save</Text></Pressable>
                                <Pressable onPress={() => { setIsEditing(false); resetLocalState(card); }} style={styles.cancelButton}><Text style={styles.buttonText}>Cancel</Text></Pressable>
                            </View>
                        ) : (
                            <Pressable onPress={() => { setIsEditing(true); resetLocalState(card); /* Ensure state is fresh for editing */ }} style={styles.editButton}><Text style={styles.buttonText}>Edit</Text></Pressable>
                        )}
                        <Pressable onPress={handleDelete} style={[styles.deleteButton, {marginLeft: isEditing? 0: 10}]}><Text style={styles.buttonText}>Delete</Text></Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default CardDetailPanel; 