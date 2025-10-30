'use client'

import * as React from 'react'
import type { BlockType } from '@/lib/validation'
import BlockList from './BlockList'

type Props = {
  initialContent?: { type: 'markdown'; content: string; blocks?: BlockType[] }
  onChange?: (json: { type: 'markdown'; content: string; blocks?: BlockType[] }) => void
}

export default function NoteEditor({ initialContent, onChange }: Props) {
  const initialMarkdown = React.useMemo(() => {
    const c = initialContent?.content as unknown
    if (typeof c === 'string') return c
    if (c && typeof c === 'object') return extractPlainText(c as any)
    return ''
  }, [initialContent])
  const [blocks, setBlocks] = React.useState<BlockType[]>(() => {
    if (Array.isArray(initialContent?.blocks) && initialContent!.blocks!.length > 0) return initialContent!.blocks as BlockType[]
    const parsed = parseBlocksFromMarkdown(initialMarkdown)
    return parsed.length > 0 ? parsed : [{ type: 'paragraph', text: '' }]
  })
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
  // Preview pane removed; content is always converted to Markdown and emitted via onChange

  const notifyRef = React.useRef<number | undefined>(undefined)
  React.useEffect(() => {
    window.clearTimeout(notifyRef.current)
    notifyRef.current = window.setTimeout(() => {
      const md = blocksToMarkdown(blocks)
      onChange?.({ type: 'markdown', content: md, blocks })
    }, 1200)
    return () => window.clearTimeout(notifyRef.current)
  }, [blocks, onChange])

  const updateBlockText = React.useCallback((index: number, text: string) => {
    setBlocks((prev) => {
      const next = prev.slice()
      const b = next[index]
      if (!b) return prev
      if (b.type === 'heading') next[index] = { ...b, text }
      if (b.type === 'paragraph') next[index] = { ...b, text }
      if (b.type === 'todo') next[index] = { ...b, text }
      if (b.type === 'bullet') next[index] = { ...b, text }
      if (b.type === 'numbered') next[index] = { ...b, text }
      if ((b as any).type === 'quote') next[index] = { ...(b as any), text } as any
      if ((b as any).type === 'embed') next[index] = { ...(b as any), text } as any
      if ((b as any).type === 'divider') return prev
      return next
    })
  }, [])

  const toggleTodo = React.useCallback((index: number) => {
    setBlocks((prev) => {
      const next = prev.slice()
      const b = next[index]
      if (b?.type === 'todo') next[index] = { ...b, checked: !b.checked }
      return next
    })
  }, [])

  const insertBlockAfter = React.useCallback((index: number, block?: BlockType) => {
    setBlocks((prev) => {
      const next = prev.slice()
      const newBlock: BlockType = block ?? { type: 'paragraph', text: '' }
      next.splice(index + 1, 0, normalizeNumbered(next, newBlock, index + 1))
      return renumber(next)
    })
  }, [])

  const deleteBlock = React.useCallback((index: number) => {
    setBlocks((prev) => {
      if (prev.length === 1) return [{ type: 'paragraph', text: '' }]
      const next = prev.slice()
      next.splice(index, 1)
      return renumber(next)
    })
  }, [])

  const changeType = React.useCallback((index: number, type: string) => {
    setBlocks((prev) => {
      const b = prev[index]
      if (!b) return prev
      const text = (b as any).text ?? ''
      let nb: BlockType
      switch (type) {
        case 'h1': nb = { type: 'heading', level: 1, text }; break
        case 'h2': nb = { type: 'heading', level: 2, text }; break
        case 'h3': nb = { type: 'heading', level: 3, text }; break
        case 'todo': nb = { type: 'todo', checked: false, text }; break
        case 'bullet': nb = { type: 'bullet', text }; break
        case 'numbered': nb = { type: 'numbered', index: 1, text }; break
        case 'quote': nb = { type: 'quote' as any, text } as any; break
        case 'embed': nb = { type: 'embed' as any, text } as any; break
        case 'divider': nb = { type: 'divider' } as any; break
        default: nb = { type: 'paragraph', text }
      }
      const next = prev.slice()
      next[index] = nb
      return renumber(next)
    })
  }, [])

  const moveBlock = React.useCallback((index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = prev.slice()
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const [b] = next.splice(index, 1)
      next.splice(target, 0, b)
      return renumber(next)
    })
  }, [])

  return (
    <div className="w-full">
      {/* Slash menu handles tools; toolbar removed per request */}
      <div className="rounded-md">
        <BlockList
          blocks={blocks}
          onChangeText={updateBlockText}
          onToggleTodo={toggleTodo}
          onInsertAfter={insertBlockAfter}
          onDelete={deleteBlock}
          onChangeType={changeType}
          onMove={moveBlock}
          onFocusIndex={setFocusedIndex}
        />
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Enter to add • / to change type • ⌫ to remove • Blocks: {blocks.length}</div>
    </div>
  )
}

