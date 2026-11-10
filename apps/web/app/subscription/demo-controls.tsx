"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PLANS, type DemoPlan } from "../../../../packages/domain/src/subscription-access";

export function DemoControls({ businessId, version, currentPlan }: { businessId: string; version: number; currentPlan: DemoPlan }) {
  const router = useRouter();
  const [plan, setPlan] = useState<DemoPlan>(currentPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function simulate(scenario: "ENROLL" | "PAY_SUCCESS" | "PAY_FAILURE" | "CANCEL") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/subscription", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, expectedVersion: version, scenario, plan: scenario === "PAY_FAILURE" || scenario === "CANCEL" ? currentPlan : plan }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Could not update the demo subscription."); return; }
      router.refresh();
    } catch { setError("Could not reach the server. Try again."); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy} aria-busy={busy} className="space-y-4">
    <legend className="text-lg font-semibold">Simulated checkout</legend>
    <label className="block">Service
      <select value={plan} onChange={event => setPlan(event.target.value as DemoPlan)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3">
        {Object.entries(DEMO_PLANS).map(([key, value]) => <option value={key} key={key}>{value.label} — ${value.cents / 100}/month</option>)}
      </select>
    </label>
    <p className="text-sm text-slate-600">Standard includes website editing. CRM and Managed also include customers, bookings, calendar, services, and notes. Managed also includes tracked content-change requests and 30 minutes per UTC calendar month.</p>
    <div className="flex flex-wrap gap-3">
      {version === -1 ? <button type="button" onClick={() => simulate("ENROLL")} className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">Enroll in demo billing</button> : <>
        <button type="button" onClick={() => simulate("PAY_SUCCESS")} className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">Simulate successful payment{plan !== currentPlan ? " and change plan" : " / renewal"}</button>
        <button type="button" onClick={() => simulate("PAY_FAILURE")} className="rounded-xl border border-slate-300 px-4 py-3">Simulate failed payment</button>
        <button type="button" onClick={() => simulate("CANCEL")} className="rounded-xl border border-red-300 px-4 py-3 text-red-700">Cancel demo subscription now</button>
      </>}
    </div>
    <p className="text-sm text-slate-600">Failure and cancellation stop private paid access immediately. Published content and stored records remain. Successful payment restores the selected service. Changing plans starts a new month; renewal extends the paid-through date.</p>
    {version === -1 && <p className="text-sm text-amber-800">Enrollment replaces legacy access with pending checkout. Activate a service with simulated successful payment to continue editing or using CRM.</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </fieldset>;
}
