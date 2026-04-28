# CampusOS - AI Student Ecosystem

CampusOS is a production-style web application for students that combines trusted digital identity, AI-powered resource discovery, scam detection, and a verified jobs ecosystem into one modern platform.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, `next-themes`
- Backend: Node.js, Express 5, TypeScript, Zod, JWT, rate limiting, Helmet
- Database: MongoDB schema models included with an in-memory seed fallback for instant local demos
- AI: OpenAI-ready service layer with safe fallback heuristics when no API key is configured

## Project Structure

```text
campusos-ai-student-ecosystem/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── data/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── data/
│       │   └── lib/
│       ├── .env.example
│       └── package.json
├── package.json
└── README.md
```

## Implemented Pages

- Landing page with premium hero, feature grid, product preview, and deployment CTA
- Login and signup flows
- Dashboard
- Digital student ID profile page
- Verified jobs page
- AI notes and resources page
- Scam checker page

## Core Features

### 1. Digital Student Identity

- Student signup and login
- Verification via trusted college email domain
- ID upload verification endpoint
- Verified badge and shareable profile slug
- Skills, projects, certifications, and resume-ready profile model

### 2. AI Notes and Resource Finder

- Natural language query support
- Semantic-style ranking based on topic intent, tags, subject overlap, and offline readiness
- Optional OpenAI summary layer
- Search results across notes, PDFs, videos, and links

### 3. Scam Detection System

- Accepts job links or pasted message content
- Checks domain trust, urgency language, suspicious keywords, and generic recruiter signals
- Returns `safe`, `suspicious`, or `scam`
- Includes confidence score and reasons

### 4. Additional Product Layers

- Verified jobs and internships board
- Resume analyzer
- Skill gap analyzer
- AI career roadmap generator
- Bookmark API
- Notifications feed
- Community-ready scam reporting data layer

## Database Schema

MongoDB schemas are defined in:

- [student.model.ts](/C:/Users/princ/Documents/Codex/2026-04-20-you-are-a-senior-full-stack-2/apps/api/src/models/student.model.ts)
- [resource.model.ts](/C:/Users/princ/Documents/Codex/2026-04-20-you-are-a-senior-full-stack-2/apps/api/src/models/resource.model.ts)
- [job.model.ts](/C:/Users/princ/Documents/Codex/2026-04-20-you-are-a-senior-full-stack-2/apps/api/src/models/job.model.ts)
- [notification.model.ts](/C:/Users/princ/Documents/Codex/2026-04-20-you-are-a-senior-full-stack-2/apps/api/src/models/notification.model.ts)
- [scam-report.model.ts](/C:/Users/princ/Documents/Codex/2026-04-20-you-are-a-senior-full-stack-2/apps/api/src/models/scam-report.model.ts)

Key collections:

- `students`
- `resources`
- `jobs`
- `notifications`
- `scamreports`

## API Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Profile

- `GET /api/v1/profile/me`
- `GET /api/v1/profile/public/:slug`
- `PATCH /api/v1/profile/me`
- `POST /api/v1/profile/verify-id`
- `POST /api/v1/profile/bookmark`

### Resources and Jobs

- `POST /api/v1/resources/search`
- `GET /api/v1/jobs`

### Scam and AI

- `POST /api/v1/scam/check`
- `POST /api/v1/ai/resume-analyze`
- `POST /api/v1/ai/skill-gap`
- `POST /api/v1/ai/career-roadmap`

### System

- `GET /api/v1/notifications`
- `GET /api/v1/health`

## Sample UI Design Notes

- Visual direction: Apple and Stripe-inspired minimal futurism
- Layout: sidebar plus top command bar for product pages
- Effects: soft shadows, glass surfaces, cyan-blue atmospheric gradients
- Motion: Framer Motion is used for staggered reveal and polished transitions
- Themes: dark mode and light mode supported

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create:

- `apps/api/.env`
- `apps/web/.env.local`

Recommended values:

```env
# apps/api/.env
PORT=4000
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace-with-a-strong-secret
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
MONGO_URI=
```

```env
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

### 3. Run the app

Frontend:

```bash
npm run dev:web
```

Backend:

```bash
npm run dev:api
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment Guide

### Vercel for Frontend

1. Import the repository into Vercel.
2. Set root directory to `apps/web`.
3. Add `NEXT_PUBLIC_API_BASE_URL` pointing to your deployed API.
4. Build command: `npm run build`
5. Output is handled automatically by Next.js.

### Render for API

1. Create a new Web Service in Render.
2. Set root directory to `apps/api`.
3. Install command: `npm install`
4. Build command: `npm run build`
5. Start command: `npm run start`
6. Add environment variables from `apps/api/.env.example`.

### Hostinger or Traditional Node Host

1. Deploy the built API from `apps/api/dist`.
2. Reverse proxy it behind HTTPS.
3. Serve the Next.js app through Vercel or a Node process.
4. Point frontend environment variables to the public API base URL.

## Notes for Production Hardening

- Replace seed fallback persistence with MongoDB-backed repositories
- Add refresh tokens or managed auth if needed
- Move uploads to object storage such as S3 or Cloudinary
- Add audit logs and admin moderation for community scam reports
- Add vector search or embeddings store for truly large semantic resource corpora
