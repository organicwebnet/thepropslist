import { Stack } from 'expo-router';

export default function PropsLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Prop (Native)' }} />
      {/* Add other screens within the props group here if needed, e.g., create */}
      {/* <Stack.Screen name="create" options={{ title: 'Create Prop (Native)' }} /> */}
    </Stack>
  );
} 