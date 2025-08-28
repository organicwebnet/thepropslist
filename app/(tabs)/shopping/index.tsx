import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ShoppingService } from '../../../src/services/shoppingService';
import { ShoppingItem, ShoppingOption } from '../../../src/types/shopping';
import { FirebaseDocument } from '../../../src/shared/services/firebase/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../src/styles/theme';
import LinearGradient from 'react-native-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

export default function ShoppingListScreen() {
  const { service } = useFirebase();
  const { user, userProfile } = useAuth();
  const { theme: themeName } = useTheme();
  const router = useRouter();
  const currentTheme = themeName === 'dark' ? darkTheme : lightTheme;

  const [shoppingService, setShoppingService] = useState<ShoppingService | null>(null);
  const [items, setItems] = useState<FirebaseDocument<ShoppingItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'prop' | 'material' | 'hired'>('prop');
  const [fabOpen, setFabOpen] = useState(false);
  const [showBought, setShowBought] = useState(true);

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

  const loadItems = useCallback(async () => {
    if (!shoppingService) return;
    
    try {
      const itemDocs = await shoppingService.getShoppingItems();
      setItems(itemDocs);
    } catch (error) {
      console.error('Error loading shopping items:', error);
      Alert.alert('Error', 'Failed to load shopping items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shoppingService]);

  useEffect(() => {
    if (!user || !shoppingService) return;
    
    const unsubscribe = shoppingService.listenToShoppingItems(
      (itemDocs) => {
        setItems(itemDocs);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error listening to shopping items:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [user, shoppingService]);

  // Load items when service is ready
  useEffect(() => {
    if (shoppingService && user) {
      loadItems();
    }
  }, [loadItems, shoppingService, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
  }, [loadItems]);

  const filteredItems = items
    .filter(item => item.data?.type === activeTab)
    .filter(item => 
      item.data?.description.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
    )
    .filter(item => showBought || item.data?.status !== 'bought')
    .sort((a, b) => {
      const aTime = new Date(a.data?.lastUpdated || 0).getTime();
      const bTime = new Date(b.data?.lastUpdated || 0).getTime();
      return bTime - aTime;
    });

  const boughtItemsCount = items
    .filter(item => item.data?.type === activeTab)
    .filter(item => 
      item.data?.description.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
    )
    .filter(item => item.data?.status === 'bought')
    .length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#4CAF50';
      case 'picked': return '#2196F3';
      case 'bought': return '#8BC34A';
      default: return '#fff';
    }
  };

  const getOptionStatusColor = (status: string) => {
    switch (status) {
      case 'buy': return '#4CAF50';
      case 'maybe': return '#FFD600';
      case 'rejected': return '#F44336';
      case 'pending': return '#FFA500';
      default: return '#9CA3AF';
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

  const handleStatusUpdate = async (itemId: string, newStatus: 'pending' | 'approved' | 'picked' | 'bought') => {
    if (!shoppingService) {
      Alert.alert('Error', 'Shopping service not initialized.');
      return;
    }
    try {
      await shoppingService.updateShoppingItem(itemId, { status: newStatus });
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderOption = (option: ShoppingOption, index: number) => {
    const statusColor = getOptionStatusColor(option.status);
    const isSelected = option.status === 'buy';
    const isRejected = option.status === 'rejected';
    
    return (
      <View key={index} style={[
        styles.optionCard,
        isSelected && { backgroundColor: 'rgba(76, 175, 80, 0.2)', borderColor: '#4CAF50' },
        isRejected && { opacity: 0.6, backgroundColor: 'rgba(255, 255, 255, 0.05)' }
      ]}>
        <View style={styles.optionImage}>
          {option.images && option.images.length > 0 ? (
            <Image source={{ uri: option.images[0] }} style={styles.optionImageContent} />
          ) : (
            <Ionicons name="image-outline" size={24} color="rgba(255, 255, 255, 0.5)" />
          )}
        </View>
        <Text style={[styles.optionPrice, isRejected && { color: 'rgba(255, 255, 255, 0.5)' }]}>
          £{option.price.toFixed(2)}
        </Text>
        <Text style={[styles.optionNotes, isRejected && { color: 'rgba(255, 255, 255, 0.5)' }]} numberOfLines={1}>
          {option.notes || 'No notes'}
        </Text>
        <Text style={[styles.optionUploader, isRejected && { color: 'rgba(255, 255, 255, 0.3)' }]} numberOfLines={1}>
          By: {getDisplayName(option.uploadedBy)}
        </Text>
        <View style={[styles.optionStatusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.optionStatusText}>{option.status.toUpperCase()}</Text>
        </View>
      </View>
    );
  };

  const renderShoppingItem = (itemDoc: FirebaseDocument<ShoppingItem>) => {
    const item = itemDoc.data;
    if (!item) return null;

    const canEdit = item.requestedBy === user?.email;

    return (
      <TouchableOpacity
        key={itemDoc.id}
        style={styles.itemCard}
        onPress={() => router.push({ pathname: '/(tabs)/shopping/[id]', params: { id: itemDoc.id } })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <View style={styles.itemBadges}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.itemTitle}>{item.description}</Text>
            
            <View style={styles.itemMeta}>
              <Text style={styles.metaText}>Requested by: {getDisplayName(item.requestedBy)}</Text>
              <Text style={styles.metaText}>Last updated: {new Date(item.lastUpdated).toLocaleDateString()}</Text>
            </View>

            {/* Labels, Quantity, Budget */}
            <View style={styles.itemDetails}>
              {item.labels && item.labels.length > 0 && (
                <View style={styles.labelsContainer}>
                  {item.labels.slice(0, 2).map((label, index) => (
                    <View key={index} style={styles.labelBadge}>
                      <Text style={styles.labelText}>{label}</Text>
                    </View>
                  ))}
                  {item.labels.length > 2 && (
                    <Text style={styles.moreLabelText}>+{item.labels.length - 2} more</Text>
                  )}
                </View>
              )}
              
              <View style={styles.quantityBudgetContainer}>
                {typeof item.quantity === 'number' && (
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                  </View>
                )}
                {typeof item.budget === 'number' && (
                  <View style={styles.budgetBadge}>
                    <Text style={styles.budgetText}>Budget: £{item.budget}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Reference Image */}
          {item.referenceImage && (
            <Image source={{ uri: item.referenceImage }} style={styles.referenceImage} />
          )}
        </View>

        {/* Note */}
        {item.note && (
          <Text style={styles.itemNote} numberOfLines={2}>{item.note}</Text>
        )}

        {/* Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>
            Options ({item.options?.length || 0})
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsScrollContent}
          >
            {item.options && item.options.map((option, index) => renderOption(option, index))}
            
            {/* Large Pink Add Option Button */}
            <TouchableOpacity
              style={styles.addOptionCardButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: '/(tabs)/shopping/[id]/add-option', params: { id: itemDoc.id } });
              }}
            >
              <View style={styles.addOptionCardIcon}>
                <Ionicons name="add" size={32} color="#fff" />
              </View>
              <Text style={styles.addOptionCardText}>Add Option</Text>
            </TouchableOpacity>
          </ScrollView>
          
          {(!item.options || item.options.length === 0) && (
            <Text style={styles.noOptionsHint}>
              Add supplier options to compare prices and track the best deals
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        {item.status === 'picked' && canEdit && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleStatusUpdate(itemDoc.id, 'bought');
            }}
          >
            <Text style={styles.actionButtonText}>Confirm Bought</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const handleFabAction = (type: 'prop' | 'material' | 'hired') => {
    setFabOpen(false);
    router.push({ pathname: '/(tabs)/shopping/add', params: { type } });
  };

  const tabs = [
    { key: 'prop', label: 'Props', icon: 'cube' },
    { key: 'material', label: 'Materials', icon: 'build' },
    { key: 'hired', label: 'Hired', icon: 'briefcase' },
  ] as const;

  const fabOptions = [
    { key: 'prop', label: 'Add Prop', icon: 'cube', color: '#3B82F6' },
    { key: 'material', label: 'Add Material', icon: 'build', color: '#FFD600' },
    { key: 'hired', label: 'Add Hired', icon: 'briefcase', color: '#9C27B0' },
  ] as const;

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
            title: 'Shopping List',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
            headerTransparent: true,
          }} 
        />

        {/* Tabs */}
        <View style={[styles.tabsContainer, { marginTop: 100 }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={activeTab === tab.key ? '#fff' : 'rgba(255, 255, 255, 0.7)'} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#fff' : 'rgba(255, 255, 255, 0.7)' }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Toggle Controls */}
        <View style={styles.toggleControls}>
          <View style={styles.toggleLabelContainer}>
            <Text style={styles.toggleText}>Show Bought Items</Text>
            {!showBought && boughtItemsCount > 0 && (
              <Text style={styles.hiddenCountText}>
                ({boughtItemsCount} hidden)
              </Text>
            )}
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#3A82F6' }}
            thumbColor={showBought ? '#3A82F6' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => setShowBought(!showBought)}
            value={showBought}
          />
        </View>

        {/* Items List */}
        <ScrollView
          style={styles.itemsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-outline" size={48} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.emptyText}>No {activeTab}s found</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => handleFabAction(activeTab)}
              >
                <Text style={styles.addFirstButtonText}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredItems.map(renderShoppingItem)
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <View style={styles.fabContainer}>
          {fabOpen && (
            <View style={styles.fabMenu}>
              {fabOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.fabMenuItem, { backgroundColor: option.color }]}
                  onPress={() => handleFabAction(option.key)}
                >
                  <Ionicons name={option.icon as any} size={20} color="#fff" />
                  <Text style={styles.fabMenuText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.fab, fabOpen && styles.fabOpen]}
            onPress={() => setFabOpen(!fabOpen)}
          >
            <Ionicons 
              name={fabOpen ? "close" : "add"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  toggleControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hiddenCountText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemBadges: {
    flexDirection: 'row',
    marginBottom: 8,
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
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 24,
  },
  itemMeta: {
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  itemDetails: {
    marginBottom: 8,
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  moreLabelText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  quantityBudgetContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quantityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  budgetBadge: {
    backgroundColor: 'rgba(245, 158, 66, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  budgetText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  referenceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  optionsSection: {
    marginTop: 8,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addOptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  optionsScroll: {
    marginVertical: 8,
  },
  optionsScrollContent: {
    gap: 12,
    alignItems: 'center',
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  optionNotes: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionUploader: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  noOptionsPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 200,
  },
  noOptionsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  noOptionsSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noOptionsHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addFirstButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: 16,
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  fabMenuText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabOpen: {
    backgroundColor: '#EF4444',
  },
  addOptionCardButton: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    padding: 12,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#AD1457',
    borderStyle: 'dashed',
    height: 140,
  },
  addOptionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addOptionCardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
}); 