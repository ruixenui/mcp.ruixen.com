# Changelog

## 1.0.1 (2026-04-21)

### Fixes

* Add `mcp` bin alias so `npx @ruixen/mcp@latest` resolves correctly (this is the form used by every MCP-client config and the README's copy-paste snippet). The original `ruixen-mcp` binary is still available. Without this fix, users invoking via `npx @ruixen/mcp` saw `command not found` because npx derives the bin name from the unscoped package name (`mcp`), which 1.0.0 didn't expose.

## 1.0.0 (2026-04-21)

### Features

* Initial release of Ruixen UI MCP server
* `listRegistryItems` — list registry items with optional `kind` / `query` filters and pagination
* `searchRegistryItems` — keyword search across names, titles, descriptions, and registry types
* `getRegistryItem` — item detail with optional source, examples, and related items
