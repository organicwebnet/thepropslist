import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext';
import { Prop } from '@/shared/types/props';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pencil, Trash2 } from 'lucide-react-native';

// Helper to check if the source is a valid structure for RN <Image>
function isValidImageSource(source: any): source is { uri: string } {
  return typeof source === 'object' && source !== null && typeof source.uri === 'string';
}

export default function PropDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { service: firebaseService } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id || !firebaseService?.getDocument) {
      setError('Required information missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    firebaseService.getDocument<Prop>('props', id)
      .then(propDoc => {
        if (propDoc) { 
          setProp({ id: propDoc.id, ...propDoc.data } as Prop);
        } else {
          setError('Prop not found.');
        }
      })
      .catch(err => {
        console.error("Error fetching prop details:", err);
        setError('Failed to load prop details.');
      })
      .finally(() => {
        setLoading(false);
      });

  }, [id, firebaseService]);

  const handleDelete = async () => {
    if (!id || !firebaseService?.deleteDocument) {
      Alert.alert('Error', 'Cannot delete prop. Service unavailable.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this prop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.deleteDocument('props', id);
              console.log('Prop deleted:', id);
              Alert.alert('Success', 'Prop deleted successfully.');
              // Navigate back to the list after deletion
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/props'); // Fallback navigation
              }
            } catch (err) {
              console.error('Error deleting prop:', err);
              Alert.alert('Error', 'Failed to delete prop.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    // TODO: Implement navigation to an edit screen or modal
    // Example: router.push(`/(tabs)/props/${id}/edit`);
    Alert.alert('Edit', 'Edit functionality not yet implemented.');
  };

  const renderImage = () => {
    const primaryImageUrl = prop?.images && prop.images.length > 0 ? prop.images[0]?.url : null;
    
    if (imageError || !primaryImageUrl) {
      return (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>{prop?.name?.[0]?.toUpperCase()}</Text>
        </View>
      );
    }
    const imageSource = { uri: primaryImageUrl };
    if (isValidImageSource(imageSource)) {
        return (
          <Image
            source={imageSource} 
            style={styles.image}
            resizeMode="contain"
            onError={(e) => {console.warn('Image load error:', e.nativeEvent.error); setImageError(true);}}
          />
        );
    } else {
         return (
            <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>{prop?.name?.[0]?.toUpperCase()}</Text>
            </View>
         );
    }
  };


  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return <View style={styles.container}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (!prop) {
    // Should be covered by error state, but added for safety
    return <View style={styles.container}><Text style={styles.errorText}>Prop data unavailable.</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView style={styles.scrollView}>
            <View style={styles.imageContainer}>
                {renderImage()}
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.name}>{prop.name}</Text>
                {prop.description ? <Text style={styles.description}>{prop.description}</Text> : null}
                
                {/* Add other prop details here as needed */}
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{prop.category}</Text>

                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailValue}>{prop.status}</Text>

                {/* ... Add more fields ... */}

                <View style={styles.buttonRow}>
                    <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
                      <Pencil size={24} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                      <Trash2 size={24} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1F1F1F', // Match background
  },
  scrollView: {
    flex: 1,
  },
  container: { // Used for loading/error states
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1F1F1F',
  },
  contentContainer: { // Container for text content below image
     padding: 16,
  },
  imageContainer: {
     alignItems: 'center',
     marginVertical: 20,
  },
  image: {
    width: '90%', 
    aspectRatio: 1, // Make it square, adjust as needed
    borderRadius: 8,
    backgroundColor: '#404040', // Placeholder bg
  },
  placeholderImage: {
    width: '90%', 
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 8,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  iconButton: {
    padding: 12,
    borderRadius: 50,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
  },
}); 