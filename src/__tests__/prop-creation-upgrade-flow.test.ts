import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

// Mock prop creation form component
const PropCreationForm: React.FC<{ 
  currentPlan: string; 
  currentPropCount: number; 
  onPropCreate: (propData: any) => Promise<{ success: boolean; error?: string }>;
  onUpgrade: () => void;
}> = ({ currentPlan, currentPropCount, onPropCreate, onUpgrade }) => {
  const [propName, setPropName] = useState('');
  const [propDescription, setPropDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);

  const limits = {
    free: 10,
    starter: 50,
    standard: 100,
    pro: 1000,
  };

  const limit = limits[currentPlan as keyof typeof limits] || 10;
  const isAtLimit = currentPropCount >= limit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAtLimit) {
      setShowUpgradeMessage(true);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await onPropCreate({
        name: propName,
        description: propDescription,
      });

      if (result.success) {
        setPropName('');
        setPropDescription('');
      } else {
        setError(result.error || 'Failed to create prop');
        if (result.error?.includes('limit reached')) {
          setShowUpgradeMessage(true);
        }
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div data-testid="prop-count-display">
        Props: {currentPropCount}/{limit} ({currentPlan} plan)
      </div>

      {showUpgradeMessage && (
        <div data-testid="upgrade-modal" className="upgrade-modal">
          <h3>Upgrade Required</h3>
          <p>You've reached your {currentPlan} plan limit of {limit} props.</p>
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
            <button onClick={onUpgrade} data-testid="upgrade-now-button">
              Upgrade Now
            </button>
            <button onClick={() => setShowUpgradeMessage(false)} data-testid="cancel-upgrade-button">
              Maybe Later
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} data-testid="prop-creation-form">
        <div>
          <label htmlFor="prop-name">Prop Name:</label>
          <input
            id="prop-name"
            type="text"
            value={propName}
            onChange={(e) => setPropName(e.target.value)}
            required
            disabled={isAtLimit}
            data-testid="prop-name-input"
          />
        </div>
        <div>
          <label htmlFor="prop-description">Description:</label>
          <textarea
            id="prop-description"
            value={propDescription}
            onChange={(e) => setPropDescription(e.target.value)}
            disabled={isAtLimit}
            data-testid="prop-description-input"
          />
        </div>
        <button 
          type="submit" 
          disabled={isCreating || isAtLimit}
          data-testid="create-prop-button"
        >
          {isCreating ? 'Creating...' : 'Create Prop'}
        </button>
        {isAtLimit && (
          <p data-testid="limit-reached-message">
            You've reached your prop limit. Upgrade to create more props.
          </p>
        )}
      </form>

      {error && (
        <div data-testid="error-message" className="error">
          {error}
        </div>
      )}
    </div>
  );
};

describe('Prop Creation Upgrade Flow', () => {
  const mockOnPropCreate = vi.fn();
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free Plan Upgrade Flow', () => {
    it('should show upgrade message when trying to create prop at limit', async () => {
      render(
        <PropCreationForm 
          currentPlan="free" 
          currentPropCount={10} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      // Form should be disabled at limit
      expect(screen.getByTestId('prop-name-input')).toBeDisabled();
      expect(screen.getByTestId('prop-description-input')).toBeDisabled();
      expect(screen.getByTestId('create-prop-button')).toBeDisabled();
      expect(screen.getByTestId('limit-reached-message')).toBeInTheDocument();

      // Try to submit form
      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText("You've reached your free plan limit of 10 props.")).toBeInTheDocument();
      expect(screen.getByText('50 props - £9/month')).toBeInTheDocument();
    });

    it('should allow prop creation when under limit', async () => {
      mockOnPropCreate.mockResolvedValue({ success: true });

      render(
        <PropCreationForm 
          currentPlan="free" 
          currentPropCount={5} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      // Form should be enabled
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
      expect(screen.getByTestId('create-prop-button')).not.toBeDisabled();

      // Fill out form
      fireEvent.change(screen.getByTestId('prop-name-input'), { target: { value: 'Test Prop' } });
      fireEvent.change(screen.getByTestId('prop-description-input'), { target: { value: 'A test prop' } });

      // Submit form
      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(mockOnPropCreate).toHaveBeenCalledWith({
          name: 'Test Prop',
          description: 'A test prop',
        });
      });

      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
    });
  });

  describe('Starter Plan Upgrade Flow', () => {
    it('should show correct upgrade message for starter plan', async () => {
      render(
        <PropCreationForm 
          currentPlan="starter" 
          currentPropCount={50} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByText("You've reached your starter plan limit of 50 props.")).toBeInTheDocument();
      expect(screen.getByText('100 props - £19/month')).toBeInTheDocument();
    });
  });

  describe('Standard Plan Upgrade Flow', () => {
    it('should show correct upgrade message for standard plan', async () => {
      render(
        <PropCreationForm 
          currentPlan="standard" 
          currentPropCount={100} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByText("You've reached your standard plan limit of 100 props.")).toBeInTheDocument();
      expect(screen.getByText('1,000 props - £39/month')).toBeInTheDocument();
    });
  });

  describe('Pro Plan (No Upgrade)', () => {
    it('should not show upgrade message for pro plan', () => {
      render(
        <PropCreationForm 
          currentPlan="pro" 
          currentPropCount={1000} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      // Pro plan at limit should still allow creation (no upgrade needed)
      expect(screen.getByTestId('prop-name-input')).not.toBeDisabled();
      expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
    });
  });

  describe('Upgrade Button Actions', () => {
    it('should call onUpgrade when upgrade button is clicked', async () => {
      render(
        <PropCreationForm 
          currentPlan="free" 
          currentPropCount={10} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('upgrade-now-button'));

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('should close modal when cancel button is clicked', async () => {
      render(
        <PropCreationForm 
          currentPlan="free" 
          currentPropCount={10} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-upgrade-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling with Upgrade Messages', () => {
    it('should show upgrade message when prop creation fails due to limit', async () => {
      mockOnPropCreate.mockResolvedValue({ 
        success: false, 
        error: 'Prop limit reached for free plan' 
      });

      render(
        <PropCreationForm 
          currentPlan="free" 
          currentPropCount={9} 
          onPropCreate={mockOnPropCreate}
          onUpgrade={mockOnUpgrade}
        />
      );

      // Fill out form
      fireEvent.change(screen.getByTestId('prop-name-input'), { target: { value: 'Test Prop' } });
      fireEvent.submit(screen.getByTestId('prop-creation-form'));

      await waitFor(() => {
        expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Prop limit reached for free plan');
    });
  });
});
