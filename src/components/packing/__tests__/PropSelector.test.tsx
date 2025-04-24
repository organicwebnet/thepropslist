import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PropSelector } from '../PropSelector';
import { Prop } from '../../../types';

const mockProps: Prop[] = [
  {
    id: 'prop1',
    userId: 'user1',
    showId: 'show1',
    name: 'Test Prop 1',
    description: 'A test prop',
    category: 'Hand Prop',
    price: 100,
    source: 'bought',
    sourceDetails: 'Purchased from store',
    act: 1,
    scene: 1,
    isMultiScene: false,
    isConsumable: false,
    quantity: 1,
    imageUrl: 'https://example.com/prop1.jpg',
    images: [],
    hasUsageInstructions: false,
    hasMaintenanceNotes: false,
    hasSafetyNotes: false,
    requiresPreShowSetup: false,
    hasOwnShippingCrate: false,
    requiresSpecialTransport: false,
    hasBeenModified: false,
    modificationDetails: '',
    isRented: false,
    digitalAssets: [],
    travelsUnboxed: false,
    status: 'confirmed',
    maintenanceHistory: [],
    statusHistory: [],
    weightUnit: 'kg',
    unit: 'cm',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prop2',
    userId: 'user1',
    showId: 'show1',
    name: 'Test Prop 2',
    description: 'Another test prop',
    category: 'Furniture',
    price: 150,
    source: 'bought',
    sourceDetails: 'Purchased from store',
    act: 1,
    scene: 2,
    isMultiScene: false,
    isConsumable: false,
    quantity: 2,
    imageUrl: undefined,
    images: [],
    hasUsageInstructions: false,
    hasMaintenanceNotes: false,
    hasSafetyNotes: false,
    requiresPreShowSetup: false,
    hasOwnShippingCrate: false,
    requiresSpecialTransport: false,
    hasBeenModified: false,
    modificationDetails: '',
    isRented: false,
    digitalAssets: [],
    travelsUnboxed: false,
    status: 'confirmed',
    maintenanceHistory: [],
    statusHistory: [],
    weightUnit: 'kg',
    unit: 'cm',
    createdAt: new Date().toISOString()
  }
];

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

    expect(getByText('Test Prop 1')).toBeInTheDocument();
    expect(queryByText('Test Prop 2')).toBeInTheDocument();
    expect(getByText('Hand Prop')).toBeInTheDocument();
    expect(getByText('Qty: 2')).toBeInTheDocument();
  });

  it('handles prop selection', () => {
    const { getByText } = render(
      <PropSelector
        props={mockProps}
        selectedProps={[]}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(getByText('Test Prop 1'));
    expect(mockOnChange).toHaveBeenCalledWith([mockProps[0]]);
  });

  it('handles prop deselection', () => {
    const { getByText } = render(
      <PropSelector
        props={mockProps}
        selectedProps={[mockProps[0]]}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(getByText('Test Prop 1'));
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

    const button = getByText('Test Prop 1').closest('button');
    expect(button).toBeDisabled();
  });
}); 