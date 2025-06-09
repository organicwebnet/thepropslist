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
    Button
} from 'react-native';

// import Colors from '../constants/Colors'; // OLD
import { useTheme } from '../../contexts/ThemeContext'; // NEW
import { lightTheme, darkTheme } from '../../styles/theme.ts'; // Import theme objects

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
// import { Timestamp } from 'firebase/firestore'; // OLD - use string/CustomTimestamp
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // Uncommented
import type { CardLabel, CustomTimestamp, MemberData, ChecklistItemData, ChecklistData, CommentData, ActivityData, CardData, ListData } from '../../shared/types/taskManager'; // ADD THIS IMPORT
import { Picker } from '@react-native-picker/picker';
import LabelPicker from '../modals/LabelPicker'; // Added import
import MemberPicker from './MemberPicker'; // CHANGED extension to .tsx
// Remove the alias if MemberData from taskManager.ts is the one to be used consistently
// import type { MemberData as MemberPickerData } from '../modals/MemberPicker';
import { v4 as uuidv4 } from 'uuid'; // For generating comment IDs
import { useFirebase } from '../../contexts/FirebaseContext'; // Added
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

// WYSIWYG and HTML rendering commented out for now
// import Editor from 'react-simple-wysiwyg';
// import RenderHTML from 'react-native-render-html';

// Commented-out local type definitions removed.

