import { PlusIcon } from "lucide-react"
import { createNote } from "@/app/notes/actions"

export default function NewNoteCard() {
  return (
    <form action={createNote} className="w-full">
      <button type="submit" className="group relative w-full text-left h-auto p-0">
        <div className="rounded-xl border p-4 transition-colors group-hover:bg-muted/40">
          <div className="flex items-center gap-2 truncate text-lg font-semibold">
            <PlusIcon className="size-4 shrink-0" />
            <span className="truncate">New Page</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Create a new page</div>
        </div>
      </button>
    </form>
  )
}


