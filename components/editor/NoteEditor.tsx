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
    editorProps: {
      attributes: {
        class:
          'ProseMirror prose prose-neutral max-w-none w-full min-h-64 bg-transparent outline-none focus:outline-none focus:ring-0',
        spellcheck: 'true',
      },
    },
  })

  return (
    <div className="prose prose-neutral max-w-none">
      <EditorContent
        editor={editor}
        className="min-h-64 w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 [&_*]:border-0"
      />
    </div>
  )
}


