# Feature 05: Frontend UI Improvements

## Priority: MEDIUM (Polish & user experience)
## Estimated Effort: 6-8 hours
## Depends On: Feature 04 (Frontend Pages) should be done first

---

## Overview

Improve the existing frontend UI for a more polished, professional look. This covers specific fixes to existing components plus new UI patterns to implement across the app. The current UI has the foundation (dark theme, Indian flag colors, animated components) but needs refinement in layout, typography, accessibility, and interaction design.

---

## Current State — Issues to Fix

### 1. HeroSection (`frontend/src/components/HeroSection.jsx`)
**Problems**:
- 3D Card on the right shows "PM Kisan Samman Nidhi" — hardcoded, not from data
- "View Details →" and "Check Eligibility" buttons on 3D card do nothing
- Heading hierarchy is messy (`h1` contains multiple font sizes)
- On mobile, 3D card is hidden (`hidden md:block`), wasting space
- Typewriter effect component is imported but not used
- CTAs could be more prominent

### 2. ChatView (`frontend/src/components/ChatView.jsx`)
**Problems**:
- Input padding overlaps with FloatingDock (`pb-24` hack)
- Select dropdowns use native `<select>` — unstyled, looks bad in dark mode
- No progress indicator showing which question you're on (1/4, 2/4, etc.)
- Messages lack timestamps
- No "clear chat" or "new conversation" option in header
- Scheme results appear inline in chat — cramped view

### 3. SchemeCard (`frontend/src/components/SchemeCard.jsx`)
**Problems**:
- No hover micro-interactions beyond shadow
- No bookmark/save button
- Documents section always truncated at 3
- No visual indicator of "match strength" or relevance

### 4. FloatingDock (`frontend/src/components/ui/floating-dock.jsx`)
**Problems**:
- "Schemes" links to "results" view which doesn't exist
- Voice button navigates to chat (same as Chat button)
- Active state isn't clearly visible
- No labels on mobile

### 5. General
**Problems**:
- No loading states / skeletons
- No error boundaries
- No toast/notification system for actions (SMS sent, etc.)
- No favicon (uses default Vite logo)
- No meta tags for SEO
- Page title doesn't change per view

---

## UI Improvements to Implement

### Improvement 1: Add Progress Stepper to Chat Flow

**Location**: `frontend/src/components/ChatView.jsx`

Add a visual progress indicator at the top of the chat:
```jsx
// Progress steps: Age → Income → State → Category → Done
const steps = ["Age", "Income", "State", "Category"];
const currentStepIndex = steps.indexOf(currentQuestion);

<div className="flex items-center gap-2 px-4 py-2">
  {steps.map((step, i) => (
    <React.Fragment key={step}>
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all",
        i < currentStepIndex ? "bg-green-500 text-white" :          // completed
        i === currentStepIndex ? "bg-orange-500 text-white ring-2 ring-orange-300" : // current
        "bg-gray-700 text-gray-400"                                  // upcoming
      )}>
        {i < currentStepIndex ? "✓" : i + 1}
      </div>
      {i < steps.length - 1 && (
        <div className={cn(
          "flex-1 h-0.5 transition-all",
          i < currentStepIndex ? "bg-green-500" : "bg-gray-700"
        )} />
      )}
    </React.Fragment>
  ))}
</div>
```

### Improvement 2: Custom Select Dropdown

**Create**: `frontend/src/components/ui/select.jsx`

Replace the native `<select>` in ChatView with a styled custom dropdown:
```jsx
// A styled select that matches the dark theme:
// - Dark background with border
// - Option list with hover highlighting
// - Search/filter for long lists like states
// - Animated open/close
// Use Framer Motion for animation
// Match Input component styling
```

### Improvement 3: Toast Notification System

**Create**: `frontend/src/components/ui/toast.jsx`

Add a toast system for feedback:
```jsx
// Toast notifications for:
// - "SMS sent successfully!" (green)
// - "Failed to send SMS" (red)
// - "Profile updated" (blue)
// - "Copied to clipboard" (gray)
//
// Position: bottom-right, stacked
// Auto-dismiss: 3-5 seconds
// Animated slide-in/out
```

**Create**: `frontend/src/context/ToastContext.jsx`
```jsx
// Simple context-based toast system:
// const { toast } = useToast();
// toast({ title: "SMS Sent!", variant: "success" });
```

### Improvement 4: Loading Skeletons

**Create**: `frontend/src/components/ui/skeleton.jsx`

```jsx
// Shimmer effect skeleton for:
// - SchemeCard loading state
// - Chat message loading
// - Page-level loading
//
// Usage:
// <Skeleton className="h-4 w-32" />  // text line
// <Skeleton className="h-40 w-full rounded-xl" />  // card
```

### Improvement 5: Error Boundary

**Create**: `frontend/src/components/ErrorBoundary.jsx`

```jsx
// React Error Boundary wrapper:
// - Catches render errors
// - Shows friendly error UI with "Try Again" button
// - Logs error details (for debugging)
// - Indian-themed friendly message
```

### Improvement 6: Fix HeroSection 3D Card

**Edit**: `frontend/src/components/HeroSection.jsx`

