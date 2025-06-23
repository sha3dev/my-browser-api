# MyBrowserAPI

Integración con x.com
Integración con reddit.com
Integración con chatgpt
Integración con whatsapp

# Como testear

- Instalo @anthropic-ai/claude-code
- añado mi server: claude mcp add "my-browser-mcp" npx tsx src/server/server.ts
- Voy a windosrf, añado configuracion custom de MCP, y añado esto:

```json
   "mcpServers": {
    "my-browser-mcp": {
      "command": "tsx",
      "args": ["/Users/jc/Documents/GitHub/my-browser-api/src/server/server.ts"],
      "disabled": false
    }
  }`
```
