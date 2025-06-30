import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types.ts';
import type { Show } from '../types/index.ts';
import { useShows } from '../contexts/ShowsContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import firestore from '@react-native-firebase/firestore';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';

export default function Shows() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { shows, loading, setSelectedShow } = useShows();

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    navigation.navigate<'ShowDetail'>('ShowDetail', { 
      show,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <FlatList
          data={shows}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.showCard}
              onPress={() => handleShowPress(item)}
            >
              <Text style={styles.showName}>{item.name}</Text>
              <Text style={styles.showDescription}>{item.description}</Text>
              <View style={styles.showMeta}>
                <Text style={styles.showMetaText}>
                  {item.acts?.length || 0} Acts • {item.productionCompany}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No shows yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first show to get started
              </Text>
            </View>
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  showCard: {
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040'
  },
  showName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 4
  },
  showDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8
  },
  showMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  showMetaText: {
    fontSize: 12,
    color: '#6B7280'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32
  },
  anotherContainer: {
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
}); 
