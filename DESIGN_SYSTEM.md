# V19 Plus Design System

This document captures the premium, original design system tokens and visual guidelines for the V19 Plus OTT platform.

---

## 1. Color Palette

V19 Plus uses a custom high-end Orange & Black color palette, delivering a cinematic and immersive viewing experience.

| Color Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Warm Black** | `#0A0806` | Primary background, near-black slate. |
| **Warm Raised** | `#14110D` | Navigation overlays, panels, active card focus backgrounds. |
| **Warm Card** | `#181410` | Static hover card bases, secondary borders. |
| **V19 Orange** | `#FF5C00` | Primary accent color, highlights, player scrubbers, active states. |
| **Deep Orange** | `#D44900` | Pressed buttons, darker gradient thresholds. |
| **Cream Text** | `#FAF6EF` | Headers, body text, premium titles. |
| **Muted Cream** | `#8C8478` | Subtitles, disabled states, metadata cards. |

---

## 2. Typography

We define custom typographic weights to ensure hierarchy and visual excellence:

- **Cinematic Headlines**: `Big Shoulders Display` (Heavy, Black, and uppercase styling). Used for page banners, row headings, and hero rankings.
- **UI & Reading Text**: `Inter` (Regular, Medium, Semi-Bold, Bold). Used for body descriptions, search input text, buttons, and settings pages.

---

## 3. Spacing & Grid System

- **Base Unit**: `8px` spacing steps. All padding, margins, gaps, and heights follow strict grid steps (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Responsive Layout**: 12-column flex-grid containers with unified gutters to keep posters aligned across screen form factors.

---

## 4. Logo Placement & Alignment Rules

To guarantee a premium feel, the V19 Plus brand logo asset `/logo.png` must comply with strict alignment constraints:
- **Vertical/Horizontal Alignment**: Located left-aligned inside global navigation headers, vertically centered exactly matching navigation heights (`16px` padding bounds).
- **Responsive Scaling**: Scaled down proportionally on mobile viewports (`h-8`) and expanding on larger desktop screens (`h-10`).
- **Isolation Zones**: A minimum margin of `32px` is enforced on the right side of the logo before rendering navigation links, preventing visual overlaps.

---

## 5. Animation Principles

- **Easing Curves**: All animations rely on standard cubic easing curves. Micro-interactions (hovering navigation bars) use `cubic-bezier(0.4, 0, 0.2, 1)`.
- **3D Motion**: Perspective transformation (`rotateX` / `rotateY`) is attached to poster grid cards, allowing dynamic 3D cursor-relative tilt rotations on mouse hover, paired with cursor-tracking ambient radial light leaks.
