import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AvailabilityCounter from '../components/AvailabilityCounter';
import { useSubscription } from '../hooks/useSubscription';

// Mock the useSubscription hook
jest.mock('../hooks/useSubscription');
const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('AvailabilityCounter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders current count and limit correctly', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'standard',
      canPurchaseAddOns: true,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={5}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('5 of 10 props')).toBeInTheDocument();
  });

  it('shows red styling when at limit', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'standard',
      canPurchaseAddOns: true,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={10}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    const counter = screen.getByText('10 of 10 props');
    expect(counter).toHaveClass('text-red-600');
  });

  it('shows yellow styling when near limit', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'standard',
      canPurchaseAddOns: true,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={8}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    const counter = screen.getByText('8 of 10 props');
    expect(counter).toHaveClass('text-yellow-600');
  });

  it('shows upgrade button for free plan users', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'free',
      canPurchaseAddOns: false,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={5}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('shows buy add-on button for standard/pro users', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'standard',
      canPurchaseAddOns: true,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={8}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Buy Add-On')).toBeInTheDocument();
  });

  it('navigates to profile for free users', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'free',
      canPurchaseAddOns: false,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={5}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    const upgradeButton = screen.getByText('Upgrade Plan');
    fireEvent.click(upgradeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profile?tab=subscription');
  });

  it('navigates to add-ons for standard/pro users', () => {
    mockUseSubscription.mockReturnValue({
      plan: 'standard',
      canPurchaseAddOns: true,
    } as any);

    render(
      <BrowserRouter>
        <AvailabilityCounter
          currentCount={8}
          limit={10}
          type="props"
        />
      </BrowserRouter>
    );

    const addOnButton = screen.getByText('Buy Add-On');
    fireEvent.click(addOnButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profile?tab=addons');
  });
});
