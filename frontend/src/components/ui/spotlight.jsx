"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Spotlight = ({ className, fill = "white" }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className
      )}
    >
      <svg
        className="absolute left-1/2 top-0 h-[80vh] w-[200vw] -translate-x-1/2 stroke-[1] opacity-50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="spotlight-gradient" cx="50%" cy="0%" r="50%">
            <stop offset="0%" stopColor={fill} stopOpacity="0.3" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="50%"
          cy="0"
          rx="40%"
          ry="50%"
          fill="url(#spotlight-gradient)"
        />
      </svg>
    </motion.div>
  );
};

export const SpotlightCard = ({ children, className, spotlightColor = "hsl(var(--primary))" }) => {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        animate={{
          background: isHovering
            ? `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}15, transparent 60%)`
            : "transparent",
        }}
        transition={{ duration: 0.15 }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
