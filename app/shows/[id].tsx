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
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} 
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 16 }}
      >
        <Stack.Screen options={{ title: name || 'Show Details' }} />
        <TouchableOpacity
          onPress={() => router.push('/shows')}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 2, marginBottom: 2 }}
        >
          <Ionicons name="arrow-back" size={20} color={currentThemeColors.primary} />
          <Text style={{ color: currentThemeColors.primary, fontWeight: 'bold', marginLeft: 6 }}>Back to Shows</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 2 }}>
          {displayImageUrl && (
            <Image source={{ uri: displayImageUrl }} style={[styles.headerImage, { height: 40, marginBottom: 0 }]} resizeMode="cover" />
          )}
        </View>
        {/* Header Row: Logo | Title/Desc | Edit/Delete */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 8, paddingHorizontal: 12 }}>
          {/* Logo (if present) */}
          {logoImage?.url && logoImage.url !== imageUrl && (
            <Image source={{ uri: logoImage.url }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', marginRight: 10 }} resizeMode="cover" />
          )}
          {/* Title and Description */}
          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
            <Text style={[styles.title, { marginTop: 0, marginBottom: 2 }]}>{name}</Text>
            {description && <Text style={[styles.description, { marginTop: 0, marginBottom: 0, textAlign: 'left' }]}>{description}</Text>}
          </View>
          {/* Edit/Delete icons */}
          <TouchableOpacity onPress={() => router.push(`/shows/${showToDisplay.id}/edit` as any)} style={{ marginRight: 12 }}>
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
        {/* Currently Selected Pill at top right */}
        {selectedShow?.id === showToDisplay.id && (
          <View style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, backgroundColor: currentThemeColors.background }}>
            <Text style={{ borderWidth: 2, borderColor: currentThemeColors.primary, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8, color: currentThemeColors.primary, fontWeight: 'bold', backgroundColor: currentThemeColors.background }}>Currently Selected Show</Text>
          </View>
        )}

        {/* Key Dates Section */}
        <Text style={styles.sectionHeader}>Key Dates</Text>
        <View style={[styles.detailRow, { flexWrap: 'wrap', rowGap: 12, columnGap: 12 }]}> 
          <DetailItem icon="calendar-outline" label="Start Date" value={formatDate(startDate)} themeColors={currentThemeColors} />
          <DetailItem icon="calendar-outline" label="End Date" value={formatDate(endDate)} themeColors={currentThemeColors} />
          {(showToDisplay as any)?.techWeekStart && (
            <DetailItem icon="calendar-outline" label="Tech Week Start" value={formatDate((showToDisplay as any).techWeekStart)} themeColors={currentThemeColors} />
          )}
          {(showToDisplay as any)?.firstPreview && (
            <DetailItem icon="calendar-outline" label="First Preview" value={formatDate((showToDisplay as any).firstPreview)} themeColors={currentThemeColors} />
          )}
          {(showToDisplay as any)?.pressNight && (
            <DetailItem icon="calendar-outline" label="Press Night" value={formatDate((showToDisplay as any).pressNight)} themeColors={currentThemeColors} />
          )}
          {Array.isArray((showToDisplay as any)?.additionalDates) && (showToDisplay as any).additionalDates.length > 0 &&
            (showToDisplay as any).additionalDates.map((d: any, i: number) => (
              <DetailItem key={i} icon="calendar-outline" label={d.label} value={formatDate(d.date)} themeColors={currentThemeColors} />
            ))
          }
        </View>
        <View style={styles.detailRow}>
          <DetailItem icon="business-outline" label="Status" value={status || 'N/A'} themeColors={currentThemeColors}/>
          <DetailItem icon="earth-outline" label="Touring" value={isTouringShow ? 'Yes' : 'No'} themeColors={currentThemeColors}/>
        </View>

        {/* Production & Creative Team Section */}
        <Text style={styles.sectionHeader}>Production & Creative Team</Text>
        <View style={styles.contactBlock}>
          {/* Production Company */}
          <Text style={[styles.detailSubheader, { marginBottom: 2 }]}>Production Company</Text>
          {productionCompany && <Text style={styles.detailText}>{productionCompany}</Text>}
          {productionContactEmail && (
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: 'bold' }}>Email: </Text>
              <Text style={styles.linkText} onPress={() => Linking.openURL(`mailto:${productionContactEmail}`)}>{productionContactEmail}</Text>
            </Text>
          )}
          {productionContactPhone && (
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: 'bold' }}>Phone: </Text>
              <Text style={styles.linkText} onPress={() => Linking.openURL(`tel:${productionContactPhone}`)}>{productionContactPhone}</Text>
            </Text>
          )}

          {/* Stage Management */}
          {(stageManager || stageManagerEmail || stageManagerPhone || (showToDisplay as any)?.productionContactPhone) && (
            <>
              <Text style={[styles.detailSubheader, { marginTop: 10, marginBottom: 2 }]}>Stage Management</Text>
              {stageManager && <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Stage Manager: </Text>{stageManager}</Text>}
              {stageManagerEmail && (
                <Text style={styles.detailText}>
                  <Text style={{ fontWeight: 'bold' }}>Email: </Text>
                  <Text style={styles.linkText} onPress={() => Linking.openURL(`mailto:${stageManagerEmail}`)}>{stageManagerEmail}</Text>
                </Text>
              )}
              {stageManagerPhone && (
                <Text style={styles.detailText}>
                  <Text style={{ fontWeight: 'bold' }}>Phone: </Text>
                  <Text style={styles.linkText} onPress={() => Linking.openURL(`tel:${stageManagerPhone}`)}>{stageManagerPhone}</Text>
                </Text>
              )}
              {(showToDisplay as any)?.productionContactPhone && (
                <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Assistant Stage Manager: </Text>{(showToDisplay as any).productionContactPhone}</Text>
              )}
            </>
          )}

          {/* Props */}
          {(propsSupervisor || propsSupervisorEmail || propsSupervisorPhone || (showToDisplay as any)?.propmakerName) && (
            <>
              <Text style={[styles.detailSubheader, { marginTop: 10, marginBottom: 2 }]}>Props</Text>
              {propsSupervisor && <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Props Supervisor: </Text>{propsSupervisor}</Text>}
              {propsSupervisorEmail && (
                <Text style={styles.detailText}>
                  <Text style={{ fontWeight: 'bold' }}>Email: </Text>
                  <Text style={styles.linkText} onPress={() => Linking.openURL(`mailto:${propsSupervisorEmail}`)}>{propsSupervisorEmail}</Text>
                </Text>
              )}
              {propsSupervisorPhone && (
                <Text style={styles.detailText}>
                  <Text style={{ fontWeight: 'bold' }}>Phone: </Text>
                  <Text style={styles.linkText} onPress={() => Linking.openURL(`tel:${propsSupervisorPhone}`)}>{propsSupervisorPhone}</Text>
                </Text>
              )}
              {(showToDisplay as any)?.propmakerName && (
                <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Propmaker: </Text>{(showToDisplay as any).propmakerName}</Text>
              )}
            </>
          )}

          {/* Design */}
          {(showToDisplay as any)?.productionContactName || (showToDisplay as any)?.designerAssistantName ? (
            <>
              <Text style={[styles.detailSubheader, { marginTop: 10, marginBottom: 2 }]}>Design</Text>
              {(showToDisplay as any)?.productionContactName && (
                <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Designer: </Text>{(showToDisplay as any).productionContactName}</Text>
              )}
              {(showToDisplay as any)?.designerAssistantName && (
                <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Designer Assistant: </Text>{(showToDisplay as any).designerAssistantName}</Text>
              )}
            </>
          ) : null}

          {/* Other Contacts (now part of creative team) */}
          {contacts && contacts.length > 0 && (
            <>
              <Text style={[styles.detailSubheader, { marginTop: 10, marginBottom: 2 }]}>Other Contacts</Text>
              {contacts.map((contact: Contact, index: number) => (
                <View key={index} style={{ marginBottom: 6 }}>
                  <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>{contact.role}: </Text>{contact.name}</Text>
                  {contact.email && (
                    <Text style={styles.detailText}>
                      <Text style={{ fontWeight: 'bold' }}>Email: </Text>
                      <Text style={styles.linkText} onPress={() => Linking.openURL(`mailto:${contact.email}`)}>{contact.email}</Text>
                    </Text>
                  )}
                  {contact.phone && (
                    <Text style={styles.detailText}>
                      <Text style={{ fontWeight: 'bold' }}>Phone: </Text>
                      <Text style={styles.linkText} onPress={() => Linking.openURL(`tel:${contact.phone}`)}>{contact.phone}</Text>
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Venues Section */}
        {venues && venues.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Venues</Text>
            {venues.map((venue: Venue, index: number) => {
              const address = venue.address as Address | undefined; // Explicit cast for clarity
              const addressString = address ? `${address.street1}${address.street2 ? ', ' + address.street2 : ''}, ${address.city}, ${address.region} ${address.postalCode}` : '';
              const mapsUrl = addressString ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}` : undefined;
              const staticMapUrl = addressString ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(addressString)}&zoom=15&size=600x200&markers=color:purple|${encodeURIComponent(addressString)}` : undefined;
              return (
                <View key={index} style={styles.venueContainer}>
                  <Text style={styles.detailSubheader}>{venue.name}</Text>
                  {/* Google Static Map above address */}
                  {staticMapUrl && (
                    <TouchableOpacity onPress={() => mapsUrl && Linking.openURL(mapsUrl)}>
                      <Image source={{ uri: staticMapUrl }} style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                  {address && (
                    <Text style={styles.detailText}>
                      Address: <Text style={{ color: '#fff', textDecorationLine: 'underline' }} onPress={() => mapsUrl && Linking.openURL(mapsUrl)}>{addressString}</Text>
                    </Text>
                  )}
                  {(venue.startDate || venue.endDate) && (
                    <Text style={styles.detailText}>
                      Dates: <Text style={{ color: '#fff' }}>{venue.startDate ? formatDate(venue.startDate) : ''}{venue.startDate && venue.endDate ? ' to ' : ''}{venue.endDate ? formatDate(venue.endDate) : ''}</Text>
                    </Text>
                  )}
                  {venue.notes && (
                    <Text style={styles.detailText}>
                      <Text style={{ color: '#a78bfa', fontWeight: 'bold' }}>📝 </Text>
                      <Text style={{ color: '#fff' }}>{venue.notes}</Text>
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Acts & Scenes Section */}
        {acts && acts.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Acts & Scenes</Text>
            {acts.map((act: Act, actIndex: number) => (
              <View key={act.id || actIndex} style={styles.actContainer}>
                <Text style={styles.detailSubheader}>
                  Act {actIndex + 1}{act.name ? `: ${act.name}` : ''}
                </Text>
                {act.description && <Text style={styles.detailTextSmall}>{act.description}</Text>}
                {act.scenes && act.scenes.map((scene: Scene, sceneIndex: number) => (
                  <View key={scene.id || sceneIndex} style={styles.sceneContainer}>
                    <Text style={styles.detailText}>
                      Scene {sceneIndex + 1}{scene.name ? `: ${scene.name}` : ''}
                    </Text>
                    {scene.setting && <Text style={styles.detailTextSmall}>Setting: {scene.setting}</Text>}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Collaborators Section */}
        {Array.isArray(showToDisplay.collaborators) && showToDisplay.collaborators.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Our Team</Text>
            <View style={styles.contactBlock}>
              {showToDisplay.collaborators.map((collab, i) => (
                <View key={collab.email || i} style={{ marginBottom: 8 }}>
                  <Text style={styles.detailText}>{(collab as any)?.name} <Text style={{ color: '#9ca3af' }}>({(collab as any)?.jobRole})</Text></Text>
                  <Text style={styles.detailTextSmall}>{collab.email} ({collab.role})</Text>
                </View>
              ))}
            </View>
          </>
        )}
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