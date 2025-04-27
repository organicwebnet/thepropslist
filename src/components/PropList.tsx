import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Package, Trash2, Theater, Edit, AlertTriangle, Calendar, FileText, Share2, ChevronsUp, Activity, HelpCircle } from 'lucide-react';
import type { PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, DimensionUnit } from '@/shared/types/props';
import type { Show } from '@/types';
import { Prop } from '@/shared/types/props';
import { lifecycleStatusLabels, lifecycleStatusPriority, PropLifecycleStatus, StatusPriority } from '@/types/lifecycle';
import { HelpTooltip } from './HelpTooltip';
import { PropCard } from '@/components/PropCard';

interface PropListProps {
  props: Prop[];
  onDelete: (id: string) => void;
  onEdit: (prop: Prop) => void;
}

export function PropList({ 
  props, 
  onDelete, 
  onEdit, 
}: PropListProps) {
  const router = useRouter();
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({});

  const handleEditClick = (prop: Prop) => {
    onEdit(prop);
  };

  const handleDeleteClick = (propId: string) => {
    onDelete(propId);
  };

  const displayProps = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {displayProps.length === 0 ? (
        <div className="col-span-full text-center py-10">
          <p className="text-dark-text-secondary">No props found matching the current filters.</p>
        </div>
      ) : (
        displayProps.map((prop) => (
          <PropCard 
            key={prop.id} 
            prop={prop} 
            onEdit={() => handleEditClick(prop)} 
            onDelete={() => handleDeleteClick(prop.id)}
          />
        ))
      )}
    </div>
  );
}

const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'bg-gray-700';
  const priority = lifecycleStatusPriority[status as PropLifecycleStatus] || 'info';
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'low': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-green-500/20 text-green-400'; // info
  }
};

const getStatusLabel = (status: string | undefined): string => {
  if (!status) return 'Unknown';
  return lifecycleStatusLabels[status as PropLifecycleStatus] || status;
};