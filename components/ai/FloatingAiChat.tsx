"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai-elements/message";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Response } from "@/components/ai-elements/response";
import {
  PromptInput,
  PromptInputProvider,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputSpeechButton,
  PromptInputCommand,
  PromptInputCommandInput,
  PromptInputCommandList,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandSeparator,
} from "@/components/ai-elements/prompt-input";
import IconUser from "@/components/ui/IconUser";
import IconFeather from "@/components/ui/IconFeather";
import {
  PenIcon,
  QuoteIcon,
  ListChecksIcon,
  WorkflowIcon,
  Grid3x3Icon,
  LightbulbIcon,
  ArrowUpIcon,
  FileTextIcon,
  AtSignIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingAiChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId?: string;
  noteContent?: string;
  onNoteUpdate?: () => void; // Callback to refresh note content after changes
};

export default function FloatingAiChat({
  open,
  onOpenChange,
  noteId,
  noteContent,
  onNoteUpdate,
}: FloatingAiChatProps) {
  const queryClient = useQueryClient();
  const { messages, status, sendMessage } = useChat();
  const [showCommandMenu, setShowCommandMenu] = React.useState(true);
  // Store original user messages for clean display (map message content to original)
  const userMessagesMap = React.useRef<Map<string, string>>(new Map());
  const pendingMessageRef = React.useRef<string | null>(null);
  // Track which tool executions have already triggered a refresh
  const processedToolIds = React.useRef<Set<string>>(new Set());
  
  // Track new messages and store original user messages
  React.useEffect(() => {
    messages.forEach((m: any) => {
      if (m.role === "user") {
        const text = Array.isArray(m.parts)
          ? m.parts
              .filter((p: any) => p?.type === "text" && typeof p.text === "string")
              .map((p: any) => p.text)
              .join(" ")
          : m.content ?? "";
        
        // If we have a pending message and this message contains it, store the mapping
        if (pendingMessageRef.current && text.includes(pendingMessageRef.current)) {
          userMessagesMap.current.set(m.id, pendingMessageRef.current);
          pendingMessageRef.current = null;
        } else if (!userMessagesMap.current.has(m.id)) {
          // Extract original message from context format
          const userMatch = text.match(/User:\s*([\s\S]+)$/);
          if (userMatch) {
            userMessagesMap.current.set(m.id, userMatch[1].trim());
          }
        }
      }
    });
  }, [messages]);
  
  // Watch for tool completions to refresh note content
  React.useEffect(() => {
    if (!noteId) return;
    
    // Check all messages for completed tools that haven't been processed yet
    messages.forEach((message: any) => {
      if (message.role === "assistant") {
        const toolParts = Array.isArray(message.parts)
          ? message.parts.filter(
              (p: any) =>
                typeof p?.type === "string" &&
                p.type.startsWith("tool-") &&
                (p.state === "result" || p.state === "complete")
            )
          : [];
        
        // Process each tool part that hasn't been seen before
        toolParts.forEach((toolPart: any) => {
          const toolId = `${message.id}-${toolPart.toolName}-${toolPart.toolCallId || Date.now()}`;
          if (!processedToolIds.current.has(toolId)) {
            processedToolIds.current.add(toolId);
            
            // Check if this is a note-modifying tool
            const noteModifyingTools = [
              'append_text', 
              'insert_text', 
              'replace_text', 
              'add_todo_to_note', 
              'add_multiple_todos',
              'update_note_content',
              'update_note_title',
              'delete_text_from_note',
              'get_note'
            ];
            if (noteModifyingTools.includes(toolPart.toolName)) {
              setTimeout(async () => {
                await queryClient.cancelQueries({ queryKey: ['note', noteId] });
                await queryClient.refetchQueries({ 
                  queryKey: ['note', noteId],
                  type: 'active'
                });
                onNoteUpdate?.();
              }, 1000);
            }
          }
        });
      }
    });
  }, [messages, noteId, queryClient, onNoteUpdate]);

  const getGroqKey = React.useCallback(() => {
    return typeof window !== "undefined"
      ? localStorage.getItem("groq_api_key")
      : null;
  }, []);

  React.useEffect(() => {
    if (open) {
      // Focus the input when dialog opens
      setTimeout(() => {
        const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
        textarea?.focus();
      }, 100);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    
    // Watch for input changes to show/hide command menu
    const checkInput = () => {
      const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
      if (textarea) {
        const value = textarea.value.trim();
        setShowCommandMenu(value === "");
      }
    };

    const interval = setInterval(checkInput, 100);
    // Also listen to input events for immediate response
    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
    const handleInput = () => {
      if (textarea) {
        const value = textarea.value.trim();
        setShowCommandMenu(value === "");
      }
    };
    
    if (textarea) {
      textarea.addEventListener('input', handleInput);
    }
    
    return () => {
      clearInterval(interval);
      if (textarea) {
        textarea.removeEventListener('input', handleInput);
      }
    };
  }, [open]);

  const handleSubmit = React.useCallback(
    (message: { text?: string; files?: any[] }) => {
      const key = getGroqKey();
      const originalUserMessage = message.text ?? "";
      
      // Store pending message for tracking
      pendingMessageRef.current = originalUserMessage;
      
      // Add context about current note if available - agent will extract noteId from this
      let fullMessage = originalUserMessage;
      if (noteId && noteContent) {
        fullMessage = `[NoteId: ${noteId}]\n[NoteContent:\n${noteContent}\n]\n\nUser: ${originalUserMessage}`;
      }
      
      return sendMessage(
        {
          role: "user",
          parts: [{ type: "text", text: fullMessage }],
        },
        key ? { headers: { "x-groq-api-key": key } } : undefined
      );
    },
    [sendMessage, getGroqKey, noteId, noteContent]
  );

  const handleActionSelect = React.useCallback(
    (action: string) => {
      setShowCommandMenu(false);
      
      let prompt = "";
      switch (action) {
        case "continue-writing":
          prompt = "Continue writing the note from where it left off.";
          break;
        case "add-summary":
          prompt = "Add a summary section to this note.";
          break;
        case "add-action-items":
          prompt = "Add action items based on the note content.";
          break;
        case "make-flowchart":
          prompt = "Create a flowchart based on the note content.";
          break;
        case "make-table":
          prompt = "Create a table based on the note content.";
          break;
        case "write-anything":
          prompt = "";
          break;
        case "brainstorm-ideas":
          prompt = "Brainstorm ideas related to this note.";
          break;
        default:
          prompt = action;
      }

      if (prompt) {
        handleSubmit({ text: prompt });
      } else {
        // For "write anything", just focus the input
        setTimeout(() => {
          const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
          textarea?.focus();
        }, 100);
      }
    },
    [handleSubmit]
  );

  const suggestedActions = [
    {
      id: "continue-writing",
      label: "Continue writing",
      icon: PenIcon,
      section: "suggested",
    },
  ];

  const writeActions = [
    {
      id: "add-summary",
      label: "Add a summary",
      icon: QuoteIcon,
      section: "write",
    },
    {
      id: "add-action-items",
      label: "Add action items",
      icon: ListChecksIcon,
      section: "write",
    },
    {
      id: "make-flowchart",
      label: "Make a flowchart...",
      icon: WorkflowIcon,
      section: "write",
    },
    {
      id: "make-table",
      label: "Make a table...",
      icon: Grid3x3Icon,
      section: "write",
    },
    {
      id: "write-anything",
      label: "Write anything...",
      icon: PenIcon,
      section: "write",
    },
  ];

  const thinkActions = [
    {
      id: "brainstorm-ideas",
      label: "Brainstorm ideas...",
      icon: LightbulbIcon,
      section: "think",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 h-[85vh] flex flex-col bg-background overflow-hidden"
        showCloseButton={true}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Input Bar at Top */}
          <div className="p-4 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <IconFeather className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 relative">
                <PromptInputProvider>
                  <PromptInput onSubmit={handleSubmit}>
                    <PromptInputBody>
                      <PromptInputTextarea
                        placeholder="Ask AI anything..."
                        className="pr-32 min-h-12"
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <div className="flex items-center gap-1.5">
                        {noteId && (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
                          >
                            <FileTextIcon className="size-3.5" />
                            <span>Current page</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1.5 rounded-md hover:bg-accent transition-colors"
                          aria-label="Mention"
                        >
                          <AtSignIcon className="size-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <PromptInputSpeechButton
                          aria-label="Start voice input"
                          onTranscriptionChange={(text) => {
                            const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
                            if (textarea) {
                              textarea.value = text;
                              textarea.dispatchEvent(new Event("input", { bubbles: true }));
                            }
                          }}
                        />
                        <PromptInputSubmit
                          disabled={status === "streaming" || status === "submitted"}
                          status={status}
                        />
                      </div>
                    </PromptInputFooter>
                  </PromptInput>
                </PromptInputProvider>
              </div>
            </div>
          </div>

          {/* Command Menu - shown when input is empty */}
          {showCommandMenu && messages.length === 0 && (
            <div className="px-4 pb-4 border-b shrink-0 overflow-y-auto max-h-[40vh]">
              <Command className="rounded-lg border bg-card shadow-sm">
                <PromptInputCommandInput
                  placeholder="Search actions..."
                  className="hidden"
                />
                <PromptInputCommandList>
                  {/* Suggested */}
                  <PromptInputCommandGroup heading="Suggested">
                    {suggestedActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <PromptInputCommandItem
                          key={action.id}
                          onSelect={() => handleActionSelect(action.id)}
                          className="cursor-pointer py-2"
                        >
                          <Icon className="mr-2 size-4 text-primary" />
                          <span>{action.label}</span>
                        </PromptInputCommandItem>
                      );
                    })}
                  </PromptInputCommandGroup>

                  <PromptInputCommandSeparator />

                  {/* Write */}
                  <PromptInputCommandGroup heading="Write">
                    {writeActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <PromptInputCommandItem
                          key={action.id}
                          onSelect={() => handleActionSelect(action.id)}
                          className="cursor-pointer py-2"
                        >
                          <Icon className="mr-2 size-4" />
                          <span>{action.label}</span>
                        </PromptInputCommandItem>
                      );
                    })}
                  </PromptInputCommandGroup>

                  <PromptInputCommandSeparator />

                  {/* Think, ask, chat */}
                  <PromptInputCommandGroup heading="Think, ask, chat">
                    {thinkActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <PromptInputCommandItem
                          key={action.id}
                          onSelect={() => handleActionSelect(action.id)}
                          className="cursor-pointer py-2"
                        >
                          <Icon className="mr-2 size-4" />
                          <span>{action.label}</span>
                        </PromptInputCommandItem>
                      );
                    })}
                  </PromptInputCommandGroup>
                </PromptInputCommandList>
              </Command>
            </div>
          )}

          {/* Conversation - shown when there are messages */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground h-full flex items-center justify-center">
                <ConversationEmptyState description="Start a conversation or select an action above." />
              </div>
            ) : (
              <Conversation className="h-full">
                <ConversationContent style={{ padding: 0 }}>
                  <div className="space-y-1 p-4">
                    {messages.map((m: any) => {
                      const text = Array.isArray(m.parts)
                        ? m.parts
                            .filter(
                              (p: any) =>
                                p?.type === "text" && typeof p.text === "string"
                            )
                            .map((p: any) => p.text)
                            .join(" ")
                        : m.content ?? "";
                      const toolParts = Array.isArray(m.parts)
                        ? m.parts.filter(
                            (p: any) =>
                              typeof p?.type === "string" &&
                              p.type.startsWith("tool-")
                          )
                        : [];
                      
                      // Display clean user message - use stored original or extract from context
                      let displayText = text;
                      if (m.role === "user") {
                        // Try to get stored original message first
                        const storedMessage = userMessagesMap.current.get(m.id);
                        if (storedMessage) {
                          displayText = storedMessage;
                        } else {
                          // Fallback: extract user message from context format
                          const userMatch = text.match(/User:\s*([\s\S]+)$/);
                          if (userMatch) {
                            displayText = userMatch[1].trim();
                          } else {
                            // Remove context prefix if present
                            displayText = text.replace(/^\[NoteId:[\s\S]*?\]\s*\[NoteContent:[\s\S]*?\]\s*\n\nUser:\s*/, "").trim();
                          }
                        }
                      }
                      
                      return (
                        <Message key={m.id} from={m.role}>
                          <MessageContent>
                            {m.role === "assistant" ? (
                              <Response>{displayText}</Response>
                            ) : (
                              displayText
                            )}
                            {toolParts.map((t: any, idx: number) => (
                              <Tool
                                key={`${m.id}-tool-${idx}`}
                                defaultOpen={t.state !== "output-available"}
                              >
                                <ToolHeader
                                  title={t.toolName}
                                  type={t.type}
                                  state={t.state}
                                />
                                <ToolContent>
                                  {t.input ? <ToolInput input={t.input} /> : null}
                                  <ToolOutput
                                    output={t.output}
                                    errorText={t.errorText}
                                  />
                                </ToolContent>
                              </Tool>
                            ))}
                          </MessageContent>
                          <MessageAvatar
                            icon={
                              m.role === "user" ? (
                                <IconUser className="size-4" />
                              ) : (
                                <IconFeather className="size-4" />
                              )
                            }
                            name={m.role === "user" ? "You" : "Assistant"}
                          />
                        </Message>
                      );
                    })}
                  </div>
                </ConversationContent>
              </Conversation>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
