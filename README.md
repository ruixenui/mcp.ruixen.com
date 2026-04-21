# @ruixen/mcp

[![npm version](https://img.shields.io/npm/v/%40ruixen%2Fmcp.svg)](https://www.npmjs.com/package/@ruixen/mcp)

Official ModelContextProtocol (MCP) server for [Ruixen UI](https://ruixen.com/).

## Install MCP configuration

```bash
npx @ruixen/cli@latest install <client>
```

### Supported Clients

- [x] cursor
- [x] windsurf
- [x] claude
- [x] cline
- [x] roo-cline

## Manual Installation

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

## Example Usage

Once configured, you can ask questions like:

> "Make a marquee of logos"

> "Add a blur fade text animation"

> "Add a grid background"

> "Show me button components with spring animations"

## Available Tools

The server provides the following tools callable via MCP:

| Tool Name       | Description                                                                                                                                                                                                                                                                                                                                                                                             |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `listRegistryItems` | Lists Ruixen UI registry items with optional filters like `kind`, `query`, `limit`, and `offset`. Recommended for registry browsing. |
| `searchRegistryItems` | Searches Ruixen UI registry items by keyword across names, titles, descriptions, and registry types, with pagination support. |
| `getRegistryItem` | Returns details for a single registry item, including install instructions and optional source, related items, and examples. |

## MCP Limitations

Some clients have a [limit](https://docs.cursor.com/context/model-context-protocol#limitations) on the number of tools they can call. The server keeps a small generic tool surface and reads directly from the live Ruixen UI registry, rather than relying on hardcoded category buckets.

## License

[MIT](https://github.com/ruixenui/mcp.ruixen.com/blob/main/LICENSE.md)
