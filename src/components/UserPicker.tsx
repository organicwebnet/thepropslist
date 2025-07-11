import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import type { UserProfile } from '../shared/types/auth';

interface UserPickerProps {
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export function UserPicker({ selectedUserIds, onChange, disabled }: UserPickerProps) {
  const { service } = useFirebase();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    service.getCollection<UserProfile>('userProfiles')
      .then(docs => {
        if (mounted) {
          setUsers(docs.map(doc => ({ ...doc.data, id: doc.id })));
          setLoading(false);
        }
      })
      .catch(err => {
        setError('Failed to load users');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [service]);

  if (loading) return <ActivityIndicator size="small" color="#2563eb" />;
  if (error) return <Text style={{ color: 'red' }}>{error}</Text>;

  return (
    <View style={{ flexDirection: 'column', gap: 4 }}>
      {users.map(user => (
        <TouchableOpacity
          key={user.id}
          onPress={() => {
            if (disabled) return;
            if (selectedUserIds.includes(user.id)) {
              onChange(selectedUserIds.filter(id => id !== user.id));
            } else {
              onChange([...selectedUserIds, user.id]);
            }
          }}
          style={{
            padding: 8,
            backgroundColor: selectedUserIds.includes(user.id) ? '#2563eb' : '#222',
            borderRadius: 6,
            marginBottom: 4,
            opacity: disabled ? 0.5 : 1,
          }}
          disabled={disabled}
        >
          <Text style={{ color: selectedUserIds.includes(user.id) ? 'white' : '#ccc' }}>
            {user.displayName || user.email || user.id}
          </Text>
        </TouchableOpacity>
      ))}
      {users.length === 0 && <Text>No users found.</Text>}
    </View>
  );
} 
