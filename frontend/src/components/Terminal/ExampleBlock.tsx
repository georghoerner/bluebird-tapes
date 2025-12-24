import { CollapsibleSection } from './CollapsibleSection';
import { HoverExplain } from './GridTooltip';

/**
 * Example block showing the army list format with hoverable explanations.
 * Each part of the example text can be hovered to show what it means.
 *
 * Example format shown:
 *   The New Rygolic Host
 *   SECURITY TASK ELEMENT JASPER-15
 *   EXAMPLE - 100 PTS, 2 COMMAND
 *   __________________________
 *   Task Unit 1 - Headquarters
 *   P1 "Parallax" - 35 pts
 *   - [D] Tactical Team - 15 pts
 *   - [E] Node Team - 0 pts (TACOM)
 *   - [T] Automated Sentry - 15 pts
 */
export function ExampleBlock() {
  return (
    <CollapsibleSection label="FORMAT EXAMPLE" defaultExpanded={false}>
      <pre className="text-sm leading-relaxed">
        {/* Faction name */}
        <HoverExplain
          explanation="The faction this army belongs to. Determines available units, abilities, and playstyle."
          variant="stats"
        >
          The New Rygolic Host
        </HoverExplain>
        {'\n'}

        {/* Army header line */}
        <HoverExplain
          explanation="Security Task Element (STE) is a Federal States term for a task force. Other factions use different terminology."
          variant="info"
        >
          SECURITY TASK ELEMENT
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="The army's code name or identifier. Can be any designation you choose."
          variant="info"
        >
          JASPER-15
        </HoverExplain>
        {'\n'}

        {/* Points and command line */}
        <HoverExplain
          explanation="The name of this army list for easy reference."
          variant="stats"
        >
          EXAMPLE
        </HoverExplain>
        {' - '}
        <HoverExplain
          explanation="Total point value of the army. Standard games are typically 1000-2000 points."
          variant="stats"
        >
          100 PTS
        </HoverExplain>
        {', '}
        <HoverExplain
          explanation="Command Points available for special abilities and stratagems during the game."
          variant="stats"
        >
          2 COMMAND
        </HoverExplain>
        {'\n'}

        {/* Divider */}
        <span className="text-dim">{'_'.repeat(26)}</span>
        {'\n'}

        {/* Tactical group header */}
        <HoverExplain
          explanation="Tactical Groups organize your units. Each group has a function: HQ, CORE, SUPPORT, or RESERVE."
          variant="help"
        >
          Task Unit 1
        </HoverExplain>
        {' - '}
        <HoverExplain
          explanation="The group's role. Headquarters contains your command elements."
          variant="help"
        >
          Headquarters
        </HoverExplain>
        {'\n'}

        {/* Command unit */}
        <HoverExplain
          explanation="P1 indicates this unit has Priority 1 deployment - it deploys first."
          variant="stats"
        >
          P1
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="Unit name in quotes. 'Parallax' is a Federal States reconnaissance vehicle."
          variant="info"
        >
          "Parallax"
        </HoverExplain>
        {' - '}
        <HoverExplain
          explanation="Point cost of this unit."
          variant="stats"
        >
          35 pts
        </HoverExplain>
        {'\n'}

        {/* Infantry unit with D designation */}
        {'- '}
        <HoverExplain
          explanation="[D] = Dismounted. Infantry operates on foot. Other options: [E] Embarked, [T] Transport."
          variant="warning"
        >
          [D]
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="A basic infantry fire team."
          variant="info"
        >
          Tactical Team
        </HoverExplain>
        {' - '}
        <span>15 pts</span>
        {'\n'}

        {/* Infantry unit with E designation */}
        {'- '}
        <HoverExplain
          explanation="[E] = Embarked. Infantry starts inside a transport vehicle."
          variant="warning"
        >
          [E]
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="Specialized electronic warfare team."
          variant="info"
        >
          Node Team
        </HoverExplain>
        {' - 0 pts '}
        <HoverExplain
          explanation="(TACOM) = Tactical Command asset. Free unit attached to HQ for command & control."
          variant="help"
        >
          (TACOM)
        </HoverExplain>
        {'\n'}

        {/* Transport unit */}
        {'- '}
        <HoverExplain
          explanation="[T] = Transport. This vehicle carries embarked infantry."
          variant="warning"
        >
          [T]
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="Automated/drone vehicle that operates independently."
          variant="info"
        >
          Automated Sentry
        </HoverExplain>
        {' - 15 pts'}
      </pre>

      <div className="mt-4 text-dim text-xs">
        <span className="text-bright">TIP:</span> Hover over any highlighted text above to see explanations.
      </div>
    </CollapsibleSection>
  );
}
