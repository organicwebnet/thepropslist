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
    useWindowDimensions,
} from 'react-native';
import Colors from '../constants/Colors';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import Editor from 'react-simple-wysiwyg';
import RenderHTML from 'react-native-render-html';

// Interface for Card Data (should match BoardScreen)
interface CardData {
    id: string;
    title: string;
    order: number;
    listId: string;
    boardId: string;
    description?: string;
    dueDate?: Timestamp;
    imageUrl?: string;
    linkUrl?: string;
    createdAt?: any;
}

// Color theme type
type ColorTheme = typeof Colors.light;

// Props for the Panel
interface CardDetailPanelProps {
    card: CardData | null;
    colors: ColorTheme;
    lists: ListData[];
    onClose: () => void;
    onUpdateTitle: (listId: string, cardId: string, newTitle: string) => void;
    onUpdateDescription: (listId: string, cardId: string, newDescription: string) => void;
    onUpdateDueDate: (listId: string, cardId: string, newDueDate: Timestamp | null) => void;
    onUpdateImage: (listId: string, cardId: string, imageUri: string | null) => Promise<void>;
    onUpdateLinkUrl: (listId: string, cardId: string, newLinkUrl: string | null) => Promise<void>;
    onMoveCard: (cardId: string, originalListId: string, targetListId: string | '__DONE__') => Promise<void>;
    onDeleteCard: (listId: string, cardId: string) => void;
}

// <<< Also add ListData interface if not already present >>>
interface ListData {
  id: string;
  name: string;
  order: number;
}

// <<< tagsStyles definition moved outside component, depends only on Colors >>>
const createTagsStyles = (colors: ColorTheme) => ({
    body: {
        color: colors.text, 
        fontSize: 15, 
    },
    a: {
        color: colors.primary,
        textDecorationLine: 'underline' as const,
    },
    p: { marginVertical: 5 },
    li: { marginVertical: 2 },
    // Add more styles as needed
});

