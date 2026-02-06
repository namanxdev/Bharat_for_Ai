"use client";
import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, Mic, FileText, User } from "lucide-react";

export const FloatingDock = ({ className, items, currentView, onViewChange }) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed bottom-4 left-1/2 z-50 mx-auto -translate-x-1/2 px-4",
        className
      )}
    >
      <div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex h-16 items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 p-3 shadow-xl backdrop-blur-md"
      >
        {items.map((item) => (
          <IconContainer
            mouseX={mouseX}
            key={item.title}
            {...item}
            isActive={currentView === item.view}
            onClick={() => onViewChange(item.view)}
          />
        ))}
      </div>
    </motion.div>
  );
};

function IconContainer({ mouseX, title, icon: Icon, href, isActive, onClick }) {
  const ref = React.useRef(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = React.useState(false);

  return (
    <button onClick={onClick} className="relative">
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "aspect-square flex items-center justify-center rounded-full border transition-colors",
          isActive 
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" 
            : "border-transparent bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
        )}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 10, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 2, x: "-50%" }}
          className="absolute -top-8 left-1/2 w-max -translate-x-1/2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-0.5 text-xs text-[hsl(var(--foreground))]"
        >
          {title}
        </motion.div>
      )}
    </button>
  );
}
