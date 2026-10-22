# MapleForge

A Canadian community portal for ideas, skills and collaboration. Built with browser JavaScript, CSS, SVG and Python's standard library.

## Current state

This is a development preview, not a complete community platform.

Working shared features:

- Discord sign-in with a MapleForge server-membership check.
- Member-owned idea posts and edits with structured proposal fields.
- Shared comments on ideas, features, tasks, governance, skills and resources.
- Member profiles, skills, services and portal display names.
- Available skills and resources, offers and requests, availability and status.
- A private Bookmarks collection for ideas, skills, resources, people, tasks, features, governance and individual comments.
- A skill category index with counts, grouped listings and filtering.
- A separate Project Framework discussion draft with seven selectable phases, point-specific feedback prompts and saved phase conversations.
- Community Rules with the dated Discord source and reminders beside discussions.
- Four themes, adjustable text size, compact lists, cards and workspace tabs.
- Section URLs and page titles that follow navigation, with reload and browser Back/Forward support.

Ideas, comments, profiles, votes, idea memberships and contributions, feature requests, task records, governance proposals, and activity now use shared SQLite storage. Bookmarks, follows, and appearance preferences belong to the signed-in account. Shared views refresh every 15 seconds while visible. Unsent form drafts stay in session storage until submitted; earlier browser-only drafts can be reviewed and published explicitly.

The Discord chat assistant and notification delivery are not implemented. Follow-up dates are stored, but do not send reminders.

## Source layout

- `src/`: portal template, styles and browser modules.
- `public/`: public landing page and required image assets.
- `server/gate.py`: shared-password preview gate.
- `server/members.py`: Discord OAuth, sessions and shared content API.
- `server/shared.py`: transactional boards, permissions, participation, and activity.
- `build.py`: static build with optional external community content.

The repository contains no community chat exports, member seed profiles, credentials, database, test posts or installation logs. Required runtime secrets and community content are managed separately.

## Build and preview

Requires Python 3.10 or newer. No package installation is needed.

```sh
python3 build.py
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080/portal1/`. This local view runs the browser prototype. The live member module activates on `maple-forge.ca` and requires the HTTPS backend described below. A clean build starts without imported community records.

Optional private content can be supplied from a directory outside the repository:

```sh
python3 build.py --content-dir /path/to/private/content
```

The directory can contain `ideas.json`, `people.json` and `governance.json`, each holding a JSON array. Missing files are treated as empty arrays. Do not commit these files or the resulting private build. Generated files are written to `dist/`, which is ignored by Git.

## Server configuration

The services bind to localhost and require an HTTPS reverse proxy. Serve `dist/` as the web root. Keep the database and configuration outside that root. Deploy both `members.py` and `shared.py` into the same service directory. Imported community records must be loaded separately into the `records` table; private seed content is not in this repository.

The gate reads `GATE_CONFIG`, defaulting to `/etc/mapleforge/gate.json`. Configuration fields:

- `salt`: random salt encoded as hexadecimal.
- `password_hash`: PBKDF2-HMAC-SHA256 of the shared password, using that salt and 200,000 iterations, encoded as hexadecimal.
- `cookie_key`: a separate cryptographically random signing key encoded as hexadecimal.

The member service reads `MEMBER_CONFIG`, defaulting to `/etc/mapleforge/discord.json`. Configuration fields:

- `client_id`: Discord application's client ID.
- `client_secret`: Discord application's confidential OAuth client secret.
- `guild_id`: allowed Discord server ID.
- `redirect_uri`: `https://maple-forge.ca/auth/discord/callback`.

`admin_ids` in the external member configuration is a list of verified Discord user IDs allowed to maintain imported records, organize duplicates and publish release notes. Authors can edit their own records; task assignees can update task status. Full record edits use revisions to reject stale updates. Keep this configuration private.

Set `MEMBER_DB` to a writable SQLite database path. Its default is `/var/lib/mapleforge/members.sqlite3`. Run the service as a dedicated unprivileged account with read access to its configuration and write access only to its data directory. Configuration should be readable only by the administrator and service account; database files should not be publicly readable.

```sh
python3 server/gate.py
python3 server/members.py
```

Use a service manager for production. The gate listens on `127.0.0.1:8781` and the member service on `127.0.0.1:8782`.

Reverse proxy requirements:

- Forward `/preview-access` to the gate.
- Protect `/portal1/` and `/api/` with an internal auth subrequest to the gate's `/check` endpoint, forwarding cookies.
- Redirect unauthorized portal requests to `/preview-access`; reject unauthorized API requests.
- Forward `/auth/` and authorized `/api/` requests to the member service, preserving request headers and cookies.
- Disable access logging for OAuth callback requests so authorization codes do not enter logs.
- Enforce HTTPS, request body limits, `no-store` for private responses and `noindex` for private routes.
- Never expose either backend port directly.

