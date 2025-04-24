import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PackingLabels } from '../PackingLabels';
import { PackListService, PackingLabel } from '../../../shared/services/inventory/packListService';

const mockLabels: PackingLabel[] = [
  {
    id: 'label-1',
    containerId: 'container-1',
    packListId: 'pack-1',
    qrCode: 'data:image/png;base64,mockQRCode1',
    containerName: 'Test Container 1',
    containerStatus: 'empty',
    propCount: 0,
    labels: ['Fragile', 'Heavy'],
    url: 'https://example.com/pack-lists/pack-1/containers/container-1',
    generatedAt: new Date('2024-01-01')
  },
  {
    id: 'label-2',
    containerId: 'container-2',
    packListId: 'pack-1',
    qrCode: 'data:image/png;base64,mockQRCode2',
    containerName: 'Test Container 2',
    containerStatus: 'partial',
    propCount: 3,
    labels: ['Electronics'],
    url: 'https://example.com/pack-lists/pack-1/containers/container-2',
    generatedAt: new Date('2024-01-01')
  }
];

const mockPackListService: jest.Mocked<PackListService> = {
  generatePackingLabels: jest.fn().mockResolvedValue(mockLabels),
} as any;

describe('PackingLabels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.print = jest.fn();
  });

  it('renders loading state initially', () => {
    render(
      <PackingLabels
        packListId="pack-1"
        packListService={mockPackListService}
      />
    );

    expect(screen.getByText('Generating labels...')).toBeInTheDocument();
  });

  it('renders generated labels', async () => {
    render(
      <PackingLabels
        packListId="pack-1"
        packListService={mockPackListService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Container 1')).toBeInTheDocument();
      expect(screen.getByText('Test Container 2')).toBeInTheDocument();
    });

    // Check container details
    expect(screen.getByText('Status: empty')).toBeInTheDocument();
    expect(screen.getByText('Status: partial')).toBeInTheDocument();
    expect(screen.getByText('Props: 0')).toBeInTheDocument();
    expect(screen.getByText('Props: 3')).toBeInTheDocument();

    // Check labels
    expect(screen.getByText('Fragile')).toBeInTheDocument();
    expect(screen.getByText('Heavy')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();

    // Check QR codes
    const qrCodes = screen.getAllByRole('img');
    expect(qrCodes).toHaveLength(2);
    expect(qrCodes[0]).toHaveAttribute('src', 'data:image/png;base64,mockQRCode1');
    expect(qrCodes[1]).toHaveAttribute('src', 'data:image/png;base64,mockQRCode2');

    // Check URLs
    expect(screen.getByText('https://example.com/pack-lists/pack-1/containers/container-1')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/pack-lists/pack-1/containers/container-2')).toBeInTheDocument();
  });

  it('handles print button click', async () => {
    render(
      <PackingLabels
        packListId="pack-1"
        packListService={mockPackListService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Print Labels')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Print Labels'));
    expect(window.print).toHaveBeenCalled();
  });

  it('handles error when generating labels', async () => {
    const error = new Error('Failed to generate labels');
    mockPackListService.generatePackingLabels.mockRejectedValueOnce(error);
    const mockOnError = jest.fn();

    render(
      <PackingLabels
        packListId="pack-1"
        packListService={mockPackListService}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Failed to generate labels');
    });
  });

  it('regenerates labels when packListId changes', async () => {
    const { rerender } = render(
      <PackingLabels
        packListId="pack-1"
        packListService={mockPackListService}
      />
    );

    await waitFor(() => {
      expect(mockPackListService.generatePackingLabels).toHaveBeenCalledWith('pack-1');
    });

    rerender(
      <PackingLabels
        packListId="pack-2"
        packListService={mockPackListService}
      />
    );

    await waitFor(() => {
      expect(mockPackListService.generatePackingLabels).toHaveBeenCalledWith('pack-2');
    });
  });
}); 