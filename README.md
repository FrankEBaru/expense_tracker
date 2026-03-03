# Expense Tracker

A minimal expense tracking web app for personal use. Built with React, Vite, Tailwind CSS, and Supabase. Single-user; syncs across devices after login.

## How to run the project

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `VITE_SUPABASE_URL` – your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – your Supabase anonymous (public) key

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open the URL shown in the terminal (e.g. http://localhost:5173).

## How to connect Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier).

2. **Get your credentials**  
   In the Supabase dashboard: **Project Settings → API**. Copy:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

3. **Enable Email auth**  
   In **Authentication → Providers**, ensure **Email** is enabled (default). You can disable other providers if you only use email + password.

4. **Run the database schema**  
   In **SQL Editor**, run the contents of `supabase/schema.sql` (creates the `expenses` table and RLS policies). See that file in this repo.

After that, use **Authentication → Users** to create a user (or sign up from the app).

## How to deploy

### Vercel (recommended)

1. Push the project to a Git repository (e.g. GitHub).
2. In [Vercel](https://vercel.com), **Add New Project** and import the repo.
3. Set **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build settings (usually auto-detected):
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Deploy. Your app will be available at the generated URL.

To deploy from the command line (after linking the project once in the Vercel dashboard): `npx vercel --prod`.

### Other static hosts

- Run `npm run build`, then upload the contents of the `dist` folder to any static host (Netlify, GitHub Pages, etc.).
- Configure the same environment variables in the host’s dashboard so they are available at build time.

## Git

To initialize a Git repository and make an initial commit:

```bash
git init
git add .
git commit -m "Initial commit: expense tracker MVP"
```

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Backend / DB / Auth:** Supabase (PostgreSQL + Auth)
- **Hosting:** Any static host (e.g. Vercel)

## Project structure

```
src/
├── main.tsx, App.tsx, index.css
├── lib/supabase.ts       # Supabase client
├── types/expense.ts      # Expense type and categories
├── components/
│   ├── Auth.tsx          # Login / sign up / logout
│   ├── ExpenseList.tsx   # List and month filter
│   ├── ExpenseForm.tsx   # Add / edit expense form
│   └── MonthTotal.tsx    # Total for selected month
└── hooks/useExpenses.ts  # Fetch and mutate expenses
```
