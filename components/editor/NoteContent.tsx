'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import NoteEditor from './NoteEditor'
import { MarkdownDocType } from '@/lib/validation'
import FloatingAiChat from '@/components/ai/FloatingAiChat'

type Props = {
  noteId: string
  initialContent: MarkdownDocType
}

export default function NoteContent({ noteId, initialContent }: Props) {
  const queryClient = useQueryClient()
  const [aiChatOpen, setAiChatOpen] = React.useState(false)

  const { data: noteData, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const response = await fetch(`/api/notes/${noteId}`)
      if (!response.ok) throw new Error('Failed to fetch note')
      const data = await response.json()
      return data.note || data
    },
    placeholderData: () => {
      return { contentJson: initialContent }
    },
    enabled: !!noteId,
  })

  // Mutation to save note content
  const saveMutation = useMutation({
    mutationFn: async (contentJson: MarkdownDocType) => {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentJson }),
      })
      if (!response.ok) throw new Error('Failed to save note')
      return response.json()
    },
    onSuccess: (_, contentJson) => {
      queryClient.setQueryData(['note', noteId], (old: any) => {
        if (old) {
          return { ...old, contentJson }
        }
        return { contentJson }
      })
    },
  })

  const saveRef = React.useRef<number | undefined>(undefined)
  const handleChange = React.useCallback((json: any) => {
    window.clearTimeout(saveRef.current)
    saveRef.current = window.setTimeout(() => {
      saveMutation.mutate(json)
    }, 600)
  }, [saveMutation])

  const currentContent = React.useMemo(() => {
    if (noteData?.contentJson) {
      return { ...noteData.contentJson }
    }
    return initialContent
  }, [
    // Depend on the content string to detect actual content changes
    typeof noteData?.contentJson?.content === 'string' ? noteData.contentJson.content : '',
    typeof initialContent?.content === 'string' ? initialContent.content : ''
  ])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const activeElement = document.activeElement
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
          activeElement.closest('[data-note-editor]')
        ) {
          const input = activeElement as HTMLInputElement | HTMLTextAreaElement
          const cursorAtStart = input.selectionStart === 0 && input.selectionEnd === 0
          const isEmpty = input.value.trim() === ''
          
          if (isEmpty || cursorAtStart) {
            e.preventDefault()
            setAiChatOpen(true)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const noteContent = React.useMemo(() => {
    if (typeof currentContent?.content === 'string') {
      return currentContent.content
    }
    if (typeof initialContent?.content === 'string') {
      return initialContent.content
    }
    return ''
  }, [currentContent, initialContent])

  return (
    <div className="flex flex-col gap-2" data-note-editor>
      {isLoading ? (
        <div className="p-4 text-center text-muted-foreground">Loading...</div>
      ) : (
        <>
          <NoteEditor initialContent={currentContent || initialContent} onChange={handleChange} />
          <FloatingAiChat
            open={aiChatOpen}
            onOpenChange={setAiChatOpen}
            noteId={noteId}
            noteContent={noteContent}
            onNoteUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            }}
          />
        </>
      )}
    </div>
  )
}


