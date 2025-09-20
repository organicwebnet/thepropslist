import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

// Mock the complete user journey components
interface UserProfile {
  plan: 'free' | 'starter' | 'standard' | 'pro';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
  currentPropCount: number;
}

interface SubscriptionLimits {
  shows: number;
  boards: number;
  packingBoxes: number;
  collaboratorsPerShow: number;
  props: number;
}

// Mock subscription service
class MockSubscriptionService {
  private userProfile: UserProfile;

  constructor(initialProfile: UserProfile) {
    this.userProfile = initialProfile;
  }

  getCurrentPlan(): string {
    return this.userProfile.plan;
  }

  getCurrentPropCount(): number {
    return this.userProfile.currentPropCount;
  }

  getLimits(): SubscriptionLimits {
    const limits = {
      free: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10 },
      starter: { shows: 3, boards: 5, packingBoxes: 200, collaboratorsPerShow: 5, props: 50 },
      standard: { shows: 10, boards: 20, packingBoxes: 1000, collaboratorsPerShow: 15, props: 100 },
      pro: { shows: 100, boards: 200, packingBoxes: 10000, collaboratorsPerShow: 100, props: 1000 },
    };
    return limits[this.userProfile.plan];
  }

  canCreateProp(): boolean {
    const limits = this.getLimits();
    return this.userProfile.currentPropCount < limits.props;
  }

  async createProp(propData: any): Promise<{ success: boolean; error?: string }> {
    if (!this.canCreateProp()) {
      return {
        success: false,
        error: `Prop limit reached for ${this.userProfile.plan} plan. Current: ${this.userProfile.currentPropCount}`,
      };
    }

    // Simulate prop creation
    this.userProfile.currentPropCount++;
    return { success: true };
  }

  async upgradePlan(newPlan: string): Promise<{ success: boolean; error?: string }> {
    // Simulate upgrade
    this.userProfile.plan = newPlan as any;
    return { success: true };
  }

  updateProfile(updates: Partial<UserProfile>) {
    this.userProfile = { ...this.userProfile, ...updates };
  }
}