const CardDetailPanel: React.FC<CardDetailPanelProps> = ({
    card,
    colors,
    lists,
    onClose,
    onUpdateTitle,
    onUpdateDescription,
    onUpdateDueDate,
    onUpdateImage,
    onUpdateLinkUrl,
    onMoveCard,
    onDeleteCard,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [countdownString, setCountdownString] = useState<string>('');
    const [selectedListId, setSelectedListId] = useState<string | '__DELETE__'>('');
    const [editedLinkUrl, setEditedLinkUrl] = useState<string>('');
    const { width } = useWindowDimensions();

    // Log state on re-render for debugging
    console.log(`[CardDetailPanel Render] isEditing=${isEditing}, showDatePicker=${showDatePicker}, cardId=${card?.id}`);

    const resetLocalState = () => {
        if (card) {
            setEditedTitle(card.title || '');
            setEditedDescription(card.description || '');
            setSelectedDueDate(card.dueDate ? card.dueDate.toDate() : null);
            setImageUri(card.imageUrl || null);
            setSelectedListId(card.listId);
            setEditedLinkUrl(card.linkUrl || '');
        }
    };

    useEffect(() => {
        resetLocalState();
        setIsEditing(false);
    }, [card]);

    const handleEditPress = () => {
        resetLocalState();
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        resetLocalState();
        setIsEditing(false);
    };

    const handleSave = async () => {
        console.log("[handleSave] Starting save process...");
        if (!card) {
            console.error("[handleSave] Aborting: No card data.");
            return;
        }
        let changesMade = false;
        let shouldExitEditMode = true; 

        // --- Handle Move/Delete FIRST --- 
        console.log(`[handleSave] Checking move/delete. Current list: ${card.listId}, Selected: ${selectedListId}`);
        if (selectedListId && selectedListId !== card.listId) {
            if (selectedListId === '__DELETE__') {
                console.log("[handleSave] Delete action triggered.");
                onDeleteCard(card.listId, card.id); 
                shouldExitEditMode = false; 
                console.log("[handleSave] Exiting early for delete.");
                return; 
            } else {
                console.log(`[handleSave] Move action triggered: Target=${selectedListId}`);
                try {
                    await onMoveCard(card.id, card.listId, selectedListId);
                    console.log("[handleSave] onMoveCard successful.");
                    changesMade = true;
                    onClose(); 
                    console.log("[handleSave] Exiting early after successful move.");
                    return; 
                } catch (error) {
                    console.error("[handleSave] onMoveCard failed:", error);
                    shouldExitEditMode = false; 
                    console.log("[handleSave] Exiting early due to move error.");
                    return;
                }
            }
        }

        // --- Save Title, Link, DueDate, Image, Description --- 
        try {
            // Title
            console.log(`[handleSave] Checking Title. Original: "${card.title}", Edited: "${editedTitle}"`);
            const trimmedTitle = editedTitle.trim();
            if (trimmedTitle && trimmedTitle !== (card.title || '')) {
                console.log("[handleSave] Calling onUpdateTitle...");
                await onUpdateTitle(card.listId, card.id, trimmedTitle);
                console.log("[handleSave] onUpdateTitle finished.");
                changesMade = true;
            }

            // Link URL
            console.log(`[handleSave] Checking Link URL. Original: "${card.linkUrl}", Edited: "${editedLinkUrl}"`);
            const trimmedLinkUrl = editedLinkUrl.trim();
            if (trimmedLinkUrl !== (card.linkUrl || '')) {
                let urlToSave: string | null = null;
                if (trimmedLinkUrl) {
                    if (!trimmedLinkUrl.startsWith('http://') && !trimmedLinkUrl.startsWith('https://')) {
                        Alert.alert("Invalid Link", "Please enter a valid URL starting with http:// or https://");
                        shouldExitEditMode = false;
                        console.log("[handleSave] Invalid link URL, stopping save for link.");
                        // Decide if we should stop ALL saves here or just skip the link
                        // For now, let's stop all saves if link is invalid
                        return;
                    }
                    urlToSave = trimmedLinkUrl;
                }
                console.log(`[handleSave] Calling onUpdateLinkUrl with: ${urlToSave}`);
                await onUpdateLinkUrl(card.listId, card.id, urlToSave);
                console.log("[handleSave] onUpdateLinkUrl finished.");
                changesMade = true;
            }

            // Description (HTML)
            console.log(`[handleSave] Checking Description. Original length: ${card.description?.length}, Edited length: ${editedDescription.length}`);
            const currentDescriptionHtml = editedDescription;
            if (currentDescriptionHtml !== (card.description || '')) {
                 console.log("[handleSave] Calling onUpdateDescription...");
                await onUpdateDescription(card.listId, card.id, currentDescriptionHtml); 
                console.log("[handleSave] onUpdateDescription finished.");
                changesMade = true;
            }

            // DueDate
            console.log(`[handleSave] Checking Due Date. Original: ${card.dueDate?.toMillis()}, Selected: ${selectedDueDate?.getTime()}`);
            const originalDueDateMillis = card.dueDate ? card.dueDate.toMillis() : null;
            const selectedDueDateMillis = selectedDueDate ? selectedDueDate.getTime() : null;
            if (originalDueDateMillis !== selectedDueDateMillis) {
                 const newFirestoreTimestamp = selectedDueDate ? Timestamp.fromDate(selectedDueDate) : null;
                 console.log("[handleSave] Calling onUpdateDueDate...");
                 await onUpdateDueDate(card.listId, card.id, newFirestoreTimestamp);
                 console.log("[handleSave] onUpdateDueDate finished.");
                 changesMade = true;
            }

            // Image
            console.log(`[handleSave] Checking Image URI. Original: ${card.imageUrl}, Local: ${imageUri}`);
            if (imageUri !== (card.imageUrl || null)) {
                console.log("[handleSave] Calling onUpdateImage...");
                setIsUploading(true); 
                await onUpdateImage(card.listId, card.id, imageUri);
                console.log("[handleSave] onUpdateImage finished.");
                changesMade = true;
                // Note: setIsUploading(false) is in a finally block within this try-catch
            }
        } catch (error) {
            console.error("[handleSave] Error during field update:", error);
            // Alert might have already been shown by the specific handler
            shouldExitEditMode = false; // Stay in edit mode on error
            // We might want to reset local state here if a save failed partially
        } finally {
             if (imageUri !== (card.imageUrl || null)) {
                 setIsUploading(false); // Ensure uploading state is reset even on error
             }
        }
        
        console.log(`[handleSave] Finished updates. changesMade=${changesMade}, shouldExitEditMode=${shouldExitEditMode}`);
        if (changesMade && shouldExitEditMode) {
            console.log("[handleSave] Changes made and should exit, calling setIsEditing(false).");
            setIsEditing(false);
        } else {
             console.log("[handleSave] No changes made or should not exit, staying in edit mode.");
        }
    };

    const onDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
        // Keep picker open on iOS until dismissed/done
        const currentlyShowing = Platform.OS === 'ios'; 
        setShowDatePicker(currentlyShowing);

        if (event.type === 'set' && newDate) {
             // Ensure time component is preserved from picker
            setSelectedDueDate(newDate); 
            if (!currentlyShowing) {
                 setShowDatePicker(false);
            }
        } else if (event.type === 'dismissed') {
             setShowDatePicker(false);
        } else if (event.type === 'neutralButtonPressed') { // Android Clear
             setSelectedDueDate(null);
             setShowDatePicker(false);
        }
    };

    // <<< NEW: Handler for web date input change >>>
    const handleWebDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = event.target.value;
        console.log("[CardDetailPanel] Web date input changed:", dateString);
        if (dateString) {
            try {
                 // Attempt to parse the ISO-like string from datetime-local
                 // Important: This might need adjustments based on browser/locale
                 // It typically gives YYYY-MM-DDTHH:mm
                 const date = new Date(dateString);
                 if (!isNaN(date.getTime())) {
                    setSelectedDueDate(date);
                 } else {
                    console.warn("Could not parse date string:", dateString);
                    setSelectedDueDate(null); // Or handle invalid input differently
                 }
            } catch (e) {
                console.error("Error parsing date string:", e);
                setSelectedDueDate(null);
            }
        } else {
            setSelectedDueDate(null); // Handle empty input
        }
    };
    
    // Format function (no change needed, handles null)
    const formatDateTime = (date: Date | null): string => {
        if (!date) return 'Set Due Date';
        // Combine date and time formatting
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: 'numeric', minute: '2-digit' // Add hour/minute
        }); 
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        console.log("ImagePicker Result:", result);

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleRemoveImage = () => {
        setImageUri(null);
    };

    // <<< NEW Helper to format countdown >>>
    const formatCountdown = (diffMillis: number): string => {
        if (diffMillis < 0) {
            // Overdue
            const diffSeconds = Math.abs(diffMillis) / 1000;
            const days = Math.floor(diffSeconds / (60 * 60 * 24));
            const hours = Math.floor((diffSeconds % (60 * 60 * 24)) / (60 * 60));
            const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
            if (days > 0) return `Overdue by ${days}d ${hours}h`;
            if (hours > 0) return `Overdue by ${hours}h ${minutes}m`;
            return `Overdue by ${minutes}m`;
        } else {
            // Due in future
            const diffSeconds = diffMillis / 1000;
            const days = Math.floor(diffSeconds / (60 * 60 * 24));
            const hours = Math.floor((diffSeconds % (60 * 60 * 24)) / (60 * 60));
            const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
            if (days > 0) return `Due in ${days}d ${hours}h`;
            if (hours > 0) return `Due in ${hours}h ${minutes}m`;
            return `Due in ${minutes}m`;
        }
    };

    // <<< NEW Effect for countdown timer >>>
    useEffect(() => {
        let intervalId: number | null = null;

        const updateCountdown = () => {
            if (card?.dueDate) {
                const now = new Date();
                const due = card.dueDate.toDate();
                const diff = due.getTime() - now.getTime();
                setCountdownString(formatCountdown(diff));
            } else {
                setCountdownString(''); // Clear if no due date
            }
        };

        if (card?.dueDate) {
            updateCountdown(); // Initial update
            // Update every minute (adjust interval as needed)
            intervalId = setInterval(updateCountdown, 60 * 1000); 
        } else {
             setCountdownString(''); // Ensure it's cleared if no due date initially
        }

        // Cleanup function
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [card?.dueDate]); // Re-run only if the due date itself changes

    // Use useMemo for tagsStyles to avoid re-computation on every render
    const tagsStyles = useMemo(() => createTagsStyles(colors), [colors]);

    if (!card) {
        return null;
    }

    // <<< Helper to format Date for web input value >>>
    const formatForWebInput = (date: Date | null): string => {
        if (!date) return '';
        // Format to YYYY-MM-DDTHH:mm (required by datetime-local)
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const currentListName = lists.find(list => list.id === card.listId)?.name || 'Unknown List';

    return (
        <View style={[styles.panelContainer, { backgroundColor: colors.backgroundSection, borderLeftColor: colors.border }]}>
            <View style={styles.panelHeader}>
                {isEditing ? (
                    <TextInput
                        style={[styles.panelTitleInput, { color: colors.text, borderBottomColor: colors.border }]} 
                        value={editedTitle}
                        onChangeText={setEditedTitle}
                        placeholder="Card Title"
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                    />
                ) : (
                    <Text style={styles.panelTitleText}>{card.title}</Text>
                )}
                <View style={styles.headerActions}>
                    {!isEditing && (
                        <Pressable onPress={handleEditPress} style={styles.headerButton}>
                            <Ionicons name="pencil-outline" size={24} color={colors.textSecondary} />
                        </Pressable>
                    )}
                    <Pressable onPress={onClose} style={styles.headerButton}>
                        <Ionicons name="close-outline" size={28} color={colors.textSecondary} />
                    </Pressable>
                </View>
            </View>

            <ScrollView style={styles.contentScrollView}>
                {isEditing ? (
                    <View>
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Cover Image</Text>
                            {isUploading ? (
                                <ActivityIndicator size="large" color={colors.primary} />
                            ) : imageUri ? (
                                <View>
                                    <Image source={{ uri: imageUri }} style={styles.coverImage} />
                                    <View style={styles.imageButtonsRow}>
                                        <Pressable style={[styles.imageButton, { backgroundColor: colors.buttonSecondaryBackground }]} onPress={pickImage}>
                                            <Text style={[styles.imageButtonText, { color: colors.buttonSecondaryText }]}>Change</Text>
                                        </Pressable>
                                        <Pressable style={[styles.imageButton, { backgroundColor: colors.buttonDestructiveBackground }]} onPress={handleRemoveImage}>
                                            <Text style={[styles.imageButtonText, { color: colors.buttonDestructiveText }]}>Remove</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <Pressable style={[styles.imageButton, { backgroundColor: colors.buttonPrimaryBackground }]} onPress={pickImage}>
                                    <Text style={[styles.imageButtonText, { color: colors.buttonPrimaryText }]}>Add Cover Image</Text>
                                </Pressable>
                            )}
                        </View>
                        
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Due Date</Text>
                            <Pressable 
                                onPress={() => {
                                    console.log('[CardDetailPanel] Set Due Date button pressed.');
                                    setShowDatePicker(true);
                                }}
                                style={[styles.dateDisplayButton, { borderColor: colors.border }]} >
                                <Text style={{ color: selectedDueDate ? colors.text : colors.textSecondary }}>
                                    {formatDateTime(selectedDueDate)}
                                </Text>
                            </Pressable>
                            
                            {/* <<< CONDITIONAL RENDER for Picker >>> */} 
                            {showDatePicker && (
                                Platform.OS === 'web' ? (
                                    // --- Web Input --- 
                                    <input 
                                        type="datetime-local" 
                                        value={formatForWebInput(selectedDueDate)} 
                                        onChange={handleWebDateChange} 
                                        style={{
                                            marginTop: 8,
                                            padding: '8px',
                                            fontSize: '14px',
                                            borderColor: colors.border,
                                            borderWidth: 1,
                                            borderRadius: 5,
                                            backgroundColor: colors.inputBackground,
                                            color: colors.text,
                                            borderStyle: 'solid'
                                        }}
                                    />
                                ) : (
                                    // --- Native Picker --- 
                                    <DateTimePicker
                                        value={selectedDueDate || new Date()}
                                        mode="datetime"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Keep 'spinner' for iOS consistency
                                        onChange={onDateChange}
                                        style={{ alignSelf: 'flex-start'}}
                                        {...(Platform.OS === 'android' && { neutralButton: { label: 'Clear', textColor: colors.buttonDestructiveBackground } })}
                                    />
                                )
                            )}
                        </View>
                        
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Link URL</Text>
                            <TextInput
                                style={[styles.linkInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} 
                                value={editedLinkUrl}
                                onChangeText={setEditedLinkUrl}
                                placeholder="https://example.com"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="url"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
                            <View style={[styles.editorContainer, { borderColor: colors.border }]}>
                                <Editor 
                                    value={editedDescription} 
                                    onChange={(e) => setEditedDescription(e.target.value)} 
                                />
                             </View>
                        </View>
                        
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status / List</Text>
                            <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}> 
                                <Picker
                                    selectedValue={selectedListId}
                                    onValueChange={(itemValue) => {
                                        console.log("[CardDetailPanel] Picker value changed:", itemValue);
                                        setSelectedListId(itemValue as string | '__DELETE__');
                                    }}
                                    style={[styles.pickerStyle, { color: colors.text }]}
                                    dropdownIconColor={colors.textSecondary}
                                >
                                    {/* Current List */}
                                    <Picker.Item label={`Current: ${currentListName}`} value={card.listId} key={card.listId} />
                                    
                                    {/* Other Lists */}
                                    {lists
                                        .filter(list => list.id !== card.listId) // Exclude current list
                                        .map(list => (
                                            <Picker.Item label={`Move to: ${list.name}`} value={list.id} key={list.id} />
                                        ))}

                                    {/* Special Actions Separator */}
                                     <Picker.Item label="--- Actions ---" value="__SEPARATOR__" enabled={false} style={{ color: colors.textSecondary }}/>
                                     {/* Complete Action (assuming move to 'Done') */} 
                                     <Picker.Item label="Mark as Done" value="__DONE__" style={{ color: colors.dueDateOk }}/>
                                     {/* Delete Action */} 
                                     <Picker.Item label="Delete Card..." value="__DELETE__" style={{ color: colors.buttonDestructiveBackground }}/>

                                </Picker>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View>
                        {card.imageUrl && (
                            <View style={styles.sectionContainer}>
                                <Image source={{ uri: card.imageUrl }} style={styles.coverImage} />
                            </View>
                        )}
                        
                        {/* <<< Changed condition to always show section if listId exists >>> */}
                        {(card.listId || card.dueDate || card.description || card.linkUrl) && (
                            <View style={styles.sectionContainer}> 
                                {/* <<< Display Status (Current List) >>> */} 
                                <View style={styles.detailRow}>
                                    <Ionicons name="list-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                                    <Text style={[styles.detailText, { color: colors.text }]}>{currentListName}</Text>
                                </View>

                                {card.dueDate && (
                                    <> {/* Use Fragment to group date and countdown */} 
                                        <View style={styles.detailRow}> 
                                            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                                            <Text style={[styles.detailText, { color: colors.text }]}>{formatDateTime(card.dueDate.toDate())}</Text>
                                        </View>
                                        {/* Display Countdown String */} 
                                        {countdownString && (
                                            <View style={styles.detailRow}> 
                                                <Ionicons name="hourglass-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                                                <Text style={[styles.detailText, { color: colors.text }]}>{countdownString}</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                                
                                {/* <<< Display Link URL - Simplified open attempt >>> */} 
                                {card.linkUrl && (
                                    <Pressable 
                                        style={styles.detailRow} 
                                        onPress={() => {
                                            try {
                                                Linking.openURL(card.linkUrl || '');
                                            } catch (err) {
                                                console.error("Failed to open URL:", err);
                                                Alert.alert("Error", "Cannot open this link.");
                                            }
                                        }}
                                    >
                                        <Ionicons name="link-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                                        <Text style={[styles.detailText, styles.linkText, { color: colors.primary }]}>{card.linkUrl}</Text>
                                    </Pressable>
                                )}
                                
                                {/* <<< Display Description (Render HTML) >>> */} 
                                {card.description && (
                                    <View style={styles.detailRow}> 
                                        <Ionicons name="reader-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                                        <RenderHTML
                                            contentWidth={width - 400} 
                                            source={{ html: card.description || '' }}
                                            tagsStyles={tagsStyles}
                                        />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            
            {isEditing && (
                <View style={[styles.panelFooter, { borderTopColor: colors.border }]}> 
                    <Pressable 
                        style={[styles.footerButton, { backgroundColor: colors.buttonPrimaryBackground }]} 
                        onPress={handleSave} >
                        <Text style={[styles.footerButtonText, { color: colors.buttonPrimaryText }]}>Save</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.footerButton, styles.cancelButton, { backgroundColor: colors.buttonSecondaryBackground }]} 
                        onPress={handleCancelEdit} >
                        <Text style={[styles.footerButtonText, { color: colors.buttonSecondaryText }]}>Cancel</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    panelContainer: {
        width: 350,
        height: '100%',
        borderLeftWidth: 1,
        flexDirection: 'column',
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    panelTitleInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 10,
        borderBottomWidth: 1, 
        paddingVertical: 5,
    },
    panelTitleText: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 10,
        paddingVertical: 5,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerButton: {
        padding: 5,
        marginLeft: 10,
    },
    contentScrollView: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    dateDisplayButton: {
        borderWidth: 1,
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    descriptionInput: {
        fontSize: 15,
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        minHeight: 100,
    },
    panelFooter: {
        padding: 15,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    footerButton: {
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        minWidth: 80,
    },
    footerButtonText: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    cancelButton: {
        marginLeft: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    detailIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    detailText: {
        fontSize: 15,
        flexShrink: 1,
    },
    coverImage: {
        width: '100%',
        height: 150,
        borderRadius: 5,
        marginBottom: 10,
        backgroundColor: Colors.light.border,
    },
    imageButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    imageButton: {
        flex: 1,
        borderRadius: 5,
        paddingVertical: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    imageButtonText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10, 
    },
    pickerStyle: {
        height: 50, 
        width: '100%',
    },
    linkInput: {
        fontSize: 15,
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
    },
    editorContainer: {
        borderWidth: 1,
        borderRadius: 5,
        minHeight: 150,
        overflow: 'hidden',
    },
    linkText: {
        textDecorationLine: 'underline',
    },
});

export default CardDetailPanel; 