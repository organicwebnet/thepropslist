/**
 * Public Prop Viewer
 * Allows viewing prop details via public link (e.g., QR code)
 * No authentication required
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFirebase } from '@platforms/mobile/contexts/FirebaseContext';
import type { Prop } from '@shared/types/props';
import { AppGradient } from '@components/AppGradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PublicPropViewPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ propId: string }>();
  const propId = params.propId;
  const { service: firebaseService, isInitialized } = useFirebase();
  
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Collect video URLs from multiple sources
  const videoUrls = useMemo(() => {
    if (!prop) return [];
    const urls: string[] = [];
    const add = (u?: string) => {
      if (u && typeof u === 'string' && u.trim()) {
        urls.push(u.trim());
      }
    };
    // preShowSetupVideo is already a string in Prop interface
    if (prop.preShowSetupVideo) {
      add(prop.preShowSetupVideo);
    }
    // videos is DigitalAsset[] in Prop interface
    if (Array.isArray(prop.videos)) {
      prop.videos.forEach((v) => {
        if (typeof v === 'string') {
          add(v);
        } else if (v?.url) {
          add(v.url);
        }
      });
    }
    // digitalAssets is DigitalAsset[] in Prop interface
    if (Array.isArray(prop.digitalAssets)) {
      prop.digitalAssets.forEach((v) => {
        if (typeof v === 'string') {
          add(v);
        } else if (v?.url) {
          add(v.url);
        }
      });
    }
    return Array.from(new Set(urls));
  }, [prop]);

  useEffect(() => {
    if (!propId || !isInitialized || !firebaseService) {
      if (!propId) {
        setError('No prop ID provided');
        setLoading(false);
      }
      return;
    }

    const fetchProp = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const propDoc = await firebaseService.getDocument<Prop>('props', propId);
        
        if (propDoc && propDoc.data) {
          const fullProp = { ...propDoc.data, id: propId } as Prop;
          setProp(fullProp);
        } else {
          setError('Prop not found');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load prop details';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propId, isInitialized]);

  const renderField = (label: string, value: any, icon?: string) => {
    if (value === null || value === undefined || value === '') return null;
    if (value === 0 && label !== 'Quantity') return null;
    
    return (
      <View style={styles.fieldContainer}>
        {icon && (
          <Ionicons name={icon as any} size={20} color="rgba(255, 255, 255, 0.6)" style={styles.fieldIcon} />
        )}
        <View style={styles.fieldContent}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldValue}>
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </Text>
        </View>
      </View>
    );
  };

  const handleVideoPress = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open video URL:', err);
    });
  };

  if (!isInitialized) {
    return (
      <AppGradient>
        <Stack.Screen
          options={{
            title: 'Prop Details',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Initializing connection...</Text>
        </View>
      </AppGradient>
    );
  }

  if (loading) {
    return (
      <AppGradient>
        <Stack.Screen
          options={{
            title: 'Prop Details',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading prop details...</Text>
        </View>
      </AppGradient>
    );
  }

  if (error || !prop) {
    return (
      <AppGradient>
        <Stack.Screen
          options={{
            title: 'Prop Details',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={64} color="#fff" />
          <Text style={styles.errorTitle}>Prop Not Found</Text>
          <Text style={styles.errorText}>
            {error || 'The requested prop could not be found.'}
          </Text>
          <Text style={styles.errorSubtext}>
            This link may have expired or the prop may have been removed.
          </Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <Stack.Screen
        options={{
          title: prop.name || 'Prop Details',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Images */}
        {prop.images && prop.images.length > 0 && (
          <View style={styles.imageSection}>
            <TouchableOpacity
              onPress={() => setIsFullscreen(true)}
              style={styles.mainImageContainer}
              accessibilityLabel="View fullscreen image"
              accessibilityRole="button"
              accessibilityHint="Opens image in fullscreen view"
            >
              <Image
                source={{ uri: prop.images[currentImageIndex].url }}
                style={styles.mainImage}
                resizeMode="contain"
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand" size={24} color="#fff" />
              </View>
              {prop.images.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {prop.images.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {prop.images.length > 1 && (
              <FlatList
                horizontal
                data={prop.images}
                keyExtractor={(item, index) => `${item.url}-${index}`}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setCurrentImageIndex(index)}
                    style={[
                      styles.thumbnail,
                      index === currentImageIndex && styles.thumbnailActive,
                    ]}
                    accessibilityLabel={`Select image ${index + 1} of ${prop.images?.length ?? 0}`}
                    accessibilityRole="button"
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.thumbnailsContainer}
                showsHorizontalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {/* Basic Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Information</Text>
          <View style={styles.fieldsContainer}>
            {renderField('Name', prop.name, 'information-circle')}
            {renderField('Description', prop.description)}
            {renderField('Category', prop.category, 'pricetag')}
            {renderField('Status', prop.status)}
            {renderField('Quantity', prop.quantity)}
            {renderField('Location', prop.location, 'location')}
            {renderField('Current Location', prop.currentLocation, 'location')}
          </View>
        </View>

        {/* Show Assignment */}
        {(prop.act || prop.scene || prop.sceneName) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Show Assignment</Text>
            <View style={styles.fieldsContainer}>
              {renderField('Act', prop.act)}
              {renderField('Scene', prop.scene)}
              {renderField('Scene Name', prop.sceneName)}
            </View>
          </View>
        )}

        {/* Videos */}
        {videoUrls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Videos</Text>
            {videoUrls.map((url, idx) => (
              <TouchableOpacity
                key={`${url}-${idx}`}
                style={styles.videoButton}
                onPress={() => handleVideoPress(url)}
                accessibilityLabel={`Open video ${idx + 1}`}
                accessibilityRole="button"
                accessibilityHint="Opens video in external player"
              >
                <Ionicons name="play-circle" size={24} color="#3b82f6" />
                <Text style={styles.videoButtonText} numberOfLines={1}>
                  {url.length > 50 ? `${url.substring(0, 50)}...` : url}
                </Text>
                <Ionicons name="open-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Additional Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Additional Details</Text>
          <View style={styles.fieldsContainer}>
            {renderField('Price', prop.price ? `£${prop.price.toFixed(2)}` : null)}
            {renderField('Tags', prop.tags?.join(', '))}
            {renderField('Notes', prop.notes)}
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={isFullscreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsFullscreen(false)}
            accessibilityLabel="Close fullscreen"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          
          {prop.images && prop.images.length > 0 && (
            <>
              <Image
                source={{ uri: prop.images[currentImageIndex].url }}
                style={styles.fullscreenImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
              {imageLoading && (
                <View style={styles.fullscreenLoadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              
              {prop.images.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonLeft]}
                    onPress={() =>
                      setCurrentImageIndex(
                        currentImageIndex === 0
                          ? prop.images!.length - 1
                          : currentImageIndex - 1
                      )
                    }
                    accessibilityLabel="Previous image"
                    accessibilityRole="button"
                  >
                    <Ionicons name="chevron-back" size={32} color="#fff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonRight]}
                    onPress={() =>
                      setCurrentImageIndex(
                        currentImageIndex === prop.images!.length - 1
                          ? 0
                          : currentImageIndex + 1
                      )
                    }
                    accessibilityLabel="Next image"
                    accessibilityRole="button"
                  >
                    <Ionicons name="chevron-forward" size={32} color="#fff" />
                  </TouchableOpacity>
                  
                  <View style={styles.fullscreenCounter}>
                    <Text style={styles.fullscreenCounterText}>
                      {currentImageIndex + 1} / {prop.images.length}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </Modal>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  imageSection: {
    marginBottom: 24,
  },
  mainImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginBottom: 12,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailsContainer: {
    gap: 8,
    paddingHorizontal: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  thumbnailActive: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  fieldsContainer: {
    gap: 12,
  },
  fieldContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  fieldIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#fff',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    gap: 12,
  },
  videoButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 12,
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  fullscreenCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fullscreenCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenLoadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
});

