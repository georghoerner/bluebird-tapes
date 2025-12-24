import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Terminal, Message, DoubleSeparator, Box, Separator } from '../components/Terminal';
import type { ArmyList } from '../types';
import { FACTIONS } from '../types';

export function ViewList() {
  const { id } = useParams<{ id: string }>();
  const [armyList, setArmyList] = useState<ArmyList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const response = await fetch(`/api/lists/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Army list not found');
          }
          throw new Error('Failed to load army list');
        }
        const data = await response.json();
        setArmyList(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchList();
    }
  }, [id]);

  // Get faction display name
  const getFactionName = (factionValue: string) => {
    const faction = FACTIONS.find((f) => f.value === factionValue);
    return faction?.label || factionValue;
  };

  // Calculate total points
  const calculateTotalPoints = () => {
    if (!armyList) return 0;
    return armyList.tacticalGroups.reduce((sum, group) => {
      const groupTotal = group.units.reduce((uSum, unit) => uSum + unit.pointCost, 0);
      return sum + groupTotal;
    }, 0);
  };

  if (loading) {
    return (
      <Terminal>
        <Message type="info">LOADING SIGHTING REPORT...</Message>
        <div className="animate-pulse mt-4">
          <div className="h-4 bg-[var(--terminal-dim)] w-3/4 mb-2"></div>
          <div className="h-4 bg-[var(--terminal-dim)] w-1/2"></div>
        </div>
      </Terminal>
    );
  }

  if (error) {
    return (
      <Terminal>
        <Message type="error">{error}</Message>
        <div className="mt-4">
          <Link to="/" className="text-bright">
            &lt; RETURN TO DATA ENTRY
          </Link>
        </div>
      </Terminal>
    );
  }

  if (!armyList) {
    return (
      <Terminal>
        <Message type="error">SIGHTING REPORT NOT FOUND</Message>
        <div className="mt-4">
          <Link to="/" className="text-bright">
            &lt; RETURN TO DATA ENTRY
          </Link>
        </div>
      </Terminal>
    );
  }

  const totalPoints = calculateTotalPoints();
  const isOverCap = totalPoints > armyList.pointCap;

  return (
    <Terminal>
      <Message type="success">SIGHTING REPORT RETRIEVED</Message>
      <DoubleSeparator />

      {/* Report header */}
      <pre className="terminal-glow mb-4">
{`SIGHTING REPORT #${armyList.id?.toUpperCase()}`}
      </pre>
      <DoubleSeparator />

      {/* Army info */}
      <div className="mb-6 font-mono">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <span className="text-dim">FACTION:</span>
          <span className="text-bright">{getFactionName(armyList.faction).toUpperCase()}</span>

          <span className="text-dim">LIST NAME:</span>
          <span>"{armyList.name}"</span>

          <span className="text-dim">POINT CAP:</span>
          <span>{armyList.pointCap} pts</span>

          <span className="text-dim">COMMAND POINTS:</span>
          <span>{armyList.commandPoints} CP</span>

          {armyList.armyKey && (
            <>
              <span className="text-dim">ARMY KEY:</span>
              <span>{armyList.armyKey}</span>
            </>
          )}
        </div>
      </div>

      {/* Point total */}
      <div className={`mb-4 ${isOverCap ? 'text-[#FF6B6B]' : ''}`}>
        <span className="text-dim">TOTAL POINTS: </span>
        <span className="terminal-glow text-bright">
          {totalPoints} / {armyList.pointCap} pts
        </span>
        {isOverCap && <span className="ml-2">[OVER LIMIT]</span>}
      </div>

      <DoubleSeparator />

      {/* Tactical groups */}
      {armyList.tacticalGroups.map((group) => {
        const groupTotal = group.units.reduce((sum, unit) => sum + unit.pointCost, 0);

        return (
          <Box
            key={group.id}
            title={`TACTICAL GROUP: ${group.groupName.toUpperCase()} - ${group.groupFunction} - ${group.groupNumber}`}
            className="mb-4"
          >
            {/* Separator */}
            <div className="text-dim mb-2">
              {'─'.repeat(68)}
            </div>

            {/* Units */}
            {group.units.map((unit) => (
              <div key={unit.id} className="flex items-center gap-2 mb-1 ml-4 font-mono">
                {/* Designation */}
                <span className="w-8 text-center">
                  {unit.designation ? `[${unit.designation}]` : '   '}
                </span>

                {/* Unit name */}
                <span className="flex-1 min-w-[200px]">{unit.unitName}</span>

                {/* Point cost - right aligned */}
                <span className="w-20 text-right">{unit.pointCost} pts</span>

                {/* TACOM */}
                <span className="text-dim">TACOM:</span>
                <span className="w-12">{unit.tacomDesignation}</span>
              </div>
            ))}

            {/* Group total */}
            <div className="mt-2 text-right text-dim">
              GROUP TOTAL: {groupTotal} pts
            </div>
          </Box>
        );
      })}

      <Separator />

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(window.location.href)}
        >
          COPY LINK
        </button>
        <Link to="/">
          <button type="button">FILE NEW REPORT</button>
        </Link>
      </div>

      {/* Report footer */}
      <div className="mt-6 text-dim text-xs">
        <span>REPORT FILED: </span>
        <span>
          {armyList.createdAt
            ? new Date(armyList.createdAt).toLocaleString()
            : 'UNKNOWN'}
        </span>
      </div>
    </Terminal>
  );
}
