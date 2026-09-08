# GEMINI.md - Project Context

This document provides a comprehensive overview of the "1337 Refund Management System" project to be used as instructional context for future interactions.

## Project Overview

This is a full-stack web application designed as a financial reimbursement tracking platform for the 1337/42 school ecosystem. Students can submit refund requests with supporting receipts, and staff can review, approve, and track these requests.

### Key Features:
- **Authentication**: Utilizes 42 School's OAuth for user login.
- **Role-Based Access**: Differentiates between `STUDENT` and `STAFF` roles with different permissions.
- **Real-time Updates**: Implements a Socket.IO server for live updates on dashboards and notifications.
- **File Uploads**: Allows students to upload receipts for their refund requests.
- **Database**: Uses PostgreSQL with Prisma as the ORM.
- **Background Jobs**: Leverages Redis and BullMQ for queuing tasks like notifications.
- **Custom Server**: A custom `server.ts` is used to run the Next.js application alongside the Socket.IO server.

### Tech Stack:
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: `better-auth` library with a custom 42 School OAuth provider.
- **Real-time**: Socket.IO
- **State Management**: TanStack Query and Zustand
- **Containerization**: Docker and Docker Compose

## Building and Running

The project can be run using either `npm` scripts with a local database or entirely with Docker Compose.

### Docker (Recommended)

The `Makefile` provides convenient shortcuts for Docker commands.

- **Start development environment:**
  ```bash
  make dev
  ```
- **Start development environment with file watching:**
  ```bash
  make watch
  ```
- **Build production images:**
  ```bash
  make build
  ```
- **Start production containers:**
  ```bash
  make up
  ```
- **Stop all containers:**
  ```bash
  make down
  ```

### Local (npm scripts)

- **Start development server:**
  ```bash
  npm run dev
  ```
- **Build for production:**
  ```bash
  npm run build
  ```
- **Start production server:**
  ```bash
  npm run start
  ```
- **Lint the code:**
  ```bash
  npm run lint
  ```

## Key Files

- **`README.md`**: The main project documentation with setup instructions and a tech stack overview.
- **`package.json`**: Lists all project dependencies and npm scripts.
- **`server.ts`**: The custom entry point for the application. It starts the Next.js server and integrates a Socket.IO server for real-time communication.
- **`prisma/schema.prisma`**: Defines the database schema, including models for users, refund requests, and more.
- **`src/lib/auth.ts`**: Configures the `better-auth` library, including the 42 School OAuth provider.
- **`docker-compose.yml` & `docker-compose.dev.yml`**: Define the services for production and development environments, including the app, database, and Redis.
- **`Makefile`**: Contains a list of `make` commands for easier project management with Docker.
- **`next.config.ts`**: The configuration file for Next.js.
- **`src/app/**`**: The main application code following the Next.js App Router structure.
- **`src/actions/**`**: Server-side actions for data mutation and retrieval.
- **`src/lib/queue/**`**: Contains the logic for background job processing with BullMQ.

## Development Conventions

- **Code Style**: The project uses ESLint for code linting and Prettier for formatting. The configuration is in `eslint.config.mjs`.
- **Database Migrations**: `prisma migrate dev` should be used to create new database migrations. The `Makefile` provides `make migrate` for this.
- **Environment Variables**: A `.env` file should be created from `.env.example` for local development.
- **Commits**: The project does not seem to have a strict commit message convention, but a clear and descriptive message is expected.
