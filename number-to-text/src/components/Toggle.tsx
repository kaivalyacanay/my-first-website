import { useId } from 'react';
import { NumberingSystem } from '../lib/helpers';
import { clsx } from 'clsx';

type ToggleProps = {
  value: NumberingSystem;
  onChange: (value: NumberingSystem) => void;
};

const Toggle = ({ value, onChange }: ToggleProps) => {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-slate-200">Numbering system</legend>
      <div className="inline-flex rounded-full bg-slate-800 p-1 shadow-inner" role="radiogroup" aria-labelledby={id}>
        <span id={id} className="sr-only">
          Select numbering system
        </span>
        {(
          [
            { label: 'International', value: 'international' },
            { label: 'Indian', value: 'indian' }
          ] satisfies { label: string; value: NumberingSystem }[]
        ).map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-slate-900',
                isActive
                  ? 'bg-primary text-white shadow'
                  : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};

export default Toggle;
