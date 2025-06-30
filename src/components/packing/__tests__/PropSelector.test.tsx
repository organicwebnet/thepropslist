import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import '@testing-library/jest-dom';
import { Text } from 'react-native';
import { PropSelector } from '../PropSelector.tsx';
import { Prop } from '../../../shared/types/props.ts';

// Define TemporaryPropInstance for the test file, mirroring its structure
interface TemporaryPropInstance extends Prop {
  instanceId: string;
  isPacked: boolean;
}

const rawMockProps: Prop[] = [
  {
    id: '1',
    name: 'Old Chair',
    userId: 'user1',
    showId: 'show1',
    category: 'Furniture',
    price: 50,
    quantity: 1, // Test with quantity 1 for simpler instanceId logic in tests
    source: 'bought',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [{ id: 'img1', url: 'https://example.com/prop1.jpg' }],
    act: 1,
    scene: 1,
    isMultiScene: false,
  },
  {
    id: '2',
    name: 'Fake Blood Packets',
    userId: 'user1',
    showId: 'show1',
    category: 'Special Effects',
    price: 5,
    quantity: 2, // Test with quantity > 1
    source: 'made',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    act: 1,
    scene: 2,
    isMultiScene: false,
  },
  {
    id: '3',
    name: 'Rented Lamp',
    userId: 'user1',
    showId: 'show1',
    category: 'Lighting',
    price: 25,
    quantity: 1,
    source: 'rented',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
    act: 1,
    scene: 1,
    isMultiScene: false,
  },
];

// Transform rawMockProps to TemporaryPropInstance[]
const mockProps: TemporaryPropInstance[] = rawMockProps.flatMap(prop => {
  const instances: TemporaryPropInstance[] = [];
  for (let i = 0; i < (prop.quantity || 1); i++) {
    instances.push({
      ...prop,
      instanceId: `${prop.id}-${i}`,
      isPacked: false,
    });
  }
  return instances;
});

describe('PropSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders available props correctly', () => {
    const { getByText, queryByText } = render(
      <PropSelector
        props={mockProps}
        selectedProps={[]}
        onChange={mockOnChange}
      />
    );

    expect(getByText('Old Chair')).toBeInTheDocument();
    expect(queryByText('Fake Blood Packets')).toBeInTheDocument();
    expect(getByText('Furniture')).toBeInTheDocument();
    // Find the specific instance of "Fake Blood Packets" with quantity
    // The text "Qty: 2" might appear multiple times if the name is the same
    // This assertion needs to be more specific or adjusted based on how component renders quantity for instances
    // For now, let's assume the category and name are sufficient to identify one of the "Fake Blood Packets" elements
    const fakeBloodElement = getByText('Fake Blood Packets');
    expect(fakeBloodElement).toBeInTheDocument();
    // Check for "Qty: 2" associated with "Fake Blood Packets" if it's displayed per instance or prop type
    // This part of the test might need refinement based on the component's rendering logic for multiple instances.
  });

  it('handles prop selection', () => {
    const { getByText } = render(
      <PropSelector
        props={mockProps}
        selectedProps={[]}
        onChange={mockOnChange}
      />
    );
    // Select the first instance of "Old Chair"
    fireEvent.press(getByText('Old Chair'));
    expect(mockOnChange).toHaveBeenCalledWith([mockProps.find(p => p.id === '1' && p.instanceId === '1-0')]);
  });

  it('handles prop deselection', () => {
    const selectedOldChairInstance = mockProps.find(p => p.id === '1' && p.instanceId === '1-0');
    const { getByText } = render(
      <PropSelector
        props={mockProps}
        selectedProps={selectedOldChairInstance ? [selectedOldChairInstance] : []}
        onChange={mockOnChange}
      />
    );

    fireEvent.press(getByText('Old Chair'));
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('displays empty state when no props are available', () => {
    const { getByText } = render(
      <PropSelector
        props={[]}
        selectedProps={[]}
        onChange={mockOnChange}
      />
    );

    expect(getByText('No props available for this act and scene')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    const { getByText } = render(
      <PropSelector
        props={mockProps}
        selectedProps={[]}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const button = getByText('Old Chair').closest('button');
    expect(button).toBeDisabled();
  });
}); 
