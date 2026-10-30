# MapleForge Portal

A Canadian community portal for ideas, skills and collaboration. Built with browser JavaScript, CSS, SVG and Python with cryptography for encrypted login sessions.

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
- People & resources groups the people directory, member details, available skills and available resources with section tabs. Existing section URLs remain valid.
- Four themes use shared semantic surface, text and action tokens in `src/design-system.css`, with common cards, fields, filters and buttons.
- A persistent header and hamburger navigation on screens up to 900 pixels wide. The navigation drawer supports Escape and keyboard focus cycling.
- Normal navigation reuses the current workspace tab. Choose “Open next in new tab” (＋ Tab on mobile), or Ctrl/Cmd-click a destination, to retain the current view.
- Adjustable text size, compact lists and cards.
- Section URLs and page titles that follow navigation, with reload and browser Back/Forward support.

Ideas, comments, profiles, votes, idea memberships and contributions, feature requests, task records, governance proposals, and activity now use shared SQLite storage. Bookmarks, follows, and appearance preferences belong to the signed-in account. Visible shared views check a content revision every 15 seconds and reload only when it changes. Unsent form drafts stay in session storage until submitted; earlier browser-only drafts can be reviewed and published explicitly.

The Discord chat assistant and notification delivery are not implemented. Follow-up dates are stored, but do not send reminders.

## Source layout

- `src/`: portal template, styles and browser modules.
- `public/`: public landing page and required image assets.
- `server/gate.py`: shared-password preview gate.
- `server/members.py`: Discord OAuth, sessions and shared content API.
- `server/shared.py`: transactional boards, permissions, participation, and activity.
- `build.py`: static build containing no imported community content.
- `server/privacy.py`: owner-authorized removal of content and accounts.

The repository contains no community chat exports, member seed profiles, credentials, database, test posts or installation logs. Required runtime secrets and community content are managed separately.

## Build and preview

