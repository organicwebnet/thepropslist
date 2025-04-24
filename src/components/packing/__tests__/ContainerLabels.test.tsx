import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContainerLabels } from '../ContainerLabels';
import { PackingContainer } from '../../../shared/services/inventory/packListService';

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

    fireEvent.change(input, { target: { value: 'New Label' } });
    fireEvent.click(addButton);

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

    fireEvent.change(input, { target: { value: 'New Label' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

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
    fireEvent.click(addButton);

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

    fireEvent.change(input, { target: { value: 'Fragile' } });
    fireEvent.click(addButton);

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
    fireEvent.click(removeButtons[0]); // Remove 'Fragile'

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

    fireEvent.change(input, { target: { value: 'New Label' } });
    fireEvent.click(addButton);

    expect(input).toHaveValue('');
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

    fireEvent.change(input, { target: { value: '  New Label  ' } });
    fireEvent.click(addButton);

    expect(mockOnUpdateLabels).toHaveBeenCalledWith([
      'Fragile',
      'Heavy',
      'New Label'
    ]);
  });
}); 