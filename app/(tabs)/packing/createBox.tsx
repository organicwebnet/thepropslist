import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../src/styles/theme';
import { useShows } from '../../../src/contexts/ShowsContext';
import { useProps } from '../../../src/contexts/PropsContext';
import { usePacking } from '../../../src/hooks/usePacking';
import { useLimitChecker } from '../../../src/hooks/useLimitChecker';
import { useAuth } from '../../../src/contexts/AuthContext';
import type { PackedProp } from '../../../src/types/packing';
import { CONTAINER_TYPES } from '../../../src/shared/constants/containerTypes';

type Step = 'select' | 'review';

export default function CreateBoxScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(colors);
  const { selectedShow } = useShows();
  const { props: allProps } = useProps();
  const { operations, loading: packingLoading } = usePacking(selectedShow?.id);
  const { user } = useAuth();
  const { checkPackingBoxLimit, checkPackingBoxLimitForShow } = useLimitChecker();

  const available = useMemo(
    () => (selectedShow ? (allProps || []).filter(p => p.showId === selectedShow.id) : (allProps || [])),
    [allProps, selectedShow]
  );

  const [step, setStep] = useState<Step>('select');
  const [q, setQ] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const containerTypes = CONTAINER_TYPES as readonly string[];
  const [containerType, setContainerType] = useState<string>('Box');

  const filtered = useMemo(() => (q ? available.filter(p => p.name.toLowerCase().includes(q.toLowerCase())) : available), [available, q]);
  const selected = useMemo(() => available.filter(p => ids.includes(p.id)), [available, ids]);
  const toggle = (id: string) => setIds(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]));

  const handleCreate = async () => {
    if (!selectedShow) {
      Alert.alert('Select a show first');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a box.');
      return;
    }
    if (selected.length === 0 || !name.trim()) return;

    // Check subscription limits
    try {
      // Check per-plan limit
      const planLimitCheck = await checkPackingBoxLimit(user.uid);
      if (!planLimitCheck.withinLimit) {
        Alert.alert(
          'Limit Reached',
          planLimitCheck.message || `You have reached your plan's packing box limit of ${planLimitCheck.limit}. Please upgrade to create more packing boxes.`,
          [
            { text: 'OK' },
            { 
              text: 'View Plans', 
              onPress: () => {
                // TODO: Navigate to subscription/upgrade screen when available
                console.log('Navigate to upgrade screen');
              }
            }
          ]
        );
        return;
      }

      // Check per-show limit
      const showLimitCheck = await checkPackingBoxLimitForShow(selectedShow.id);
      if (!showLimitCheck.withinLimit) {
        Alert.alert(
          'Limit Reached',
          showLimitCheck.message || `This show has reached its packing box limit of ${showLimitCheck.limit}. Please upgrade to create more packing boxes.`,
          [
            { text: 'OK' },
            { 
              text: 'View Plans', 
              onPress: () => {
                // TODO: Navigate to subscription/upgrade screen when available
                console.log('Navigate to upgrade screen');
              }
            }
          ]
        );
        return;
      }
    } catch (limitError) {
      console.error('Limit check failed:', limitError);
      Alert.alert('Error', 'Unable to verify subscription limits. Please try again.');
      return;
    }

    setIsSaving(true);
    try {
      const packedProps: PackedProp[] = selected.map(p => ({
        propId: p.id,
        name: p.name || 'Unnamed Prop',
        quantity: 1,
        weight: 0,
        weightUnit: 'kg',
        isFragile: false,
      }));

      const newId = await operations.createBox(packedProps, name.trim(), `Created from mobile – ${containerType}`);
      if (newId) {
        await operations.updateBox(newId, { containerType });
        Alert.alert('Box created', undefined, [
          { text: 'OK', onPress: () => router.navigate({ pathname: '/(tabs)/packing/list', params: { showId: selectedShow.id } } as any) }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create box.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (packingLoading && step === 'select') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ title: 'Create Box' }} />
      {step === 'select' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={s.h}>Select props</Text>
          <View style={s.searchRow}>
            <Feather name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput style={s.searchInput} placeholder="Search props" placeholderTextColor={colors.textSecondary} value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => String((item as any)?.id ?? `${(item as any)?.name ?? 'item'}-${index}`)}
            renderItem={({ item }) => {
              const checked = ids.includes(item.id);
              return (
                <TouchableOpacity onPress={() => toggle(item.id)} style={[s.row, checked && s.rowChecked]}>
                  <View style={[s.cb, checked && s.cbOn]}>{checked ? <Feather name="check" size={14} color={colors.card} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={1}>{item.name}</Text>
                    {!!item.category && <Text style={s.sub}>{item.category}</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={s.sub}>No props found.</Text>}
          />
          <View style={s.bottom}>
            <Text style={s.sub}>Selected: {selected.length}</Text>
            <TouchableOpacity style={[s.primary, selected.length === 0 && { opacity: 0.4 }]} disabled={selected.length === 0} onPress={() => setStep('review')}>
              <Text style={s.primaryText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <TouchableOpacity onPress={() => setStep('select')} style={{ paddingVertical: 6 }}><Text style={s.sub}>← Back</Text></TouchableOpacity>
          <Text style={s.h}>Name & review</Text>
          <Text style={s.label}>Box name</Text>
          <TextInput style={s.input} placeholder="Suggested name" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />

          <Text style={[s.label, { marginTop: 12 }]}>Container type</Text>
          <View style={s.typeRow}>
            {containerTypes.map((t) => {
              const active = containerType === t;
              return (
                <TouchableOpacity key={t} onPress={() => setContainerType(t)} style={[s.typeChip, active && s.typeChipActive]}>
                  <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.label, { marginTop: 12 }]}>Items ({selected.length})</Text>
          <FlatList data={selected} keyExtractor={i => i.id} renderItem={({ item }) => (
            <View style={s.reviewRow}><Text style={s.title} numberOfLines={1}>{item.name}</Text><Text style={s.subStrong}>Qty: {item.quantity || 1}</Text></View>
          )} />
          <View style={[s.bottom, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={[s.primary, (selected.length === 0 || !name?.trim()) && { opacity: 0.4 }]} disabled={selected.length === 0 || !name?.trim() || isSaving} onPress={handleCreate}>
              {isSaving ? <ActivityIndicator color={colors.card} /> : <Text style={s.primaryText}>Create</Text>}
          </TouchableOpacity>
        </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = (c: typeof lightTheme.colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  h: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBackground || c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  searchInput: { flex: 1, color: c.text, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginBottom: 10 },
  rowChecked: { borderColor: c.primary, backgroundColor: c.highlightBg },
  cb: { width: 22, height: 22, marginRight: 12, borderRadius: 6, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  cbOn: { backgroundColor: c.primary, borderColor: c.primary },
  title: { color: c.text, fontSize: 16, fontWeight: '700' },
  sub: { color: c.textSecondary, fontSize: 13 },
  subStrong: { color: c.text, fontSize: 13, fontWeight: '600' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 20 : 14 },
  primary: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  primaryText: { color: c.card, fontWeight: '800' },
  label: { color: c.text, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: c.inputBackground || c.card, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginBottom: 8 },
  typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  typeChipText: { color: c.textSecondary, fontWeight: '600' },
  typeChipTextActive: { color: c.card, fontWeight: '800' },
}); 
