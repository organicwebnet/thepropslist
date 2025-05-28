import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { PropInstance } from './PackingList.native.tsx';
import { CheckSquare, Square } from 'lucide-react-native'; // For selection indication

interface PropSelectorNativeProps {
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
}: PropSelectorNativeProps) {

  const handlePropToggle = (prop: PropInstance) => {
    if (disabled) return;
    const isCurrentlySelected = selectedProps.some(p => p.instanceId === prop.instanceId);
    if (isCurrentlySelected) {
      onChange(selectedProps.filter(p => p.instanceId !== prop.instanceId));
    } else {
      onChange([...selectedProps, prop]);
    }
  };

  const filteredAndSelectableProps = props.filter(p => !p.isPacked || selectedProps.some(sp => sp.instanceId === p.instanceId));

  return (
    <View style={styles.container}>
      {/* Label can be part of the parent component if needed, or styled here */}
      {/* <Text style={styles.label}>Select Props to Pack</Text> */}
      {filteredAndSelectableProps.length === 0 && !disabled && (
        <Text style={styles.emptyText}>No available props for this selection.</Text>
      )}
       {disabled && props.length > 0 && (
        <Text style={styles.emptyText}>Selection disabled.</Text>
      )}
      {filteredAndSelectableProps.map((item) => {
        const isCurrentlySelected = selectedProps.some(p => p.instanceId === item.instanceId);
        return (
          <TouchableOpacity 
            key={item.instanceId}
            style={[styles.propItem, isCurrentlySelected && styles.propItemSelected, disabled && styles.disabledItem]} 
            onPress={() => handlePropToggle(item)}
            disabled={disabled || item.isPacked}
          >
            <View style={styles.propItemContent}>
              {item.images?.[0]?.url ? (
                <Image source={{ uri: item.images[0].url }} style={styles.propImage} />
              ) : (
                <View style={styles.propImagePlaceholder}>
                  <Text style={styles.propImagePlaceholderText}>{item.name[0]?.toUpperCase() || 'P'}</Text>
                </View>
              )}
              <View style={styles.propDetails}>
                <Text style={styles.propName} numberOfLines={1}>{item.name}</Text>
                {/* {item.character && <Text style={styles.propSubDetail}>Character: {item.character}</Text>} */}
                {item.quantity && item.quantity > 1 && <Text style={styles.propSubDetail}>Total Qty: {item.quantity}</Text>}
                {item.isPacked && <Text style={[styles.propSubDetail, styles.packedText]}> (Already Packed)</Text>}
              </View>
              {isCurrentlySelected ? (
                <CheckSquare size={24} color="#2563eb" />
              ) : (
                <Square size={24} color={item.isPacked || disabled ? "#9CA3AF" : "#6B7280"} /> // gray-400 or gray-500
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    // maxHeight: 250, // Optional: if you want to constrain its height
  },
  list: {
    // backgroundColor: '#F9FAFB', // gray-50, optional background for the list area
    // borderRadius: 6,
  },
  label: { // Kept for potential direct use, but often provided by parent
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151', // gray-700
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280', // gray-500
    paddingVertical: 16,
    fontSize: 14,
  },
  propItem: {
    backgroundColor: '#FFFFFF', // white
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB', // gray-200
  },
  propItemSelected: {
    backgroundColor: '#EFF6FF', // blue-50
    borderColor: '#2563eb', // blue-600
  },
  disabledItem: {
    backgroundColor: '#F3F4F6', // gray-100
    opacity: 0.7,
  },
  propItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#E5E7EB', // gray-200 as fallback
  },
  propImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#D1D5DB', // gray-300
    justifyContent: 'center',
    alignItems: 'center',
  },
  propImagePlaceholderText: {
    fontSize: 18,
    color: '#4B5563', // gray-600
    fontWeight: 'bold',
  },
  propDetails: {
    flex: 1,
  },
  propName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937', // gray-800
  },
  propSubDetail: {
    fontSize: 12,
    color: '#4B5563', // gray-600
    marginTop: 2,
  },
  packedText: {
    fontStyle: 'italic',
    color: '#9CA3AF', // gray-400
  }
}); 