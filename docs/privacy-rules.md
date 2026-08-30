# Privacy rules — where this project's data may go

**Standing instruction from the owner. Absolute, and it binds all three
projects: this repo, the task tracker and the demo repos.**

Nothing about this project is kept anywhere but this machine and the four
services the owner set up for it. No assistant memory, no notes outside the
repo, no uploads, no publishing, no telemetry. This file says exactly what that
means, including the one part of it that is not a promise anyone can make.

---

## The rule

**Everything about this project lives on this machine, in this repository.**

Nothing is written to a memory, a profile, a cache, a scratch note or an
account belonging to any tool used to build it. Nothing is uploaded to be
"shared", "published" or "previewed" anywhere. Nothing is sent to a third party
that is not on the short list below.

## The only places project data may go

These four exist because the product cannot work without them. Each was set up
by the owner, each holds its credentials in `.env.local`, and no fifth one gets
added without the owner saying so first.

| Where | What it holds | Why |
|---|---|---|
| **Supabase** | The database — all content, accounts and enquiries | The product's own database |
| **Cloudflare R2** | Uploaded images and files | The product's own media storage |
| **Resend / SMTP** | Transactional email in transit | The product sends email |
| **Vercel** | The built site, once deploys start | The product is a website |

Anything else — an analytics script, an error reporter, a font CDN, a "helpful"
SaaS integration, a hosted paste, a screenshot service — is a new place the
company's data would live, and it is a decision for the owner rather than a
convenience for whoever is writing the code.

## What is not allowed, specifically

- **No assistant or tool memory.** Nothing about this project written to a
  persistent memory file, a knowledge base, a profile, or any store that
  outlives the session. The repository is the memory. `docs/PROGRESS.md` is the
  handoff, and it is a file in this repository for exactly that reason.
- **No publishing.** No artifact, gist, pastebin, hosted preview, screenshot
  upload or shared link containing this project's code, content, screens or
  data.
- **No telemetry added to the codebase.** No analytics, session recording,
  error reporting or "anonymous usage" package without the owner's word first.
  This includes the ones that are on by default in a framework.
- **No secrets anywhere but `.env.local`.** Not in a commit, not in a client
  bundle, not in a document, not pasted into a chat window, not in a
  screenshot. `.env*.local` is in `.gitignore` and stays there.
- **No AI-tooling fingerprints in the repository.** The rule that was already
  ground rule 1 in [README.md](README.md): no tool-named folders, references,
  comments, dependencies, commit messages or commit authors, in this repo or
  the demo repos.
- **Working files stay local.** Temporary scripts and scratch output go in the
  system temp directory or the repo's ignored paths, and are deleted. They are
  never committed and never sent anywhere.

## The one thing that is not a promise

A conversation with an AI assistant runs on that assistant's servers. That is
what the tool is; it cannot be switched off from inside it, and nobody working
on this project should pretend otherwise.

So the protection is not a promise about the transport. It is this:

1. **Secrets are never typed into a chat.** Not the Supabase service role key,
   not the R2 credentials, not the SMTP password, not an account password, not
   the contents of `.env.local`. If one has been, it is rotated from the
   provider's dashboard — rotating is cheap and certain, and worrying is
   neither.
2. **Real personal data is never pasted in.** Enquiries, client names, phone
   numbers and email addresses stay in the database. Test data is made up.
3. **Everything durable is a file in this repo.** Nothing important depends on
   something an assistant remembers, because nothing outside this repository is
   allowed to remember anything.

## Rotation, when it is needed

Anything that has been shown outside `.env.local` — in a terminal, a
screenshot, a message — is rotated, not reasoned about:

- **Supabase keys and passwords** — Supabase dashboard, Project settings → API,
  and Authentication → Users for an account password.
- **Cloudflare R2 credentials** — Cloudflare dashboard, R2 → Manage API tokens.
- **SMTP / Resend key** — the provider's dashboard.

Then update `.env.local` and nothing else, because nothing else holds them.

## How this gets checked

Before every commit, and before any deploy:

- `git status` shows no `.env*` file staged.
- `git log` and the diff carry no tool name, no assistant name, no generated-by
  line, no co-author that is not a person.
- `package.json` has no dependency nobody chose.
- No `AGENTS.md` or `CLAUDE.md` is staged. **Next.js writes both back into the
  repository root on every `next dev` and `next build`** — they were found and
  removed on 2026-08-28 and are now in `.gitignore`, but the file reappears, so
  this is a check rather than a fix.
- Nothing in `src/` reaches a host that is not on the four-row table above.
