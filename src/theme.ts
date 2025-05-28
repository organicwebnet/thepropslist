import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: 'rgb(0, 122, 255)', // Example primary color
    background: 'rgb(242, 242, 242)',
    card: 'rgb(255, 255, 255)',
    text: 'rgb(28, 28, 30)',
    textSecondary: '#666666',
    border: 'rgb(216, 216, 216)',
    notification: 'rgb(255, 59, 48)',
    error: 'rgb(220, 38, 38)', // Similar to #DC2626 (red-600)
    // Task Manager Specific Colors - Light Theme
    listBackground: '#EBECF0',
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBackground: '#F8F8F8',
    inputBackground: '#FFFFFF',
    placeholder: '#C7C7CD',
    dueDateOk: 'green',
    dueDateSoon: 'orange',
    dueDateOverdue: 'red',
    headerText: '#000000',
    icon: '#007AFF',
    loaderBackground: 'rgba(255,255,255,0.7)'
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: 'rgb(10, 132, 255)', // Example primary color
    background: 'rgb(1, 1, 1)',
    card: 'rgb(18, 18, 18)',
    text: 'rgb(229, 229, 231)',
    textSecondary: '#AAAAAA',
    border: 'rgb(39, 39, 41)',
    notification: 'rgb(255, 69, 58)',
    error: 'rgb(239, 68, 68)', // #EF4444 (red-500) from ProfileScreen
    // Task Manager Specific Colors - Dark Theme
    listBackground: '#2C2C2E',
    modalOverlay: 'rgba(0,0,0,0.7)',
    modalBackground: '#121212',
    inputBackground: '#2C2C2E',
    placeholder: '#5A5A5E',
    dueDateOk: '#34C759',
    dueDateSoon: '#FF9500',
    dueDateOverdue: '#FF3B30',
    headerText: '#FFFFFF',
    icon: '#0A84FF',
    loaderBackground: 'rgba(0,0,0,0.5)'
  },
}; 