# What the owner has to do

Everything on this site that a developer cannot decide, in the order it makes
sense to do it. Nothing here needs code, a terminal, or anybody else — it is all
forms in the admin panel, or an account on somebody's website.

**Read this once, then work down it.** Each item says what to do, where to do
it, what it unblocks, and roughly how long it takes. Where an item cannot be
done honestly yet — real client work that does not exist, a testimonial nobody
gave — the right answer is to leave it, and the site is built to look correct
with it left.

**Nothing here is urgent today.** The decision taken on 2026-08-27 stands: all
content entry happens at the end, once every screen is built. This file exists
so nothing is forgotten, not as a queue for this week.

---

## Before you start

**Sign in** at `/admin/login` with the owner account, `apkavission@gmail.com`.
The menu down the left is your menu — every screen named below is on it.

**Two things about how the panel behaves**, so nothing looks broken:

- **Almost everything starts hidden or as a draft.** A new service, a new link,
  a new question — all arrive switched off, and appear on the site only once you
  tick them on. This is on purpose: nothing half-written should ever be one save
  away from being public.
- **A save is live within seconds.** There is no publish step and no deploy.
  When you press save, the public page changes.

---

## 1. Fill in the company's own details — about 15 minutes

**Where:** Settings.

| Field | Notes |
|---|---|
| Phone | Shown in the footer and as a "Call us" link |
| WhatsApp | **Must include the country code** — `919876543210`, or `+91 98765 43210`, both work. Without it there is no button at all: `wa.me` accepts a bare ten-digit number and opens a chat with nobody, so a link that looks fine and fails after the tap is worse than no link |
| Address | Street, city, state, postcode. Appears in the footer and in the data search engines read |
| CIN | The company identification number from the certificate of incorporation |
| GSTIN | Leave blank until it exists |
| Social links | Full addresses starting with `https://`. Only the ones you fill in are shown |

**Email is already set** to `info@apkasaathi.com`.

**What this unblocks:** the footer contact block, the "Rather talk first?" panel
on the quote page, a reply-to address on the enquiry acknowledgement email, the
Organization data that tells Google who the company is, and **every WhatsApp
button on the site** — there are three, and with no number stored none of them
is rendered. All of it currently reads as absent, correctly, but as absent.

Once the number is in, a WhatsApp button opens the chat **with the first
sentence already written** — "Hi, I'd like to talk about Apka Saathi" on the
product page, a generic opener elsewhere. The wording of each one is editable on
the section in the page builder.

**Anything you leave blank is left out rather than shown empty.** A missing GST
number costs nothing.

---

---

## 1b. ~~Run three migrations~~ — done, and checked on 2026-08-30

**Nothing to run here.** All three are applied. This was verified by reading
every migration file in every project and asking the database whether what it
declares is actually there:

```
cd services && npm run verify:estate
```

That answers **40 applied · 14 not checkable · 0 still to run** across all seven
schemas. The fourteen create no object a catalogue can be asked about — policies,
grants and seed rows — so they are checked separately, by their effects, with
`npm run check:effects`.

Both commands exist because this question was answered from memory once and the
memory was wrong: three portal migrations were believed run, were not, and every
screen built on them failed on a missing column.

**Do not paste them in again.** They are not written to be run twice.

What the three did, kept here because the panel now has the screens they added:

**`supabase/migrations/20260830000016_workplace_location.sql`**

Adds an address, a point and a radius to each account. The task tracker checks
clocking in against it. Afterwards there is a **Where they work** section on the
account form (Users → pick somebody): press *use my location* while standing at
the place, or paste a coordinate pair copied from a map. Leaving it empty is a
real answer — clocking in is then recorded without being checked, which is what
happens for everybody until you fill one in.

The address is deliberately **not** turned into a point automatically. That would
mean sending an employee's home address to somebody else's geocoding service,
which this estate does not do — and it would be less accurate anyway, because a
geocoder returns the middle of a street.

**`supabase/migrations/20260830000017_leave_types_master.sql`**

The leave types the tracker offers, seeded with the five that already exist.
Afterwards there is a third tab under **Users → Leave types**: add one, rename
one, or switch one off. The tracker has no list of its own, so whatever is here
is what employees can ask for.

This is the project's normal way of applying a schema change: the SQL is written
into a migration file, and you run it. Nothing deploys a database change on its
own — which is exactly why a command that reads the database is the only honest
answer to "has it been run".


## 2. Tick the technologies on each service — about 10 minutes

**Where:** Services → open each of the seven → "The stack behind this service".

**Why it matters:** there is a block on every service page listing the
technologies used, and it has never once rendered — because no service names a
single technology, so the block leaves itself out. Ten minutes of ticking turns
on seven page sections.

---

## 3. Upload the pictures — an afternoon, once you have the files

**Where:** Media, then the individual screens.

Upload first, then pick. Every image field on every screen tells you the exact
size it wants **before** you choose a file, and warns you — naming both numbers —
if the file you picked does not match.

| What | Size | Where it goes |
|---|---|---|
| Logo, light and dark | SVG preferred | Settings → Logo |
| Service social images | 1200 × 630 | Services → each service |
| Portfolio card images | 1600 × 1000 | Portfolio → each item |
| Portfolio gallery pictures | 1200 px wide or more, **any shape** | Portfolio → each item → Gallery |
| Case study header | 1600 × 1000 | Case studies → each study |
| Case study screenshots | 1200 px wide or more, **any shape** | Case studies → each study → Screenshots |
| Blog featured images | 1600 × 1000 | Blog → each post |
| Team photos | 400 × 400, square | Team → each person |

