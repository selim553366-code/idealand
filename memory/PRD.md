# idealand.ai — PRD

## Original Problem Statement
"Bir iniş sayfası oluşturun: a website and app creator website called idealand.ai. Vibrant gradient glassmorphism, Skeuominimalism UI design, Modern skeuomorphic buttons, açık mavi/sky blue gradyan renkler (referans görseldeki gibi), anasayfada chat barı olacak, anasayfa çok dolu olmayacak."

## User Personas
- Indie maker / founder who wants to launch a landing page or app fast
- Designer exploring AI-generated UI concepts
- Early-access visitor joining the waitlist

## Core Requirements (static)
- Minimal landing page, English language
- Light sky-blue / azure vibrant gradient glassmorphism theme (light mode only)
- Skeuominimal UI: tactile skeuomorphic buttons (inner highlights, pressed states), glass cards
- Hero with chat-bar-style prompt input (VISUAL ONLY for now — no real AI), prompt chips
- Waitlist email capture stored in MongoDB with queue number
- Sections: Hero + chat bar, editorial marquee, 3-card feature row, minimal footer
- Premium motion: framer-motion masked line-by-line hero reveal, scroll reveals, lenis smooth scroll, parallax floating glass orbs/cards

## Architecture
- Frontend: React 19 + Tailwind + framer-motion 11 + lenis, components in /app/frontend/src/components/
- Backend: FastAPI, /api/waitlist (POST, dedupe by lowercase email, queue_number), /api/waitlist/count, /api/ health
- DB: MongoDB `waitlist` collection via MONGO_URL/DB_NAME env

## Implemented
- 2026-07: Landing page MVP — hero masked reveal, typewriter chat bar (visual demo), prompt chips, glassmorphic navbar, marquee, numbered feature cards, footer. Badge pill above hero headline removed per user request.
- 2026-07: Auth — JWT email/password (register/login/logout/refresh, brute-force lockout, admin seeding) + Emergent-managed Google OAuth + Resend welcome email on signup (sky-blue branded template). Waitlist modal replaced: "Get Started" now opens signup; Sign in modal is sign-in only. All sparkle orb icons removed per user request.

## Backlog
- P0: Real AI generation behind the chat bar (user deferred: "şuanlık olmasın")
- P1: Waitlist confirmation emails (Resend)
- P1: Turkish/English language switcher
- P2: Referral link to skip the queue
- P2: Showcase gallery of generated sites