Requires Python 3.10 or newer. Install the backend dependency before running the services or Python tests. Node.js 22 or newer is used for the JavaScript checks.

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 build.py
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080/portal1/`. The static preview includes the full navigation and empty shared boards. It labels shared services as offline; posting, account actions and chat require the configured backend and are unavailable in this preview. Fictional examples remain available where explicitly labelled. The live member module activates on `maple-forge.ca` and requires the HTTPS backend described below. A clean build starts without imported community records.

After pulling an update, rerun `python3 build.py` and refresh the browser. Serving an older `dist/` directory does not pick up source changes automatically. If a previous build showed an empty sidebar with `MF is not defined` in the console, pull the startup fix and rebuild with the commands above.

Private community records must never be embedded in HTML. `--content-dir` is rejected. Imports belong in the restricted database or the protected `IMPORTED_PEOPLE` file, and are read only through authenticated APIs. Generated files are written to `dist/`, which is ignored by Git. Each build cleans only that directory and marks an uncommitted tree with `-dirty`.

## Included applications

| Path | Application |
| --- | --- |
| `/portal1/` | Community portal, member profiles, ideas, discussions and chat |
| `/voting_demo/` | Populated fictional voting demo, stored in the browser |
| `/voting_trial/` | Shared voting trial with a separate backend and database |
| `/publications/` | Proposals, relevant history and sample surveys |

Publications aliases are generated by `build.py`, so their navigation works in a plain static preview. Original `/perspeviera/` assets remain available for compatibility.

The static preview does not provide live authentication, shared comments or trial submissions. Sample surveys do not collect answers. Portal chat currently retains its recent messages in process memory; restarting the member service clears that chat history.

### Additional services

- `server/voting_trial.py`: localhost port 8783. Configure `TRIAL_DB`, `TRIAL_ORIGIN` and optionally `TRIAL_PORT`; proxy `/voting_trial/api` to it.
- `server/perspectives_comments.py`: localhost port 8784. Configure `PERSPECTIVES_DB`, `PERSPECTIVES_ORIGIN`, `PERSPECTIVES_THREADS` and optionally `PERSPECTIVES_PORT`; proxy `/perspeviera/comments-api` to it. An example systemd unit is in `ops/`.
- The member service also needs a persistent Fernet key file at `MEMBER_SESSION_KEY` (default `/etc/mapleforge/session.key`) for encrypted Discord session proofs. Generate the key for the deployment and store it outside the repository and web root.

Some frontend and backend origin checks are specific to `maple-forge.ca`. Review those checks and OAuth callback settings before hosting under another domain. The gate instructions below describe the optional legacy preview gate; the repository does not enable or change a live deployment.

## Checks

```sh
python3 -m unittest discover -s tests
for test in tests/*.cjs; do node "$test" || exit; done
python3 build.py
git diff --check
```

GitHub Actions runs these checks on pushes and pull requests. There is no automatic production deployment.

## Server configuration

The services bind to localhost and require an HTTPS reverse proxy. Serve `dist/` as the web root. Keep the database and configuration outside that root. Deploy the complete `server/` directory together, including the modules imported by `members.py`. Imported community records must be loaded separately into the `records` table; private seed content is not in this repository.

The gate reads `GATE_CONFIG`, defaulting to `/etc/mapleforge/gate.json`. Configuration fields:

- `salt`: random salt encoded as hexadecimal.
- `password_hash`: PBKDF2-HMAC-SHA256 of the shared password, using that salt and the configured iteration count, encoded as hexadecimal.
- `iterations`: use 600,000 for a newly generated hash. Legacy configurations without this field retain 200,000 until the hash is rotated. Changing this field alone invalidates password verification.
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

- Forward `/preview-access` to the gate and overwrite `X-Real-IP` with nginx `$remote_addr`. Never accept a browser-supplied client identity.
- Rate-limit `/auth/` by `$binary_remote_addr` using `config/auth-rate-limit.conf`.
- Protect `/auth/`, `/portal1/` and `/api/` with an internal auth subrequest to the gate's `/check` endpoint, forwarding cookies.
- Redirect unauthorized portal requests to `/preview-access`; reject unauthorized API requests.
- Forward `/auth/` and authorized `/api/` requests to the member service, preserving request headers and cookies.
- Disable access logging for OAuth callback requests so authorization codes do not enter logs.
- Enforce HTTPS, request body limits, `no-store` for private responses and `noindex` for private routes.
- Never expose either backend port directly.

## Discord setup

Create a Discord developer application and register the exact callback URL. The server requests only `identify` and `guilds.members.read`. A bot installation is not required for sign-in.

Members first enter the private preview using the shared community word, then select **Sign in with Discord**. The server checks membership, rejects pending membership screening, and rechecks membership after a five-minute cache. Sessions expire after at most 24 hours. Discord access tokens are encrypted at rest for membership rechecks; refresh tokens are not retained. Portal display names can change without changing Discord identity or ownership.

## Before broader release

- Establish and test database backups and restoration.
- Agree on moderation, abuse handling and recovery-backup retention with the community.
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
separately managed community content. This organization copy is `MapleForgers/mapleforge-portal`. It preserves the
source history from `GnMohareb/MapleForge` and includes subsequent portal work.
Fetch before publishing and reconcile divergence without force-pushing over
other contributors’ work.

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

Install `config/preview-rate-limit.conf` in nginx's HTTP context and add the documented directives to `/preview-access`: six POST attempts per minute per IP, with a burst allowance of five, returning HTTP 429. The gate also limits each proxy-verified client to six attempts per minute and permits at most two concurrent hashes. There is no shared quota that one visitor can exhaust for everyone. GET requests do not consume the password-attempt quota.

`/api/shared`, `/api/community`, and `/api/comments` require a valid Discord member session. Signed-out clients skip those reads. Imported profiles, proposals and captured correspondence also require that session. The shared word opens an empty portal shell only. Raw Discord message IDs, channel names, attachment filenames and source URLs are omitted from imported idea responses.

Discord membership is checked on the first request after a five-minute cache expires. Membership removal, pending screening, invalid access tokens or token expiry revoke the session. Transient verification failures deny the request without renewing membership. Access tokens are Fernet-encrypted in session_proofs, never logged; refresh tokens are not retained. The encryption key is /etc/mapleforge/session.key (override MEMBER_SESSION_KEY), outside the database and backups, readable only by the service and administrator. After a restart, membership is rechecked before accepting a restored session. Logout, account deletion and session revocation remove the encrypted token. Expired token rows are pruned at startup and sign-in. Discord authorization requests use prompt=none to reuse prior grants. Existing 24-hour session expiry remains an upper bound. For immediate manual revocation, an administrator can delete that member's session rows from the protected database.

Display-name changes reject names already used as another member's display name or username, using Unicode normalization and case folding. Reserved administrative names and invisible control characters are rejected. This reduces impersonation but does not detect every visual lookalike. Existing stored names are not silently rewritten.

Idea source/reference links allow only absolute HTTPS URLs without embedded credentials.

Install dependencies with `python3 -m pip install -r requirements.txt`. Before deployment, provision a Fernet key at `/etc/mapleforge/session.key`, owned by root with group www-data and mode 0640. Never put the key in Git or database backups.

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
French. Only the author, timestamp, text and message role are returned for display. Source message metadata remains server-side.

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

## Forgers’ Map

Signed-in members can opt in to one shared map pin, choose their own position and location label, and edit or remove it. No GPS permission or automatic location lookup is used. Chosen coordinates are stored to five decimal places, not blurred. The editor explains that members can see the exact chosen spot and requires acknowledgement before saving. A broad-area point such as a city centre can be chosen instead of a home. Up to three optional country or Canadian provincial flags form one badge. Pins are only returned to signed-in members, and the server only allows members to change their own pin.

Deploy `server/shared.py` alongside the built portal and `public/flags` and `public/vendor/leaflet` assets. Startup creates the `member_locations` table automatically. Back up the member database before deployment. Leaflet 1.9.4 and flag-icons 7.6.0 are vendored with license files. OpenStreetMap supplies map tiles directly to browsers; member pins are supplied by the portal.

## Member details

The native member directory uses the contact form fields, with fictional examples kept separate from real entries. Signed-in MapleForge members may read submitted entries. The server derives ownership from the session and permits only the owner to save or remove their entry. All fields are optional, contact information requires an explicit sharing acknowledgement, and no contact data is copied to Activity. The `member_details` table is created automatically on service startup. Spreadsheet responses are not bundled or imported by this feature.

## Security review rollup

- All authenticated writes have a per-member limit of 60 requests per minute, with comments additionally limited to 15 per minute. These counters are process-local and reset on restart; this deployment runs one member process.
- Membership checks release the shared lock before contacting Discord. Failed checks never renew authorization.
- My profile contains **My content & privacy**, where owners can remove their posts, board entries, comments or entire portal account. Item deletion also removes its comments and Activity/bookmark copies. Imported Discord summaries are separately maintained and not automatically linked to account deletion. Protected recovery backups follow the operator's retention policy.
- Both session cookies use the `__Host-` prefix. Deploying the rename requires one fresh preview entry and Discord sign-in.
- `IMPORTED_PEOPLE` defaults to `/var/lib/mapleforge/imported-people.json`. Keep it outside the web root with service-only read access. After changing this external file, increment `content_version.value` in the database or restart and have members sign in again. Database triggers track all portal content mutations, including preferences and bookmarks, so polling does not miss changes without Activity events.
- Idea and governance categories are checked on the server. Feature history is capped at 20 entries. Member-created ideas are not copied into imported records for stage changes.
- The checks in `.github/workflows/checks.yml` run the Python suite, JavaScript tests and a clean build. Run the same commands locally before deploying. Broad Python formatting is intentionally a separate review to keep this security diff readable.

### Directory identity choice

Directory cards show the name a member enters. Discord handles are hidden by default, including for existing entries, and only included in the directory API when the owner enables the separate handle-sharing option. Hidden-handle entries omit the Discord account ID and portal display name as well; the current owner receives an `isOwn` flag for editing. This avoids an explicit identifier link, but does not promise anonymity if someone supplies identifying information. The sharing acknowledgement explains that access is available to people with the preview word who pass Discord server screening, not an individually vetted audience.

### Discord contribution permissions

Signed-in members see notice version `2026-10-22-v2` until they save a choice. Existing and future contributions have separate unchecked permissions. Declining does not restrict portal access. Change choices through My profile → My content & privacy → Discord sharing permissions. Earlier v1 consent does not authorize v2 imports.

Named source channels: #welcome, #company-direction-suggestions, #lobby-chat and #mapleforge-announcements. DMs, private channels, unnamed channels and threads are excluded. Viewers are MapleForge Discord members who passed server screening and have the preview word, not individually vetted people.

Imports without verified author IDs and current permission return anonymous placeholders, broad category and reply counts only. Titles, authors, body text, profiles, discussions, copied activity and saved-item details are withheld at the API. Direct portal submissions stay visible. Each imported reply requires its own author's consent. Withdrawal hides the corresponding existing or future imports automatically and advances the content revision for polling clients. It cannot retract copies already downloaded by another person.

The restricted `discord_import_authors` table links original message IDs to verified Discord account IDs and channel IDs. Administrators may use `server/link_discord_import.py` with a verified Discord API message export. Never infer identity from a display name. Legacy captures lack account IDs and remain placeholders until verified; opting in alone cannot restore an unmatched import. Unknown channels or missing source evidence fail closed. New importers must mark `consentPeriod: future`, check `shared.may_import_discord` before ingesting, and retain the verified message source. There is no automatic Discord harvester in this release.

Consent choices and UTC timestamps are stored in `discord_consent` and `discord_consent_history`, private to the owner. Account deletion removes them, withholding any matched imports. Administrators handle permanent removal requests for retained originals separately.

### Server recovery backup retention

Recovery backups in `/var/backups/mapleforge` expire within 30 days. `ops/expire_backups.py` runs hourly through the supplied systemd timer and expires entries at 29 days to allow scheduling margin. The timer is persistent across reboots. Hidden originals in the live database are retained for consent review, not treated as expiring recovery backups. After any restore, reapply current consent choices or invalidate restored choices before reopening the portal. A historical backup must not restore withdrawn permissions. This policy covers server recovery backups, not separate local working archives.

My content & privacy lists verified, account-linked Discord imports separately from direct portal submissions. The owner can see each linked import’s title and visibility state, including after withdrawal. Unmatched imports have an explicit pending-verification explanation.

## Import retention and map privacy

Map coordinates are rounded on the server to two decimals, including existing pins at startup. The map zoom is capped at 11. A grid cell is approximately 1.1 km north/south; east/west distance varies by latitude. This is coarsening, not a guarantee of anonymity. Members should use city or region labels, never addresses.

Run `server/retention.py` hourly using the import-expiry service and timer in `ops/`. It records the first hidden time, expires unconsented originals at 29 days (within the stated 30-day limit), and preserves anonymous counts. Consented originals and native portal contributions remain. Legacy imports start their clock at the first scan. Withdrawing consent starts a new hidden period. Expired originals cannot be restored by later consent.

Account deletion also removes verified Discord import-author mappings. Recovery backups and retired development exports must be consolidated under `/var/backups/mapleforge`, with the existing hourly expiry timer. Do not create unmanaged copies or cloud snapshots containing member data. Any independently managed copies require the same expiry policy. A restore must reapply current consent and expiry state before reopening access.


### Rules discussion and portal notice (2026-10-23)

Rules & agreements uses a compact forum layout scoped to that section. Members can vote on proposals and comments, reply in threads, and format comments with basic Markdown. Up to three PNG/JPEG/GIF/WebP or MP4/WebM files can be attached or pasted, totaling 20 MiB per comment, with a 200 MiB per-member attachment cap. Media is stored with comments and served only after session and parent-record access checks. Deleting a comment removes its media and votes and promotes retained replies to root comments. No arbitrary HTML is rendered.

The entry notice requires a checkbox before proceeding and can be reopened from the sidebar. Acknowledgement is session-local and is not Discord import consent or a liability waiver. The original seven conduct rules remain the baseline pending contributor agreement on additional rules.
