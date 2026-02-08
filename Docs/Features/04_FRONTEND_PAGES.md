# Feature 04: Frontend — New Pages & Routing

## Priority: HIGH (Core missing functionality)
## Estimated Effort: 10-14 hours
## Depends On: None (frontend-only, can be done in parallel with backend work)

---

## Overview

The frontend currently has only 2 views (`home` and `chat`) with no proper routing. The app needs several more pages to be a complete application. This guide details every page to create, including component structure, exact file paths, and how they connect to the existing architecture.

---

## Current State (What Exists)

### Existing Views (in `AppContext.jsx`)
- `state.view` can be: `"home"`, `"chat"`, `"results"` (results view is declared but not implemented)
- **HeroSection** — Landing page with voice/chat CTAs
- **ChatView** — Sequential question flow (age → income → state → category → show schemes inline)
- No routing library — views are swapped via `state.view` string + `AnimatePresence`

### Existing Components
- `ChatInterface.jsx` — `MessageBubble` + `ChatInterface` (message list + input)
- `ChatView.jsx` — Full chat page with question flow + scheme results
- `HeroSection.jsx` — Landing hero with 3D card
- `SchemeCard.jsx` — `SchemeCard` + `SchemeList` components
- `SMSModal.jsx` — Modal for sending SMS
- `VoiceInput.jsx` — Speech recognition input
- 15 UI primitives in `components/ui/`

### Navigation
- `FloatingDock` at bottom with 4 items: Home, Chat, Voice, Schemes
- Voice button currently just navigates to chat view

### State Management
- `AppContext.jsx` with `useReducer`
- State: `view`, `userProfile`, `messages`, `eligibleSchemes`, `isTyping`, `currentQuestion`, `selectedScheme`, `isSMSModalOpen`

---

## Pages to Create

### Page 1: Schemes Browser (`/schemes`)
**Purpose**: Browse and search ALL available schemes (not just eligible ones)

**File**: `frontend/src/components/SchemesPage.jsx`

```
SchemesPage
├── Header (title + search bar)
├── Filters Sidebar/Bar
│   ├── Category filter (General, SC, ST, OBC, EWS, Minority)
│   ├── State filter (dropdown of all Indian states)
│   ├── Income range slider
│   └── Age range slider
├── Scheme Grid (uses existing SchemeCard)
│   ├── SchemeCard (reuse existing)
│   └── Pagination or infinite scroll
├── Empty state when no results
└── Loading skeleton
```

**Implementation Details**:
```jsx
// frontend/src/components/SchemesPage.jsx
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { SchemeCard } from "@/components/SchemeCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockSchemes, indianStates, categories } from "@/data/schemes";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";

// Component should:
// 1. Show all schemes from mockSchemes (later from API)
// 2. Allow filtering by state, category, income, age
// 3. Allow search by name/benefits text
// 4. Show total count and active filters as badges
// 5. Each SchemeCard has "Check My Eligibility" button → navigates to chat
// 6. Each SchemeCard has "Send SMS" button → opens SMSModal
// 7. Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop
```

**API Integration** (when backend is ready):
```javascript
// GET /api/schemes?state=Maharashtra&category=OBC&page=1&limit=10
// For now, use mockSchemes from frontend/src/data/schemes.js
```

---

### Page 2: Scheme Detail Page (`/scheme/:id`)
**Purpose**: Full details of a single scheme

**File**: `frontend/src/components/SchemeDetailPage.jsx`

```
SchemeDetailPage
├── Back button
├── Scheme Header
│   ├── Name (large)
│   ├── Status badge (Active/Expired)
│   ├── Category + State badges
│   └── Last updated date
├── Key Info Cards Row
│   ├── Income Limit card
│   ├── Age Range card
│   └── Category card
├── Benefits Section (full text, formatted)
├── Eligibility Criteria Section
│   ├── Age requirement
│   ├── Income requirement
│   ├── Category requirement
│   └── State requirement
├── Required Documents Section
│   └── Checklist with icons
├── How to Apply Section
│   ├── Step-by-step instructions
│   └── Apply Now button (external link)
├── Action Buttons
│   ├── Check My Eligibility → chat
│   ├── Send SMS Details
│   └── Share Scheme (copy link)
└── Related Schemes Section (schemes with same category/state)
```

---

### Page 3: Results / Eligibility Results Page (`/results`)
**Purpose**: Display eligibility results after completing the chat flow

**File**: `frontend/src/components/ResultsPage.jsx`

```
ResultsPage
├── Header
│   ├── "Your Eligible Schemes" title
│   ├── Profile Summary Card (shows age, income, state, category)
│   └── "Edit Profile" button → goes back to chat
├── Stats Bar
│   ├── Total eligible count
│   ├── Total potential benefits amount
│   └── States covered
├── Scheme Cards Grid (eligible schemes only)
│   ├── SchemeCard with eligibilityReason shown
│   ├── "View Details" → scheme detail page
│   ├── "Send SMS" → SMSModal
│   └── "Apply Now" → external link
├── Empty State (no eligible schemes)
│   ├── Illustration/icon
│   ├── "No matching schemes found"
│   └── "Try different criteria" button → chat
└── "Check Again" button → restart chat flow
```

