"use client";

import { useEffect, useState } from "react";
import { capture } from "@/lib/analytics";

/**
 * The result card as an image: a preview, plus buttons to copy it (to paste into a post), or share it through the
 * phone's share sheet, or save it as a file. `query` is the card's query string (see lib/shareCard.ts).
 */
export function ShareCard({ query, filename, game, mode }: { query: string; filename: string; game: "puzzle" | "market"; mode: "daily" | "practice" }) {
  const url = `/api/share?${query}`;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");
  const [canShare, setCanShare] = useState(false); // this device can share a file (phones, some desktops)
  const [canCopy, setCanCopy] = useState(false); // this browser can put an image on the clipboard

  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [url]);

  useEffect(() => {
    try {
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "card.png", { type: "image/png" })] }));
    } catch {}
    setCanCopy(typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write));
  }, []);

  function say(text: string) {
    setNote(text);
    setTimeout(() => setNote((n) => (n === text ? "" : n)), 2200);
  }

  const fetchBlob = async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Card failed: ${res.status}`);
    return res.blob();
  };

  async function copy() {
    try {
      // Handing over the promise (not the finished image) keeps Safari happy: the copy starts inside the click.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": fetchBlob() })]);
      capture("result_shared", { game, mode, method: "image-copy" });
      say("Image copied");
    } catch {
      say("Couldn't copy the image");
    }
  }

  async function shareOrSave() {
    try {
      const file = new File([await fetchBlob()], filename, { type: "image/png" });
      if (canShare) {
        await navigator.share({ files: [file], title: "Quantdle" });
        capture("result_shared", { game, mode, method: "image-share" });
        return;
      }
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      capture("result_shared", { game, mode, method: "image-save" });
      say("Image saved");
    } catch (e) {
      if ((e as Error).name !== "AbortError") say("Couldn't save the image"); // closing the share sheet isn't an error
    }
  }

  return (
    <div className="share-card">
      <div className={`share-card-frame${ready ? " ready" : ""}`}>
        {failed ? (
          <p className="muted small">Couldn&apos;t draw the card right now.</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your Quantdle result card" width={1200} height={630} onLoad={() => setReady(true)} onError={() => setFailed(true)} />
        )}
      </div>
      {!failed && (
        <div className="share-card-actions">
          {canCopy && (
            <button className="btn" onClick={copy} disabled={!ready}>
              Copy image
            </button>
          )}
          <button className="btn" onClick={shareOrSave} disabled={!ready}>
            {canShare ? "Share image" : "Save image"}
          </button>
        </div>
      )}
      {note && (
        <p className="muted small share-card-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