## Discord setup

Create a Discord developer application and register the exact callback URL. The server requests only `identify` and `guilds.members.read`. A bot installation is not required for sign-in.

Members first enter the private preview using the shared community word, then select **Sign in with Discord**. The server checks membership, rejects pending membership screening, and rechecks membership after a five-minute cache. Sessions expire after at most 24 hours. Discord access tokens are held only in process memory for membership rechecks; refresh tokens are not retained. Portal display names can change without changing Discord identity or ownership.

## Before broader release

- Establish and test database backups and restoration.
- Add member-facing deletion, moderation and abuse-handling workflows.
- Review privacy information and retention with the community.
- Complete accessibility, concurrency and load testing.

Do not describe this preview as fully production-ready. Do not commit secrets, private data, generated private builds or runtime databases.

## Local Git and collaboration

This directory is the canonical source repository. Edit files in `src/`,
`server/`, `public/` and `build.py` here, then build. Do not edit generated
`dist/` files or copy an older scratch implementation over reviewed source.

The first local source snapshot is tagged `baseline-2026-10-21`. Earlier work
was not recorded as individual local commits. The baseline is a sanitized
source snapshot, not a byte-for-byte backup of the live site, which also uses
separately managed community content. The GitHub repository is
`GnMohareb/MapleForge`. Preserve both its original upload history and this local
commit history when synchronizing. Fetch before publishing and reconcile any
divergence without force-pushing over other contributors’ work.

### Make a change

```sh
git status --short
git switch -c feature/short-description
# Edit source files, then build and check the affected behavior.
python3 build.py
git diff --check
git diff
# Stage only the intended source files and inspect them before committing.
git add src/changed-file.js
git diff --cached
git commit -m "fix: describe the user-visible change"
```

Replace the example filename and branch name with the actual change. Keep each
commit focused on one feature or fix. In the commit body, describe the reason,
verification performed and any relevant limitations. Commit only after the
change is ready to review. Use a merge or pull request when collaborating;
avoid rewriting commits other people already use.

The static local preview does not exercise production authentication or shared
API writes. Test backend changes with a separate configuration and disposable
database, never the live community database. Review ownership, input validation
and persistence when changing shared writes. Test affected UI at narrow and wide
widths and with enlarged text when changing layout.

### Review history and recover code

```sh
git log --oneline --decorate
git show baseline-2026-10-21 --stat
git worktree add --detach ../mapleforge-baseline-review baseline-2026-10-21
```

The last command opens a separate checkout for inspecting the baseline without
changing current work. To undo a specific committed change on your working
branch, first ensure uncommitted work is saved, then use:

```sh
git revert <commit-id>
```

This records the reversal as a new commit. Rebuild and test it before deployment.
A local Git revert does not alter the running server. Deployments need a separate
backup, build, verification and rollout. Record the deployed commit ID in the
private deployment log.

Git covers code and required public assets only. Database rollback, uploaded
content, member posts, Discord imports, server configuration and credentials
require separate protected backups. Reverting code does not undo a database
migration or restore member data. Confirm schema compatibility before rollback.

### Keep the repository clean

Never stage secrets, private imported content, databases, chat exports, session
data, installation logs or generated private builds. `.gitignore` excludes common
runtime and credential files, but it cannot recognize secrets pasted into source.
Review every staged diff. Do not use `git add -f` to bypass these exclusions.

No publishing or deployment is automatic. Pushing to GitHub is a separate step.
Before doing so, verify the target repository, its visibility, its existing history
and the exact changes being sent.

## Project Framework discussions

The Project Framework page is a standalone discussion preview. It does not enable ranked ballots or alter existing idea stages. Hosted feedback targets the separately provisioned `Framework` record `project-framework-v01`; its source link is stored with that private runtime record. Phase conversations use `project-framework-v01-phase-1` through `project-framework-v01-phase-7`, also provisioned as `Framework` records. General feedback remains on the original record. Point feedback includes the selected rule in the comment. A clean static build shows the framework without private discussion content.

## Section navigation

Section navigation writes `?section=<section-id>` into browser history and updates the page title. Loading that address restores the section after its renderer is registered. Detail and editor tabs keep their existing in-session history; their URLs identify the parent section, not unsaved editor contents.

### Saved collections

Bookmarks is the first sidebar link and shows a private saved-item count. Members can save individual items, comments and activity entries. Sidebar destinations do not have whole-page Save controls. A filled orange bookmark indicates a saved item. Private bookmarks are returned only to their owner.

### Language and branding

The sidebar offers English and Canadian French next to Appearance. An explicit language choice is stored in this browser. Without one, the first supported language in the browser language preferences selects the interface, including `fr-CA`. No location lookup is used. Interface translations live in `src/locale.js`; member-written content stays in its original language. Form option values remain canonical when their visible labels are translated.

