import React from 'react';
// Go up two levels from app/(tabs)/propsTab/ to app/, then into props_shared_details/[id]
import NativePropDetailScreenShared from '../../props_shared_details/[id]';

export default function NativePropDetailScreenTabWrapper() {
  // The NativePropDetailScreenShared component uses useLocalSearchParams internally
  // so we don't need to pass the id explicitly here.
  return <NativePropDetailScreenShared />;
} 