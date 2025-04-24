import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PropCard } from '../PropCard';
import { Prop } from '../../types/props';

describe('PropCard', () => {
  const mockProp: Prop = {
    id: '1',
    name: 'Test Prop',
    description: 'A test description',
    imageUrl: 'https://example.com/image.jpg',
    quantity: 5,
    category: 'Test Category',
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: 'user1',
    isAvailable: true,
    condition: 'good',
    tags: ['test'],
  };

  it('renders correctly with all prop data', () => {
    const { getByText, getByTestId } = render(<PropCard prop={mockProp} />);
    
    expect(getByText('Test Prop')).toBeTruthy();
    expect(getByText('A test description')).toBeTruthy();
    expect(getByText('Qty: 5')).toBeTruthy();
    expect(getByText('Test Category')).toBeTruthy();
  });

  it('renders correctly with minimal prop data', () => {
    const minimalProp: Prop = {
      id: '1',
      name: 'Test Prop',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: 'user1',
      condition: 'good',
      tags: [],
    };

    const { getByText, queryByText } = render(<PropCard prop={minimalProp} />);
    
    expect(getByText('Test Prop')).toBeTruthy();
    expect(queryByText('Qty:')).toBeNull();
    expect(queryByText('Test Category')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PropCard prop={mockProp} onPress={onPress} />);
    
    fireEvent.press(getByText('Test Prop'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
}); 