# Rules Text Files

This folder contains text files for each game keyword/ability.
Each file contains the rules text that will be displayed as a tooltip when hovering over the ability.

## Structure

```
rules/
├── weapon_abilities/     # Weapon-related keywords
│   ├── air_filling.txt
│   ├── barrage.txt
│   └── ...
├── unit_abilities/       # Unit-related keywords
│   ├── afterburner.txt
│   ├── amphibious.txt
│   └── ...
└── README.md
```

## File Naming Convention

- Use lowercase with underscores for file names
- Remove parentheses and special characters
- Examples:
  - `Barrage (X)` → `barrage.txt`
  - `APS (X+, <Y>)` → `aps.txt`
  - `PC (X, Arc)` → `pc.txt`

## File Content

Each file should contain plain text rules explanation.
Keep it concise but complete enough to understand the ability.

Example `barrage.txt`:
```
BARRAGE (X)
This weapon fires X shots per attack. Roll X dice when attacking.
Each hit is resolved separately.
```

## Weapon Abilities (General)

- air_filling.txt
- barrage.txt
- chemical_weapon.txt
- defensive_cc.txt
- designator.txt
- discreet.txt
- door_gun.txt
- guided_missile.txt
- heavy_indirect.txt
- light_indirect.txt
- homing.txt
- ignore_cover.txt
- lingering.txt
- mclos.txt
- melee.txt
- multi_gun.txt
- no_cc.txt
- nuclear.txt
- radius.txt
- radar_anti_air.txt
- rally.txt
- rear_attack.txt
- saturating.txt
- scoped.txt
- shaped_charge.txt
- small_arm.txt
- smoke.txt
- strafing.txt
- tracking.txt
- turret.txt
- thermal_sights.txt
- underbarrel.txt
- undetectable.txt

## Unit Abilities (General)

- afterburner.txt
- amphibious.txt
- aps.txt
- assault_specialist.txt
- brigade.txt
- chaff_flares.txt
- fearless.txt
- loiter.txt
- nbc.txt
- paradrop.txt
- pc.txt
- resupply.txt
- sense.txt
- tow.txt
- watercraft.txt

## Faction-Specific Abilities

### Federal States-Army
- assault_dismount.txt
- chemical_sp.txt
- sprint_motor.txt
- steel_watchbands.txt

### Army of the Ebon Forest
- bloodlust.txt
- guidance.txt
- infiltrator.txt
- rally_salt.txt

### The New Rygolic Host
- active_camouflage.txt
- drone.txt
- hovercraft.txt
- guided_shell.txt
- laser.txt
- round_extruder.txt
- rygonet.txt
- strider.txt

### Atom Barons of Santagria
- leviathan.txt
- flower_of_the_atom.txt
- tercio.txt
