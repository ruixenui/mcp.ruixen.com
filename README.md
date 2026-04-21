# @ruixen/mcp

[![npm version](https://img.shields.io/npm/v/%40ruixen%2Fmcp.svg)](https://www.npmjs.com/package/@ruixen/mcp)
[![CI](https://github.com/ruixenui/mcp.ruixen.com/actions/workflows/ci.yml/badge.svg)](https://github.com/ruixenui/mcp.ruixen.com/actions/workflows/ci.yml)

Official [Model Context Protocol](https://modelcontextprotocol.io/) server for [Ruixen UI](https://ruixen.com/).

The server reads directly from the live [Ruixen registry](https://ruixen.com/registry.json), so the components your AI assistant can reach are always in sync with what's on ruixen.com.

## Installation

Add to your IDE's MCP config:

```json
{
  "mcpServers": {
    "ruixen-mcp": {
      "command": "npx",
      "args": ["-y", "@ruixen/mcp@latest"]
    }
  }
}
```

Works with any MCP-compatible client — Cursor, Claude Desktop, Windsurf, Cline, Roo-Cline, and VS Code (with an MCP extension). Each client stores this config in its own settings file; consult your client's docs for the exact location.

## Example Usage

Once configured, ask your AI assistant things like:

> "Make a marquee of logos"

> "Add a blur fade text animation"

> "Add a grid background"

> "Show me button components with spring animations"

The assistant calls the MCP tools below to discover components, pull their source, and hand you the exact `npx shadcn@latest add …` command to install each one into your project.

## Available Tools

| Tool | Description |
|---|---|
| `listRegistryItems` | List registry items with optional `kind`, `query`, `limit`, and `offset` filters. Good for broad browsing. |
| `searchRegistryItems` | Keyword search across names, titles, descriptions, and registry types, ranked by relevance. Good when you know roughly what you want. |
| `getRegistryItem` | Item detail for a specific component. Optionally includes `source`, `examples`, and `relatedItems`. |

## Development

```bash
npm install
npm run build   # tsc + chmod
npm test        # runs the live-registry smoke test (requires internet)
```

## License

[MIT](https://github.com/ruixenui/mcp.ruixen.com/blob/main/LICENSE.md)
