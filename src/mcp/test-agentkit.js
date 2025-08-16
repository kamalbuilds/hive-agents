#!/usr/bin/env node

/**
 * Test script for AgentKit MCP server
 */

import { spawn } from 'child_process'
import * as dotenv from 'dotenv'

dotenv.config()

async function testAgentKitMCP() {
  console.log('Testing AgentKit MCP server...\n')
  
  // Start the MCP server
  const server = spawn('npx', ['tsx', 'mcp-agentkit.ts'], {
    env: {
      ...process.env,
      CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME,
      CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
      CDP_WALLET_SECRET: process.env.CDP_WALLET_SECRET,
      NETWORK_ID: process.env.NETWORK_ID || 'base-mainnet'
    }
  })
  
  // Capture stderr (debug output)
  server.stderr.on('data', (data) => {
    console.log('[Server]:', data.toString())
  })
  
  // Send a test MCP request
  setTimeout(() => {
    console.log('\nSending test request to list tools...')
    
    const request = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1
    }
    
    server.stdin.write(JSON.stringify(request) + '\n')
  }, 2000)
  
  // Capture stdout (MCP responses)
  server.stdout.on('data', (data) => {
    console.log('\nMCP Response:', data.toString())
    
    // Parse and display tools
    try {
      const response = JSON.parse(data.toString())
      if (response.result && response.result.tools) {
        console.log(`\nFound ${response.result.tools.length} tools:`)
        response.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}`)
        })
      }
    } catch (e) {
      // Might be partial data
    }
  })
  
  // Exit after 5 seconds
  setTimeout(() => {
    console.log('\nTest complete. Shutting down server...')
    server.kill()
    process.exit(0)
  }, 5000)
}

testAgentKitMCP().catch(console.error)