function parseBlocksFromMarkdown(markdown: unknown): BlockType[] {
  if (typeof markdown !== 'string') return []
  const lines = markdown.split(/\r?\n/)
  const blocks: BlockType[] = []
  let numberIndex = 1
  for (const line of lines) {
    if (!line.trim()) { numberIndex = 1; continue }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, text: h[2] })
      numberIndex = 1
      continue
    }
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      blocks.push({ type: 'quote' as any, text: quote[1] })
      continue
    }
    const todo = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/)
    if (todo) {
      blocks.push({ type: 'todo', checked: /x/i.test(todo[1]), text: todo[2] })
      continue
    }
    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      blocks.push({ type: 'bullet', text: bullet[1] })
      continue
    }
    const numbered = line.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      blocks.push({ type: 'numbered', index: numberIndex++, text: numbered[1] })
      continue
    }
    blocks.push({ type: 'paragraph', text: line })
    numberIndex = 1
  }
  return blocks
}

//

// Best-effort extraction of plain text from a TipTap-like doc
function extractPlainText(doc: any): string {
  try {
    const out: string[] = []
    const visit = (node: any) => {
      if (!node || typeof node !== 'object') return
      if (typeof node.text === 'string') out.push(node.text)
      const content = Array.isArray(node) ? node : node.content
      if (Array.isArray(content)) for (const c of content) visit(c)
    }
    visit(doc)
    return out.join('\n').trim()
  } catch {
    return ''
  }
}

// BlockList moved to a separate reusable component

function renumber(blocks: BlockType[]): BlockType[] {
  let n = 1
  return blocks.map((b) => (b.type === 'numbered' ? { ...b, index: n++ } : b.type === 'heading' && b.level > 6 ? { ...b, level: 6 } : b))
}

function normalizeNumbered(all: BlockType[], b: BlockType, insertIndex: number): BlockType {
  if (b.type !== 'numbered') return b
  if (insertIndex > 0 && all[insertIndex - 1]?.type === 'numbered') {
    const prev = all[insertIndex - 1] as Extract<BlockType, { type: 'numbered' }>
    return { ...b, index: prev.index + 1 }
  }
  return { ...b, index: 1 }
}

function blocksToMarkdown(blocks: BlockType[]): string {
  const out: string[] = []
  for (const b of blocks) {
    if (b.type === 'heading') out.push(`${'#'.repeat(Math.max(1, Math.min(6, b.level)))} ${b.text}`)
    else if (b.type === 'todo') out.push(`- [${b.checked ? 'x' : ' '}] ${b.text}`)
    else if (b.type === 'bullet') out.push(`- ${b.text}`)
    else if (b.type === 'numbered') out.push(`${b.index}. ${b.text}`)
    else if ((b as any).type === 'quote') out.push(`> ${(b as any).text}`)
    else if ((b as any).type === 'embed') out.push(`${(b as any).text}`)
    else if ((b as any).type === 'divider') out.push(`---`)
    else if ('text' in (b as any)) out.push((b as any).text)
  }
  return out.join('\n')
}


