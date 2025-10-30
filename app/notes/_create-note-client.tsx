"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  children?: ReactNode;
} & ComponentProps<typeof Button>;

export default function CreateNoteClient({ children, ...buttonProps }: Props) {
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
    <Button onClick={onCreate} disabled={isCreating} {...buttonProps}>
      {isCreating ? "Creating…" : children ?? "New note"}
    </Button>
  );
}


