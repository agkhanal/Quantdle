import { isAdmin } from "@/lib/admins";

/** A small "admin" tag shown next to an admin's username, wherever it appears. Renders nothing for everyone else. */
export function AdminTag({ username }: { username: string | null | undefined }) {
  if (!isAdmin(username)) return null;
  return (
    <span className="admin-tag" title="Admin">
      admin
    </span>
  );
}
