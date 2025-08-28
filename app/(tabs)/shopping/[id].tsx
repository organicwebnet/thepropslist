import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Linking,
  TextInput,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ShoppingService } from '../../../src/services/shoppingService';
import { ShoppingItem, ShoppingOption } from '../../../src/types/shopping';
import { FirebaseDocument } from '../../../src/shared/services/firebase/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../src/styles/theme';
import LinearGradient from 'react-native-linear-gradient';
// import { NotificationService } from '../../../src/services/notificationService';

export default function ShoppingItemDetailsScreen() {
  const { service } = useFirebase();
  const { user, userProfile } = useAuth();
  const { theme: themeName } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentTheme = themeName === 'dark' ? darkTheme : lightTheme;

  const [shoppingService, setShoppingService] = useState<ShoppingService | null>(null);
  const [item, setItem] = useState<FirebaseDocument<ShoppingItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<{ [optionIndex: number]: string }>({});

  // Initialize shopping service when Firebase service is ready
  useEffect(() => {
    if (service) {
      setShoppingService(new ShoppingService(service));
    }
  }, [service]);

  const getDisplayName = (email: string): string => {
    // Handle null, undefined, or empty email
    if (!email || typeof email !== 'string') {
      return 'Unknown User';
    }
    
    // If it's the current user, use their profile display name
    if (email === user?.email) {
      return userProfile?.displayName || user?.displayName || email.split('@')[0] || 'Unknown User';
    }
    
    // For other users, extract the name part from email as fallback
    // Handle cases where email might not contain '@'
    return email.includes('@') ? email.split('@')[0] : email;
  };

  useEffect(() => {
    if (shoppingService && id) {
      loadItem();
    }
  }, [id, shoppingService]);

  const loadItem = async () => {
    if (!id || !service) return;
    
    try {
      const itemDoc = await service.getDocument<ShoppingItem>('shopping_items', id);
      setItem(itemDoc);
    } catch (error) {
      console.error('Error loading shopping item:', error);
      Alert.alert('Error', 'Failed to load shopping item');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'pending' | 'approved' | 'picked' | 'bought') => {
    if (!item?.id) return;

    try {
      await shoppingService?.updateShoppingItem(item.id, { status: newStatus });
      setItem(prev => prev ? {
        ...prev,
        data: { ...prev.data!, status: newStatus }
      } : null);
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Failed to open link');
    });
  };

  const handleOpenMaps = (location: { latitude: number; longitude: number; address?: string }) => {
    const { latitude, longitude, address } = location;
    
    // Create the map URL - use address if available, otherwise coordinates
    const query = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
    const url = `https://maps.google.com/maps?q=${query}`;
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Failed to open maps');
    });
  };

  const handleGetDirections = (location: { latitude: number; longitude: number; address?: string }) => {
    const { latitude, longitude, address } = location;
    
    // Create the directions URL
    const destination = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
    const url = `https://maps.google.com/maps?daddr=${destination}`;
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening directions:', err);
      Alert.alert('Error', 'Failed to open directions');
    });
  };

  const handleDeleteItem = () => {
    if (!item?.id) return;

    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this shopping item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingService?.deleteShoppingItem(item.id);
              router.back();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#4CAF50';
      case 'picked': return '#2196F3';
      case 'bought': return '#8BC34A';
      default: return '#fff';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prop': return '#3B82F6';
      case 'material': return '#FFD600';
      case 'hired': return '#9C27B0';
      default: return '#fff';
    }
  };

  const handleOptionStatusUpdate = async (optionIndex: number, newStatus: 'pending' | 'buy' | 'rejected' | 'maybe') => {
    if (!item?.id || !item.data) return;

    try {
      await shoppingService?.updateOption(item.id, optionIndex, { status: newStatus });
      
      // If status is 'buy', send notification to the option uploader
      if (newStatus === 'buy' && item.data.options[optionIndex]) {
        const option = item.data.options[optionIndex];
        // await NotificationService.sendShoppingOptionSelectedNotification(
        //   option.uploadedBy,
        //   item.id,
        //   optionIndex,
        //   item.data.description,
        //   option.shopName,
        //   option.price
        // );
      }
      
      // Reload the item to get updated data
      loadItem();
    } catch (error) {
      console.error('Error updating option status:', error);
      Alert.alert('Error', 'Failed to update option status');
    }
  };

  const handleAddComment = async (optionIndex: number) => {
    if (!item?.id || !commentInputs[optionIndex]?.trim()) return;

    try {
      await shoppingService?.addCommentToOption(
        item.id,
        optionIndex,
        commentInputs[optionIndex].trim(),
        user?.email || 'Anonymous',
        'supervisor' // This could be determined based on user role
      );
      
      // Clear the input
      setCommentInputs(prev => ({ ...prev, [optionIndex]: '' }));
      
      // Reload the item to get updated comments
      loadItem();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const renderOption = (option: ShoppingOption, index: number) => {
    return (
      <View key={index} style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionName}>{option.shopName || `Option ${index + 1}`}</Text>
          <View style={[styles.optionStatusBadge, { backgroundColor: getStatusColor(option.status) }]}>
            <Text style={styles.optionStatusText}>{option.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.optionDetails}>
          <Text style={styles.optionPrice}>£{option.price.toFixed(2)}</Text>
          <Text style={styles.optionSupplier}>By: {getDisplayName(option.uploadedBy)}</Text>
        </View>
        
        {/* Comments Section */}
        {(option.comments && option.comments.length > 0) ? (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments:</Text>
            {option.comments.map((comment, commentIndex) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{getDisplayName(comment.author)}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(comment.timestamp).toLocaleDateString()} {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}
          </View>
        ) : option.notes ? (
          <Text style={styles.optionNotes}>{option.notes}</Text>
        ) : null}

        {/* Add Comment Section */}
        <View style={styles.addCommentSection}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={commentInputs[index] || ''}
            onChangeText={(text) => setCommentInputs(prev => ({ ...prev, [index]: text }))}
            multiline
            numberOfLines={2}
          />
          <TouchableOpacity
            style={[
              styles.addCommentButton,
              (!commentInputs[index]?.trim()) && styles.addCommentButtonDisabled
            ]}
            onPress={() => handleAddComment(index)}
            disabled={!commentInputs[index]?.trim()}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        {option.shopLocation && (
          <View style={styles.locationSection}>
            <View style={styles.locationContainer}>
              <TouchableOpacity
                style={styles.optionLocation}
                onPress={() => handleOpenMaps(option.shopLocation!)}
              >
                <Ionicons name="location" size={14} color="#4CAF50" />
                <Text style={styles.optionLocationText}>
                  {option.shopLocation.address || `${option.shopLocation.latitude.toFixed(4)}, ${option.shopLocation.longitude.toFixed(4)}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => handleGetDirections(option.shopLocation!)}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.directionsButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {option.productUrl && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleOpenUrl(option.productUrl!)}
          >
            <Ionicons name="link" size={16} color="#fff" />
            <Text style={styles.linkButtonText}>View Product</Text>
          </TouchableOpacity>
        )}

        {/* Buy This Button */}
        {shoppingService && item?.data?.requestedBy === user?.email && option.status !== 'buy' && (
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => handleOptionStatusUpdate(index, 'buy')}
          >
            <Text style={styles.buyButtonText}>Buy This</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const canEdit = item?.data?.requestedBy === user?.email;

  if (loading) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!item?.data) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Item not found</Text>
        </View>
      </LinearGradient>
    );
  }

  const itemData = item.data;

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Shopping Item',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
            headerTransparent: true,
            gestureEnabled: true,
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()}
                style={{ marginLeft: 16 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            ),
            headerRight: () => canEdit ? (
              <TouchableOpacity onPress={handleDeleteItem}>
                <Ionicons name="trash" size={24} color="#fff" />
              </TouchableOpacity>
            ) : null,
          }} 
        />

        <ScrollView style={[styles.scrollView, { marginTop: 100 }]} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadges}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(itemData.type) }]}>
                <Text style={styles.badgeText}>{itemData.type.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(itemData.status) }]}>
                <Text style={styles.badgeText}>{itemData.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.title}>{itemData.description}</Text>
          </View>

          {/* Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Requested by:</Text>
              <Text style={styles.detailValue}>{getDisplayName(itemData.requestedBy)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              <Text style={styles.detailValue}>{itemData.quantity}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Budget:</Text>
              <Text style={styles.detailValue}>£{(itemData.budget || 0).toFixed(2)}</Text>
            </View>
            {itemData.note && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Note:</Text>
                <Text style={styles.detailValue}>{itemData.note}</Text>
              </View>
            )}
            {itemData.labels && itemData.labels.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Labels:</Text>
                <View style={styles.labelsContainer}>
                  {itemData.labels.map((label, index) => (
                    <View key={index} style={styles.labelBadge}>
                      <Text style={styles.labelText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Reference Image */}
          {itemData.referenceImage && (
            <View style={styles.imageCard}>
              <Text style={styles.sectionTitle}>Reference Image</Text>
              <Image source={{ uri: itemData.referenceImage }} style={styles.referenceImage} />
            </View>
          )}

          {/* Options */}
          <View style={styles.optionsSection}>
            <View style={styles.optionsHeader}>
              <Text style={styles.sectionTitle}>
                Options ({itemData.options?.length || 0})
              </Text>
              {canEdit && (
                <TouchableOpacity 
                  style={styles.addOptionButton}
                  onPress={() => router.push({ pathname: '/(tabs)/shopping/[id]/add-option', params: { id: item.id } })}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addOptionText}>Add Option</Text>
                </TouchableOpacity>
              )}
            </View>

            {itemData.options && itemData.options.length > 0 ? (
              itemData.options.map((option, index) => renderOption(option, index))
            ) : (
              <View style={styles.noOptionsContainer}>
                <Ionicons name="bag-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.noOptionsText}>No options yet</Text>
                {canEdit && (
                  <Text style={styles.noOptionsSubtext}>Add supplier options to compare prices</Text>
                )}
              </View>
            )}
          </View>

          {/* Status Actions */}
          {canEdit && (
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Update Status</Text>
              <View style={styles.statusButtons}>
                {(['pending', 'approved', 'picked', 'bought'] as const).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      itemData.status === status && styles.statusButtonActive
                    ]}
                    onPress={() => handleStatusUpdate(status)}
                    disabled={itemData.status === status}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      itemData.status === status && styles.statusButtonTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    marginBottom: 20,
  },
  headerBadges: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 32,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 2,
    justifyContent: 'flex-end',
  },
  labelBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
    marginBottom: 4,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  referenceImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  optionsSection: {
    marginBottom: 20,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  optionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  optionStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  optionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  optionSupplier: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  optionNotes: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  noOptionsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noOptionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 12,
  },
  noOptionsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 32,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  optionLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 4,
  },
  optionLocationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  commentItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  commentTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  commentText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  addCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 40,
    maxHeight: 80,
    textAlignVertical: 'top',
    marginRight: 8,
  },
  addCommentButton: {
    padding: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
  },
  addCommentButtonDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationSection: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
}); 