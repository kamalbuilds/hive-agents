#!/usr/bin/env node

/**
 * Test script for OpenSea MCP connection
 * This tests the MCP server directly, not through integration
 */

import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const OPENSEA_ACCESS_TOKEN = process.env.OPENSEA_ACCESS_TOKEN || 'aw0Zy876VFBWAyb7l6ayPwoWr2EU7tnGQOovsz4egU'

async function testOpenSeaMCP() {
  console.log('Testing OpenSea MCP connection...\n')
  
  const client = axios.create({
    baseURL: 'https://mcp.opensea.io',
    headers: {
      'Authorization': `Bearer ${OPENSEA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    timeout: 30000
  })

  // Test 1: Try the MCP endpoint
  console.log('Test 1: Testing MCP endpoint...')
  try {
    const response = await client.post('/mcp', {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'get_trending_collections',
        arguments: {
          timeframe: 'ONE_DAY'
        }
      },
      id: 1
    })
    console.log('✅ MCP endpoint works!')
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ MCP endpoint failed:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Data:', error.response.data)
    }
  }

  console.log('\n---\n')

  // Test 2: Try with inline token
  console.log('Test 2: Testing with inline token...')
  try {
    const response = await axios.post(
      `https://mcp.opensea.io/${OPENSEA_ACCESS_TOKEN}/mcp`,
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_trending_collections',
          arguments: {
            timeframe: 'ONE_DAY'
          }
        },
        id: 2
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )
    console.log('✅ Inline token works!')
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Inline token failed:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Data:', error.response.data)
    }
  }

  console.log('\n---\n')

  // Test 3: List available tools
  console.log('Test 3: Listing available tools...')
  try {
    const response = await client.post('/mcp', {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 3
    })
    console.log('✅ Tools list retrieved!')
    const tools = response.data?.result?.tools || []
    console.log(`Found ${tools.length} tools:`)
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`)
    })
  } catch (error) {
    console.log('❌ Tools list failed:', error.message)
  }
}

// Run the test
testOpenSeaMCP().catch(console.error)