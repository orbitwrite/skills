---
name: orbitwrite
description: Plan, draft, schedule and publish social media posts through an Orbitwrite workspace, and triage its inbox. Use when the user mentions Orbitwrite, asks to schedule or publish to X, LinkedIn, Bluesky, Mastodon, Threads, Instagram, Facebook, TikTok or Discord, wants to fill a posting queue, attach media to a post, request or give approval on a post, or reply to social conversations. Works over the hosted MCP server or the HTTP API.
---

# Orbitwrite

Orbitwrite is a social media management workspace: connect channels, compose once, schedule or publish to many platforms, run team approvals, and handle replies in a shared inbox. This skill teaches an agent to drive a workspace the way the app does.

There are two ways in. Prefer MCP when the client supports it; fall back to the HTTP API through `scripts/api.mjs` when it does not. Both run the same operations with the same rules, so the recipes below name the MCP tool and the HTTP route side by side.

## Setup

1. **Get a workspace API key.** In the app: open the workspace, then Settings → API keys. Keys look like `orbit_sk_...` and are shown once. Choose scopes when minting; a key with no scopes has the workspace's full authority. The Settings → MCP tab shows ready-made connection snippets for Claude Code, Claude Desktop, Cursor, VS Code and others.
2. **Store the key** in the `ORBITWRITE_API_KEY` environment variable, or in `~/.orbitwrite/credentials` as `ORBITWRITE_API_KEY=orbit_sk_...`. Never write it into a project file that could be committed.
3. **Connect the MCP server** (preferred; the script below is the fallback). It is at `https://mcp.orbitwrite.com`, Streamable HTTP, authenticated with `Authorization: Bearer <key>`. There is no OAuth flow; the key is the whole credential.

   Claude Code:

   ```bash
   claude mcp add --transport http orbitwrite https://mcp.orbitwrite.com \
     --header "Authorization: Bearer $ORBITWRITE_API_KEY"
   ```

   Cursor (`~/.cursor/mcp.json`) and most JSON-configured clients:

   ```json
   { "mcpServers": { "orbitwrite": { "url": "https://mcp.orbitwrite.com", "headers": { "Authorization": "Bearer orbit_sk_..." } } } }
   ```

4. **Without MCP**, call the API through the bundled script. Paths may omit the `/api/v1` prefix.

   ```bash
   node scripts/api.mjs GET /connected-accounts
   node scripts/api.mjs POST /posts --body-file ./post.json
   node scripts/api.mjs upload ./photo.jpg
   ```

## First call

Run `whoami` (MCP) or `GET /me` (HTTP). It returns the workspace the key acts in and the permissions it holds. Over MCP the tool list is already filtered to those permissions, so a tool missing from the list means the key lacks that scope. Do not work around a missing scope; tell the user which one is missing (see `references/permissions.md`).

## Concepts

- **Workspace.** One key belongs to exactly one workspace, so HTTP calls need no `organizationId`.
- **Channel** (connected account). A social account with an `id`, `platform` and handle. `list_channels` / `GET /connected-accounts`. Post-creating calls address channels by this id. Never guess one.
- **Post** = composer group, addressed by `groupId`. One post can go to many channels. Channels marked `isSynced: true` share one body; an unsynced channel gets its own copy and its own thread. Each channel carries `items`, a thread of one or more entries with `content`, optional `media`/`mediaIds`, `poll`, `quote`, `replyTo`.
- **Lifecycle.** `draft` → `scheduled` (or `pending_approval`) → `publishing` → `published`. `list_posts` / `GET /posts` returns one row per post with a `bucket` (drafts, needs_approval, needs_revision, approved, scheduled, posted). Read one post's full content with `get_post` / `GET /posts/draft?groupId=`.
- **Times** are ISO 8601 instants and must be strictly in the future. Convert the user's local time to UTC before sending. Read the workspace timezone from `read_posting_schedule` if you need it.
- **Posting schedule.** The workspace has weekly posting slots per channel. `suggest_post_times` / `GET /scheduling/suggestions` returns free slots; `read_posting_schedule` shows the configured times without saying which are taken.
- **Approvals.** A post can carry an approval request naming reviewer user ids. A `blocking` request holds the post at the publish gate until approved. Members without publish authority always get a blocking request, and cannot `publishNow`. Reviewer ids come from `list_members`.
- **Media.** Upload first, then reference the returned media `id` in an item's `mediaIds`. Accepted: JPEG, PNG, GIF, WebP, MP4, PDF.
- **Tags and campaigns** are labels on a post, set through `update_post_info` / `PATCH /posts/{groupId}/info` or the `info` field at create time.
- **Inbox.** Replies and mentions across channels as conversations with status, snooze and a read watermark shared by the whole team.

## Recipes

Each recipe lists the MCP tools; the HTTP route is in brackets. Full inputs are in `references/mcp-tools.md` and `references/api/*.md`.

**Schedule a post at a good time**

1. `list_channels` [`GET /connected-accounts`] and pick the channel ids the user means.
2. `suggest_post_times` with those `accountIds` [`GET /scheduling/suggestions`]. Use `strategy: "queue"` to append after existing posts, or `best-time` to rank by the platform's engagement profile. Skip this only when the user named a time.
3. `create_post` [`POST /posts`] with `scheduledAt` and one `accounts` entry per channel. Set `isSynced` explicitly.
4. Report the returned `groupIds` and the scheduled time.

