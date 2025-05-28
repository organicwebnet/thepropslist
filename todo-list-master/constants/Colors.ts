const tintColorLight = '#026AA7'; // Trello Blue
const tintColorDark = '#5BA4CF'; // Lighter Blue for Dark Mode

export default {
  light: {
    text: '#172b4d', // Dark Blue/Gray
    textSecondary: '#5e6c84', // Medium Gray
    textLight: '#fff',
    background: '#f0f2f5', // Very Light Gray (Board Background)
    backgroundSection: '#fff', // White (Modals, Cards, Inputs)
    backgroundList: '#ebecf0', // Light Gray (List Background)
    tint: tintColorLight,
    primary: tintColorLight, 
    primaryLight: '#E6F0FA', // Very Light Blue
    border: '#dfe1e6', // Light Gray Border
    inputBackground: '#fff',
    buttonPrimaryBackground: tintColorLight,
    buttonPrimaryText: '#fff',
    buttonSecondaryBackground: '#e0e0e0',
    buttonSecondaryText: '#172b4d',
    buttonDestructiveBackground: '#dc3545', // Red
    buttonDestructiveText: '#fff',
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    shadow: '#000', // Shadow color
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    dueDateSoon: '#ffc107', // Amber/Yellow
    dueDateOverdue: '#dc3545', // Red
    dueDateOk: '#28a745', // Green
  },
  dark: {
    text: '#EAECEE', // Very Light Gray
    textSecondary: '#B0B8BF', // Medium Gray
    textLight: '#fff', // Keep white for contrast on dark buttons
    background: '#1D2125', // Dark Gray/Blue (Board Background)
    backgroundSection: '#282E33', // Slightly Lighter Gray (Modals, Cards, Inputs)
    backgroundList: '#3A4045', // Medium Gray (List Background)
    tint: tintColorDark,
    primary: tintColorDark,
    primaryLight: '#3A4045',
    border: '#555', // Darker Gray Border
    inputBackground: '#282E33',
    buttonPrimaryBackground: tintColorDark,
    buttonPrimaryText: '#1D2125', // Dark text on light blue button
    buttonSecondaryBackground: '#555',
    buttonSecondaryText: '#EAECEE',
    buttonDestructiveBackground: '#E57373', // Lighter Red
    buttonDestructiveText: '#1D2125', // Dark text on light red button
    tabIconDefault: '#777',
    tabIconSelected: tintColorDark,
    shadow: '#000', // Shadow color (can remain black or be adjusted)
    modalOverlay: 'rgba(0, 0, 0, 0.7)', // Darker overlay
    dueDateSoon: '#ffca2c', // Lighter Amber/Yellow for dark
    dueDateOverdue: '#cf6679', // Darker Red
    dueDateOk: '#38ef7d', // Brighter Green for dark
  },
};
