"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  AnimatedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const SMSModal = ({ isOpen, onClose, scheme, onSend }) => {
  const [phone, setPhone] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = React.useState("");

  const validatePhone = (number) => {
    const cleaned = number.replace(/\D/g, "");
    return cleaned.length === 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      setErrorMessage("Please enter a valid 10-digit phone number");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // Simulate API call - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (onSend) {
        await onSend({ phone: phone.replace(/\D/g, ""), schemeId: scheme?.id });
      }

      setStatus("success");

      // Auto close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message || "Failed to send SMS. Please try again.");
      setStatus("error");
    }
  };

  const handleClose = () => {
    setPhone("");
    setStatus("idle");
    setErrorMessage("");
    onClose();
  };

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    if (cleaned.length >= 6) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length >= 5) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return cleaned;
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose}>
      {status === "success" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">SMS Sent Successfully!</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Check your phone for the scheme details and apply link.
          </p>
        </motion.div>
      ) : (
        <>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                <Phone className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Send Scheme Details</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Receive apply link via SMS
                </p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody>
            {/* Scheme preview */}
            {scheme && (
              <div className="mb-6 rounded-lg bg-[hsl(var(--muted))] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{scheme.name}</h4>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {scheme.benefits?.slice(0, 60)}...
                    </p>
                  </div>
                  <Badge variant="success" className="text-xs">
                    Eligible
                  </Badge>
                </div>
              </div>
            )}

            {/* Phone input */}
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium mb-2">
                Enter your mobile number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                  +91
                </span>
                <Input
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="pl-12 h-12 text-lg"
                  disabled={status === "loading"}
                  autoFocus
                />
              </div>

              {/* Error message */}
              {status === "error" && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </motion.div>
              )}

              {/* Info text */}
              <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
                We'll send you the scheme name, benefits, and official apply link.
                Standard SMS rates may apply.
              </p>
            </form>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" onClick={handleClose} disabled={status === "loading"}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!phone || phone.length < 10 || status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send SMS
                </>
              )}
            </Button>
          </ModalFooter>
        </>
      )}
    </AnimatedModal>
  );
};

export default SMSModal;
