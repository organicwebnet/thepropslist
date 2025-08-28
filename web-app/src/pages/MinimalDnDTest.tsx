import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

function DraggableBox() {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'box' });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        width: 120,
        height: 40,
        background: isDragging ? '#aaa' : '#4f46e5',
        color: 'white',
        margin: 8,
        borderRadius: 8,
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Drag me
    </div>
  );
}

function DroppableZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'zone' });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: 200,
        height: 100,
        border: '2px dashed #6366f1',
        background: isOver ? '#c7d2fe' : '#18181b',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 8,
      }}
    >
      Drop here
    </div>
  );
}

export default function MinimalDnDTest() {
  return (
    <DndContext
      onDragEnd={({ active, over }) => {
        console.log('DRAG END', { active, over });
        if (over) alert(`Dropped ${active.id} on ${over.id}`);
      }}
    >
      <div style={{ display: 'flex', gap: 32, marginTop: 32 }}>
        <DraggableBox />
        <DroppableZone />
      </div>
    </DndContext>
  );
} 