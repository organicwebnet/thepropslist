/**
 * Add-Ons Marketplace Screen
 * Allows users to purchase add-ons to extend their subscription limits
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useSubscription } from '../src/hooks/useSubscription';
import { useTheme } from '../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../src/styles/theme';
import { addOnService } from '../src/services/AddOnService';
import { DEFAULT_ADDONS, type AddOn } from '../src/shared/types/addOns';

export default function AddOnsMarketplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan, canPurchaseAddOns } = useSubscription();
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const styles = getStyles(colors);

  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [confirmPurchase, setConfirmPurchase] = useState<{ addOn: AddOn; addOnId: string } | null>(null);

  useEffect(() => {
    if (canPurchaseAddOns) {
      loadAddOns();
    }
  }, [canPurchaseAddOns]);

  const loadAddOns = async () => {
    setLoading(true);
    try {
      // Filter add-ons for current plan
      const availableAddOns = DEFAULT_ADDONS.filter(addOn => 
        addOn.targetPlans.includes(plan as 'standard' | 'pro')
      );
      setAddOns(availableAddOns);
    } catch (error) {
      console.error('Error loading add-ons:', error);
      Alert.alert('Error', 'Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (addOnId: string) => {
    const addOn = addOns.find(a => a.id === addOnId);
    if (!addOn) return;
    setConfirmPurchase({ addOn, addOnId });
  };

  const handleConfirmPurchase = async () => {
    if (!user || !confirmPurchase) return;
    
    const { addOn, addOnId } = confirmPurchase;
    
    setPurchasing(addOnId);
    try {
      const result = await addOnService.purchaseAddOn(user.uid, addOnId, billingInterval);
      if (result.success) {
        Alert.alert(
          'Success',
          'Add-on purchased successfully! It will be added to your next billing cycle.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setConfirmPurchase(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to purchase add-on');
      }
    } catch (error: any) {
      console.error('Error purchasing add-on:', error);
      Alert.alert('Error', error.message || 'An error occurred while purchasing the add-on.');
    } finally {
      setPurchasing(null);
    }
  };

  if (!canPurchaseAddOns) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>Add-Ons Not Available</Text>
        <Text style={styles.errorText}>
          Add-ons are only available for Standard and Pro plans.
          {plan === 'free' && ' Upgrade your plan to access add-ons.'}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading add-ons...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add-Ons Marketplace</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Billing Toggle */}
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

      {/* Add-Ons Grid */}
      <View style={styles.addOnsGrid}>
        {addOns.map((addOn) => (
          <View key={addOn.id} style={styles.addOnCard}>
            {addOn.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </View>
            )}
            
            <Text style={styles.addOnName}>{addOn.name}</Text>
            <Text style={styles.addOnDescription}>{addOn.description}</Text>
            
            <View style={styles.addOnPriceContainer}>
              <Text style={styles.addOnPrice}>
                £{billingInterval === 'monthly' ? addOn.monthlyPrice : addOn.yearlyPrice}
              </Text>
              <Text style={styles.addOnPeriod}>
                /{billingInterval === 'monthly' ? 'mo' : 'yr'}
              </Text>
            </View>
            
            <Text style={styles.addOnQuantity}>
              +{addOn.quantity} {addOn.type.replace(/_/g, ' ')}
            </Text>
            
            <View style={styles.addOnFeatures}>
              {addOn.features.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                { backgroundColor: colors.primary },
                purchasing === addOn.id && styles.purchaseButtonDisabled
              ]}
              onPress={() => handlePurchaseClick(addOn.id)}
              disabled={purchasing === addOn.id}
            >
              {purchasing === addOn.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.purchaseButtonText}>Purchase</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={!!confirmPurchase}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmPurchase(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirm Add-On Purchase
            </Text>
            {confirmPurchase && (
              <>
                <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                  Are you sure you want to purchase "{confirmPurchase.addOn.name}" for £
                  {billingInterval === 'monthly' 
                    ? confirmPurchase.addOn.monthlyPrice 
                    : confirmPurchase.addOn.yearlyPrice}
                  /{billingInterval === 'monthly' ? 'month' : 'year'}?
                </Text>
                <Text style={[styles.modalSubMessage, { color: colors.textSecondary }]}>
                  This will be added to your next billing cycle.
                </Text>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setConfirmPurchase(null)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.primary }]}
                onPress={handleConfirmPurchase}
                disabled={!!purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Purchase</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
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
  addOnsGrid: {
    gap: 16,
  },
  addOnCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: colors.primary,
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
  addOnName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  addOnDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  addOnPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  addOnPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  addOnPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  addOnQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  addOnFeatures: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 6,
    flex: 1,
  },
  purchaseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubMessage: {
    fontSize: 14,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonConfirm: {
    // backgroundColor set inline
  },
  modalButtonCancelText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});






