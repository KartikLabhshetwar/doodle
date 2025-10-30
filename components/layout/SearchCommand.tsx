"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import IconMagnifier from "@/components/ui/IconMagnifier"

type NoteLink = { id: string; title: string | null }

type Props = {
  notes: NoteLink[]
  asListItem?: boolean
}

export default function SearchCommand({ notes, asListItem = false }: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {asListItem ? (
        <button
          aria-label="Search"
          className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setOpen(true)}
        >
          <IconMagnifier className="size-4" />
          <span>Search</span>
        </button>
      ) : (
        <button
          aria-label="Search"
          className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors"
          onClick={() => setOpen(true)}
        >
          <IconMagnifier className="size-4" />
        </button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search notes or go to..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem
              value="home"
              onSelect={() => {
                setOpen(false)
                router.push("/home")
              }}
            >
              Home
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Notes">
            {notes.map((n) => (
              <CommandItem
                key={n.id}
                value={n.title || "Untitled"}
                onSelect={() => {
                  setOpen(false)
                  router.push(`/notes/${n.id}`)
                }}
              >
                {n.title || "Untitled"}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}


