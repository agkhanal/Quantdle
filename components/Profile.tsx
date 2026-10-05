"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile, School } from "@/lib/types";
import { Avatar, SchoolLogo } from "./Avatar";
import { SchoolPicker } from "./SchoolPicker";

const linkedinUrl = (handle: string) => `https://www.linkedin.com/in/${handle}`;

/** Shrinks a chosen photo to a small centred square JPEG so uploads stay tiny. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 192, 192);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

function Stats({ p }: { p: Profile }) {
  const played = p.wins + p.losses;
  return (
    <>
      <div className="profile-stats">
        <div>
          <b>{p.points.toLocaleString()}</b>
          <span>Points</span>
        </div>
        <div>
          <b>{p.streak}🔥</b>
          <span>Day streak</span>
        </div>
        <div>
          <b>{p.wins}</b>
          <span>Games won</span>
        </div>
        <div>
          <b>{p.rank ? `#${p.rank}` : "–"}</b>
          <span>All-time rank</span>
        </div>
      </div>
      <p className="muted small profile-sub">
        Best streak {p.bestStreak} · {played > 0 ? `${Math.round((p.wins / played) * 100)}% win rate` : "no games yet"}
      </p>
    </>
  );
}

function Identity({ p, children }: { p: Profile; children?: React.ReactNode }) {
  return (
    <div className="profile-head">
      <Avatar name={p.username} src={p.avatar} size={72} />
      <div className="profile-id">
        <h3>{p.username}</h3>
        {p.school && (
          <div className="profile-school">
            <SchoolLogo school={p.school} size={20} />
            <span>{p.school.name}</span>
          </div>
        )}
        {p.linkedin && (
          <a className="profile-linkedin" href={linkedinUrl(p.linkedin)} target="_blank" rel="noopener noreferrer nofollow">
            in/{p.linkedin.length > 28 ? `${p.linkedin.slice(0, 27)}…` : p.linkedin}
          </a>
        )}
        {children}
      </div>
    </div>
  );
}

/** Your own profile: stats, photo, school and LinkedIn, plus sign out. */
export function ProfilePanel({ user, onChange }: { user: Profile; onChange: (u: Profile | null) => void }) {
  const [school, setSchool] = useState<School | null>(user.school);
  const [linkedin, setLinkedin] = useState(user.linkedin ? linkedinUrl(user.linkedin) : "");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  // Keep the form in step with the server copy (e.g. after a puzzle finishes).
  useEffect(() => {
    setSchool(user.school);
    setLinkedin(user.linkedin ? linkedinUrl(user.linkedin) : "");
  }, [user.school, user.linkedin]);

  const dirty = (school?.id ?? null) !== (user.school?.id ?? null) || linkedin.trim() !== (user.linkedin ? linkedinUrl(user.linkedin) : "");

  async function save() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: school?.id ?? null, linkedin: linkedin.trim() || null }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Couldn't save.");
      onChange(body.profile);
      setNote("Saved.");
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const blob = await shrink(f);
      const res = await fetch("/api/avatar", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Couldn't upload that picture.");
      onChange(body.profile);
    } catch {
      setError("Couldn't read that image. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  async function removePhoto() {
    setBusy(true);
    const res = await fetch("/api/avatar", { method: "DELETE" }).catch(() => null);
    if (res?.ok) onChange((await res.json()).profile);
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    onChange(null);
  }

  return (
    <div className="account profile">
      <Identity p={user}>
        <div className="profile-photo-actions">
          <button className="link" type="button" disabled={busy} onClick={() => file.current?.click()}>
            {user.avatar ? "Change photo" : "Add photo"}
          </button>
          {user.avatar && (
            <button className="link" type="button" disabled={busy} onClick={removePhoto}>
              Remove
            </button>
          )}
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </div>
      </Identity>

      <Stats p={user} />

      <div className="profile-form">
        <div className="field">
          <span>School</span>
          <SchoolPicker value={school} onChange={setSchool} />
        </div>
        <label className="field">
          <span>LinkedIn (optional)</span>
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/your-name" inputMode="url" autoComplete="off" maxLength={200} />
        </label>
        {error && <p className="quote-note bad">{error}</p>}
        {note && !dirty && <p className="muted small">{note}</p>}
        <button className="btn primary wide" disabled={busy || !dirty} onClick={save}>
          {busy ? "…" : "Save profile"}
        </button>
        <p className="muted small">Your photo, school, LinkedIn, points and stats are public: anyone can see them by tapping your name on the leaderboard. Your school earns the points you earn from now on.</p>
      </div>

      {user.admin && <AdminTools me={user} onChange={onChange} />}

      <details className="how-scored">
        <summary>How scoring works</summary>
        <ul>
          <li>Solve a puzzle in six guesses to win points: Easy 10, Medium 20, Hard 35, Expert 50.</li>
          <li>Fewer guesses earn more. Using all six earns half.</li>
          <li>The daily puzzle is worth double, plus +2 per day of streak (up to +20).</li>
          <li>Practice points stop after 100 a day. Wins still count.</li>
          <li>Days reset at 00:00 UTC; weeks start Monday.</li>
        </ul>
      </details>

      <button className="btn wide" onClick={signOut} disabled={busy}>
        Sign out
      </button>
    </div>
  );
}

/** Points tools for admin accounts: add (or remove, with a negative number) points for any player. */
function AdminTools({ me, onChange }: { me: Profile; onChange: (u: Profile | null) => void }) {
  const [username, setUsername] = useState(me.username);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function apply() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), points: Number(points), reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "That didn't work.");
      setNote(`${body.profile.username} now has ${body.profile.points.toLocaleString()} points.`);
      setPoints("");
      if (body.profile.username === me.username) onChange(body.profile);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="how-scored admin-tools">
      <summary>Admin: adjust points</summary>
      <div className="profile-form">
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" maxLength={20} />
        </label>
        <label className="field">
          <span>Points (negative to remove)</span>
          <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" placeholder="10000" autoComplete="off" />
        </label>
        <label className="field">
          <span>Reason (saved in the log)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} autoComplete="off" maxLength={200} />
        </label>
        {error && <p className="quote-note bad">{error}</p>}
        {note && <p className="muted small">{note}</p>}
        <button className="btn primary wide" disabled={busy || !username.trim() || !/^-?\d+$/.test(points.trim()) || Number(points) === 0} onClick={apply}>
          {busy ? "…" : "Apply"}
        </button>
      </div>
    </details>
  );
}

/** Someone else's public profile, opened from the leaderboard. */
export function PublicProfile({ username }: { username: string }) {
  const [p, setP] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/profile?u=${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setP(b.profile))
      .catch(() => setFailed(true));
  }, [username]);

  if (failed) return <p className="muted">Couldn&apos;t load that profile.</p>;
  if (!p) return <p className="muted">Loading…</p>;
  return (
    <div className="account profile">
      <Identity p={p} />
      <Stats p={p} />
    </div>
  );
}
