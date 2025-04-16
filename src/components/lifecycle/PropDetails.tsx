import React, { useState } from 'react';
import { Info } from 'lucide-react';

export function PropDetails() {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <button 
      className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
        activeTab === 'details' 
          ? 'border-red-500 text-red-500' 
          : 'border-transparent text-[var(--text-secondary)] hover:text-red-400 hover:border-red-300'
      }`}
      onClick={() => setActiveTab('details')}
    >
      <Info className="h-4 w-4" />
      Details
    </button>
  );
} 