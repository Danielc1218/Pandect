# Pandect web app

Next.js (App Router) on Supabase. Styles come straight from the design system:
`npm run design` copies `../design/mock/tokens.css`, `mock.css` and the photos
in, and runs automatically before `dev` and `build`. The copies in `app/design/` and
`public/images/` are committed so the app also builds where `../design` is absent (Vercel);
edit the originals, never the copies.

```bash
cp .env.example .env.local  # hosted Supabase by default; local values are in the same file
npm run dev                 # http://127.0.0.1:3000
```

| Route | What it does |
|---|---|
| `/`, `/about` | Public pages |
| `/signup`, `/login` | Supabase email and password auth |
| `/learn` | Dashboard: continue, weekly goal, weakest types |
| `/types` | Every question type with its size and your record |
| `/drill?section=lr&type=Flaw` | Next unanswered question of one type, graded on submit |
| `/practice`, `/practice/[test]` | practice tests and their sections |
| `/section/[id]` | Timed 35-minute section; answers save as you go |
| `/results/[id]` | Score, accuracy by type and questions to review |
| `/progress`, `/settings` | Accuracy by type, past sections, profile and goal |

Answers are graded by a database trigger (`supabase/migrations/20261005213700_learner_progress.sql`),
not by the browser. All pages under `(app)` and `(test)` require a signed-in user.