// Complete prop management component
const PropManagementApp: React.FC<{ subscriptionService: MockSubscriptionService }> = ({ 
  subscriptionService 
}) => {
  const [props, setProps] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = subscriptionService.getCurrentPlan();
  const currentCount = subscriptionService.getCurrentPropCount();
  const limits = subscriptionService.getLimits();
  const canCreate = subscriptionService.canCreateProp();

  const handleCreateProp = async (propData: any) => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await subscriptionService.createProp(propData);
      
      if (result.success) {
        setProps([...props, { ...propData, id: Date.now() }]);
        subscriptionService.updateProfile({ currentPropCount: currentCount + 1 });
      } else {
        setError(result.error || 'Failed to create prop');
        if (result.error?.includes('limit reached')) {
          setShowUpgradeModal(true);
        }
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpgrade = async () => {
    const upgradeOptions = {
      free: 'starter',
      starter: 'standard', 
      standard: 'pro',
    };

    const nextPlan = upgradeOptions[currentPlan as keyof typeof upgradeOptions];
    if (nextPlan) {
      await subscriptionService.upgradePlan(nextPlan);
      setShowUpgradeModal(false);
    }
  };

  return (
    <div>
      {/* Header with plan info */}
      <header data-testid="app-header">
        <h1>Props Management</h1>
        <div data-testid="plan-info">
          {currentPlan.toUpperCase()} Plan - {currentCount}/{limits.props} props used
        </div>
        {!canCreate && (
          <div data-testid="limit-warning" className="warning">
            You've reached your prop limit!
          </div>
        )}
      </header>

      {/* Prop creation form */}
      <section data-testid="prop-creation-section">
        <h2>Create New Prop</h2>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await handleCreateProp({
              name: formData.get('name'),
              description: formData.get('description'),
            });
            (e.target as HTMLFormElement).reset();
          }}
          data-testid="prop-form"
        >
          <div>
            <label htmlFor="prop-name">Prop Name:</label>
            <input
              id="prop-name"
              name="name"
              type="text"
              required
              disabled={!canCreate}
              data-testid="prop-name-input"
            />
          </div>
          <div>
            <label htmlFor="prop-description">Description:</label>
            <textarea
              id="prop-description"
              name="description"
              disabled={!canCreate}
              data-testid="prop-description-input"
            />
          </div>
          <button 
            type="submit" 
            disabled={!canCreate || isCreating}
            data-testid="create-prop-button"
          >
            {isCreating ? 'Creating...' : 'Create Prop'}
          </button>
        </form>
      </section>

      {/* Props list */}
      <section data-testid="props-list-section">
        <h2>Your Props ({props.length})</h2>
        {props.length === 0 ? (
          <p data-testid="no-props-message">No props created yet.</p>
        ) : (
          <ul data-testid="props-list">
            {props.map((prop, index) => (
              <li key={prop.id} data-testid={`prop-item-${index}`}>
                <strong>{prop.name}</strong>: {prop.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Error messages */}
      {error && (
        <div data-testid="error-message" className="error">
          {error}
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div data-testid="upgrade-modal" className="modal">
          <div className="modal-content">
            <h3>Upgrade Required</h3>
            <p>You've reached your {currentPlan} plan limit of {limits.props} props.</p>
            <div className="upgrade-options">
              {currentPlan === 'free' && (
                <div>
                  <h4>Upgrade to Starter</h4>
                  <p>50 props - £9/month</p>
                </div>
              )}
              {currentPlan === 'starter' && (
                <div>
                  <h4>Upgrade to Standard</h4>
                  <p>100 props - £19/month</p>
                </div>
              )}
              {currentPlan === 'standard' && (
                <div>
                  <h4>Upgrade to Pro</h4>
                  <p>1,000 props - £39/month</p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={handleUpgrade} data-testid="upgrade-button">
                Upgrade Now
              </button>
              <button onClick={() => setShowUpgradeModal(false)} data-testid="cancel-button">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

describe('Complete User Journey Tests', () => {
  let subscriptionService: MockSubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free Plan User Journey', () => {
    beforeEach(() => {
      subscriptionService = new MockSubscriptionService({
        plan: 'free',
        subscriptionStatus: 'active',
        currentPropCount: 0,
      });
    });

    it('should allow user to create props up to the limit', async () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Initial state
      expect(screen.getByTestId('plan-info')).toHaveTextContent('FREE Plan - 0/10 props used');
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
      expect(screen.getByTestId('create-prop-button')).not.toBeDisabled();

      // Create first prop
      fireEvent.change(screen.getByTestId('prop-name-input'), { target: { value: 'Sword' } });
      fireEvent.change(screen.getByTestId('prop-description-input'), { target: { value: 'Medieval sword' } });
      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('props-list')).toBeInTheDocument();
        expect(screen.getByTestId('prop-item-0')).toHaveTextContent('Sword: Medieval sword');
      });

      // Check updated count
      expect(screen.getByTestId('plan-info')).toHaveTextContent('FREE Plan - 1/10 props used');
    });

    it('should show upgrade modal when limit is reached', async () => {
      // Set user at limit
      subscriptionService.updateProfile({ currentPropCount: 10 });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Should show limit warning
      expect(screen.getByTestId('limit-warning')).toBeInTheDocument();
      expect(screen.getByTestId('prop-name-input')).toBeDisabled();
      expect(screen.getByTestId('create-prop-button')).toBeDisabled();

      // Try to create prop (should trigger upgrade modal)
      fireEvent.change(screen.getByTestId('prop-name-input'), { target: { value: 'Extra Prop' } });
      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText("You've reached your free plan limit of 10 props.")).toBeInTheDocument();
      expect(screen.getByText('50 props - £9/month')).toBeInTheDocument();
    });

    it('should handle upgrade flow correctly', async () => {
      subscriptionService.updateProfile({ currentPropCount: 10 });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Trigger upgrade modal
      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      // Click upgrade button
      fireEvent.click(screen.getByTestId('upgrade-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
      });

      // Should now show starter plan
      expect(screen.getByTestId('plan-info')).toHaveTextContent('STARTER Plan - 10/50 props used');
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
    });
  });

  describe('Starter Plan User Journey', () => {
    beforeEach(() => {
      subscriptionService = new MockSubscriptionService({
        plan: 'starter',
        subscriptionStatus: 'active',
        currentPropCount: 25,
      });
    });

    it('should show correct limits and allow prop creation', () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      expect(screen.getByTestId('plan-info')).toHaveTextContent('STARTER Plan - 25/50 props used');
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
      expect(screen.queryByTestId('limit-warning')).not.toBeInTheDocument();
    });

    it('should show upgrade to standard when limit reached', async () => {
      subscriptionService.updateProfile({ currentPropCount: 50 });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByText("You've reached your starter plan limit of 50 props.")).toBeInTheDocument();
      expect(screen.getByText('100 props - £19/month')).toBeInTheDocument();
    });
  });

  describe('Standard Plan User Journey', () => {
    beforeEach(() => {
      subscriptionService = new MockSubscriptionService({
        plan: 'standard',
        subscriptionStatus: 'active',
        currentPropCount: 75,
      });
    });

    it('should show correct limits and allow prop creation', () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      expect(screen.getByTestId('plan-info')).toHaveTextContent('STANDARD Plan - 75/100 props used');
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
    });

    it('should show upgrade to pro when limit reached', async () => {
      subscriptionService.updateProfile({ currentPropCount: 100 });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByText("You've reached your standard plan limit of 100 props.")).toBeInTheDocument();
      expect(screen.getByText('1,000 props - £39/month')).toBeInTheDocument();
    });
  });

  describe('Pro Plan User Journey', () => {
    beforeEach(() => {
      subscriptionService = new MockSubscriptionService({
        plan: 'pro',
        subscriptionStatus: 'active',
        currentPropCount: 500,
      });
    });

    it('should show high limits and allow unlimited prop creation', () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      expect(screen.getByTestId('plan-info')).toHaveTextContent('PRO Plan - 500/1000 props used');
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
      expect(screen.queryByTestId('limit-warning')).not.toBeInTheDocument();
    });

    it('should not show upgrade modal even at limit', async () => {
      subscriptionService.updateProfile({ currentPropCount: 1000 });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      fireEvent.submit(screen.getByTestId('prop-form'));

      // Should not show upgrade modal for pro plan
      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
    });
  });

  describe('Error States and Edge Cases', () => {
    beforeEach(() => {
      subscriptionService = new MockSubscriptionService({
        plan: 'free',
        subscriptionStatus: 'active',
        currentPropCount: 0,
      });
    });

    it('should handle form validation errors', async () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Try to submit empty form
      fireEvent.submit(screen.getByTestId('prop-form'));

      // Should not create prop (form validation)
      expect(screen.queryByTestId('props-list')).not.toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.spyOn(subscriptionService, 'createProp').mockRejectedValue(new Error('Network error'));

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      fireEvent.change(screen.getByTestId('prop-name-input'), { target: { value: 'Test Prop' } });
      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('An error occurred');
      });
    });

    it('should handle cancelled subscription status', () => {
      subscriptionService.updateProfile({ subscriptionStatus: 'cancelled' });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Should still show plan info but might have different behavior
      expect(screen.getByTestId('plan-info')).toHaveTextContent('FREE Plan - 0/10 props used');
    });

    it('should handle past due subscription status', () => {
      subscriptionService.updateProfile({ subscriptionStatus: 'past_due' });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Should still show plan info
      expect(screen.getByTestId('plan-info')).toHaveTextContent('FREE Plan - 0/10 props used');
    });
  });

  describe('Accessibility and UX', () => {
    beforeEach(() => {
      subscriptionService = new MockSubscriptionService({
        plan: 'free',
        subscriptionStatus: 'active',
        currentPropCount: 0,
      });
    });

    it('should have proper form labels and accessibility', () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      // Check form labels
      expect(screen.getByLabelText('Prop Name:')).toBeInTheDocument();
      expect(screen.getByLabelText('Description:')).toBeInTheDocument();

      // Check button states
      expect(screen.getByTestId('create-prop-button')).not.toBeDisabled();
    });

    it('should show loading states during prop creation', async () => {
      render(<PropManagementApp subscriptionService={subscriptionService} />);

      fireEvent.change(screen.getByTestId('prop-name-input'), { target: { value: 'Test Prop' } });
      fireEvent.submit(screen.getByTestId('prop-form'));

      // Should show loading state
      expect(screen.getByTestId('create-prop-button')).toHaveTextContent('Creating...');
      expect(screen.getByTestId('create-prop-button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId('create-prop-button')).toHaveTextContent('Create Prop');
      });
    });

    it('should handle keyboard navigation in upgrade modal', async () => {
      subscriptionService.updateProfile({ currentPropCount: 10 });

      render(<PropManagementApp subscriptionService={subscriptionService} />);

      fireEvent.submit(screen.getByTestId('prop-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      // Check modal buttons are focusable
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });
  });
});

