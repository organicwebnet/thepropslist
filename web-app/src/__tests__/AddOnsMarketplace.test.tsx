import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddOnsMarketplace from '../components/AddOnsMarketplace';
import { useSubscription } from '../hooks/useSubscription';
import { useWebAuth } from '../contexts/WebAuthContext';
import { AddOnService } from '../services/AddOnService';

// Mock dependencies
jest.mock('../hooks/useSubscription');
jest.mock('../contexts/WebAuthContext');
jest.mock('../services/AddOnService');

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;
const mockUseWebAuth = useWebAuth as jest.MockedFunction<typeof useWebAuth>;
const mockAddOnService = AddOnService as jest.MockedClass<typeof AddOnService>;

describe('AddOnsMarketplace', () => {
  const mockOnClose = jest.fn();
  const mockUser = { uid: 'test-user-id' };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseWebAuth.mockReturnValue({
      user: mockUser,
    } as any);

    mockUseSubscription.mockReturnValue({
      plan: 'standard',
      canPurchaseAddOns: true,
      userAddOns: [],
      effectiveLimits: {
        shows: 5,
        props: 100,
        packingBoxes: 50,
        archivedShows: 5,
      },
    } as any);

    mockAddOnService.prototype.purchaseAddOn = jest.fn().mockResolvedValue({
      success: true,
      subscriptionItemId: 'sub_item_123',
    });
  });

  it('renders loading state initially', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'unknown',
      canPurchaseAddOns: false,
    } as any);

    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    expect(screen.getByText('Loading add-ons...')).toBeInTheDocument();
  });

  it('shows error for free plan users', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'free',
      canPurchaseAddOns: false,
    } as any);

    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    expect(screen.getByText('Add-ons are only available for Standard and Pro plans. Please upgrade your plan.')).toBeInTheDocument();
  });

  it('renders add-ons for standard/pro users', () => {
    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    expect(screen.getByText('Add-Ons Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Billed Monthly')).toBeInTheDocument();
    expect(screen.getByText('Billed Yearly (Save ~10%)')).toBeInTheDocument();
  });

  it('toggles billing interval', () => {
    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    
    expect(toggle).toBeChecked();
  });

  it('handles purchase success', async () => {
    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    const purchaseButton = screen.getByText('Purchase');
    fireEvent.click(purchaseButton);
    
    await waitFor(() => {
      expect(mockAddOnService.prototype.purchaseAddOn).toHaveBeenCalledWith(
        'test-user-id',
        'shows_5',
        'monthly'
      );
    });
  });

  it('handles purchase error', async () => {
    mockAddOnService.prototype.purchaseAddOn = jest.fn().mockResolvedValue({
      success: false,
      error: 'Payment failed',
    });

    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    const purchaseButton = screen.getByText('Purchase');
    fireEvent.click(purchaseButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    render(<AddOnsMarketplace onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});
