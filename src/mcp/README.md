# HiveMind MCP Embedded Wallet

An Electron-based embedded wallet that integrates OpenSea MCP tools with x402 protocol for the HiveMind AI agent marketplace.

## Architecture

```
┌─────────────────────────────────────────────┐
│                Claude AI                     │
│              (MCP Client)                    │
└──────────────────┬──────────────────────────┘
                   │ MCP Protocol
┌──────────────────▼──────────────────────────┐
│            MCP Server                        │
│         (mcp-server.js)                      │
└──────────────────┬──────────────────────────┘
                   │ IPC
┌──────────────────▼──────────────────────────┐
│         Electron Main Process                │
│           (electron.js)                      │
│  ┌──────────────────────────────────────┐   │
│  │     OpenSea MCP Bridge               │   │
│  │   (opensea-bridge.js)                │   │
│  └──────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   │ IPC Bridge
┌──────────────────▼──────────────────────────┐
│       Electron Renderer Process              │
│            (React App)                       │
│  ┌──────────────────────────────────────┐   │
│  │    Embedded Wallet (ethers.js)       │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │    OpenSea Client                    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │    x402 Client                       │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## Features

### Wallet Operations
- **Sign Message**: Sign arbitrary messages with the embedded wallet
- **Sign Transaction**: Sign and broadcast transactions
- **Wallet Management**: Create and manage Ethereum wallets

### OpenSea MCP Tools
- **Search Collections**: Find NFT collections by name or category
- **Get Floor Price**: Real-time floor price data
- **Get Wallet NFTs**: List all NFTs owned by an address
- **Token Swap Quotes**: Get DeFi swap quotes
- **Trending Collections**: Discover trending NFT collections

### x402 Protocol
- **Service Discovery**: Find available AI agent services
- **Payment Channels**: Create micropayment channels for service access
- **Service Registration**: Register new AI services

## Installation

1. Install dependencies:
```bash
cd hive-mind/src/mcp
npm install
```

2. Build the renderer app:
```bash
npm run build
```

3. Set environment variables:
```bash
export OPENSEA_ACCESS_TOKEN=your_opensea_token
export OPENSEA_MCP_URL=https://mcp.opensea.io/sse
export REACT_APP_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
export REACT_APP_NETWORK=ethereum
```

## Usage

### As MCP Server for Claude

1. Start the MCP server:
```bash
npm run mcp
```

2. Add to Claude Desktop config (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "hive-mind-wallet": {
      "command": "npm",
      "args": [
        "--silent",
        "-C",
        "/path/to/hive-mind/src/mcp",
        "run",
        "mcp"
      ],
      "env": {
        "OPENSEA_ACCESS_TOKEN": "your_token",
        "OPENSEA_MCP_URL": "https://mcp.opensea.io/sse"
      }
    }
  }
}
```

3. Restart Claude Desktop

### Development Mode

Run the Electron app in development mode:
```bash
npm run dev
```

## Available MCP Tools

### Wallet Tools
- `sign_message` - Sign a message with the embedded wallet
- `sign_transaction` - Sign an Ethereum transaction

### OpenSea Tools
- `search_nft_collections` - Search for NFT collections
- `get_nft_floor_price` - Get collection floor price
- `get_wallet_nfts` - List NFTs owned by a wallet
- `get_token_swap_quote` - Get token swap quotes
- `get_trending_collections` - Get trending NFT collections

### x402 Tools
- `discover_services` - Discover available x402 services
- `create_payment_channel` - Create a payment channel for service access

## Example Claude Prompts

Once connected, you can use these prompts with Claude:

1. "Search for Bored Ape NFT collections and get the floor price"
2. "Show me trending NFT collections on Ethereum"
3. "Get all NFTs owned by wallet 0x123..."
4. "Create a payment channel for the AI art generation service"
5. "Sign this message: 'Hello from HiveMind'"
6. "Get a swap quote for 1 ETH to USDC"

## Security

- Private keys are stored securely in the Electron renderer process
- IPC communication is isolated and validated
- No direct access to wallet from external processes
- All OpenSea API calls require authentication token

## Architecture Benefits

1. **Security**: Wallet isolated in sandboxed browser environment
2. **Integration**: Direct access to OpenSea MCP and x402 protocol
3. **Flexibility**: Easy to add new MCP tools
4. **Performance**: Efficient IPC communication
5. **User Control**: Visual interface for monitoring operations

## Troubleshooting

### MCP Server not starting
- Check that all dependencies are installed
- Verify environment variables are set
- Check logs in `logs/mcp-server.log`

### OpenSea API errors
- Verify your access token is valid
- Check rate limits
- Ensure proper network connectivity

### Wallet issues
- Clear application data and recreate wallet
- Check network RPC URL is correct
- Verify sufficient balance for transactions

## Contributing

To add new MCP tools:

1. Add IPC handler in `preload.js`
2. Implement tool in `electron.js` operations
3. Register with MCP server in `electron.js`
4. Add UI handler in `renderer/App.jsx`

## License

MIT