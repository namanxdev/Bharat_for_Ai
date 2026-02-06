"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const DotBackground = ({ children, className }) => {
  return (
    <div className={cn("relative h-full w-full bg-[hsl(var(--background))]", className)}>
      <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export const GridBackground = ({ children, className }) => {
  return (
    <div
      className={cn(
        "relative h-full w-full bg-[hsl(var(--background))]",
        className
      )}
    >
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-[hsl(var(--background))] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
};
