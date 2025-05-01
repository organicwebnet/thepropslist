import React, { useState } from 'react';
import { Theater, User, Building, Pencil, Trash2 } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import type { Show, ShowFormData } from '../types';
import ShowForm from './ShowForm';
import { useAuth } from '../contexts/AuthContext';

interface ShowListProps {
  shows: Show[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, data: ShowFormData) => void;
  onSelect: (show: Show) => void;
  selectedShowId?: string;
  currentUserEmail?: string;
}

export function ShowList({ shows, onDelete, onEdit, onSelect, selectedShowId, currentUserEmail }: ShowListProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (show: Show) => {
    setEditingId(show.id);
  };

  const handleEditSubmit = async (data: ShowFormData) => {
    if (editingId && onEdit) {
      await onEdit(editingId, data);
      setEditingId(null);
    }
  };

  const isShowOwner = (show: Show) => {
    return !!user && show.userId === user.uid;
  };

  return (
    <View style={styles.listContainer}>
      {shows.map((show) => (
        <View key={show.id} style={styles.showItemContainer}>
          {editingId === show.id ? (
            
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Show Form Placeholder</Text>
              <TouchableOpacity onPress={() => setEditingId(null)} style={styles.placeholderButton}>
                 <Text style={styles.placeholderButtonText}>Cancel Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.showCardBase,
                selectedShowId === show.id && styles.selectedCard,
                { padding: 16 }
              ]}
              onPress={() => onSelect(show)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconAndTitle}>
                  <View style={[styles.iconBackground, selectedShowId === show.id && styles.selectedIconBackground]}>
                     
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.titleText} numberOfLines={2}>
                      {show.name}
                    </Text>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsText}>
                        {show.acts?.length || 0} Act{(show.acts?.length || 0) !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.detailsText}>•</Text>
                      <Text style={styles.detailsText}>
                        {(show.acts || []).reduce((total, act) => total + (act.scenes?.length || 0), 0)} Scene
                        {(show.acts || []).reduce((total, act) => total + (act.scenes?.length || 0), 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {selectedShowId === show.id ? (
                      <View style={styles.selectedBadgeContainer}>
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>
                            Currently Selected
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    onPress={(e: GestureResponderEvent) => {
                      e.stopPropagation();
                      onSelect(show);
                    }}
                    style={[styles.selectButton, selectedShowId === show.id && styles.selectButtonActive]}
                    disabled={selectedShowId === show.id}
                    activeOpacity={selectedShowId === show.id ? 1 : 0.7}
                  >
                    <Text style={[styles.selectButtonText, selectedShowId === show.id && styles.selectButtonTextActive]}>
                      {selectedShowId === show.id ? 'Currently Active' : 'Select Show'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e: GestureResponderEvent) => {
                      e.stopPropagation();
                      handleEdit(show);
                    }}
                    style={styles.iconButton}
                    accessibilityLabel="Edit show"
                    activeOpacity={0.7}
                  >
                     
                  </TouchableOpacity>
                  {isShowOwner(show) && onEdit && onDelete ? (
                    <TouchableOpacity
                      onPress={(e: GestureResponderEvent) => {
                        e.stopPropagation();
                        onDelete(show.id);
                      }}
                      style={styles.iconButton}
                      accessibilityLabel="Delete show"
                      activeOpacity={0.7}
                    >
                       
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {shows.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Text style={styles.emptyListText}>No shows added yet. Create your first show to get started!</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 10,
  },
  showItemContainer: {
    marginBottom: 16,
  },
  showCardBase: {
    backgroundColor: '#2D2D2D',
    borderColor: '#404040',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconAndTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
  },
  iconBackground: {
    backgroundColor: '#F59E0B',
    padding: 8,
    borderRadius: 8,
  },
  selectedIconBackground: {
    backgroundColor: '#F59E0B',
  },
  titleContainer: {
    marginLeft: 16,
    flex: 1,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailsText: {
    color: '#9CA3AF',
    marginRight: 8,
    fontSize: 12,
  },
  selectedBadgeContainer: {
    marginTop: 8,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#F59E0B',
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    marginRight: 8,
  },
  selectButtonActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  selectButtonTextActive: {
    color: '#34D399',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyListContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#9CA3AF',
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  placeholderButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  placeholderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});