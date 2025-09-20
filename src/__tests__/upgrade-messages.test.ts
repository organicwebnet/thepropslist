import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock upgrade message component
const UpgradeMessage: React.FC<{ 
  currentPlan: string; 
  currentCount: number; 
  limit: number; 
  onUpgrade: () => void; 
}> = ({ currentPlan, currentCount, limit, onUpgrade }) => {
  if (currentCount >= limit) {
    return (
      <div data-testid="upgrade-message" className="upgrade-banner">
        <h3>You've reached your {currentPlan} plan limit!</h3>
        <p>You've used all {limit} props in your {currentPlan} plan.</p>
        <div className="upgrade-options">
          <p>Upgrade to get more props:</p>
          <ul>
            {currentPlan === 'free' && (
              <li>Starter: 50 props - £9/month</li>
            )}
            {currentPlan === 'starter' && (
              <li>Standard: 100 props - £19/month</li>
            )}
            {currentPlan === 'standard' && (
              <li>Pro: 1,000 props - £39/month</li>
            )}
          </ul>
        </div>
        <button onClick={onUpgrade} data-testid="upgrade-button">
          Upgrade Now
        </button>
      </div>
    );
  }
  return null;
};

// Mock prop creation component with upgrade message
const PropCreationWithUpgrade: React.FC<{ 
  currentPlan: string; 
  currentPropCount: number; 
  onUpgrade: () => void; 
}> = ({ currentPlan, currentPropCount, onUpgrade }) => {
  const limits = {
    free: 10,
    starter: 50,
    standard: 100,
    pro: 1000,
  };

  const limit = limits[currentPlan as keyof typeof limits] || 10;

  return (
    <div>
      <div data-testid="prop-count">
        Props: {currentPropCount}/{limit}
      </div>
      <UpgradeMessage 
        currentPlan={currentPlan}
        currentCount={currentPropCount}
        limit={limit}
        onUpgrade={onUpgrade}
      />
    </div>
  );
};

describe('Upgrade Messages', () => {
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free Plan Upgrade Messages', () => {
    it('should show upgrade message when free plan limit is reached', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={10} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('upgrade-message')).toBeInTheDocument();
      expect(screen.getByText("You've reached your free plan limit!")).toBeInTheDocument();
      expect(screen.getByText("You've used all 10 props in your free plan.")).toBeInTheDocument();
      expect(screen.getByText("Starter: 50 props - £9/month")).toBeInTheDocument();
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument();
    });

    it('should not show upgrade message when under free plan limit', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={5} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.queryByTestId('upgrade-message')).not.toBeInTheDocument();
    });

    it('should show correct prop count for free plan', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={7} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('prop-count')).toHaveTextContent('Props: 7/10');
    });
  });

  describe('Starter Plan Upgrade Messages', () => {
    it('should show upgrade message when starter plan limit is reached', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="starter" 
          currentPropCount={50} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('upgrade-message')).toBeInTheDocument();
      expect(screen.getByText("You've reached your starter plan limit!")).toBeInTheDocument();
      expect(screen.getByText("You've used all 50 props in your starter plan.")).toBeInTheDocument();
      expect(screen.getByText("Standard: 100 props - £19/month")).toBeInTheDocument();
    });

    it('should not show upgrade message when under starter plan limit', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="starter" 
          currentPropCount={25} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.queryByTestId('upgrade-message')).not.toBeInTheDocument();
    });

    it('should show correct prop count for starter plan', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="starter" 
          currentPropCount={30} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('prop-count')).toHaveTextContent('Props: 30/50');
    });
  });

  describe('Standard Plan Upgrade Messages', () => {
    it('should show upgrade message when standard plan limit is reached', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="standard" 
          currentPropCount={100} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('upgrade-message')).toBeInTheDocument();
      expect(screen.getByText("You've reached your standard plan limit!")).toBeInTheDocument();
      expect(screen.getByText("You've used all 100 props in your standard plan.")).toBeInTheDocument();
      expect(screen.getByText("Pro: 1,000 props - £39/month")).toBeInTheDocument();
    });

    it('should not show upgrade message when under standard plan limit', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="standard" 
          currentPropCount={50} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.queryByTestId('upgrade-message')).not.toBeInTheDocument();
    });
  });

  describe('Pro Plan (No Upgrade)', () => {
    it('should not show upgrade message for pro plan even at limit', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="pro" 
          currentPropCount={1000} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.queryByTestId('upgrade-message')).not.toBeInTheDocument();
    });

    it('should show correct prop count for pro plan', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="pro" 
          currentPropCount={500} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('prop-count')).toHaveTextContent('Props: 500/1000');
    });
  });

  describe('Upgrade Button Functionality', () => {
    it('should call onUpgrade when upgrade button is clicked', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={10} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      const upgradeButton = screen.getByTestId('upgrade-button');
      upgradeButton.click();

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('should not show upgrade button when under limit', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={5} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.queryByTestId('upgrade-button')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown plan gracefully', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="unknown" 
          currentPropCount={5} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.getByTestId('prop-count')).toHaveTextContent('Props: 5/10');
    });

    it('should handle negative prop counts', () => {
      render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={-1} 
          onUpgrade={mockOnUpgrade} 
        />
      );

      expect(screen.queryByTestId('upgrade-message')).not.toBeInTheDocument();
      expect(screen.getByTestId('prop-count')).toHaveTextContent('Props: -1/10');
    });
  });

  describe('Message Content Validation', () => {
    it('should show correct upgrade options for each plan', () => {
      // Test free plan upgrade options
      const { rerender } = render(
        <PropCreationWithUpgrade 
          currentPlan="free" 
          currentPropCount={10} 
          onUpgrade={mockOnUpgrade} 
        />
      );
      expect(screen.getByText("Starter: 50 props - £9/month")).toBeInTheDocument();

      // Test starter plan upgrade options
      rerender(
        <PropCreationWithUpgrade 
          currentPlan="starter" 
          currentPropCount={50} 
          onUpgrade={mockOnUpgrade} 
        />
      );
      expect(screen.getByText("Standard: 100 props - £19/month")).toBeInTheDocument();

      // Test standard plan upgrade options
      rerender(
        <PropCreationWithUpgrade 
          currentPlan="standard" 
          currentPropCount={100} 
          onUpgrade={mockOnUpgrade} 
        />
      );
      expect(screen.getByText("Pro: 1,000 props - £39/month")).toBeInTheDocument();
    });
  });
});

