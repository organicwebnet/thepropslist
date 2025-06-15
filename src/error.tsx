import { View, Text, StyleSheet, useColorScheme, Pressable } from 'react-native';
import { ErrorBoundaryProps } from 'expo-router';

export default function ErrorBoundary(props: ErrorBoundaryProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Oops!</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
        Something went wrong. Please try again.
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: 'transparent' }]}
        onPress={() => props.retry()}
      >
        <Text style={[styles.buttonText, { color: isDark ? '#fff' : '#000' }]}>
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 