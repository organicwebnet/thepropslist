import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePacking } from '../../../../src/hooks/usePacking';
import { useShows } from '../../../../src/contexts/ShowsContext';
import { useProps } from '../../../../src/contexts/PropsContext';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useFirebase } from '../../../../src/contexts/FirebaseContext';
import type { PackingBox, ContainerComment, ContainerActivity } from '../../../../src/types/packing';
import LinearGradient from 'react-native-linear-gradient';
import StyledText from '../../../../src/components/StyledText';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../../src/styles/theme';
import { formatDistanceToNow } from 'date-fns';

export default function BoxDetailsScreen() {
  const router = useRouter();
  const { id, showId } = useLocalSearchParams<{ id: string; showId: string }>();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const { user, userProfile } = useAuth();
  const { service } = useFirebase();
  
  const [box, setBox] = useState<PackingBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentBox, setParentBox] = useState<PackingBox | null>(null);
  const [showName, setShowName] = useState<string>('');
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [userInfoMap, setUserInfoMap] = useState<Map<string, { displayName: string; email?: string }>>(new Map());
  
  // We'll get showId from box data if not provided, so use a placeholder for now
  const { getDocument: getBoxById, operations } = usePacking(showId);
  const { getShowById } = useShows();
  const { props: allProps } = useProps();

  useEffect(() => {
    const loadBox = async () => {
      if (!id) {
        setError('Box ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Determine which showId to use - prefer param, fallback to box data
        const effectiveShowId = showId || undefined;

        // Fetch box document
        const boxDoc = await getBoxById(id);
        if (!boxDoc || !boxDoc.data) {
          setError('Box not found');
          setLoading(false);
          return;
        }

        const boxData = {
          ...boxDoc.data,
          id: boxDoc.id,
        } as PackingBox;

        setBox(boxData);

        // Load show name if we have showId
        const boxShowId = boxData.showId || effectiveShowId;
        if (boxShowId) {
          const show = await getShowById(boxShowId);
          if (show) {
            setShowName(show.name || '');
          }
        }

        // Check if box has a parent (current location)
        // Note: PackingBox doesn't have parentId in the type, but we can check if it exists
        const parentId = (boxData as any).parentId;
        if (parentId) {
          try {
            // Try to fetch parent using the same getBoxById function
            // This will work if parent is in the same show context
            const parentDoc = await getBoxById(parentId);
            if (parentDoc && parentDoc.data) {
              setParentBox({
                ...parentDoc.data,
                id: parentDoc.id,
              } as PackingBox);
            }
          } catch (parentErr) {
            // Silently fail if parent can't be loaded
            console.warn('Could not load parent box:', parentErr);
          }
        }
      } catch (err) {
        console.error('Error loading box:', err);
        setError(err instanceof Error ? err.message : 'Failed to load box');
      } finally {
        setLoading(false);
      }
    };

    loadBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, showId, getBoxById, getShowById]);

  // Fetch user info for comments and activity log
  useEffect(() => {
    if (!box || !service) return;
    const userIds = new Set<string>();
    (box.comments || []).forEach(c => userIds.add(c.userId));
    (box.activityLog || []).forEach(a => userIds.add(a.userId));
    
    if (userIds.size === 0) return;
    
    const fetchUserInfo = async () => {
      const userMap = new Map<string, { displayName: string; email?: string }>();
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          try {
            const userDoc = await service.getDocument('userProfiles', uid);
            if (userDoc && userDoc.data) {
              userMap.set(uid, {
                displayName: userDoc.data.displayName || userDoc.data.name || userDoc.data.email || 'Unknown User',
                email: userDoc.data.email
              });
            } else {
              userMap.set(uid, { displayName: 'Unknown User' });
            }
          } catch (error) {
            console.error(`Error fetching user profile for ${uid}:`, error);
            userMap.set(uid, { displayName: 'Unknown User' });
          }
        })
      );
      setUserInfoMap(userMap);
    };
    
    fetchUserInfo();
  }, [box, service]);

  // Helper function to create activity log entry
  const createActivity = (type: string, details?: any): ContainerActivity => {
    const userName = userProfile?.displayName || user?.displayName || user?.email || 'Unknown User';
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId: user?.uid || '',
      userName,
      timestamp: new Date().toISOString(),
      details
    };
  };

  // Helper function to add activity and update box
  const addActivity = async (activity: ContainerActivity) => {
    if (!box) return;
    const currentActivities = box.activityLog || [];
    await operations.updateBox(box.id, {
      activityLog: [...currentActivities, activity]
    });
    // Reload box to get updated data
    const boxDoc = await getBoxById(box.id);
    if (boxDoc && boxDoc.data) {
      setBox({ ...boxDoc.data, id: boxDoc.id } as PackingBox);
    }
  };

  // Constants for validation
  const MAX_COMMENT_LENGTH = 2000;

  // Helper function to sanitize comment text
  const sanitizeComment = (text: string): string => {
    // Remove control characters and trim
    return text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  };

  // Helper function to add comment
  const handleAddComment = async () => {
    setCommentError(null);
    
    if (!user || !box || addingComment) {
      setCommentError('Unable to add comment. Please refresh the page.');
      return;
    }

    const trimmed = sanitizeComment(newComment);
    
    // Validation
    if (!trimmed || trimmed.length === 0) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentError(`Comment must be less than ${MAX_COMMENT_LENGTH} characters. Currently ${trimmed.length} characters.`);
      return;
    }

    setAddingComment(true);
    try {
      const userName = userProfile?.displayName || user.displayName || user.email || 'Unknown User';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
      const comment: ContainerComment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user.uid,
        userName,
        userAvatarInitials: userInitials,
        text: trimmed.substring(0, MAX_COMMENT_LENGTH),
        createdAt: new Date().toISOString()
      };
      const currentComments = box.comments || [];
      await operations.updateBox(box.id, {
        comments: [...currentComments, comment]
      });
      setNewComment('');
      setCommentError(null);
      // Reload box to get updated data
      const boxDoc = await getBoxById(box.id);
      if (boxDoc && boxDoc.data) {
        setBox({ ...boxDoc.data, id: boxDoc.id } as PackingBox);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setCommentError('Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  };

  // Combined comments and activity log, sorted by date
  const combinedLog = useMemo(() => {
    if (!box) return [];
    const items: Array<ContainerComment | ContainerActivity> = [];
    (box.comments || []).forEach(c => items.push(c));
    (box.activityLog || []).forEach(a => items.push(a));
    return items.sort((a, b) => {
      const dateA = (a as ContainerComment).createdAt || (a as ContainerActivity).timestamp;
      const dateB = (b as ContainerComment).createdAt || (b as ContainerActivity).timestamp;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [box]);

  const makeQrCodeUrl = (boxId: string) => {
    const payload = JSON.stringify({ type: 'packingBox', id: boxId, showId: box?.showId || showId });
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft': return '#9CA3AF';
      case 'packed': return '#93C5FD';
      case 'shipped': return '#C4B5FD';
      case 'delivered': return '#86EFAC';
      case 'cancelled': return '#F87171';
      default: return '#FCD34D';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'draft': return 'edit-3';
      case 'packed': return 'package';
      case 'shipped': return 'truck';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'x-circle';
      default: return 'alert-triangle';
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Stack.Screen
          options={{
            title: 'Box Details',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <StyledText style={[styles.loadingText, { color: currentThemeColors.textPrimary }]}>
            Loading box details...
          </StyledText>
        </View>
      </LinearGradient>
    );
  }

  if (error || !box) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Stack.Screen
          options={{
            title: 'Box Details',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <Feather name="alert-circle" size={64} color="#fff" />
          <StyledText style={[styles.errorTitle, { color: currentThemeColors.textPrimary }]}>
            {error || 'Box Not Found'}
          </StyledText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: 'rgba(192,132,252,0.25)' }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const status = box.status || 'draft';
  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);
  const totalWeight = box.totalWeight || box.props?.reduce((sum, p) => sum + (p.weight || 0), 0) || 0;
  const propCount = box.props?.reduce((sum, p) => sum + (p.quantity || 1), 0) || 0;
  
  let timeAgo = 'Just now';
  if (box.updatedAt) {
    try {
      const updatedDate = box.updatedAt instanceof Date ? box.updatedAt : new Date(box.updatedAt);
      timeAgo = formatDistanceToNow(updatedDate, { addSuffix: true });
    } catch {
      timeAgo = 'Unknown';
    }
  }

  // Get props details for display
  const boxProps = box.props || [];
  const propsWithDetails = boxProps.map(packedProp => {
    const prop = allProps?.find(p => p.id === packedProp.propId);
    return {
      ...packedProp,
      propDetails: prop,
    };
  });

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: box.name || 'Box Details',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Box Details Section */}
        <View style={[styles.card, { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
          <View style={styles.cardHeader}>
            <Feather name="package" size={24} color="#fff" />
            <StyledText style={[styles.cardTitle, { color: currentThemeColors.textPrimary }]}>
              Box Details
            </StyledText>
          </View>

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Name:</StyledText>
            <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
              {box.name || 'Unnamed Box'}
            </StyledText>
          </View>

          {box.description && (
            <View style={styles.detailRow}>
              <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Description:</StyledText>
              <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                {box.description}
              </StyledText>
            </View>
          )}

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Status:</StyledText>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Feather name={statusIcon} size={16} color={statusColor} />
              <StyledText style={[styles.statusText, { color: statusColor }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </StyledText>
            </View>
          </View>

          {showName && (
            <View style={styles.detailRow}>
              <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Show:</StyledText>
              <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                {showName}
              </StyledText>
            </View>
          )}

          {(box.actNumber > 0 || box.sceneNumber > 0) && (
            <View style={styles.detailRow}>
              <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Act/Scene:</StyledText>
              <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                Act {box.actNumber || 0}, Scene {box.sceneNumber || 0}
              </StyledText>
            </View>
          )}

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Total Weight:</StyledText>
            <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
              {totalWeight.toFixed(2)} {box.weightUnit || 'kg'}
              {box.isHeavy && (
                <View style={[styles.heavyBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Feather name="alert-triangle" size={12} color="#FCD34D" />
                  <Text style={[styles.heavyText, { color: '#FCD34D' }]}>Heavy</Text>
                </View>
              )}
            </StyledText>
          </View>

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Items:</StyledText>
            <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
              {propCount} item{propCount !== 1 ? 's' : ''}
            </StyledText>
          </View>

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Last Updated:</StyledText>
            <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
              {timeAgo}
            </StyledText>
          </View>

          {box.containerType && (
            <View style={styles.detailRow}>
              <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Container Type:</StyledText>
              <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                {box.containerType}
              </StyledText>
            </View>
          )}
        </View>

        {/* Current Location Section */}
        <View style={[styles.card, { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
          <View style={styles.cardHeader}>
            <Feather name="map-pin" size={24} color="#fff" />
            <StyledText style={[styles.cardTitle, { color: currentThemeColors.textPrimary }]}>
              Current Location
            </StyledText>
          </View>

          {parentBox ? (
            <View style={styles.detailRow}>
              <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Placed in:</StyledText>
              <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                {parentBox.name || `Box #${parentBox.id.substring(0, 8)}`}
              </StyledText>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <StyledText style={[styles.detailValue, { color: currentThemeColors.textSecondary, fontStyle: 'italic' }]}>
                Not placed in another container
              </StyledText>
            </View>
          )}

          {/* Check if any props have location info */}
          {propsWithDetails.some(p => p.propDetails?.location || p.propDetails?.currentLocation) && (
            <View style={styles.sectionDivider} />
          )}

          {propsWithDetails
            .filter(p => p.propDetails?.location || p.propDetails?.currentLocation)
            .slice(0, 3)
            .map((packedProp, idx) => (
              <View key={idx} style={styles.detailRow}>
                <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>
                  {packedProp.name}:
                </StyledText>
                <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                  {packedProp.propDetails?.currentLocation || packedProp.propDetails?.location || 'Unknown'}
                </StyledText>
              </View>
            ))}
        </View>

        {/* Label Details Section */}
        <View style={[styles.card, { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
          <View style={styles.cardHeader}>
            <Feather name="tag" size={24} color="#fff" />
            <StyledText style={[styles.cardTitle, { color: currentThemeColors.textPrimary }]}>
              Label Details
            </StyledText>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: makeQrCodeUrl(box.id) }}
              style={styles.qrCode}
              resizeMode="contain"
            />
            <StyledText style={[styles.qrLabel, { color: currentThemeColors.textSecondary }]}>
              QR Code
            </StyledText>
          </View>

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Box ID:</StyledText>
            <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary, fontFamily: 'monospace' }]}>
              {box.id}
            </StyledText>
          </View>

          <View style={styles.detailRow}>
            <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Public URL:</StyledText>
            <StyledText style={[styles.detailValue, { color: '#93C5FD' }]}>
              https://thepropslist.uk/c/{box.id}
            </StyledText>
          </View>

          {/* Label Settings */}
          {(box.labelIncludeFragile || box.labelIncludeThisWayUp || box.labelIncludeKeepDry || box.labelIncludeBatteries || box.labelHandlingNote) && (
            <>
              <View style={styles.sectionDivider} />
              <StyledText style={[styles.sectionSubtitle, { color: currentThemeColors.textPrimary }]}>
                Label Settings
              </StyledText>

              {box.labelIncludeFragile && (
                <View style={styles.labelSettingRow}>
                  <MaterialCommunityIcons name="glass-fragile" size={20} color="#FCD34D" />
                  <StyledText style={[styles.labelSettingText, { color: currentThemeColors.textPrimary }]}>
                    Fragile
                  </StyledText>
                </View>
              )}

              {box.labelIncludeThisWayUp && (
                <View style={styles.labelSettingRow}>
                  <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#93C5FD" />
                  <StyledText style={[styles.labelSettingText, { color: currentThemeColors.textPrimary }]}>
                    This Way Up
                  </StyledText>
                </View>
              )}

              {box.labelIncludeKeepDry && (
                <View style={styles.labelSettingRow}>
                  <MaterialCommunityIcons name="water-off" size={20} color="#60A5FA" />
                  <StyledText style={[styles.labelSettingText, { color: currentThemeColors.textPrimary }]}>
                    Keep Dry
                  </StyledText>
                </View>
              )}

              {box.labelIncludeBatteries && (
                <View style={styles.labelSettingRow}>
                  <MaterialCommunityIcons name="battery-alert" size={20} color="#F87171" />
                  <StyledText style={[styles.labelSettingText, { color: currentThemeColors.textPrimary }]}>
                    Contains Batteries
                  </StyledText>
                </View>
              )}

              {box.labelHandlingNote && (
                <View style={styles.detailRow}>
                  <StyledText style={[styles.detailLabel, { color: currentThemeColors.textSecondary }]}>Handling Note:</StyledText>
                  <StyledText style={[styles.detailValue, { color: currentThemeColors.textPrimary }]}>
                    {box.labelHandlingNote}
                  </StyledText>
                </View>
              )}
            </>
          )}
        </View>

        {/* Contents Section */}
        {boxProps.length > 0 && (
          <View style={[styles.card, { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
            <View style={styles.cardHeader}>
              <Feather name="list" size={24} color="#fff" />
              <StyledText style={[styles.cardTitle, { color: currentThemeColors.textPrimary }]}>
                Contents ({boxProps.length} {boxProps.length === 1 ? 'item' : 'items'})
              </StyledText>
            </View>

            {propsWithDetails.map((packedProp, idx) => (
              <View key={idx} style={[styles.propItem, idx < propsWithDetails.length - 1 && styles.propItemBorder]}>
                <View style={styles.propItemHeader}>
                  <StyledText style={[styles.propItemName, { color: currentThemeColors.textPrimary }]}>
                    {packedProp.name}
                  </StyledText>
                  <View style={styles.propItemBadges}>
                    {packedProp.isFragile && (
                      <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                        <Text style={[styles.badgeText, { color: '#FCD34D' }]}>Fragile</Text>
                      </View>
                    )}
                    {packedProp.isSpare && (
                      <View style={[styles.badge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                        <Text style={[styles.badgeText, { color: '#93C5FD' }]}>Spare</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.propItemDetails}>
                  <StyledText style={[styles.propItemDetail, { color: currentThemeColors.textSecondary }]}>
                    Quantity: {packedProp.quantity || 1}
                  </StyledText>
                  {packedProp.weight > 0 && (
                    <StyledText style={[styles.propItemDetail, { color: currentThemeColors.textSecondary }]}>
                      Weight: {packedProp.weight} {packedProp.weightUnit || 'kg'}
                    </StyledText>
                  )}
                  {packedProp.propDetails?.category && (
                    <StyledText style={[styles.propItemDetail, { color: currentThemeColors.textSecondary }]}>
                      Category: {packedProp.propDetails.category}
                    </StyledText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Comments and Activity Log */}
        <View style={[styles.card, { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
          <View style={styles.cardHeader}>
            <Feather name="message-square" size={24} color="#fff" />
            <StyledText style={[styles.cardTitle, { color: currentThemeColors.textPrimary }]}>
              Comments & Activity
            </StyledText>
          </View>

          {/* Add Comment Section */}
          <View style={styles.commentInputContainer}>
            <TextInput
              value={newComment}
              onChangeText={(text) => {
                setNewComment(text);
                setCommentError(null);
              }}
              placeholder="Add a comment..."
              placeholderTextColor={currentThemeColors.textSecondary}
              multiline
              maxLength={MAX_COMMENT_LENGTH}
              style={[styles.commentInput, { 
                color: currentThemeColors.textPrimary,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: commentError ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'
              }]}
            />
            {commentError && (
              <StyledText style={[styles.errorText, { color: '#EF4444' }]}>
                {commentError}
              </StyledText>
            )}
            <View style={styles.commentFooter}>
              <View style={{ flex: 1 }} />
              <StyledText style={[styles.characterCount, { 
                color: newComment.length > MAX_COMMENT_LENGTH ? '#EF4444' : currentThemeColors.textSecondary 
              }]}>
                {newComment.length}/{MAX_COMMENT_LENGTH}
              </StyledText>
            </View>
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!newComment.trim() || addingComment || !!commentError}
              style={[styles.addCommentButton, {
                backgroundColor: addingComment ? 'rgba(59, 130, 246, 0.5)' : '#3B82F6',
                opacity: (!newComment.trim() || addingComment || !!commentError) ? 0.6 : 1
              }]}
            >
              {addingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addCommentButtonText}>Add Comment</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Comments and Activity List */}
          <View style={styles.logContainer}>
            {combinedLog.length === 0 ? (
              <View style={styles.emptyLogContainer}>
                <Feather name="message-square" size={48} color={currentThemeColors.textSecondary} />
                <StyledText style={[styles.emptyLogText, { color: currentThemeColors.textSecondary }]}>
                  No comments or activity yet
                </StyledText>
                <StyledText style={[styles.emptyLogSubtext, { color: currentThemeColors.textSecondary }]}>
                  Add a comment above to get started
                </StyledText>
              </View>
            ) : (
              combinedLog.map((item) => {
                const isComment = 'createdAt' in item;
                const userInfo = userInfoMap.get(item.userId) || { displayName: item.userName || 'Unknown User' };
                const initials = isComment ? (item.userAvatarInitials || userInfo.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U') : 'A';
                const date = isComment ? item.createdAt : item.timestamp;
                
                return (
                  <View key={item.id} style={[styles.logItem, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <View style={[styles.logAvatar, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                      <Text style={[styles.logAvatarText, { color: '#93C5FD' }]}>{initials}</Text>
                    </View>
                    <View style={styles.logContent}>
                      <View style={styles.logHeader}>
                        <StyledText style={[styles.logUserName, { color: currentThemeColors.textPrimary }]}>
                          {userInfo.displayName}
                        </StyledText>
                        {!isComment && (
                          <View style={[styles.activityBadge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                            <Text style={[styles.activityBadgeText, { color: '#93C5FD' }]}>Activity</Text>
                          </View>
                        )}
                        <StyledText style={[styles.logDate, { color: currentThemeColors.textSecondary }]}>
                          {formatDistanceToNow(new Date(date), { addSuffix: true })}
                        </StyledText>
                      </View>
                      {isComment ? (
                        <StyledText style={[styles.logText, { color: currentThemeColors.textPrimary }]}>
                          {item.text}
                        </StyledText>
                      ) : (
                        <View>
                          <StyledText style={[styles.logActivityType, { color: '#93C5FD' }]}>
                            {item.type}
                          </StyledText>
                          {item.details && (
                            <View style={styles.logDetails}>
                              {typeof item.details === 'object' ? (
                                Object.entries(item.details).map(([key, value]) => (
                                  <StyledText key={key} style={[styles.logDetailText, { color: currentThemeColors.textSecondary }]}>
                                    {key}: {String(value)}
                                  </StyledText>
                                ))
                              ) : (
                                <StyledText style={[styles.logDetailText, { color: currentThemeColors.textSecondary }]}>
                                  {String(item.details)}
                                </StyledText>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heavyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    gap: 4,
  },
  heavyText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  qrLabel: {
    fontSize: 12,
  },
  labelSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  labelSettingText: {
    fontSize: 14,
  },
  propItem: {
    paddingVertical: 12,
  },
  propItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  propItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  propItemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  propItemBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  propItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  propItemDetail: {
    fontSize: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  commentInputContainer: {
    marginBottom: 16,
  },
  commentInput: {
    minHeight: 80,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 4,
  },
  addCommentButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCommentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logContainer: {
    maxHeight: 400,
  },
  emptyLogContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLogText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyLogSubtext: {
    fontSize: 12,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  logUserName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  activityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  logDate: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  logText: {
    fontSize: 14,
    lineHeight: 20,
  },
  logActivityType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  logDetails: {
    marginTop: 4,
  },
  logDetailText: {
    fontSize: 12,
    marginBottom: 2,
  },
});

