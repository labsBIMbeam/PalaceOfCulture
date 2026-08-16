// The TCG table napplet — the 600B Timelock TCG's own play.html, bundled by
// `pnpm --filter @600b/web tcg:sync` into public/tcg-table/index.html and mounted in the
// generic napplet host. The artifact is fetched at RUNTIME (same-origin), so neither CI
// nor a build without the TCG repo present ever breaks: no artifact → a friendly notice.
//
// The TCG ships napplet-first: its adapter reads `window.napplet` (our prelude) and treats
// every missing capability as a specified fallback. We add the first-party card-face
// mirror via E1_MIRRORS (sha-named statics under /faces, CORS'd — see the deploy runbook)
// because the public Blossom mirrors don't hold the blobs yet.

import { useEffect, useState } from "react";
import { NappletPanel } from "./NappletPanel";

const ARTIFACT_URL = "/tcg-table/index.html";

export function TcgTablePanel({ onClose }: { onClose: () => void }) {
  const [artifact, setArtifact] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(ARTIFACT_URL)
      .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
      .then((html) => {
        if (active) setArtifact(html);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (missing) {
    return (
      <div className="zap-shell" role="presentation">
        <section className="zap-shell-card">
          <header className="zap-shell-head">
            <span className="zap-shell-title">🃏 Timelock TCG</span>
            <button className="zap-shell-close" onClick={onClose} type="button">
              ×
            </button>
          </header>
          <p className="tcg-shell-missing">
            The table isn't deployed in this build — run{" "}
            <code>pnpm --filter @600b/web tcg:sync</code> (needs the TCG600nap repo next door), then
            rebuild.
          </p>
        </section>
      </div>
    );
  }
  if (!artifact) return null;

  return (
    <NappletPanel
      artifactHtml={artifact}
      frameClassName="tcg-shell-frame"
      nappletId="tcg-table"
      onClose={onClose}
      preludeExtras={`window.E1_MIRRORS = [${JSON.stringify(`${window.location.origin}/faces`)}];`}
      title="🃏 Timelock TCG — practice table"
    />
  );
}
