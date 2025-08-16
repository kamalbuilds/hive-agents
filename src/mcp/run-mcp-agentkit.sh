#!/bin/bash

# Run the MCP AgentKit server with experimental crypto support
# This helps with Ed25519 JWT generation issues in Node.js v23

cd "$(dirname "$0")"

# Use Node 20 if available (more stable with crypto APIs)
if command -v nvm &> /dev/null; then
  nvm use 20 2>/dev/null || true
fi

# Run with experimental Web Crypto API flags
exec node --experimental-global-webcrypto mcp-agentkit.ts "$@"