import React, { useState, useEffect } from 'react';
import { parser } from '../../utils/armyListParser/parser.js';

interface DebugPanelProps {
  text: string;
  selectedFaction: string | null;
  factionLoadingStatus: Record<string, { loaded: boolean; error?: string }>;
  validationErrors?: Array<{ line: number; message: string; type: string }>;
}

interface ParseNode {
  name: string;
  from: number;
  to: number;
  text: string;
  children: ParseNode[];
}

/**
 * Debug panel for viewing parser output and internal state.
 * Toggle with the DEBUG button in the editor header.
 */
export function DebugPanel({
  text,
  selectedFaction,
  factionLoadingStatus,
  validationErrors = [],
}: DebugPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [parseTree, setParseTree] = useState<ParseNode[]>([]);
  const [parseTime, setParseTime] = useState(0);

  // Parse the text and build a readable tree
  useEffect(() => {
    if (!text) {
      setParseTree([]);
      return;
    }

    const start = performance.now();
    try {
      const tree = parser.parse(text);
      const nodes: ParseNode[] = [];

      const cursor = tree.cursor();
      const stack: ParseNode[] = [];

      do {
        const node: ParseNode = {
          name: cursor.name,
          from: cursor.from,
          to: cursor.to,
          text: text.substring(cursor.from, cursor.to).substring(0, 50),
          children: [],
        };

        // Find parent based on position
        while (stack.length > 0 && stack[stack.length - 1].to <= cursor.from) {
          stack.pop();
        }

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          nodes.push(node);
        }

        stack.push(node);
      } while (cursor.next());

      setParseTree(nodes);
    } catch (e) {
      setParseTree([{ name: 'ERROR', from: 0, to: 0, text: String(e), children: [] }]);
    }
    setParseTime(performance.now() - start);
  }, [text]);

  // Box-drawing characters
  const BOX = {
    topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║',
  };

  const renderNode = (node: ParseNode, depth: number = 0): React.ReactElement => {
    const indent = '  '.repeat(depth);
    const textPreview = node.text.replace(/\n/g, '↵').substring(0, 30);

    return (
      <div key={`${node.name}-${node.from}`} className="font-mono text-xs">
        <span className="text-dim">{indent}</span>
        <span className="text-bright">{node.name}</span>
        <span className="text-dim"> [{node.from}:{node.to}]</span>
        {node.children.length === 0 && (
          <span className="text-green-500"> "{textPreview}"</span>
        )}
        {node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  const innerWidth = 60;
  const headerText = ' DEBUG CONSOLE ';
  const topBorder = `${BOX.topLeft}${BOX.horizontal.repeat(Math.floor((innerWidth - headerText.length) / 2))}${headerText}${BOX.horizontal.repeat(Math.ceil((innerWidth - headerText.length) / 2))}${BOX.topRight}`;
  const bottomBorder = `${BOX.bottomLeft}${BOX.horizontal.repeat(innerWidth)}${BOX.bottomRight}`;

  return (
    <div className="font-mono mt-4">
      {/* Header */}
      <div
        className="text-dim whitespace-pre text-xs cursor-pointer hover:text-text"
        onClick={() => setExpanded(!expanded)}
      >
        {topBorder}
      </div>

      {expanded && (
        <>
          {/* Faction Status */}
          <div className="flex text-xs border-l border-r border-dim">
            <span className="text-dim">{BOX.vertical}</span>
            <div className="flex-1 px-2 py-1">
              <div className="text-bright mb-1">FACTION STATUS</div>
              <div className="text-dim">
                Selected: <span className={selectedFaction ? 'text-green-500' : 'text-red-500'}>
                  {selectedFaction || 'NONE'}
                </span>
              </div>
              {Object.entries(factionLoadingStatus).map(([id, status]) => (
                <div key={id} className="text-dim">
                  {id}: {status.loaded ? (
                    <span className="text-green-500">✓ loaded</span>
                  ) : status.error ? (
                    <span className="text-red-500">✗ {status.error}</span>
                  ) : (
                    <span className="text-yellow-500">loading...</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-dim">{BOX.vertical}</span>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="flex text-xs border-l border-r border-dim">
              <span className="text-dim">{BOX.vertical}</span>
              <div className="flex-1 px-2 py-1">
                <div className="text-bright mb-1">VALIDATION ERRORS ({validationErrors.length})</div>
                {validationErrors.slice(0, 10).map((err, i) => (
                  <div key={i} className="text-red-500">
                    L{err.line}: [{err.type}] {err.message}
                  </div>
                ))}
                {validationErrors.length > 10 && (
                  <div className="text-dim">...and {validationErrors.length - 10} more</div>
                )}
              </div>
              <span className="text-dim">{BOX.vertical}</span>
            </div>
          )}

          {/* Parse Tree */}
          <div className="flex text-xs border-l border-r border-dim">
            <span className="text-dim">{BOX.vertical}</span>
            <div className="flex-1 px-2 py-1 max-h-64 overflow-auto">
              <div className="text-bright mb-1">
                PARSE TREE <span className="text-dim">({parseTime.toFixed(1)}ms)</span>
              </div>
              {parseTree.length > 0 ? (
                parseTree.map(node => renderNode(node))
              ) : (
                <div className="text-dim">No input</div>
              )}
            </div>
            <span className="text-dim">{BOX.vertical}</span>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-dim whitespace-pre text-xs">
        {expanded ? bottomBorder : `${BOX.bottomLeft}${'─'.repeat(innerWidth)}${BOX.bottomRight}`}
      </div>
    </div>
  );
}
