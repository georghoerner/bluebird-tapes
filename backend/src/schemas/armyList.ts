import { z } from 'zod';

// Unit designation enum
export const UnitDesignationSchema = z.enum(['E', 'D', 'T']).nullable().optional();

// Unit schema
export const UnitSchema = z.object({
  designation: UnitDesignationSchema,
  unitName: z.string().min(1, 'Unit name is required'),
  pointCost: z.number().int().min(0, 'Point cost must be non-negative'),
  tacomDesignation: z.string().min(1, 'TACOM designation is required'),
  sortOrder: z.number().int().default(0),
});

// Tactical group schema
export const TacticalGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required'),
  groupFunction: z.string().min(1, 'Group function is required'),
  groupNumber: z.number().int().min(1, 'Group number must be at least 1'),
  sortOrder: z.number().int().default(0),
  units: z.array(UnitSchema).min(1, 'At least one unit is required'),
});

// Create army list request schema
export const CreateArmyListSchema = z.object({
  faction: z.string().min(1, 'Faction is required'),
  name: z.string().min(1, 'List name is required'),
  pointCap: z.number().int().min(1, 'Point cap must be at least 1'),
  commandPoints: z.number().int().min(0, 'Command points must be non-negative'),
  armyKey: z.string().optional(),
  tacticalGroups: z.array(TacticalGroupSchema).min(1, 'At least one tactical group is required'),
});

// Type exports
export type UnitDesignation = z.infer<typeof UnitDesignationSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type TacticalGroup = z.infer<typeof TacticalGroupSchema>;
export type CreateArmyListInput = z.infer<typeof CreateArmyListSchema>;