**Publish now**

1. `create_post` with `publishNow: true` [`POST /posts`]. The call returns before the network publish runs.
2. Poll `get_publish_status` with the `groupIds` [`GET /posts/publish-status?groups=`] until `done` is true, then report each channel's `platformUrl` or error.

**Post with an image or video**

1. `upload_media_from_url` when the file is already on the web, or `upload_media` for local bytes [`node scripts/api.mjs upload <file>`, which runs create-upload-url, PUT and confirm].
2. Put the returned media `id` in the item's `mediaIds`, then create or schedule as above.

**Draft for someone else to approve**

1. `save_draft` [`POST /posts/draft`] with the content. Keep the returned `groupId`.
2. `list_members` to find reviewer user ids.
3. `request_approval` with `reviewerIds` and `blocking: true` [`POST /posts/{groupId}/approval-request`].
4. `schedule_post` [`POST /posts/reschedule`] with the intended time. It fires once approved. Or pass `approval` directly to `create_post` to do it in one call.

**Fill the queue with several posts**

1. `suggest_post_times` with `strategy: "queue"` and `count` equal to the number of posts. The times come back in order.
2. One `create_post` per post, using the times in order.

**Move, hold or remove a post**

- Change the time: `schedule_post` [`POST /posts/reschedule`].
- Back to draft: `unschedule_post` [`POST /posts/unschedule`].
- Delete: `delete_post` [`POST /posts/discard`]. Confirm with the user first; published posts stay live on the network.

**Edit an existing post**

`get_post` first, change the `accounts` array, then `save_draft` with the same `groupId`. A save replaces the whole post, so send every item back, including the unchanged ones.

**Triage the inbox**

`list_conversations` filtered by type or status → `get_conversation` for the thread → `resolve_conversation`, `snooze_conversation` (wake time strictly future) or `mark_conversation_read`. Replying is done from the app or the HTTP API; see `references/api/conversations.md`.

## Rules for the agent

- Read before writing. List channels, posts or members before naming an id; never fabricate one.
- Confirm before anything hard to undo: deleting a post, unscheduling, publishing now, bulk inbox sweeps.
- After a write, report the ids that came back (`groupId`, media `id`, conversation id) so the user can find the thing in the app.
- Keep the user's words. Do not rewrite copy the user supplied unless asked; platform limits are enforced server-side and an `invalid` error names the problem.
- Do not describe `best-time` suggestions as data about the user's audience. They are a static per-platform heuristic.
- Never print or store the API key in a file the user did not name.

## Gotchas

- **Every platform has its own limits.** Text length, media count and size, poll rules and the options a network accepts are all in `references/platforms.md`. Shape the post to fit before sending. The server refuses an oversized post with `invalid` and names the rule.
- **Media must be uploaded first.** A raw local path or an arbitrary URL in `media` is refused unless it is publicly fetchable. Upload, take the returned id, put it in `mediaIds`.
- **TikTok needs an MP4 of at least 23 fps**, judged from the uploaded file at publish time. A 15 fps screen recording is accepted at upload and fails at publish, with the reason in `get_publish_status`.
- **Instagram needs an image or video on every item.** There is no text-only Instagram post.
- **`isSynced` defaults differ** between the HTTP body and the MCP draft tool. Always set it.
- **`scheduledAt` is required even with `publishNow: true`.** Send the current time.
- **A draft has no real time.** `list_posts` reports `scheduledAt: null` for it, and date filters exclude it.
- **A save replaces the whole post.** `save_draft` with a `groupId` deletes and re-inserts every item, so send everything back.
- **Publish-now returns before anything is published.** The result says `publishing: true`; the outcome is in `get_publish_status`.
- **The MCP tool list is filtered by scope.** If a tool is missing, the key lacks that permission; nothing is broken.
- **Best-time suggestions are a static heuristic**, never this account's analytics. Say so if the user asks.

Worked request bodies for the common shapes are in `examples/` at the repository root.

## Errors

Services raise one of seven domain codes. Over HTTP the body is `{ "error": "..." }` with the status below; over MCP the tool result is an error carrying the same code.

| Code | HTTP | Meaning and what to do |
| --- | --- | --- |
| `invalid` | 400 | The input broke a rule (past time, empty content, over a platform limit, unknown media id). Fix the input. |
| `unauthorized` | 401 | Missing, malformed, revoked or expired key. Ask the user for a new key. |
| `forbidden` | 403 | The key lacks the permission. Name it; do not retry. |
| `not_found` | 404 | The id is not in this workspace. |
| `conflict` | 409 | State moved underneath you (already decided, already published). Re-read and decide again. |
| `rate_limited` | 429 | Wait and retry. Budgets are per credential. |
| `upstream_failed` | 502 | A social network or storage provider failed. Retry later; the credential is fine. |

## References

- `references/README.md`: index of everything below.
- `references/mcp-tools.md`: every tool, its required scope and input schema.
- `references/permissions.md`: the scope vocabulary and which roles hold what.
- `references/platforms.md`: per-network text, media, poll and option limits, plus the per-channel fields on a post.
- `references/api/<area>.md`: the HTTP API, one file per area, generated from the OpenAPI spec. The live spec is `https://orbitwrite.com/api/v1/openapi.json`.
