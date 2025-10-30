"use client"

import * as React from "react"
import Link from "next/link"
import IconFiles from "@/components/ui/IconFiles"
import { TrashIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteNote } from "@/app/notes/actions"

type Props = {
  id: string
  title: string | null
  updatedAt: string | Date
}

function formatUpdatedAt(dateLike: string | Date) {
  const d = new Date(dateLike)
  // Deterministic across server/client: fixed locale + UTC timezone
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d)
}

export default function NoteCard({ id, title, updatedAt }: Props) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="group relative rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <Link href={`/notes/${id}`} className="block">
        <div className="flex items-center gap-2 truncate text-lg font-semibold">
          <IconFiles className="size-4 shrink-0" />
          <span className="truncate">{title || "Untitled"}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatUpdatedAt(updatedAt)}
        </div>
      </Link>
      <div className="absolute right-2 top-2 opacity-50 transition-opacity group-hover:opacity-100">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <button
              aria-label="Delete"
              className="hover:bg-muted inline-flex h-7 items-center justify-center rounded-md px-2 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <TrashIcon className="size-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteNote}>
                <input type="hidden" name="id" value={id} />
                <AlertDialogAction asChild>
                  <button type="submit">Delete</button>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}


