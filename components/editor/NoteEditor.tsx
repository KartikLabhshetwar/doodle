'use client'

import * as React from 'react'

type Props = {
  initialContent?: { type: 'markdown'; content: string }
  onChange?: (json: { type: 'markdown'; content: string }) => void
}

export default function NoteEditor({ initialContent, onChange }: Props) {
  const [value, setValue] = React.useState<string>(initialContent?.content ?? '')

  // Debounced notify parent
  const notifyRef = React.useRef<number | undefined>(undefined)
  React.useEffect(() => {
    window.clearTimeout(notifyRef.current)
    notifyRef.current = window.setTimeout(() => {
      onChange?.({ type: 'markdown', content: value })
    }, 300)
    return () => {
      window.clearTimeout(notifyRef.current)
    }
  }, [value, onChange])

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-64 w-full resize-y bg-transparent outline-none focus:outline-none focus:ring-0 border-0 p-0 text-base"
        placeholder="Start writing in markdown..."
        spellCheck={true}
      />
    </div>
  )
}


