# VedaAI – AI Assessment Creator

> An intelligent exam paper generation system for educators — create curriculum-aligned, beautifully formatted question papers in seconds.

![VedaAI Screenshot](./docs/screenshot.png)

---

## ✨ Features

- **Multi-step assignment creation** — guided form with validation
- **AI-powered generation** — structured prompts → parsed JSON → never raw LLM output
- **Real-time updates** — WebSocket notifies frontend the instant the paper is ready
- **Exam-quality output** — proper CBSE-style formatting with sections, difficulty tags, marks
- **Print / Download PDF** — browser print API with print-specific CSS
- **Regenerate** — one-click to get a fresh paper
- **Answer key toggle** — toggle model answers inline
- **MongoDB persistence** — assignments, generated papers, job records all stored

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │ Zustand  │  │ react-hook │  │   WebSocket Client   │ │
│  │  Store   │  │   -form    │  │   (socket.io-client) │ │
│  └──────────┘  └────────────┘  └──────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                    BACKEND (Express + TS)                │
│                                                         │
│  POST /api/assignments  →  creates assignment           │
│       │                    fires generation (inline)    │
│       │                    [FUTURE: enqueue to BullMQ]  │
│       ▼                                                 │
│  generateQuestionPaper()  →  Anthropic Claude API       │
│       │                    structured prompt            │
│       │                    JSON response parsing        │
│       ▼                                                 │
│  MongoDB.save(GeneratedPaper)                           │
│       │                                                 │
│  io.emit("job:progress", ...)  →  WebSocket broadcast   │
│                                                         │
│  [FUTURE BullMQ Flow]                                   │
│  paperGenerationQueue.add(job)                          │
│       ↓ Redis                                           │
│  paperWorker.process(job)                               │
│       ↓                                                 │
│  emitJobProgress() via WebSocket                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
vedaai/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Assignment.ts      # Assignment schema + validation
│   │   │   ├── GeneratedPaper.ts  # Full paper with sections/questions
│   │   │   └── JobRecord.ts       # BullMQ job tracking in MongoDB
│   │   ├── routes/
│   │   │   ├── assignments.ts     # CRUD + trigger generation
│   │   │   └── papers.ts          # Fetch + regenerate papers
│   │   ├── controllers/
│   │   │   └── aiController.ts    # Prompt builder + AI call + parser
│   │   ├── workers/
│   │   │   └── queues.ts          # BullMQ setup (commented, ready to activate)
│   │   └── index.ts               # Express + Socket.IO + MongoDB bootstrap
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── assignments/page.tsx   # Assignments list
    │   │   ├── create/page.tsx        # Multi-step creation form
    │   │   └── output/[id]/page.tsx   # Generated paper viewer
    │   ├── components/
    │   │   └── ui/Sidebar.tsx
    │   ├── store/
    │   │   └── assignmentStore.ts     # Zustand store
    │   ├── lib/
    │   │   ├── api.ts                 # Typed API client
    │   │   └── socket.ts              # WebSocket hook
    │   └── types/index.ts             # Shared TypeScript types
    ├── next.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Anthropic API key

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and MONGODB_URI
npm run dev
# → http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
# Create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
# → http://localhost:3000
```

---

## 🔮 Activating Redis + BullMQ

The queue infrastructure is scaffolded and ready. To activate:

1. `npm install bullmq ioredis`
2. Set `REDIS_HOST` and `REDIS_PORT` in `.env`
3. In `src/workers/queues.ts` — uncomment all code
4. In `src/routes/assignments.ts` — replace the inline `generateQuestionPaper()` call with `paperGenerationQueue.add(...)` (instructions in comments)
5. Run workers separately: `ts-node src/workers/queues.ts`

---

## 🧠 AI Approach

- **Prompt engineering**: structured prompt with section-by-section instructions, difficulty distribution targets (40% Easy / 35% Moderate / 20% Hard / 5% Challenging)
- **Output format**: AI instructed to return strict JSON only — no markdown fences, no preamble
- **Parsing**: response is cleaned of any accidental fencing, then JSON.parsed and validated
- **Never rendered raw**: LLM output is mapped to typed `IGeneratedPaper` schema before any display

---

## 🎨 Design Decisions

- **Playfair Display + DM Sans** — editorial, academic tone without feeling corporate
- **Warm parchment palette** — `#f5f3ef` surface evokes paper and trust
- **Ink-dark sidebar** (`#0f0f14`) — strong contrast, professional
- **Exam paper rendering** — Times New Roman, double-rule header, proper section hierarchy matches real CBSE papers
- **Print CSS** — sidebar hidden, shadows removed, full-width layout for clean PDF output

---

## 📋 MongoDB Schemas

| Schema | Purpose |
|--------|---------|
| `Assignment` | Core metadata (title, subject, class, question types, status, jobId) |
| `GeneratedPaper` | Full paper (sections → questions with difficulty, marks, answer keys) |
| `JobRecord` | BullMQ job tracking (progress, attempts, error, completedAt) |

---

*Built with ❤️ for VedaAI Hiring Assignment*
