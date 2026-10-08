/** Shared shell for the Privacy Policy and Terms of Service pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="legal">
      {/* A real navigation (not <Link>) so the page transition plays on the way back, like it does on the way in. */}
      <a href="/" className="legal-back">
        ← Back to Quantdle
      </a>
      <h1>{title}</h1>
      <p className="muted small">Last updated {updated}</p>
      {children}
    </main>
  );
}
