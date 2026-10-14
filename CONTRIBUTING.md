# Contributing to Roots Media Management System

Thank you for your interest in contributing to the Roots Media Employee & Task Management System!

## Codebase Structure

```
roots-management-system/
├── backend/
│   ├── config/          # Database connection & memory fallback
│   ├── controllers/     # Express HTTP controllers
│   ├── middleware/      # Error handling, async wrapper, logging
│   ├── models/          # Mongoose Schemas (Employee, Task, Counter)
│   ├── routes/          # Express route definitions
│   ├── seed/            # Mock dataset seeder (12 employees, 40 tasks)
│   ├── services/        # Business logic, state transitions, aggregations, CSV
│   ├── tests/           # 6 Jest test suites (86 automated test cases)
│   └── app.js           # Express app configuration
├── frontend/
│   ├── public/          # Favicon, assets, Netlify _redirects
│   ├── src/
│   │   ├── components/  # Layout, Navigation, Modals, StatusBadge, etc.
│   │   ├── pages/       # 9 core pages (Dashboard, Employee CRUD, Task CRUD)
│   │   ├── services/    # Axios API client & error utilities
│   │   ├── tests/       # Vitest unit test suites (URL params, formatters)
│   │   └── utils/       # Date formatters, validators, query helpers
│   ├── vercel.json      # Vercel SPA routing rewrite configuration
│   └── vite.config.js   # Vite configuration with proxy
└── .github/             # CI workflows, PR templates, and issue templates
```

## Development Workflow

1. Fork and clone the repository.
2. Install all dependencies:
   ```bash
   npm run install:all
   ```
3. Copy environment configuration:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
4. Start both servers:
   ```bash
   npm run backend
   npm run frontend
   ```

## Testing Guidelines

All contributions must pass all test suites and linting checks:
```bash
# Run both backend and frontend test suites
npm test

# Run oxlint across both workspaces
npm run lint

# Verify frontend production build
npm run build
```

## Architectural Guidelines

- **Strict Task State Machine**: Status transitions must only occur via `PUT /api/tasks/:id/status` and adhere strictly to permitted transitions.
- **Atomic Concurrency Protection**: Active task assignments must always enforce the 3-task capacity atomically.
- **Server-Side Aggregations & Exports**: Never calculate dashboard statistics or export CSV by fetching all records to client memory; use backend MongoDB pipelines.
