import { useState, useEffect } from 'react';

const CONSENT_KEY = 'bluebird-consent';
// Increment this when privacy policy changes require new consent
const CONSENT_VERSION = 1;

/**
 * GDPR-style consent banner in terminal aesthetic.
 * Stores consent in localStorage with version number.
 * When CONSENT_VERSION is incremented, users will be asked to consent again.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    } else {
      try {
        const { version } = JSON.parse(stored);
        if (version < CONSENT_VERSION) {
          setVisible(true); // Policy changed, need new consent
        }
      } catch {
        setVisible(true); // Invalid data, ask again
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION, choice: 'accepted', date: new Date().toISOString() }));
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION, choice: 'declined', date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--terminal-bg)] border-t-2 border-[var(--terminal-fg)]">
      <div className="max-w-4xl mx-auto">
        <pre className="text-xs mb-3 terminal-glow">
{`╔══════════════════════════════════════════════════════════════════════════╗
║  NOTICE: DATA COLLECTION DISCLOSURE                                      ║
╚══════════════════════════════════════════════════════════════════════════╝`}
        </pre>
        <p className="text-sm mb-3">
          This terminal uses local storage to save your preferences.
          No personal data is transmitted to external servers. No tracking cookies are used.
          By continuing, you acknowledge this data handling practice.
        </p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleDecline}
            className="px-4 py-1 text-dim hover:text-bright bg-transparent border border-[var(--terminal-dim)] hover:border-[var(--terminal-fg)] cursor-pointer"
          >
            [DECLINE]
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1 text-bright hover:terminal-glow bg-transparent border border-[var(--terminal-fg)] cursor-pointer"
          >
            [ACCEPT]
          </button>
        </div>
        <p className="text-xs text-dim mt-2">
          For more information, see our <a href="/privacy" className="underline hover:text-bright">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
