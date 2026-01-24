import { Terminal, Separator } from '../components/Terminal';

export function Privacy() {
  return (
    <Terminal>
      <pre className="terminal-glow text-sm mb-4">
{`╔══════════════════════════════════════════════════════════════════════════╗
║  PRIVACY POLICY - DATA HANDLING PROCEDURES                               ║
╚══════════════════════════════════════════════════════════════════════════╝`}
      </pre>

      <div className="space-y-4 text-sm max-w-3xl">
        <section>
          <h2 className="text-bright terminal-glow mb-2">1. DATA CONTROLLER</h2>
          <p className="text-dim">
            This application ("BLUEBIRD TERMINAL") is operated as a fan project for the
            Firelock 198X tabletop wargame. For privacy inquiries, please use the
            [REPORT ISSUE] function in the footer.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-bright terminal-glow mb-2">2. DATA WE COLLECT</h2>
          <p className="mb-2">We collect minimal data necessary to operate the service:</p>
          <ul className="list-none space-y-1 text-dim">
            <li>► <span className="text-[var(--terminal-fg)]">Local Storage:</span> Your consent preferences (stored in your browser only)</li>
            <li>► <span className="text-[var(--terminal-fg)]">Server Logs:</span> Standard web server logs (IP address, timestamp, pages visited) for security purposes</li>
          </ul>
          <p className="mt-2 text-dim">
            Army lists are created locally in your browser and downloaded as text files.
            No army list data is transmitted to or stored on our servers.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-bright terminal-glow mb-2">3. DATA WE DO NOT COLLECT</h2>
          <ul className="list-none space-y-1 text-dim">
            <li>► No email addresses or personal identifiers</li>
            <li>► No tracking cookies or analytics</li>
            <li>► No third-party advertising</li>
            <li>► No data sharing with external parties</li>
          </ul>
        </section>

        <Separator />

        <section>
          <h2 className="text-bright terminal-glow mb-2">4. DATA RETENTION</h2>
          <p className="text-dim">
            Local storage data remains in your browser until you clear it.
            Server logs are retained for 30 days for security purposes.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-bright terminal-glow mb-2">5. YOUR RIGHTS</h2>
          <p className="mb-2">Under GDPR, you have the right to:</p>
          <ul className="list-none space-y-1 text-dim">
            <li>► Access your data</li>
            <li>► Request deletion of your data</li>
            <li>► Withdraw consent at any time</li>
          </ul>
          <p className="mt-2 text-dim">
            To exercise these rights, use the [REPORT ISSUE] button or clear your browser's local storage.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-bright terminal-glow mb-2">6. CLOUDFLARE</h2>
          <p className="text-dim">
            This site is served through Cloudflare, which may collect standard web traffic data
            for security and performance purposes. See{' '}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-bright"
            >
              Cloudflare's Privacy Policy
            </a>{' '}
            for details.
          </p>
        </section>

        <Separator />

        <p className="text-dim text-xs">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="mt-4">
          <a
            href="/"
            className="text-bright hover:terminal-glow"
          >
            ← RETURN TO TERMINAL
          </a>
        </div>
      </div>
    </Terminal>
  );
}
