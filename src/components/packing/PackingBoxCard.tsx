import { PackingBox } from '../../types';

interface PackingBoxCardProps {
  box: PackingBox;
  onUpdate: (boxId: string, updates: Partial<PackingBox>) => Promise<void>;
  onDelete: (boxId: string) => Promise<void>;
}

export function PackingBoxCard({
  box,
  onUpdate,
  onDelete
}: PackingBoxCardProps) {
  const handleUpdateNotes = async (notes: string) => {
    await onUpdate(box.id, { notes });
  };

  return (
    <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-200">{box.name}</h3>
          <p className="text-sm text-gray-400">
            Act {box.actNumber}, Scene {box.sceneNumber}
          </p>
        </div>
        <button
          onClick={() => onDelete(box.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Delete box"
        >
          ✕
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Total Weight:</span>
          <span className="text-gray-200">
            {box.totalWeight.toFixed(1)} {box.weightUnit}
          </span>
          {box.isHeavy && (
            <span className="text-yellow-500 font-medium">(Heavy)</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Contents:</h4>
        <ul className="space-y-2">
          {box.props.map(prop => (
            <li
              key={prop.propId}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-200">{prop.name}</span>
                {prop.isFragile && (
                  <span className="text-yellow-500 text-xs">(Fragile)</span>
                )}
              </div>
              <span className="text-gray-400">
                {prop.quantity} × {prop.weight}{prop.weightUnit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          value={box.notes || ''}
          onChange={(e) => handleUpdateNotes(e.target.value)}
          placeholder="Add notes about this box..."
          className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
          rows={2}
        />
      </div>
    </div>
  );
} 