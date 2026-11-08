# MRG Labs OCR

Scan oil-sample tube labels from a photo or a short video, review what was read, and keep every vial in one searchable inventory. Built with Next.js (App Router), Clerk, Postgres (Tiger Data), and Cloudinary.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values (see [Environment](#environment)).
3. Create the database tables (safe to run more than once):

   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

4. Start the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

Sign-up is closed. Add people in the Clerk dashboard (**Users → Create user**), and they sign in with email and password.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Development server              |
| `npm run build`     | Production build                |
| `npm start`         | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript, without emitting    |

## Environment

All variables are listed in [`.env.example`](.env.example).

| Group      | Variables                                                         | Used for                                       |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| OCR        | `API_KEY`, `BASE_URL`, `MODEL`                                    | Any OpenAI-compatible model that reads labels  |
| Database   | `DATABASE_URL`, `DATABASE_SSL`                                    | Vials and categories                           |
| Clerk      | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, …        | Sign-in; every page and API route requires it  |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Each vial's photo, or a still from its video |

## Project structure

```
src/
  app/                 Routes only: pages, layouts and API handlers stay thin
    api/v1/            REST API (vials, categories, OCR, Cloudinary upload signatures)
  components/
    ui/                shadcn/ui primitives
    layout/            App navigation and the account menu
    providers/         Context providers (theme)
  features/            Product code, grouped by feature
    auth/              Sign-in page: components, Clerk error handling, redirect hooks
    camera/            Record a label with the device camera
    home/              Home page composer and quick read
    inventory/         Browse, search, move and delete vials
    labels/            Shared label domain: review form, CSV, frame picking, uploads
    settings/          Theme and account settings
    upload/            Batch upload of photos and videos
  server/              Server-only code: never import from a client component
    db/                Postgres pool and the Tiger Data CA certificate
    ocr/               Video frames (ffmpeg), barcode decoding, model prompt
    vials.ts           Vial queries and input validation
    cloudinary.ts      Upload signing, media validation, deletion
  lib/                 Small helpers shared by browser and server
  proxy.ts             Auth gate: signed-out visitors only see /sign-in
db/schema.sql          Database schema (idempotent)
tests/fixtures/        Sample label photos and videos for manual testing
```

Conventions:

- **Imports** use the `@/` alias for anything outside the current folder (`@/features/labels/lib/label-csv`), and `./` for siblings.
- **Route files** in `src/app` only wire things up. Put UI in `src/features/<feature>/components` and logic in `src/features/<feature>/lib` or `src/server`.
- **Server-only code** (database, secrets, ffmpeg) lives in `src/server`. Client components may import its *types*, never its values.

## API

All routes require a signed-in session and return JSON. Without one they answer `401`.

| Method & path                          | Purpose                                         |
| -------------------------------------- | ----------------------------------------------- |
| `POST /api/v1/ocr`                     | Read a label from a photo or video              |
| `GET, POST /api/v1/vials`              | List vials (optionally `?categoryId=`), add one |
| `GET, PUT, PATCH, DELETE /api/v1/vials/:id` | Read, replace, move or delete a vial       |
| `GET, POST /api/v1/categories`         | List or add categories                          |
| `GET /api/v1/categories/:id/csv`       | Download a category as the 7-column CSV         |
| `POST /api/v1/cloudinary/signature`    | Sign a browser upload of a vial photo           |
