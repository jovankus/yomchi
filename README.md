# PracticeClone

A web application for practicing cloning.

## Prerequisites

- Node.js (v16 or higher)
- npm

## Setup

1. Install dependencies:
   ```bash
   npm run install-all
   ```

## Running the Application

To run both backend and frontend concurrently:

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3001](http://localhost:3001)

## Verification

### Health Check

The backend exposes a health check endpoint:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2023-..."
}
```

The frontend landing page should also display "PracticeClone is running" and the backend status if connected.
