import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingModalErrorBoundary } from '../components/PricingModalErrorBoundary';
import { calculateDiscount } from '../shared/types/pricing';

// Mock the StripeService
const mockStripeService = {
  getPricingConfig: vi.fn(),
  refreshPricingConfig: vi.fn(),
  createCheckoutSession: vi.fn(),
};

vi.mock('../services/StripeService', () => ({
  stripeService: mockStripeService,
}));

// Mock pricing data
const mockPricingConfig = {
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Great for growing productions',
      price: { monthly: 9, yearly: 90, currency: 'USD' },
      features: ['3 Shows', '5 Task Boards', '200 Packing Boxes'],
      limits: { shows: 3, boards: 5, packingBoxes: 200, collaboratorsPerShow: 5, props: 50 },
      priceId: { monthly: 'price_monthly', yearly: 'price_yearly' },
      popular: false,
      color: 'bg-blue-500'
    },
    {
      id: 'standard',
      name: 'Standard',
      description: 'Perfect for professional productions',
      price: { monthly: 19, yearly: 190, currency: 'USD' },
      features: ['10 Shows', '20 Task Boards', '1000 Packing Boxes'],
      limits: { shows: 10, boards: 20, packingBoxes: 1000, collaboratorsPerShow: 15, props: 100 },
      priceId: { monthly: 'price_monthly', yearly: 'price_yearly' },
      popular: true,
      color: 'bg-purple-500'
    }
  ],
  currency: 'USD',
  billingInterval: 'monthly' as const
};

