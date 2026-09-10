# Pandect

LSAT practice by question type: drills for each Logical Reasoning and Reading Comprehension question type,
timed 35-minute sections, and a record of which types you miss. Live at https://pandectprep.pages.dev.

| Directory | What it is |
|---|---|
| `cloudflare/` | The site: a React app with Pages Functions for sign-in, grading and the question bank |
| `web/` | The Next.js version of the same pages; `cloudflare/` reuses its components and libraries |
| `supabase/` | Database schema (migrations) and pgTAP tests |

Questions are practice questions written in the style of the LSAT. Their wording and answers are not in this
repository: they are served to signed-in users as encrypted files, and graded on the server.

```bash
cd cloudflare && npm install && npm run dev   # needs cloudflare/.env and .dev.vars
npx supabase test db                          # database tests, against a local stack (npx supabase start)
```

LSAT is a registered trademark of the Law School Admission Council, which is not affiliated with this project.
