import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Menu, Moon, Sun, UserCircle, LogOut, HelpCircle, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
const appConfigFunction = require('../../../app.config.js'); // Corrected import for app.config.js

export const TopNavBar = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const APP_CONFIG = appConfigFunction({ config: {} });
  const APP_NAME = APP_CONFIG.name;

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Define common link styles
  const linkStyle = "text-lg font-semibold px-4 py-2 rounded-md hover:bg-gray-700";
  const textStyle = theme === 'dark' ? 'text-white' : 'text-black'; // Adjust based on theme
  const iconColor = theme === 'dark' ? '#FFFFFF' : '#000000'; // White for dark theme

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
        <Link href="/todos" asChild>
           <TouchableOpacity>
             <Text className={`${linkStyle} ${textStyle}`}>Task Boards</Text>
           </TouchableOpacity>
        </Link>
      </View>

      {/* Right side - Profile Image Link & Logout Button */}
      <View className="flex-row items-center space-x-4">
        {/* Profile Image Link */}
        <Link href="/profile" asChild>
          <TouchableOpacity>
            {user?.photoURL ? (
              <Image 
                source={{ uri: user.photoURL }}
                className="h-10 w-10 rounded-full border-2 border-gray-600" // Added border for visibility
              />
            ) : (
              // Fallback text instead of icon
              <View className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center border-2 border-gray-500">
                <Text className={textStyle}>P</Text> 
              </View>
              // <View className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center border-2 border-gray-500"> {/* Fallback background */}
              //   <UserIcon size={24} color={iconColor} />
              // </View>
            )}
          </TouchableOpacity>
        </Link>

        {/* Logout Icon Button - Temporarily use text */}
        <TouchableOpacity onPress={handleLogout} className="p-2 rounded-md hover:bg-gray-700"> 
          <Text className={textStyle}>Logout</Text> 
          {/* <LogOut size={24} color={iconColor} /> */}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    // Add styles if needed, e.g., for alignment
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// Note: Added TouchableOpacity wrapper for better web interaction/styling consistency if needed.
// Also added placeholder ThemeContext usage - adjust path and implementation as needed.
// Make sure to import Text and TouchableOpacity from 'react-native' 