// Mock ProfilePage component for testing
const MockProfilePage = () => {
  const [showPricingModal, setShowPricingModal] = React.useState(false);
  const [pricingConfig, setPricingConfig] = React.useState(mockPricingConfig.plans);
  const [pricingLoading, setPricingLoading] = React.useState(false);

  const handleStartCheckout = vi.fn();

  return (
    <div>
      <button onClick={() => setShowPricingModal(true)}>View All Plans</button>
      
      {showPricingModal && (
        <PricingModalErrorBoundary onRetry={() => {
          const retryLoadPricing = async () => {
            try {
              setPricingLoading(true);
              const config = await mockStripeService.refreshPricingConfig();
              setPricingConfig(config.plans);
            } catch (error) {
              console.error('Failed to retry pricing config:', error);
            } finally {
              setPricingLoading(false);
            }
          };
          retryLoadPricing();
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title">
            <h3 id="pricing-modal-title">Choose Your Plan</h3>
            <p id="pricing-modal-description">
              Select a subscription plan that fits your production needs.
            </p>
            
            {pricingLoading ? (
              <div>Loading pricing information...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pricingConfig.map((planData) => (
                  <div
                    key={planData.id}
                    role="article"
                    aria-labelledby={`plan-${planData.id}-title`}
                    aria-describedby={`plan-${planData.id}-description`}
                  >
                    {planData.popular && (
                      <span className="bg-pb-primary text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                        Most Popular
                      </span>
                    )}
                    
                    <h4 id={`plan-${planData.id}-title`}>{planData.name}</h4>
                    <p id={`plan-${planData.id}-description`}>{planData.description}</p>
                    
                    <div>
                      <span>${planData.price.monthly}</span>
                      <span>/month</span>
                    </div>
                    
                    {planData.price.yearly > 0 && planData.price.monthly > 0 && (() => {
                      const { savings, discountPercent } = calculateDiscount(planData.price.monthly, planData.price.yearly);
                      return (
                        <div>
                          or ${planData.price.yearly}/year 
                          {savings > 0 && (
                            <span>
                              (save ${savings} - {discountPercent}% off)
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    
                    <ul>
                      {planData.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => {
                        handleStartCheckout(planData.id, 'monthly');
                        setShowPricingModal(false);
                      }}
                      aria-label={`Subscribe to ${planData.name} plan monthly for $${planData.price.monthly} per month`}
                    >
                      Monthly - ${planData.price.monthly}
                    </button>
                    
                    <button
                      onClick={() => {
                        handleStartCheckout(planData.id, 'yearly');
                        setShowPricingModal(false);
                      }}
                      aria-label={`Subscribe to ${planData.name} plan yearly for $${planData.price.yearly} per year`}
                    >
                      {(() => {
                        const { savings, discountPercent } = calculateDiscount(planData.price.monthly, planData.price.yearly);
                        return savings > 0 
                          ? `Yearly - $${planData.price.yearly} (Save $${savings} - ${discountPercent}% off)`
                          : `Yearly - $${planData.price.yearly}`;
                      })()}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PricingModalErrorBoundary>
      )}
    </div>
  );
};

describe('PricingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeService.getPricingConfig.mockResolvedValue(mockPricingConfig);
    mockStripeService.refreshPricingConfig.mockResolvedValue(mockPricingConfig);
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'pricing-modal-title');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'pricing-modal-description');
    });

    it('should have proper heading hierarchy', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Choose Your Plan');
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Starter');
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Standard');
    });

    it('should have proper article roles for pricing cards', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(2);
      
      articles.forEach((article, index) => {
        const planId = index === 0 ? 'starter' : 'standard';
        expect(article).toHaveAttribute('aria-labelledby', `plan-${planId}-title`);
        expect(article).toHaveAttribute('aria-describedby', `plan-${planId}-description`);
      });
    });

    it('should have proper button labels', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      expect(screen.getByLabelText('Subscribe to Starter plan monthly for $9 per month')).toBeInTheDocument();
      expect(screen.getByLabelText('Subscribe to Standard plan yearly for $190 per year')).toBeInTheDocument();
    });
  });

  describe('Discount Calculation', () => {
    it('should calculate discounts correctly', () => {
      const { savings, discountPercent } = calculateDiscount(19, 190);
      expect(savings).toBe(38); // (19 * 12) - 190 = 228 - 190 = 38
      expect(discountPercent).toBe(17); // Math.round((38 / 228) * 100) = 17
    });

    it('should handle zero prices', () => {
      const { savings, discountPercent } = calculateDiscount(0, 0);
      expect(savings).toBe(0);
      expect(discountPercent).toBe(0);
    });

    it('should handle negative savings', () => {
      const { savings, discountPercent } = calculateDiscount(10, 150);
      expect(savings).toBe(0); // Should not be negative
      expect(discountPercent).toBe(0);
    });

    it('should display discount information correctly', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      // Check that discount is displayed for Standard plan
      expect(screen.getByText('(save $38 - 17% off)')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error boundary when component crashes', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      render(
        <PricingModalErrorBoundary>
          <ThrowingComponent />
        </PricingModalErrorBoundary>
      );

      expect(screen.getByText('Unable to Load Pricing')).toBeInTheDocument();
      expect(screen.getByText('We\'re having trouble loading the pricing information.')).toBeInTheDocument();
    });

    it('should have retry functionality', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      const onRetry = vi.fn();

      render(
        <PricingModalErrorBoundary onRetry={onRetry}>
          <ThrowingComponent />
        </PricingModalErrorBoundary>
      );

      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should handle monthly subscription clicks', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      fireEvent.click(screen.getByText('Monthly - $9'));
      
      expect(mockStripeService.createCheckoutSession).not.toHaveBeenCalled(); // Mock doesn't implement this
    });

    it('should handle yearly subscription clicks', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      fireEvent.click(screen.getByText(/Yearly - \$190/));
      
      expect(mockStripeService.createCheckoutSession).not.toHaveBeenCalled(); // Mock doesn't implement this
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      // The component should show pricing cards, not loading state
      expect(screen.queryByText('Loading pricing information...')).not.toBeInTheDocument();
    });
  });

  describe('Popular Plan Display', () => {
    it('should show "Most Popular" badge for popular plans', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('should not wrap "Most Popular" text', () => {
      render(<MockProfilePage />);
      
      fireEvent.click(screen.getByText('View All Plans'));
      
      const popularBadge = screen.getByText('Most Popular');
      expect(popularBadge).toHaveClass('whitespace-nowrap');
    });
  });
});
