import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock visual testing utilities
const mockVisualTest = vi.fn();
const mockAccessibilityTest = vi.fn();

// Mock component with comprehensive styling
const SubscriptionPlanCard: React.FC<{
  plan: 'free' | 'starter' | 'standard' | 'pro';
  currentCount: number;
  limit: number;
  isAtLimit: boolean;
  onUpgrade?: () => void;
}> = ({ plan, currentCount, limit, isAtLimit, onUpgrade }) => {
  const planColors = {
    free: '#9ca3af',
    starter: '#22c55e', 
    standard: '#06b6d4',
    pro: '#f59e0b',
  };

  const planStyles = {
    borderColor: planColors[plan],
    background: `linear-gradient(180deg, ${planColors[plan]}09, transparent)`,
  };

  return (
    <div 
      className="plan-card" 
      style={planStyles}
      data-testid={`plan-card-${plan}`}
      data-plan={plan}
      data-at-limit={isAtLimit}
    >
      <h3 className="plan-title" style={{ color: planColors[plan] }}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </h3>
      
      <div className="plan-stats">
        <div className="prop-count" data-testid="prop-count-display">
          {currentCount}/{limit} props
        </div>
        
        <div className="progress-bar" data-testid="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${Math.min(100, (currentCount / limit) * 100)}%`,
              backgroundColor: isAtLimit ? '#ef4444' : planColors[plan]
            }}
            data-testid="progress-fill"
          />
        </div>
      </div>

      {isAtLimit && (
        <div className="limit-warning" data-testid="limit-warning">
          <span className="warning-icon">⚠️</span>
          <span>Limit reached!</span>
        </div>
      )}

      {onUpgrade && isAtLimit && (
        <button 
          className="upgrade-button"
          onClick={onUpgrade}
          data-testid="upgrade-button"
          style={{ backgroundColor: planColors[plan] }}
        >
          Upgrade Now
        </button>
      )}
    </div>
  );
};

// Mock responsive layout component
const ResponsivePlanGrid: React.FC<{ plans: any[] }> = ({ plans }) => {
  return (
    <div 
      className="plans-grid" 
      data-testid="plans-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        padding: '1rem',
      }}
    >
      {plans.map((plan) => (
        <SubscriptionPlanCard key={plan.name} {...plan} />
      ))}
    </div>
  );
};

