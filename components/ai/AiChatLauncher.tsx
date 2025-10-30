"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import IconPaperPlane from "@/components/ui/IconPaperPlane";
import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai-elements/message";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Response } from "@/components/ai-elements/response";
import { PromptInput, PromptInputProvider, PromptInputBody, PromptInputFooter, PromptInputTextarea, PromptInputSubmit, PromptInputSpeechButton } from "@/components/ai-elements/prompt-input";
import IconUser from "@/components/ui/IconUser";
import IconFeather from "@/components/ui/IconFeather";

export default function AiChatLauncher() {
  const { messages, status, sendMessage } = useChat();
  const getGroqKey = React.useCallback(() => {
    return typeof window !== "undefined" ? localStorage.getItem("groq_api_key") : null;
  }, []);
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Open chat">
          <IconPaperPlane className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full max-w-xl flex-col gap-2 p-0">
        <SheetHeader className="px-4 py-3">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <Conversation className="min-h-0 flex-1">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState description="Ask anything about your notes or add todos." />
              ) : (
                <div className="space-y-1">
                  {messages.map((m: any) => {
                    const text = Array.isArray(m.parts)
                      ? m.parts
                          .filter((p: any) => p?.type === "text" && typeof p.text === "string")
                          .map((p: any) => p.text)
                          .join(" ")
                      : m.content ?? "";
                    const toolParts = Array.isArray(m.parts)
                      ? m.parts.filter((p: any) => typeof p?.type === "string" && p.type.startsWith("tool-"))
                      : [];
                    return (
                      <Message key={m.id} from={m.role}>
                        <MessageContent>
                          {m.role === "assistant" ? (
                            <Response>{text}</Response>
                          ) : (
                            text
                          )}
                          {toolParts.map((t: any, idx: number) => (
                            <Tool key={`${m.id}-tool-${idx}`} defaultOpen={t.state !== "output-available"}>
                              <ToolHeader title={t.toolName} type={t.type} state={t.state} />
                              <ToolContent>
                                {t.input ? <ToolInput input={t.input} /> : null}
                                <ToolOutput output={t.output} errorText={t.errorText} />
                              </ToolContent>
                            </Tool>
                          ))}
                        </MessageContent>
                        <MessageAvatar icon={m.role === "user" ? <IconUser className="size-4" /> : <IconFeather className="size-4" />} name={m.role === "user" ? "You" : "Assistant"} />
                      </Message>
                    );
                  })}
                </div>
              )}
            </ConversationContent>
          </Conversation>
          <div className="border-t p-3">
            <PromptInputProvider>
              <PromptInput onSubmit={(msg) => {
                const key = getGroqKey();
                return sendMessage(
                  { role: "user", parts: [{ type: "text", text: msg.text ?? "" }] },
                  key ? { headers: { "x-groq-api-key": key } } : undefined
                );
              }}>
                <PromptInputBody>
                  <PromptInputTextarea placeholder="Ask to add a todo, append thoughts, etc." />
                </PromptInputBody>
                <PromptInputFooter>
                  <div />
                  <div className="flex items-center gap-1">
                    <PromptInputSpeechButton
                      aria-label="Start voice input"
                      onTranscriptionChange={(text) => {
                        const el = typeof window !== "undefined" ? (document.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null) : null;
                        if (el) {
                          el.value = text;
                          el.dispatchEvent(new Event("input", { bubbles: true }));
                        }
                      }}
                    />
                    <PromptInputSubmit disabled={status === "streaming" || status === "submitted"} status={status} />
                  </div>
                </PromptInputFooter>
              </PromptInput>
            </PromptInputProvider>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


