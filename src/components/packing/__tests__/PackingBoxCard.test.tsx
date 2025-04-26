import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PackingBoxCard } from '../PackingBoxCard';
import { PackingContainer } from '../../../shared/services/inventory/packListService';
import { PackingBoxCardBaseProps } from '../../../shared/types/packing';

const mockContainer: PackingContainer = {
  id: 'box1',
  name: 'Kitchen Props',
  props: [],
  status: 'empty',
  labels: ['Fragile'],
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
    updatedBy: 'test-user',
  },
  description: 'Contains fragile items',
};

const mockOnUpdateNotes = jest.fn();
const mockOnError = jest.fn();
const mockOnPrintLabel = jest.fn();
const mockOnShare = jest.fn();
const mockOnScan = jest.fn();

const baseProps: PackingBoxCardBaseProps = {
  container: mockContainer,
  packListId: 'pl1',
  baseUrl: 'http://localhost',
  onUpdateNotes: mockOnUpdateNotes,
  onError: mockOnError,
  onPrintLabel: mockOnPrintLabel,
  onShare: mockOnShare,
  onScan: mockOnScan,
};

describe('PackingBoxCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<PackingBoxCard {...baseProps} />);
    expect(getByText('Kitchen Props')).toBeInTheDocument();
    expect(getByText('Status: empty')).toBeInTheDocument();
    expect(getByText('Props: 0')).toBeInTheDocument();
    expect(getByText('Fragile')).toBeInTheDocument();
  });

  it('calls onUpdateNotes when notes are changed', () => {
    const { getByPlaceholderText } = render(<PackingBoxCard {...baseProps} />);
    const textarea = getByPlaceholderText('Add notes about this box...');
    fireEvent.change(textarea, { target: { value: 'New notes' } });
    expect(mockOnUpdateNotes).toHaveBeenCalledWith('New notes');
  });

  it('calls onShare when share button is clicked', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });
    const { getByText } = render(<PackingBoxCard {...baseProps} />);
    const shareButton = getByText('Share');
    fireEvent.click(shareButton);
    await expect(navigator.share).toHaveBeenCalled();
    expect(mockOnShare).toHaveBeenCalled();
  });

  it('calls onScan when scan button is clicked', () => {
    const { getByText } = render(<PackingBoxCard {...baseProps} />);
    const scanButton = getByText('Scan');
    fireEvent.click(scanButton);
    expect(mockOnScan).toHaveBeenCalled();
  });
}); 