import React from 'react';
import { DimensionUnit } from '../types/props';

interface DimensionInputProps {
  name: string;
  label: string;
  value: number | undefined;
  unit: DimensionUnit;
  onChange: (name: string, value: number | undefined) => void;
  onUnitChange: (unit: DimensionUnit) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const DimensionInput: React.FC<DimensionInputProps> = ({
  name,
  label,
  value,
  unit,
  onChange,
  onUnitChange,
  placeholder = "0.0",
  min = 0,
  max = 10000,
  step = 0.1,
  disabled = false,
  className = ""
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = inputValue === '' ? undefined : Number(inputValue);
    
    // Validate input
    if (numericValue !== undefined) {
      if (numericValue < min || numericValue > max) {
        return; // Don't update if out of range
      }
    }
    
    onChange(name, numericValue);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUnitChange(e.target.value as DimensionUnit);
  };

  return (
    <div className={className}>
      <label 
        htmlFor={`${name}-input`}
        className="block text-pb-gray mb-1 text-sm font-medium"
      >
        {label}
      </label>
      <div className="flex">
        <input
          id={`${name}-input`}
          name={name}
          type="number"
          step={step}
          min={min}
          max={max}
          value={value || ''}
          onChange={handleInputChange}
          className="flex-1 rounded-l bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary focus:border-transparent"
          placeholder={placeholder}
          disabled={disabled}
          aria-label={`${label} in ${unit}`}
        />
        <select
          value={unit}
          onChange={handleUnitChange}
          className="rounded-r bg-pb-darker border border-pb-primary/30 border-l-0 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary focus:border-transparent"
          disabled={disabled}
          aria-label={`${label} unit`}
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="in">in</option>
          <option value="m">m</option>
          <option value="ft">ft</option>
        </select>
      </div>
    </div>
  );
};

export default DimensionInput;
