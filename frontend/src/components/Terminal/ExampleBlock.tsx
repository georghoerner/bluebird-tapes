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
 */
export function ExampleBlock() {
  return (
    <CollapsibleSection label="FORMAT EXAMPLE" defaultExpanded={true}>
      <pre className="text-sm leading-relaxed">
        {/* Faction name */}
        <HoverExplain
          explanation="The faction the observed army belongs to. Delineate by known characteristics."
          variant="stats"
        >
          The New Rygolic Host
        </HoverExplain>
        {'\n'}

        {/* Army header line */}
        <HoverExplain
          explanation="The designation of the observed force for future reference."
          variant="info"
        >
          SECURITY TASK ELEMENT JASPER-15
        </HoverExplain>
        {'\n'}

        {/* Points and command line */}
        <HoverExplain
          explanation="Reserved space for further army information. Here, its observed whereabouts are noted."
          variant="stats"
        >
           last seen operating {'\n'} 30km NW of Lutāx
        </HoverExplain>
        <HoverExplain
          explanation="The delineator, neccessary for our text system to differentiate between entered information and calculated information."
          variant="info"
        >
        {' - '}
        </HoverExplain>
        <HoverExplain
          explanation="Total point value designation of observed force. Will be calculated while observed units are entered by user."
          variant="stats"
        >
          100 PTS
        </HoverExplain>
        {', '}
        <HoverExplain
          explanation="Command potential of observed force. Will be calculated while observed units are entered by user."
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
          explanation="If force is observed to be split into seperately operating parts, designate them as Tactical Groups. Name these according to function or even callsign if intelligence is available."
          variant="help"
        >
          Task Unit 1
        </HoverExplain>
        {' - '}
        <HoverExplain
          explanation="The group's role. In this case SIGINT suggests a Node Team in the observed vehicle, therefore HQ designation was made."
          variant="help"
        >
          Headquarters
        </HoverExplain>
        {'\n'}

        {/* Command unit */}
        {' '}
        <HoverExplain
          explanation="Name of the observed unit. In this case a NRH hovercraft was observed, probably variant P1"
          variant="info"
        >
          P1 "Parallax"
        </HoverExplain>
        {' - '}
        <HoverExplain
          explanation="Point value of this unit."
          variant="stats"
        >
          35 pts
        </HoverExplain>
        {'\n'}

        {/* Infantry unit with D designation */}
        {'- '}
        <HoverExplain
          explanation="[D] = Desanting. Unit is observed riding the vehicle before. Other options: [E] Embarked, [T] Towed."
          variant="info"
        >
          [D]
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="A basic NRH infantry fire team."
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
          explanation="[E] = Embarked. First unindentec vehicle above is the personel carrier this unit is embarked in."
          variant="info"
        >
          [E]
        </HoverExplain>
        {' '}
        <HoverExplain
          explanation="NRH command and control element."
          variant="info"
        >
          Node Team
        </HoverExplain>
        {' - 0 pts '}
        <HoverExplain
          explanation="(TACOM) = Tactical Command asset designation. Optional."
          variant="info"
        >
          (TACOM)
        </HoverExplain>
        {'\n'}
        [...]
      </pre>
      <div className="mt-4 text-dim text-sm">
        <span className="text-bright">WARNING:</span> If you do not have the file on your system and reload, the list is gone.
      </div>
      <div className="mt-4 text-dim text-sm">
        <span className="text-bright">TIP:</span> Hover your cursor over any highlighted text above to see explanations.
      </div>
      <div className="mt-4 text-dim text-sm">
        <span className="text-bright">TIP:</span> Use the [SAVE] button in ARMY LIST ENTRY to get a printable list of your sighting.
      </div>
    </CollapsibleSection>
  );
}
