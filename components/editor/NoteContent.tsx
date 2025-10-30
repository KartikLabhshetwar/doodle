'use client'

import * as React from 'react'
import NoteEditor from './NoteEditor'
import { TipTapDocType } from '@/lib/validation'

type Props = {
  noteId: string
  initialContent: TipTapDocType
}

export default function NoteContent({ noteId, initialContent }: Props) {
  const [saving, setSaving] = React.useState(false)
  const saveRef = React.useRef<number | undefined>(undefined)

  const handleChange = React.useCallback((json: any) => {
    window.clearTimeout(saveRef.current)
    saveRef.current = window.setTimeout(async () => {
      try {
        setSaving(true)
        await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentJson: json }),
        })
      } finally {
        setSaving(false)
      }
    }, 600)
  }, [noteId])

  return (
    <div className="flex flex-col gap-2">
      <NoteEditor initialContent={initialContent} onChange={handleChange} />
      {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
    </div>
  )
}


