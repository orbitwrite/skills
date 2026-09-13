# Example request bodies

Each file is a body for `POST /api/v1/posts`, and the same shape `create_post` takes over MCP, except `draft.json`, which is the body for `POST /api/v1/posts/draft` and `save_draft`. Replace every `<placeholder>` with a real id from `list_channels`, `list_members`, `list_campaigns` or a media upload, and move `scheduledAt` into the future before sending. The server refuses a past time.

```bash
node ../skills/orbitwrite/scripts/api.mjs POST /posts --body-file ./schedule-two-channels.json
node ../skills/orbitwrite/scripts/api.mjs POST /posts/draft --body-file ./draft.json
```

## Basics

| File | Shows |
| --- | --- |
| `schedule-two-channels.json` | One post to two synced channels at a chosen time. |
| `different-copy-per-channel.json` | A short X version and a long LinkedIn version of the same announcement, unsynced. |
| `staggered-times.json` | The same post on three channels, each with its own fire time. |
| `publish-now.json` | Publish as soon as possible; poll publish status afterwards. |
| `draft.json` | Save without a time. Schedule it later with `schedule_post` or `POST /posts/reschedule`. |
| `with-tags-and-campaign.json` | Title, tags and a campaign through the `info` field. |
| `reschedule-with-new-content.json` | Replace a scheduled post's content and time in one call with `replaceGroupId`. |

## Content types

| File | Shows |
| --- | --- |
| `thread.json` | A four-item X thread with reply settings. |
| `poll.json` | A four-option poll open for a day. X and Mastodon support polls. |
| `quote-post.json` | Quote another post by URL. Bluesky, X and Threads support quotes. |
| `reply-to-url.json` | Publish as a reply to an existing post by URL. |
| `link-preview.json` | Pin the link card to a specific URL in the text. |

## Media

| File | Shows |
| --- | --- |
| `with-media.json` | The same image attached on two channels by media id. |
| `instagram-reel.json` | A vertical video as a Reel through `postFormat`. |
| `linkedin-document.json` | A PDF carousel on LinkedIn. |
| `tiktok-video.json` | A video post with TikTok's own options. |

## Team and automation

| File | Shows |
| --- | --- |
| `with-approval.json` | A post that waits for a named reviewer before it can publish. |
| `auto-engagement.json` | A first comment from the posting account, then a like and a repost from a colleague's account. |

## Small bodies

These are short enough to write inline.

| Call | Body |
| --- | --- |
| `POST /posts/reschedule` (`schedule_post`) | `{ "groupId": "…", "scheduledAt": "2027-01-05T09:00:00Z" }` |
| `POST /posts/unschedule` (`unschedule_post`) | `{ "groupId": "…" }`, add `"removeApproval": true` to drop the approval request too |
| `POST /posts/post-now` (`publish_post`) | `{ "groupId": "…" }` |
| `POST /posts/discard` (`delete_post`) | `{ "groupId": "…" }` |
| `PATCH /posts/{groupId}/info` (`update_post_info`) | `{ "title": "…", "tags": ["launch"], "campaignId": null }` |
| `POST /media/create-upload-url` | `{ "name": "photo.jpg", "mime_type": "image/jpeg", "size_bytes": 123456 }`, then PUT the bytes, then `POST /media/confirm` with `{ "media_ids": ["…"] }` |

The same content on several channels goes in as one entry per channel with `isSynced: true`. Different content per channel, or a thread on only one of them, uses `isSynced: false` on that channel and its own `items`. Every limit a network applies is in `../skills/orbitwrite/references/platforms.md`.
