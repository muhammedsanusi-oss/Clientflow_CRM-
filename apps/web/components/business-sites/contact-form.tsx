"use client";
import { useState } from "react";

export function ContactForm({ businessId, preview = false }: { businessId?: string; preview?: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  return <form className="site-contact-form" aria-busy={status === "sending"} onSubmit={async event => {
    event.preventDefault();
    if (preview || !businessId) { setError("This is a preview. Create the business to test sending a message."); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending"); setError("");
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(businessId)}/contact`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Your message could not be sent."); setStatus("idle"); return; }
      form.reset(); setStatus("sent");
    } catch { setError("Check your connection and try again."); setStatus("idle"); }
  }}>
    <div className="site-form-row">
      <label>Your name<input name="name" autoComplete="name" required maxLength={100} placeholder="Alex Morgan" /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
    </div>
    <label>Phone <span className="site-optional">(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="Your contact number" /></label>
    <label>Your message<textarea name="message" required minLength={10} maxLength={2000} rows={4} placeholder="Tell us a little about what you have in mind…" /></label>
    <div className="site-honeypot" aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    {error && <p role="alert" className="site-form-error">{error}</p>}
    {status === "sent" && <p role="status" className="site-form-success">Thanks for reaching out. Your message has been delivered to the business.</p>}
    <button className="site-button" disabled={status === "sending"} type="submit">{status === "sending" ? "Sending…" : "Send a message"}<span aria-hidden="true">↗</span></button>
    <p className="site-form-note">Your message goes directly to this business&apos;s private Clientflow inbox.</p>
  </form>;
}
