"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import IconPaperPlane from "@/components/ui/IconPaperPlane";
import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { PromptInput, PromptInputProvider, PromptInputBody, PromptInputFooter, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input";

export default function AiChatLauncher() {
  const { messages, appendMessage, status } = useChat();
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
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className="text-sm">
                      <strong>{m.role === "user" ? "You" : "Assistant"}:</strong> {m.content}
                    </div>
                  ))}
                </div>
              )}
            </ConversationContent>
          </Conversation>
          <div className="border-t p-3">
            <PromptInputProvider>
              <PromptInput onSubmit={(msg) => appendMessage({ role: "user", parts: [{ type: "text", text: msg.text ?? "" }] })}>
                <PromptInputBody>
                  <PromptInputTextarea placeholder="Ask to add a todo, append thoughts, etc." />
                </PromptInputBody>
                <PromptInputFooter>
                  <div />
                  <PromptInputSubmit disabled={status === "streaming"} />
                </PromptInputFooter>
              </PromptInput>
            </PromptInputProvider>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


