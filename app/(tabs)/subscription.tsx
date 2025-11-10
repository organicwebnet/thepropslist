/**
 * Subscription Management Screen
 * Allows users to view their current subscription, upgrade/downgrade plans,
 * manage billing, and purchase add-ons
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscription } from '../../src/hooks/useSubscription';
import { useTheme } from '../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../src/styles/theme';
import { stripeService } from '../../src/services/StripeService';
import { SubscriptionStatus } from '../../src/components/SubscriptionStatus';
import type { PricingPlan } from '../../src/shared/types/pricing';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan, status, limits, effectiveLimits, loading: subscriptionLoading } = useSubscription();
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const styles = getStyles(colors);

  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showAddOns, setShowAddOns] = useState(false);

  useEffect(() => {
    loadPricingConfig();
  }, []);

  const loadPricingConfig = async () => {
    try {
      setLoading(true);
      const config = await stripeService.getPricingConfig();
      setPricingConfig(config);
    } catch (error) {
      console.error('Error loading pricing config:', error);
      Alert.alert('Error', 'Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upgrade');
      return;
    }

    if (planId === plan) {
      Alert.alert('Info', 'You are already on this plan');
      return;
    }

    try {
      setCheckoutLoading(true);
      const checkoutUrl = await stripeService.createCheckoutSession(planId, billingInterval);
      
      // Open Stripe checkout in browser
      const canOpen = await Linking.canOpenURL(checkoutUrl);
      if (canOpen) {
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Error', 'Cannot open checkout URL');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      Alert.alert('Error', error.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      setCheckoutLoading(true);
      const billingUrl = await stripeService.createBillingPortalSession();
      
      const canOpen = await Linking.canOpenURL(billingUrl);
      if (canOpen) {
        await Linking.openURL(billingUrl);
      } else {
        Alert.alert('Error', 'Cannot open billing portal');
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      Alert.alert('Error', error.message || 'Failed to open billing portal');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return '#6b7280';
      case 'starter': return '#10b981';
      case 'standard': return '#3b82f6';
      case 'pro': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (subscriptionLoading || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Current Subscription Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        <SubscriptionStatus 
          onUpgradePress={() => setShowAddOns(false)}
          compact={false}
        />
      </View>

      {/* Billing Interval Toggle */}
      {pricingConfig && (
        <View style={styles.section}>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingInterval === 'monthly' && styles.billingOptionActive
              ]}
              onPress={() => setBillingInterval('monthly')}
            >
              <Text style={[
                styles.billingOptionText,
                billingInterval === 'monthly' && styles.billingOptionTextActive
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingInterval === 'yearly' && styles.billingOptionActive
              ]}
              onPress={() => setBillingInterval('yearly')}
            >
              <Text style={[
                styles.billingOptionText,
                billingInterval === 'yearly' && styles.billingOptionTextActive
              ]}>
                Yearly (Save ~10%)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Available Plans */}
      {pricingConfig && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          {pricingConfig.plans
            .filter((p: PricingPlan) => p.id !== 'free' || plan === 'free')
            .map((pricingPlan: PricingPlan) => {
              const isCurrentPlan = pricingPlan.id === plan;
              const planColor = getPlanColor(pricingPlan.id);
              const price = billingInterval === 'monthly' 
                ? pricingPlan.price.monthly 
                : pricingPlan.price.yearly;
              
              return (
                <View 
                  key={pricingPlan.id} 
                  style={[
                    styles.planCard,
                    isCurrentPlan && { borderColor: planColor, borderWidth: 2 }
                  ]}
                >
                  {pricingPlan.popular && (
                    <View style={[styles.popularBadge, { backgroundColor: planColor }]}>
                      <Text style={styles.popularBadgeText}>POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{pricingPlan.name}</Text>
                    <View style={styles.planPriceContainer}>
                      <Text style={styles.planPrice}>£{price}</Text>
                      <Text style={styles.planPeriod}>
                        /{billingInterval === 'monthly' ? 'month' : 'year'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.planDescription}>{pricingPlan.description}</Text>
                  
                  <View style={styles.planFeatures}>
                    {pricingPlan.features.slice(0, 5).map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color={planColor} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {isCurrentPlan ? (
                    <View style={[styles.planButton, { backgroundColor: colors.border }]}>
                      <Text style={styles.planButtonText}>Current Plan</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.planButton, { backgroundColor: planColor }]}
                      onPress={() => handleUpgrade(pricingPlan.id)}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.planButtonText}>
                          {plan && ['free', 'starter'].includes(plan) && ['standard', 'pro'].includes(pricingPlan.id)
                            ? 'Upgrade'
                            : 'Select Plan'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
        </View>
      )}

      {/* Manage Billing Button */}
      {plan !== 'free' && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.manageButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleManageBilling}
            disabled={checkoutLoading}
          >
            <Ionicons name="card-outline" size={20} color={colors.text} />
            <Text style={styles.manageButtonText}>Manage Billing</Text>
            {checkoutLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Add-ons Section */}
      {(plan === 'standard' || plan === 'pro') && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addOnsButton}
            onPress={() => router.push('/add-ons')}
          >
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
            <Text style={styles.addOnsButtonText}>View Add-Ons Marketplace</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const getStyles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  billingOptionActive: {
    backgroundColor: colors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  billingOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  planPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  planFeatures: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  planButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addOnsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addOnsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
});






