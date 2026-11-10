"use client";

import { useState, type FormEvent } from "react";
import { submitWebsiteFeatureRequestAction } from "./actions";

export function WebsiteFeatureRequestForm({ businessId, initialCount, limit }: {
  businessId: string;
  initialCount: number;
  limit: number | null;
}) {
  const [requestCount, setRequestCount] = useState(initialCount);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const limitReached = limit !== null && requestCount >= limit;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await submitWebsiteFeatureRequestAction(businessId, { title, description });
      if (result.error) {
        setError(result.error.message);
      } else if (result.result) {
        setRequestCount(result.result.requestCount);
        setTitle("");
        setDescription("");
        setMessage("Your request was saved for future review. Submission does not guarantee implementation.");
      }
    } catch {
      setError("Your feature request could not be submitted. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="feature-request-title">
    <div className="mb-4">
      <h2 id="feature-request-title" className="text-lg font-semibold">Request a website feature</h2>
      <p className="mt-1 text-sm text-slate-600">
        {limit === null ? `${requestCount} request${requestCount === 1 ? "" : "s"} submitted.`
          : `${requestCount} of ${limit} feature requests used.`}
        {" "}Requests are private and are not promises to build a feature.
      </p>
    </div>
    {message && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {limitReached ? <p className="text-sm text-slate-600">You have used the Plus plan feature-request allowance.</p> : <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Feature title
        <input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
      </label>
      <label className="block text-sm font-medium text-slate-700">Describe the feature
        <textarea required maxLength={2000} rows={4} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Submitting…" : "Submit feature request"}
      </button>
    </form>}
  </section>;
}