// Define MentionSuggestion interface at the top level
interface MentionSuggestion {
    id: string;
    username: string; // Corresponds to prop name or container name (editor expects 'username')
    type: 'prop' | 'container';
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
    allShowMembers = [], // Default to empty array if not provided
    onClose,
    onUpdateCard,
    onMoveCard,
    onDeleteCard,
    availableLabels: propAvailableLabels = [], // MODIFIED: Renamed prop to avoid conflict
    onCreateNewLabel,
    boardId
}) => {
    const { theme: themeName } = useTheme();
    const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors; // Select colors object
    const { service, isInitialized: isFirebaseInitialized, error: firebaseError } = useFirebase(); // Get Firebase status
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

    const [mentionTrigger, setMentionTrigger] = useState<'@' | '#' | null>(null);
    const [mentionSearchTerm, setMentionSearchTerm] = useState('');
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
    const editorRef = useRef<any>(null); // MODIFIED: Editor to any for ref type

    const propRegex = /@@PROP\[([a-zA-Z0-9_-]+):([^#@\]]+)\]@@/g;
    const containerRegex = /##CONT\[([a-zA-Z0-9_-]+):([^#@\]]+)\]##/g;

    const parsedDescription = useMemo(() => {
        if (!internalCard?.description) return null;
        const description = internalCard.description;
        const parts: JSX.Element[] = []; // Ensure parts is explicitly typed
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
        setMentionTrigger(null);
        setMentionSearchTerm('');
        setMentionSuggestions([]);
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

    const fetchPropSuggestions = async (searchTerm: string): Promise<MentionSuggestion[]> => {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
        const mockProps: Pick<Prop, 'id' | 'name'>[] = [
            { id: 'prop123', name: 'AntiqueVase' }, { id: 'prop456', name: 'MagicSword' },
        ];
        return mockProps
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(p => ({ id: p.id, username: p.name, type: 'prop' }));
    };
    const fetchContainerSuggestions = async (searchTerm: string): Promise<MentionSuggestion[]> => {
        console.log("Fetching container suggestions for:", searchTerm);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
        const mockContainers: Pick<PackingBox, 'id' | 'name'>[] = [
            { id: 'box789', name: 'PropsBoxA' }, { id: 'box012', name: 'CostumeCrate1' },
        ];
        return mockContainers
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(c => ({ id: c.id, username: c.name, type: 'container' }));
    };
    const handleMentionSearch = async (keyword: string | null, trigger: string | null) => {
        if (!trigger || keyword === null || keyword === undefined) { setMentionSuggestions([]); return; }
        if (trigger === '@') {
            const suggestions = await fetchPropSuggestions(keyword);
            setMentionSuggestions(suggestions);
        } else if (trigger === '#') {
            const suggestions = await fetchContainerSuggestions(keyword);
            setMentionSuggestions(suggestions);
        }
    };
    // ADDED: onDescriptionChange for Editor
    const onDescriptionChange = (data: { displayText: string, text: string }) => {
        setEditedDescription(data.text);
        let currentTrigger: '@' | '#' | null = null;
        let currentKeyword: string | null = null; 
        const atMatch = data.displayText.match(/@(\S*)$/);
        const hashMatch = data.displayText.match(/#(\S*)$/);
        if (atMatch && data.displayText.endsWith(atMatch[0])) { 
            currentTrigger = '@';
            currentKeyword = atMatch[1];
        } else if (hashMatch && data.displayText.endsWith(hashMatch[0])) { 
            currentTrigger = '#';
            currentKeyword = hashMatch[1];
        } else {
            setMentionSuggestions([]); // Clear suggestions if no active trigger
        }
        if(currentKeyword !== null) handleMentionSearch(currentKeyword, currentTrigger); 
        else setMentionSuggestions([]);
    };

    const onMentionSuggestionTap = (mention: MentionSuggestion) => {
        console.log("Suggestion tapped:", mention); 
        setMentionSuggestions([]);
        editorRef.current?.focus();
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) { Alert.alert("Permission Required", "Photo access needed."); return; }
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
    const onDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
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

        console.log('Saving members:', newSelectedMembers);
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
        console.log('New member created (placeholder):', newMember);
        // setAllAvailableMembersForPicker(prev => [...prev, newMember]); // If managing a local copy for picker
    };
    const handleAddComment = async () => {
        if (!isFirebaseInitialized || firebaseError || !newCommentText.trim() || !internalCard || !service.auth().currentUser) { Alert.alert("Error", "Cannot post comment."); return; }
        const currentUser = service.auth().currentUser!;
        const userName = currentUser.displayName || currentUser.email || 'Anonymous';
        const newComment: CommentData = { id: uuidv4(), userId: currentUser.uid, userName, userAvatarInitials: (userName[0] || 'U').toUpperCase(), text: newCommentText.trim(), createdAt: new Date().toISOString() };
        const updatedComments = [...(internalCard.comments || []), newComment];
        try { await onUpdateCard(internalCard.id, internalCard.listId, { comments: updatedComments }); setInternalCard(prev => prev ? { ...prev, comments: updatedComments } : null); setNewCommentText(''); }
        catch (error) { Alert.alert("Error", "Failed to add comment."); }
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
    const renderCommentItem = ({ item }: { item: CommentData }) => (
        <View style={styles.commentItemContainer}>
            <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{item.userAvatarInitials || 'U'}</Text></View>
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}><Text style={styles.commentUserName}>{item.userName}</Text><Text style={styles.commentDate}>{new Date(item.createdAt).toLocaleString()}</Text></View>
                <Text style={styles.commentText}>{item.text}</Text>
            </View>
        </View>
    );

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
            maxHeight: '90%',
            alignSelf: 'center',
            marginTop: 50,
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
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 10,
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
        imagePlaceholderText: { color: currentThemeColors.textSecondary, fontStyle: 'italic' },
        pickImageButton: { backgroundColor: currentThemeColors.primary, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
        labelsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: 5,
        },
        labelChip: {
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 12,
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

    const listName = useMemo(() => lists.find(l => l.id === internalCard?.listId)?.name || 'Unknown List', [lists, internalCard?.listId]);

    const isAnyFieldEditing = editingTitleState || editingDescription; 
    const showEditControlsForOtherSections = isAnyFieldEditing; // Simplified: if title or desc is editing, other edit controls show.

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

    if (!internalCard) return null;

    const currentList = lists.find(l => l.id === internalCard.listId);

    return (
        <Modal transparent={true} visible={isVisible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.panel}>
                    <View style={styles.modalHeader}>
                        {editingTitleState ? (
                            <TextInput style={styles.input} value={editedTitle} onChangeText={setEditedTitle} placeholder="Card Title" onBlur={handleSaveTitle} autoFocus placeholderTextColor={currentThemeColors.textSecondary}/>
                        ) : (
                            <Pressable onPress={handleEditTitle} style={{flex:1}}><Text style={styles.title}>{internalCard.title}</Text></Pressable>
                        )}
                        <Pressable onPress={onClose} style={styles.deleteButton}>
                            <Ionicons name="close-circle-outline" size={30} color={currentThemeColors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {!isAnyFieldEditing && (<View style={{marginBottom: 15}}><Text style={{fontSize: 13, color: currentThemeColors.textSecondary}}>in list <Text style={{fontWeight:'bold'}}>{listName}</Text></Text></View>)}

                        {(internalCard.labels?.length || showEditControlsForOtherSections) && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Labels</Text>
                                <View style={styles.labelsContainer}>
                                    {internalCard.labels?.map(label => (<View key={label.id} style={[styles.labelChip, { backgroundColor: label.color || currentThemeColors.primary }]}><Text style={styles.labelText}>{label.name}</Text></View>))}
                                    {showEditControlsForOtherSections && !internalCard.labels?.length && <Text style={styles.imagePlaceholderText}>No labels.</Text>}
                                </View>
                                {showEditControlsForOtherSections && (<Pressable onPress={handleOpenLabelEditor} style={styles.addLabelButton}><Text style={styles.addLabelButtonText}>Add/Edit Labels...</Text></Pressable>)}
                            </View>
                        )}

                        {(internalCard.members?.length || showEditControlsForOtherSections) && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Members</Text>
                                <View style={styles.membersContainer}>
                                    {internalCard.members?.map(member => (<View key={member.id} style={styles.memberChip}><View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{member.avatarInitials || 'N/A'}</Text></View><Text style={styles.memberName}>{member.name}</Text></View>))}
                                    {showEditControlsForOtherSections && !internalCard.members?.length && <Text style={styles.imagePlaceholderText}>No members.</Text>}
                                </View>
                                {showEditControlsForOtherSections && (<Pressable onPress={handleOpenMemberEditor} style={styles.addMemberButton}><Text style={styles.addMemberButtonText}>Add/Edit Members...</Text></Pressable>)}
                            </View>
                        )}
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Image</Text>
                            {showEditControlsForOtherSections ? (
                                <React.Fragment>
                                    {editedImageUri ? <Image source={{ uri: editedImageUri }} style={styles.imagePreview} resizeMode="cover"/> : <View style={[styles.imagePreview, {justifyContent:'center', alignItems:'center'}]}><Text style={styles.imagePlaceholderText}>No Image</Text></View>}
                                    <View style={styles.imageButtonsContainer}>
                                        <Pressable onPress={pickImage} style={[styles.imageButton, styles.pickImageButton]}><Text style={styles.primaryButtonText}>Pick</Text></Pressable>
                                        {editedImageUri && <Pressable onPress={handleRemoveImage} style={[styles.imageButton, styles.removeImageButton]}><Text style={styles.deleteButtonText}>Remove</Text></Pressable>}
                                    </View>
                                </React.Fragment>
                            ) : ( internalCard.imageUrl ? <Image source={{ uri: internalCard.imageUrl }} style={styles.imagePreview} resizeMode="cover"/> : <Text style={styles.imagePlaceholderText}>No image.</Text> )}
                            {isImageUploading && <ActivityIndicator size="large" color={currentThemeColors.primary} style={styles.uploadingIndicator} />}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <View style={styles.sectionContentRow}>
                                <Ionicons name="document-text-outline" size={20} color={currentThemeColors.iconDefault} />
                                {editingDescription ? (
                                    <View style={{ flex: 1 }}>
                                        <Editor
                                            ref={editorRef}
                                            list={mentionSuggestions} 
                                            initialValue={editedDescription} 
                                            onChange={onDescriptionChange} 
                                            placeholder="Add description... @prop #container"
                                            editorStyles={{
                                                input: { ...styles.input, color: currentThemeColors.text, padding: 8 },
                                                mainContainer: { },
                                                mentionsListWrapper: { backgroundColor: currentThemeColors.cardBg, borderRadius: 5, borderWidth: 1, borderColor: currentThemeColors.border, maxHeight: 150, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
                                                mentionListItemWrapper: { padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: currentThemeColors.border },
                                                mentionListItemTitle: { color: currentThemeColors.text, fontSize: 14 },
                                            }}
                                            onSuggestionTap={onMentionSuggestionTap}
                                        />
                                    </View>
                                ) : (
                                    <Pressable onPress={handleEditDescription} style={{ flex: 1 }}>
                                        {parsedDescription && parsedDescription.length > 0 ? 
                                            <View>{parsedDescription}</View> : 
                                            <Text style={styles.descriptionText}>{internalCard?.description || 'Add description...'}</Text>}
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Due Date</Text>
                            {showEditControlsForOtherSections ? (<Pressable onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}><Text style={styles.dateText}>{selectedDueDate ? selectedDueDate.toLocaleDateString() : 'Set Date'}</Text></Pressable>) : (<Text style={styles.dateText}>{selectedDueDate ? selectedDueDate.toLocaleDateString() : 'No date'}</Text>)}
                            {showEditControlsForOtherSections && selectedDueDate && (<Pressable onPress={() => setSelectedDueDate(null)} style={styles.removeDateButton}><Text style={styles.removeDateText}>Remove</Text></Pressable>)}
                            {showDatePicker && (<DateTimePicker value={selectedDueDate || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange}/>)}
                        </View>
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Link URL</Text>
                            {showEditControlsForOtherSections ? (<TextInput style={styles.linkInput} value={editedLinkUrl} onChangeText={setEditedLinkUrl} placeholder="https://..." keyboardType="url" autoCapitalize="none" placeholderTextColor={currentThemeColors.textSecondary}/>)
                            : internalCard.linkUrl ? (<Pressable onPress={async () => { if (internalCard.linkUrl) { try { if(await Linking.canOpenURL(internalCard.linkUrl)) await Linking.openURL(internalCard.linkUrl); else Alert.alert("Error", `Cannot open: ${internalCard.linkUrl}`); } catch (e) { Alert.alert("Error", "Link error."); } } }}><Text style={{color: currentThemeColors.primary}}>{internalCard.linkUrl}</Text></Pressable>)
                            : (<Text style={styles.imagePlaceholderText}>No link.</Text>)}
                        </View>

                        {showEditControlsForOtherSections && (
                            <View style={[styles.section, styles.pickerSection]}>
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

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Checklists</Text>
                            {showEditControlsForOtherSections && (<View style={styles.checklistInputContainer}><TextInput style={styles.checklistInput} placeholder="New Checklist" value={newChecklistTitle} onChangeText={setNewChecklistTitle} placeholderTextColor={currentThemeColors.textSecondary}/><TouchableOpacity onPress={handleAddChecklist} style={styles.checklistAddButton}><Text style={styles.checklistAddButtonText}>Add</Text></TouchableOpacity></View>)}
                            {(internalCard?.checklists || []).map(cl => { const comp = cl.items.filter(i=>i.completed).length; const tot = cl.items.length; const prog = tot>0?(comp/tot)*100:0; return (
                                <View key={cl.id} style={styles.checklistContainer}>
                                    <Text style={[styles.sectionTitle, {textTransform:'none', fontSize:16, marginBottom:4}]}>{cl.title}</Text>
                                    {tot>0 && (<View style={styles.checklistProgressBarContainer}><View style={[styles.checklistProgressBar, {width:`${prog}%`}]} /></View>)}
                                    {cl.items.map(item => (<TouchableOpacity key={item.id} onPress={()=>showEditControlsForOtherSections && handleToggleChecklistItem(cl.id,item.id)} disabled={!showEditControlsForOtherSections} style={styles.checklistItem}><Ionicons name={item.completed?"checkbox-outline":"square-outline"} size={24} color={showEditControlsForOtherSections?currentThemeColors.primary:currentThemeColors.textSecondary} /><Text style={[styles.checklistItemText,item.completed&&styles.checklistItemTextCompleted]}>{item.text}</Text></TouchableOpacity>))}
                                    {showEditControlsForOtherSections && (<View style={styles.checklistInputContainer}><TextInput style={styles.checklistInput} placeholder="Add item" value={newChecklistItemTexts[cl.id]|| ''} onChangeText={t=>setNewChecklistItemTexts(p=>({...p,[cl.id]:t}))} placeholderTextColor={currentThemeColors.textSecondary}/><TouchableOpacity onPress={()=>handleAddChecklistItem(cl.id)} style={styles.checklistAddButton} disabled={!newChecklistItemTexts[cl.id]?.trim()}><Text style={styles.checklistAddButtonText}>Add Item</Text></TouchableOpacity></View>)}
                                </View>
                            );})}
                            {!internalCard?.checklists?.length && <Text style={styles.imagePlaceholderText}>{showEditControlsForOtherSections ? 'No checklists.': 'No checklists.'}</Text>}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Attachments</Text>
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
                            {!internalCard?.attachments?.length && <Text style={styles.imagePlaceholderText}>{showEditControlsForOtherSections? 'No attachments.': 'No attachments.'}</Text>}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Comments</Text>
                            <View style={styles.commentInputContainer}><TextInput style={[styles.commentInput,(!isFirebaseInitialized||firebaseError)&&styles.disabledInput]} placeholder={isFirebaseInitialized? "Comment...": "Initializing..."} value={newCommentText} onChangeText={setNewCommentText} multiline editable={isFirebaseInitialized&&!firebaseError} placeholderTextColor={currentThemeColors.textSecondary}/><TouchableOpacity onPress={handleAddComment} style={[styles.commentPostButton,(!isFirebaseInitialized||firebaseError)&&styles.disabledButton]} disabled={!isFirebaseInitialized||!!firebaseError}><Text style={styles.commentPostButtonText}>Post</Text></TouchableOpacity></View>
                            <View style={styles.commentListContainer}>{(internalCard?.comments?.length)?([...internalCard.comments].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).map(c=>(<View key={c.id}>{renderCommentItem({item:c})}</View>))):(<Text style={styles.imagePlaceholderText}>No comments.</Text>)}</View>
                        </View>

                    </ScrollView>

                    <View style={styles.actionsRow}>
                        {isAnyFieldEditing ? (
                            <View style={{flexDirection:'row', justifyContent: 'flex-start', flex:1, gap: 10}}>
                                <Pressable onPress={handleSaveAll} style={styles.saveButton}><Text style={styles.primaryButtonText}>Save All</Text></Pressable>
                                <Pressable onPress={() => resetLocalStateAndEditingModes(internalCard)} style={styles.cancelButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
                            </View>
                        ) : (
                            <Pressable onPress={() => { setEditingTitleState(true); setEditingDescription(true); }} style={styles.editButton}><Text style={styles.secondaryButtonText}>Edit Card</Text></Pressable>
                        )}
                        <Pressable onPress={handleDelete} style={[styles.deleteButton, {marginLeft: isAnyFieldEditing ? 0: 10}]}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>
                    </View>
                </View>
            </View>
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
        </Modal>
    );
};

export default CardDetailPanel;