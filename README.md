# TickTasker

TickTasker is a Vite + React task planner with Firebase auth/storage and a Vercel serverless AI route for:

- daily plan generation
- natural-language task parsing
- task prioritization
- task breakdown into subtasks

## Stack

- React 19
- Vite
- Firebase Auth
- Firestore
- Vercel Serverless Functions

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and fill in your real values:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

## Environment Variables

Frontend:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Server-side:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY` or `GROK_API_KEY`

## Deployment

The frontend is built by Vite and the AI route lives in `api/ai.js`, which is intended for Vercel deployment.

Make sure all server-side secrets are configured in Vercel before deploying.

## Quality Checks

Build the project:

```bash
npm run build
```

Lint the project:

```bash
npm run lint
```

Note: the repo still contains some pre-existing lint issues outside the cleanup in this pass.
