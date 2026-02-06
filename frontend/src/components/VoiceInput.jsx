"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Loader2 } from "lucide-react";

export const VoiceInput = ({ onTranscript, className }) => {
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [isSupported, setIsSupported] = React.useState(true);
  const recognitionRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Indian English

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        setTranscript(transcriptText);

        if (result.isFinal) {
          onTranscript?.(transcriptText);
          setTranscript("");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
        Voice input is not supported in this browser. Please use text input.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Main Voice Orb */}
      <div className="relative flex items-center justify-center">
        {/* Glow Effects */}
        <AnimatePresence>
          {isListening && (
            <>
              {/* Outer rotating gradient */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2, rotate: 360 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-20%] rounded-full bg-gradient-to-r from-[hsl(var(--saffron))] via-[hsl(var(--primary))] to-[hsl(var(--green-india))] opacity-30 blur-xl"
              />
              
              {/* Pulsing rings */}
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-[hsl(var(--primary))]"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="absolute inset-0 rounded-full border border-[hsl(var(--saffron))]"
              />
            </>
          )}
        </AnimatePresence>

        {/* Main Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={cn(
            "relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all duration-500",
            isListening
              ? "bg-[hsl(var(--background))] ring-4 ring-[hsl(var(--primary))]"
              : "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))]"
          )}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? (
            <div className="flex gap-1 items-end h-8">
               {/* Waveform Animation */}
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [10, 25, 10],
                    backgroundColor: ["hsl(var(--saffron))", "hsl(var(--green-india))", "hsl(var(--navy))"]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                  className="w-1.5 rounded-full bg-[hsl(var(--primary))]"
                />
              ))}
            </div>
          ) : (
            <Mic className="h-10 w-10 text-white drop-shadow-md" />
          )}
        </motion.button>
      </div>

      {/* Status text with better typography */}
      <div className="min-h-[3rem] flex flex-col items-center justify-center space-y-2">
        <TypographyState isListening={isListening} transcript={transcript} />
      </div>
    </div>
  );
};

const TypographyState = ({ isListening, transcript }) => {
  if (transcript) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[80vw] text-center"
      >
        <p className="text-lg font-medium gradient-text leading-snug">
          "{transcript}"
        </p>
      </motion.div>
    );
  }

  if (isListening) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--primary))]">
          Listening...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-sm font-medium text-[hsl(var(--muted-foreground))]"
    >
      Tap the mic to speak
    </motion.p>
  );
};

export default VoiceInput;
