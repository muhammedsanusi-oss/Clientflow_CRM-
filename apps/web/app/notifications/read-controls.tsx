"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkNotificationRead({ notificationId }: { notificationId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function markRead() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationId ? { notificationId } : { all: true }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message ?? "Could not update notifications.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update notifications. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <span className="inline-flex flex-col items-start">
    <button type="button" onClick={markRead} disabled={pending} className="text-sm font-semibold text-indigo-700 underline disabled:opacity-50">
      {pending ? "Updating…" : notificationId ? "Mark read" : "Mark all read"}
    </button>
    {error && <span role="alert" className="mt-1 text-xs text-red-700">{error}</span>}
  </span>;
}
