import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Linking, TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import { Show, Venue, Act, Scene, Contact } from '../../src/shared/services/firebase/types.ts'; // Changed import path
import type { Address } from '../../src/shared/types/address.ts'; // Added direct import for Address
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../src/styles/theme.ts';
import { CustomTimestamp } from '../../src/shared/services/firebase/types.ts';
import { useAuth } from '../../src/contexts/AuthContext.tsx';
import LinearGradient from 'react-native-linear-gradient';

// Helper to format dates (Timestamp or string)
const formatDate = (date: string | CustomTimestamp | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const jsDate = typeof date === 'string' ? new Date(date) : (date as CustomTimestamp)?.toDate ? (date as CustomTimestamp).toDate() : new Date(date as any);
    if (isNaN(jsDate.getTime())) return 'Invalid Date';
    return jsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    console.error("Error formatting date:", date, e);
    return 'Error in date';
  }
};

// Helper to render contact information
const ContactInfo: React.FC<{ label: string; name?: string; email?: string; phone?: string; themeColors: typeof appLightTheme.colors }> = 
  ({ label, name, email, phone, themeColors }) => {
    const styles = getDetailStyles(themeColors); // Use detail-specific styles
    if (!name && !email && !phone) return null;
    return (
      <View style={styles.contactBlock}>
        <Text style={styles.detailSubheader}>{label}</Text>
        {name && <Text style={styles.detailText}>Name: {name}</Text>}
        {email && 
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${email}`)}>
            <Text style={[styles.detailText, styles.linkText]}>Email: {email}</Text>
          </TouchableOpacity>}
        {phone && 
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)}>
            <Text style={[styles.detailText, styles.linkText]}>Phone: {phone}</Text>
          </TouchableOpacity>}
      </View>
    );
};

export default function ShowDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shows, selectedShow, setSelectedShowById, loading: showsLoading, deleteShow } = useShows();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getDetailStyles(currentThemeColors);
  const { user, isAdmin } = useAuth();

  const showToDisplay = selectedShow?.id === id ? selectedShow : shows.find((s: Show) => s.id === id);

  useEffect(() => {
    if (id && !showToDisplay && !showsLoading) {
      // If not in context and not loading, try to set it from full list or indicate not found
      const foundShow = shows.find((s: Show) => s.id === id);
      if (!foundShow) {
        // Handle show not found, perhaps navigate back or show error
        console.warn(`Show with ID ${id} not found in shows list.`);
      }
    }
  }, [id, shows, showToDisplay, showsLoading]);

  if (showsLoading && !showToDisplay) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (!showToDisplay) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Show not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { 
    name, description, startDate, endDate, imageUrl, logoImage,
    productionCompany, productionContactName, productionContactEmail, productionContactPhone,
    stageManager, stageManagerEmail, stageManagerPhone,
    propsSupervisor, propsSupervisorEmail, propsSupervisorPhone,
    venues, acts, status, isTouringShow, contacts 
  } = showToDisplay;
  
  const displayImageUrl = logoImage?.url || imageUrl;

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <Stack.Screen options={{ title: name || 'Show Details' }} />
        <TouchableOpacity
          onPress={() => router.push('/shows')}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginLeft: 8, marginBottom: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={currentThemeColors.primary} />
          <Text style={{ color: currentThemeColors.primary, fontWeight: 'bold', marginLeft: 6 }}>Back to Shows</Text>
        </TouchableOpacity>

        {displayImageUrl && (
          <Image source={{ uri: displayImageUrl }} style={styles.headerImage} resizeMode="cover" />
        )}
        
        <View style={styles.contentContainer}>
          {/* Highlight if this is the currently selected show */}
          {selectedShow?.id === showToDisplay.id && (
            <View style={{
              borderWidth: 2,
              borderColor: currentThemeColors.primary,
              borderRadius: 8,
              marginBottom: 12,
              padding: 6,
              alignSelf: 'flex-start',
              backgroundColor: currentThemeColors.background,
            }}>
              <Text style={{ color: currentThemeColors.primary, fontWeight: 'bold' }}>Currently Selected Show</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.push(`/shows/${showToDisplay.id}/edit` as any)} style={{ marginRight: 16 }}>
              <Ionicons name="pencil" size={22} color={currentThemeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'Delete Show',
                `Are you sure you want to delete "${showToDisplay.name}"? This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: async () => {
                      await deleteShow(showToDisplay.id);
                      router.back();
                    }
                  },
                ]
              );
            }}>
              <Ionicons name="trash" size={22} color={currentThemeColors.error || 'red'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{name}</Text>
          {description && <Text style={styles.description}>{description}</Text>}

          <View style={styles.detailRow}>
            <DetailItem icon="calendar-outline" label="Start Date" value={formatDate(startDate)} themeColors={currentThemeColors}/>
            <DetailItem icon="calendar-outline" label="End Date" value={formatDate(endDate)} themeColors={currentThemeColors}/>
          </View>
          <View style={styles.detailRow}>
            <DetailItem icon="business-outline" label="Status" value={status || 'N/A'} themeColors={currentThemeColors}/>
            <DetailItem icon="earth-outline" label="Touring" value={isTouringShow ? 'Yes' : 'No'} themeColors={currentThemeColors}/>
          </View>

          <Text style={styles.sectionHeader}>Production & Management</Text>
          <ContactInfo label="Production Company" name={productionCompany} email={productionContactEmail} phone={productionContactPhone} themeColors={currentThemeColors}/>
          <ContactInfo label="Stage Manager" name={stageManager} email={stageManagerEmail} phone={stageManagerPhone} themeColors={currentThemeColors}/>
          <ContactInfo label="Props Supervisor" name={propsSupervisor} email={propsSupervisorEmail} phone={propsSupervisorPhone} themeColors={currentThemeColors}/>

          {contacts && contacts.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Other Contacts</Text>
              {contacts.map((contact: Contact, index: number) => (
                <ContactInfo key={index} label={contact.role || 'Contact'} name={contact.name} email={contact.email} phone={contact.phone} themeColors={currentThemeColors}/>
              ))}
            </>
          )}

          {venues && venues.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Venues</Text>
              {venues.map((venue: Venue, index: number) => {
                const address = venue.address as Address | undefined; // Explicit cast for clarity
                return (
                  <View key={index} style={styles.venueContainer}>
                    <Text style={styles.detailSubheader}>{venue.name}</Text>
                    {address && <Text style={styles.detailText}>Address: {`${address.street1}${address.street2 ? ", " + address.street2 : ""}, ${address.city}, ${address.region} ${address.postalCode}`}</Text>}
                    {venue.startDate && <Text style={styles.detailText}>Starts: {formatDate(venue.startDate)}</Text>}
                    {venue.endDate && <Text style={styles.detailText}>Ends: {formatDate(venue.endDate)}</Text>}
                    {venue.notes && <Text style={styles.detailText}>Notes: {venue.notes}</Text>}
                  </View>
                );
              })}
            </>
          )}

          {acts && acts.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Acts & Scenes</Text>
              {acts.map((act: Act, actIndex: number) => (
                <View key={act.id || actIndex} style={styles.actContainer}>
                  <Text style={styles.detailSubheader}>Act {act.id}: {act.name}</Text>
                  {act.description && <Text style={styles.detailTextSmall}>{act.description}</Text>}
                  {act.scenes && act.scenes.map((scene: Scene, sceneIndex: number) => (
                    <View key={scene.id || sceneIndex} style={styles.sceneContainer}>
                      <Text style={styles.detailText}>Scene {scene.id}: {scene.name}</Text>
                      {scene.setting && <Text style={styles.detailTextSmall}>Setting: {scene.setting}</Text>}
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const DetailItem: React.FC<{icon: keyof typeof Ionicons.glyphMap, label: string, value: string, themeColors: typeof appLightTheme.colors}> = 
  ({icon, label, value, themeColors}) => {
    const styles = getDetailStyles(themeColors);
    return(
      <View style={styles.detailItemContainer}>
        <Ionicons name={icon} size={20} color={themeColors.primary} style={styles.detailIcon} />
        <View>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{value}</Text>
        </View>
      </View>
    );
}

const getDetailStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: themeColors.background, // removed for gradient
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: themeColors.background,
  },
  messageText: {
    fontSize: 18,
    color: themeColors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: themeColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: themeColors.card, // Assuming primary button text is light
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerImage: {
    width: '100%',
    height: 200,
    marginBottom: 15,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: themeColors.textSecondary || themeColors.text,
    marginBottom: 15,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.card,
    padding: 10,
    borderRadius: 8,
    flex: 1, // Allow items to take space
    marginHorizontal: 4, // Add some spacing between items in a row
    minWidth: '45%', // Ensure they don't get too squished
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: themeColors.textSecondary || themeColors.text,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: themeColors.text,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text,
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingBottom: 5,
  },
  contactBlock: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailSubheader: {
    fontSize: 17,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 15,
    color: themeColors.textSecondary || themeColors.text,
    marginBottom: 3,
    lineHeight: 20,
  },
  detailTextSmall: {
    fontSize: 13,
    color: themeColors.textSecondary || themeColors.text,
    opacity: 0.9,
    marginBottom: 3,
  },
  linkText: {
    color: themeColors.primary,
    textDecorationLine: 'underline',
  },
  venueContainer: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  actContainer: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  sceneContainer: {
    marginLeft: 15,
    paddingVertical: 5,
    borderLeftWidth: 2,
    borderLeftColor: themeColors.primary,
    paddingLeft: 10,
    marginTop: 5,
  },
}); 