**The rules the panel enforces for you:** an image is never cropped, never
covered, never stretched and never enlarged. A file that is too small is drawn
at its own size with space around it rather than blown up and blurred — so if
something looks small on the page, the file is small, and the fix is a bigger
file.

**The two gallery fields are the exception to shape.** A tall phone screen and a
wide dashboard sit beside each other correctly there. Everywhere else, the
declared shape matters.

---

## 4. Put in the real work — as long as it takes, and it is worth taking

**Where:** Portfolio, then Case studies.

Both pages are built, working, and empty. They are the two pages that decide
whether an enquiry turns into a conversation, so they are worth writing properly
rather than filling.

**Portfolio.** Each item asks what kind of work it is, and this is the one field
the database polices hardest:

- **Client project** — real work for a named client. Must name the client.
- **Self-built demo** — our own concept. Can never name a client.
- **Our own product** — built by us, for us. Names no client either.
- **Earlier work** — from before the company.

These cannot be mixed and the database refuses to mix them. That is the honesty
rule from the specification, enforced rather than remembered.

**Case studies.** Longer form: the problem, what was built, what changed. The
"measured outcomes" field is deliberately optional — a case study with no
measured result is still worth publishing, and an invented percentage is worse
than an empty field.

---

## 5. The rest of the content — a few hours, spread out

| Screen | What to do | Notes |
|---|---|---|
| **Team** | Add the people who should appear on About | Nobody published → the section is left out of the page entirely, rather than shown empty |
| **Pricing** | Check the six plans read the way you want | Already seeded and live |
| **FAQs** | Check the fourteen questions, add the ones people actually ask | The filter at the top picks which page a question appears on |
| **Blog** | Write the first post | Nothing is published yet, so `/blog` is a working page with nothing on it |
| **Pages** | Rearrange or reword any page's sections | Nineteen kinds of section; the order is yours |
| **Navigation** | Check the header and footer menus read right | Dropdowns, order, and whether each link is shown |

---

## 6. Accounts and security — about 20 minutes, and do not skip it

**Where:** the Supabase dashboard, plus Users in the admin.

1. **Rotate both passwords.** The owner account's password and the test
   account's were both shown in a terminal when they were created. A password
   that has been printed is a password to change. Supabase dashboard →
   Authentication → Users.
2. **Delete the test account** `kumarnitish4384@gmail.com` before launch. It
   exists to prove the sign-in flow works and has no reason to survive it.
3. **Decide who else needs an account**, if anyone. Users → People → open an
   account, and a password is generated and emailed. It can never be read back
   afterwards, by anyone, including you — which is the point.

**One rule worth knowing:** blocking somebody is one switch and it is absolute.
It revokes every screen, every action and every row, everywhere, immediately.

---

## 7. Accounts to create elsewhere — about an hour

| Service | What for | Status |
|---|---|---|
| **Supabase** | The database | ✅ Done |
| **Cloudflare R2** | Image and file storage | ✅ Done — bucket `apka-vission-storage`, private |
| **Domain** | The company address | ⬜ Not chosen. Everything uses a placeholder until it is |
| **Vercel** | Hosting the site | ⬜ Not created. The site runs locally until it is |
| **Resend** (or another mail sender) | Enquiry emails that reach the inbox | ⬜ Not created |

**The mail one has a catch worth knowing about in advance.** Before the first
real enquiry email is sent, the domain needs SPF, DKIM and DMARC records set up.
Without them the emails still send — and land in spam, invisibly, with nothing
reporting a failure. This is a launch blocker, not a nice-to-have.

---

## 8. Get a lawyer to read the legal pages — before launch

**Where:** Pages → Privacy Policy, and Terms & Conditions.

Both are written and both are placeholders in the sense that matters: nobody
qualified has read them. India's DPDP Act 2023 also requires a consent notice, a
retention policy and a way for somebody to ask for their data to be erased —
none of which is a developer's decision to make on the company's behalf.

---

## 9. Turn the site on — five minutes, and it is the last thing

**Where:** SEO → Crawling.

The site is currently **closed to search engines**: every page says noindex,
`robots.txt` refuses everything, and the sitemap lists nothing. That is correct
until the day it is not.

**Before flipping it, check:**

- Every page reads the way you want it to. An indexed page is public in a way
  that is hard to take back.
- The contact details are in (step 1).
- The portfolio and case studies are not empty (step 4).
- The legal pages have been read (step 8).
- The domain is live and email is verified (step 7).

Then set Crawling to **Open** and save. It asks you to confirm, and both the
meta tags and `robots.txt` follow within seconds. The links beside the banner on
that screen let you check both immediately.

---

## Decisions still open

These have no deadline but they block particular things.

| # | Question | What it blocks | What happens if you say nothing |
|---|---|---|---|
| 1 | Which domain? | Everything in launch | A placeholder, `apkasaathitech.com`, in one constant |
| 2 | Logo and brand colours — keep the handshake mark and the teal? | Nothing; it is already built and wired in | The current mark and teal stay |
| 3 | Vercel Hobby now, Pro later? | Nothing today | Hobby now, move to Pro when revenue starts. Note that Hobby's terms are non-commercial |
| 4 | Name on the git commits? | Nothing today | `Apka Saathi`, already configured |
| 5 | Working hours and office location | A small block on the contact page | The block is left out |

---

## Things the site will not do, on purpose

So they are not mistaken for missing work:

- **No fake clients, testimonials, logos, statistics or awards.** Some of this
  is enforced by the database, not just by intention.
- **The founder's experience section stays hidden** until real projects and
  real technologies are entered. It does not get filled with plausible-sounding
  content.
- **A section with no content is left out of the page**, not shown as an empty
  heading. An empty team grid, an empty gallery, an empty FAQ — none of them
  render at all.
