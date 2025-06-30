import React, { useState } from 'react';
import { Slot, Link } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { TopNavBar } from '../../src/components/navigation/TopNavBar.tsx';
import { FeedbackForm } from '../../src/components/FeedbackForm.tsx';
import { HelpCenter } from '../../src/components/HelpCenter.tsx';

export default function WebLayout() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <View style={{ flex: 1, flexDirection: 'column' }} className="bg-gray-900">
      {/* <View style={{ height: 60, zIndex: 10 }}> */}
      <TopNavBar />
      {/* </View> */}
      {/* Slot renders the current page content within the (web) group */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <Slot />
      </ScrollView>

      {/* Footer Area */}
      <View className="w-full bg-gray-800/50 border-t border-gray-700 p-3 flex-row justify-between items-center">
        <Text className="text-xs text-gray-400">© 2025 Props Bible</Text>
        <View className="flex-row gap-4 items-center">
          {/* Help Link - Opens Modal */}
          <TouchableOpacity onPress={() => setIsHelpOpen(true)}>
             <Text className="text-xs text-blue-400 hover:text-blue-300">Help</Text>
          </TouchableOpacity>
          {/* Feedback Link - Opens Modal */}
          <TouchableOpacity onPress={() => setIsFeedbackOpen(true)}>
             <Text className="text-xs text-blue-400 hover:text-blue-300">Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditionally Render Modals */}
      {isHelpOpen && <HelpCenter onClose={() => setIsHelpOpen(false)} />} 
      {isFeedbackOpen && <FeedbackForm onClose={() => setIsFeedbackOpen(false)} onSubmit={() => {console.log("Feedback submitted")}} />} 

    </View>
  );
} 
