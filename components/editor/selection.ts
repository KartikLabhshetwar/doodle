export function getActiveInput(): HTMLInputElement | null {
  const el = document.activeElement as HTMLElement | null
  if (!el) return null
  if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text') return el as HTMLInputElement
  return null
}

export function wrapSelectionInActiveInput(wrapperLeft: string, wrapperRight: string = wrapperLeft) {
  const input = getActiveInput()
  if (!input) return
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? 0
  const value = input.value
  const selected = value.slice(start, end)
  const next = value.slice(0, start) + wrapperLeft + selected + wrapperRight + value.slice(end)
  input.value = next
  const cursor = start + wrapperLeft.length + selected.length + wrapperRight.length
  input.selectionStart = input.selectionEnd = cursor
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export function insertAtSelection(text: string) {
  const input = getActiveInput()
  if (!input) return
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? 0
  const value = input.value
  const next = value.slice(0, start) + text + value.slice(end)
  input.value = next
  const cursor = start + text.length
  input.selectionStart = input.selectionEnd = cursor
  input.dispatchEvent(new Event('input', { bubbles: true }))
}


