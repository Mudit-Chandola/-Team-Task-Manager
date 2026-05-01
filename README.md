# Team Task Manager (Full-Stack)

A full-stack task management app where teams can create projects, assign tasks, and track progress with role-based access (`Admin` / `Member`).

## Live Features

- Authentication: signup and login with JWT
- Project management: create projects and add members
- RBAC: only project admins can add members and create tasks
- Task workflows: create tasks, assign users, and update status (`Todo`, `In Progress`, `Done`)
- Dashboard: aggregated counters (`all`, `todo`, `inProgress`, `done`, `overdue`) + user task view

## Tech Stack

- Backend: Node.js, Express.js
- Database: MongoDB (NoSQL) + Mongoose
- Auth: JWT + bcrypt
- Frontend: Vanilla JS + HTML/CSS (served by Express)
- Deployment: Railway

## Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/team-task-manager
   JWT_SECRET=change_me
   ```
4. Run:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5000`

## API Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`

### Projects

- `POST /api/projects` (authenticated)
- `GET /api/projects` (authenticated)
- `POST /api/projects/:projectId/members` (project admin only)

### Tasks

- `POST /api/tasks` (project admin only)
- `GET /api/tasks?projectId=<id>&status=<optional>`
- `PATCH /api/tasks/:taskId/status`

### Dashboard

- `GET /api/dashboard`

## Data Model

- `User`: name, email, password
- `Project`: name, description, createdBy, members[{user, role}]
- `Task`: title, description, project, assignedTo, createdBy, status, priority, dueDate

## Railway Deployment

1. Push project to GitHub
2. Create a new Railway project from that repo
3. Add environment variables in Railway:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT` (optional, Railway sets this automatically)
4. Ensure build/start:
   - Build command: `npm install`
   - Start command: `npm start`
5. Deploy and open generated Railway URL

## Submission Checklist

- [ ] Live URL (Railway)
- [ ] GitHub repo URL
- [ ] README
- [ ] 2–5 minute demo video

## Demo Video Script (2-5 min)

1. Show signup/login
2. Create a project
3. Add a member with role
4. Create task and assign to member
5. Update task status
6. Show dashboard counters and overdue tasks logic
