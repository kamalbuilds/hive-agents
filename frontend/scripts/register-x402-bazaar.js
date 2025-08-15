#!/usr/bin/env node

/**
 * Register Hive Mind services with x402 Bazaar
 * According to Lincoln from Coinbase, hitting an endpoint once will register it
 */

import axios from 'axios'

const SERVICE_URL = process.env.X402_SERVICE_URL || 'http://localhost:3402'

async function registerWithBazaar() {
  console.log('🚀 Registering Hive Mind services with x402 Bazaar...\n')
  
  const endpoints = [
    { path: '/api/agents/oracle', method: 'GET', name: 'Oracle Service' },
    { path: '/api/agents/trader', method: 'POST', name: 'Trading Bot' },
    { path: '/api/agents/analyzer', method: 'POST', name: 'Data Analyzer' },
    { path: '/api/agents/coordinator', method: 'POST', name: 'Swarm Coordinator' }
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📝 Registering ${endpoint.name} (${endpoint.method} ${endpoint.path})...`)
      
      const config = {
        method: endpoint.method,
        url: `${SERVICE_URL}${endpoint.path}`,
        data: endpoint.method === 'POST' ? { 
          action: 'analyze',
          task: 'test',
          type: 'sentiment',
          data: {} 
        } : undefined,
        params: endpoint.method === 'GET' ? {
          symbols: 'BTC,ETH'
        } : undefined,
        // Don't validate status - we expect 402
        validateStatus: () => true
      }
      
      const response = await axios(config)
      
      if (response.status === 402) {
        console.log(`✅ ${endpoint.name} registered (402 response received)`)
        console.log(`   Price: ${response.data.accepts[0].maxAmountRequired / 1000} USDC`)
        console.log(`   Network: ${response.data.accepts[0].network}`)
        console.log(`   Description: ${response.data.accepts[0].description}`)
      } else {
        console.log(`⚠️  ${endpoint.name} returned status ${response.status}`)
      }
      
    } catch (error) {
      console.error(`❌ Failed to register ${endpoint.name}:`, error.message)
    }
    
    console.log('')
  }
  
  console.log('✨ Registration complete!\n')
  console.log('Your services should now appear in the x402 Bazaar at:')
  console.log('👉 https://bazaar.x402.org\n')
  console.log('Note: It may take a few minutes for services to appear in the Bazaar.')
}

// Run registration
registerWithBazaar().catch(console.error)