# Example request bodies

Each file is a body for `POST /api/v1/posts`, and the same shape `create_post` takes over MCP. Replace every `<placeholder>` with a real id from `list_channels`, `list_members` or a media upload, and move `scheduledAt` into the future before sending. The server refuses a past time.

```bash
node ../skills/orbitwrite/scripts/api.mjs POST /posts --body-file ./schedule-two-channels.json
```

| File | Shows |
| --- | --- |
| `schedule-two-channels.json` | One post to two synced channels at a chosen time. |
| `thread.json` | A four-item X thread with reply settings. |
| `with-media.json` | The same image attached on two channels by media id. |
| `with-approval.json` | A post that waits for a named reviewer before it can publish. |
| `publish-now.json` | Publish as soon as possible; poll publish status afterwards. |
| `tiktok-video.json` | A video post with TikTok's own options. |

The same content on several channels goes in as one entry per channel with `isSynced: true`. Different content per channel, or a thread on only one of them, uses `isSynced: false` on that channel and its own `items`.
