import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { PackingContainer } from '../../../shared/services/inventory/packListService';
import { InventoryProp } from '../../../shared/services/inventory/inventoryService';
import { CONTAINER_INDENT_PX } from '../../constants/containerConstants';

interface ContainerTreeProps {
  containers: PackingContainer[];
  packListId: string;
  propsList: InventoryProp[];
  calculateContainerWeight: (container: PackingContainer) => { totalWeight: number; weightUnit: string };
  onAddChildContainer: (parentId: string) => void;
  onRemoveFromParent: (containerId: string) => void;
  onMoveContainer: (containerId: string, newParentId: string | null) => void;
  selected: Record<string, boolean>;
  onSelectChange: (containerId: string, checked: boolean) => void;
  onSaveContainer: (container: PackingContainer) => Promise<void>;
  service: any;
  packList: any;
  movingContainerId?: string | null;
  removingContainerId?: string | null;
  recentlyDroppedContainer?: string | null;
}

const ContainerTree: React.FC<ContainerTreeProps> = ({
  containers,
  packListId,
  propsList,
  calculateContainerWeight,
  onAddChildContainer,
  onRemoveFromParent,
  onMoveContainer,
  selected,
  onSelectChange,
  onSaveContainer,
  service,
  packList,
  movingContainerId,
  removingContainerId,
  recentlyDroppedContainer,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null);

  // Build tree structure
  const buildTree = (parentId: string | null = null, level: number = 0): Array<PackingContainer & { level: number; children: Array<PackingContainer & { level: number; children: any[] }> }> => {
    return containers
      .filter(c => c.parentId === parentId)
      .map(container => ({
        ...container,
        level,
        children: buildTree(container.id, level + 1),
      }));
  };

  const rootContainers = buildTree();

  const toggleExpand = (containerId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  };

  const getChildContainers = (containerId: string): PackingContainer[] => {
    return containers.filter(c => c.parentId === containerId);
  };

  const getContainerColor = (level: number): string => {
    if (level === 0) return 'bg-white/5';
    if (level === 1) return 'bg-blue-500/10';
    if (level === 2) return 'bg-purple-500/10';
    return 'bg-pink-500/10';
  };

  const getBorderColor = (level: number): string => {
    if (level === 0) return 'border-white/10';
    if (level === 1) return 'border-blue-500/30';
    if (level === 2) return 'border-purple-500/30';
    return 'border-pink-500/30';
  };

  const ContainerNode: React.FC<{ container: PackingContainer & { level: number; children: PackingContainer[] }; parent?: PackingContainer }> = ({ container, parent }) => {
    const isExpanded = expanded.has(container.id);
    const hasChildren = container.children.length > 0;
    const childContainers = getChildContainers(container.id);
    const { totalWeight } = calculateContainerWeight(container);
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: container.id });

    const isRecentlyDropped = recentlyDroppedContainer === container.id;

    return (
      <div className="mb-2">
        <motion.div
          ref={setDroppableRef}
          className={`${getContainerColor(container.level)} ${getBorderColor(container.level)} ${isOver ? 'border-pb-primary bg-pb-primary/10' : 'border'} rounded-lg p-4 transition-colors hover:bg-white/10`}
          style={{ marginLeft: `${container.level * CONTAINER_INDENT_PX}px` }}
          draggable
          onDragStart={(e) => {
            const dragEvent = e as unknown as React.DragEvent;
            setDraggedContainerId(container.id);
            dragEvent.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            const dragEvent = e as unknown as React.DragEvent;
            dragEvent.preventDefault();
            dragEvent.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            const dragEvent = e as unknown as React.DragEvent;
            dragEvent.preventDefault();
            if (draggedContainerId && draggedContainerId !== container.id) {
              onMoveContainer(draggedContainerId, container.id);
            }
            setDraggedContainerId(null);
          }}
          animate={
            isRecentlyDropped
              ? {
                  scale: [1, 1.05, 1],
                  borderColor: [
                    'rgba(255, 255, 255, 0.1)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(255, 255, 255, 0.1)',
                  ],
                  boxShadow: [
                    '0 0 0px rgba(99, 102, 241, 0)',
                    '0 0 20px rgba(99, 102, 241, 0.6)',
                    '0 0 0px rgba(99, 102, 241, 0)',
                  ],
                }
              : {}
          }
          transition={{
            duration: 0.6,
            ease: 'easeOut',
          }}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/20 bg-pb-darker/60 text-pb-primary focus:ring-pb-primary/50 mt-1"
              checked={!!selected[container.id]}
              onChange={(e) => {
                e.stopPropagation();
                onSelectChange(container.id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              title="Select for bulk actions"
            />
            
            {hasChildren && (
              <button
                onClick={() => toggleExpand(container.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-pb-gray/70" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-pb-gray/70" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Link
                  to={`/packing-lists/${packListId}/containers/${container.id}`}
                  className="font-semibold text-white hover:text-pb-primary transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, input')) {
                      e.preventDefault();
                    }
                  }}
                >
                  {container.name}
                </Link>
                {container.type && (
                  <span className="text-sm text-pb-gray/70">({container.type})</span>
                )}
                
                {parent && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Inside: {parent.name}
                  </span>
                )}
                
                {childContainers.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {childContainers.length} container{childContainers.length !== 1 ? 's' : ''} inside
                  </span>
                )}
                
                {container.props.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    {container.props.length} prop{container.props.length !== 1 ? 's' : ''}
                  </span>
                )}
                
                {container.location && (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    📍 {container.location}
                  </span>
                )}
              </div>

              {container.description && (
                <div className="text-sm text-pb-gray/70 mb-2 p-2 bg-white/5 rounded border border-white/10">
                  {container.description}
                </div>
              )}

              {container.dimensions && (
                <div className="text-sm text-pb-gray/70 mb-2">
                  <span className="font-medium">Dimensions:</span> {container.dimensions.width} × {container.dimensions.height} × {container.dimensions.depth} {container.dimensions.unit}
                </div>
              )}

              {container.props.length > 0 && (
                <div className="text-sm text-pb-primary font-medium mb-2">
                  Total Weight: {totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : 'No weight data'}
                </div>
              )}

              {/* Props in container */}
              {container.props.length > 0 && (
                <div className="mt-3 p-2 bg-white/5 rounded border border-white/10">
                  <div className="text-xs font-medium text-white mb-2">Props ({container.props.length}):</div>
                  <div className="space-y-1">
                    {container.props.map((p) => {
                      const prop = propsList.find((pr) => pr.id === p.propId);
                      return (
                        <div key={p.propId} className="text-xs text-pb-gray/70">
                          {prop ? prop.name : 'Unknown prop'} (Qty: {p.quantity})
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {container.props.length === 0 && (
                <div className="mt-3 text-xs text-pb-gray/50 italic">
                  Drag props here or use dropdown on prop cards
                </div>
              )}

              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onAddChildContainer(container.id)}
                  className="px-3 py-1 text-xs bg-pb-primary/20 text-pb-primary rounded-lg border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors"
                  title="Add child container"
                  aria-label={`Add child container to ${container.name}`}
                >
                  + Add Child Container
                </button>
                
                {container.parentId && (
                  <button
                    onClick={() => onRemoveFromParent(container.id)}
                    disabled={removingContainerId === container.id}
                    className="px-3 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-lg border border-gray-500/30 hover:bg-gray-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from parent (make root)"
                    aria-label={`Remove ${container.name} from parent`}
                  >
                    {removingContainerId === container.id ? 'Removing...' : 'Remove from Parent'}
                  </button>
                )}
                
                <Link
                  to={`/packing-lists/${packListId}/containers/${container.id}`}
                  className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Details & Label
                </Link>
                
                <button
                  className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onSaveContainer(container);
                  }}
                  aria-label={`Save container ${container.name}`}
                >
                  Save Container
                </button>
              </div>
              </div>
            </div>
          </motion.div>

        {hasChildren && isExpanded && (
          <div>
            {container.children.map((child) => (
              <ContainerNode 
                key={child.id} 
                container={child as PackingContainer & { level: number; children: PackingContainer[] }} 
                parent={container} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {rootContainers.length === 0 ? (
        <div className="text-center py-8">
          <Box className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
          <p className="text-pb-gray/70">No containers yet</p>
          <p className="text-pb-gray/50 text-sm">Create your first container above</p>
        </div>
      ) : (
        rootContainers.map((container) => (
          <ContainerNode key={container.id} container={container} />
        ))
      )}
    </div>
  );
};

export default ContainerTree;

