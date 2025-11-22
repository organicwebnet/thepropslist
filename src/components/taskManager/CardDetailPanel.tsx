import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    Modal,
    TouchableOpacity,
    FlatList,
    Button,
    PanResponder,
    Dimensions
} from 'react-native';

// import Colors from '../constants/Colors'; // OLD
import { useTheme } from '../../contexts/ThemeContext'; // NEW
import { lightTheme, darkTheme } from '../../styles/theme'; // Import theme objects

import DatePicker from 'react-native-date-picker';
// import { Timestamp } from 'firebase/firestore'; // OLD - use string/CustomTimestamp
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; // Uncommented
import type { CardLabel, CustomTimestamp, MemberData, ChecklistItemData, ChecklistData, CommentData, ActivityData, CardData, ListData } from '../../shared/types/taskManager'; // ADD THIS IMPORT
import { Picker } from '@react-native-picker/picker';
import LabelPicker from '../modals/LabelPicker'; // Added import
import MemberPicker from './MemberPicker'; // CHANGED extension to .tsx
// Remove the alias if MemberData from taskManager.ts is the one to be used consistently
// import type { MemberData as MemberPickerData } from '../modals/MemberPicker';
import { v4 as uuidv4 } from 'uuid'; // For generating comment IDs
import { useFirebase } from '../../platforms/mobile/contexts/FirebaseContext'; // Added
import * as DocumentPicker from 'expo-document-picker'; // Import for general file picking
// Assuming DigitalAsset type is available from a shared location
// If not, it would be defined here or imported from its actual location.
// For now, let's assume it's importable or we'll define a compatible one.
import type { DigitalAsset as AttachmentData } from '../../shared/types/props'; // Tentative import path

// NEW: Import for Mentions Editor
import Editor from 'react-native-mentions-editor'; // Removed { displayTextWithMentions, EU } to simplify, will add back if used
import type { Prop } from '../../shared/types/props'; // For prop suggestions
import type { PackingBox } from '../../types/packing'; // For container suggestions
import { useAuth } from '../../contexts/AuthContext'; // ADD THIS LINE
import LinearGradient from 'react-native-linear-gradient';

// WYSIWYG and HTML rendering commented out for now
// import Editor from 'react-simple-wysiwyg';
// import RenderHTML from 'react-native-render-html';

// Commented-out local type definitions removed.

// Define MentionSuggestion interface at the top level
type MentionEntityType = 'prop' | 'container' | 'user';
interface MentionSuggestion {
    id: string;
    username: string;
    type: MentionEntityType;
}

// Props for the Panel
interface CardDetailPanelProps {
    isVisible: boolean;
    card: CardData | null;
    lists: ListData[]; // To populate the move-to-list picker
    allShowMembers?: MemberData[]; // Use MemberData from taskManager.ts
    onClose: () => void;
    onUpdateCard: (cardId: string, listId: string, updates: Partial<CardData>) => Promise<void>;
    onMoveCard: (cardId: string, originalListId: string, targetListId: string) => Promise<void>;
    onDeleteCard: (listId: string, cardId: string) => Promise<void>;
    // For label picker
    availableLabels?: CardLabel[]; 
    onCreateNewLabel?: (name: string, color: string) => Promise<CardLabel | null>;
    boardId: string;
    // For swipe navigation
    allCards?: CardData[]; // All cards in the current list for navigation
    onNavigateToCard?: (card: CardData) => void; // Callback to navigate to another card
}

