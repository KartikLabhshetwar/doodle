'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

type Props = {
  initialContent?: any
  onChange?: (json: any) => void
}

export default function NoteEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Youtube.configure({
        modestBranding: true,
        controls: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON())
    },
  })

  return (
    <div className="prose prose-neutral max-w-none">
      <EditorContent editor={editor} />
    </div>
  )
}


