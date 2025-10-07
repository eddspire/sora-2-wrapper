# Sora 2 Pro Video Generator - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Utility-Focused)
**Primary References:** Linear (typography/spacing), Notion (input styling), Material Design (progress feedback)
**Justification:** This is a productivity tool where clarity, efficiency, and real-time feedback are paramount. Users need to monitor queue status, track generation progress, and manage multiple video jobs simultaneously.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background: 12 8% 8% (deep charcoal, main canvas)
- Surface: 12 8% 12% (elevated cards/containers)
- Surface Hover: 12 8% 16% (interactive surface states)
- Border: 12 8% 20% (subtle dividers)
- Primary: 262 80% 60% (vibrant purple for CTAs, active states)
- Primary Hover: 262 80% 65%
- Success: 142 76% 45% (queue completed, generation success)
- Warning: 38 92% 50% (queue processing)
- Error: 0 72% 51% (generation failed)
- Text Primary: 0 0% 98% (headings, important text)
- Text Secondary: 0 0% 70% (descriptions, metadata)
- Text Tertiary: 0 0% 50% (subtle labels)

### B. Typography

**Font Stack:**
- Primary: 'Inter' (via Google Fonts) for UI elements
- Monospace: 'JetBrains Mono' for technical data (video IDs, timestamps)

**Type Scale:**
- Hero Input: text-lg (18px) - for prompt input
- Section Headers: text-2xl font-semibold (24px)
- Video Titles: text-sm font-medium (14px)
- Metadata: text-xs (12px) font-normal
- Body: text-sm (14px)

**Line Heights:** leading-relaxed (1.625) for readability in dense interfaces

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 3, 4, 6, 8, 12, 16
- Component padding: p-6 or p-8
- Section gaps: gap-6 or gap-8
- Grid gaps: gap-4
- Inline spacing: space-x-3, space-y-4

**Container Strategy:**
- Max width: max-w-7xl mx-auto
- Padding: px-6 on mobile, px-8 on desktop
- Full-width prompt area with contained content below

### D. Component Library

**1. Prompt Input Section**
- Large textarea styled like ChatGPT
- Background: surface color with subtle border
- Focus state: border color changes to primary with ring-2 ring-primary/20
- Rounded corners: rounded-xl
- Min height: 120px, auto-expand with content
- Submit button: Primary purple, rounded-lg, px-6 py-3
- Icon: Send/Generate icon on button

**2. Queue Dashboard**
- Horizontal stats cards showing:
  - Queued (warning color accent)
  - Processing (primary color accent with animated pulse)
  - Completed (success color accent)
  - Failed (error color accent)
- Each card: rounded-lg, p-4, border with colored left accent (border-l-4)
- Numbers: text-3xl font-bold
- Labels: text-sm text-secondary

**3. Video Grid**
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Each video card:
  - Background: surface color
  - Rounded: rounded-xl
  - Border: 1px border color
  - Hover: subtle scale (hover:scale-[1.02]) and shadow
  - Transition: transition-all duration-200

**4. Video Card Components**
- Video thumbnail/player: aspect-video with rounded-t-xl
- Progress overlay for processing videos: semi-transparent backdrop with centered progress bar
- Progress bar: h-2 rounded-full with animated gradient (bg-gradient-to-r from-primary to-primary/60)
- Metadata section below video: p-4
  - Prompt text: truncate after 2 lines (line-clamp-2)
  - Status badge: rounded-full px-3 py-1 text-xs with status-specific colors
  - Timestamp: text-xs text-tertiary
- Action buttons: Download icon button (hover:bg-surface-hover)

**5. Progress Indicators**
- Linear progress: Full-width bar with percentage label
- Indeterminate spinner: For queued state (border-4 border-primary/30 border-t-primary)
- Percentage display: Large centered number (text-4xl) during processing

**6. Navigation/Header**
- Sticky header: backdrop-blur-md bg-background/80
- Logo/title on left
- API status indicator on right (green dot for connected)
- Border bottom: subtle border-b

### E. Micro-interactions

**Animation Principles:** Minimal, purposeful only
- Progress bars: Smooth width transitions (transition-all duration-300)
- Video cards: Subtle hover lift (transform scale, 200ms ease-out)
- Status changes: Fade transitions (transition-opacity duration-200)
- Queue updates: Slide-in for new items (animate-in slide-in-from-bottom-4)

**Loading States:**
- Skeleton loaders for video cards: Animated gradient shimmer
- Pulse animation for processing status
- Spinner for initial load

### F. Responsive Behavior

- Mobile (< 768px): Single column grid, stacked queue stats
- Tablet (768px - 1024px): 2-column video grid
- Desktop (> 1024px): 3-column video grid, horizontal queue dashboard

### G. Empty/Error States

- Empty queue: Centered message with ghost illustration, "No videos yet" + CTA to generate
- Error state: Red border on failed cards with retry button
- Rate limit reached: Warning banner at top with countdown timer

### H. Accessibility

- Dark mode optimized for reduced eye strain
- Focus indicators: Prominent ring on all interactive elements
- ARIA labels on all icon-only buttons
- Semantic HTML structure
- Keyboard navigation support for entire interface