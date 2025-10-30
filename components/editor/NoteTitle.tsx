'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

type Props = {
  noteId: string
  initialTitle: string | null
}

export default function NoteTitle({ noteId, initialTitle }: Props) {
  const [title, setTitle] = React.useState(initialTitle ?? '')
  const [saving, setSaving] = React.useState(false)

  // Debounced save
  React.useEffect(() => {
    const controller = new AbortController()
    // Skip first mount when nothing changed
    const id = setTimeout(async () => {
      try {
        setSaving(true)
        await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
          signal: controller.signal,
        })
      } catch {
        // no-op
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => {
      controller.abort()
      clearTimeout(id)
    }
  }, [title, noteId])

  return (
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="h-10 w-full border-none bg-transparent px-0 text-xl font-semibold focus-visible:ring-0"
      />
      {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
    </div>
  )
}


