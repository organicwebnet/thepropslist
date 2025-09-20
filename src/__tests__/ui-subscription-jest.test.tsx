import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock subscription plan component
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

// Mock upgrade modal component
const UpgradeModal: React.FC<{
  isOpen: boolean;
  currentPlan: string;
  onClose: () => void;
  onUpgrade: (plan: string) => void;
}> = ({ isOpen, currentPlan, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  const upgradeOptions = {
    free: { plan: 'starter', name: 'Starter', props: 50, price: '£9/mo' },
    starter: { plan: 'standard', name: 'Standard', props: 100, price: '£19/mo' },
    standard: { plan: 'pro', name: 'Pro', props: 1000, price: '£39/mo' },
  };

  const option = upgradeOptions[currentPlan as keyof typeof upgradeOptions];

  return (
    <div className="modal-overlay" data-testid="upgrade-modal">
      <div className="modal-content">
        <h3>Upgrade Required</h3>
        <p>You've reached your {currentPlan} plan limit. Choose an upgrade option below.</p>
        
        <div className="upgrade-options">
          <button 
            className="upgrade-option"
            onClick={() => onUpgrade(option.plan)}
            data-testid="upgrade-option"
          >
            <strong>{option.name} Plan</strong>
            <p>{option.props} props - {option.price}</p>
          </button>
        </div>

        <div className="modal-actions">
          <button 
            className="cancel-button"
            onClick={onClose}
            data-testid="cancel-upgrade"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

// Mock subscription manager component
const SubscriptionManager: React.FC<{
  currentPlan: 'free' | 'starter' | 'standard' | 'pro';
  currentPropCount: number;
  onUpgrade: (plan: string) => void;
}> = ({ currentPlan, currentPropCount, onUpgrade }) => {
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  const limits = {
    free: 10,
    starter: 50,
    standard: 100,
    pro: 1000,
  };

  const limit = limits[currentPlan];
  const isAtLimit = currentPropCount >= limit;

  return (
    <div data-testid="subscription-manager">
      <SubscriptionPlanCard 
        plan={currentPlan}
        currentCount={currentPropCount}
        limit={limit}
        isAtLimit={isAtLimit}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        currentPlan={currentPlan}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={(plan) => {
          onUpgrade(plan);
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
};

describe('Subscription UI Tests', () => {
  const mockUpgrade = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plan Card Rendering', () => {
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

  describe('Progress Bar States', () => {
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
      const mockUpgrade = jest.fn();
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

  describe('Upgrade Modal', () => {
    it('should show upgrade modal when opened', () => {
      render(
        <UpgradeModal
          isOpen={true}
          currentPlan="free"
          onClose={jest.fn()}
          onUpgrade={mockUpgrade}
        />
      );

      expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText("You've reached your free plan limit. Choose an upgrade option below.")).toBeInTheDocument();
    });

    it('should not show upgrade modal when closed', () => {
      render(
        <UpgradeModal
          isOpen={false}
          currentPlan="free"
          onClose={jest.fn()}
          onUpgrade={mockUpgrade}
        />
      );

      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
    });

    it('should show correct upgrade options for free plan', () => {
      render(
        <UpgradeModal
          isOpen={true}
          currentPlan="free"
          onClose={jest.fn()}
          onUpgrade={mockUpgrade}
        />
      );

      expect(screen.getByText('Starter Plan')).toBeInTheDocument();
      expect(screen.getByText('50 props - £9/mo')).toBeInTheDocument();
    });

    it('should show correct upgrade options for starter plan', () => {
      render(
        <UpgradeModal
          isOpen={true}
          currentPlan="starter"
          onClose={jest.fn()}
          onUpgrade={mockUpgrade}
        />
      );

      expect(screen.getByText('Standard Plan')).toBeInTheDocument();
      expect(screen.getByText('100 props - £19/mo')).toBeInTheDocument();
    });

    it('should show correct upgrade options for standard plan', () => {
      render(
        <UpgradeModal
          isOpen={true}
          currentPlan="standard"
          onClose={jest.fn()}
          onUpgrade={mockUpgrade}
        />
      );

      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      expect(screen.getByText('1,000 props - £39/mo')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open upgrade modal when upgrade button is clicked', () => {
      render(
        <SubscriptionManager
          currentPlan="free"
          currentPropCount={10}
          onUpgrade={mockUpgrade}
        />
      );

      const upgradeButton = screen.getByTestId('upgrade-button');
      fireEvent.click(upgradeButton);

      expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
    });

    it('should close upgrade modal when cancel button is clicked', () => {
      render(
        <SubscriptionManager
          currentPlan="free"
          currentPropCount={10}
          onUpgrade={mockUpgrade}
        />
      );

      // Open modal
      const upgradeButton = screen.getByTestId('upgrade-button');
      fireEvent.click(upgradeButton);
      expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();

      // Close modal
      const cancelButton = screen.getByTestId('cancel-upgrade');
      fireEvent.click(cancelButton);
      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
    });

    it('should call onUpgrade when upgrade option is selected', () => {
      render(
        <SubscriptionManager
          currentPlan="free"
          currentPropCount={10}
          onUpgrade={mockUpgrade}
        />
      );

      // Open modal
      const upgradeButton = screen.getByTestId('upgrade-button');
      fireEvent.click(upgradeButton);

      // Select upgrade option
      const upgradeOption = screen.getByTestId('upgrade-option');
      fireEvent.click(upgradeOption);

      expect(mockUpgrade).toHaveBeenCalledWith('starter');
      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
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
      expect(screen.getByText('0/10 props')).toBeInTheDocument();
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
});

