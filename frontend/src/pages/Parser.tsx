import { useState, useCallback, useRef } from 'react';
import { Terminal } from '../components/Terminal';
import { parsePdfText, generateFactionJson } from '../utils/pdfParser';
import type { ParseResult, ParsedUnit, ParsedWeapon } from '../utils/pdfParser';

const FACTIONS = [
  { id: 'federal_states', name: 'Federal States-Army' },
  { id: 'ebon_forest', name: 'Army of the Ebon Forest' },
  { id: 'rygolic_host', name: 'The New Rygolic Host' },
  { id: 'atom_barons', name: 'Atom Barons of Santagria' },
  { id: 'custom', name: 'Custom Faction' }
];

export function Parser() {
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [faction, setFaction] = useState(FACTIONS[0].id);
  const [sectionInput, setSectionInput] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleParse = useCallback(() => {
    if (!inputText.trim()) {
      setParseResult(null);
      return;
    }
    const result = parsePdfText(inputText);
    setParseResult(result);
    // Expand all units by default
    setExpandedUnits(new Set(result.units.map(u => u.id)));
  }, [inputText]);

  const handleClear = useCallback(() => {
    setInputText('');
    setParseResult(null);
    setExpandedUnits(new Set());
  }, []);

  const toggleUnit = useCallback((id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!parseResult) return;
    const factionData = FACTIONS.find(f => f.id === faction);
    const json = generateFactionJson(
      faction,
      factionData?.name || faction,
      parseResult.units,
      sectionInput || undefined
    );

    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sectionSlug = sectionInput ? `_${sectionInput.toLowerCase().replace(/\s+/g, '_')}` : '';
    a.download = `${faction}${sectionSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [parseResult, faction, sectionInput]);

  const handleCopyJson = useCallback(() => {
    if (!parseResult) return;
    const factionData = FACTIONS.find(f => f.id === faction);
    const json = generateFactionJson(
      faction,
      factionData?.name || faction,
      parseResult.units,
      sectionInput || undefined
    );
    navigator.clipboard.writeText(json);
  }, [parseResult, faction, sectionInput]);

  const handleInsertSection = useCallback(() => {
    const sectionText = `SECTION: ${sectionInput || 'Section Name'}\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = inputText.substring(0, start) + sectionText + inputText.substring(end);
      setInputText(newText);
      // Move cursor after the inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + sectionText.length, start + sectionText.length);
      }, 0);
    } else {
      setInputText(sectionText + inputText);
    }
  }, [sectionInput, inputText]);

  return (
    <Terminal hideHeader>
      <div className="parser-container">
        <div className="parser-header">
          <pre className="parser-title-box terminal-glow">
{`╔══════════════════════════════════════════════════════════════════════════╗
║  NEW SIGHTINGS REPORTING v3.6b - DREKFORT M.D.C. INTELLIGENCE DIVISION   ║
║  MAIN THREATS DIRECTORATE - CLASSIFICATION & INFORMATION STAGING         ║
╚══════════════════════════════════════════════════════════════════════════╝`}
          </pre>
        </div>

        <div className="parser-controls">
          <div className="parser-control-group">
            <label>Faction:</label>
            <select
              value={faction}
              onChange={e => setFaction(e.target.value)}
              className="parser-select"
            >
              {FACTIONS.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="parser-control-group parser-section-group">
            <label>Section:</label>
            <input
              type="text"
              value={sectionInput}
              onChange={e => setSectionInput(e.target.value)}
              className="parser-input"
              placeholder="e.g., Core Units, Scenario Units..."
            />
            <button
              className="parser-btn parser-btn-small"
              onClick={handleInsertSection}
              title="Insert SECTION: marker at cursor position"
            >
              [ Insert SECTION: ]
            </button>
          </div>
        </div>

        <div className="parser-button-row parser-main-buttons">
          <button className="parser-btn" onClick={handleParse}>
            [ PARSE ]
          </button>
          <button className="parser-btn parser-btn-dim" onClick={handleClear}>
            [ CLEAR ]
          </button>
          <span className="parser-button-spacer" />
          <button
            className="parser-btn"
            onClick={handleExport}
            disabled={!parseResult || parseResult.units.length === 0}
          >
            [ EXPORT JSON ]
          </button>
          <button
            className="parser-btn"
            onClick={handleCopyJson}
            disabled={!parseResult || parseResult.units.length === 0}
          >
            [ COPY TO CLIPBOARD ]
          </button>
        </div>

        <div className="parser-split">
          {/* Left: Input */}
          <div className="parser-input-section">
            <div className="parser-section-header">RAW FIELD REPORT</div>
            <textarea
              ref={textareaRef}
              className="parser-textarea"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste copied text from PDF here...

You can add SECTION: markers to organize units, e.g.:
SECTION: Core Units
(paste units here)

SECTION: Support Units
(paste more units here)

Or use INFANTRY - Light Infantry style headers from Quick Reference."
              spellCheck={false}
            />
            </div>

          {/* Right: Output */}
          <div className="parser-output-section">
            <div className="parser-section-header">CLASSIFIED UNIT DATA</div>
            <div className="parser-output">
              {!parseResult && (
                <div className="parser-placeholder">
                  Parsed units will appear here...
                </div>
              )}

              {parseResult && (
                <>
                  {/* Errors */}
                  {parseResult.errors.length > 0 && (
                    <div className="parser-errors">
                      {parseResult.errors.map((err, i) => (
                        <div key={i} className="parser-error">[ERROR] {err}</div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {parseResult.warnings.length > 0 && (
                    <div className="parser-warnings">
                      {parseResult.warnings.map((warn, i) => (
                        <div key={i} className="parser-warning">[WARN] {warn}</div>
                      ))}
                    </div>
                  )}

                  {/* Units */}
                  <div className="parser-units">
                    {parseResult.units.map(unit => (
                      <UnitCard
                        key={unit.id}
                        unit={unit}
                        expanded={expandedUnits.has(unit.id)}
                        onToggle={() => toggleUnit(unit.id)}
                      />
                    ))}
                  </div>

                  {/* Footer */}
                  {parseResult.footer && (
                    <div className="parser-footer-detected">
                      Detected footer: {parseResult.footer}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="parser-summary">
                    ─────────────────────────────────
                    <br />
                    Parsed {parseResult.units.length} unit(s)
                    {parseResult.errors.length > 0 && `, ${parseResult.errors.length} error(s)`}
                    {parseResult.warnings.length > 0 && `, ${parseResult.warnings.length} warning(s)`}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .parser-container {
          padding: 1rem;
          min-height: calc(100vh - 120px);
        }

        .parser-header {
          margin-bottom: 1rem;
        }

        .parser-title-box {
          color: var(--terminal-bright);
          text-align: center;
          margin: 0;
          line-height: 1.2;
        }

        .parser-main-buttons {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 0.5rem;
          border: 1px solid var(--terminal-dim);
          background: rgba(255, 176, 0, 0.03);
        }

        .parser-button-spacer {
          flex: 1;
        }

        .parser-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .parser-btn:disabled:hover {
          background: transparent;
          color: var(--terminal-fg);
        }

        .parser-controls {
          display: flex;
          gap: 2rem;
          margin-bottom: 1rem;
          padding: 0.5rem;
          border: 1px solid var(--terminal-dim);
        }

        .parser-control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .parser-control-group label {
          color: var(--terminal-dim);
        }

        .parser-section-group {
          flex: 1;
        }

        .parser-select,
        .parser-input {
          background: var(--terminal-bg);
          color: var(--terminal-fg);
          border: 1px solid var(--terminal-dim);
          padding: 0.25rem 0.5rem;
          font-family: inherit;
          font-size: inherit;
        }

        .parser-input {
          flex: 1;
          min-width: 200px;
        }

        .parser-input::placeholder {
          color: var(--terminal-dim);
        }

        .parser-select:focus,
        .parser-input:focus {
          outline: none;
          border-color: var(--terminal-bright);
        }

        .parser-btn-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.9em;
        }

        .parser-split {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .parser-input-section,
        .parser-output-section {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .parser-section-header {
          color: var(--terminal-bright);
          margin-bottom: 0.5rem;
          border-bottom: 1px solid var(--terminal-dim);
          padding-bottom: 0.25rem;
        }

        .parser-textarea {
          flex: 1;
          min-height: 400px;
          background: var(--terminal-bg);
          color: var(--terminal-fg);
          border: 1px solid var(--terminal-dim);
          padding: 0.5rem;
          font-family: inherit;
          font-size: inherit;
          resize: vertical;
        }

        .parser-textarea:focus {
          outline: none;
          border-color: var(--terminal-bright);
        }

        .parser-textarea::placeholder {
          color: var(--terminal-dim);
        }

        .parser-button-row {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .parser-btn {
          background: transparent;
          color: var(--terminal-fg);
          border: 1px solid var(--terminal-fg);
          padding: 0.5rem 1rem;
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .parser-btn:hover {
          background: var(--terminal-fg);
          color: var(--terminal-bg);
        }

        .parser-btn-dim {
          color: var(--terminal-dim);
          border-color: var(--terminal-dim);
        }

        .parser-btn-dim:hover {
          background: var(--terminal-dim);
        }

        .parser-output {
          flex: 1;
          min-height: 400px;
          border: 1px solid var(--terminal-dim);
          padding: 0.5rem;
          overflow-y: auto;
        }

        .parser-placeholder {
          color: var(--terminal-dim);
          font-style: italic;
        }

        .parser-errors,
        .parser-warnings {
          margin-bottom: 0.5rem;
        }

        .parser-error {
          color: #ff6b6b;
        }

        .parser-warning {
          color: #ffd93d;
        }

        .parser-units {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .parser-footer-detected {
          margin-top: 1rem;
          padding: 0.5rem;
          border: 1px dashed var(--terminal-dim);
          color: var(--terminal-dim);
        }

        .parser-summary {
          margin-top: 1rem;
          color: var(--terminal-dim);
        }

        .parser-export-row {
          display: flex;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--terminal-dim);
        }

        /* Unit Card */
        .unit-card {
          border: 1px solid var(--terminal-dim);
          background: rgba(255, 176, 0, 0.05);
        }

        .unit-card-header {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          cursor: pointer;
          user-select: none;
        }

        .unit-card-header:hover {
          background: rgba(255, 176, 0, 0.1);
        }

        .unit-card-toggle {
          margin-right: 0.5rem;
          color: var(--terminal-dim);
        }

        .unit-card-name {
          flex: 1;
          color: var(--terminal-bright);
        }

        .unit-card-meta {
          color: var(--terminal-dim);
          font-size: 0.9em;
        }

        .unit-card-body {
          padding: 0.5rem;
          padding-top: 0;
          border-top: 1px dashed var(--terminal-dim);
        }

        .unit-card-row {
          display: flex;
          gap: 0.5rem;
          margin: 0.25rem 0;
        }

        .unit-card-label {
          color: var(--terminal-dim);
          min-width: 80px;
        }

        .unit-card-value {
          color: var(--terminal-fg);
        }

        .unit-card-section {
          color: var(--terminal-bright);
          font-style: italic;
        }

        .unit-card-description {
          flex-direction: column;
          align-items: flex-start;
        }

        .unit-card-description .unit-card-value {
          color: var(--terminal-dim);
          font-size: 0.9em;
          margin-top: 0.25rem;
          padding: 0.5rem;
          border-left: 2px solid var(--terminal-dim);
          background: rgba(255, 176, 0, 0.03);
        }

        .unit-card-weapons {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dotted var(--terminal-dim);
        }

        .weapon-item {
          margin: 0.25rem 0;
          padding-left: 1rem;
        }

        .weapon-name {
          color: var(--terminal-bright);
        }

        .weapon-stats {
          color: var(--terminal-fg);
          margin-left: 1rem;
        }

        .weapon-abilities {
          color: var(--terminal-dim);
          margin-left: 1rem;
          font-size: 0.9em;
        }

        .sub-weapon {
          margin-left: 2rem;
          color: var(--terminal-dim);
        }

        .sub-weapon .weapon-name {
          color: var(--terminal-fg);
        }

        .sub-weapon::before {
          content: '→ ';
          color: var(--terminal-dim);
        }
      `}</style>
    </Terminal>
  );
}

// Unit Card Component
function UnitCard({
  unit,
  expanded,
  onToggle
}: {
  unit: ParsedUnit;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="unit-card">
      <div className="unit-card-header" onClick={onToggle}>
        <span className="unit-card-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="unit-card-name">{unit.name}</span>
        <span className="unit-card-meta">
          {unit.points} pts | {unit.unitType}
        </span>
      </div>

      {expanded && (
        <div className="unit-card-body">
          {unit.section && (
            <div className="unit-card-row">
              <span className="unit-card-label">Section:</span>
              <span className="unit-card-value unit-card-section">{unit.section}</span>
            </div>
          )}

          <div className="unit-card-row">
            <span className="unit-card-label">Category:</span>
            <span className="unit-card-value">{unit.category}</span>
          </div>

          {unit.stats && (
            <div className="unit-card-row">
              <span className="unit-card-label">Stats:</span>
              <span className="unit-card-value">
                {unit.stats.type}, H{unit.stats.height}, {unit.stats.spot}, {unit.stats.move}, Q{unit.stats.quality}, {unit.stats.toughness}
                {unit.stats.command !== undefined && `, C${unit.stats.command}`}
              </span>
            </div>
          )}

          {unit.abilities.length > 0 && (
            <div className="unit-card-row">
              <span className="unit-card-label">Abilities:</span>
              <span className="unit-card-value">{unit.abilities.join(', ')}</span>
            </div>
          )}

          {unit.description && (
            <div className="unit-card-row unit-card-description">
              <span className="unit-card-label">Description:</span>
              <span className="unit-card-value">
                {unit.description}
              </span>
            </div>
          )}

          {unit.weapons.length > 0 && (
            <div className="unit-card-weapons">
              <span className="unit-card-label">Weapons ({unit.weapons.length}):</span>
              {unit.weapons.map((weapon, i) => (
                <WeaponItem key={i} weapon={weapon} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Weapon Item Component
function WeaponItem({ weapon }: { weapon: ParsedWeapon }) {
  return (
    <div className="weapon-item">
      <div className="weapon-name">• {weapon.name}</div>
      <div className="weapon-stats">
        {[
          weapon.targets,
          weapon.range,
          weapon.accuracy,
          weapon.strength,
          weapon.damage,
          weapon.ammo ? `Ammo ${weapon.ammo}` : null
        ].filter(Boolean).join(', ')}
      </div>
      {weapon.abilities.length > 0 && (
        <div className="weapon-abilities">{weapon.abilities.join(', ')}</div>
      )}
      {weapon.subWeapons && weapon.subWeapons.map((sub, i) => (
        <div key={i} className="sub-weapon">
          <span className="weapon-name">{sub.name}</span>
          <div className="weapon-stats">
            {[
              sub.targets,
              sub.range,
              sub.accuracy,
              sub.strength,
              sub.damage
            ].filter(Boolean).join(', ')}
          </div>
          {sub.abilities.length > 0 && (
            <div className="weapon-abilities">{sub.abilities.join(', ')}</div>
          )}
        </div>
      ))}
    </div>
  );
}
