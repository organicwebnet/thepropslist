import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PropCard } from '../PropCard.tsx';
import { Prop } from '../../shared/types/props.ts';
import { PropLifecycleStatus } from '../../types/lifecycle.ts';

const mockProp: Prop = {
  id: 'prop1',
  userId: 'user1',
  showId: 'show1',
  name: 'Test Prop',
  description: 'This is a detailed description.',
  category: 'Furniture',
  price: 99.99,
  quantity: 1,
  source: 'bought',
  status: 'confirmed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  act: 1,
  scene: 1,
  location: 'Storage Room A',
  images: [{ id: 'img1', url: 'http://example.com/image.jpg' }],
};

const minimalProp: Prop = {
  id: 'prop2',
  userId: 'user1',
  showId: 'show1',
  name: 'Minimal Prop',
  category: 'Hand Prop',
  price: 10.00,
  quantity: 5,
  source: 'made',
  status: 'being_modified',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('PropCard', () => {
  it('renders correctly with full data', () => {
    const { getByText } = render(<PropCard prop={mockProp} />);
    expect(getByText('Test Prop')).toBeTruthy();
    expect(getByText('Act 1, Scene 1')).toBeTruthy();
    expect(getByText('Storage Room A')).toBeTruthy();
    expect(getByText('Confirmed in Show')).toBeTruthy();
    expect(getByText('$99.99 each')).toBeTruthy();
  });

  it('renders correctly with minimal data', () => {
    const { getByText, queryByText } = render(<PropCard prop={minimalProp} />);
    expect(getByText('Minimal Prop')).toBeTruthy();
    expect(queryByText('Act')).toBeNull();
    expect(queryByText('Storage Room')).toBeNull();
    expect(getByText('Being Modified')).toBeTruthy();
    expect(getByText('$10.00 each')).toBeTruthy();
    expect(getByText('No description provided')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PropCard prop={mockProp} onPress={onPress} />);
    fireEvent.press(getByText('Test Prop'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
}); 