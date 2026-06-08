# Cercli Feature Radar

Internal feature prioritization dashboard. Aggregates customer signals from Pylon (support tickets) and Demodesk (sales calls), runs AI analysis via Claude, and presents a curated top-10 feature request list with advisory insight cards.

## Setup

### 1. Run Supabase Migration

In your Supabase project → SQL Editor, paste and run:
`supabase/migrations/001_initial_schema.sql`

This creates the four tables and seeds 5 example feature requests.

### 2. Environment Variables

Create `.env.local` (or add to Vercel project settings):

```env
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
PYLON_API_KEY=
DEMODESK_API_KEY=
```

### 3. Run Locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

```bash
npx vercel --prod
```

The `vercel.json` configures a weekly cron (Monday 9am UTC) that triggers `/api/refresh`.

## Usage

- **Refresh Now** — pulls last 90 days of data, extracts signals via Claude, generates insight cards
- **Insight Feed** — review and approve/dismiss AI advisory cards
- **Feature Requests** — drag to reorder, click title to edit, click status to change
- **Account View** — expand accounts to see all signals with verbatim quotes

---

Original Next.js README below:

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
