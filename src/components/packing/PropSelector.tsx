import { Prop } from '../../types';

interface PropSelectorProps {
  props: Prop[];
  selectedProps: Prop[];
  onChange: (props: Prop[]) => void;
  disabled?: boolean;
}

export function PropSelector({
  props,
  selectedProps,
  onChange,
  disabled = false,
}: PropSelectorProps) {
  const handlePropToggle = (prop: Prop) => {
    const isSelected = selectedProps.some(p => p.id === prop.id);
    if (isSelected) {
      onChange(selectedProps.filter(p => p.id !== prop.id));
    } else {
      onChange([...selectedProps, prop]);
    }
  };

  return (
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Select Props to Pack
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {props.map((prop) => {
          const isSelected = selectedProps.some(p => p.id === prop.id);
          return (
            <button
              key={prop.id}
              onClick={() => handlePropToggle(prop)}
              disabled={disabled}
              className={`
                flex items-center p-3 rounded-lg text-sm
                ${isSelected
                  ? 'bg-blue-600 text-white border-2 border-blue-400'
                  : 'bg-[#1A1A1A] text-gray-200 border border-gray-700 hover:border-gray-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            >
              <div className="flex items-center gap-3 w-full">
                {prop.imageUrl ? (
                  <img
                    src={prop.imageUrl}
                    alt={prop.name}
                    className="w-12 h-12 rounded object-cover bg-black"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center">
                    <span className="text-2xl text-gray-400">
                      {prop.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium">{prop.name}</div>
                  <div className="text-xs text-gray-400">
                    {prop.category}
                    {prop.quantity > 1 && ` • Qty: ${prop.quantity}`}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {props.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No props available for this act and scene
        </div>
      )}
    </div>
  );
} 