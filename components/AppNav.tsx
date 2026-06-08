import Link from "next/link";

export default function AppNav() {
  return (
    <nav className="fixed right-6 top-6 z-40 flex gap-2 text-sm">
      <Link
        href="/"
        className="rounded border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1.5 backdrop-blur hover:bg-[var(--surface-hover)]"
      >
        Board
      </Link>
      <Link
        href="/visual"
        className="rounded border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1.5 backdrop-blur hover:bg-[var(--surface-hover)]"
      >
        Visual
      </Link>
      <Link
        href="/incidents"
        className="rounded border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1.5 backdrop-blur hover:bg-[var(--surface-hover)]"
      >
        Incidents
      </Link>
    </nav>
  );
}
