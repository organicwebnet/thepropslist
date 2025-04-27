import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PackingList } from '../PackingList';
import { Prop, PropSource } from '@/shared/types/props';
import { PropLifecycleStatus } from '@/types/lifecycle';
import { Show } from '@/types';

// Mock Props conforming to src/shared/types/props
const mockProps: Prop[] = [
  {
    id: '1',
    userId: 'user1',
    showId: 'show1',
    name: 'Old Chair',
    description: 'A very old chair',
    category: 'Furniture',
    price: 50,
    quantity: 1,
    weightUnit: 'kg',
    weight: 10,
    source: 'bought',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'user1',
    showId: 'show1',
    name: 'Fake Sword',
    description: 'A prop sword',
    category: 'Weapon',
    price: 120,
    act: 1,
    scene: 2,
    quantity: 2,
    weightUnit: 'kg',
    weight: 3,
    source: 'made',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock Show with string date
const mockShow: Show = {
  id: 'show1',
  name: 'Test Show',
  userId: 'user1',
  acts: [
    { id: 1, name: 'Act 1', scenes: [{ id: 1, name: 'Scene 1' }, { id: 2, name: 'Scene 2' }] },
    { id: 2, name: 'Act 2', scenes: [{ id: 1, name: 'Scene 1' }] },
  ],
  description: 'A test show description',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  collaborators: [],
  stageManager: 'Jane Doe',
  stageManagerEmail: 'jane.doe@example.com',
  propsSupervisor: 'John Smith',
  propsSupervisorEmail: 'john.smith@example.com',
  productionCompany: 'Test Productions',
  productionContactName: 'Contact Person',
  productionContactEmail: 'contact@test.com',
  venues: [],
  isTouringShow: false,
  contacts: [],
};

const mockOnCreateBox = jest.fn();
const mockOnUpdateBox = jest.fn();
const mockOnDeleteBox = jest.fn();

describe('PackingList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with props and boxes', () => {
    render(
      <PackingList
        show={mockShow}
        boxes={[]}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );
    expect(screen.getByText('Old Chair')).toBeInTheDocument();
    expect(screen.getByText('Fake Sword')).toBeInTheDocument();
  });

  it('filters props by act and scene', () => {
    render(
      <PackingList
        show={mockShow}
        boxes={[]}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );

    // Default view (Act 1, Scene 1)
    expect(screen.queryByText('Old Chair')).toBeInTheDocument();
    expect(screen.queryByText('Fake Sword')).not.toBeInTheDocument();

    // Change to Act 1, Scene 2
    fireEvent.change(screen.getByLabelText('Act'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Scene'), { target: { value: '2' } });

    expect(screen.queryByText('Old Chair')).not.toBeInTheDocument();
    expect(screen.queryByText('Fake Sword')).toBeInTheDocument();
  });
  
  it('allows selecting props and creating a box', () => {
    render(
      <PackingList
        show={mockShow}
        boxes={[]}
        props={mockProps}
        onCreateBox={mockOnCreateBox}
        onUpdateBox={mockOnUpdateBox}
        onDeleteBox={mockOnDeleteBox}
      />
    );

    // Select the sword
    const swordCheckbox = screen.getByRole('button', { name: /Fake Sword/i });
    fireEvent.click(swordCheckbox);

    const createBoxButton = screen.getByRole('button', { name: /Create Box/i });
    fireEvent.click(createBoxButton);

    // Check if onCreateBox was called with the selected prop data
    expect(mockOnCreateBox).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ propId: '2', name: 'Fake Sword' })
      ]),
      1,
      2
    );
  });

  // Add tests for updating and deleting boxes if those functionalities are rendered
}); 