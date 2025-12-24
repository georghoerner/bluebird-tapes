import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import type { ArmyListFormData } from '../../types';
import { TACOM_DESIGNATIONS } from '../../types';

interface UnitEntryProps {
  groupIndex: number;
  unitIndex: number;
  register: UseFormRegister<ArmyListFormData>;
  watch: UseFormWatch<ArmyListFormData>;
  onRemove: () => void;
  canRemove: boolean;
}

export function UnitEntry({
  groupIndex,
  unitIndex,
  register,
  onRemove,
  canRemove,
}: UnitEntryProps) {
  const basePath = `tacticalGroups.${groupIndex}.units.${unitIndex}` as const;

  return (
    <div className="flex items-center gap-2 mb-2 ml-4">
      {/* Designation selector */}
      <select
        {...register(`${basePath}.designation` as const)}
        className="w-12 text-center"
      >
        <option value="">--</option>
        <option value="E">[E]</option>
        <option value="D">[D]</option>
        <option value="T">[T]</option>
      </select>

      {/* Unit name */}
      <input
        {...register(`${basePath}.unitName` as const, { required: true })}
        placeholder="Unit name"
        className="flex-1 min-w-[200px]"
      />

      {/* Point cost */}
      <input
        type="number"
        {...register(`${basePath}.pointCost` as const, {
          required: true,
          valueAsNumber: true,
          min: 0,
        })}
        placeholder="pts"
        className="w-20 text-right"
      />
      <span className="text-dim">pts</span>

      {/* TACOM designation */}
      <span className="text-dim">TACOM:</span>
      <select
        {...register(`${basePath}.tacomDesignation` as const, { required: true })}
        className="w-20"
      >
        {TACOM_DESIGNATIONS.map((tacom) => (
          <option key={tacom} value={tacom}>
            {tacom}
          </option>
        ))}
      </select>

      {/* Remove button */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-0 text-sm border-[var(--terminal-dim)] hover:border-[var(--terminal-fg)]"
          title="Remove unit"
        >
          X
        </button>
      )}
    </div>
  );
}
