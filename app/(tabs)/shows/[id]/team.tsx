import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFirebase } from '../../../../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useShows } from '../../../../src/contexts/ShowsContext';
import { useLimitChecker } from '../../../../src/hooks/useLimitChecker';
import { usePermissions } from '../../../../src/hooks/usePermissions';
import { Picker } from '@react-native-picker/picker';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import type { Show } from '../../../../src/shared/services/firebase/types';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../../../src/styles/theme';
import { JOB_ROLES, ROLE_OPTIONS } from '../../../../src/shared/constants/roleOptions';
import { buildReminderEmailDoc } from '../../../../src/services/EmailTemplateService';
import { validateEmail } from '../../../../src/shared/utils/validation';
import { APP_URL } from '../../../../src/shared/constants/app';

type Invitation = {
  id?: string;
  showId: string;
  role: string;
  jobRole?: string;
  inviterId?: string;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt?: string;
  expiresAt?: string;
  email: string;
  name?: string | null;
};

export default function TeamPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { service } = useFirebase();
  const { user } = useAuth();
  const { getShowById } = useShows();
  const { checkCollaboratorsLimitForShow } = useLimitChecker();
  const { isGod } = usePermissions();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? appDarkTheme : appLightTheme;

  const [show, setShow] = useState<Show | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteJobRole, setInviteJobRole] = useState<string>('propmaker');
  const [inviteRole, setInviteRole] = useState<string>('propmaker');
  const [submitting, setSubmitting] = useState(false);

  // Load show data
  useEffect(() => {
    if (!params.id) return;
    const loadShow = async () => {
      try {
        const showData = await getShowById(params.id);
        if (showData) {
          setShow(showData);
          setCollaborators(Array.isArray(showData.collaborators) ? showData.collaborators : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load show');
      } finally {
        setLoading(false);
      }
    };
    loadShow();
  }, [params.id, getShowById]);

  // Listen to invitations
  useEffect(() => {
    if (!params.id || !service) return;
    const unsub = service.listenToCollection('invitations', (docs: any) => {
      const list = docs
        .map((d: any) => ({ ...(d.data as any), id: d.id }))
        .filter((d: any) => d.showId === params.id && (d.status === 'pending' || !d.status));
      setInvites(list);
    }, () => { /* ignore */ }, { where: [['showId', '==', params.id as any]] });
    return () => { if (unsub) unsub(); };
  }, [service, params.id]);

  // Check limits - Skip limit checks for god users
  useEffect(() => {
    const checkLimits = async () => {
      if (!params.id || !user?.uid) return;
      
      // God users bypass all limit checks
      if (isGod()) {
        setLimitWarning(null);
        return;
      }
      
      try {
        const limitCheck = await checkCollaboratorsLimitForShow(params.id);
        if (!limitCheck.withinLimit) {
          setLimitWarning(limitCheck.message || 'Collaborators limit reached');
        } else {
          setLimitWarning(null);
        }
      } catch (error) {
        console.error('Error checking collaborators limits:', error);
      }
    };
    checkLimits();
  }, [params.id, user?.uid, collaborators.length, checkCollaboratorsLimitForShow, isGod]);

  const handleInvite = async () => {
    if (!params.id || !inviteEmail) return;

    // Validate email
    const emailValidation = validateEmail(inviteEmail);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Please enter a valid email address');
      return;
    }

    // Check collaborators limit before inviting
    // Skip limit checks for god users
    if (!isGod()) {
      try {
        const limitCheck = await checkCollaboratorsLimitForShow(params.id);
        if (!limitCheck.withinLimit) {
          setError(limitCheck.message || 'Collaborators limit reached');
          return;
        }
      } catch (limitError) {
        console.error('Error checking collaborators limits:', limitError);
        setError('Error checking limits. Please try again.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      // Prevent inviting an email that already has an Auth account
      try {
        const methods = await fetchSignInMethodsForEmail(getAuth(), inviteEmail);
        if (Array.isArray(methods) && methods.length > 0) {
          setError('This email is already registered. Ask them to sign in and open the invite link, or add them directly as a collaborator.');
          setSubmitting(false);
          return;
        }
      } catch (authCheckErr) {
        console.warn('Email check failed', authCheckErr);
      }

      // Use Cloud Function for proper invitation creation
      const createInvitation = httpsCallable(getFunctions(), 'createTeamInvitation');
      const result = await createInvitation({
        showId: params.id,
        email: inviteEmail,
        name: inviteName || null,
        role: inviteJobRole,
        jobRole: inviteJobRole,
      });

      // Success - invitation created and email queued
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteJobRole('propmaker');
      setInviteRole('propmaker');
      Alert.alert('Success', 'Invite sent successfully!');
    } catch (err: any) {
      let errorMessage = 'Something went wrong. Please try again later.';
      if (err.code === 'permission-denied') {
        errorMessage = 'You don\'t have permission to invite team members. Please contact your administrator.';
      } else if (err.code === 'invalid-argument') {
        errorMessage = 'Please check your email address and try again.';
      } else if (err.code === 'not-found') {
        errorMessage = 'Show not found. Please refresh the page and try again.';
      } else if (err.code === 'unauthenticated') {
        errorMessage = 'Please sign in to send invitations.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    if (!inv.id || !show) return;
    try {
      const inviteUrl = `${APP_URL}/join/${inv.id}`;
      const emailDoc = buildReminderEmailDoc({
        toEmail: inv.email,
        showName: show.name || 'this show',
        inviteUrl,
        inviteeName: inv.name || null,
        role: inv.role || 'viewer',
      });
      await service.addDocument('emails', emailDoc);
      Alert.alert('Success', 'Reminder email queued.');
    } catch (e) {
      Alert.alert('Error', 'Failed to resend.');
    }
  };

  const handleRevoke = async (inv: Invitation) => {
    if (!inv.id) return;
    try {
      await service.updateDocument('invitations', inv.id, { ...inv, status: 'revoked' } as any, { merge: true });
      Alert.alert('Success', 'Invitation revoked.');
    } catch (err) {
      Alert.alert('Error', 'Failed to revoke invitation.');
    }
  };

  const handleRoleChange = async (email: string, role: 'editor' | 'viewer') => {
    if (!show) return;
    const next = (show.collaborators || []).map((c: any) => c.email === email ? { ...c, role } : c);
    await service.updateDocument('shows', show.id, { collaborators: next } as any);
  };

  const handleRemove = async (email: string) => {
    if (!show) return;
    Alert.alert(
      'Remove Collaborator',
      `Are you sure you want to remove ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const next = (show.collaborators || []).filter((c: any) => c.email !== email);
              await service.updateDocument('shows', show.id, { collaborators: next } as any);
            } catch (err) {
              Alert.alert('Error', 'Failed to remove collaborator.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Team' }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading team…</Text>
        </View>
      </View>
    );
  }

  if (error && !show) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Team' }} />
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!show) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Team' }} />
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>Show not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary || colors.background]}
      style={styles.container}
    >
      <Stack.Screen options={{ title: `Team · ${show.name}` }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Limit Warning Banner - Hidden for god users */}
        {limitWarning && !isGod() && (
          <View style={[styles.warningBanner, { backgroundColor: colors.error + '20', borderColor: colors.error + '30' }]}>
            <View style={styles.warningContent}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <View style={styles.warningTextContainer}>
                <Text style={[styles.warningTitle, { color: colors.error }]}>Subscription Limit Reached</Text>
                <Text style={[styles.warningText, { color: colors.text }]}>{limitWarning}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/subscription' as any)}
                  style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.upgradeButtonText, { color: '#fff' }]}>Upgrade Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Team · {show.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Collaborators</Text>
            <TouchableOpacity
              onPress={() => setInviteOpen(true)}
              style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.inviteButtonText, { color: '#fff' }]}>Invite teammate</Text>
            </TouchableOpacity>
          </View>

          {inviteOpen && (
            <View style={[styles.inviteForm, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.text }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Alex Props"
                placeholderTextColor={colors.textSecondary}
                value={inviteName}
                onChangeText={setInviteName}
              />

              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="invitee@example.com"
                placeholderTextColor={colors.textSecondary}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.text }]}>Job role</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Picker
                  selectedValue={inviteJobRole}
                  onValueChange={setInviteJobRole}
                  style={[styles.picker, { color: colors.text }]}
                >
                  {JOB_ROLES.map(r => (
                    <Picker.Item key={r.value} label={r.label} value={r.value} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Role</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Picker
                  selectedValue={inviteRole}
                  onValueChange={setInviteRole}
                  style={[styles.picker, { color: colors.text }]}
                >
                  {ROLE_OPTIONS.map(role => (
                    <Picker.Item key={role.value} label={role.label} value={role.value} />
                  ))}
                </Picker>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  onPress={() => setInviteOpen(false)}
                  style={[styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleInvite}
                  disabled={submitting}
                  style={[styles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.submitButtonText, { color: '#fff' }]}>Send invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={[styles.collaboratorsList, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {(collaborators || []).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No collaborators yet.</Text>
              </View>
            ) : (
              (collaborators || []).map((c: any) => (
                <View key={c.email} style={[styles.collaboratorItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.collaboratorInfo}>
                    <Text style={[styles.collaboratorEmail, { color: colors.text }]}>{c.email}</Text>
                    <Text style={[styles.collaboratorMeta, { color: colors.textSecondary }]}>
                      Added by {c.addedBy || '—'}
                    </Text>
                  </View>
                  <View style={styles.collaboratorActions}>
                    <View style={[styles.rolePickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <Picker
                        selectedValue={c.role || 'viewer'}
                        onValueChange={(value) => handleRoleChange(c.email, value as 'editor' | 'viewer')}
                        style={[styles.rolePicker, { color: colors.text }]}
                      >
                        {ROLE_OPTIONS.map(role => (
                          <Picker.Item key={role.value} label={role.label} value={role.value} />
                        ))}
                      </Picker>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(c.email)}
                      style={[styles.removeButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    >
                      <Text style={[styles.removeButtonText, { color: colors.text }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending invites</Text>
          <View style={[styles.invitesList, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {invites.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No pending invites.</Text>
              </View>
            ) : (
              invites.map(inv => (
                <View key={inv.id} style={[styles.inviteItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.inviteInfo}>
                    <Text style={[styles.inviteEmail, { color: colors.text }]}>
                      {inv.name || 'Invitee'} &lt;{inv.email}&gt;
                    </Text>
                    <Text style={[styles.inviteMeta, { color: colors.textSecondary }]}>
                      Role: {inv.role} · Status: {inv.status || 'pending'}
                    </Text>
                  </View>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      onPress={() => handleResend(inv)}
                      style={[styles.resendButton, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.resendButtonText, { color: '#fff' }]}>Resend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRevoke(inv)}
                      style={[styles.revokeButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    >
                      <Text style={[styles.revokeButtonText, { color: colors.text }]}>Revoke</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
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
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  warningBanner: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 12,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inviteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  collaboratorsList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 16,
  },
  emptyStateText: {
    fontSize: 14,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  collaboratorMeta: {
    fontSize: 12,
  },
  collaboratorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    width: 120,
  },
  rolePicker: {
    height: 40,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  invitesList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 12,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  inviteMeta: {
    fontSize: 12,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resendButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

