import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PropSelector } from '../PropSelector';
import { Prop } from '@/shared/types/props';

const mockProps: Prop[] = [
  {
    id: '1',
    name: 'Old Chair',
    userId: 'user1',
    showId: 'show1',
    category: 'Furniture',
    price: 50,
    quantity: 1,
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
    quantity: 10,
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

    fireEvent.click(getByText('Old Chair'));
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

    fireEvent.click(getByText('Old Chair'));
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