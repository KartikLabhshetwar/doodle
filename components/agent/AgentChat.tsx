'use client'

import { useChat } from '@ai-sdk/react'

export default function AgentChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({ api: '/api/agent' })

  return (
    <div className="rounded border border-neutral-200">
      <div className="p-3 space-y-2 max-h-72 overflow-auto bg-white">
        {messages.map(m => (
          <div key={m.id} className="text-sm">
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-200 p-2 bg-white">
        <input
          className="flex-1 rounded border border-neutral-200 px-3 py-2 text-sm outline-none"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask to add a todo, append thoughts, etc."
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}