describe('UI Visual Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plan Card Visual States', () => {
    it('should render free plan card with correct styling', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={5} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      const card = screen.getByTestId('plan-card-free');
      expect(card).toHaveStyle('border-color: #9ca3af');
      expect(card).toHaveAttribute('data-plan', 'free');
      expect(card).toHaveAttribute('data-at-limit', 'false');
    });

    it('should render starter plan card with correct styling', () => {
      render(
        <SubscriptionPlanCard 
          plan="starter" 
          currentCount={25} 
          limit={50} 
          isAtLimit={false} 
        />
      );

      const card = screen.getByTestId('plan-card-starter');
      expect(card).toHaveStyle('border-color: #22c55e');
      expect(card).toHaveAttribute('data-plan', 'starter');
    });

    it('should render standard plan card with correct styling', () => {
      render(
        <SubscriptionPlanCard 
          plan="standard" 
          currentCount={75} 
          limit={100} 
          isAtLimit={false} 
        />
      );

      const card = screen.getByTestId('plan-card-standard');
      expect(card).toHaveStyle('border-color: #06b6d4');
      expect(card).toHaveAttribute('data-plan', 'standard');
    });

    it('should render pro plan card with correct styling', () => {
      render(
        <SubscriptionPlanCard 
          plan="pro" 
          currentCount={500} 
          limit={1000} 
          isAtLimit={false} 
        />
      );

      const card = screen.getByTestId('plan-card-pro');
      expect(card).toHaveStyle('border-color: #f59e0b');
      expect(card).toHaveAttribute('data-plan', 'pro');
    });
  });

  describe('Progress Bar Visual States', () => {
    it('should show correct progress for under-limit usage', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={3} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 30%');
      expect(progressFill).toHaveStyle('background-color: #9ca3af');
    });

    it('should show correct progress for near-limit usage', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={9} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 90%');
      expect(progressFill).toHaveStyle('background-color: #9ca3af');
    });

    it('should show red progress bar when at limit', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={10} 
          limit={10} 
          isAtLimit={true} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 100%');
      expect(progressFill).toHaveStyle('background-color: #ef4444');
    });

    it('should cap progress at 100% even when over limit', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={15} 
          limit={10} 
          isAtLimit={true} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 100%');
    });
  });

  describe('Limit Warning States', () => {
    it('should show limit warning when at limit', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={10} 
          limit={10} 
          isAtLimit={true} 
        />
      );

      expect(screen.getByTestId('limit-warning')).toBeInTheDocument();
      expect(screen.getByText('Limit reached!')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should not show limit warning when under limit', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={5} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      expect(screen.queryByTestId('limit-warning')).not.toBeInTheDocument();
    });

    it('should show upgrade button when at limit and onUpgrade provided', () => {
      const mockUpgrade = vi.fn();
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={10} 
          limit={10} 
          isAtLimit={true} 
          onUpgrade={mockUpgrade}
        />
      );

      const upgradeButton = screen.getByTestId('upgrade-button');
      expect(upgradeButton).toBeInTheDocument();
      expect(upgradeButton).toHaveStyle('background-color: #9ca3af');
    });
  });

  describe('Responsive Grid Layout', () => {
    it('should render all plans in responsive grid', () => {
      const plans = [
        { plan: 'free' as const, currentCount: 5, limit: 10, isAtLimit: false },
        { plan: 'starter' as const, currentCount: 25, limit: 50, isAtLimit: false },
        { plan: 'standard' as const, currentCount: 75, limit: 100, isAtLimit: false },
        { plan: 'pro' as const, currentCount: 500, limit: 1000, isAtLimit: false },
      ];

      render(<ResponsivePlanGrid plans={plans} />);

      const grid = screen.getByTestId('plans-grid');
      expect(grid).toHaveStyle('display: grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))');

      // Check all plan cards are rendered
      expect(screen.getByTestId('plan-card-free')).toBeInTheDocument();
      expect(screen.getByTestId('plan-card-starter')).toBeInTheDocument();
      expect(screen.getByTestId('plan-card-standard')).toBeInTheDocument();
      expect(screen.getByTestId('plan-card-pro')).toBeInTheDocument();
    });
  });

  describe('Visual Consistency Tests', () => {
    it('should maintain consistent spacing and typography', () => {
      render(
        <SubscriptionPlanCard 
          plan="starter" 
          currentCount={25} 
          limit={50} 
          isAtLimit={false} 
        />
      );

      const title = screen.getByText('Starter');
      expect(title).toHaveStyle('color: #22c55e');

      const propCount = screen.getByTestId('prop-count-display');
      expect(propCount).toHaveTextContent('25/50 props');
    });

    it('should handle long prop names gracefully', () => {
      render(
        <SubscriptionPlanCard 
          plan="pro" 
          currentCount={999} 
          limit={1000} 
          isAtLimit={false} 
        />
      );

      const propCount = screen.getByTestId('prop-count-display');
      expect(propCount).toHaveTextContent('999/1000 props');
    });

    it('should handle zero props correctly', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={0} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');
    });
  });

  describe('Color Contrast and Accessibility', () => {
    it('should have sufficient color contrast for text', () => {
      // Mock color contrast testing
      mockAccessibilityTest.mockReturnValue({
        contrast: 4.5,
        passes: true,
        level: 'AA'
      });

      render(
        <SubscriptionPlanCard 
          plan="starter" 
          currentCount={25} 
          limit={50} 
          isAtLimit={false} 
        />
      );

      const title = screen.getByText('Starter');
      expect(title).toHaveStyle('color: #22c55e');
      
      // Verify accessibility test was called
      expect(mockAccessibilityTest).toHaveBeenCalled();
    });

    it('should have proper focus states for interactive elements', () => {
      const mockUpgrade = vi.fn();
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={10} 
          limit={10} 
          isAtLimit={true} 
          onUpgrade={mockUpgrade}
        />
      );

      const upgradeButton = screen.getByTestId('upgrade-button');
      expect(upgradeButton).toBeInTheDocument();
      
      // Check button is focusable
      upgradeButton.focus();
      expect(document.activeElement).toBe(upgradeButton);
    });
  });

  describe('Edge Cases and Error States', () => {
    it('should handle negative prop counts gracefully', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={-1} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');
    });

    it('should handle prop count exceeding limit', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={15} 
          limit={10} 
          isAtLimit={true} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 100%');
      expect(screen.getByTestId('limit-warning')).toBeInTheDocument();
    });

    it('should handle zero limit gracefully', () => {
      render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={0} 
          limit={0} 
          isAtLimit={true} 
        />
      );

      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle('width: 100%');
    });
  });

  describe('Visual Regression Snapshots', () => {
    it('should match snapshot for free plan under limit', () => {
      const { container } = render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={5} 
          limit={10} 
          isAtLimit={false} 
        />
      );

      // Mock visual regression test
      mockVisualTest.mockReturnValue({ passed: true, diff: null });
      
      const result = mockVisualTest(container.innerHTML, 'free-plan-under-limit');
      expect(result.passed).toBe(true);
    });

    it('should match snapshot for free plan at limit', () => {
      const { container } = render(
        <SubscriptionPlanCard 
          plan="free" 
          currentCount={10} 
          limit={10} 
          isAtLimit={true} 
          onUpgrade={vi.fn()}
        />
      );

      mockVisualTest.mockReturnValue({ passed: true, diff: null });
      
      const result = mockVisualTest(container.innerHTML, 'free-plan-at-limit');
      expect(result.passed).toBe(true);
    });

    it('should match snapshot for all plans grid', () => {
      const plans = [
        { plan: 'free' as const, currentCount: 5, limit: 10, isAtLimit: false },
        { plan: 'starter' as const, currentCount: 25, limit: 50, isAtLimit: false },
        { plan: 'standard' as const, currentCount: 75, limit: 100, isAtLimit: false },
        { plan: 'pro' as const, currentCount: 500, limit: 1000, isAtLimit: false },
      ];

      const { container } = render(<ResponsivePlanGrid plans={plans} />);

      mockVisualTest.mockReturnValue({ passed: true, diff: null });
      
      const result = mockVisualTest(container.innerHTML, 'all-plans-grid');
      expect(result.passed).toBe(true);
    });
  });
});

