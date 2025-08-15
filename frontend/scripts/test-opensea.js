#!/usr/bin/env node

import axios from 'axios'

const API_URL = 'http://localhost:3000/api/agents/opensea'

async function testOpenSeaIntegration() {
  console.log('🧪 Testing OpenSea MCP Integration...\n')

  try {
    // Test 1: Get capabilities
    console.log('1️⃣ Testing GET /api/agents/opensea (capabilities)...')
    const capabilitiesRes = await axios.get(API_URL)
    console.log('✅ Capabilities:', capabilitiesRes.data.capabilities.slice(0, 5), '...')
    console.log(`   Total capabilities: ${capabilitiesRes.data.capabilities.length}`)

    // Test 2: Search collections
    console.log('\n2️⃣ Testing searchCollections...')
    const searchRes = await axios.post(API_URL, {
      action: 'searchCollections',
      params: {
        query: 'azuki',
        chain: 'ethereum'
      },
      agentId: 'test-agent-001'
    })
    console.log('✅ Search results:', searchRes.data.success ? 'Success' : 'Failed')
    if (searchRes.data.result?.length > 0) {
      console.log(`   Found ${searchRes.data.result.length} collections`)
    }

    // Test 3: Get trending collections
    console.log('\n3️⃣ Testing getTrending...')
    const trendingRes = await axios.post(API_URL, {
      action: 'getTrending',
      params: {
        timeframe: 'ONE_DAY',
        chain: 'ethereum'
      },
      agentId: 'test-agent-001'
    })
    console.log('✅ Trending collections:', trendingRes.data.success ? 'Success' : 'Failed')
    if (trendingRes.data.result?.length > 0) {
      console.log(`   Found ${trendingRes.data.result.length} trending collections`)
      const topCollection = trendingRes.data.result[0]
      console.log(`   Top collection: ${topCollection.name} (Floor: ${topCollection.floorPrice} ETH)`)
    }

    // Test 4: Get trending tokens
    console.log('\n4️⃣ Testing getTrendingTokens...')
    const tokensRes = await axios.post(API_URL, {
      action: 'getTrendingTokens',
      params: {
        chain: 'ethereum'
      },
      agentId: 'test-agent-001'
    })
    console.log('✅ Trending tokens:', tokensRes.data.success ? 'Success' : 'Failed')
    if (tokensRes.data.result?.length > 0) {
      console.log(`   Found ${tokensRes.data.result.length} trending tokens`)
    }

    // Test 5: Market analysis
    console.log('\n5️⃣ Testing marketAnalysis...')
    const analysisRes = await axios.post(API_URL, {
      action: 'marketAnalysis',
      params: {},
      agentId: 'test-agent-001'
    })
    console.log('✅ Market analysis:', analysisRes.data.success ? 'Success' : 'Failed')
    if (analysisRes.data.result?.analysis) {
      console.log(`   Market sentiment: ${analysisRes.data.result.analysis.marketSentiment}`)
      console.log(`   Volume trend: ${analysisRes.data.result.analysis.volumeTrend}`)
    }

    console.log('\n✨ All OpenSea MCP tests completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    if (error.response) {
      console.error('   Response:', error.response.data)
    }
    process.exit(1)
  }
}

// Run tests
testOpenSeaIntegration()