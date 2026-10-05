import Link from "next/link";

/** Shared shell for the Privacy Policy and Terms of Service pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">
        ← Back to Quantdle
      </Link>
      <h1>{title}</h1>
      <p className="muted small">Last updated {updated}</p>
      {children}
    </main>
  );
}
