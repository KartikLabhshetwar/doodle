'use client'

import * as React from 'react'
import type { BlockType } from '@/lib/validation'
import { wrapSelectionInActiveInput, insertAtSelection } from './selection'

type SlashItem =
  | { key: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'numbered' | 'todo'; label: string; hint: string; kind: 'block' }
  | { key: 'bold' | 'italic' | 'strike' | 'code' | 'link'; label: string; hint: string; kind: 'inline' }

const SLASH_ITEMS: Array<SlashItem> = [
  { key: 'h1', label: 'Heading 1', hint: '#', kind: 'block' },
  { key: 'h2', label: 'Heading 2', hint: '##', kind: 'block' },
  { key: 'h3', label: 'Heading 3', hint: '###', kind: 'block' },
  { key: 'paragraph', label: 'Paragraph', hint: 'plain', kind: 'block' },
  { key: 'bullet', label: 'Bullet list', hint: '- item', kind: 'block' },
  { key: 'numbered', label: 'Numbered list', hint: '1. item', kind: 'block' },
  { key: 'todo', label: 'Todo', hint: '[ ] task', kind: 'block' },
  { key: 'bold', label: 'Bold', hint: '**text**', kind: 'inline' },
  { key: 'italic', label: 'Italic', hint: '*text*', kind: 'inline' },
  { key: 'strike', label: 'Strikethrough', hint: '~~text~~', kind: 'inline' },
  { key: 'code', label: 'Inline code', hint: '`code`', kind: 'inline' },
  { key: 'link', label: 'Link', hint: '[text](url)', kind: 'inline' },
]

type Props = {
  blocks: BlockType[]
  onChangeText: (index: number, text: string) => void
  onToggleTodo: (index: number) => void
  onInsertAfter: (index: number, block?: BlockType) => void
  onDelete: (index: number) => void
  onChangeType: (index: number, type: string) => void
  onMove: (index: number, dir: -1 | 1) => void
  onFocusIndex?: (index: number) => void
}

