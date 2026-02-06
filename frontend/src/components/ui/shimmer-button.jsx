"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const ShimmerButton = ({
  children,
  className,
  shimmerColor = "#ffffff",
  shimmerSize = "0.1em",
  shimmerDuration = "2s",
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-xl border border-white/10 px-6 py-3 text-white",
        "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
        "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))]",
        className
      )}
      {...props}
    >
      {/* Shimmer effect */}
      <div
        style={{
          "--shimmer-color": shimmerColor,
          "--shimmer-size": shimmerSize,
          "--shimmer-duration": shimmerDuration,
        }}
        className="absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30" />

      <span className="relative z-10 flex items-center gap-2 text-sm font-semibold">
        {children}
      </span>
    </motion.button>
  );
};

export const BorderBeamButton = ({
  children,
  className,
  duration = 8,
  borderWidth = 2,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative inline-flex h-12 overflow-hidden rounded-xl p-[2px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2",
        className
      )}
      {...props}
    >
      {/* Animated border */}
      <span
        className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--primary))_0%,hsl(var(--secondary))_50%,hsl(var(--primary))_100%)]"
        style={{ animationDuration: `${duration}s` }}
      />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-[hsl(var(--background))] px-6 py-2 text-sm font-medium text-[hsl(var(--foreground))] backdrop-blur-3xl">
        {children}
      </span>
    </motion.button>
  );
};

export const GlowButton = ({ children, className, ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all",
        "before:absolute before:inset-0 before:rounded-xl before:bg-[hsl(var(--primary))] before:opacity-0 before:blur-xl before:transition-opacity hover:before:opacity-50",
        "hover:shadow-[hsl(var(--primary))]/25 hover:shadow-2xl",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
