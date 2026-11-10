"use client";
import { useState } from "react";
import { OwnerSignupForm } from "./signup-form";
import { CustomCrmRequestForm } from "../request-custom-crm/request-form";

export function SignupChoice({ initialChoice }: { initialChoice: "standard" | "tailored" | null }) {
  const [choice, setChoice] = useState(initialChoice);
  return <div className="space-y-6">
    <fieldset className="space-y-3">
      <legend className="mb-3 text-lg font-semibold text-[#172b4d]">How would you like to get started?</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          { key: "standard", title: "Standard website", detail: "Choose a template and plan, create your account, and customize your website." },
          { key: "tailored", title: "Tailored website & CRM", detail: "Tell us what your business needs and choose a preferred callback time. We create your portal after consultation." },
        ] as const).map(option => <label key={option.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 ${choice === option.key ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white"}`}>
          <input type="radio" name="signup_choice" value={option.key} checked={choice === option.key} onChange={() => setChoice(option.key)} className="mt-1 accent-indigo-700" />
          <span><strong className="block text-[#172b4d]">{option.title}</strong><span className="mt-2 block text-sm leading-6 text-slate-600">{option.detail}</span></span>
        </label>)}
      </div>
    </fieldset>
    {choice === "standard" && <OwnerSignupForm />}
    {choice === "tailored" && <section aria-label="Tailored website consultation" className="space-y-4">
      <h2 className="text-xl font-semibold">Let’s talk about your business</h2>
      <p className="text-sm leading-6 text-slate-600">Leave your contact details and preferred callback time. After consultation, our developers create your account and send you a link to set your own portal password.</p>
      <CustomCrmRequestForm />
    </section>}
  </div>;
}
