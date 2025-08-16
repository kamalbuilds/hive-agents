# HiveMind AgentKit MCP Integration

This MCP server integrates Coinbase CDP AgentKit with OpenSea MCP to provide real blockchain wallet functionality to Claude AI.

## Features

### CDP AgentKit Tools (Blockchain Operations)
The AgentKit integration provides all standard blockchain tools:
- **transfer** - Send tokens to another address
- **get_balance** - Check wallet balance
- **get_wallet_address** - Get the AgentKit wallet address
- **deploy_nft** - Deploy NFT contracts
- **mint_nft** - Mint NFTs
- **deploy_token** - Deploy ERC-20 tokens
- **request_faucet_funds** - Request testnet funds
- **trade** - Execute token swaps
- **register_basename** - Register ENS names
- **wow_create_token** - Create meme tokens

### OpenSea MCP Tools (NFT Marketplace)
Custom OpenSea integration tools:
- **search_nft_collections** - Search for NFT collections
- **get_collection** - Get detailed collection information
- **get_trending_collections** - Get trending NFT collections
- **get_my_nfts** - Get NFTs owned by the AgentKit wallet
- **get_nft_floor_price** - Get collection floor prices
- **analyze_portfolio** - Analyze the complete portfolio

## Setup

### 1. Get CDP API Keys

1. Go to [CDP Portal](https://portal.cdp.coinbase.com/access/api)
2. Create a new API key
3. Save the key name and private key

### 2. Get OpenSea Access Token (Optional)

1. Request beta access at [OpenSea MCP](https://opensea.notion.site/)
2. Wait for approval
3. Receive your access token

### 3. Configure Environment

Edit `.env` file:
```env
# CDP AgentKit Configuration (REQUIRED)
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----
your_private_key_here
-----END EC PRIVATE KEY-----
NETWORK_ID=base-sepolia

# OpenSea MCP Configuration (OPTIONAL)
OPENSEA_ACCESS_TOKEN=your_opensea_token
OPENSEA_MCP_URL=https://mcp.opensea.io/sse
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Server

```bash
npm run mcp:agentkit
```

## Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hive-mind-agentkit": {
      "command": "node",
      "args": [
        "/Users/kamal/Desktop/nyc/hive-mind/src/mcp/mcp-agentkit.js"
      ],
      "env": {
        "CDP_API_KEY_NAME": "your_key_name",
        "CDP_API_KEY_PRIVATE_KEY": "your_private_key",
        "NETWORK_ID": "base-sepolia",
        "OPENSEA_ACCESS_TOKEN": "your_opensea_token"
      }
    }
  }
}
```

## Example Claude Prompts

### Blockchain Operations
- "What's my wallet address?"
- "Check my ETH balance"
- "Send 0.01 ETH to 0x123..."
- "Deploy an NFT contract called CoolCats"
- "Mint an NFT with metadata"
- "Request testnet funds from the faucet"

### NFT Marketplace Operations
- "Search for Bored Ape NFT collections"
- "Get the floor price of CryptoPunks"
- "Show me trending NFT collections"
- "Get all NFTs in my wallet"
- "Analyze my portfolio"

### Combined Operations
- "Buy the cheapest Azuki NFT"
- "Check if I have enough ETH to buy a Doodle"
- "Deploy my own NFT collection and mint the first token"

## Network Support

The AgentKit supports multiple networks:
- `base-sepolia` (default) - Base Sepolia testnet
- `base-mainnet` - Base mainnet
- `ethereum-mainnet` - Ethereum mainnet
- `polygon-mainnet` - Polygon mainnet
- `arbitrum-mainnet` - Arbitrum mainnet

## Security Notes

1. **Never commit your `.env` file** - It contains sensitive API keys
2. **Use testnet first** - Always test on testnet before mainnet
3. **Keep keys secure** - Store API keys in a password manager
4. **Monitor usage** - Check CDP portal for API usage

## Troubleshooting

### AgentKit not initializing
- Check that CDP API keys are correctly set in `.env`
- Ensure the private key includes the full PEM format with headers
- Verify network connectivity

### OpenSea tools not working
- OpenSea access token may be missing or invalid
- Check rate limits on OpenSea API
- Verify the collection slug is correct

### Tools not appearing in Claude
- Restart Claude Desktop after config changes
- Check the MCP server is running without errors
- Verify the path in config is absolute

## Advanced Usage

### Custom Network Configuration
```javascript
// In mcp-agentkit.js
agentKit = await AgentKit.from({
  cdpApiKeyName: process.env.CDP_API_KEY_NAME,
  cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
  networkId: 'ethereum-mainnet', // Change network
  options: {
    // Additional options
  }
})
```

### Adding Custom Tools
```javascript
// Add to openSeaTools array
{
  name: 'custom_tool',
  description: 'My custom tool',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string' }
    }
  }
}

// Add case in switch statement
case 'custom_tool': {
  // Implementation
  return { content: [{ type: 'text', text: 'Result' }] }
}
```

## Support

- CDP Support: https://docs.cdp.coinbase.com
- OpenSea Docs: https://docs.opensea.io
- MCP Docs: https://modelcontextprotocol.io