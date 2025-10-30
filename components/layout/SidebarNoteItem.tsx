"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import IconDotsVertical from "@/components/ui/IconDotsVertical"
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
import { TrashIcon } from 'lucide-react';
import IconFiles from "@/components/ui/IconFiles";

type Props = {
  id: string
  title: string | null
}

export default function SidebarNoteItem({ id, title }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [deleting, setDeleting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  async function handleDelete() {
    try {
      setDeleting(true)
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete note")
      // If we're on the deleted note's page, send user to /home
      if (pathname === `/notes/${id}`) {
        router.push("/home")
      }
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group flex items-center justify-between truncate rounded-md px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      <Link href={`/notes/${id}`} className="min-w-0 flex flex-1 items-center gap-2 truncate text-sm">
        <IconFiles className="size-4 shrink-0" />
        <span className="truncate">{title || "Untitled"}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="More"
            className="opacity-0 group-hover:opacity-100 inline-flex size-6 items-center justify-center rounded-md transition-opacity"
          >
            <IconDotsVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setConfirmOpen(true) }} disabled={deleting}>
                <TrashIcon className="size-4" />
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