The approved red-leaf wordmark is in `public/mapleforge-wordmark.png`. The Project Framework header is compact and has no whole-page bookmark control.

Project Debate is currently withdrawn from the portal. Older `?section=debate` links return to Project Framework. The proposal can be recovered from Git history.

## Security controls

The shared preview password is a temporary entry gate, not member authentication. Its salted PBKDF2 hash is stored outside this repository. Preview cookies are bound to the configured password hash, so changing the hash or cookie key invalidates existing preview cookies after service restart.

Install `config/preview-rate-limit.conf` in nginx's HTTP context and add the documented directives to `/preview-access`: six POST attempts per minute per IP, with a burst allowance of five, returning HTTP 429. The gate also caps total hash attempts at 20 per minute and permits at most two concurrent hashes. GET requests do not consume the password-attempt quota.

`/api/shared`, `/api/community`, and `/api/comments` require a valid Discord member session. Signed-out clients skip those reads. The original curated preview content remains visible behind the preview gate.

Discord membership is checked on the first request after a five-minute cache expires. Membership removal, pending screening, invalid access tokens or token expiry revoke the session. Transient verification failures deny the request without renewing membership. Access tokens exist only in process memory, never in the database or logs; refresh tokens are not retained. Restarting the member service therefore requires fresh Discord sign-in. Existing 24-hour session expiry remains an upper bound. For immediate manual revocation, an administrator can delete that member's session rows from the protected database.

Display-name changes reject names already used as another member's display name or username, using Unicode normalization and case folding. Reserved administrative names and invisible control characters are rejected. This reduces impersonation but does not detect every visual lookalike. Existing stored names are not silently rewritten.

Idea source/reference links allow only absolute HTTPS URLs without embedded credentials.

Run the isolated regression checks with `python3 -m unittest discover -s tests`. Tests use temporary configuration, synthetic users and mocked Discord responses.

### Running version

The top-right version displays the build revision as plain text, with the full commit in its tooltip. It does not link members to the private repository. Deploy `portal1/version.json` alongside the generated HTML. Open pages check that manifest on focus and every five minutes and offer a manual reload when a different commit is live. Build releases from a clean committed tree so the label matches GitHub.

Link validation tests: `node tests/test_links.cjs`.

### Personal navigation

The default sidebar order stays unchanged. Use the small grip beside any link to drag it above or below another link. All links share one list, including Bookmarks and Community Rules. Keyboard users can focus a link and use Alt + Up/Down to reorder. Preferences are stored in localStorage in the current browser, not synced between devices. Clearing browser storage restores the default arrangement. Previously pinned favourites retain their displayed position at the top when migrated to the single list.

### Imported idea discussions

Private `ideas.json` records can include a `category`, `discussionNote`, and a
`discussion` array. Each message contains `id` (original message ID), `author`,
`time` (ISO timestamp), `text`, `channel`, `role` (`Original proposal` or
`Follow-up discussion`), and optional `attachments` (filenames). These messages
are escaped, read-only excerpts shown within the idea detail. Member-written
quotes stay in their original language. Interface labels support English and
French. Source message metadata is displayed without external navigation.

Imported correspondence does not create portal comments, votes, memberships or
activity entries. Preserve message IDs and existing idea IDs when refreshing
content, and deduplicate by source message ID within each idea. Keep summaries
separate from original wording and distinguish the credited proposer from the
person who posted an attachment on their behalf.

When releasing a private harvest, provision new idea records separately so
commenting and bookmarking can target them. Do not replace the database or
reset existing comments, votes, memberships, ownership or member edits. Existing
record updates require field-level reconciliation with the current stored
record. The harvest files and raw conversations stay outside this repository.

## Latest interface updates

- One reorderable sidebar list with visible drag grips and keyboard movement. There is no separate Favourites list or Option+F shortcut.
- Anchored account footer, separate Appearance controls, and English/French language choices.
- Interface font sizes start at 16px, with 18px board filters, category statistics and workspace tabs. Sidebar text choices are 16, 18, 20 and 22px.
- Larger idea titles and colour-coded reply, age and estimated reading-time labels. Reply counts combine captured discussion and portal comments; reading time is an estimate at 220 words per minute, not a project effort estimate.
- Original proposal and captured discussion appear together. Earlier discussion opens expanded by default.
- Timestamps use the device time zone automatically. The Time control beside the language selector offers an IANA time-zone override, stored only in this browser. Named zones account for daylight saving rules. Stored timestamps and date-only task deadlines are not shifted.
- Sign-in offers only the implemented Discord flow. Manual username/password accounts are not offered.

Imported message text, member records and deployment configuration remain outside this repository. Reviewers can build the clean source without access to private community exports.
