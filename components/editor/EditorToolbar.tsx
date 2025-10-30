'use client'

import * as React from 'react'
import ToolbarButton from './ToolbarButton'
import { wrapSelectionInActiveInput, insertAtSelection } from './selection'

type Props = {
  className?: string
  onChangeType?: (type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'numbered' | 'todo') => void
}

export default function EditorToolbar({ className, onChangeType }: Props) {
  const handleBold = () => wrapSelectionInActiveInput('**')
  const handleItalic = () => wrapSelectionInActiveInput('*')
  const handleStrike = () => wrapSelectionInActiveInput('~~')
  const handleInlineCode = () => wrapSelectionInActiveInput('`')
  const handleLink = () => {
    const url = window.prompt('Enter URL')?.trim()
    if (!url) return
    // Insert markdown link: [text](url)
    const sel = document.activeElement as HTMLInputElement | null
    const selectedText = sel && sel.selectionStart !== sel.selectionEnd
      ? sel.value.slice(sel.selectionStart ?? 0, sel.selectionEnd ?? 0)
      : 'link'
    insertAtSelection(`[${selectedText}](${url})`)
  }

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className ?? ''}`}>
      {/* Block-level tools */}
      <ToolbarButton label="H1" onClick={() => onChangeType?.('h1')} />
      <ToolbarButton label="H2" onClick={() => onChangeType?.('h2')} />
      <ToolbarButton label="H3" onClick={() => onChangeType?.('h3')} />
      <ToolbarButton label="P" onClick={() => onChangeType?.('paragraph')} />
      <ToolbarButton label="• List" onClick={() => onChangeType?.('bullet')} />
      <ToolbarButton label="1. List" onClick={() => onChangeType?.('numbered')} />
      <ToolbarButton label="To-do" onClick={() => onChangeType?.('todo')} />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton label="Bold" onClick={handleBold} />
      <ToolbarButton label="Italic" onClick={handleItalic} />
      <ToolbarButton label="Strike" onClick={handleStrike} />
      <ToolbarButton label="Code" onClick={handleInlineCode} />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton label="Link" onClick={handleLink} />
    </div>
  )
}


