# Sprint Board — Kanban Task Manager

A polished, full-stack Kanban task board with drag-and-drop, real-time updates, and team collaboration features. Built with Go, React, TypeScript, and Supabase.

**[Live Demo →](#)** · **[Assessment PDF →](#)**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, dnd-kit |
| **Backend** | Go, Chi router |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Anonymous Auth + Row Level Security |
| **Deployment** | Vercel (frontend), Render (backend) |

## Architecture

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   React App  │──────▶│  Go Backend  │──────▶│   Supabase   │
│   (Vercel)   │  API  │   (Render)   │  HTTP │  (PostgreSQL)│
│              │◀──────│              │◀──────│  + Auth + RLS │
└──────────────┘       └──────────────┘       └──────────────┘
```

The React frontend calls the Go backend API. The Go backend handles business logic (validation, completed_at management, activity logging) and proxies authenticated requests to Supabase's PostgREST and Auth APIs. Row Level Security ensures each guest user only sees their own data.

## Features

### Core
- **4-column Kanban board** — To Do, In Progress, In Review, Done
- **Drag-and-drop** — reorder within and across columns using dnd-kit
- **Guest authentication** — automatic anonymous sign-in via Supabase
- **Row Level Security** — each user only sees their own tasks
- **Dark / Light mode** — system preference detection with manual toggle
- **Responsive design** — mobile (single column), tablet (2-col), desktop (4-col)

### Advanced Features (all 8 implemented)
1. **Priority badges** — color-coded arrows (high/normal/low) with left-edge stripe on cards
2. **Due date indicators** — red for overdue, amber for due soon
3. **Board summary & stats** — task counts, completion progress bar, overdue/due-today indicators
4. **Search & filtering** — search by title, filter by priority and labels
5. **Labels / tags** — create custom colored labels, assign to tasks, filter by label
6. **Task comments** — threaded comments with timestamps in the detail panel
7. **Team members & assignees** — create members, assign to tasks, avatar display on cards
8. **Task activity log** — tracks status changes, priority changes, comments in a timeline

### UX Details
- Column progress bars showing task density
- One-click label + task creation (no extra steps)
- One-click member + task creation
- Auto-assign newly created members to the current task
- Click-outside-to-close on all dropdowns
- Loading states on async actions
- Touch support for mobile drag-and-drop
- Empty states with clear call-to-action

## Project Structure

```
kanban-board/
├── backend/                    # Go REST API
│   ├── main.go                 # Server entry point, router, middleware
│   └── internal/
│       ├── config/             # Environment variable loading
│       ├── middleware/          # JWT auth extraction
│       ├── handlers/           # Route handlers
│       │   ├── auth.go         # Anonymous sign-in, token refresh
│       │   ├── tasks.go        # Task CRUD + reorder + activity logging
│       │   ├── labels.go       # Label CRUD + task-label assignments
│       │   ├── team.go         # Team member CRUD + task assignments
│       │   ├── comments.go     # Comments with activity logging
│       │   └── activity.go     # Activity log retrieval
│       └── supabase/           # HTTP client for Supabase APIs
│
├── frontend/                   # React + TypeScript app
│   ├── src/
│   │   ├── App.tsx             # Main app with auth, state, routing
│   │   ├── components/
│   │   │   ├── Header.tsx      # Stats, search, filters, theme toggle
│   │   │   ├── Board.tsx       # dnd-kit context, column layout
│   │   │   ├── Column.tsx      # Droppable column with progress bar
│   │   │   ├── TaskCard.tsx    # Draggable card with labels, avatars
│   │   │   ├── CreateTaskModal.tsx  # Task creation form
│   │   │   ├── TaskDetailPanel.tsx  # Slide-over detail/edit panel
│   │   │   └── DropZone.tsx    # Invisible sortable for end-of-column drops
│   │   ├── hooks/
│   │   │   └── useTheme.ts     # Dark/light mode with persistence
│   │   ├── lib/
│   │   │   ├── api.ts          # API client with JWT management
│   │   │   └── dates.ts        # Date formatting utilities
│   │   └── types/
│   │       └── index.ts        # TypeScript types + UI constants
│   └── index.html
│
└── supabase/
    └── schema.sql              # Full database schema with RLS policies
```

## API Endpoints (22 total)

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/anonymous` | Create guest session |
| POST | `/api/auth/refresh` | Refresh expired token |

### Protected (requires Authorization header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks with labels, assignees, comment count |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task (handles completed_at logic) |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/reorder` | Batch update positions after drag-and-drop |
| GET | `/api/labels` | List labels |
| POST | `/api/labels` | Create label |
| DELETE | `/api/labels/:id` | Delete label |
| POST | `/api/task-labels` | Assign label to task |
| DELETE | `/api/task-labels/:taskId/:labelId` | Remove label from task |
| GET | `/api/team` | List team members |
| POST | `/api/team` | Create team member |
| DELETE | `/api/team/:id` | Delete team member |
| POST | `/api/task-assignees` | Assign member to task |
| DELETE | `/api/task-assignees/:taskId/:memberId` | Remove member from task |
| GET | `/api/tasks/:taskId/comments` | List comments for a task |
| POST | `/api/tasks/:taskId/comments` | Add comment (logs activity) |
| DELETE | `/api/comments/:id` | Delete comment |
| GET | `/api/tasks/:taskId/activity` | Get activity log for a task |

## Database Schema

7 tables with Row Level Security enabled on all:

- **tasks** — core task data (title, status, priority, due_date, position)
- **labels** — user-created colored tags
- **task_labels** — many-to-many join (task ↔ label)
- **team_members** — named team members with avatar colors
- **task_assignees** — many-to-many join (task ↔ member)
- **comments** — task comments with author name
- **activity_log** — audit trail with JSONB details

Trigger: `updated_at` auto-refreshes on task updates.
Business logic: `completed_at` is managed in the Go backend (set when status → done, cleared when moved back).

## Local Development Setup

### Prerequisites
- [Go](https://go.dev/dl/) (1.22+)
- [Node.js](https://nodejs.org/) (18+)
- [Supabase](https://supabase.com/) account (free tier)

### 1. Clone the repository
```bash
git clone https://github.com/nidhim1/kanban-board.git
cd kanban-board
```

### 2. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Authentication → Sign In Methods** and enable **Anonymous Sign-Ins**
4. Copy your **Project URL** and **anon key** from **Settings → API**

### 3. Start the Go backend
```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase URL and anon key
go mod tidy
go run main.go
# Server starts on http://localhost:8080
```

### 4. Start the React frontend
```bash
cd frontend
npm install
npm run dev
# App opens at http://localhost:5173
```

The Vite dev server proxies `/api` requests to the Go backend automatically.

## Design Decisions

- **Go backend instead of direct Supabase calls** — demonstrates backend architecture skills, provides a clean API layer for business logic, and keeps auth token handling server-side
- **completed_at in application code, not a database trigger** — business logic that may evolve belongs in code where it's testable and modifiable without schema migrations
- **Initials derived from name, not stored** — avoids stale data if a member is renamed
- **Client-side filtering** — instant feedback for the user; would move server-side for large datasets
- **Optimistic updates for drag-and-drop** — cards move instantly in the UI, then persist to backend

## Tradeoffs & Future Improvements

- **Color tokens** — currently hardcoded hex values in components; should be centralized in Tailwind theme configuration for easier maintenance
- **Real-time sync** — currently uses polling on data refresh; Supabase Realtime subscriptions would enable multi-tab sync
- **Batch API for reorder** — current implementation makes sequential PATCH calls; a single batch endpoint would reduce network requests
- **Keyboard navigation** — drag-and-drop works with mouse/touch but lacks full keyboard accessibility
- **Test coverage** — would add Jest/Vitest for frontend components and Go table-driven tests for handlers
- **Rate limiting** — backend should implement rate limiting for production use