"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CreateNoteClient() {
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);

  const onCreate = async () => {
    try {
      setIsCreating(true);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          contentJson: { type: "doc", content: [] },
        }),
      });
      if (!res.ok) throw new Error("Failed to create note");
      const data = await res.json();
      router.push(`/notes/${data.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button onClick={onCreate} disabled={isCreating}>
      {isCreating ? "Creating…" : "New note"}
    </Button>
  );
}


