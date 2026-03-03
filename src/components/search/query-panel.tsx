"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Bot, FileText, Loader2, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useContractQuery, type QueryResponse } from '@/hooks/use-contract-query';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: QueryResponse['sources'];
}

export function QueryPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mutate, isPending } = useContractQuery();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isPending) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');

    mutate(question, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, sources: data.sources },
        ]);
      },
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${err.message}` },
        ]);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-purple-500" />
          Contract Query Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex max-h-80 min-h-[120px] flex-col gap-3 overflow-y-auto rounded-md border bg-muted/30 p-3"
        >
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              Ask a question about your contracts. The AI will search across all contract content to find answers.
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
                    {msg.sources.map((src) => (
                      <Link key={src.id} href={`/contracts/${src.id}`}>
                        <Badge variant="secondary" className="cursor-pointer gap-1 text-xs hover:bg-accent">
                          <FileText className="h-3 w-3" />
                          {src.title}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching contracts and generating answer...
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Which contracts expire in the next 90 days?"
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