- Pull a random scheme from `mockSchemes` data instead of hardcoding "PM Kisan"
- Make buttons functional: "View Details" opens scheme detail, "Check Eligibility" starts chat
- On mobile: show a simplified scheme card stack instead of hiding entirely
- Add `TypewriterEffect` for dynamic text (it's imported but not used)

```jsx
// Replace the hardcoded 3D card content with:
const randomScheme = useMemo(() => {
  return mockSchemes[Math.floor(Math.random() * mockSchemes.length)];
}, []);

// In the CardBody:
<span className="text-white">{randomScheme.name}</span>
<CardItem as="p">{randomScheme.benefits.slice(0, 100)}...</CardItem>
```

### Improvement 7: Animated Page Transitions

**Edit**: `frontend/src/App.jsx`

Add smooth transitions between all views:
```jsx
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3,
};

// Wrap each view in:
<motion.div
  initial="initial"
  animate="in"
  exit="out"
  variants={pageVariants}
  transition={pageTransition}
>
  <TargetView />
</motion.div>
```

### Improvement 8: Responsive Layout Fixes

**Edit**: `frontend/src/index.css`

Add responsive breakpoint utilities:
```css
/* Better responsive container */
.page-container {
  @apply px-4 py-6 max-w-7xl mx-auto;
}

/* Safe area for floating dock */
.dock-safe-area {
  @apply pb-28;
}

/* Better focus states for accessibility */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  @apply outline-2 outline-offset-2 outline-[hsl(var(--ring))];
}

/* Card hover effect */
.card-hover {
  @apply transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/10;
}
```

### Improvement 9: Dynamic Page Titles

**Create**: `frontend/src/hooks/usePageTitle.js`

```javascript
import { useEffect } from "react";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — BharatConnect AI` : "BharatConnect AI";
    return () => { document.title = "BharatConnect AI"; };
  }, [title]);
}

// Usage in each page:
// usePageTitle("Browse Schemes");
// usePageTitle("Chat");
```

### Improvement 10: Better Favicon & Meta Tags

**Edit**: `frontend/index.html`

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="BharatConnect AI - Discover government scholarship schemes through conversational AI" />
  <meta name="theme-color" content="#FF9933" />
  <meta property="og:title" content="BharatConnect AI" />
  <meta property="og:description" content="AI-powered government scheme discovery for Indian citizens" />
  <title>BharatConnect AI</title>
</head>
```

**Create**: `frontend/public/favicon.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#FF9933"/>
  <text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-weight="bold">B</text>
</svg>
```

### Improvement 11: Scheme Card Enhancements

**Edit**: `frontend/src/components/SchemeCard.jsx`

Add:
- Bookmark/save button (heart icon) in top-right corner
- Match strength bar (if `similarity_score` present)
- Expand button for full documents list
- Micro-animation on hover (slight scale + glow)
- Apply deadline countdown (if available)

```jsx
// Add bookmark button
<button
  onClick={() => toggleSaveScheme(scheme.id)}
  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
>
  <Heart className={cn("h-4 w-4", isSaved ? "fill-red-500 text-red-500" : "text-gray-400")} />
</button>

// Add match strength indicator
{scheme.similarity_score && (
  <div className="mt-2">
    <div className="text-xs text-gray-400 mb-1">Match Strength</div>
    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full"
        style={{ width: `${scheme.similarity_score * 100}%` }}
      />
    </div>
  </div>
)}
```

### Improvement 12: Chat Message Improvements

**Edit**: `frontend/src/components/ChatInterface.jsx`

Add to MessageBubble:
- Timestamps (relative: "2 min ago")
- Copy message button on hover
- Markdown rendering for bot messages (bold, lists)
- Link detection and styling

---

## New UI Components to Build

| Component | File | Purpose |
|-----------|------|---------|
| `Select` | `components/ui/select.jsx` | Custom styled dropdown |
| `Toast` | `components/ui/toast.jsx` | Notification system |
| `Skeleton` | `components/ui/skeleton.jsx` | Loading placeholders |
| `Accordion` | `components/ui/accordion.jsx` | For FAQ page |
| `Slider` | `components/ui/slider.jsx` | Range slider for filters |
| `Tabs` | `components/ui/tabs.jsx` | Tab navigation |
| `ProgressBar` | `components/ui/progress.jsx` | Chat step indicator |
| `ErrorBoundary` | `components/ErrorBoundary.jsx` | Error handling |

---

## Files to Create
- `frontend/src/components/ui/select.jsx`
- `frontend/src/components/ui/toast.jsx`
- `frontend/src/components/ui/skeleton.jsx`
- `frontend/src/components/ui/accordion.jsx`
- `frontend/src/components/ui/slider.jsx`
- `frontend/src/components/ui/tabs.jsx`
- `frontend/src/components/ui/progress.jsx`
- `frontend/src/components/ErrorBoundary.jsx`
- `frontend/src/context/ToastContext.jsx`
- `frontend/src/hooks/usePageTitle.js`
- `frontend/public/favicon.svg`

## Files to Modify
- `frontend/src/components/HeroSection.jsx`
- `frontend/src/components/ChatView.jsx`
- `frontend/src/components/ChatInterface.jsx`
- `frontend/src/components/SchemeCard.jsx`
- `frontend/src/components/ui/floating-dock.jsx`
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/index.html`

---

## Verification Checklist
- [ ] Progress stepper shows in chat (1/4, 2/4, etc.)
- [ ] Custom select dropdowns render correctly in dark mode
- [ ] Toast notifications appear for SMS sent, errors
- [ ] Skeleton loading shows while data loads
- [ ] Error boundary catches and displays render errors
- [ ] HeroSection 3D card shows actual scheme data
- [ ] Page transitions are smooth between views
- [ ] Mobile responsive — all views usable on 375px width
- [ ] Favicon shows BharatConnect logo
- [ ] Page title updates per view
- [ ] Keyboard navigation works (tab, enter, escape)
- [ ] Color contrast meets WCAG AA standards
- [ ] No layout shifts during loading
