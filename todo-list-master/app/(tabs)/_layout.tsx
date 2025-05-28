import { Tabs, useRouter, Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { onAuthStateChanged, signOut, Auth, User } from 'firebase/auth';
import { auth } from '../_firebase/config'; // Correct path
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useClientOnlyValue } from '../../components/useClientOnlyValue'; // Import this

// Auth Protection Hook (restored)
const useProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log("(tabs)/_layout Auth Effect: Setting up listener...");
    if (!auth) {
      console.error("(tabs)/_layout: Auth service not initialized!");
      setIsAuthenticated(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("(tabs)/_layout Auth State Changed! User logged in:", !!user);
      const authState = !!user;
      setIsAuthenticated(authState);
      // Redirect logic moved to separate effect for clarity
    });
    return () => {
      console.log("(tabs)/_layout Auth Effect: Cleaning up listener.");
      unsubscribe();
    };
  }, []); // Run only once on mount

  useEffect(() => {
    // Only redirect if auth state is definitively false (not null)
    if (isAuthenticated === false) {
      console.log("(tabs)/_layout Redirect Effect: User not authenticated -> Redirecting to /login");
      router.replace('/login');
    }
  }, [isAuthenticated, router]); // Depend on auth state and router

  return { isAuthenticated };
};


// Logout Handler (associated with useProtectedRoute)
const handleLogout = async (firebaseAuth: Auth) => {
  if (!firebaseAuth) {
    Alert.alert("Error", "Auth service not available.");
    return;
  }
  try {
    await signOut(firebaseAuth);
    console.log("User logged out via Tabs Layout");
    // Auth listener in useProtectedRoute will handle redirect
  } catch (error) {
    console.error("Logout Error:", error);
    Alert.alert("Logout Failed", "An error occurred while logging out.");
  }
};

// TabBarIcon Component Definition
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

// Main TabLayout Component
export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { isAuthenticated } = useProtectedRoute(); // Use the hook
  const isHeaderShown = useClientOnlyValue(false, true); // Call hook unconditionally

  // Render loading indicator while checking auth state
  if (isAuthenticated === null) {
    console.log("(tabs)/_layout: Auth state pending, rendering loader.");
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </View>
    );
  }

  // If not authenticated, the hook should handle the redirect, render null here
  if (!isAuthenticated) {
     console.log("(tabs)/_layout: Not authenticated, hook should redirect. Rendering null.");
     return null;
  }

  // User is authenticated, render the Tabs navigator
  console.log("(tabs)/_layout: User authenticated, rendering Tabs.");
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: isHeaderShown, // Use the variable here
        headerStyle: {
           backgroundColor: Colors[colorScheme].background,
        },
        headerTintColor: Colors[colorScheme].text,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].background,
          borderTopColor: Colors[colorScheme].border, // Use theme border color
        },
         tabBarInactiveTintColor: Colors[colorScheme].textSecondary, // Theme inactive tint
      }}>
      <Tabs.Screen
        name="index" // This corresponds to app/(tabs)/index.tsx
        options={{
          title: 'Boards',
          tabBarIcon: ({ color }) => <TabBarIcon name="grid-outline" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
          headerLeft: () => (
              // Use the correct handleLogout function, ensure auth is not null
              <Pressable 
                onPress={() => {
                  if (auth) {
                    handleLogout(auth)
                  } else {
                    console.error("Logout button pressed but auth is null!");
                    Alert.alert("Error", "Cannot logout. Authentication service not ready.");
                  }
                }}
                style={{ marginLeft: 15 }}
              >
                 {({ pressed }) => (
                    <Ionicons
                       name="log-out-outline"
                       size={25}
                       color={Colors[colorScheme].text}
                       style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                 )}
              </Pressable>
          ),
        }}
      />
      {/* Explore tab commented out */}
      {/* <Tabs.Screen
        name="explore" // This would correspond to app/(tabs)/explore.tsx
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabBarIcon name="compass-outline" color={color} />,
          href: null, // Hide this tab from the bar
        }}
      /> */}
    </Tabs>
  );
}

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
