# Orbitwrite skills

Skills and an MCP connection that let coding agents plan, draft, schedule and publish social posts through an [Orbitwrite](https://orbitwrite.com) workspace.

You need a workspace API key. In the app, open your workspace, then **Settings → API keys**, mint a key with the scopes you want the agent to have, and keep it in the `ORBITWRITE_API_KEY` environment variable.

## Install

**Claude Code** (plugin: MCP server plus the skill in one step)

```
/plugin marketplace add orbitwrite/skills
/plugin install orbitwrite@orbitwrite
```

The plugin's MCP entry reads `ORBITWRITE_API_KEY` from your environment.

**Any agent that reads skills** (Cursor, Codex, Copilot, OpenCode, Windsurf and others)

```bash
npx skills add orbitwrite/skills
```

Then connect the MCP server in your client's own config. The URL is `https://mcp.orbitwrite.com`, the transport is Streamable HTTP, and the credential is the header `Authorization: Bearer <your key>`. The app's **Settings → MCP** tab has a ready-made snippet for each client.

**No MCP client at all?** The skill ships `scripts/api.mjs`, a small Node script that calls the HTTP API with the same key.

```bash
node skills/orbitwrite/scripts/api.mjs GET /connected-accounts
```

## What's inside

```
skills/orbitwrite/
  SKILL.md            how to connect, the concepts, and step-by-step recipes
  scripts/api.mjs     HTTP API caller, including the three-step media upload
  references/         generated: every MCP tool, every HTTP route, the permission vocabulary
.claude-plugin/       Claude Code marketplace + plugin manifests
.mcp.json             the hosted MCP server, for the Claude Code plugin
```

`references/` is generated from the Orbitwrite source and regenerated whenever the API or the MCP tools change. Edits there will be overwritten; open an issue or edit `SKILL.md` instead.

## Links

- App: https://orbitwrite.com
- HTTP API docs: https://orbitwrite.com/api/v1/docs
- OpenAPI spec: https://orbitwrite.com/api/v1/openapi.json
- MCP server: https://mcp.orbitwrite.com

MIT licensed.
