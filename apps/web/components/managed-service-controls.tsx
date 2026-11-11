"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline-indigo-600";
const buttonClass = "rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50";
function useMutation() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/managed-service", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Could not save the request."); return false; }
      router.refresh(); return true;
    } catch { setError("Could not reach the server. Your changes were not confirmed. Try again."); return false; }
    finally { setBusy(false); }
  }
  return { busy, error, send };
}

export function ManagedRequestForm({ businessId }: { businessId: string }) {
  const mutation = useMutation();
  const submissionKey = useRef<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return <form onSubmit={async event => {
    event.preventDefault(); submissionKey.current ??= crypto.randomUUID();
    if (await mutation.send({ action: "CREATE", businessId, submissionKey: submissionKey.current, title, description })) {
      setTitle(""); setDescription(""); submissionKey.current = null;
    }
  }} aria-busy={mutation.busy} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
    <fieldset disabled={mutation.busy} className="space-y-4">
      <legend className="text-xl font-semibold">Request a content change</legend>
      <p className="text-sm text-slate-600">Tell us which existing content to update and what it should say. Text, hours, contact details, prices, and supplied photo replacements are included. New features and redesigns require a separate quote.</p>
      <label className="block text-sm font-medium">Title<input required maxLength={150} value={title} onChange={event => { setTitle(event.target.value); submissionKey.current = null; }} className={inputClass} /></label>
      <label className="block text-sm font-medium">Requested change<textarea required maxLength={4000} rows={4} value={description} onChange={event => { setDescription(event.target.value); submissionKey.current = null; }} className={inputClass} /></label>
      <button className={buttonClass} type="submit">{mutation.busy ? "Submitting…" : "Submit content request"}</button>
    </fieldset>
    {mutation.error && <p role="alert" className="text-sm text-red-700">{mutation.error}</p>}
  </form>;
}

export function ManagedRequestControls({ businessId, requestId, version, status, developer, owner, eligible, entries }: {
  businessId: string; requestId: string; version: number; status: string; developer: boolean; owner: boolean; eligible: boolean;
  entries: Array<{ id: string; minutes: number; month: string; voided: boolean }>;
}) {
  const mutation = useMutation();
  const options: Array<{ value: string; label: string }> = [];
  if (developer) {
    if (eligible && status === "SUBMITTED") options.push({ value: "START", label: "Start work" });
    if (eligible && status === "IN_PROGRESS") options.push({ value: "LOG_TIME", label: "Record content-change time" }, { value: "COMPLETE", label: "Complete request" });
    if (status === "SUBMITTED" || status === "IN_PROGRESS") options.push({ value: "DECLINE", label: "Decline request" });
    if (status !== "COMPLETED" && entries.some(entry => !entry.voided)) options.push({ value: "VOID_TIME", label: "Correct an erroneous time entry" });
  }
  if (owner && status === "SUBMITTED") options.push({ value: "CANCEL", label: "Cancel submitted request" });
  const [selected, setSelected] = useState(options[0]?.value ?? "");
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState("1");
  const [entryId, setEntryId] = useState(entries.find(entry => !entry.voided)?.id ?? "");
  if (!options.length) return null;
  const requiresNote = !["START", "CANCEL"].includes(selected);
  return <form onSubmit={async event => {
    event.preventDefault();
    await mutation.send({ action: selected, businessId, requestId, expectedVersion: version,
      ...(requiresNote ? { note } : {}), ...(selected === "LOG_TIME" ? { minutes: Number(minutes) } : {}), ...(selected === "VOID_TIME" ? { entryId } : {}),
    });
  }} aria-busy={mutation.busy} className="mt-5 space-y-3 border-t border-slate-200 pt-4">
    <fieldset disabled={mutation.busy} className="space-y-3">
      <legend className="text-sm font-semibold">Request actions</legend>
      <label className="block text-sm">Action<select value={selected} onChange={event => setSelected(event.target.value)} className={inputClass}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {selected === "LOG_TIME" && <><label className="block text-sm">Content-change minutes<input type="number" min={1} max={30} step={1} required value={minutes} onChange={event => setMinutes(event.target.value)} className={inputClass} /></label><p className="text-sm text-slate-600">Record only time spent on requested content changes. Platform bug fixes and owners’ own edits do not use this allowance.</p></>}
      {selected === "VOID_TIME" && <label className="block text-sm">Entry to void<select required value={entryId} onChange={event => setEntryId(event.target.value)} className={inputClass}>{entries.filter(entry => !entry.voided).map(entry => <option key={entry.id} value={entry.id}>{entry.month}: {entry.minutes} minutes</option>)}</select></label>}
      {requiresNote && <label className="block text-sm">{selected === "COMPLETE" ? "Completion note — describe the published change" : selected === "DECLINE" || selected === "VOID_TIME" ? "Reason" : "Work performed"}<textarea required maxLength={4000} rows={3} value={note} onChange={event => setNote(event.target.value)} className={inputClass} /></label>}
      <button type="submit" className={buttonClass}>{mutation.busy ? "Saving…" : options.find(option => option.value === selected)?.label}</button>
    </fieldset>
    {mutation.error && <p role="alert" className="text-sm text-red-700">{mutation.error}</p>}
  </form>;
}
