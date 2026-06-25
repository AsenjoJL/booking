# E-Commerce Deployment Guide

This document outlines the full production deployment architecture and the necessary environment variables for the Booking E-Commerce platform.

## Architecture Overview
* **Database**: Supabase PostgreSQL (Session Pooler for Entity Framework Migrations)
* **Backend API**: ASP.NET Core 9.0 hosted on Render
* **Frontend**: React + Vite hosted on Vercel

---

## 1. Database (Supabase)
Your production database is hosted on Supabase.
* **Important**: You must use the **Session Mode** connection pooler (Port `5432` or `6543` depending on Supabase's current dashboard iteration, typically standard Session Mode is required for Entity Framework Migrations to run without hanging).

---

## 2. Backend (Render)
The ASP.NET Core Web API is deployed as a Web Service on Render, connected directly to your GitHub repository.

### Required Environment Variables in Render:
To ensure the backend runs correctly in production, the following Environment Variables must be set in your Render Dashboard:

| Key | Value | Description |
|-----|-------|-------------|
| `ConnectionStrings__DefaultConnection` | `Host=aws-0-....pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.xxx;Password=YOUR_PASSWORD` | Your Supabase Session-Mode Connection String |
| `FrontendUrl` | `https://booking-murex-two.vercel.app` | The exact URL of your live Vercel frontend (No trailing slash). This dynamically configures CORS to allow your frontend to communicate with the API. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Tells ASP.NET to run in production mode |
| `Jwt__Key` | A unique random secret of at least 32 characters | Signs production access and refresh tokens. Never reuse the development value. |
| `SupabaseStorage__Url` | `https://YOUR_PROJECT.supabase.co` | Supabase project URL used for product image uploads. |
| `SupabaseStorage__ServiceRoleKey` | Your Supabase service-role key | Server-only storage credential. Never expose this in Vercel. |
| `Hangfire__DashboardEnabled` | `false` | Keep the jobs dashboard disabled publicly. Enable only behind a trusted private access layer. |

*Note: Whenever you push code to GitHub, Render will automatically rebuild and deploy the API.*

The production API validates these critical values during startup. A deployment with missing, local, or placeholder credentials will stop immediately instead of running with unsafe defaults.

Use `/api/health` as the Render health-check path. The diagnostic CORS endpoint and Hangfire dashboard are unavailable in production by default.

---

## 3. Frontend (Vercel)
The React frontend is deployed on Vercel, connected directly to your GitHub repository.

### Required Environment Variables in Vercel:
To ensure the frontend communicates with your Render API, set the following Environment Variable in your Vercel Dashboard:

| Key | Value | Description |
|-----|-------|-------------|
| `VITE_API_URL` | `https://booking-5kze.onrender.com/api` | The base URL to your live Render backend. **MUST include `/api` at the end.** |

### Build Configuration:
Vercel automatically detects Vite, but the standard build commands are used:
* **Framework Preset**: `Vite`
* **Root Directory**: `frontend`
* **Build Command**: `npm run build`

*Note: We have configured `tsconfig.app.json` to ignore strict type deprecation warnings so that Vercel builds do not fail unexpectedly on unused variables.*

## Secret Rotation

If a credential was ever committed to source control, removing it from the current file is not sufficient. Rotate the affected SMTP password, SMS token, database password, JWT key, and Supabase service-role key in their provider dashboards, then update the Render environment variables.
