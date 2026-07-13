# EasyPark Frontend

The frontend for EasyPark is built using React and Vite. It is integrated with the Django backend.

## Requirements

- Node.js (18+)
- npm

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Architecture

- **Contexts**: Handles global state (e.g., `AuthContext` for JWT authentication and RBAC).
- **Services**: Manages API calls (e.g., `api.ts` provides an `apiFetch` wrapper with auth headers).
- **Components**: Reusable UI components.
- **Views**: The main application screens (`Main.tsx`, `Marshal.tsx`, `Login.tsx`).
- **Routing**: `routes.tsx` uses `react-router` and includes a `ProtectedRoute` for role-based access.

## Connecting to Backend
The frontend expects the backend to be running on `http://127.0.0.1:8000`. API requests are automatically routed there through the `apiFetch` service.