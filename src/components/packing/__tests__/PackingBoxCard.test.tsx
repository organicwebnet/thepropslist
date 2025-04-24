import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PackingBoxCard } from '../PackingBoxCard';
import { PackingBox } from '../../../types/packing';

const mockBox: PackingBox = {
  id: 'box1',
  showId: 'show1',
  name: 'Test Box',
  actNumber: 1,
  sceneNumber: 2,
  totalWeight: 8,
  weightUnit: 'kg',
  isHeavy: true,
  notes: 'Initial notes',
  createdAt: new Date(),
  updatedAt: new Date(),
  props: [
    {
      propId: 'prop1',
      name: 'Fragile Prop',
      quantity: 1,
      weight: 3,
      weightUnit: 'kg',
      isFragile: true
    },
    {
      propId: 'prop2',
      name: 'Heavy Prop',
      quantity: 2,
      weight: 5,
      weightUnit: 'kg',
      isFragile: false
    }
  ]
};

describe('PackingBoxCard', () => {
  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders box details correctly', () => {
    const { getByText } = render(
      <PackingBoxCard
        box={mockBox}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(getByText('Test Box')).toBeInTheDocument();
    expect(getByText('Act 1, Scene 2')).toBeInTheDocument();
    expect(getByText('8.0 kg')).toBeInTheDocument();
    expect(getByText('(Heavy)')).toBeInTheDocument();
  });

  it('renders box contents with correct quantities and weights', () => {
    const { getByText } = render(
      <PackingBoxCard
        box={mockBox}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(getByText('Fragile Prop')).toBeInTheDocument();
    expect(getByText('(Fragile)')).toBeInTheDocument();
    expect(getByText('1 × 3kg')).toBeInTheDocument();
    expect(getByText('Heavy Prop')).toBeInTheDocument();
    expect(getByText('2 × 5kg')).toBeInTheDocument();
  });

  it('handles notes updates', async () => {
    const { getByPlaceholderText } = render(
      <PackingBoxCard
        box={mockBox}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    const notesInput = getByPlaceholderText('Add notes about this box...');
    fireEvent.change(notesInput, { target: { value: 'Updated notes' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('box1', { notes: 'Updated notes' });
    });
  });

  it('handles box deletion', () => {
    const { getByTitle } = render(
      <PackingBoxCard
        box={mockBox}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = getByTitle('Delete box');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('box1');
  });
}); 