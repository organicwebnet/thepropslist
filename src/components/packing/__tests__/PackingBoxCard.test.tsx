import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-native-paper'; // Import Provider
import { ThemeProvider } from '../../../contexts/ThemeContext.tsx'; // Import ThemeProvider
import { Text } from 'react-native'; // Import Text
// No need for jest-dom with react-native testing library
// import '@testing-library/jest-dom';
import { PackingBoxCard } from '../PackingBoxCard.tsx';
import { PackingBox, PackedProp } from '../../../types/packing.ts'; // Corrected path
import { Timestamp } from 'firebase/firestore';

// Mock Lucide icons used in the component
jest.mock('lucide-react', () => ({
  Pencil: () => <Text>Pencil</Text>, // Render simple text mocks
  Trash2: () => <Text>Trash2</Text>,
  PackageCheck: () => <Text>PackageCheck</Text>,
  AlertTriangle: () => <Text>AlertTriangle</Text>,
}));

const mockBox: PackingBox = {
  id: 'box1',
  name: 'Kitchen Props Box',
  props: [
    { propId: 'p1', name: 'Spoon', quantity: 1, weight: 0.1, weightUnit: 'kg', isFragile: false },
    { propId: 'p2', name: 'Glass', quantity: 1, weight: 0.5, weightUnit: 'kg', isFragile: true },
  ],
  status: 'packed',
  description: 'Contains fragile items',
  showId: 'show1',
  actNumber: 1,
  sceneNumber: 1,
  totalWeight: 0.6,
  weightUnit: 'kg',
  isHeavy: false,
  labels: ['Fragile'],
  notes: '',
  createdAt: new Date(), // Use standard Date object
  updatedAt: new Date(), // Use standard Date object
};

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn().mockResolvedValue(undefined); // Mock async function

describe('PackingBoxCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (boxProps: PackingBox = mockBox) => {
    return render(
      <PackingBoxCard 
        box={boxProps} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    );
  }

  it('renders correctly with box data', () => {
    renderComponent();
    
    expect(screen.getByText('Kitchen Props Box')).toBeTruthy();
    expect(screen.getByText('Packed')).toBeTruthy(); // Status text
    expect(screen.getByText('PackageCheck')).toBeTruthy(); // Status icon mock
    expect(screen.getByText('Contents (2 items)')).toBeTruthy();
    expect(screen.getByText('Spoon')).toBeTruthy();
    expect(screen.getByText('Glass')).toBeTruthy();
    expect(screen.getByText(/Total Weight: 0.6 kg/)).toBeTruthy();
    expect(screen.getByText(/Last updated:/)).toBeTruthy(); 
  });

  it('calls onEdit when edit button is pressed', () => {
    renderComponent();
    const editButton = screen.getByLabelText('Edit Box');
    fireEvent.press(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith('box1');
  });

  it('calls onDelete when delete button is pressed', async () => {
    renderComponent();
    const deleteButton = screen.getByLabelText('Delete Box');
    fireEvent.press(deleteButton);
    // Check if the loading state/icon appears (optional)
    expect(screen.queryByText('Trash2')).toBeNull(); // Icon replaced by spinner mock
    
    // Wait for the async operation (mocked) to complete
    await expect(mockOnDelete).toHaveBeenCalledWith('box1');
    // Optionally check if spinner disappears after mock resolves
  });

  it('displays heavy warning if box is heavy', () => {
    const heavyBox = { ...mockBox, isHeavy: true };
    renderComponent(heavyBox);
    expect(screen.getByText('Heavy')).toBeTruthy();
    expect(screen.getByText('AlertTriangle')).toBeTruthy(); // Icon for heavy
  });

  it('handles missing description gracefully', () => {
    const noDescBox = { ...mockBox, description: undefined };
    renderComponent(noDescBox);
    expect(screen.queryByText('Contains fragile items')).toBeNull();
  });
  
  it('displays correct text for empty box', () => {
      const emptyBox = { ...mockBox, props: [] };
      renderComponent(emptyBox);
      expect(screen.getByText('Contents (0 items)')).toBeTruthy();
      expect(screen.getByText('No props added yet.')).toBeTruthy();
  });
}); 
