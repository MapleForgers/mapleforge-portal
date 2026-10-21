# MapleForge

A Canadian community portal for ideas, skills and collaboration. Built with browser JavaScript, CSS, SVG and Python's standard library.

## Current state

This is a development preview, not a complete community platform.

Working shared features:

- Discord sign-in with a MapleForge server-membership check.
- Member-owned idea posts and edits.
- Comments on idea and feature threads.
- Member profiles, skills, services and portal display names.
- Four themes, adjustable text size, compact lists, cards and workspace tabs.

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

Members first enter the private preview using the shared community word, then select **Sign in with Discord**. The server checks membership and rejects pending membership screening. Sessions expire after 24 hours, after which a new sign-in checks membership again. Discord access and refresh tokens are not stored. Portal display names can change without changing Discord identity or ownership.

## Before broader release

- Establish and test database backups and restoration.
- Add member-facing deletion, moderation and abuse-handling workflows.
- Review privacy information and retention with the community.
- Complete accessibility, concurrency and load testing.

Do not describe this preview as fully production-ready. Do not commit secrets, private data, generated private builds or runtime databases.
