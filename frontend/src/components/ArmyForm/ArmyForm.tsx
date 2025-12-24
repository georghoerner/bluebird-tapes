import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import type { ArmyListFormData, TacticalGroupFormData, CreateArmyListResponse } from '../../types';
import { FACTIONS } from '../../types';
import { TacticalGroupEntry } from './TacticalGroupEntry';
import { Message, DoubleSeparator, Separator } from '../Terminal';

const defaultUnit = {
  designation: null as null,
  unitName: '',
  pointCost: 0,
  tacomDesignation: 'INF',
};

const defaultTacticalGroup: TacticalGroupFormData = {
  groupName: '',
  groupFunction: 'CORE',
  groupNumber: 1,
  units: [defaultUnit],
};

const defaultFormValues: ArmyListFormData = {
  faction: 'federal-states',
  name: '',
  pointCap: 1000,
  commandPoints: 3,
  armyKey: '',
  tacticalGroups: [defaultTacticalGroup],
};

interface ArmyFormProps {
  onSuccess?: (data: CreateArmyListResponse) => void;
}

export function ArmyForm({ onSuccess }: ArmyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateArmyListResponse | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ArmyListFormData>({
    defaultValues: defaultFormValues,
  });

  const { fields: tacticalGroups, append, remove } = useFieldArray({
    control,
    name: 'tacticalGroups',
  });

  // Calculate total points
  const watchedGroups = watch('tacticalGroups') || [];
  const totalPoints = watchedGroups.reduce((sum, group) => {
    const groupTotal = (group?.units || []).reduce(
      (unitSum, unit) => unitSum + (unit?.pointCost || 0),
      0
    );
    return sum + groupTotal;
  }, 0);

  const pointCap = watch('pointCap') || 0;
  const isOverCap = totalPoints > pointCap;

  const onSubmit = async (data: ArmyListFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Transform form data to API format
      const payload = {
        ...data,
        armyKey: data.armyKey || undefined,
        tacticalGroups: data.tacticalGroups.map((group, gIndex) => ({
          ...group,
          sortOrder: gIndex,
          units: group.units.map((unit, uIndex) => ({
            ...unit,
            sortOrder: uIndex,
          })),
        })),
      };

      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create army list');
      }

      const result: CreateArmyListResponse = await response.json();
      setResult(result);
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we have a result, show success message
  if (result) {
    const fullUrl = `${window.location.origin}/list/${result.id}`;

    return (
      <div>
        <Message type="success">SIGHTING REPORT FILED SUCCESSFULLY</Message>
        <DoubleSeparator />

        <div className="mb-4">
          <span className="text-dim">REPORT ID: </span>
          <span className="text-bright terminal-glow">{result.id}</span>
        </div>

        <div className="mb-4">
          <span className="text-dim">SHAREABLE LINK: </span>
          <a href={fullUrl} className="text-bright terminal-glow break-all">
            {fullUrl}
          </a>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(fullUrl)}
          >
            COPY LINK
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
          >
            FILE NEW REPORT
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Message type="info">ENTER SIGHTING REPORT DATA</Message>
      <DoubleSeparator />

      {error && (
        <Message type="error">{error}</Message>
      )}

      {/* Army header info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1 text-dim">FACTION:</label>
          <select
            {...register('faction', { required: true })}
            className="w-full"
          >
            {FACTIONS.map((faction) => (
              <option key={faction.value} value={faction.value}>
                {faction.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-dim">LIST NAME:</label>
          <input
            {...register('name', { required: 'List name is required' })}
            placeholder="Enter list name"
            className="w-full"
          />
          {errors.name && (
            <span className="text-[#FF6B6B] text-sm">{errors.name.message}</span>
          )}
        </div>

        <div>
          <label className="block mb-1 text-dim">POINT CAP:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              {...register('pointCap', {
                required: true,
                valueAsNumber: true,
                min: 1,
              })}
              className="w-32"
              min={1}
            />
            <span className="text-dim">pts</span>
          </div>
        </div>

        <div>
          <label className="block mb-1 text-dim">COMMAND POINTS:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              {...register('commandPoints', {
                required: true,
                valueAsNumber: true,
                min: 0,
              })}
              className="w-32"
              min={0}
            />
            <span className="text-dim">CP</span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 text-dim">ARMY KEY (OPTIONAL):</label>
          <input
            {...register('armyKey')}
            placeholder="e.g., FSA-2024-ALPHA"
            className="w-full md:w-1/2"
          />
        </div>
      </div>

      {/* Point total */}
      <div className={`mb-4 text-right ${isOverCap ? 'text-[#FF6B6B]' : ''}`}>
        <span className="text-dim">TOTAL: </span>
        <span className="terminal-glow">
          {totalPoints} / {pointCap} pts
        </span>
        {isOverCap && <span className="ml-2">[OVER LIMIT]</span>}
      </div>

      <Separator />

      {/* Tactical groups */}
      {tacticalGroups.map((group, index) => (
        <TacticalGroupEntry
          key={group.id}
          groupIndex={index}
          register={register}
          watch={watch}
          control={control}
          onRemove={() => remove(index)}
          canRemove={tacticalGroups.length > 1}
        />
      ))}

      {/* Add group button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() =>
            append({
              ...defaultTacticalGroup,
              groupNumber: tacticalGroups.length + 1,
            })
          }
        >
          + ADD TACTICAL GROUP
        </button>
      </div>

      <Separator />

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button type="submit" disabled={isSubmitting} className="px-6">
          {isSubmitting ? 'FILING REPORT...' : 'FILE SIGHTING REPORT'}
        </button>
      </div>
    </form>
  );
}
