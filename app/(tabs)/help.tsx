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
import { StyledText } from '../../src/components/StyledText';

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
            <StyledText style={styles.subsectionTitle}>Create Your First Show</StyledText>
            <StyledText style={styles.subsectionText}>Start by adding a show to organize your props and tasks.</StyledText>
            <View style={styles.stepList}>
              <StyledText style={styles.stepText}>1. Tap "Shows" in the bottom navigation</StyledText>
              <StyledText style={styles.stepText}>2. Tap the "+" button to add a new show</StyledText>
              <StyledText style={styles.stepText}>3. Enter show name, dates, and venue</StyledText>
              <StyledText style={styles.stepText}>4. Save your show</StyledText>
            </View>
          </View>
          <View style={styles.subsection}>
            <StyledText style={styles.subsectionTitle}>Add Props</StyledText>
            <StyledText style={styles.subsectionText}>Track every prop in your production.</StyledText>
            <View style={styles.stepList}>
              <StyledText style={styles.stepText}>1. Go to "Props" tab</StyledText>
              <StyledText style={styles.stepText}>2. Tap "Add Prop"</StyledText>
              <StyledText style={styles.stepText}>3. Fill in prop details</StyledText>
              <StyledText style={styles.stepText}>4. Assign to a show</StyledText>
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
            <StyledText style={styles.subsectionTitle}>Add Props</StyledText>
            <StyledText style={styles.subsectionText}>Track every item in your production.</StyledText>
            <View style={styles.bulletList}>
              <StyledText style={styles.bulletText}>• Name and description</StyledText>
              <StyledText style={styles.bulletText}>• Condition and location</StyledText>
              <StyledText style={styles.bulletText}>• Photos and notes</StyledText>
              <StyledText style={styles.bulletText}>• Show assignment</StyledText>
            </View>
          </View>
          <View style={styles.subsection}>
            <StyledText style={styles.subsectionTitle}>Take Photos</StyledText>
            <StyledText style={styles.subsectionText}>Document props with photos for easy identification.</StyledText>
            <View style={styles.stepList}>
              <StyledText style={styles.stepText}>1. Open a prop</StyledText>
              <StyledText style={styles.stepText}>2. Tap the camera icon</StyledText>
              <StyledText style={styles.stepText}>3. Take or select photos</StyledText>
              <StyledText style={styles.stepText}>4. Save your changes</StyledText>
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
            <StyledText style={styles.subsectionTitle}>Create Shows</StyledText>
            <StyledText style={styles.subsectionText}>Set up productions with dates and venues.</StyledText>
            <View style={styles.bulletList}>
              <StyledText style={styles.bulletText}>• Show name and description</StyledText>
              <StyledText style={styles.bulletText}>• Performance dates</StyledText>
              <StyledText style={styles.bulletText}>• Venue information</StyledText>
              <StyledText style={styles.bulletText}>• Team members</StyledText>
            </View>
          </View>
          <View style={styles.subsection}>
            <StyledText style={styles.subsectionTitle}>Manage Teams</StyledText>
            <StyledText style={styles.subsectionText}>Invite crew members and assign roles.</StyledText>
            <View style={styles.stepList}>
              <StyledText style={styles.stepText}>1. Open your show</StyledText>
              <StyledText style={styles.stepText}>2. Tap "Team" tab</StyledText>
              <StyledText style={styles.stepText}>3. Send invite links</StyledText>
              <StyledText style={styles.stepText}>4. Assign roles and permissions</StyledText>
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
            <StyledText style={styles.subsectionTitle}>Create Packing Lists</StyledText>
            <StyledText style={styles.subsectionText}>Organize props for transport and storage.</StyledText>
            <View style={styles.stepList}>
              <StyledText style={styles.stepText}>1. Go to "Packing" tab</StyledText>
              <StyledText style={styles.stepText}>2. Tap "Create New List"</StyledText>
              <StyledText style={styles.stepText}>3. Name your list (e.g., "Act 1 Props")</StyledText>
              <StyledText style={styles.stepText}>4. Add containers and props</StyledText>
            </View>
          </View>
          <View style={styles.subsection}>
            <StyledText style={styles.subsectionTitle}>Organize Containers</StyledText>
            <StyledText style={styles.subsectionText}>Group props in boxes, bags, or bins.</StyledText>
            <View style={styles.bulletList}>
              <StyledText style={styles.bulletText}>• Create containers with names</StyledText>
              <StyledText style={styles.bulletText}>• Add props to containers</StyledText>
              <StyledText style={styles.bulletText}>• Generate QR codes for tracking</StyledText>
              <StyledText style={styles.bulletText}>• Share public links for crew access</StyledText>
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
            <StyledText style={styles.subsectionTitle}>Track Purchases</StyledText>
            <StyledText style={styles.subsectionText}>Keep track of props and materials you need to buy.</StyledText>
            <View style={styles.stepList}>
              <StyledText style={styles.stepText}>1. Go to "Shopping" tab</StyledText>
              <StyledText style={styles.stepText}>2. Tap "Add Item"</StyledText>
              <StyledText style={styles.stepText}>3. Enter item details and budget</StyledText>
              <StyledText style={styles.stepText}>4. Mark as purchased when done</StyledText>
            </View>
          </View>
          <View style={styles.subsection}>
            <StyledText style={styles.subsectionTitle}>Budget Tracking</StyledText>
            <StyledText style={styles.subsectionText}>Monitor spending across your show.</StyledText>
            <View style={styles.bulletList}>
              <StyledText style={styles.bulletText}>• Set budget limits per item</StyledText>
              <StyledText style={styles.bulletText}>• Track actual vs. planned costs</StyledText>
              <StyledText style={styles.bulletText}>• View spending summaries</StyledText>
              <StyledText style={styles.bulletText}>• Export purchase reports</StyledText>
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
            <StyledText style={styles.subsectionTitle}>Common Issues</StyledText>
            <View style={styles.issueList}>
              <View style={styles.issueItem}>
                <StyledText style={styles.issueQuestion}>Props not showing up?</StyledText>
                <StyledText style={styles.issueAnswer}>Check your show filter. Make sure you've selected the right show from the dropdown.</StyledText>
              </View>
              <View style={styles.issueItem}>
                <StyledText style={styles.issueQuestion}>Can't upload photos?</StyledText>
                <StyledText style={styles.issueAnswer}>Photos must be under 5MB. Try compressing large images or use a different format.</StyledText>
              </View>
              <View style={styles.issueItem}>
                <StyledText style={styles.issueQuestion}>Team members can't access?</StyledText>
                <StyledText style={styles.issueAnswer}>Check their email invitation. They need to accept the invite and create an account.</StyledText>
              </View>
            </View>
          </View>
          <View style={styles.subsection}>
            <StyledText style={styles.subsectionTitle}>Get Support</StyledText>
            <StyledText style={styles.subsectionText}>Need more help? We're here for you.</StyledText>
            <View style={styles.bulletList}>
              <StyledText style={styles.bulletText}>• Tap "Report a bug" in the header</StyledText>
              <StyledText style={styles.bulletText}>• Email support@thepropslist.com</StyledText>
              <StyledText style={styles.bulletText}>• Check our FAQ for quick answers</StyledText>
              <StyledText style={styles.bulletText}>• Join our community forum</StyledText>
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
        <StyledText style={styles.headerTitle}>Help Center</StyledText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <StyledText style={styles.introTitle}>Everything you need to manage your theater props like a pro.</StyledText>
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
                    <StyledText style={styles.sectionTitle}>{section.title}</StyledText>
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
          <StyledText style={styles.supportTitle}>Still Need Help?</StyledText>
          <StyledText style={styles.supportText}>
            Can't find what you're looking for? Our support team is ready to help.
          </StyledText>
          <View style={styles.supportButtons}>
            <Pressable onPress={handleReportBug} style={styles.supportButton}>
              <StyledText style={styles.supportButtonText}>Report a Bug</StyledText>
            </Pressable>
            <Pressable onPress={handleEmailSupport} style={[styles.supportButton, styles.supportButtonSecondary]}>
              <StyledText style={styles.supportButtonSecondaryText}>Email Support</StyledText>
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
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#c084fc',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
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
