import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext'; // Assuming ThemeContext provides theme info
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
import { useRouter } from 'expo-router'; // Import useRouter

export const TopNavBar = () => {
  const { theme } = useTheme(); // Example: Get theme for styling
  const { signOut } = useAuth(); // Correctly use signOut
  const router = useRouter(); // Get router instance

  // Define common link styles
  const linkStyle = "text-lg font-semibold px-4 py-2 rounded-md hover:bg-gray-700";
  const textStyle = theme === 'dark' ? 'text-white' : 'text-black'; // Adjust based on theme

  const handleLogout = async () => {
    try {
      await signOut();
      // Explicitly navigate to root/login after successful sign out
      router.replace('/'); 
    } catch (error) {
      console.error("Sign out failed:", error);
      // Optional: Show error message to user
    }
  };

  return (
    <View 
      className="w-full bg-gray-900 p-4 flex-row justify-between items-center space-x-4 shadow-md"
    >
      {/* Left side links */}
      <View className="flex-row items-center space-x-4">
        <Text className="text-xl font-bold text-white mr-6">PropsBible</Text>
        {/* Navigation Links */}
        
        <Link href="/shows" asChild>
          <TouchableOpacity>
            <Text className={`${linkStyle} ${textStyle}`}>Shows</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/props" asChild>
           <TouchableOpacity>
            <Text className={`${linkStyle} ${textStyle}`}>Props</Text>
           </TouchableOpacity>
        </Link>
        <Link href="/packing" asChild>
           <TouchableOpacity>
             <Text className={`${linkStyle} ${textStyle}`}>Packing</Text>
           </TouchableOpacity>
        </Link>
      </View>

      {/* Right side - Logout Button */}
      <TouchableOpacity onPress={handleLogout}>
        <Text className={`${linkStyle} ${textStyle}`}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

// Note: Added TouchableOpacity wrapper for better web interaction/styling consistency if needed.
// Also added placeholder ThemeContext usage - adjust path and implementation as needed.
// Make sure to import Text and TouchableOpacity from 'react-native' 