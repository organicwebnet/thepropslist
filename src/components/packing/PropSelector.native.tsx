import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Prop } from '../../shared/types/props';
import { PropInstance } from './PackingList.native';
import { lightTheme, darkTheme } from '../../styles/theme';

const theme = darkTheme;

interface PropSelectorProps {
  props: PropInstance[];
  selectedProps: PropInstance[];
  onChange: (props: PropInstance[]) => void;
  disabled?: boolean;
}

export function PropSelector({
  props,
  selectedProps,
  onChange,
  disabled = false,
}: PropSelectorProps) {
  const handlePropToggle = (prop: PropInstance) => {
    const isSelected = selectedProps.some(p => p.instanceId === prop.instanceId);
    if (isSelected) {
      onChange(selectedProps.filter(p => p.instanceId !== prop.instanceId));
    } else {
      onChange([...selectedProps, prop]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Props to Pack</Text>
      <ScrollView 
        style={styles.propsGrid} 
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        {props.map((prop) => {
          const isSelected = selectedProps.some(p => p.instanceId === prop.instanceId);
          return (
            <TouchableOpacity
              key={prop.instanceId}
              onPress={() => handlePropToggle(prop)}
              disabled={disabled}
              style={[
                styles.propButton,
                isSelected ? styles.propButtonSelected : styles.propButtonUnselected,
                disabled && styles.propButtonDisabled
              ]}
            >
              <View style={styles.propContent}>
                {prop.images?.[0]?.url ? (
                  <Image
                    source={{ uri: prop.images[0].url }}
                    style={styles.propImage}
                  />
                ) : (
                  <View style={styles.propImagePlaceholder}>
                    <Text style={styles.propImagePlaceholderText}>
                      {prop.name?.[0]?.toUpperCase() || 'P'}
                    </Text>
                  </View>
                )}
                <View style={styles.propInfo}>
                  <Text style={[
                    styles.propName,
                    isSelected ? styles.propNameSelected : styles.propNameUnselected
                  ]} numberOfLines={2}>
                    {prop.name}
                  </Text>
                  <Text style={[
                    styles.propDetails,
                    isSelected ? styles.propDetailsSelected : styles.propDetailsUnselected
                  ]} numberOfLines={1}>
                    {prop.category}
                    {prop.quantity > 1 && ` • Qty: ${prop.quantity}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {props.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No props available for this show
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  propsGrid: {
    maxHeight: 300, // Limit height for scrollability
    marginBottom: 8,
  },
  propButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  propButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  propButtonUnselected: {
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
  },
  propButtonDisabled: {
    opacity: 0.5,
  },
  propContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  propImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
  },
  propImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propImagePlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  propInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  propName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  propNameSelected: {
    color: '#fff',
  },
  propNameUnselected: {
    color: theme.colors.textPrimary,
  },
  propDetails: {
    fontSize: 12,
  },
  propDetailsSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  propDetailsUnselected: {
    color: theme.colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
}); 
