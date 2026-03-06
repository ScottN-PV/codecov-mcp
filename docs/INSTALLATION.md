# Installation Guide

Complete setup instructions for every supported MCP client and platform.

**Prerequisites:** [Node.js](https://nodejs.org/) v20 or later.

## Table of Contents

- [Step 1: Get a Codecov API Token](#step-1-get-a-codecov-api-token)
- [Claude Code (CLI)](#claude-code-cli)
- [Claude Desktop](#claude-desktop)
- [Codex CLI](#codex-cli)
- [Gemini CLI / Gemini Code Assist](#gemini-cli--gemini-code-assist)
- [VS Code (GitHub Copilot)](#vs-code-github-copilot)
- [Cursor](#cursor)
- [Windsurf](#windsurf)
- [Cline](#cline)
- [Continue](#continue)
- [Zed](#zed)
- [Other MCP Clients](#other-mcp-clients)
- [Configuration Reference](#configuration-reference)
- [Verifying the Installation](#verifying-the-installation)
- [Troubleshooting](#troubleshooting)

---

## Step 1: Get a Codecov API Token

This step is the same for all clients and platforms.

1. Log in to [codecov.io](https://codecov.io)
2. Go to **Settings > Access** ([direct link](https://app.codecov.io/account))
3. Click **Generate Token**
4. Copy the token — you'll need it below

> **Important:** You need an **API Access Token**, not an upload token. Upload tokens (used in CI) will not work with this MCP server.

---

## Claude Code (CLI)

Claude Code can be configured via the `claude mcp add` CLI command or by editing the JSON config file directly.

> **Recommendation:** On Windows, skip the CLI command and **edit the JSON config directly** (Option B below). The `claude mcp add` command has quoting and argument parsing issues in PowerShell and CMD that make it unreliable. Editing the JSON file takes 30 seconds and works every time.

### Option A: CLI Command (macOS / Linux)

```bash
claude mcp add --transport stdio codecov \
  --env CODECOV_TOKEN=your-token-here \
  -- npx -y codecov-mcp
```

<details>
<summary><strong>Windows CLI commands (may not work reliably)</strong></summary>

PowerShell:
```powershell
claude mcp add --transport stdio codecov `
  --env CODECOV_TOKEN=your-token-here `
  -- npx -y codecov-mcp
```

CMD (single line):
```cmd
claude mcp add --transport stdio codecov --env CODECOV_TOKEN=your-token-here -- npx -y codecov-mcp
```

If either fails with "missing required argument" or similar parsing errors, use Option B instead.

</details>

### Option B: Edit JSON Config Directly (All Platforms — Recommended for Windows)

This is the most reliable method on every platform. Open your Claude Code config file and add the `codecov` entry.

**macOS / Linux:**

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Windows (native):**

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

> **Why `cmd /c` on Windows?** Native Windows requires launching `npx` through `cmd` to ensure correct process spawning. This is the pattern documented by Anthropic for Claude Code on Windows. If you get `spawn npx ENOENT` errors with `"command": "npx"`, the `cmd /c` pattern resolves it.

**Config file locations:**

| Platform | User-level config | Project-level config |
|----------|-------------------|----------------------|
| macOS    | `~/.claude.json` | `.claude.json` in repo root |
| Linux    | `~/.claude.json` | `.claude.json` in repo root |
| Windows  | `C:\Users\<username>\.claude.json` | `.claude.json` in repo root |

> **Tip:** If the file already has other MCP servers, add `"codecov": { ... }` inside the existing `"mcpServers"` object — don't create a second `"mcpServers"` key. Project-level config overrides user-level.

---

## Claude Desktop

Claude Desktop is configured via a JSON file. The easiest way to open it:

1. Open Claude Desktop
2. Go to **Settings > Developer**
3. Click **Edit Config**

This opens `claude_desktop_config.json` in your default editor. Add the `codecov` server:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

> **Windows users:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

> **Note:** If the file already has other MCP servers, add `"codecov": { ... }` inside the existing `"mcpServers"` object — don't create a second one.

After saving, **restart Claude Desktop** for the changes to take effect.

<details>
<summary><strong>Config file locations by platform</strong></summary>

| Platform | Path |
|----------|------|
| macOS    | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows  | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux    | `~/.config/Claude/claude_desktop_config.json` |

**Windows MSIX note:** If you installed Claude Desktop from the Microsoft Store (MSIX), the app may read from a virtualized path instead:
```
C:\Users\<username>\AppData\Local\Packages\Claude_<id>\LocalCache\Roaming\Claude\claude_desktop_config.json
```
Use the **Settings > Developer > Edit Config** button to ensure you're editing the correct file.

</details>

---

## Codex CLI

Codex CLI supports MCP servers via the `codex mcp add` command. The same MCP configuration is shared with the Codex IDE extension.

```bash
codex mcp add codecov --env CODECOV_TOKEN=your-token-here -- npx -y codecov-mcp
```

Codex stores configuration in `~/.codex/config.toml` (user-level) or `.codex/config.toml` (project-level).

---

## Gemini CLI / Gemini Code Assist

Gemini CLI is Google's MCP-capable terminal agent. Gemini Code Assist agent mode in VS Code is powered by Gemini CLI and uses the same MCP configuration.

Create either:

- `.gemini/settings.json` in your project root (project-level), or
- `~/.gemini/settings.json` in your home directory (user-level)

Then add:

```json
{
  "mcpServers": {
    "codecov": {
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

> **Windows users:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

---

## VS Code (GitHub Copilot)

VS Code uses `.vscode/mcp.json` in your workspace (project-level) or a user-level MCP config.

### Option A: Workspace Config (Recommended)

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "${input:codecov-token}"
      }
    }
  },
  "inputs": [
    {
      "id": "codecov-token",
      "type": "promptString",
      "description": "Codecov API Token",
      "password": true
    }
  ]
}
```

This will prompt you for the token on first use so it doesn't get committed to your repo.

> **Note:** If your project has `.vscode/` in `.gitignore`, this file won't be tracked. Move the config to user-level (Option C) if you need it to persist, or remove `.vscode/` from `.gitignore` if you want to share it with your team.

### Option B: Hardcoded Token (Private Repos Only)

If you don't want the prompt, hardcode the token (but **don't commit this file**):

```json
{
  "servers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Option C: User-Level Config

Run the command **MCP: Open User Configuration** from the VS Code command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and add the same server configuration.

> **Note:** VS Code uses `"servers"` (not `"mcpServers"`) and supports an `"inputs"` array for secure token handling.

---

## Cursor

Cursor supports both project-level and user-level MCP configuration.

### Option A: Project Config

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Option B: Global Config

Edit `~/.cursor/mcp.json` to make codecov-mcp available in all projects:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

> **Windows users:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

<details>
<summary><strong>Config file locations by platform</strong></summary>

| Platform | Global config |
|----------|---------------|
| macOS    | `~/.cursor/mcp.json` |
| Linux    | `~/.cursor/mcp.json` |
| Windows  | `C:\Users\<username>\.cursor\mcp.json` |

</details>

---

## Windsurf

Windsurf can be configured through the UI or by editing the config file directly.

### Via UI

1. Click the **MCP** icon in the Cascade panel, or go to **Windsurf Settings > Cascade > MCP Servers**
2. Add a new server with the configuration below

### Via Config File

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

> **Windows users:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

<details>
<summary><strong>Config file locations by platform</strong></summary>

| Platform | Path |
|----------|------|
| macOS    | `~/.codeium/windsurf/mcp_config.json` |
| Linux    | `~/.codeium/windsurf/mcp_config.json` |
| Windows  | `C:\Users\<username>\.codeium\windsurf\mcp_config.json` |

</details>

---

## Cline

Cline is a VS Code extension with deep MCP integration.

1. Open the Cline sidebar in VS Code
2. Click the **MCP Servers** icon
3. Click **Configure MCP Servers** to open `cline_mcp_settings.json`
4. Add the codecov server:

```json
{
  "mcpServers": {
    "codecov": {
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

> **Windows users:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

---

## Continue

Continue is an open-source AI code assistant for VS Code and JetBrains with MCP support.

Add the MCP server to your Continue config (`.continue/config.yaml` or via the Continue settings UI):

```yaml
mcpServers:
  - name: codecov
    command: npx
    args:
      - -y
      - codecov-mcp
    env:
      CODECOV_TOKEN: your-token-here
```

Refer to the [Continue MCP docs](https://docs.continue.dev/customize/mcp-tools) for additional configuration options.

---

## Zed

Zed has built-in MCP support. Add the following to your Zed settings (`settings.json`):

```json
{
  "context_servers": {
    "codecov": {
      "command": {
        "path": "npx",
        "args": ["-y", "codecov-mcp"],
        "env": {
          "CODECOV_TOKEN": "your-token-here"
        }
      }
    }
  }
}
```

Open Zed settings via **Zed > Settings** (macOS) or **File > Settings** (Linux).

---

## Other MCP Clients

Any MCP-compatible client that supports stdio transport can use codecov-mcp. The general pattern:

- **Command:** `npx`
- **Arguments:** `["-y", "codecov-mcp"]`
- **Environment:** `CODECOV_TOKEN` set to your API token
- **Transport:** stdio

Refer to your client's documentation for the specific config format.

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CODECOV_TOKEN` | Yes* | — | Codecov API access token |
| `CODECOV_API_BASE_URL` | No | `https://api.codecov.io` | API base URL (for self-hosted Codecov) |
| `CODECOV_SERVICE` | No | auto-detected | `github`, `gitlab`, `bitbucket`, `github_enterprise`, `gitlab_enterprise`, `bitbucket_server` |
| `CODECOV_OWNER` | No | auto-detected | Organization or username |
| `CODECOV_REPO` | No | auto-detected | Repository name |
| `CODECOV_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds |
| `CODECOV_MAX_RETRIES` | No | `3` | Max retries on 429/5xx errors |
| `CODECOV_CACHE_TTL_MS` | No | `300000` | Cache TTL in milliseconds (5 minutes) |

\* Not required for `validate_yaml`, which uses a public endpoint.

### Auto-Detection

When running inside a git repository, the server automatically detects `service`, `owner`, and `repo` from your `git remote origin` URL. Supported remote formats:

- SSH: `git@github.com:owner/repo.git`
- HTTPS: `https://github.com/owner/repo.git`

This means **zero configuration beyond the token** in most cases.

### Pinning to a Specific Repo

To always target a specific repo regardless of your working directory, add the service/owner/repo environment variables:

```json
{
  "env": {
    "CODECOV_TOKEN": "your-token-here",
    "CODECOV_SERVICE": "github",
    "CODECOV_OWNER": "my-org",
    "CODECOV_REPO": "my-repo"
  }
}
```

### Self-Hosted Codecov

Set `CODECOV_API_BASE_URL` to your instance URL:

```json
{
  "env": {
    "CODECOV_TOKEN": "your-token-here",
    "CODECOV_API_BASE_URL": "https://codecov.internal.company.com"
  }
}
```

---

## Verifying the Installation

After adding codecov-mcp to your client, verify it's working:

1. **Open your AI agent** (Claude Code, Claude Desktop, Cursor, etc.)
2. **Ask:** "What tools do you have from codecov?"
   - You should see all the codecov tools listed
3. **Test a call:** "What's the current coverage for this repo?"
   - If auto-detection is working, you should get coverage data
   - If not, you'll get a clear error message about what to configure

### Expected Errors and What They Mean

| Error | Cause | Fix |
|-------|-------|-----|
| `CODECOV_TOKEN is not set` | Token not configured | Add the token to your env config |
| `Could not determine git service` | Not in a git repo, or remote is unrecognized | Set `CODECOV_SERVICE`, `CODECOV_OWNER`, `CODECOV_REPO` |
| `Authentication failed (401)` | Invalid or expired token | Generate a new API token at codecov.io |
| `Resource not found (404)` | Wrong owner/repo, or repo has no coverage data | Verify the owner and repo names |

---

## Troubleshooting

### "npx" is not recognized

Node.js is not installed or not in your PATH. Install Node.js v20+ from [nodejs.org](https://nodejs.org/).

### Server starts but no tools appear

- Make sure you're using the correct config format for your client (e.g., `"servers"` for VS Code vs. `"mcpServers"` for others)
- Restart your client after changing the config
- Check that `npx -y codecov-mcp` runs successfully in your terminal

### Slow first startup

The first run uses `npx -y` which downloads the package. Subsequent runs use the cached version. If startup time is important, install globally:

```bash
npm install -g codecov-mcp
```

Then change the command in your config:

```json
{
  "command": "codecov-mcp",
  "args": []
}
```

### Windows: "spawn npx ENOENT"

Some MCP clients on Windows can't find `npx` directly. Use the `cmd /c` pattern:

```json
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "codecov-mcp"]
}
```

If that doesn't work, try `npx.cmd`:

```json
{
  "command": "npx.cmd",
  "args": ["-y", "codecov-mcp"]
}
```

Or install globally and use `codecov-mcp` as the command.

### Stale data

The server caches responses for 5 minutes by default. To reduce or disable:

```json
{
  "env": {
    "CODECOV_TOKEN": "your-token-here",
    "CODECOV_CACHE_TTL_MS": "0"
  }
}
```

### Timeout errors

Increase the timeout for slow connections:

```json
{
  "env": {
    "CODECOV_TOKEN": "your-token-here",
    "CODECOV_TIMEOUT_MS": "60000"
  }
}
```