**Connect to existing state**: `useApp()` provides `eligibleSchemes` and `userProfile`

---

### Page 4: About Page (`/about`)
**Purpose**: Information about BharatConnect AI

**File**: `frontend/src/components/AboutPage.jsx`

```
AboutPage
├── Hero Section
│   ├── "About BharatConnect AI"
│   └── Mission statement
├── Features Section (3-column grid)
│   ├── AI-Powered Discovery (icon + description)
│   ├── Voice-First Interface (icon + description)
│   ├── SMS Delivery (icon + description)
│   ├── Multi-Language Support (icon + description)
│   ├── 100+ Schemes Database (icon + description)
│   └── Secure & Private (icon + description)
├── How It Works Section (stepper)
│   ├── Step 1: Tell us about yourself
│   ├── Step 2: AI finds matching schemes
│   ├── Step 3: Get details via SMS
│   └── Step 4: Apply online
├── Tech Stack Section (optional)
├── Team Section (optional placeholder)
└── Footer with links
```

---

### Page 5: Contact / Help Page (`/help`)
**Purpose**: FAQ, contact information, and help resources

**File**: `frontend/src/components/HelpPage.jsx`

```
HelpPage
├── Header "Help & Support"
├── FAQ Section (Accordion)
│   ├── "How do I check my eligibility?"
│   ├── "What documents do I need?"
│   ├── "Is my data safe?"
│   ├── "How do I apply for a scheme?"
│   ├── "Can I use this in my language?"
│   └── "Who built this?"
├── Quick Links Section
│   ├── National Scholarship Portal
│   ├── State scholarship portals
│   └── Important helpline numbers
├── Contact Form (optional)
│   ├── Name, Email, Message
│   └── Submit button
└── Emergency Helpline Numbers
```

---

### Page 6: Profile Page (`/profile`)
**Purpose**: View and edit user profile, see history

**File**: `frontend/src/components/ProfilePage.jsx`

```
ProfilePage
├── Profile Card
│   ├── Avatar/Icon
│   ├── Age, Income, State, Category
│   └── "Edit" button (inline editing)
├── Eligibility History
│   ├── List of past checks with dates
│   └── Eligible scheme count per check
├── Saved Schemes (bookmarked)
│   └── List of schemes user saved
├── SMS History
│   ├── List of SMS sent
│   └── Scheme name + phone + date
└── "Start New Check" button
```

---

## Step-by-Step Implementation

### Step 1: Install React Router

```bash
cd frontend
npm install react-router-dom
```

### Step 2: Set Up Routing

**Create `frontend/src/router.jsx`**:
```jsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { SchemesPage } from "@/components/SchemesPage";
import { SchemeDetailPage } from "@/components/SchemeDetailPage";
import { ResultsPage } from "@/components/ResultsPage";
import { AboutPage } from "@/components/AboutPage";
import { HelpPage } from "@/components/HelpPage";
import { ProfilePage } from "@/components/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: null },           // Home (HeroSection)
      { path: "schemes", element: <SchemesPage /> },
      { path: "scheme/:id", element: <SchemeDetailPage /> },
      { path: "results", element: <ResultsPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "help", element: <HelpPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);
```

### Step 3: Update `main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

### Step 4: Update `App.jsx`

Convert `App.jsx` to use `<Outlet />` from react-router instead of view-based switching:

```jsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map dock items to routes
  const dockItems = [
    { title: "Home", icon: Home, path: "/" },
    { title: "Chat", icon: MessageSquare, path: "/chat" },  // Keep as view-based
    { title: "Schemes", icon: Search, path: "/schemes" },
    { title: "About", icon: Info, path: "/about" },
    { title: "Help", icon: HelpCircle, path: "/help" },
  ];

  return (
    <WavyBackground ...>
      {/* Route-based pages */}
      <Outlet />
      
      {/* View-based pages (home, chat) still use the old system */}
      {location.pathname === "/" && <HeroSection ... />}
      
      {/* Floating Dock - always visible */}
      <FloatingDock items={dockItems} onNavigate={navigate} />
      
      {/* SMS Modal - global */}
      <SMSModal ... />
    </WavyBackground>
  );
}
```

**Alternative simpler approach** — Keep the view-based system and just add more views:

Update `AppContext.jsx` to support more views:
```jsx
// Add views: "home", "chat", "schemes", "scheme-detail", "results", "about", "help", "profile"
```

### Step 5: Update AppContext for New Views

**Edit `frontend/src/context/AppContext.jsx`**:

