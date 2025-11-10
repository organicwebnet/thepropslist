/**
 * Subscription Status Component
 * 
 * Displays current subscription plan, limits, and usage
 * Can be used in profile screen or as a standalone component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { isUnlimited } from '../shared/utils/limitUtils';

interface SubscriptionStatusProps {
  onUpgradePress?: () => void;
  compact?: boolean;
}

export function SubscriptionStatus({ onUpgradePress, compact = false }: SubscriptionStatusProps) {
  const { plan, status, limits, effectiveLimits, loading, error } = useSubscription();
  const { isExempt } = usePermissions();
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle" size={20} color={colors.error || '#ef4444'} />
        <Text style={styles.errorText}>Error loading subscription</Text>
      </View>
    );
  }

  const planDisplayName = plan === 'free' ? 'Free' 
    : plan === 'starter' ? 'Starter'
    : plan === 'standard' ? 'Standard'
    : plan === 'pro' ? 'Pro'
    : 'Unknown';

  const planColor = plan === 'free' ? '#6b7280'
    : plan === 'starter' ? '#10b981'
    : plan === 'standard' ? '#3b82f6'
    : plan === 'pro' ? '#8b5cf6'
    : '#6b7280';

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, { borderColor: planColor }]}
        onPress={onUpgradePress}
        disabled={!onUpgradePress}
        accessibilityLabel={`Subscription plan: ${planDisplayName}`}
        accessibilityRole="button"
        accessibilityHint={onUpgradePress ? "Double tap to view upgrade options" : undefined}
      >
        <View style={styles.compactRow}>
          <View style={[styles.planBadge, { backgroundColor: planColor }]}>
            <Text style={styles.planBadgeText}>{planDisplayName}</Text>
          </View>
          {isExempt && (
            <Text style={styles.exemptBadge}>Unlimited</Text>
          )}
          {onUpgradePress && plan !== 'pro' && !isExempt && (
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="card" size={24} color={planColor} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Subscription</Text>
            <View style={styles.planRow}>
              <View style={[styles.planBadge, { backgroundColor: planColor }]}>
                <Text style={styles.planBadgeText}>{planDisplayName}</Text>
              </View>
              {isExempt && (
                <View style={styles.exemptBadgeContainer}>
                  <Text style={styles.exemptBadge}>Unlimited Access</Text>
                </View>
              )}
              {status && status !== 'active' && status !== 'exempt' && (
                <Text style={styles.statusText}>• {status}</Text>
              )}
            </View>
          </View>
        </View>
        {onUpgradePress && plan !== 'pro' && !isExempt && (
          <TouchableOpacity 
            style={styles.upgradeButton} 
            onPress={onUpgradePress}
            accessibilityLabel="Upgrade subscription plan"
            accessibilityRole="button"
            accessibilityHint="Double tap to view available subscription plans and upgrade options"
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isExempt && (
        <View style={styles.limitsSection}>
          <Text style={styles.sectionTitle}>Your Limits</Text>
          
          <View style={styles.limitRow}>
            <Ionicons name="film" size={16} color={colors.textSecondary} />
            <Text style={styles.limitLabel}>Shows:</Text>
            <Text style={styles.limitValue}>
              {isUnlimited(effectiveLimits.shows) ? 'Unlimited' : effectiveLimits.shows}
            </Text>
          </View>

          <View style={styles.limitRow}>
            <Ionicons name="cube" size={16} color={colors.textSecondary} />
            <Text style={styles.limitLabel}>Props:</Text>
            <Text style={styles.limitValue}>
              {isUnlimited(effectiveLimits.props) ? 'Unlimited' : effectiveLimits.props}
            </Text>
          </View>

          <View style={styles.limitRow}>
            <Ionicons name="archive" size={16} color={colors.textSecondary} />
            <Text style={styles.limitLabel}>Packing Boxes:</Text>
            <Text style={styles.limitValue}>
              {isUnlimited(effectiveLimits.packingBoxes) ? 'Unlimited' : effectiveLimits.packingBoxes}
            </Text>
          </View>

          <View style={styles.limitRow}>
            <Ionicons name="list" size={16} color={colors.textSecondary} />
            <Text style={styles.limitLabel}>Boards:</Text>
            <Text style={styles.limitValue}>
              {isUnlimited(effectiveLimits.boards) ? 'Unlimited' : effectiveLimits.boards}
            </Text>
          </View>
        </View>
      )}

      {isExempt && (
        <View style={styles.exemptSection}>
          <Ionicons name="star" size={20} color={colors.primary} />
          <Text style={styles.exemptText}>
            You have unlimited access to all features.
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  planBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exemptBadgeContainer: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  exemptBadge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  limitsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  exemptSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exemptText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error || '#ef4444',
    marginLeft: 8,
  },
});

