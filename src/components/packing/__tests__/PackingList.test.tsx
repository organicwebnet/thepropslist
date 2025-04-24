import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PackingList } from '../PackingList';
import { PackingBox } from '../../../types/packing';
import { Prop, PropSource, PropStatus } from '../../../shared/types/props';
import { Show } from '../../../types';

// Mock data
const mockProps: Prop[] = [
  {
    id: '1',
    name: 'Test Prop 1',
    description: 'Description 1',
    category: 'Hand Prop',
    act: 1,
    scene: 1,
    quantity: 1,
    weightUnit: 'kg',
    weight: 5,
    source: 'owned' as PropSource,
    status: 'available' as PropStatus,
    handlingInstructions: 'Fragile',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test Prop 2',
    description: 'Description 2',
    category: 'Set Dressing',
    act: 1,
    scene: 2,
    quantity: 1,
    weightUnit: 'kg',
    weight: 3,
    source: 'owned' as PropSource,
    status: 'available' as PropStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockShow: Show = {
  id: 'show1',
  name: 'Test Show',
  description: 'A test show',
  startDate: new Date(),
  endDate: new Date(),
  status: 'active',
  userId: 'user1',
  collaborators: [],
  stageManager: 'manager1',
  venue: 'Test Venue',
  company: 'Test Company',
  season: 'Test Season',
  acts: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBoxes: PackingBox[] = [];

describe('PackingList', () => {
  const mockOnCreateBox = jest.fn();
  const mockOnUpdateBox = jest.fn();
  const mockOnDeleteBox = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders available props correctly', () => {
    const { getByText } = render(
      <PackingList
        show={mockShow}
        boxes={mockBoxes}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );
    
    expect(getByText('Test Prop 1')).toBeInTheDocument();
    expect(getByText('Test Prop 2')).toBeInTheDocument();
  });

  it('allows selecting props for a new box', async () => {
    const { getByText, getByLabelText } = render(
      <PackingList
        show={mockShow}
        boxes={mockBoxes}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );
    
    // Click on a prop to select it
    fireEvent.click(getByText('Test Prop 1'));
    
    // Enter box name
    const boxNameInput = getByLabelText('Box Name');
    fireEvent.change(boxNameInput, { target: { value: 'New Box' } });
    
    // Create box
    fireEvent.click(getByText('Create Box'));
    
    await waitFor(() => {
      expect(mockOnCreateBox).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: '1' })]),
        1,
        1
      );
    });
  });

  it('shows fragile indicator for fragile props', () => {
    const { getByText } = render(
      <PackingList
        show={mockShow}
        boxes={mockBoxes}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );
    
    expect(getByText('Fragile')).toBeInTheDocument();
  });

  it('shows weight information for props', () => {
    const { getByText } = render(
      <PackingList
        show={mockShow}
        boxes={mockBoxes}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );
    
    expect(getByText('5 kg')).toBeInTheDocument();
    expect(getByText('3 kg')).toBeInTheDocument();
  });

  it('disables already selected props', async () => {
    const { getByText } = render(
      <PackingList
        show={mockShow}
        boxes={mockBoxes}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );
    
    const prop1Button = getByText('Test Prop 1').closest('button');
    expect(prop1Button).not.toBeDisabled();
    
    fireEvent.click(prop1Button!);
    
    await waitFor(() => {
      expect(prop1Button).toBeDisabled();
    });
  });
}); 