Add new state fields:
```jsx
const initialState = {
  // ... existing fields ...
  selectedSchemeId: null,       // For scheme detail page
  schemeFilters: {              // For schemes browser
    search: "",
    category: "ALL",
    state: "ALL",
    incomeMax: null,
    ageMin: null,
    ageMax: null,
  },
  savedSchemes: [],             // Bookmarked schemes
  eligibilityHistory: [],       // Past eligibility checks
};
```

Add new actions:
```jsx
const actionTypes = {
  // ... existing ...
  SET_SELECTED_SCHEME_ID: "SET_SELECTED_SCHEME_ID",
  SET_SCHEME_FILTERS: "SET_SCHEME_FILTERS",
  SAVE_SCHEME: "SAVE_SCHEME",
  UNSAVE_SCHEME: "UNSAVE_SCHEME",
  ADD_ELIGIBILITY_HISTORY: "ADD_ELIGIBILITY_HISTORY",
};
```

### Step 6: Update FloatingDock

**Edit `frontend/src/components/ui/floating-dock.jsx`**:

Add navigation items for the new pages. The dock should show:
- Home (house icon)
- Chat (message icon)
- Schemes (search/list icon)
- About (info icon)
- Profile (user icon)

### Step 7: Create Each Page Component

Create these files (detailed implementations above):
1. `frontend/src/components/SchemesPage.jsx`
2. `frontend/src/components/SchemeDetailPage.jsx`
3. `frontend/src/components/ResultsPage.jsx`
4. `frontend/src/components/AboutPage.jsx`
5. `frontend/src/components/HelpPage.jsx`
6. `frontend/src/components/ProfilePage.jsx`

### Step 8: Add API Endpoints for Scheme Browsing

**Add to `frontend/src/services/api.js`**:
```javascript
// Get all schemes (with optional filters)
export const getSchemes = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== "ALL") params.set("category", filters.category);
    if (filters.state && filters.state !== "ALL") params.set("state", filters.state);
    if (filters.search) params.set("search", filters.search);

    const response = await fetch(`${API_BASE_URL}/schemes?${params}`);
    if (!response.ok) throw new Error("Failed to fetch schemes");
    return await response.json();
  } catch (error) {
    console.error("Schemes API error:", error);
    // Fallback to mock data
    return { schemes: mockSchemes, count: mockSchemes.length };
  }
};

// Get single scheme by ID
export const getSchemeById = async (schemeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/schemes/${schemeId}`);
    if (!response.ok) throw new Error("Scheme not found");
    return await response.json();
  } catch (error) {
    console.error("Scheme detail API error:", error);
    return mockSchemes.find(s => s.id === schemeId) || null;
  }
};
```

**Add Backend Route** — `Backend/routes/schemes.py`:
```python
router = APIRouter()

@router.get("/schemes")
async def list_schemes(
    category: str = None,
    state: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all schemes with optional filtering"""
    ...

@router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single scheme by ID"""
    ...
```

---

## Files to Create
- `frontend/src/components/SchemesPage.jsx`
- `frontend/src/components/SchemeDetailPage.jsx`
- `frontend/src/components/ResultsPage.jsx`
- `frontend/src/components/AboutPage.jsx`
- `frontend/src/components/HelpPage.jsx`
- `frontend/src/components/ProfilePage.jsx`
- `frontend/src/router.jsx` (if using react-router)
- `Backend/routes/schemes.py` (new API routes)

## Files to Modify
- `frontend/src/App.jsx` — add routing / new views
- `frontend/src/main.jsx` — add RouterProvider (if using react-router)
- `frontend/src/context/AppContext.jsx` — add new state fields + actions
- `frontend/src/components/ui/floating-dock.jsx` — add new navigation items
- `frontend/src/services/api.js` — add new API calls
- `frontend/package.json` — add react-router-dom
- `Backend/main.py` — include schemes router

## Design Conventions to Follow
- Use `@/` import aliases for all imports
- Use `cn()` utility for conditional classes
- Use `framer-motion` for page transitions and animations
- Use existing UI components from `components/ui/`
- Indian flag color scheme: saffron (#FF9933), green (#138808), navy (#000080)
- Dark mode by default
- Outfit font family
- Responsive: mobile-first design

---

## Verification Checklist
- [ ] All 6 new pages render without errors
- [ ] Navigation between pages works (FloatingDock + back buttons)
- [ ] Schemes browser shows all mock schemes
- [ ] Scheme filters work (category, state)
- [ ] Scheme detail page shows full information
- [ ] Results page shows eligible schemes from chat flow
- [ ] About page renders all sections
- [ ] Help page FAQ accordion works
- [ ] Profile page shows user data from context
- [ ] Deep linking works (direct URL to /schemes)
- [ ] Page transitions are smooth (AnimatePresence)
- [ ] Mobile responsive on all pages
- [ ] Existing chat flow still works end-to-end
