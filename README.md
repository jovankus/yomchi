# Yomchi Healthcare

A comprehensive healthcare management system for psychiatric clinics.

## Features

- **Patient Management**: Full patient records with demographics, psychiatric history, symptoms tracking
- **Appointments**: Scheduling, session types, payment tracking
- **Inventory Management**: Pharmacy stock tracking with batch/lot management
- **Financial Reports**: Daily summaries, monthly reports, doctor cuts
- **Role-Based Access**: SENIOR_DOCTOR, PERMANENT_DOCTOR, DOCTOR, SECRETARY roles
- **Two-Gate Authentication**: Clinic-level + Employee-level login

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

## Deployment

- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on Render
- **Database**: PostgreSQL (production) / SQLite (development)

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
  "timestamp": "2026-...",
  "database": "sqlite",
  "environment": "development"
}
```
