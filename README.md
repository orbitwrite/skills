<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/wordmark-dark.svg">
    <img src="assets/wordmark-light.svg" alt="Orbitwrite" width="320">
  </picture>
</p>

<p align="center">Skills and an MCP connection that let coding agents plan, draft, schedule and publish social posts through an <a href="https://orbitwrite.com">Orbitwrite</a> workspace.</p>

You need a workspace API key. In the app, open your workspace, then **Settings → API keys**, mint a key with the scopes you want the agent to have, and keep it in the `ORBITWRITE_API_KEY` environment variable.

## Install

**Claude Code** (plugin: MCP server plus the skill in one step)

```
/plugin marketplace add orbitwrite/skills
/plugin install orbitwrite@orbitwrite
```

The plugin's MCP entry reads `ORBITWRITE_API_KEY` from your environment.

**Cursor**

Open **Customize** in the sidebar, add `orbitwrite/skills` as a marketplace, and install **orbitwrite**. Cursor asks for the API key at install and sends it to the MCP server for you. For a local checkout:

```bash
git clone https://github.com/orbitwrite/skills.git
ln -s "$(pwd)/skills" ~/.cursor/plugins/local/orbitwrite
```

**Gemini CLI**

```bash
gemini extensions install https://github.com/orbitwrite/skills
```

The extension prompts for the API key and connects the MCP server.

**Grok Build**

Add `orbitwrite/skills` as a marketplace source, or install it from the xAI plugin marketplace once listed. Grok reads the bundled `.mcp.json` and expands `ORBITWRITE_API_KEY` from your environment into the bearer header.

**Any agent that reads skills** (Codex, Copilot, OpenCode, Windsurf and others)

```bash
npx skills add orbitwrite/skills
```

Then connect the MCP server in your client's own config. The URL is `https://mcp.orbitwrite.com`, the transport is Streamable HTTP, and the credential is the header `Authorization: Bearer <your key>`. The app's **Settings → MCP** tab has a ready-made snippet for each client.

**No MCP client at all?** The skill ships `scripts/api.mjs`, a small Node script that calls the HTTP API with the same key.

```bash
node skills/orbitwrite/scripts/api.mjs GET /connected-accounts
node skills/orbitwrite/scripts/api.mjs POST /posts --body-file examples/schedule-two-channels.json
```

## What's inside

```
skills/orbitwrite/
  SKILL.md            how to connect, the concepts, recipes and gotchas
  scripts/api.mjs     HTTP API caller, including the three-step media upload
  references/         generated: every MCP tool, every HTTP route, per-platform limits, permissions
examples/             request bodies for POST /posts and create_post
.claude-plugin/       Claude Code marketplace and plugin manifests
.cursor-plugin/       Cursor marketplace and plugin manifests
.grok-plugin/         Grok Build marketplace and plugin manifests
gemini-extension.json Gemini CLI extension manifest
.mcp.json, mcp.json   the hosted MCP server, for the Claude Code, Grok Build and Cursor plugins
```

`references/` is generated from the Orbitwrite source and regenerated whenever the API, the MCP tools or the platform rules change. Edits there will be overwritten; open an issue or edit `SKILL.md` instead.

## Links

- App: https://orbitwrite.com
- HTTP API docs: https://orbitwrite.com/api/v1/docs
- OpenAPI spec: https://orbitwrite.com/api/v1/openapi.json
- MCP server: https://mcp.orbitwrite.com

MIT licensed.
