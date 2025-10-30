'use client'

import * as React from 'react'
import type { BlockType } from '@/lib/validation'
import { wrapSelectionInActiveInput, insertAtSelection } from './selection'

type SlashItem =
  | { key: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'divider'; label: string; hint: string; kind: 'block' }
  | { key: 'code' | 'link'; label: string; hint: string; kind: 'inline' }

const SLASH_ITEMS: Array<SlashItem> = [
  { key: 'h1', label: 'Heading 1', hint: '#', kind: 'block' },
  { key: 'h2', label: 'Heading 2', hint: '##', kind: 'block' },
  { key: 'h3', label: 'Heading 3', hint: '###', kind: 'block' },
  { key: 'paragraph', label: 'Paragraph', hint: 'plain', kind: 'block' },
  { key: 'bullet', label: 'Bullet list', hint: '- item', kind: 'block' },
  { key: 'numbered', label: 'Numbered list', hint: '1. item', kind: 'block' },
  { key: 'todo', label: 'Todo', hint: '[ ] task', kind: 'block' },
  { key: 'quote', label: 'Quote', hint: '> quote', kind: 'block' },
  { key: 'divider', label: 'Divider', hint: '---', kind: 'block' },
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
  const [slashQuery, setSlashQuery] = React.useState('')
  const slashListRef = React.useRef<HTMLDivElement | null>(null)
  const inputsRef = React.useRef<Record<number, HTMLInputElement | null>>({})
  const [menuFor, setMenuFor] = React.useState<number | null>(null)
  const [menuPos, setMenuPos] = React.useState<{ left: number; top: number } | null>(null)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
  const [dragStartPos, setDragStartPos] = React.useState<{ x: number; y: number } | null>(null)
  const [linkFor, setLinkFor] = React.useState<number | null>(null)
  const [linkPos, setLinkPos] = React.useState<{ left: number; top: number } | null>(null)
  const [linkText, setLinkText] = React.useState('')
  const [linkUrl, setLinkUrl] = React.useState('')

  const applyInlineWrap = React.useCallback((index: number, left: string, right: string = left) => {
    const input = inputsRef.current[index]
    if (!input) return
    input.focus()
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const value = input.value
    const selected = value.slice(start, end)
    let next = ''
    let cursor = 0
    if (selected.length === 0) {
      next = value.slice(0, start) + left + right + value.slice(end)
      cursor = start + left.length
    } else {
      next = value.slice(0, start) + left + selected + right + value.slice(end)
      cursor = start + left.length + selected.length + right.length
    }
    props.onChangeText(index, next)
    requestAnimationFrame(() => { inputsRef.current[index]?.setSelectionRange(cursor, cursor) })
  }, [props])

  const applyInlineInsert = React.useCallback((index: number, text: string) => {
    const input = inputsRef.current[index]
    if (!input) return
    input.focus()
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const value = input.value
    const next = value.slice(0, start) + text + value.slice(end)
    props.onChangeText(index, next)
    const cursor = start + text.length
    requestAnimationFrame(() => { inputsRef.current[index]?.setSelectionRange(cursor, cursor) })
  }, [props])

  const applyInsertLink = React.useCallback((index: number) => {
    const input = inputsRef.current[index]
    if (!input) return
    input.focus()
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const value = input.value
    const selected = value.slice(start, end)
    let linkText = selected
    if (!linkText) {
      linkText = window.prompt('Link text')?.trim() || 'link'
    }
    let url = window.prompt('Enter URL')?.trim() || ''
    if (!url) return
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    const markdown = `[${linkText}](${url})`
    if (selected) {
      // replace selection
      const next = value.slice(0, start) + markdown + value.slice(end)
      props.onChangeText(index, next)
      const cursor = start + markdown.length
      requestAnimationFrame(() => { inputsRef.current[index]?.setSelectionRange(cursor, cursor) })
    } else {
      // insert at caret
      applyInlineInsert(index, markdown)
    }
  }, [applyInlineInsert, props])

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      // Close menu if clicking outside any menu
      const target = e.target as HTMLElement | null
      if (!target) return
      if (!target.closest('[data-block-menu]') && !target.closest('[data-block-menu-trigger]')) { setMenuFor(null); setMenuPos(null) }
      if (!target.closest('[data-slash-menu]')) { setSlashFor(null); setSlashPos(null) }
      if (!target.closest('[data-link-menu]')) { setLinkFor(null); setLinkPos(null) }
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
              const filtered = SLASH_ITEMS.filter((it) => {
                if (!slashQuery) return true
                const q = slashQuery.toLowerCase()
                return it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q)
              })
              if (e.key === 'Escape') { e.preventDefault(); setSlashFor(null); setSlashPos(null); return }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (filtered.length) {
                  setSlashIndex((x) => {
                    const nx = (x + 1) % filtered.length
                    requestAnimationFrame(() => {
                      const el = document.querySelector(`[data-slash-item="${nx}"]`) as HTMLElement | null
                      el?.scrollIntoView({ block: 'nearest' })
                    })
                    return nx
                  })
                }
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (filtered.length) {
                  setSlashIndex((x) => {
                    const nx = (x - 1 + filtered.length) % filtered.length
                    requestAnimationFrame(() => {
                      const el = document.querySelector(`[data-slash-item="${nx}"]`) as HTMLElement | null
                      el?.scrollIntoView({ block: 'nearest' })
                    })
                    return nx
                  })
                }
                return
              }
              if (e.key === 'Backspace') { e.preventDefault(); setSlashQuery((q) => { const nq = q.slice(0, -1); setSlashIndex(0); return nq }); return }
              if (e.key.length === 1 && !e.altKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setSlashQuery((q) => { const nq = q + e.key; setSlashIndex(0); return nq }); return }
              if (e.key === 'Enter') {
                e.preventDefault()
                const item = filtered[slashIndex]
                if (item) {
                  if (item.kind === 'block') {
                    props.onChangeType(i, item.key)
                    if (item.key === 'divider') {
                      props.onInsertAfter(i, { type: 'paragraph', text: '' } as any)
                      focusAt(i + 1)
                    }
                  } else if (item.kind === 'inline') {
                    if (item.key === 'code') applyInlineWrap(i, '`')
                    else if (item.key === 'link') {
                      const input = inputsRef.current[i]
                      const start = input?.selectionStart ?? 0
                      const end = input?.selectionEnd ?? 0
                      const current = input?.value ?? ''
                      const sel = current.slice(start, end)
                      setLinkText(sel || '')
                      setLinkUrl('')
                      const r = input?.getBoundingClientRect()
                      if (r) setLinkPos({ left: Math.max(8, r.left + 12), top: r.bottom + 6 })
                      setLinkFor(i)
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
              setSlashQuery('')
              const input = inputsRef.current[i]
              if (input) {
                const r = input.getBoundingClientRect()
                setSlashPos({ left: Math.max(8, r.left + 12), top: r.bottom + 6 })
              }
              requestAnimationFrame(() => {
                const el = document.querySelector('[data-slash-item="0"]') as HTMLElement | null
                el?.scrollIntoView({ block: 'nearest' })
              })
            }
          },
          className: 'w-full bg-transparent outline-none focus:outline-none px-0',
          placeholder: placeholderFor(b),
        }

        return (
          <div
            key={i}
            className={`group flex items-center gap-2 px-2 py-1.5 relative ${dragOverIndex === i ? 'bg-accent/40' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              // Only allow vertical-dominant drags
              if (dragStartPos) {
                const dx = Math.abs(e.clientX - dragStartPos.x)
                const dy = Math.abs(e.clientY - dragStartPos.y)
                if (dx > dy) { e.dataTransfer.dropEffect = 'none'; return }
              }
              if (dragOverIndex !== i) setDragOverIndex(i)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragIndex
              const to = i
              setDragOverIndex(null)
              setDragIndex(null)
              setDragStartPos(null)
              if (dragStartPos) {
                const dx = Math.abs(e.clientX - dragStartPos.x)
                const dy = Math.abs(e.clientY - dragStartPos.y)
                if (dx > dy) return
              }
              if (from == null || to == null || from === to) return
              const dir = from < to ? 1 : -1
              const times = Math.abs(to - from)
              for (let t = 0; t < times; t++) props.onMove(from + t * dir, dir)
            }}
          >
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto relative">
              <button type="button" className="text-xs px-1" onClick={() => props.onInsertAfter(i)} aria-label="Add">＋</button>
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent/60 bg-accent/30 cursor-ns-resize"
                aria-label="More"
                draggable
                data-block-menu-trigger
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.setData('text/plain', String(i));
                  const canvas = document.createElement('canvas');
                  canvas.width = 1; canvas.height = 1;
                  e.dataTransfer.setDragImage(canvas, 0, 0)
                  setDragStartPos({ x: e.clientX, y: e.clientY })
                }}
                onMouseDown={(e) => { e.stopPropagation() }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const btn = (e.currentTarget as HTMLButtonElement)
                  setMenuPos({ left: btn.offsetLeft + btn.offsetWidth + 6, top: btn.offsetTop + btn.offsetHeight + 4 })
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
                  className="z-50 rounded-md border border-border bg-background shadow absolute"
                  style={{ left: menuPos.left, top: menuPos.top }}
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
            ) : (b as any).type === 'quote' ? (
              <span className="w-6 text-right text-muted-foreground select-none">❝</span>
            ) : (b as any).type === 'embed' ? (
              <span className="w-6 text-right text-muted-foreground select-none">↪</span>
            ) : (b as any).type === 'divider' ? (
              <span className="w-6" />
            ) : (
              <span className="w-6" />
            )}
            {(b as any).type === 'divider' ? (
              <div className="flex-1"><div className="h-px bg-border w-full" /></div>
            ) : (
              <div className="flex-1">
                {(() => {
                  const link = parseSingleMarkdownLink((b as any).text)
                  if (link) {
                    return (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="underline text-sm">
                        {link.label}
                      </a>
                    )
                  }
                  return (
                    <input
                      {...common}
                      style={styleFor(b)}
                    />
                  )
                })()}
              </div>
            )}
            {slashFor === i && slashPos ? (
              <div
                data-slash-menu
                className="w-56 rounded-md border border-border bg-background shadow z-50 max-h-80 overflow-auto"
                style={{ position: 'fixed', left: slashPos.left, top: slashPos.top }}
                ref={slashListRef}
              >
                <div className="px-3 py-2 border-b text-sm text-muted-foreground">
                  Search: <span className="text-foreground">{slashQuery || 'type to filter'}</span>
                </div>
                {SLASH_ITEMS.filter((it) => {
                  if (!slashQuery) return true
                  const q = slashQuery.toLowerCase()
                  return it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q)
                }).map((item, idx) => (
                  <div
                    key={item.key}
                    data-slash-item={idx}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (item.kind === 'block') {
                        props.onChangeType(i, item.key)
                        if (item.key === 'divider') {
                          props.onInsertAfter(i, { type: 'paragraph', text: '' } as any)
                          focusAt(i + 1)
                        }
                      } else if (item.kind === 'inline') {
                        if (item.key === 'code') applyInlineWrap(i, '`')
                        else if (item.key === 'link') {
                          const input = inputsRef.current[i]
                          const start = input?.selectionStart ?? 0
                          const end = input?.selectionEnd ?? 0
                          const current = input?.value ?? ''
                          const sel = current.slice(start, end)
                          setLinkText(sel || '')
                          setLinkUrl('')
                          const r = input?.getBoundingClientRect()
                          if (r) setLinkPos({ left: Math.max(8, r.left + 12), top: r.bottom + 6 })
                          setLinkFor(i)
                        }
                      }
                      setSlashFor(null); setSlashPos(null); setSlashQuery(''); setSlashIndex(0)
                    }}
                    className={`${idx === slashIndex ? 'bg-accent' : ''} px-3 py-2 text-sm cursor-pointer`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 text-muted-foreground">{item.hint}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {linkFor === i && linkPos ? (
              <div
                data-link-menu
                className="w-72 p-3 rounded-md border border-border bg-background shadow z-50"
                style={{ position: 'fixed', left: linkPos.left, top: linkPos.top }}
              >
                <div className="mb-2 text-sm font-medium">Insert link</div>
                <div className="space-y-2">
                  <input
                    className="w-full bg-transparent outline-none border border-border rounded px-2 py-1 text-sm"
                    placeholder="Text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                  />
                  <input
                    className="w-full bg-transparent outline-none border border-border rounded px-2 py-1 text-sm"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button className="px-2 py-1 text-sm" onMouseDown={(e) => { e.preventDefault(); setLinkFor(null); setLinkPos(null) }}>Cancel</button>
                    <button
                      className="px-2 py-1 text-sm rounded bg-accent"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const txt = linkText || 'link'
                        let url = linkUrl.trim()
                        if (!url) return
                        if (!/^https?:\/\//i.test(url)) url = `https://${url}`
                        applyInlineInsert(i, `[${txt}](${url})`)
                        setLinkFor(null); setLinkPos(null); setLinkText(''); setLinkUrl('')
                      }}
                    >
                      Insert
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function parseSingleMarkdownLink(text?: string): { label: string; href: string } | null {
  if (!text) return null
  const m = text.match(/^\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/)
  if (!m) return null
  return { label: m[1], href: m[2] }
}

function placeholderFor(b: BlockType): string {
  if (b.type === 'heading') return `Heading ${b.level}`
  if (b.type === 'todo') return 'To-do'
  if (b.type === 'bullet') return 'List item'
  if (b.type === 'numbered') return 'List item'
  if ((b as any).type === 'quote') return 'Quote'
  if ((b as any).type === 'embed') return 'Paste URL to embed'
  return 'Type "/" for commands...'
}

function styleFor(b: BlockType): React.CSSProperties {
  if (b.type === 'heading') {
    const sizes: Record<number, string> = { 1: '1.5rem', 2: '1.25rem', 3: '1.125rem', 4: '1rem', 5: '0.95rem', 6: '0.9rem' }
    return { fontWeight: 600, fontSize: sizes[b.level] ?? '1rem' }
  }
  if ((b as any).type === 'quote') {
    return { fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--muted-foreground)' }
  }
  if ((b as any).type === 'embed') {
    return { fontSize: '0.95rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }
  }
  return { fontSize: '0.95rem' }
}


