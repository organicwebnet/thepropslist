import React from 'react';
import { useSubscription } from '../hooks/useSubscription';

interface SubFootnoteProps {
  features: string[];
}

const SubFootnote: React.FC<SubFootnoteProps> = ({ features }) => {
  const { plan } = useSubscription();
  if (plan === 'pro' || plan === 'standard') return null;
  return (
    <div className="mt-4 text-xs text-pb-gray bg-pb-primary/5 border border-pb-primary/20 rounded-lg p-3">
      Some features on this page are limited on your current plan. Unlock:
      <span className="ml-1 text-white">{features.join(', ')}</span> by upgrading your subscription in your profile.
    </div>
  );
};

export default SubFootnote;


