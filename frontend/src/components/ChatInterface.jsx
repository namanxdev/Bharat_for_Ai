"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Loader2 } from "lucide-react";

export const MessageBubble = ({ message, isUser, isTyping }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className={cn("h-8 w-8 shrink-0", isUser ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--secondary))]")}>
        <AvatarFallback className={cn(isUser ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--secondary))]", "text-white")}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-[hsl(var(--primary))] text-white rounded-tr-sm"
            : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-tl-sm"
        )}
      >
        {isTyping ? (
          <div className="flex items-center gap-1">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              className="h-2 w-2 rounded-full bg-current"
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              className="h-2 w-2 rounded-full bg-current"
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              className="h-2 w-2 rounded-full bg-current"
            />
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        )}
      </div>
    </motion.div>
  );
};

export const ChatInterface = ({
  messages,
  isTyping,
  className,
  onSendMessage,
  inputValue,
  onInputChange,
}) => {
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id || index}
              message={msg.content}
              isUser={msg.role === "user"}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <MessageBubble isTyping isUser={false} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4"
      >
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type your message or use voice..."
            className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!inputValue.trim()}
            className="rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
