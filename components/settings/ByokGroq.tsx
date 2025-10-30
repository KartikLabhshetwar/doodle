"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function ByokGroq() {
  const [key, setKey] = React.useState<string>("");
  const [saved, setSaved] = React.useState<boolean>(false);

  React.useEffect(() => {
    const existing = typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
    if (existing) setKey(existing);
  }, []);

  const save = () => {
    localStorage.setItem("groq_api_key", key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">Bring your own GROQ API key</h3>
        <p className="text-sm text-muted-foreground">
          Get a key from <a className="underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq Console</a> and paste it below. It is stored locally in your browser.
        </p>
      </div>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="gsk_..."
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
      />
      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={!key.trim()}>
          {saved ? "Saved" : "Save key"}
        </Button>
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          Get from Groq
        </a>
      </div>
    </div>
  );
}


