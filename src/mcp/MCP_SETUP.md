# MCP Server Setup Guide

## Important: OpenSea MCP and AgentKit MCP are SEPARATE servers

The OpenSea MCP should be configured as its own MCP server in your Claude configuration, not integrated into the AgentKit server. Here's the correct setup:

## Option 1: Use Both MCP Servers Separately (Recommended)

Add BOTH servers to your Claude MCP configuration:

```json
{
  "mcpServers": {
    "opensea": {
      "url": "https://mcp.opensea.io/mcp",
      "headers": {
        "Authorization": "Bearer aw0Zy876VFBWAyb7l6ayPwoWr2EU7tnGQOovsz4egU"
      }
    },
    "hive-mind-agentkit": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/kamal/Desktop/nyc/hive-mind/src/mcp/mcp-agentkit.ts"
      ],
      "env": {
        "CDP_API_KEY_NAME": "67f87494-e10e-4159-b44c-cc528978c70d",
        "CDP_API_KEY_SECRET": "YOUR_CDP_API_KEY_SECRET",
        "CDP_WALLET_SECRET": "YOUR_WALLET_SECRET",
        "NETWORK_ID": "base-sepolia"
      }
    }
  }
}
```

## Option 2: Use OpenSea API Directly (Current Implementation)

The current `mcp-agentkit.ts` file now uses the OpenSea REST API directly instead of MCP. This works but has limitations:

1. The OpenSea v2 API requires an API key (different from MCP access token)
2. Some endpoints like "trending" don't exist in the REST API
3. You need to get an OpenSea API key from: https://docs.opensea.io/reference/api-keys

To get an OpenSea API key:
1. Go to https://opensea.io/account/settings/developer
2. Create a new API key
3. Add it to your .env file as `OPENSEA_API_KEY`

## Available Tools

### With OpenSea MCP (Option 1):
- `get_trending_collections` - Full trending data
- `get_trending_tokens` - Trending tokens
- `search` - AI-powered search
- All other OpenSea MCP tools

### With AgentKit MCP:
- All CDP wallet operations
- Token transfers
- NFT operations
- Trading functions

## Testing

To test the OpenSea MCP directly:
```bash
curl -X POST https://mcp.opensea.io/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_trending_collections",
      "arguments": {
        "timeframe": "ONE_DAY"
      }
    },
    "id": 1
  }'
```

## Troubleshooting

### 404 Errors
- The OpenSea MCP is not a REST API, it's an MCP server
- Use the correct URL: `https://mcp.opensea.io/mcp` for HTTP or `https://mcp.opensea.io/sse` for SSE
- Don't try to make direct HTTP calls to it from your code

### Integration Issues
- OpenSea MCP and AgentKit should be separate MCP servers
- If you need to combine them, you'll need to implement proper MCP proxy functionality
- The current implementation uses OpenSea's REST API as a workaround

### Best Practice
Use Option 1 - configure both MCP servers separately in Claude. This gives you:
- Full OpenSea MCP functionality
- Full AgentKit CDP functionality
- No integration issues
- Better performance