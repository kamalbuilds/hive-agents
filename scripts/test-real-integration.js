// Real Integration Test Script
import FlareIntegration from '../src/defi/flare-integration.js';
import X402PaymentGateway from '../src/agents/x402-gateway.js';
import CDPAgentKit from '../src/agents/cdp-agentkit.js';
import { HiveMindWebSocketServer } from '../src/server/websocket.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function testFlareIntegration() {
  console.log('\n🔥 Testing Flare FTSO V2 Integration...\n');
  
  const flare = new FlareIntegration({ network: 'coston2' });
  
  try {
    // Test single price fetch
    console.log('📊 Fetching single price...');
    const btcPrice = await flare.getCurrentPrice('BTC/USD');
    console.log('BTC/USD:', btcPrice);
    
    // Test batch price fetch
    console.log('\n📊 Fetching multiple prices...');
    const prices = await flare.getMultiplePrices(['FLR/USD', 'ETH/USD', 'XRP/USD']);
    console.log('Batch prices:', prices);
    
    // Test price subscription
    console.log('\n📊 Setting up price subscription...');
    const unsubscribe = flare.subscribeToPriceUpdates(
      ['BTC/USD', 'ETH/USD'],
      (updatedPrices) => {
        console.log('Price update received:', updatedPrices);
      },
      10000 // Update every 10 seconds
    );
    
    // Wait for one update
    await new Promise(resolve => setTimeout(resolve, 12000));
    unsubscribe();
    
    console.log('\n✅ Flare integration test completed!');
    
  } catch (error) {
    console.error('❌ Flare test failed:', error);
  }
}

async function testX402Integration() {
  console.log('\n💳 Testing x402 Payment Gateway...\n');
  
  // Create test wallet for agent
  const wallet = ethers.Wallet.createRandom();
  console.log('🔑 Generated test wallet:', wallet.address);
  
  const gateway = new X402PaymentGateway({
    network: 'sepolia',
    privateKey: wallet.privateKey,
    walletAddress: wallet.address
  });
  
  try {
    // Register test service
    console.log('📝 Registering service...');
    const service = await gateway.registerService('test-oracle', {
      name: 'Test Oracle Service',
      description: 'Provides test price data',
      pricePerCall: 0.001,
      endpoint: 'http://localhost:3000/api/oracle',
      capabilities: ['price-feed', 'prediction']
    });
    console.log('Service registered:', service);
    
    // Discover services
    console.log('\n🔍 Discovering services...');
    const services = await gateway.discoverServices({ capability: 'price-feed' });
    console.log(`Found ${services.length} services`);
    
    // Test payment verification
    console.log('\n💰 Testing payment verification...');
    const testToken = await gateway.generatePaymentToken(0.001);
    console.log('Generated payment token:', testToken);
    
    console.log('\n✅ x402 integration test completed!');
    
  } catch (error) {
    console.error('❌ x402 test failed:', error);
  }
}

async function testCDPAgentKit() {
  console.log('\n🤖 Testing CDP AgentKit...\n');
  
  // Skip if no CDP credentials
  if (!process.env.CDP_API_KEY_NAME) {
    console.log('⚠️  CDP API credentials not configured, skipping test');
    return;
  }
  
  const cdp = new CDPAgentKit({
    network: 'base-sepolia'
  });
  
  try {
    // Create test agent
    console.log('🤖 Creating autonomous agent...');
    const agent = await cdp.createAgent({
      name: 'TestAgent',
      description: 'Test autonomous agent',
      capabilities: ['trade', 'transfer']
    });
    console.log('Agent created:', {
      id: agent.id,
      address: agent.address,
      capabilities: agent.capabilities
    });
    
    // Fund agent (testnet only)
    console.log('\n💰 Funding agent from faucet...');
    await cdp.fundAgent(agent.id, 0.01, 'ETH');
    
    // Check balance
    console.log('\n💼 Checking agent balance...');
    const balance = await cdp.getAgentBalance(agent.id);
    console.log('Agent balance:', balance);
    
    // Export seed for backup
    console.log('\n🔐 Exporting agent seed...');
    const backup = cdp.exportAgentSeed(agent.id);
    console.log('Agent backup created (seed hidden for security)');
    
    console.log('\n✅ CDP AgentKit test completed!');
    
  } catch (error) {
    console.error('❌ CDP test failed:', error);
  }
}

async function testWebSocketServer() {
  console.log('\n🌐 Testing WebSocket Server...\n');
  
  const wsServer = new HiveMindWebSocketServer(3002);
  
  try {
    // Start server
    wsServer.start();
    console.log('WebSocket server started on port 3002');
    
    // Integrate with real Flare prices
    const flare = new FlareIntegration({ network: 'coston2' });
    
    // Override mock price updates with real data
    setInterval(async () => {
      try {
        const prices = await flare.getMultiplePrices(['FLR/USD', 'BTC/USD', 'ETH/USD']);
        
        const priceData = Object.values(prices).map(p => ({
          pair: p.symbol,
          price: p.price,
          change: (Math.random() - 0.5) * 10,
          volume24h: Math.floor(Math.random() * 10000000),
          source: 'flare-ftso-v2',
          lastUpdate: new Date(p.timestamp),
          confidence: 99.9,
          verified: !p.mock
        }));
        
        wsServer.broadcast('prices', {
          type: 'price_update',
          prices: priceData,
          network: 'coston2'
        });
        
        console.log('📡 Broadcasted real FTSO prices');
      } catch (error) {
        console.error('Failed to broadcast prices:', error);
      }
    }, 15000); // Every 15 seconds
    
    // Let it run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    wsServer.stop();
    console.log('\n✅ WebSocket server test completed!');
    
  } catch (error) {
    console.error('❌ WebSocket test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Real Integration Tests...');
  console.log('=====================================\n');
  
  // Test each component
  await testFlareIntegration();
  await testX402Integration();
  await testCDPAgentKit();
  await testWebSocketServer();
  
  console.log('\n=====================================');
  console.log('🎉 All integration tests completed!');
  console.log('\nNext steps:');
  console.log('1. Configure environment variables in .env');
  console.log('2. Fund test wallets on Base Sepolia');
  console.log('3. Deploy contracts to testnet');
  console.log('4. Run production deployment script');
}

// Run tests
runAllTests().catch(console.error);