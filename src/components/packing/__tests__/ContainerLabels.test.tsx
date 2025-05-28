import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ContainerLabels } from '../ContainerLabels.tsx';
import { PackingContainer } from '../../../shared/services/inventory/packListService.ts';

describe('ContainerLabels', () => {
  const mockContainer: PackingContainer = {
    id: '1',
    name: 'Test Container',
    props: [],
    labels: ['Fragile', 'Heavy'],
    status: 'empty',
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      updatedBy: 'test-user'
    }
  };

  const mockOnUpdateLabels = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders existing labels', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    expect(screen.getByText('Fragile')).toBeInTheDocument();
    expect(screen.getByText('Heavy')).toBeInTheDocument();
  });

  it('adds a new label when clicking Add button', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const input = screen.getByPlaceholderText('Add a label...');
    const addButton = screen.getByText('Add');

    fireEvent.changeText(input, 'New Label');
    fireEvent.press(addButton);

    expect(mockOnUpdateLabels).toHaveBeenCalledWith([
      'Fragile',
      'Heavy',
      'New Label'
    ]);
  });

  it('adds a new label when pressing Enter', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const input = screen.getByPlaceholderText('Add a label...');

    fireEvent.changeText(input, 'New Label');
    fireEvent(input, 'keyPress', { key: 'Enter', code: 13, charCode: 13 });

    expect(mockOnUpdateLabels).toHaveBeenCalledWith([
      'Fragile',
      'Heavy',
      'New Label'
    ]);
  });

  it('shows error when trying to add an empty label', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const addButton = screen.getByText('Add');
    fireEvent.press(addButton);

    expect(screen.getByText('Label cannot be empty')).toBeInTheDocument();
    expect(mockOnUpdateLabels).not.toHaveBeenCalled();
  });

  it('shows error when trying to add a duplicate label', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const input = screen.getByPlaceholderText('Add a label...');
    const addButton = screen.getByText('Add');

    fireEvent.changeText(input, 'Fragile');
    fireEvent.press(addButton);

    expect(screen.getByText('Label already exists')).toBeInTheDocument();
    expect(mockOnUpdateLabels).not.toHaveBeenCalled();
  });

  it('removes a label when clicking the remove button', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const removeButtons = screen.getAllByText('×');
    fireEvent.press(removeButtons[0]);

    expect(mockOnUpdateLabels).toHaveBeenCalledWith(['Heavy']);
  });

  it('clears input after adding a label', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const input = screen.getByPlaceholderText('Add a label...');
    const addButton = screen.getByText('Add');

    fireEvent.changeText(input, 'New Label');
    fireEvent.press(addButton);

    expect(input.value).toBe('');
  });

  it('trims whitespace from labels', () => {
    render(
      <ContainerLabels
        container={mockContainer}
        onUpdateLabels={mockOnUpdateLabels}
      />
    );

    const input = screen.getByPlaceholderText('Add a label...');
    const addButton = screen.getByText('Add');

    fireEvent.changeText(input, '  New Label  ');
    fireEvent.press(addButton);

    expect(mockOnUpdateLabels).toHaveBeenCalledWith([
      'Fragile',
      'Heavy',
      'New Label'
    ]);
  });
}); 