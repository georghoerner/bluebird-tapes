import { useFieldArray } from 'react-hook-form';
import type { UseFormRegister, UseFormWatch, Control } from 'react-hook-form';
import type { ArmyListFormData, UnitFormData } from '../../types';
import { GROUP_FUNCTIONS } from '../../types';
import { UnitEntry } from './UnitEntry';
import { Box } from '../Terminal';

interface TacticalGroupEntryProps {
  groupIndex: number;
  register: UseFormRegister<ArmyListFormData>;
  watch: UseFormWatch<ArmyListFormData>;
  control: Control<ArmyListFormData>;
  onRemove: () => void;
  canRemove: boolean;
}

const defaultUnit: UnitFormData = {
  designation: null,
  unitName: '',
  pointCost: 0,
  tacomDesignation: 'INF',
};

export function TacticalGroupEntry({
  groupIndex,
  register,
  watch,
  control,
  onRemove,
  canRemove,
}: TacticalGroupEntryProps) {
  const basePath = `tacticalGroups.${groupIndex}` as const;

  const { fields: units, append, remove } = useFieldArray({
    control,
    name: `${basePath}.units` as const,
  });

  // Calculate group total points
  const groupUnits = watch(`${basePath}.units`) || [];
  const groupTotal = groupUnits.reduce((sum, unit) => sum + (unit?.pointCost || 0), 0);

  return (
    <Box className="mb-4">
      {/* Group header */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-bright terminal-glow">TACTICAL GROUP:</span>

        <input
          {...register(`${basePath}.groupName` as const, { required: true })}
          placeholder="Group name"
          className="w-48"
        />

        <span className="text-dim">-</span>

        <select
          {...register(`${basePath}.groupFunction` as const, { required: true })}
          className="w-28"
        >
          {GROUP_FUNCTIONS.map((func) => (
            <option key={func} value={func}>
              {func}
            </option>
          ))}
        </select>

        <span className="text-dim">-</span>

        <input
          type="number"
          {...register(`${basePath}.groupNumber` as const, {
            required: true,
            valueAsNumber: true,
            min: 1,
          })}
          placeholder="#"
          className="w-12 text-center"
          min={1}
        />

        <span className="ml-auto text-dim">
          [{groupTotal} pts]
        </span>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="px-2 py-0 text-sm border-[var(--terminal-dim)] hover:border-[var(--terminal-fg)]"
            title="Remove group"
          >
            X
          </button>
        )}
      </div>

      {/* Separator */}
      <div className="text-dim mb-2 ml-4">
        {'─'.repeat(68)}
      </div>

      {/* Units */}
      {units.map((unit, unitIndex) => (
        <UnitEntry
          key={unit.id}
          groupIndex={groupIndex}
          unitIndex={unitIndex}
          register={register}
          watch={watch}
          onRemove={() => remove(unitIndex)}
          canRemove={units.length > 1}
        />
      ))}

      {/* Add unit button */}
      <div className="ml-4 mt-2">
        <button
          type="button"
          onClick={() => append(defaultUnit)}
          className="text-sm px-3 py-1"
        >
          + ADD UNIT
        </button>
      </div>
    </Box>
  );
}
