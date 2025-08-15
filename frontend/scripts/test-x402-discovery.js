#!/usr/bin/env node

/**
 * Test x402 discovery functionality
 * Based on the discovery example from Coinbase x402 repo
 */

import { config } from 'dotenv'
import { useFacilitator } from 'x402/verify'

// Load environment variables
config()

// Use the official testnet facilitator
const facilitatorConfig = { url: 'https://x402.org/facilitator' }

async function discoverServices() {
  console.log('🔍 Discovering x402 services from the Bazaar...\n')
  
  try {
    const { list } = useFacilitator(facilitatorConfig)
    
    const response = await list()
    
    if (!response || !response.items) {
      console.log('No services found in the Bazaar yet.')
      console.log('Your services may still be processing. Try again in a few minutes.')
      return
    }
    
    console.log(`Found ${response.items.length} x402 Resources:`)
    console.log('========================\n')
    
    response.items.forEach((item, index) => {
      console.log(`Resource ${index + 1}:`)
      console.log(`  Resource URL: ${item.resource}`)
      console.log(`  Type: ${item.type || 'unknown'}`)
      console.log(`  Last Updated: ${new Date(item.lastUpdated).toLocaleString()}`)
      console.log(`  X402 Version: ${item.x402Version}`)
      console.log(`  Network: ${item.accepts?.[0]?.network || 'unknown'}`)
      console.log(`  Price: $${(item.accepts?.[0]?.maxAmountRequired / 1000).toFixed(3) || 'unknown'}`)
      
      if (item.accepts?.[0]?.description) {
        console.log(`  Description: ${item.accepts[0].description}`)
      }
      
      if (item.metadata && Object.keys(item.metadata).length > 0) {
        console.log(`  Metadata: ${JSON.stringify(item.metadata, null, 2)}`)
      }
      console.log('------------------------\n')
    })
    
    // Check if our services are listed
    const hiveMindServices = response.items.filter(item => 
      item.resource?.includes('localhost:3402') ||
      item.accepts?.[0]?.description?.includes('Hive Mind') ||
      item.accepts?.[0]?.description?.includes('FTSO')
    )
    
    if (hiveMindServices.length > 0) {
      console.log(`✅ Found ${hiveMindServices.length} Hive Mind services in the Bazaar!`)
    } else {
      console.log('⚠️  Hive Mind services not found yet. They may still be processing.')
    }
    
  } catch (error) {
    console.error('Error discovering services:', error.message)
    console.log('\nMake sure your x402 service is running and registered.')
  }
}

// Run discovery
discoverServices().catch(console.error)