export default function BlockList(props: Props) {
  const [slashFor, setSlashFor] = React.useState<number | null>(null)
  const [slashIndex, setSlashIndex] = React.useState(0)
  const [slashPos, setSlashPos] = React.useState<{ left: number; top: number } | null>(null)
  const inputsRef = React.useRef<Record<number, HTMLInputElement | null>>({})
  const [menuFor, setMenuFor] = React.useState<number | null>(null)
  const [menuPos, setMenuPos] = React.useState<{ left: number; top: number } | null>(null)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // Close menu if clicking outside any menu
      const target = e.target as HTMLElement | null
      if (!target) return
      if (!target.closest('[data-block-menu]') && !target.closest('[data-block-menu-trigger]')) { setMenuFor(null); setMenuPos(null) }
      if (!target.closest('[data-slash-menu]')) { setSlashFor(null); setSlashPos(null) }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const focusAt = (i: number) => {
    requestAnimationFrame(() => inputsRef.current[i]?.focus())
  }

  return (
    <div className="p-2">
      {props.blocks.map((b, i) => {
        const common = {
          ref: (el: HTMLInputElement | null) => { inputsRef.current[i] = el },
          value: (b as any).text ?? '',
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChangeText(i, e.target.value),
          onFocus: () => props.onFocusIndex?.(i),
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            // When slash menu is open, handle navigation/selection first
            if (slashFor === i) {
              if (e.key === 'Escape') { e.preventDefault(); setSlashFor(null); setSlashPos(null); return }
              if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex((x) => (x + 1) % SLASH_ITEMS.length); return }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex((x) => (x - 1 + SLASH_ITEMS.length) % SLASH_ITEMS.length); return }
              if (e.key === 'Enter') {
                e.preventDefault()
                const item = SLASH_ITEMS[slashIndex]
                if (item) {
                  if (item.kind === 'block') {
                    props.onChangeType(i, item.key)
                  } else {
                    if (item.key === 'bold') wrapSelectionInActiveInput('**')
                    else if (item.key === 'italic') wrapSelectionInActiveInput('*')
                    else if (item.key === 'strike') wrapSelectionInActiveInput('~~')
                    else if (item.key === 'code') wrapSelectionInActiveInput('`')
                    else if (item.key === 'link') {
                      const input = inputsRef.current[i]
                      const start = input?.selectionStart ?? 0
                      const end = input?.selectionEnd ?? 0
                      const current = input?.value ?? ''
                      const sel = current.slice(start, end) || 'link'
                      const url = window.prompt('Enter URL')?.trim()
                      if (url) insertAtSelection(`[${sel}](${url})`)
                    }
                  }
                }
                setSlashFor(null); setSlashPos(null)
                return
              }
            }

            if (e.key === 'Enter') {
              e.preventDefault()
              const current = props.blocks[i]
              let nextBlock: BlockType | undefined
              if (current?.type === 'bullet') nextBlock = { type: 'bullet', text: '' }
              else if (current?.type === 'numbered') nextBlock = { type: 'numbered', index: 1, text: '' }
              else if (current?.type === 'todo') nextBlock = { type: 'todo', checked: false, text: '' }
              props.onInsertAfter(i, nextBlock)
              focusAt(i + 1)
            } else if (e.key === 'Backspace' && (e.currentTarget.selectionStart ?? 0) === 0 && (e.currentTarget.selectionEnd ?? 0) === 0) {
              const current = props.blocks[i]
              if (current && (current.type === 'bullet' || current.type === 'numbered' || current.type === 'todo')) {
                e.preventDefault()
                props.onChangeType(i, 'paragraph')
                focusAt(i)
              } else {
                e.preventDefault()
                if (props.blocks.length > 1) {
                  props.onDelete(i)
                  focusAt(Math.max(0, i - 1))
                }
              }
            } else if (e.key === '/') {
              e.preventDefault()
              setSlashFor(i)
              setSlashIndex(0)
              const input = inputsRef.current[i]
              if (input) {
                const r = input.getBoundingClientRect()
                setSlashPos({ left: Math.max(8, r.left + 12), top: r.bottom + 6 })
              }
            }
          },
          className: 'w-full bg-transparent outline-none focus:outline-none px-0',
          placeholder: placeholderFor(b),
        }

        return (
          <div
            key={i}
            className={`group flex items-center gap-2 px-2 py-1.5 relative ${dragOverIndex === i ? 'bg-accent/40' : ''}`}
            draggable
            onDragStart={(e) => { setDragIndex(i); e.dataTransfer.setData('text/plain', String(i)) }}
            onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i) }}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragIndex
              const to = i
              setDragOverIndex(null)
              setDragIndex(null)
              if (from == null || to == null || from === to) return
              const dir = from < to ? 1 : -1
              const times = Math.abs(to - from)
              for (let t = 0; t < times; t++) props.onMove(from + t * dir, dir)
            }}
          >
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
              <button type="button" className="text-xs px-1" onClick={() => props.onInsertAfter(i)} aria-label="Add">＋</button>
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent/60 bg-accent/30"
                aria-label="More"
                draggable={false}
                data-block-menu-trigger
                onDragStart={(e) => { e.preventDefault() }}
                onMouseDown={(e) => { e.stopPropagation() }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                  setMenuPos({ left: rect.left + rect.width + 6, top: rect.top + rect.height + 4 })
                  setMenuFor(menuFor === i ? null : i)
                }}
              >
                <span className="grid grid-cols-3 gap-[2px]">
                  <span className="w-1 h-1 bg-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full" />
                </span>
              </button>
              {menuFor === i && menuPos ? (
                <div
                  data-block-menu
                  className="z-50 rounded-md border border-border bg-background shadow"
                  style={{ position: 'fixed', left: menuPos.left, top: menuPos.top }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const b = props.blocks[i]; if (b) props.onInsertAfter(i, { ...b } as BlockType); setMenuFor(null); setMenuPos(null) }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onDelete(i); setMenuFor(null); setMenuPos(null) }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
            {b.type === 'todo' ? (
              <input type="checkbox" checked={b.checked} onChange={() => props.onToggleTodo(i)} className="mr-1" />
            ) : b.type === 'numbered' ? (
              <span className="w-6 text-right text-muted-foreground select-none">{b.index}.</span>
            ) : b.type === 'bullet' ? (
              <span className="w-6 text-right text-muted-foreground select-none">•</span>
            ) : (
              <span className="w-6" />
            )}
            <input
              {...common}
              style={styleFor(b)}
            />
            {slashFor === i && slashPos ? (
              <div
                data-slash-menu
                className="w-56 rounded-md border border-border bg-background shadow z-50"
                style={{ position: 'fixed', left: slashPos.left, top: slashPos.top }}
              >
                {SLASH_ITEMS.map((item, idx) => (
                  <div
                    key={item.key}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (item.kind === 'block') {
                        props.onChangeType(i, item.key)
                      } else {
                        if (item.key === 'bold') wrapSelectionInActiveInput('**')
                        else if (item.key === 'italic') wrapSelectionInActiveInput('*')
                        else if (item.key === 'strike') wrapSelectionInActiveInput('~~')
                        else if (item.key === 'code') wrapSelectionInActiveInput('`')
                        else if (item.key === 'link') {
                          const input = inputsRef.current[i]
                          const start = input?.selectionStart ?? 0
                          const end = input?.selectionEnd ?? 0
                          const current = input?.value ?? ''
                          const sel = current.slice(start, end) || 'link'
                          const url = window.prompt('Enter URL')?.trim()
                          if (url) insertAtSelection(`[${sel}](${url})`)
                        }
                      }
                      setSlashFor(null); setSlashPos(null)
                    }}
                    className={`${idx === slashIndex ? 'bg-accent' : ''} px-3 py-2 text-sm cursor-pointer`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 text-muted-foreground">{item.hint}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function placeholderFor(b: BlockType): string {
  if (b.type === 'heading') return `Heading ${b.level}`
  if (b.type === 'todo') return 'To-do'
  if (b.type === 'bullet') return 'List item'
  if (b.type === 'numbered') return 'List item'
  return 'Type "/" for commands...'
}

function styleFor(b: BlockType): React.CSSProperties {
  if (b.type === 'heading') {
    const sizes: Record<number, string> = { 1: '1.5rem', 2: '1.25rem', 3: '1.125rem', 4: '1rem', 5: '0.95rem', 6: '0.9rem' }
    return { fontWeight: 600, fontSize: sizes[b.level] ?? '1rem' }
  }
  return { fontSize: '0.95rem' }
}


