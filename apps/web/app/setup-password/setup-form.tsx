"use client";
import { useEffect, useRef, useState } from "react";
import { PasswordForm } from "../change-password/password-form";

export function OwnerSetupForm() {
  const [token, setToken] = useState<string | null>(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  if (token === null) return <p role="status">Loading password setup...</p>;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return <p role="alert" className="text-sm text-red-700">This setup link is invalid. Ask your developer for a new link.</p>;
  return <PasswordForm setupToken={token} />;
}
