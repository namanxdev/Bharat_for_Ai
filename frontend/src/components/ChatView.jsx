"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { MessageBubble } from "@/components/ChatInterface";
import { VoiceInput } from "@/components/VoiceInput";
import { SchemeList } from "@/components/SchemeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlurFade } from "@/components/ui/animated-list";
import { indianStates, categories } from "@/data/schemes";
import { ArrowLeft, Send, RefreshCcw, Home } from "lucide-react";

// Question flow configuration
const questions = {
  age: {
    question: "What is your age?",
    placeholder: "Enter your age (e.g., 20)",
    validate: (val) => {
      const num = parseInt(val);
      return num >= 1 && num <= 100;
    },
    parse: (val) => parseInt(val),
    next: "income",
  },
  income: {
    question: "What is your family's annual income?",
    placeholder: "Enter amount in ₹ (e.g., 250000)",
    validate: (val) => {
      const num = parseInt(val.replace(/,/g, ""));
      return num >= 0;
    },
    parse: (val) => parseInt(val.replace(/,/g, "")),
    next: "state",
  },
  state: {
    question: "Which state do you live in?",
    type: "select",
    options: indianStates,
    next: "category",
  },
  category: {
    question: "What is your category?",
    type: "select",
    options: categories,
    next: "complete",
  },
};

export const ChatView = () => {
  const {
    messages,
    isTyping,
    currentQuestion,
    userProfile,
    eligibleSchemes,
    addMessage,
    setTyping,
    setUserProfile,
    setCurrentQuestion,
    checkAndSetEligibleSchemes,
    setView,
    openSMSModal,
  } = useApp();

  const [inputValue, setInputValue] = React.useState("");
  const messagesEndRef = React.useRef(null);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Initial greeting
  React.useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        role: "assistant",
        content: "Hello! 👋 I'm here to help you discover government scholarships. Let's find schemes you're eligible for.\n\nFirst, let me ask you a few quick questions.",
      });

      setTimeout(() => {
        addMessage({
          role: "assistant",
          content: questions.age.question,
        });
      }, 1000);
    }
  }, []);

  // Handle voice transcript
  const handleVoiceTranscript = (transcript) => {
    handleUserInput(transcript);
  };

  // Handle user input (both text and voice)
  const handleUserInput = async (input) => {
    if (!input.trim()) return;

    // Add user message
    addMessage({ role: "user", content: input });
    setInputValue("");

    // Process based on current question
    const currentQ = questions[currentQuestion];
    
    if (currentQ) {
      // Validate input
      let value = input;
      if (currentQ.type === "select") {
        // Find matching option
        const match = currentQ.options.find(
          opt => opt.toLowerCase().includes(input.toLowerCase()) ||
                 input.toLowerCase().includes(opt.toLowerCase())
        );
        if (!match) {
          setTimeout(() => {
            addMessage({
              role: "assistant",
              content: `I didn't recognize that. Please select from: ${currentQ.options.slice(0, 5).join(", ")}...`,
            });
          }, 500);
          return;
        }
        value = match;
      } else if (currentQ.validate && !currentQ.validate(input)) {
        setTimeout(() => {
          addMessage({
            role: "assistant",
            content: `That doesn't look quite right. ${currentQ.question}`,
          });
        }, 500);
        return;
      }

      // Parse and store value
      const parsedValue = currentQ.parse ? currentQ.parse(value) : value;
      const profileKey = currentQuestion;
      
      setUserProfile({ [profileKey]: parsedValue });

      // Show typing indicator
      setTyping(true);

      setTimeout(() => {
        setTyping(false);

        if (currentQ.next === "complete") {
          // All questions answered - check eligibility
          const fullProfile = { ...userProfile, [profileKey]: parsedValue };
          const schemes = checkAndSetEligibleSchemes(fullProfile);

          addMessage({
            role: "assistant",
            content: schemes.length > 0
              ? `Great news! 🎉 Based on your profile, I found ${schemes.length} scholarship${schemes.length > 1 ? 's' : ''} you may be eligible for. Scroll down to see them!`
              : "I couldn't find any matching schemes for your profile. Try adjusting your details or check back later for new schemes.",
          });

          setCurrentQuestion("complete");
        } else {
          // Ask next question
          const nextQ = questions[currentQ.next];
          
          // Confirmation + next question
          let confirmMsg = "";
          if (profileKey === "age") confirmMsg = `Got it, you're ${parsedValue} years old. `;
          else if (profileKey === "income") confirmMsg = `Family income: ₹${parsedValue.toLocaleString()}. `;
          else if (profileKey === "state") confirmMsg = `You're from ${parsedValue}. `;

          addMessage({
            role: "assistant",
            content: confirmMsg + nextQ.question,
          });

          setCurrentQuestion(currentQ.next);
        }
      }, 1000);
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    handleUserInput(inputValue);
  };

  // Handle restart
  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-screen bg-transparent">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/50 backdrop-blur-md px-4 py-3 sticky top-0 z-10">
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="font-semibold gradient-text">BharatConnect AI</h1>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-32">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id || index}
              message={msg.content}
              isUser={msg.role === "user"}
            />
          ))}
        </AnimatePresence>

        {isTyping && <MessageBubble isTyping isUser={false} />}

        {/* Show schemes if complete */}
        {currentQuestion === "complete" && eligibleSchemes.length > 0 && (
          <BlurFade delay={0.2}>
            <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
              <h2 className="text-lg font-semibold mb-4">
                Your Eligible Schemes ({eligibleSchemes.length})
              </h2>
              <SchemeList schemes={eligibleSchemes} onSendSMS={openSMSModal} />
            </div>
          </BlurFade>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {currentQuestion !== "complete" && (
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-md p-4 space-y-4 pb-24">
          {/* Voice input */}
          <VoiceInput onTranscript={handleVoiceTranscript} />

          {/* Text input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            {questions[currentQuestion]?.type === "select" ? (
              <select
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              >
                <option value="">Select {currentQuestion}...</option>
                {questions[currentQuestion]?.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type={currentQuestion === "income" ? "number" : "text"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={questions[currentQuestion]?.placeholder || "Type your answer..."}
                className="flex-1 h-12"
              />
            )}
            <Button type="submit" disabled={!inputValue.trim()} className="h-12 px-6">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatView;
