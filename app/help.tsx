import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  StyleSheet,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { DefaultText } from '../src/components/DefaultText';

const HelpPage = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@thepropslist.com?subject=Help Request');
  };

  const handleReportBug = () => {
    router.push('/feedback');
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Get Started',
      icon: 'home' as const,
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Create Your First Show</DefaultText>
            <DefaultText style={styles.subsectionText}>Start by adding a show to organize your props and tasks.</DefaultText>
            <View style={styles.stepList}>
              <DefaultText style={styles.stepText}>1. Tap "Shows" in the bottom navigation</DefaultText>
              <DefaultText style={styles.stepText}>2. Tap the "+" button to add a new show</DefaultText>
              <DefaultText style={styles.stepText}>3. Enter show name, dates, and venue</DefaultText>
              <DefaultText style={styles.stepText}>4. Save your show</DefaultText>
            </View>
          </View>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Add Props</DefaultText>
            <DefaultText style={styles.subsectionText}>Track every prop in your production.</DefaultText>
            <View style={styles.stepList}>
              <DefaultText style={styles.stepText}>1. Go to "Props" tab</DefaultText>
              <DefaultText style={styles.stepText}>2. Tap "Add Prop"</DefaultText>
              <DefaultText style={styles.stepText}>3. Fill in prop details</DefaultText>
              <DefaultText style={styles.stepText}>4. Assign to a show</DefaultText>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'props-management',
      title: 'Props Management',
      icon: 'cube' as const,
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Add Props</DefaultText>
            <DefaultText style={styles.subsectionText}>Track every item in your production.</DefaultText>
            <View style={styles.bulletList}>
              <DefaultText style={styles.bulletText}>• Name and description</DefaultText>
              <DefaultText style={styles.bulletText}>• Condition and location</DefaultText>
              <DefaultText style={styles.bulletText}>• Photos and notes</DefaultText>
              <DefaultText style={styles.bulletText}>• Show assignment</DefaultText>
            </View>
          </View>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Take Photos</DefaultText>
            <DefaultText style={styles.subsectionText}>Document props with photos for easy identification.</DefaultText>
            <View style={styles.stepList}>
              <DefaultText style={styles.stepText}>1. Open a prop</DefaultText>
              <DefaultText style={styles.stepText}>2. Tap the camera icon</DefaultText>
              <DefaultText style={styles.stepText}>3. Take or select photos</DefaultText>
              <DefaultText style={styles.stepText}>4. Save your changes</DefaultText>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'shows',
      title: 'Show Management',
      icon: 'film' as const,
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Create Shows</DefaultText>
            <DefaultText style={styles.subsectionText}>Set up productions with dates and venues.</DefaultText>
            <View style={styles.bulletList}>
              <DefaultText style={styles.bulletText}>• Show name and description</DefaultText>
              <DefaultText style={styles.bulletText}>• Performance dates</DefaultText>
              <DefaultText style={styles.bulletText}>• Venue information</DefaultText>
              <DefaultText style={styles.bulletText}>• Team members</DefaultText>
            </View>
          </View>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Manage Teams</DefaultText>
            <DefaultText style={styles.subsectionText}>Invite crew members and assign roles.</DefaultText>
            <View style={styles.stepList}>
              <DefaultText style={styles.stepText}>1. Open your show</DefaultText>
              <DefaultText style={styles.stepText}>2. Tap "Team" tab</DefaultText>
              <DefaultText style={styles.stepText}>3. Send invite links</DefaultText>
              <DefaultText style={styles.stepText}>4. Assign roles and permissions</DefaultText>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'packing',
      title: 'Packing Lists',
      icon: 'cube-outline' as const,
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Create Packing Lists</DefaultText>
            <DefaultText style={styles.subsectionText}>Organize props for transport and storage.</DefaultText>
            <View style={styles.stepList}>
              <DefaultText style={styles.stepText}>1. Go to "Packing" tab</DefaultText>
              <DefaultText style={styles.stepText}>2. Tap "Create New List"</DefaultText>
              <DefaultText style={styles.stepText}>3. Name your list (e.g., "Act 1 Props")</DefaultText>
              <DefaultText style={styles.stepText}>4. Add containers and props</DefaultText>
            </View>
          </View>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Organize Containers</DefaultText>
            <DefaultText style={styles.subsectionText}>Group props in boxes, bags, or bins.</DefaultText>
            <View style={styles.bulletList}>
              <DefaultText style={styles.bulletText}>• Create containers with names</DefaultText>
              <DefaultText style={styles.bulletText}>• Add props to containers</DefaultText>
              <DefaultText style={styles.bulletText}>• Generate QR codes for tracking</DefaultText>
              <DefaultText style={styles.bulletText}>• Share public links for crew access</DefaultText>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'shopping',
      title: 'Shopping Lists',
      icon: 'bag' as const,
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Track Purchases</DefaultText>
            <DefaultText style={styles.subsectionText}>Keep track of props and materials you need to buy.</DefaultText>
            <View style={styles.stepList}>
              <DefaultText style={styles.stepText}>1. Go to "Shopping" tab</DefaultText>
              <DefaultText style={styles.stepText}>2. Tap "Add Item"</DefaultText>
              <DefaultText style={styles.stepText}>3. Enter item details and budget</DefaultText>
              <DefaultText style={styles.stepText}>4. Mark as purchased when done</DefaultText>
            </View>
          </View>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Budget Tracking</DefaultText>
            <DefaultText style={styles.subsectionText}>Monitor spending across your show.</DefaultText>
            <View style={styles.bulletList}>
              <DefaultText style={styles.bulletText}>• Set budget limits per item</DefaultText>
              <DefaultText style={styles.bulletText}>• Track actual vs. planned costs</DefaultText>
              <DefaultText style={styles.bulletText}>• View spending summaries</DefaultText>
              <DefaultText style={styles.bulletText}>• Export purchase reports</DefaultText>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: 'help-circle' as const,
      content: (
        <View style={styles.sectionContent}>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Common Issues</DefaultText>
            <View style={styles.issueList}>
              <View style={styles.issueItem}>
                <DefaultText style={styles.issueQuestion}>Props not showing up?</DefaultText>
                <DefaultText style={styles.issueAnswer}>Check your show filter. Make sure you've selected the right show from the dropdown.</DefaultText>
              </View>
              <View style={styles.issueItem}>
                <DefaultText style={styles.issueQuestion}>Can't upload photos?</DefaultText>
                <DefaultText style={styles.issueAnswer}>Photos must be under 5MB. Try compressing large images or use a different format.</DefaultText>
              </View>
              <View style={styles.issueItem}>
                <DefaultText style={styles.issueQuestion}>Team members can't access?</DefaultText>
                <DefaultText style={styles.issueAnswer}>Check their email invitation. They need to accept the invite and create an account.</DefaultText>
              </View>
            </View>
          </View>
          <View style={styles.subsection}>
            <DefaultText style={styles.subsectionTitle}>Get Support</DefaultText>
            <DefaultText style={styles.subsectionText}>Need more help? We're here for you.</DefaultText>
            <View style={styles.bulletList}>
              <DefaultText style={styles.bulletText}>• Tap "Report a bug" in the header</DefaultText>
              <DefaultText style={styles.bulletText}>• Email support@thepropslist.com</DefaultText>
              <DefaultText style={styles.bulletText}>• Check our FAQ for quick answers</DefaultText>
              <DefaultText style={styles.bulletText}>• Join our community forum</DefaultText>
            </View>
          </View>
        </View>
      )
    }
  ];

  return (
    <LinearGradient
      colors={['#18181b', '#1e1e2e', '#2d1b69']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#c084fc" />
        </Pressable>
        <DefaultText style={styles.headerTitle}>Help Center</DefaultText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <DefaultText style={styles.introTitle}>Everything you need to manage your theater props like a pro.</DefaultText>
        </View>

        <View style={styles.sectionsContainer}>
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <View key={section.id} style={styles.section}>
                <Pressable
                  onPress={() => toggleSection(section.id)}
                  style={styles.sectionHeader}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.sectionIcon}>
                      <Ionicons name={section.icon} size={20} color="#c084fc" />
                    </View>
                    <DefaultText style={styles.sectionTitle}>{section.title}</DefaultText>
                  </View>
                  <Ionicons 
                    name={isExpanded ? "chevron-down" : "chevron-forward"} 
                    size={20} 
                    color="#a3a3a3" 
                  />
                </Pressable>
                
                {isExpanded && (
                  <View style={styles.sectionBody}>
                    {section.content}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.supportSection}>
          <DefaultText style={styles.supportTitle}>Still Need Help?</DefaultText>
          <DefaultText style={styles.supportText}>
            Can't find what you're looking for? Our support team is ready to help.
          </DefaultText>
          <View style={styles.supportButtons}>
            <Pressable onPress={handleReportBug} style={styles.supportButton}>
              <DefaultText style={styles.supportButtonText}>Report a Bug</DefaultText>
            </Pressable>
            <Pressable onPress={handleEmailSupport} style={[styles.supportButton, styles.supportButtonSecondary]}>
              <DefaultText style={styles.supportButtonSecondaryText}>Email Support</DefaultText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#c084fc',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  intro: {
    paddingVertical: 20,
  },
  introTitle: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
  },
  sectionsContainer: {
    gap: 12,
  },
  section: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c084fc',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#c084fc',
  },
  sectionContent: {
    gap: 20,
  },
  subsection: {
    gap: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  subsectionText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  stepList: {
    gap: 4,
    marginTop: 8,
  },
  stepText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  bulletList: {
    gap: 4,
    marginTop: 8,
  },
  bulletText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  issueList: {
    gap: 12,
    marginTop: 8,
  },
  issueItem: {
    gap: 4,
  },
  issueQuestion: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a3a3a3',
  },
  issueAnswer: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  supportSection: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c084fc',
    padding: 16,
    marginVertical: 20,
    gap: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  supportText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  supportButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  supportButtonSecondary: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  supportButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  supportButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#c084fc',
  },
});

export default HelpPage;
