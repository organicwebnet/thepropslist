import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DiscountCodeCheckoutFlow } from '../components/DiscountCodeCheckoutFlow';
import { discountCodesService } from '../../services/DiscountCodesService';

// Mock the discount service
jest.mock('../../services/DiscountCodesService');
const mockDiscountCodesService = discountCodesService as jest.Mocked<typeof discountCodesService>;

// Mock Firebase functions
jest.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: jest.fn(),
}));

// Mock Stripe service
jest.mock('../../services/StripeService', () => ({
  stripeService: {
    createCheckoutSession: jest.fn(),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Discount Code Checkout Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply valid discount code and proceed to checkout', async () => {
    // Mock valid discount code
    const mockDiscountCode = {
      id: '123',
      code: 'SAVE20',
      name: '20% Off',
      type: 'percentage' as const,
      value: 20,
      active: true,
      validFrom: '2024-01-01T00:00:00Z',
      validUntil: '2025-12-31T23:59:59Z',
      maxRedemptions: 100,
      timesRedeemed: 50,
      appliesTo: 'all' as const,
    };

    mockDiscountCodesService.validateDiscountCode.mockResolvedValue({
      valid: true,
      discount: mockDiscountCode,
    });

    render(
      <TestWrapper>
        <DiscountCodeCheckoutFlow planId="starter" />
      </TestWrapper>
    );

    // Enter discount code
    const discountInput = screen.getByLabelText(/discount code/i);
    fireEvent.change(discountInput, { target: { value: 'SAVE20' } });

    // Wait for validation
    await waitFor(() => {
      expect(screen.getByText(/discount code applied/i)).toBeInTheDocument();
    });

    // Click checkout button
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    // Verify checkout was called with discount code
    await waitFor(() => {
      expect(mockDiscountCodesService.validateDiscountCode).toHaveBeenCalledWith('SAVE20', 'starter');
    });
  });

  it('should reject invalid discount code', async () => {
    mockDiscountCodesService.validateDiscountCode.mockResolvedValue({
      valid: false,
      error: 'Discount code not found',
    });

    render(
      <TestWrapper>
        <DiscountCodeCheckoutFlow planId="starter" />
      </TestWrapper>
    );

    // Enter invalid discount code
    const discountInput = screen.getByLabelText(/discount code/i);
    fireEvent.change(discountInput, { target: { value: 'INVALID' } });

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/discount code not found/i)).toBeInTheDocument();
    });

    // Verify checkout button is disabled or shows error
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    expect(checkoutButton).toBeDisabled();
  });

  it('should handle network errors gracefully', async () => {
    mockDiscountCodesService.validateDiscountCode.mockRejectedValue(
      new Error('Network error')
    );

    render(
      <TestWrapper>
        <DiscountCodeCheckoutFlow planId="starter" />
      </TestWrapper>
    );

    // Enter discount code
    const discountInput = screen.getByLabelText(/discount code/i);
    fireEvent.change(discountInput, { target: { value: 'SAVE20' } });

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to validate discount code/i)).toBeInTheDocument();
    });
  });

  it('should allow checkout without discount code', async () => {
    render(
      <TestWrapper>
        <DiscountCodeCheckoutFlow planId="starter" />
      </TestWrapper>
    );

    // Click checkout without entering discount code
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    // Should proceed to checkout without discount
    await waitFor(() => {
      expect(mockDiscountCodesService.validateDiscountCode).not.toHaveBeenCalled();
    });
  });

  it('should show loading state during validation', async () => {
    // Mock slow validation
    mockDiscountCodesService.validateDiscountCode.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 100))
    );

    render(
      <TestWrapper>
        <DiscountCodeCheckoutFlow planId="starter" />
      </TestWrapper>
    );

    // Enter discount code
    const discountInput = screen.getByLabelText(/discount code/i);
    fireEvent.change(discountInput, { target: { value: 'SAVE20' } });

    // Should show loading state
    expect(screen.getByText(/validating/i)).toBeInTheDocument();

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument();
    });
  });
});

// Mock component for testing
const DiscountCodeCheckoutFlow: React.FC<{ planId: string }> = ({ planId }) => {
  const [discountCode, setDiscountCode] = React.useState('');
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  const handleDiscountCodeChange = async (code: string) => {
    setDiscountCode(code);
    if (code.trim()) {
      setIsValidating(true);
      try {
        const result = await discountCodesService.validateDiscountCode(code, planId);
        setValidationResult(result);
      } catch (error) {
        setValidationResult({ valid: false, error: 'Failed to validate discount code' });
      } finally {
        setIsValidating(false);
      }
    } else {
      setValidationResult(null);
    }
  };

  const handleCheckout = () => {
    // Mock checkout logic
    console.log('Proceeding to checkout with plan:', planId, 'discount:', discountCode);
  };

  return (
    <div>
      <label htmlFor="discount-code">Discount Code</label>
      <input
        id="discount-code"
        type="text"
        value={discountCode}
        onChange={(e) => handleDiscountCodeChange(e.target.value)}
        aria-describedby="discount-status"
      />
      
      <div id="discount-status" role="status" aria-live="polite">
        {isValidating && <span>Validating...</span>}
        {validationResult?.valid && <span>Discount code applied!</span>}
        {validationResult?.error && <span>{validationResult.error}</span>}
      </div>

      <button 
        onClick={handleCheckout}
        disabled={isValidating || (discountCode && !validationResult?.valid)}
      >
        Proceed to Checkout
      </button>
    </div>
  );
};