const CardDetailPanel: React.FC<CardDetailPanelProps> = ({
    isVisible,
    card,
    lists,
    allShowMembers = [], // Default to empty array if not provided
    onClose,
    onUpdateCard,
    onMoveCard,
    onDeleteCard,
    availableLabels: propAvailableLabels = [], // MODIFIED: Renamed prop to avoid conflict
    onCreateNewLabel,
    boardId,
    allCards = [], // For swipe navigation
    onNavigateToCard
}) => {
    const { theme: themeName } = useTheme();
    const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;
    const styles = StyleSheet.create({
        overlay: { flex: 1, backgroundColor: currentThemeColors.background, justifyContent: 'center', alignItems: 'center' },
        panel: {
            backgroundColor: currentThemeColors.cardBg,
            borderRadius: 10,
            padding: 0,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            width: '90%',
            maxHeight: '85%',
            alignSelf: 'center',
            marginTop: 20,
        },
        modalContent: {
            padding: 20,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            paddingBottom: 10,
            marginBottom: 10,
            paddingTop: 18,
            paddingLeft: 18,
            paddingRight: 12,
        },
        sectionContentRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        section: {
            marginBottom: 20,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
            color: '#fff',
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 10,
            color: '#fff',
            paddingTop: 0,
            paddingLeft: 0,
        },
        pickerSection: {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 8,
        },
        icon: {
            marginRight: 10
        },
        pickerContainer: {
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 5,
            backgroundColor: 'transparent', // Ensure picker background doesn't hide container styles
        },
        picker: {
            width: '100%',
            height: 40,
        },
        label: {
            fontSize: 14,
            color: '#fff',
        },
        descriptionTextValue: {
            fontSize: 16,
            lineHeight: 24,
        },
        propLinkText: {
            color: currentThemeColors.primary,
            fontWeight: 'bold',
            fontSize: 16,
        },
        containerLinkText: {
            color: '#4caf50', // Example color for containers
            fontWeight: 'bold',
            fontSize: 16,
        },
        descriptionText: {
            fontSize: 16,
        },
        input: {
            borderWidth: 1,
            borderRadius: 5,
            padding: 10,
            fontSize: 16,
            minHeight: 60,
            textAlignVertical: 'top'
        },
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginTop: 10,
        },
        primaryButton: {
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
            marginRight: 10,
        },
        secondaryButton: {
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
        },
        deleteButton: {
            backgroundColor: currentThemeColors.error,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
            marginLeft: 'auto'
        },
        primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
        secondaryButtonText: { color: currentThemeColors.text, fontWeight: 'bold', fontSize: 15 },
        deleteButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
        commentItemContainer: { flexDirection: 'row', marginBottom: 10, padding: 8, backgroundColor: currentThemeColors.inputBg, borderRadius: 4 },
        commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: currentThemeColors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
        commentAvatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
        commentContent: { flex: 1 },
        commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
        commentUserName: { fontWeight: 'bold', color: currentThemeColors.text, fontSize: 13 },
        commentDate: { fontSize: 11, color: currentThemeColors.textSecondary },
        commentText: { color: currentThemeColors.text, fontSize: 14 },
        disabledInput: { backgroundColor: '#444444', color: '#888888' },
        disabledButton: { backgroundColor: '#555555' },
        commentInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
        commentInput: { flex: 1, borderWidth: 1, borderColor: currentThemeColors.border, borderRadius: 4, padding: 10, marginRight: 10, color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBg },
        commentPostButton: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: currentThemeColors.primary, borderRadius: 4 },
        commentPostButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
        commentListContainer: { maxHeight: 200 },
        imagePreview: { width: '100%', height: 180, borderRadius: 6, marginBottom: 10, backgroundColor: currentThemeColors.border },
        imageButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
        imageButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.primary, borderRadius: 4, marginHorizontal: 5, flex:1, alignItems:'center' },
        removeImageButton: { backgroundColor: currentThemeColors.error },
        uploadingIndicator: { marginVertical: 10 },
        imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        imagePlaceholderText: {
            color: '#fff',
            fontStyle: 'italic',
        },
        pickImageButton: { backgroundColor: currentThemeColors.primary, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
        labelsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: 5,
        },
        labelChip: {
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 6,
            marginRight: 6,
            marginBottom: 6,
        },
        labelText: {
            fontSize: 12,
            color: '#FFFFFF',
            fontWeight: 'bold',
        },
        addLabelButton: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: currentThemeColors.card,
            borderRadius: 4,
            alignSelf: 'flex-start',
            marginTop: 5,
            borderWidth: 1,
            borderColor: currentThemeColors.border,
        },
        addLabelButtonText: {
            fontSize: 14,
            color: currentThemeColors.text,
        },
        membersContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: 5,
        },
        memberChip: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: currentThemeColors.inputBg,
            borderRadius: 15,
            paddingVertical: 5,
            paddingHorizontal: 10,
            marginRight: 8,
            marginBottom: 8,
        },
        avatarPlaceholder: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: currentThemeColors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 6,
        },
        avatarText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
        },
        memberName: {
            fontSize: 12,
            color: currentThemeColors.text,
        },
        addMemberButton: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: currentThemeColors.card,
            borderRadius: 4,
            alignSelf: 'flex-start',
            marginTop: 5,
            borderWidth: 1,
            borderColor: currentThemeColors.border,
        },
        addMemberButtonText: {
            fontSize: 14,
            color: currentThemeColors.text,
        },
        datePickerButton: {
            paddingVertical: 10,
            paddingHorizontal: 15,
            backgroundColor: currentThemeColors.inputBg,
            borderRadius: 4,
            borderWidth:1,
            borderColor: currentThemeColors.border,
            marginBottom:10
        },
        dateText: {
            fontSize: 15,
            color: currentThemeColors.text
        },
        removeDateButton: {
            alignSelf: 'flex-start',
            marginTop: 5,
            padding: 5
        },
        removeDateText: {
            color: currentThemeColors.error,
            fontSize: 14,
        },
        checklistContainer: { marginBottom: 15 },
        checklistItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4 },
        checklistItemText: { marginLeft: 8, fontSize: 15, color: currentThemeColors.text, flexShrink: 1 },
        checklistItemTextCompleted: { textDecorationLine: 'line-through', color: currentThemeColors.textSecondary },
        checklistInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 10 },
        checklistInput: { flex: 1, borderWidth: 1, borderColor: currentThemeColors.border, borderRadius: 4, padding: 8, marginRight: 8, color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBg },
        checklistAddButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: currentThemeColors.primary, borderRadius: 4 },
        checklistAddButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
        checklistProgressBarContainer: { height: 6, backgroundColor: currentThemeColors.border, borderRadius: 3, marginTop: 4, marginBottom:8 },
        checklistProgressBar: { height: '100%', backgroundColor: currentThemeColors.primary, borderRadius: 3 },
        deleteButtonSmall: { marginLeft: 'auto', padding: 5 }, 
        attachmentItem: { marginBottom: 10, padding: 10, backgroundColor: currentThemeColors.inputBg, borderRadius: 5 },
        attachmentInput: { borderWidth: 1, borderColor: currentThemeColors.border, borderRadius: 4, padding: 8, color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBg, marginBottom: 5 }, 
        attachmentLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        attachmentTypeIcon: { marginRight: 8 }, 
        attachmentNameText: { color: currentThemeColors.text, flexShrink:1, marginRight: 5 },
        attachmentValidationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5 },
        attachmentErrorText: { color: currentThemeColors.error, fontSize: 12, marginRight: 5 },
        addAttachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: currentThemeColors.card, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, alignSelf: 'flex-start', marginTop: 5, marginBottom:10, borderWidth: 1, borderColor: currentThemeColors.border },
        addAttachmentButtonText: { color: currentThemeColors.text, marginLeft: 6 },
        linkInput: { borderWidth: 1, borderColor: currentThemeColors.border, padding: 10, borderRadius: 4, color: currentThemeColors.text, backgroundColor: currentThemeColors.inputBg, fontSize: 15, lineHeight: 20 },
        actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: currentThemeColors.border, paddingTop: 15, paddingBottom:15, paddingHorizontal: 20 },
        editButton: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: currentThemeColors.card, borderRadius: 5, minWidth: 80, alignItems:'center' },
        saveButton: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: currentThemeColors.primary, borderRadius: 5, minWidth: 80, alignItems:'center' },
        cancelButton: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: currentThemeColors.card, borderRadius: 5, minWidth: 80, alignItems:'center' },
    });

    const { service, isInitialized: isFirebaseInitialized, error: firebaseError } = useFirebase(); // Get Firebase status
    const router = useRouter();
    const { user } = useAuth();

    const [editingTitleState, setEditingTitleState] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editingDescription, setEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedListIdToMove, setSelectedListIdToMove] = useState<string>('');
    const [editedLinkUrl, setEditedLinkUrl] = useState<string>('');
    const [editedImageUri, setEditedImageUri] = useState<string | null | undefined>(undefined);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [showLabelPicker, setShowLabelPicker] = useState(false);
    const [showMemberPickerModal, setShowMemberPickerModal] = useState(false);
    const [pickerAvailableLabels, setPickerAvailableLabels] = useState<CardLabel[]>([]);
    const [internalCard, setInternalCard] = useState<CardData | null>(null);
    const [allAvailableMembersForPicker, setAllAvailableMembersForPicker] = useState<MemberData[]>([]);
    const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [newChecklistItemTexts, setNewChecklistItemTexts] = useState<{ [key: string]: string }>({});
    const [attachmentValidationStatus, setAttachmentValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'pending' | 'idle'>>({});
    const [attachmentValidatingId, setAttachmentValidatingId] = useState<string | null>(null);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);

    // Mention system states - complete
    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [showPropSearch, setShowPropSearch] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [showContainerSearch, setShowContainerSearch] = useState(false);
    // Track which field is currently invoking the @mention system
    const [mentionTarget, setMentionTarget] = useState<'description' | 'title' | null>(null);
    const [propSearchText, setPropSearchText] = useState('');
    const [userSearchText, setUserSearchText] = useState('');
    const [containerSearchText, setContainerSearchText] = useState('');
    const [propSuggestions, setPropSuggestions] = useState<{id: string, name: string}[]>([]);
    const [userSuggestions, setUserSuggestions] = useState<MemberData[]>([]);
    const [containerSuggestions, setContainerSuggestions] = useState<{id: string, name: string}[]>([]);

    // Get real props and containers data
    const { service: firebaseService } = useFirebase();
    const [allProps, setAllProps] = useState<{id: string, name: string}[]>([]);
    const [allContainers, setAllContainers] = useState<{id: string, name: string}[]>([]);
    const [currentShowId, setCurrentShowId] = useState<string | null>(null);

    // Fetch real props data - with error handling
    useEffect(() => {
        if (!firebaseService || !isVisible) return;
        
        // Get props for the current board's show
        firebaseService.getDocument('todo_boards', boardId).then((doc: any) => {
            if (doc?.exists && doc.data?.showId) {
                const showId = doc.data.showId;
                setCurrentShowId(showId);
                
                // Fetch props for this show with proper error handling
                firebaseService.getCollection('props')
                    .then((snapshot: any) => {
                        if (snapshot?.docs) {
                            const props = snapshot.docs
                                .filter((doc: any) => doc.data?.showId === showId)
                                .map((doc: any) => ({
                                    id: doc.id,
                                    name: doc.data?.name || 'Unnamed Prop'
                                }));
                            setAllProps(props);
                        }
                    })
                    .catch((error) => {
                        console.error('Could not fetch props:', error);
                        // Use mock data as fallback
                        setAllProps([
                            { id: 'prop1', name: 'Crystal Ball' },
                            { id: 'prop2', name: 'Magic Sword' },
                            { id: 'prop3', name: 'Ancient Book' }
                        ]);
                    });

                // Fetch packing boxes/containers for this show with proper error handling
                firebaseService.getCollection('packing_boxes')
                    .then((snapshot: any) => {
                        if (snapshot?.docs) {
                            const containers = snapshot.docs
                                .filter((doc: any) => doc.data?.showId === showId)
                                .map((doc: any) => ({
                                    id: doc.id,
                                    name: doc.data?.name || 'Unnamed Container'
                                }));
                            setAllContainers(containers);
                        }
                    })
                    .catch((error) => {
                        console.error('Could not fetch containers:', error);
                        // Use mock data as fallback
                        setAllContainers([
                            { id: 'cont1', name: 'Props Box A' },
                            { id: 'cont2', name: 'Storage Container B' }
                        ]);
                    });
            } else {
                // No show ID found, use mock data
                setAllProps([
                    { id: 'prop1', name: 'Crystal Ball' },
                    { id: 'prop2', name: 'Magic Sword' },
                    { id: 'prop3', name: 'Ancient Book' }
                ]);
                setAllContainers([
                    { id: 'cont1', name: 'Props Box A' },
                    { id: 'cont2', name: 'Storage Container B' }
                ]);
            }
        }).catch((error) => {
            console.error('Could not fetch board data for mentions:', error);
            // Use mock data as fallback
            setAllProps([
                { id: 'prop1', name: 'Crystal Ball' },
                { id: 'prop2', name: 'Magic Sword' },
                { id: 'prop3', name: 'Ancient Book' }
            ]);
            setAllContainers([
                { id: 'cont1', name: 'Props Box A' },
                { id: 'cont2', name: 'Storage Container B' }
            ]);
        });
    }, [firebaseService, boardId, isVisible]);

    // Helper: create a very basic prop and return its id
    const createBasicProp = async (propName: string): Promise<{ id: string; name: string } | null> => {
        try {
            const showId = currentShowId || undefined;
            const now = new Date().toISOString();
            const result = await service.addDocument<any>('props', {
                name: propName,
                showId: showId,
                category: 'Other',
                price: 0,
                quantity: 1,
                status: 'confirmed',
                createdAt: now,
                updatedAt: now,
            });
            return { id: result.id, name: propName };
        } catch (err) {
            console.error('Failed to create basic prop from @P:', err);
            Alert.alert('Error', 'Could not create prop');
            return null;
        }
    };


    const editorRef = useRef<any>(null); // MODIFIED: Editor to any for ref type

    const propRegex = /@@PROP\[([a-zA-Z0-9_-]+):([^#@\]]+)\]@@/g;
    const containerRegex = /##CONT\[([a-zA-Z0-9_-]+):([^#@\]]+)\]##/g;

    // Swipe navigation logic
    const currentCardIndex = useMemo(() => {
        if (!card || !allCards.length) return -1;
        return allCards.findIndex(c => c.id === card.id);
    }, [card, allCards]);

    const canSwipeLeft = currentCardIndex > 0;
    const canSwipeRight = currentCardIndex < allCards.length - 1;

    const navigateToPreviousCard = useCallback(() => {
        if (canSwipeLeft && onNavigateToCard) {
            const previousCard = allCards[currentCardIndex - 1];
            onNavigateToCard(previousCard);
        }
    }, [canSwipeLeft, currentCardIndex, allCards, onNavigateToCard]);

    const navigateToNextCard = useCallback(() => {
        if (canSwipeRight && onNavigateToCard) {
            const nextCard = allCards[currentCardIndex + 1];
            onNavigateToCard(nextCard);
        }
    }, [canSwipeRight, currentCardIndex, allCards, onNavigateToCard]);

    // Pan responder for swipe gestures
    const panResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
            // Only respond to horizontal swipes with sufficient movement
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
        },
        onPanResponderMove: () => {
            // Could add visual feedback here if desired
        },
        onPanResponderRelease: (_, gestureState) => {
            const { dx } = gestureState;
            const swipeThreshold = Dimensions.get('window').width * 0.25; // 25% of screen width
            
            if (dx > swipeThreshold) {
                // Swipe right - go to previous card
                navigateToPreviousCard();
            } else if (dx < -swipeThreshold) {
                // Swipe left - go to next card  
                navigateToNextCard();
            }
        },
    }), [navigateToPreviousCard, navigateToNextCard]);

    const parsedDescription = useMemo(() => {
        if (!internalCard?.description) return null;
        const description = internalCard.description;
        const parts: React.ReactElement[] = []; // Ensure parts is explicitly typed
        let lastIndex = 0;
        const allMatches = [];
        let match;
        propRegex.lastIndex = 0;
        while ((match = propRegex.exec(description)) !== null) {
            allMatches.push({ type: 'prop', index: match.index, length: match[0].length, id: match[1], name: match[2] });
        }
        containerRegex.lastIndex = 0;
        while ((match = containerRegex.exec(description)) !== null) {
            allMatches.push({ type: 'container', index: match.index, length: match[0].length, id: match[1], name: match[2] });
        }

        allMatches.sort((a, b) => a.index - b.index);

        allMatches.forEach(currentMatch => {
            if (currentMatch.index > lastIndex) {
                parts.push(<Text key={`text-${lastIndex}`} style={styles.descriptionTextValue}>{description.substring(lastIndex, currentMatch.index)}</Text>);
            }
            parts.push(
                <Pressable key={`${currentMatch.type}-${currentMatch.id}-${currentMatch.index}`} onPress={() => Alert.alert(`${currentMatch.type === 'prop' ? 'Prop' : 'Container'} Link Clicked`, `ID: ${currentMatch.id}\nName: ${currentMatch.name}`)}>
                    <Text style={currentMatch.type === 'prop' ? styles.propLinkText : styles.containerLinkText}>
                        {currentMatch.type === 'prop' ? '@' : '#'}{currentMatch.name}
                    </Text>
                </Pressable>
            );
            lastIndex = currentMatch.index + currentMatch.length;
        });

        if (lastIndex < description.length) {
            parts.push(<Text key={`text-${lastIndex}-end`} style={styles.descriptionTextValue}>{description.substring(lastIndex)}</Text>);
        }
        if (parts.length === 0 && description) {
            return [<Text key="plain-desc" style={styles.descriptionTextValue}>{description}</Text>];
        }
        return parts.length > 0 ? parts : null;
    }, [internalCard?.description, currentThemeColors]);

    const resetLocalStateAndEditingModes = (currentCard: CardData | null) => {
        if (currentCard) {
            setEditedTitle(currentCard.title || '');
            setEditedDescription(currentCard.description || '');
            setSelectedDueDate(parseDate(currentCard.dueDate));
            setEditedImageUri(currentCard.imageUrl);
            setSelectedListIdToMove(currentCard.listId);
            setEditedLinkUrl(currentCard.linkUrl || '');
        } else {
            setEditedTitle('');
            setEditedDescription('');
            setSelectedDueDate(null);
            setEditedImageUri(null);
            setSelectedListIdToMove('');
            setEditedLinkUrl('');
        }
        setEditingTitleState(false);
        setEditingDescription(false);
    };

    useEffect(() => {
        if (card) {
            setInternalCard(card);
            resetLocalStateAndEditingModes(card);
        } else {
            setInternalCard(null);
            resetLocalStateAndEditingModes(null);
        }
    }, [card]);
    
    useEffect(() => {
        if (isVisible && internalCard) {
            const currentCardMembers = internalCard.members || [];
            const combinedMembersMap = new Map<string, MemberData>();
            (allShowMembers || []).forEach(m => combinedMembersMap.set(m.id, m));
            currentCardMembers.forEach(cm => { if (!combinedMembersMap.has(cm.id)) combinedMembersMap.set(cm.id, cm); });
            const finalCombinedMembers = Array.from(combinedMembersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            setAllAvailableMembersForPicker(prev => JSON.stringify(prev) !== JSON.stringify(finalCombinedMembers) ? finalCombinedMembers : prev);

            const currentCardLabels = internalCard.labels || [];
            const combinedLabelsMap = new Map<string, CardLabel>();
            propAvailableLabels.forEach(l => combinedLabelsMap.set(l.id, l));
            currentCardLabels.forEach(cl => combinedLabelsMap.set(cl.id, cl));
            const finalCombinedLabels = Array.from(combinedLabelsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
            setPickerAvailableLabels(prevLabels => JSON.stringify(prevLabels) !== JSON.stringify(finalCombinedLabels) ? finalCombinedLabels : prevLabels);
        } else if (!isVisible) {
            setAllAvailableMembersForPicker([]);
            setPickerAvailableLabels([]);
        }
    }, [internalCard, isVisible, allShowMembers, propAvailableLabels]);

    const handleEditTitle = () => {
        if(internalCard) setEditedTitle(internalCard.title || '');
        setEditingTitleState(true);
    };
    const handleSaveTitle = async () => {
        if (internalCard && editedTitle.trim() !== internalCard.title) {
            try {
                await onUpdateCard(internalCard.id, internalCard.listId, { title: editedTitle.trim() });
                setInternalCard(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
            } catch (error) { Alert.alert("Error", "Failed to update title."); }
        }
        setEditingTitleState(false);
    };

    const handleMoveCardRequest = async (targetListId: string) => {
        if (!internalCard || targetListId === internalCard.listId) {
            return;
        }
        try {
            await onMoveCard(internalCard.id, internalCard.listId, targetListId);
            onClose(); // Close the panel after moving the card
        } catch (error) {
            Alert.alert("Error", "Failed to move card.");
        }
    };

    // ADDED: Description Editing Handlers
    const handleEditDescription = () => {
        if (internalCard) setEditedDescription(internalCard.description || '');
        setEditingDescription(true);
    };

    const handleSaveDescription = async () => {
        if (!internalCard) return;
        
        // Don't close editing mode if mention system is active
        if (showMentionMenu || showPropSearch || showUserSearch || showContainerSearch) {
            return;
        }
        
        // Only save if description actually changed
        if (editedDescription !== (internalCard.description || '')) {
            try {
                await onUpdateCard(internalCard.id, internalCard.listId, { description: editedDescription });
                setInternalCard(prev => prev ? { ...prev, description: editedDescription } : null);
            } catch (error) {
                Alert.alert("Error", "Failed to update description.");
            }
        }
        
        setEditingDescription(false);
        // Clear mention states when saving
        closeMentionSystem();
    };

    const handleDescriptionChange = (text: string) => {
        setEditedDescription(text);
        
        // Close mention menu if space, period, or comma is typed (similar to web-app behavior)
        if (showMentionMenu && !showPropSearch && !showUserSearch && !showContainerSearch) {
            if (text.endsWith(' ') || text.endsWith('.') || text.endsWith(',')) {
                setShowMentionMenu(false);
                setMentionTarget(null);
                return;
            }
        }
        
        // Enhanced mention detection - check for @user, @prop, @box patterns and quick-create @P:Name
        if (!showMentionMenu && !showPropSearch && !showUserSearch && !showContainerSearch) {
            const quickCreateMatch = text.match(/@P:([^\n]+)$/);
            if (quickCreateMatch && quickCreateMatch[1].trim()) {
                const name = quickCreateMatch[1].trim();
                (async () => {
                    const created = await createBasicProp(name);
                    if (created) {
                        const propLink = `[@${created.name}](prop:${created.id})`;
                        const newDescription = text.replace(/@P:[^\n]+$/, propLink + ' ');
                        setEditedDescription(newDescription);
                    }
                })();
                return;
            }
            if (text.endsWith('@user ') || text.endsWith('@user')) {
                // Trigger user search directly
                setMentionTarget('description');
                setShowUserSearch(true);
                setUserSearchText('');
                setUserSuggestions(allShowMembers || []);
            } else if (text.endsWith('@prop ') || text.endsWith('@prop')) {
                // Trigger prop search directly
                setMentionTarget('description');
                setShowPropSearch(true);
                setPropSearchText('');
                setPropSuggestions(allProps);
            } else if (text.endsWith('@box ') || text.endsWith('@box')) {
                // Trigger box/container search directly
                setMentionTarget('description');
                setShowContainerSearch(true);
                setContainerSearchText('');
                setContainerSuggestions(allContainers);
            } else if (text.endsWith('@') && !text.endsWith('@@')) {
                // Show menu for ambiguous @ mentions
                setMentionTarget('description');
                setShowMentionMenu(true);
            }
        }
    };

    const handleSelectProp = () => {
        // Extract any text typed after @ (similar to web-app behavior)
        const currentText = mentionTarget === 'title' ? editedTitle : editedDescription;
        const mentionMatch = currentText.match(/@([A-Za-z0-9\s]*)$/);
        const typedText = mentionMatch ? mentionMatch[1].trim() : '';
        
        setShowMentionMenu(false);
        setShowPropSearch(true);
        setPropSearchText(typedText);
        setPropSuggestions(allProps); // Show all props initially
    };

    const handlePropSearchChange = (searchText: string) => {
        setPropSearchText(searchText);
        
        // Filter props based on search - with null check
        const filtered = (allProps || []).filter((prop: {id: string, name: string}) => 
            prop.name.toLowerCase().includes(searchText.toLowerCase())
        );
        setPropSuggestions(filtered);
    };

    const handleSelectPropFromList = (prop: {id: string, name: string}) => {
        const propLink = `[@${prop.name}](prop:${prop.id})`;
        if (mentionTarget === 'title') {
            // Replace @[typed text] with the prop link (similar to web-app behavior)
            const mentionMatch = editedTitle.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedTitle.substring(0, editedTitle.length - mentionMatch[0].length);
                setEditedTitle(beforeMention + propLink + ' ');
            } else {
                const newTitle = editedTitle.endsWith('@') ? editedTitle.slice(0, -1) + propLink + ' ' : editedTitle + ' ' + propLink + ' ';
                setEditedTitle(newTitle);
            }
        } else {
            // Replace @[typed text] with the prop link (similar to web-app behavior)
            const mentionMatch = editedDescription.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedDescription.substring(0, editedDescription.length - mentionMatch[0].length);
                setEditedDescription(beforeMention + propLink + ' ');
            } else {
                const newDescription = editedDescription.endsWith('@') ? editedDescription.slice(0, -1) + propLink + ' ' : editedDescription + ' ' + propLink + ' ';
                setEditedDescription(newDescription);
            }
        }
        
        // Close everything
        setShowPropSearch(false);
        setShowMentionMenu(false);
        setPropSearchText('');
        setPropSuggestions([]);
        setMentionTarget(null);
    };

    // User search handlers
    const handleSelectUser = () => {
        // Extract any text typed after @ (similar to web-app behavior)
        const currentText = mentionTarget === 'title' ? editedTitle : editedDescription;
        const mentionMatch = currentText.match(/@([A-Za-z0-9\s]*)$/);
        const typedText = mentionMatch ? mentionMatch[1].trim() : '';
        
        setShowMentionMenu(false);
        setShowUserSearch(true);
        setUserSearchText(typedText);
        setUserSuggestions(allShowMembers || []);
    };

    // Assign to user handler - opens member picker to assign users to the card
    const handleAssignToUser = () => {
        const currentTarget = mentionTarget; // Store before clearing
        setShowMentionMenu(false);
        setMentionTarget(null);
        // Remove the @ from the text if it exists
        if (currentTarget === 'title') {
            const mentionMatch = editedTitle.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedTitle.substring(0, editedTitle.length - mentionMatch[0].length);
                setEditedTitle(beforeMention);
            } else if (editedTitle.endsWith('@')) {
                setEditedTitle(editedTitle.slice(0, -1));
            }
        } else if (currentTarget === 'description') {
            const mentionMatch = editedDescription.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedDescription.substring(0, editedDescription.length - mentionMatch[0].length);
                setEditedDescription(beforeMention);
            } else if (editedDescription.endsWith('@')) {
                setEditedDescription(editedDescription.slice(0, -1));
            }
        }
        // Open the member picker
        setShowMemberPickerModal(true);
    };

    const handleUserSearchChange = (searchText: string) => {
        setUserSearchText(searchText);
        const filtered = (allShowMembers || []).filter((user: any) => 
            user?.name?.toLowerCase().includes(searchText.toLowerCase())
        );
        setUserSuggestions(filtered);
    };

    const handleSelectUserFromList = (user: MemberData) => {
        const userMention = `@${user.name}`;
        if (mentionTarget === 'title') {
            // Replace @[typed text] with the user mention (similar to web-app behavior)
            const mentionMatch = editedTitle.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedTitle.substring(0, editedTitle.length - mentionMatch[0].length);
                setEditedTitle(beforeMention + userMention + ' ');
            } else {
                const newTitle = editedTitle.endsWith('@') ? editedTitle.slice(0, -1) + userMention + ' ' : editedTitle + ' ' + userMention + ' ';
                setEditedTitle(newTitle);
            }
        } else {
            // Replace @[typed text] with the user mention (similar to web-app behavior)
            const mentionMatch = editedDescription.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedDescription.substring(0, editedDescription.length - mentionMatch[0].length);
                setEditedDescription(beforeMention + userMention + ' ');
            } else {
                const newDescription = editedDescription.endsWith('@') ? editedDescription.slice(0, -1) + userMention + ' ' : editedDescription + ' ' + userMention + ' ';
                setEditedDescription(newDescription);
            }
        }
        
        // Close everything
        setShowUserSearch(false);
        setShowMentionMenu(false);
        setUserSearchText('');
        setUserSuggestions([]);
        setMentionTarget(null);
    };

    // Container list handlers (changed from search to list)
    const handleSelectContainer = () => {
        // Extract any text typed after @ (similar to web-app behavior)
        const currentText = mentionTarget === 'title' ? editedTitle : editedDescription;
        const mentionMatch = currentText.match(/@([A-Za-z0-9\s]*)$/);
        const typedText = mentionMatch ? mentionMatch[1].trim() : '';
        
        setShowMentionMenu(false);
        setShowContainerSearch(true);
        setContainerSearchText(''); // Clear search text - we're showing a list, not searching
        // Show all containers (already filtered by showId when loaded)
        setContainerSuggestions(allContainers);
    };

    const handleSelectContainerFromList = (container: {id: string, name: string}) => {
        const containerRef = `[@${container.name}](container:${container.id})`;
        if (mentionTarget === 'title') {
            // Replace @[typed text] with the container link (similar to web-app behavior)
            const mentionMatch = editedTitle.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedTitle.substring(0, editedTitle.length - mentionMatch[0].length);
                setEditedTitle(beforeMention + containerRef + ' ');
            } else {
                const newTitle = editedTitle.endsWith('@') ? editedTitle.slice(0, -1) + containerRef + ' ' : editedTitle + ' ' + containerRef + ' ';
                setEditedTitle(newTitle);
            }
        } else {
            // Replace @[typed text] with the container link (similar to web-app behavior)
            const mentionMatch = editedDescription.match(/@([A-Za-z0-9\s]*)$/);
            if (mentionMatch) {
                const beforeMention = editedDescription.substring(0, editedDescription.length - mentionMatch[0].length);
                setEditedDescription(beforeMention + containerRef + ' ');
            } else {
                const newDescription = editedDescription.endsWith('@') ? editedDescription.slice(0, -1) + containerRef + ' ' : editedDescription + ' ' + containerRef + ' ';
                setEditedDescription(newDescription);
            }
        }
        
        // Close everything
        setShowContainerSearch(false);
        setShowMentionMenu(false);
        setContainerSearchText('');
        setContainerSuggestions([]);
        setMentionTarget(null);
    };

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
        setMentionTarget(null);
    };

    // Function to render description with clickable links and mentions
    const renderDescriptionWithLinks = (description: string): React.ReactNode[] => {
        const propLinkRegex = /\[(@[^\]]+)\]\(prop:([^)]+)\)/g;
        const containerLinkRegex = /\[(@[^\]]+)\]\(container:([^)]+)\)/g;
        const userMentionRegex = /@(\w+)/g;
        
        const parts = [];
        let lastIndex = 0;
        const allMatches = [];

        // Find all prop links
        let match;
        propLinkRegex.lastIndex = 0;
        while ((match = propLinkRegex.exec(description)) !== null) {
            allMatches.push({
                type: 'prop',
                index: match.index,
                length: match[0].length,
                name: match[1],
                id: match[2]
            });
        }

        // Find all container links
        containerLinkRegex.lastIndex = 0;
        while ((match = containerLinkRegex.exec(description)) !== null) {
            allMatches.push({
                type: 'container',
                index: match.index,
                length: match[0].length,
                name: match[1],
                id: match[2]
            });
        }

        // Find all user mentions
        userMentionRegex.lastIndex = 0;
        while ((match = userMentionRegex.exec(description)) !== null) {
            allMatches.push({
                type: 'user',
                index: match.index,
                length: match[0].length,
                name: match[1],
                id: match[1]
            });
        }

        // Sort all matches by position
        allMatches.sort((a, b) => a.index - b.index);

        // Process each match
        allMatches.forEach((currentMatch) => {
            // Add text before the current match
            if (currentMatch.index > lastIndex) {
                parts.push(
                    <Text key={`text-${lastIndex}`} style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>
                        {description.slice(lastIndex, currentMatch.index)}
                    </Text>
                );
            }

            // Add the clickable element based on type
            if (currentMatch.type === 'prop') {
                parts.push(
                    <Pressable
                        key={`prop-${currentMatch.id}-${currentMatch.index}`}
                        onPress={() => {
                            Alert.alert("Prop Link", `Navigate to ${currentMatch.name.replace('@', '')} (ID: ${currentMatch.id})`);
                            // TODO: Add actual navigation logic here
                        }}
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}
                    >
                        <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '600' }}>
                            {currentMatch.name}
                        </Text>
                    </Pressable>
                );
            } else if (currentMatch.type === 'container') {
                parts.push(
                    <Pressable
                        key={`container-${currentMatch.id}-${currentMatch.index}`}
                        onPress={() => {
                            Alert.alert("Container Link", `Navigate to ${currentMatch.name.replace('@', '')} (ID: ${currentMatch.id})`);
                            // TODO: Add actual navigation logic here
                        }}
                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}
                    >
                        <Text style={{ color: '#A855F7', fontSize: 14, fontWeight: '600' }}>
                            {currentMatch.name}
                        </Text>
                    </Pressable>
                );
            } else if (currentMatch.type === 'user') {
                parts.push(
                    <Pressable
                        key={`user-${currentMatch.id}-${currentMatch.index}`}
                        onPress={() => {
                            Alert.alert("User Mention", `View ${currentMatch.name}'s profile`);
                            // TODO: Add actual navigation logic here
                        }}
                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}
                    >
                        <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '600' }}>
                            @{currentMatch.name}
                        </Text>
                    </Pressable>
                );
            }

            lastIndex = currentMatch.index + currentMatch.length;
        });

        // Add remaining text after the last match
        if (lastIndex < description.length) {
            parts.push(
                <Text key={`text-${lastIndex}`} style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>
                    {description.slice(lastIndex)}
                </Text>
            );
        }

        return parts.length > 0 ? parts : [
            <Text key="full-text" style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>
                {description}
            </Text>
        ];
    };



    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) { Alert.alert("Permission Required", "Photo access needed."); return; }
        // TODO: Update to ImagePicker.MediaType.IMAGE when available in your version
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
        if (!result.canceled && result.assets && result.assets.length > 0) setEditedImageUri(result.assets[0].uri);
    };
    const handleRemoveImage = () => setEditedImageUri(null);

    const handleSaveAll = async () => {
        if (!internalCard) return;
        const updates: Partial<CardData> = {};
        const trimmedTitle = editedTitle.trim();
        if (editingTitleState && trimmedTitle && trimmedTitle !== internalCard.title) { updates.title = trimmedTitle; }
        if (editingDescription && editedDescription !== (internalCard.description || '')) { updates.description = editedDescription; }
        const trimmedLinkUrl = editedLinkUrl.trim();
        if (trimmedLinkUrl !== (internalCard.linkUrl || '')) {
             if (trimmedLinkUrl && !trimmedLinkUrl.startsWith('http://') && !trimmedLinkUrl.startsWith('https://')){
                Alert.alert("Invalid Link", "URL must start with http(s)://"); return;
             }
             updates.linkUrl = trimmedLinkUrl || undefined;
        }
        const originalDueDate = parseDate(internalCard.dueDate)?.getTime();
        const newDueDate = selectedDueDate?.getTime();
        if (originalDueDate !== newDueDate) { updates.dueDate = selectedDueDate ? selectedDueDate.toISOString() : null; }
        if (editedImageUri !== internalCard.imageUrl) { updates.imageUrl = editedImageUri === null ? undefined : editedImageUri; }

        let listMoved = false;
        if (selectedListIdToMove && selectedListIdToMove !== internalCard.listId && selectedListIdToMove !== '__DELETE__') {
            try {
                await onMoveCard(internalCard.id, internalCard.listId, selectedListIdToMove);
                listMoved = true;
            } catch (error) { Alert.alert("Error", "Could not move card."); return; }
        }

        if (Object.keys(updates).length > 0) {
            try { await onUpdateCard(internalCard.id, internalCard.listId, updates); setInternalCard(prev => prev ? { ...prev, ...updates } : null); }
            catch (error) { Alert.alert("Error", "Could not update card."); return; }
        }
        resetLocalStateAndEditingModes(internalCard);
        if(listMoved) onClose();
    };

    const handleDelete = async () => {
        if (!internalCard) return;
        Alert.alert("Delete Card", `Delete "${internalCard.title}"?`,
            [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => {
                try { await onDeleteCard(internalCard.listId, internalCard.id); onClose(); }
                catch (error) { Alert.alert("Error", "Could not delete card."); }
            }}]
        );
    };
    const onDateChange = (newDate?: Date) => {
        setShowDatePicker(false);
        if (newDate) setSelectedDueDate(newDate);
    };
    const handleOpenLabelEditor = () => {
        setPickerAvailableLabels(propAvailableLabels); // Use the prop for initial available labels
        setShowLabelPicker(true);
    };
    const handleCloseLabelEditor = () => {
        setShowLabelPicker(false);
    };
    const handleSaveLabels = (updatedLabels: CardLabel[]) => {
        if (!internalCard) return;
        const newInternalCard = { ...internalCard, labels: updatedLabels };
        setInternalCard(newInternalCard);
        onUpdateCard(internalCard.id, internalCard.listId, { labels: updatedLabels });
        setShowLabelPicker(false);
    };
    const handleNewLabelCreated = (newLabel: CardLabel) => {
        setPickerAvailableLabels(prev => [...prev, newLabel]);
        // Optionally, if the parent component needs to know about new labels globally:
        // onCreateNewLabel?.(newLabel.name, newLabel.color);
    };
    const handleLabelUpdated = (updatedLabel: CardLabel) => {
        setPickerAvailableLabels(prev => prev.map(l => l.id === updatedLabel.id ? updatedLabel : l));
    };
    const handleLabelDeleted = (deletedLabelId: string) => {
        setPickerAvailableLabels(prev => prev.filter(l => l.id !== deletedLabelId));
    };
    const handleOpenMemberEditor = () => {
        // All show members are already passed to the picker directly from props
        // cardCurrentMembers will be internalCard.members
        setShowMemberPickerModal(true);
    };
    // This function will be called by MemberPicker when saving.
    const handleMemberPickerSave = (newSelectedMembers: MemberData[]) => {
        if (!internalCard) return;


        const updatedCard = { ...internalCard, members: newSelectedMembers };
        setInternalCard(updatedCard);

        onUpdateCard(internalCard.id, internalCard.listId, { members: newSelectedMembers });
        setShowMemberPickerModal(false); // Close the picker
    };
    // Placeholder if we allow creating new members from the picker itself and need to update allShowMembers
    const handleNewMemberCreatedInPicker = (newMember: MemberData) => {
        // This function would typically update the source of allShowMembers,
        // e.g., by calling a prop function passed down from the screen that fetches/manages all users.
        // For now, let's assume allShowMembers is managed externally or doesn't need immediate update here.

        // setAllAvailableMembersForPicker(prev => [...prev, newMember]); // If managing a local copy for picker
    };
    const handleAddComment = async () => {
        if (!isFirebaseInitialized || firebaseError || !newCommentText.trim() || !internalCard || !service.auth.currentUser) { Alert.alert("Error", "Cannot post comment."); return; }
        const currentUser = service.auth.currentUser!;
        const userName = currentUser.displayName || currentUser.email || 'Anonymous';
        const newComment: CommentData = { id: uuidv4(), userId: currentUser.uid, userName, userAvatarInitials: (userName[0] || 'U').toUpperCase(), text: newCommentText.trim(), createdAt: new Date().toISOString() };
        const updatedComments = [...(internalCard.comments || []), newComment];
        try {
            await onUpdateCard(internalCard.id, internalCard.listId, { comments: updatedComments });
            setInternalCard(prev => prev ? { ...prev, comments: updatedComments } : null);
            setNewCommentText('');
        } catch (error) {
            console.error('Error posting comment:', error);
            Alert.alert("Error", "Could not post comment.");
        }
    };

    const handleAddChecklist = async () => {
        if (!internalCard || !newChecklistTitle.trim()) { Alert.alert("Missing Info", "Checklist title needed."); return; }
        const newChecklist: ChecklistData = { id: uuidv4(), title: newChecklistTitle.trim(), items: [] };
        const updatedChecklists = [...(internalCard.checklists || []), newChecklist];
        try { await onUpdateCard(internalCard.id, internalCard.listId, { checklists: updatedChecklists }); setInternalCard(prev => prev ? { ...prev, checklists: updatedChecklists } : null); setNewChecklistTitle(''); }
        catch (e) { Alert.alert("Error", "Could not add checklist."); }
    };
    const handleToggleChecklistItem = async (checklistId: string, itemId: string) => {
        if (!internalCard) return;
        const updatedChecklists = (internalCard.checklists || []).map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item) } : cl );
        try { await onUpdateCard(internalCard.id, internalCard.listId, { checklists: updatedChecklists }); setInternalCard(prev => prev ? { ...prev, checklists: updatedChecklists } : null); }
        catch (e) { Alert.alert("Error", "Could not update item."); }
    };
    const handleAddChecklistItem = async (checklistId: string) => {
        if (!internalCard || !newChecklistItemTexts[checklistId]?.trim()) { Alert.alert("Missing Info", "Item text needed."); return; }
        const newItem: ChecklistItemData = { id: uuidv4(), text: newChecklistItemTexts[checklistId].trim(), completed: false };
        const updatedChecklists = (internalCard.checklists || []).map(cl => cl.id === checklistId ? { ...cl, items: [...cl.items, newItem] } : cl );
        try { await onUpdateCard(internalCard.id, internalCard.listId, { checklists: updatedChecklists }); setInternalCard(prev => prev ? { ...prev, checklists: updatedChecklists } : null); setNewChecklistItemTexts(prev => ({ ...prev, [checklistId]: '' })); }
        catch (e) { Alert.alert("Error", "Could not add item."); }
    };
    const validateUrlForAttachment = async (url: string): Promise<boolean> => { if (!url.startsWith('http://') && !url.startsWith('https://')) { setAttachmentError('URL must start with http(s)://'); return false; } setAttachmentError(null); return true; };
    const handleAddAttachment = () => {
        if (!internalCard) return;
        const newId = uuidv4();
        const newAttachment: AttachmentData = { id: newId, name: '', url: '', type: 'other' };
        setInternalCard(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), newAttachment] } : null);
        setAttachmentValidationStatus(prev => ({ ...prev, [newId]: 'idle' }));
        if (!editingTitleState && !editingDescription) setEditingDescription(true);
    };
    const handleRemoveAttachment = (attachmentId: string) => {
        if (!internalCard) return;
        setInternalCard(prev => prev ? { ...prev, attachments: (prev.attachments || []).filter(att => att.id !== attachmentId) } : null);
        setAttachmentValidationStatus(prev => { const newState = {...prev}; delete newState[attachmentId]; return newState; });
    };
    const handleAttachmentChange = async (attachmentId: string, field: keyof AttachmentData, value: string) => {
        if (!internalCard) return;
        const updatedAttachments = (internalCard.attachments || []).map(att => {
            if (att.id === attachmentId) {
                let type: AttachmentData['type'] = att.type;
                if (field === 'url') {
                    if (value.includes('docs.google.com') || value.includes('drive.google.com')) type = 'document';
                    else if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) type = 'image';
                    else if (value.match(/\.(mp4|mov|avi|webm|mkv)$/i)) type = 'video';
                    else type = 'other';
                }
                const updatedAtt = { ...att, [field]: value, type };
                if (field === 'url' && value.trim()) {
                    setAttachmentValidatingId(attachmentId); setAttachmentError(null); setAttachmentValidationStatus(prev => ({ ...prev, [attachmentId]: 'pending' }));
                    validateUrlForAttachment(value).then(isValid => {
                        setAttachmentValidationStatus(prev => ({ ...prev, [attachmentId]: isValid ? 'valid' : 'invalid' }));
                        if (!isValid && !attachmentError) setAttachmentError('Invalid URL.');
                        setAttachmentValidatingId(null);
                    });
                } else if (field === 'url' && !value.trim()) { setAttachmentValidationStatus(prev => ({ ...prev, [attachmentId]: 'idle' })); setAttachmentError(null); }
                return updatedAtt;
            }
            return att;
        });
        setInternalCard(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
    };
    const renderActivityOrCommentItem = ({ item }: { item: CommentData | ActivityData }) => {
        const isComment = (item as CommentData).createdAt !== undefined;
        const initials = isComment ? (item as CommentData).userAvatarInitials || 'U' : 'A';
        const name = isComment ? (item as CommentData).userName : 'Activity';
        const date = isComment ? (item as CommentData).createdAt : (item as ActivityData).date;
        return (
            <View style={styles.commentItemContainer}>
                <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{initials}</Text></View>
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentUserName}>{name}</Text>
                        <Text style={styles.commentDate}>{new Date(date).toLocaleString()}</Text>
                    </View>
                    {isComment ? (
                        <Text style={styles.commentText}>{(item as CommentData).text}</Text>
                    ) : (
                        <Text style={[styles.commentText, { fontStyle: 'italic', color: currentThemeColors.textSecondary }]}> {(item as ActivityData).text}</Text>
                    )}
                </View>
            </View>
        );
    };

    const listName = useMemo(() => lists.find(l => l.id === internalCard?.listId)?.name || 'Unknown List', [lists, internalCard?.listId]);

        const isAnyFieldEditing = editingTitleState || editingDescription;
    const showEditControlsForOtherSections = editingTitleState; // Only show other edit controls when editing title, not description

    // Ensure members is an array before using .find()
    const safeMembers = allShowMembers || [];

    const getMemberDetails = useCallback((memberId: string) => {
        return safeMembers.find(m => m.id === memberId);
    }, [safeMembers]);

    const assignedMembers = useMemo(() => {
        if (!internalCard?.assignedTo) return [];
        return internalCard.assignedTo.map(getMemberDetails).filter(Boolean) as MemberData[];
    }, [internalCard?.assignedTo, getMemberDetails]);
    
    const unassignedMembers = useMemo(() => {
        if (!internalCard?.assignedTo) return safeMembers;
        return safeMembers.filter(m => !internalCard.assignedTo?.includes(m.id));
    }, [internalCard?.assignedTo, safeMembers]);

    // 1. Add completed state to the card (local state for now)
    const [completed, setCompleted] = useState(false);
    const [addMenuVisible, setAddMenuVisible] = useState(false);
    useEffect(() => { setCompleted(!!internalCard?.completed); }, [internalCard]);

    // Add a helper to get all images for the card
    const cardImages = useMemo(() => {
        if (internalCard?.images && Array.isArray(internalCard.images) && internalCard.images.length > 0) {
            return internalCard.images;
        }
        if (internalCard?.imageUrl) {
            return [internalCard.imageUrl];
        }
        if (editedImageUri) {
            return [editedImageUri];
        }
        return [];
    }, [internalCard, editedImageUri]);
    const [carouselIndex, setCarouselIndex] = useState(0);

    // Move parseDate inside the component
    const parseDate = (dateValue: string | CustomTimestamp | undefined | null): Date | null => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string') return new Date(dateValue);
        if (dateValue && typeof (dateValue as CustomTimestamp).toDate === 'function') {
            return (dateValue as CustomTimestamp).toDate();
        }
        return null;
    };

    // State for toggling activity log visibility
    const [showActivity, setShowActivity] = useState(true);

    // Add state for contextual menu

    if (!internalCard) return null;

    const currentList = lists.find(l => l.id === internalCard.listId);

    // 2. Add addMenu state for the '+ Add' menu
    const addMenuOptions = [
        { label: 'Dates', icon: 'calendar-outline', onPress: () => {/* TODO: open date picker */} },
        { label: 'Checklist', icon: 'checkbox-outline', onPress: () => {/* TODO: open checklist add */} },
        { label: 'Members', icon: 'person-outline', onPress: handleOpenMemberEditor },
        { label: 'Attachment', icon: 'attach-outline', onPress: () => {/* TODO: open attachment add */} },
    ];

    // Add contextual menu component


    return (
        <Modal transparent={true} visible={isVisible} animationType="fade" onRequestClose={onClose}>
            <LinearGradient
                colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
                locations={[0, 0.2, 0.5, 0.8, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 20 }}
            >
                <View style={[styles.panel, { backgroundColor: 'rgba(20,22,30,0.98)' }]} {...panResponder.panHandlers}>
                    {/* Navigation indicators */}
                    {allCards.length > 1 && (
                        <View style={{ position: 'absolute', top: -35, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6 }}>
                                <Ionicons name="chevron-back" size={16} color={canSwipeLeft ? "#fff" : "#666"} />
                                <Text style={{ color: '#fff', fontSize: 14, marginHorizontal: 8 }}>
                                    {currentCardIndex + 1} of {allCards.length}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={canSwipeRight ? "#fff" : "#666"} />
                            </View>
                        </View>
                    )} 
                <ScrollView style={[styles.modalContent,{padding:0}]}>
                    {cardImages.length > 0 && (
                        <View style={{ position: 'relative', marginBottom: 6,padding:0 }}>
                            
                                {cardImages.map((img: string, idx: number) => (
                                    <Image
                                        key={img + idx}
                                        source={{ uri: img }}
                                        style={{
                                            width: '100%',
                                            height: 180,
                                            borderTopLeftRadius: 10,
                                            borderTopRightRadius: 10,
                                            borderBottomLeftRadius: 0,
                                            borderBottomRightRadius: 0,
                                            marginRight: 0,
                                            alignSelf: 'stretch',
                                        }}
                                        resizeMode="cover"
                                    />
                                ))}
                           
                            {/* Add/Edit image button (pencil if image exists, plus if not) */}
                            <Pressable onPress={pickImage} style={{ position: 'absolute', top: 8, right: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 4 }}>
                                <Ionicons name={cardImages.length > 0 ? 'pencil' : 'add'} size={20} color="#fff" />
                            </Pressable>
                            {/* Carousel indicators */}
                            {cardImages.length > 1 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                                    {cardImages.map((_: string, idx: number) => (
                                        <View key={idx} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: carouselIndex === idx ? '#fff' : 'rgba(255,255,255,0.3)', marginHorizontal: 3 }} />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                    {/* Top Right Controls - FIXED POSITION */}
                    <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 }}>
                        <Pressable onPress={handleDelete} style={{ marginRight: 8 }}>
                            <Ionicons name="trash" size={22} color="#e57373" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} />
                        </Pressable>
                        <Pressable onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="close" size={22} color="#bdbdbd" />
                        </Pressable>
                    </View>

                    {/* Action buttons row - REMOVED CHECKLIST AND MEMBERS */}
                    <View style={{ marginBottom: 18, paddingHorizontal: 10, paddingTop: 6 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Pressable onPress={() => setAddMenuVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 }}>
                                <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#fff', fontSize: 14 }}>Add</Text>
                            </Pressable>
                            
                            <Pressable onPress={handleOpenLabelEditor} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 }}>
                                <Ionicons name="pricetag" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#fff', fontSize: 14 }}>Labels</Text>
                            </Pressable>
                            
                            <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 }}>
                                <Ionicons name="calendar" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#fff', fontSize: 14 }}>Dates</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Line separator - MOVED ABOVE DUE DATE */}
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 0, marginHorizontal: 10 }} />

                    {/* Due date display - INLINE WITH LABEL */}
                    {selectedDueDate && (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#23272f', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, width: '100%' }}>
                                <Text style={{ color: currentThemeColors.textSecondary, fontSize: 12, marginRight: 8 }}>Due date</Text>
                                <Text style={{ color: '#fff', fontSize: 14, marginRight: 4 }}>
                                    {selectedDueDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#bdbdbd" />
                            </View>
                        </View>
                    )}

                    {/* Card Title Header - CIRCLE INLINE WITH FIRST ROW */}
                    <View style={{ paddingHorizontal: 10, paddingVertical: 12, paddingRight: 40 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Pressable
                                onPress={async () => {
                                    const newCompleted = !completed;
                                    setCompleted(newCompleted);
                                    if (internalCard) {
                                        const currentUser = user;
                                        const activity: ActivityData = {
                                            id: uuidv4(),
                                            text: newCompleted ? 'marked this card as complete' : 'marked this card as incomplete',
                                            date: new Date().toISOString(),
                                        };
                                        const updatedActivity = [...(internalCard.activity || []), activity];
                                        await onUpdateCard(internalCard.id, internalCard.listId, { completed: newCompleted, activity: updatedActivity });
                                        setInternalCard(prev => prev ? { ...prev, completed: newCompleted, activity: updatedActivity } : null);
                                        // --- Prop status sync ---
                                        if (newCompleted && internalCard.propId && service) {
                                            try {
                                                await service.updateDocument('props', internalCard.propId, { status: 'repaired_back_in_show' });
                                            } catch (err) {
                                                console.error('Failed to update prop status from card completion:', err);
                                            }
                                        }
                                    }
                                }}
                                style={{ marginRight: 12, marginTop: 2 }}
                                accessibilityLabel={completed ? 'Mark incomplete' : 'Mark complete'}
                                accessibilityRole="button"
                            >
                                <Ionicons name={completed ? 'checkmark-circle' : 'ellipse-outline'} size={32} color={completed ? '#4caf50' : '#bdbdbd'} />
                            </Pressable>
                            <View style={{ flex: 1 }}>
                                {editingTitleState ? (
                                    <TextInput style={[styles.input, { color: '#fff', fontWeight: 'bold', fontSize: 20, lineHeight: 26, width: '100%' }]} value={editedTitle} onChangeText={(text) => {
                                        setEditedTitle(text);
                                        
                                        // Close mention menu if space, period, or comma is typed (similar to web-app behavior)
                                        if (showMentionMenu && !showPropSearch && !showUserSearch && !showContainerSearch) {
                                            if (text.endsWith(' ') || text.endsWith('.') || text.endsWith(',')) {
                                                setShowMentionMenu(false);
                                                setMentionTarget(null);
                                                return;
                                            }
                                        }
                                        
                                        // Quick-create @P:Name inside title
                                        const quickCreateMatch = text.match(/@P:([^\n]+)$/);
                                        if (quickCreateMatch && quickCreateMatch[1].trim()) {
                                            const name = quickCreateMatch[1].trim();
                                            (async () => {
                                                const created = await createBasicProp(name);
                                                if (created) {
                                                    const propLink = `[@${created.name}](prop:${created.id})`;
                                                    const newTitle = text.replace(/@P:[^\n]+$/, propLink + ' ');
                                                    setEditedTitle(newTitle);
                                                }
                                            })();
                                            return;
                                        }
                                        if (!showMentionMenu && !showPropSearch && !showUserSearch && !showContainerSearch) {
                                            if (text.endsWith('@user ') || text.endsWith('@user')) {
                                                setMentionTarget('title');
                                                setShowUserSearch(true);
                                                setUserSearchText('');
                                                setUserSuggestions(allShowMembers || []);
                                            } else if (text.endsWith('@prop ') || text.endsWith('@prop')) {
                                                setMentionTarget('title');
                                                setShowPropSearch(true);
                                                setPropSearchText('');
                                                setPropSuggestions(allProps);
                                            } else if (text.endsWith('@box ') || text.endsWith('@box')) {
                                                setMentionTarget('title');
                                                setShowContainerSearch(true);
                                                setContainerSearchText('');
                                                setContainerSuggestions(allContainers);
                                            } else if (text.endsWith('@') && !text.endsWith('@@')) {
                                                setMentionTarget('title');
                                                setShowMentionMenu(true);
                                            }
                                        }
                                    }} placeholder="Card Title" onBlur={async () => {
                                        // prevent saving while mention popovers open
                                        if (showMentionMenu || showPropSearch || showUserSearch || showContainerSearch) return;
                                        await handleSaveTitle();
                                    }} autoFocus placeholderTextColor={currentThemeColors.textSecondary}/>
                                ) : (
                                    <Pressable onPress={handleEditTitle} style={{ width: '100%' }}>
                                        <Text style={[styles.title, { fontSize: 20, lineHeight: 26, fontWeight: 'bold' }, completed && { textDecorationLine: 'line-through', color: currentThemeColors.textSecondary }]}>{internalCard.title}</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </View>
                    
                        {/* Labels display */}
                        {internalCard.labels && internalCard.labels.length > 0 && (
                            <View style={[styles.section, {paddingHorizontal:10}]}>
                                <View style={[styles.labelsContainer, { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }]}> 
                                    {internalCard.labels?.map(label => (
                                        <View key={label.id} style={[styles.labelChip, { backgroundColor: label.color || currentThemeColors.primary, marginRight: 8, marginBottom: 4 }]}> 
                                            <Text style={styles.labelText}>{label.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Members display - only show if there are members */}
                        {internalCard.members && internalCard.members.length > 0 && (
                            <View style={[styles.section,{paddingHorizontal:10}]}>
                                <View style={styles.membersContainer}>
                                    {internalCard.members?.map(member => (
                                        <View key={member.id} style={styles.memberChip}>
                                            <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{member.avatarInitials || 'N/A'}</Text></View><Text style={styles.memberName}>{member.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        
                        {/* Description section */}
                        <View style={[styles.section,{paddingHorizontal:10}]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <Ionicons name="book-outline" size={16} color={currentThemeColors.textSecondary} style={{ marginRight: 8 }} />
                            </View>
                            {editingDescription ? (
                                <TextInput
                                    style={[{ 
                                        minHeight: 80, 
                                        color: '#fff', 
                                        fontSize: 14,
                                        backgroundColor: '#374151',
                                        borderRadius: 6,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderWidth: 2,
                                        borderColor: '#3B82F6',
                                        textAlignVertical: 'top'
                                    }]}
                                                                            placeholder="Add a more detailed description..."
                                        value={editedDescription}
                                        onChangeText={handleDescriptionChange}
                                        onBlur={handleSaveDescription}
                                    multiline
                                    autoFocus
                                    placeholderTextColor={currentThemeColors.textSecondary}
                                />
                            ) : (
                                <Pressable 
                                    onPress={handleEditDescription} 
                                    style={({ pressed }) => ({ 
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 6,
                                        backgroundColor: pressed ? '#374151' : '#2D3748',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        minHeight: 80
                                    })}
                                >
                                    {internalCard?.description ? (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {renderDescriptionWithLinks(internalCard.description)}
                                        </View>
                                    ) : (
                                        <Text style={[styles.descriptionText, { color: currentThemeColors.textSecondary, fontStyle: 'italic', fontSize: 14 }]}>
                                            Add a more detailed description...
                                        </Text>
                                    )}
                                </Pressable>
                            )}
                            


                            {/* Mention Menu - Modal on mobile for better touch handling */}
                            {showMentionMenu && (
                                <Modal
                                    visible={showMentionMenu}
                                    transparent={true}
                                    animationType="fade"
                                    onRequestClose={closeMentionSystem}
                                >
                                    <Pressable 
                                        style={{ 
                                            flex: 1, 
                                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                        onPress={closeMentionSystem}
                                    >
                                        <Pressable 
                                            style={{
                                                backgroundColor: '#fff',
                                                borderRadius: 12,
                                                padding: 16,
                                                width: '80%',
                                                maxWidth: 300,
                                                elevation: 8,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 8,
                                            }}
                                            onPress={(e) => e.stopPropagation()}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#000' }}>
                                                    Mention Type
                                                </Text>
                                                <Pressable
                                                    onPress={closeMentionSystem}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                    style={{ padding: 4 }}
                                                >
                                                    <Ionicons name="close" size={24} color="#666" />
                                                </Pressable>
                                            </View>
                                            <Pressable
                                                onPress={handleSelectProp}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={({ pressed }) => ({ 
                                                    padding: 16, 
                                                    borderBottomWidth: 1, 
                                                    borderBottomColor: '#eee',
                                                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                                                    borderRadius: 8,
                                                    marginBottom: 4
                                                })}
                                            >
                                                <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>Prop</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={handleSelectContainer}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={({ pressed }) => ({ 
                                                    padding: 16, 
                                                    borderBottomWidth: 1, 
                                                    borderBottomColor: '#eee',
                                                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                                                    borderRadius: 8,
                                                    marginBottom: 4
                                                })}
                                            >
                                                <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>Box/Container</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={handleAssignToUser}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={({ pressed }) => ({ 
                                                    padding: 16, 
                                                    borderBottomWidth: 1, 
                                                    borderBottomColor: '#eee',
                                                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                                                    borderRadius: 8,
                                                    marginBottom: 4
                                                })}
                                            >
                                                <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>Assign to User</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={handleSelectUser}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={({ pressed }) => ({ 
                                                    padding: 16,
                                                    backgroundColor: pressed ? '#f5f5f5' : 'transparent',
                                                    borderRadius: 8
                                                })}
                                            >
                                                <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>Mention User</Text>
                                            </Pressable>
                                        </Pressable>
                                    </Pressable>
                                </Modal>
                            )}
                            
                            {/* Prop Search Interface */}
                            {showPropSearch && (
                                <View style={{
                                    marginTop: 8,
                                    backgroundColor: '#374151',
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    padding: 12
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Ionicons name="cube" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>
                                            Search Props:
                                        </Text>
                                        <Pressable 
                                            onPress={closeMentionSystem} 
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={{ padding: 8 }}
                                        >
                                            <Ionicons name="close" size={20} color="#9CA3AF" />
                                        </Pressable>
                                    </View>
                                    <TextInput
                                        style={{
                                            backgroundColor: '#2D3748',
                                            borderRadius: 4,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            color: '#fff',
                                            fontSize: 14,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            marginBottom: 8
                                        }}
                                        placeholder="Type to search props..."
                                        placeholderTextColor="#9CA3AF"
                                        value={propSearchText}
                                        onChangeText={handlePropSearchChange}
                                        autoFocus
                                    />
                                    
                                    {/* Prop Suggestions */}
                                    {propSuggestions.length > 0 && (
                                        <View style={{
                                            backgroundColor: '#2D3748',
                                            borderRadius: 4,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            maxHeight: 150
                                        }}>
                                            <ScrollView style={{ maxHeight: 150 }}>
                                                {propSuggestions.map((prop) => (
                                                    <Pressable
                                                        key={prop.id}
                                                        onPress={() => handleSelectPropFromList(prop)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        style={({ pressed }) => ({
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 12,
                                                            backgroundColor: pressed ? '#4B5563' : 'transparent',
                                                            borderBottomWidth: prop.id !== propSuggestions[propSuggestions.length - 1].id ? 1 : 0,
                                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                                            minHeight: 44 // Better touch target for mobile
                                                        })}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="cube" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                                                            <Text style={{ color: '#fff', fontSize: 14 }}>
                                                                {prop.name}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            )}
                            
                            {/* User Search Interface */}
                            {showUserSearch && (
                                <View style={{
                                    marginTop: 8,
                                    backgroundColor: '#374151',
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    padding: 12
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Ionicons name="person" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>
                                            Search Users:
                                        </Text>
                                        <Pressable 
                                            onPress={closeMentionSystem} 
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={{ padding: 8 }}
                                        >
                                            <Ionicons name="close" size={20} color="#9CA3AF" />
                                        </Pressable>
                                    </View>
                                    <TextInput
                                        style={{
                                            backgroundColor: '#2D3748',
                                            borderRadius: 4,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            color: '#fff',
                                            fontSize: 14,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            marginBottom: 8
                                        }}
                                        placeholder="Type to search users..."
                                        placeholderTextColor="#9CA3AF"
                                        value={userSearchText}
                                        onChangeText={handleUserSearchChange}
                                        autoFocus
                                    />
                                    
                                    {/* User Suggestions */}
                                    {userSuggestions.length > 0 && (
                                        <View style={{
                                            backgroundColor: '#2D3748',
                                            borderRadius: 4,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            maxHeight: 150
                                        }}>
                                            <ScrollView style={{ maxHeight: 150 }}>
                                                {userSuggestions.map((user) => (
                                                    <Pressable
                                                        key={user.id}
                                                        onPress={() => handleSelectUserFromList(user)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        style={({ pressed }) => ({
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 12,
                                                            backgroundColor: pressed ? '#4B5563' : 'transparent',
                                                            borderBottomWidth: user.id !== userSuggestions[userSuggestions.length - 1].id ? 1 : 0,
                                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                                            minHeight: 44 // Better touch target for mobile
                                                        })}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="person" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                                                            <Text style={{ color: '#fff', fontSize: 14 }}>
                                                                {user.name}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            )}
                            
                            {/* Container List Interface (changed from search to list) */}
                            {showContainerSearch && (
                                <View style={{
                                    marginTop: 8,
                                    backgroundColor: '#374151',
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    padding: 12
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Ionicons name="archive" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>
                                            Select Container:
                                        </Text>
                                        <Pressable 
                                            onPress={closeMentionSystem} 
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={{ padding: 8 }}
                                        >
                                            <Ionicons name="close" size={20} color="#9CA3AF" />
                                        </Pressable>
                                    </View>
                                    
                                    {/* Container List (all containers for the show, no search) */}
                                    {containerSuggestions.length > 0 ? (
                                        <View style={{
                                            backgroundColor: '#2D3748',
                                            borderRadius: 4,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            maxHeight: 200
                                        }}>
                                            <ScrollView style={{ maxHeight: 200 }}>
                                                {containerSuggestions.map((container) => (
                                                    <Pressable
                                                        key={container.id}
                                                        onPress={() => handleSelectContainerFromList(container)}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                        style={({ pressed }) => ({
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 12,
                                                            backgroundColor: pressed ? '#4B5563' : 'transparent',
                                                            borderBottomWidth: container.id !== containerSuggestions[containerSuggestions.length - 1].id ? 1 : 0,
                                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                                            minHeight: 44 // Better touch target for mobile
                                                        })}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="archive" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                                                            <Text style={{ color: '#fff', fontSize: 14 }}>
                                                                {container.name}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    ) : (
                                        <View style={{ padding: 16, alignItems: 'center' }}>
                                            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                                                No containers found for this show
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {(internalCard.linkUrl || showEditControlsForOtherSections) && (
                            <View style={[styles.section,{paddingHorizontal:10}]}>
                                <Text style={styles.sectionTitle}><Ionicons name="link" size={18} color="#fff" /> Link</Text>
                                {showEditControlsForOtherSections ? (
                                    <TextInput style={styles.linkInput} value={editedLinkUrl} onChangeText={setEditedLinkUrl} placeholder="https://..." keyboardType="url" autoCapitalize="none" placeholderTextColor={currentThemeColors.textSecondary}/>
                                ) : (
                                    internalCard.linkUrl ? (
                                        <Pressable onPress={async () => { if (internalCard.linkUrl) { try { if(await Linking.canOpenURL(internalCard.linkUrl)) await Linking.openURL(internalCard.linkUrl); else Alert.alert("Error", `Cannot open: ${internalCard.linkUrl}`); } catch (e) { Alert.alert("Error", "Link error."); } } }}><Text style={{color: currentThemeColors.primary}}>{internalCard.linkUrl}</Text></Pressable>
                                    ) : null
                                )}
                            </View>
                        )}

                        {showEditControlsForOtherSections && (
                            <View style={[styles.section, styles.pickerSection,{paddingHorizontal:10}]}>
                                <Ionicons name="move" size={20} color={currentThemeColors.textSecondary} style={styles.icon} />
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedListIdToMove}
                                        onValueChange={(itemValue) => {
                                            if (itemValue) {
                                                setSelectedListIdToMove(itemValue);
                                                handleMoveCardRequest(itemValue);
                                            }
                                        }}
                                        style={[styles.picker, { color: currentThemeColors.text }]}
                                        itemStyle={{ color: currentThemeColors.text, backgroundColor: currentThemeColors.background }}
                                    >
                                        <Picker.Item label="Move to..." value="" enabled={false} />
                                        {lists.map(list => (
                                            <Picker.Item key={list.id} label={list.name} value={list.id} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                        )}

                        {/* Checklists display - only show if there are checklists */}
                        {internalCard?.checklists && internalCard.checklists.length > 0 && (
                            <View style={[styles.section,{paddingHorizontal:10}]}>
                                {(internalCard?.checklists || []).map(cl => { const comp = cl.items.filter(i=>i.completed).length; const tot = cl.items.length; const prog = tot>0?(comp/tot)*100:0; return (
                                    <View key={cl.id} style={styles.checklistContainer}>
                                        <Text style={[styles.sectionTitle, {textTransform:'none', fontSize:16, marginBottom:4}]}>{cl.title}</Text>
                                        {tot>0 && (<View style={styles.checklistProgressBarContainer}><View style={[styles.checklistProgressBar, {width:`${prog}%`}]} /></View>)}
                                        {cl.items.map(item => (<TouchableOpacity key={item.id} onPress={()=>showEditControlsForOtherSections && handleToggleChecklistItem(cl.id,item.id)} disabled={!showEditControlsForOtherSections} style={styles.checklistItem}><Ionicons name={item.completed?"checkbox-outline":"square-outline"} size={24} color={showEditControlsForOtherSections?currentThemeColors.primary:currentThemeColors.textSecondary} /><Text style={[styles.checklistItemText,item.completed&&styles.checklistItemTextCompleted]}>{item.text}</Text></TouchableOpacity>))}
                                    </View>
                                );})}
                            </View>
                        )}

                        {((internalCard?.attachments && internalCard.attachments.length > 0) || showEditControlsForOtherSections) && (
                            <View style={[styles.section,{paddingHorizontal:10}]}>
                                <Text style={styles.sectionTitle}><Ionicons name="attach-outline" size={20} color="#fff" />Attachments</Text>
                                {showEditControlsForOtherSections && (<TouchableOpacity onPress={handleAddAttachment} style={styles.addAttachmentButton}><Ionicons name="attach-outline" size={20} color={currentThemeColors.text} /><Text style={styles.addAttachmentButtonText}>Add Link</Text></TouchableOpacity>)}
                                 {attachmentError && showEditControlsForOtherSections && <Text style={styles.attachmentErrorText}>{attachmentError}</Text>}
                                {(internalCard?.attachments || []).map(att => { const stat=attachmentValidationStatus[att.id]|| 'idle'; let icon:any='document-text-outline'; if(att.type==='image')icon='image-outline';else if(att.type==='video')icon='film-outline';else if(att.url?.match(/youtube|youtu.be|vimeo/))icon='logo-youtube'; return (
                                    <View key={att.id} style={styles.attachmentItem}>
                                        {showEditControlsForOtherSections ? (<React.Fragment><TextInput style={styles.attachmentInput} placeholder="Name" value={att.name} onChangeText={t=>handleAttachmentChange(att.id,'name',t)} /><TextInput style={styles.attachmentInput} placeholder="URL" value={att.url} onChangeText={t=>handleAttachmentChange(att.id,'url',t)} keyboardType="url" autoCapitalize="none"/></React.Fragment>)
                                        : (<Pressable onPress={async()=>{if(att.url){try{if(await Linking.canOpenURL(att.url))await Linking.openURL(att.url);else Alert.alert("Error",`Cannot open: ${att.url}`);}catch(e){Alert.alert("Error","Link error.");}}else Alert.alert("No URL");}} style={styles.attachmentLinkRow}><Ionicons name={icon} size={22} color={currentThemeColors.text} style={styles.attachmentTypeIcon}/><Text style={styles.attachmentNameText} numberOfLines={1}>{att.name||att.url}</Text>{att.url&&<Ionicons name="open-outline" size={20} color={currentThemeColors.primary}/>}</Pressable>)}
                                        {showEditControlsForOtherSections&&stat==='pending'&&attachmentValidatingId===att.id&&<ActivityIndicator size="small" color={currentThemeColors.primary}/>}
                                        {showEditControlsForOtherSections&&stat==='invalid'&&<Text style={styles.attachmentErrorText}>Invalid URL.</Text>}
                                        {showEditControlsForOtherSections&&(<Pressable onPress={()=>handleRemoveAttachment(att.id)} style={{alignSelf:'flex-end',padding:5}}><Ionicons name="trash-bin-outline" size={20} color={currentThemeColors.error}/></Pressable>)}
                                    </View>
                                );})}
                            </View>
                        )}

                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 18,paddingHorizontal:10 }} />
                        <View style={[styles.section,{paddingHorizontal:10}]}>
                            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                                <Text style={styles.sectionTitle}><Ionicons name="newspaper-outline" size={15} color="#fff" /> Comments and activity</Text>
                                <Pressable onPress={() => setShowActivity(v => !v)} style={{paddingHorizontal:10,paddingVertical:4}}>
                                    <Text style={{color: currentThemeColors.primary, fontWeight:'bold'}}>{showActivity ? 'Hide details' : 'Show details'}</Text>
                                </Pressable>
                            </View>
                            <View style={styles.commentInputContainer}><TextInput style={[styles.commentInput,(!isFirebaseInitialized||firebaseError)&&styles.disabledInput]} placeholder={isFirebaseInitialized? "Comment...": "Initializing..."} value={newCommentText} onChangeText={setNewCommentText} multiline editable={isFirebaseInitialized&&!firebaseError} placeholderTextColor={currentThemeColors.textSecondary}/><TouchableOpacity onPress={handleAddComment} style={[styles.commentPostButton,(!isFirebaseInitialized||firebaseError)&&styles.disabledButton]} disabled={!isFirebaseInitialized||!!firebaseError}><Text style={styles.commentPostButtonText}>Post</Text></TouchableOpacity></View>
                            <View style={styles.commentListContainer}>
                                {(() => {
                                    let items: (CommentData | ActivityData)[] = [];
                                    if (showActivity) {
                                        items = [ ...(internalCard?.activity || []), ...(internalCard?.comments || []) ];
                                    } else {
                                        items = [ ...(internalCard?.comments || []) ];
                                    }
                                    if (!items.length) return <Text style={styles.imagePlaceholderText}>{showActivity ? 'No comments or activity.' : 'No comments.'}</Text>;
                                    return items
                                        .sort((a, b) => {
                                            const dateA = (a as any).createdAt || (a as any).date;
                                            const dateB = (b as any).createdAt || (b as any).date;
                                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                                        })
                                        .map(item => <View key={item.id}>{renderActivityOrCommentItem({ item })}</View>);
                                })()}
                            </View>
                        </View>

                    </ScrollView>
                </View>
            </LinearGradient>
            {showLabelPicker && (
                <LabelPicker
                    isVisible={showLabelPicker}
                    allLabels={pickerAvailableLabels}
                    selectedLabels={internalCard.labels || []}
                    onClose={handleCloseLabelEditor}
                    onSave={handleSaveLabels}
                    onNewLabelCreated={handleNewLabelCreated}
                    onLabelUpdated={handleLabelUpdated}
                    onLabelDeleted={handleLabelDeleted}
                />
            )}
            {showMemberPickerModal && (
                <MemberPicker
                    isVisible={showMemberPickerModal}
                    allUsers={allShowMembers}
                    cardCurrentMembers={internalCard.members || []}
                    onClose={() => setShowMemberPickerModal(false)}
                    onSaveMembers={handleMemberPickerSave}
                />
            )}
            {addMenuVisible && (
                <Modal transparent animationType="fade" visible={addMenuVisible} onRequestClose={() => setAddMenuVisible(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#23272f', borderRadius: 18, padding: 18, width: 320, maxWidth: '90%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Add to card</Text>
                                <Pressable onPress={() => setAddMenuVisible(false)}>
                                    <Ionicons name="close" size={22} color="#bdbdbd" />
                                </Pressable>
                            </View>
                            {addMenuOptions.map(opt => (
                                <Pressable key={opt.label} onPress={() => { setAddMenuVisible(false); opt.onPress(); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: 8, marginBottom: 2 }}>
                                    <Ionicons name={opt.icon as any} size={22} color="#bdbdbd" style={{ marginRight: 14 }} />
                                    <View>
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{opt.label}</Text>
                                        {/* Optionally add a subtitle here */}
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </Modal>
            )}
            {/* Date picker modal still works as before */}
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                        <DatePicker
                            date={selectedDueDate || new Date()}
                            mode="date"
                            onDateChange={date => onDateChange(date)}
                        />
                        <Button title="Cancel" onPress={() => setShowDatePicker(false)} />
                    </View>
                </View>
            </Modal>

            
            {/* Main Navigation */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 70,
                backgroundColor: 'rgba(35, 39, 47, 0.95)',
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-around',
                paddingBottom: 10
            }}>
                <Pressable onPress={() => {
                    onClose();
                    // Navigate to home after closing
                    setTimeout(() => {
                        require('expo-router').router.navigate('/(tabs)');
                    }, 100);
                }} style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                }}>
                    <Ionicons name="home" size={24} color="#c084fc" />
                    <Text style={{ color: '#c084fc', fontSize: 12, marginTop: 2 }}>Home</Text>
                </Pressable>
                <Pressable onPress={() => {
                    onClose();
                    setTimeout(() => {
                        require('expo-router').router.navigate('/(tabs)/props');
                    }, 100);
                }} style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                }}>
                    <Ionicons name="cube" size={24} color="#a3a3a3" />
                    <Text style={{ color: '#a3a3a3', fontSize: 12, marginTop: 2 }}>Props</Text>
                </Pressable>
                <Pressable onPress={() => {
                    onClose();
                    setTimeout(() => {
                        require('expo-router').router.navigate('/(tabs)/shows');
                    }, 100);
                }} style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                }}>
                    <Ionicons name="film" size={24} color="#a3a3a3" />
                    <Text style={{ color: '#a3a3a3', fontSize: 12, marginTop: 2 }}>Shows</Text>
                </Pressable>
                <Pressable onPress={() => {
                    onClose();
                    setTimeout(() => {
                        require('expo-router').router.navigate('/(tabs)/packing');
                    }, 100);
                }} style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                }}>
                    <Ionicons name="cube-outline" size={24} color="#a3a3a3" />
                    <Text style={{ color: '#a3a3a3', fontSize: 12, marginTop: 2 }}>Packing</Text>
                </Pressable>
                <Pressable onPress={() => {
                    onClose();
                    setTimeout(() => {
                        require('expo-router').router.navigate('/(tabs)/profile');
                    }, 100);
                }} style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                }}>
                    <Ionicons name="person" size={24} color="#a3a3a3" />
                    <Text style={{ color: '#a3a3a3', fontSize: 12, marginTop: 2 }}>Profile</Text>
                </Pressable>
            </View>
        </Modal>
    );
};

export default CardDetailPanel;
