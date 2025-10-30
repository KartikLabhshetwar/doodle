"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "../ui/input";

export default function ByokGroq() {
  const [key, setKey] = React.useState<string>("");
  const [saved, setSaved] = React.useState<boolean>(false);
  const [show, setShow] = React.useState<boolean>(false);

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
        <p className="text-sm text-muted-foreground">Stored locally in your browser.</p>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="gsk_..."
          className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none"
        />
        <Button
          aria-label={show ? "Hide key" : "Show key"}
          onClick={() => setShow((s) => !s)}
          variant="ghost"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
        >
          {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </Button>
      </div>
      <div className="flex items-center justify-between">
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


