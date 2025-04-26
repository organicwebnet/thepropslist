import { useLocalSearchParams } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, List, Settings, BarChart2, Search } from 'lucide-react-native';

interface TabNavigationProps {
  activeTab: 'props' | 'shows' | 'packing';
  setActiveTab: (tab: 'props' | 'shows' | 'packing') => void;
  navigate: (path: string) => void;
}

export function TabNavigation({ activeTab, setActiveTab, navigate }: TabNavigationProps) {
  const { showId } = useLocalSearchParams<{ showId?: string }>();

  const handleTabClick = (tab: 'props' | 'shows' | 'packing') => {
    setActiveTab(tab);
    if (showId && tab === 'packing') {
      navigate(`/packing/${showId}`);
    } else {
      navigate(`/${tab}`);
    }
  };

  return (
    <div className="mb-6">
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex space-x-8">
          <button
            onClick={() => handleTabClick('props')}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'props'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Props
          </button>
          <button
            onClick={() => handleTabClick('shows')}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'shows'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Shows
          </button>
          <button
            onClick={() => handleTabClick('packing')}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === 'packing'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            Packing
          </button>
        </nav>
      </div>
    </div>
  );
} 