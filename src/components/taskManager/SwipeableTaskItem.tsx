import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme, lightTheme } from '../../styles/theme';
import type { CardData } from '../../shared/types/taskManager';
import { formatDueDate as formatDueDateUtil, isPastDate } from '../../utils/taskHelpers';

interface FlattenedCard extends CardData {
  listId: string;
  listName: string;
}

interface SwipeableTaskItemProps {
  card: FlattenedCard;
  onToggleComplete: (card: FlattenedCard) => void;
  onPress: (card: FlattenedCard) => void;
  onDelete: (cardId: string) => void;
  onEdit: (card: FlattenedCard) => void;
  formatDueDate: (dueDate?: string | any) => string;
  isOverdue: (dueDate?: string | any) => boolean;
  togglingCardId: string | null;
  colors: typeof darkTheme.colors | typeof lightTheme.colors;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen width
const ACTION_BUTTON_WIDTH = 80;

const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
  card,
  onToggleComplete,
  onPress,
  onDelete,
  onEdit,
  formatDueDate,
  isOverdue,
  togglingCardId,
  colors,
}) => {
  const translateX = useSharedValue(0);

  const dueDateText = formatDueDate(card.dueDate);
  const overdue = isOverdue(card.dueDate);

  // Pan gesture for both swipe directions
  // Only activate on horizontal swipes (not vertical scrolling)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Only activate if horizontal movement > 10px
    .failOffsetY([-10, 10]) // Fail if vertical movement > 10px (allows scrolling)
    .onUpdate((event) => {
      if (event.translationX < 0) {
        // Swipe left - reveal actions (limit to action button width)
        translateX.value = Math.max(event.translationX, -ACTION_BUTTON_WIDTH * 2);
      } else if (event.translationX > 0) {
        // Swipe right - complete task (allow full screen width)
        translateX.value = Math.min(event.translationX, SCREEN_WIDTH);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - toggle complete/uncomplete
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, () => {
          runOnJS(onToggleComplete)(card);
          // Reset after a brief delay
          setTimeout(() => {
            translateX.value = withSpring(0);
          }, 150);
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - reveal actions
        translateX.value = withSpring(-ACTION_BUTTON_WIDTH * 2);
      } else {
        // Snap back to center
        translateX.value = withSpring(0);
      }
    });

  // Animated style for the main content
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Animated style for action buttons
  const animatedActionsStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value + ACTION_BUTTON_WIDTH * 2 }],
    };
  });

  // Animated style for completion background (only shows on swipe right)
  const animatedCompletionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
      [0, 0.3, 0.5]
    );
    return {
      opacity: translateX.value > 0 ? opacity : 0,
      backgroundColor: card.completed ? '#ef4444' : colors.success,
    };
  });

  const resetSwipe = useCallback(() => {
    translateX.value = withSpring(0);
  }, [translateX]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${card.title || 'Untitled Task'}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: resetSwipe,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(card.id);
            resetSwipe();
          },
        },
      ]
    );
  }, [card, onDelete, resetSwipe]);

  const handleEdit = useCallback(() => {
    resetSwipe();
    setTimeout(() => {
      onEdit(card);
    }, 200);
  }, [card, onEdit, resetSwipe]);

  const handleTaskPress = useCallback(() => {
    // Close swipe actions if open, then open detail panel
    if (translateX.value < 0) {
      resetSwipe();
      setTimeout(() => {
        onPress(card);
      }, 200);
    } else {
      onPress(card);
    }
  }, [card, onPress, resetSwipe, translateX]);

  return (
    <View style={styles.container}>
      {/* Completion background (shows on swipe right) */}
      <Animated.View style={[styles.completionBackground, animatedCompletionStyle]}>
        <Ionicons
          name={card.completed ? "close-circle" : "checkmark-circle"}
          size={32}
          color="#FFFFFF"
          style={styles.completionIcon}
        />
      </Animated.View>

      {/* Action buttons (reveal on swipe left) */}
      <Animated.View style={[styles.actionButtons, animatedActionsStyle]}>
        <Pressable
          style={[styles.actionButton, styles.editButton, { backgroundColor: colors.primary }]}
          onPress={handleEdit}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.deleteButton, { backgroundColor: '#ef4444' }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      {/* Main content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.taskItem,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            card.completed && { opacity: 0.6 },
            animatedContentStyle,
          ]}
        >
          <Pressable
            onPress={handleTaskPress}
            style={styles.taskContentWrapper}
          >
            {/* Circular Checkbox */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleComplete(card);
              }}
              style={[
                styles.checkbox,
                {
                  borderColor: card.completed ? colors.success : colors.primary,
                  backgroundColor: card.completed ? colors.success : 'transparent',
                },
                togglingCardId === card.id && { opacity: 0.5 },
              ]}
              disabled={togglingCardId === card.id}
            >
              {card.completed && (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              )}
            </Pressable>

            {/* Task Content */}
            <View style={styles.taskContent}>
              <Text
                style={[
                  styles.taskTitle,
                  { color: colors.text },
                  card.completed && styles.completedText,
                ]}
                numberOfLines={2}
              >
                {card.title || 'Untitled Task'}
              </Text>

              {/* Due Date - Inline, subtle */}
              {card.dueDate && (
                <View style={styles.dueDateContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={
                      overdue
                        ? '#ef4444'
                        : dueDateText === 'Due today'
                        ? '#eab308'
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.dueDateText,
                      {
                        color: overdue
                          ? '#ef4444'
                          : dueDateText === 'Due today'
                          ? '#eab308'
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {dueDateText}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  taskContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dueDateText: {
    fontSize: 13,
    fontWeight: '400',
  },
  completionBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  completionIcon: {
    opacity: 0.8,
  },
  actionButtons: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteButton: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});

export default SwipeableTaskItem;

