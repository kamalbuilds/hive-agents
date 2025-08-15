#!/usr/bin/env node
import { ethers } from 'ethers';
import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  RPC_URL: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  WS_URL: process.env.WS_URL || 'ws://localhost:3002',
  API_URL: process.env.API_URL || 'http://localhost:3001',
  COORDINATOR_ADDRESS: '0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129',
  USDC_ADDRESS: '0x6B5f6d625aa0fBA745759Ad0495017735cB72af7',
  PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY || '',
};

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load contract ABIs
async function loadContractABI(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', contractName);
  const artifact = JSON.parse(await fs.readFile(path.join(artifactPath, `${contractName.split('.sol')[0]}.json`), 'utf8'));
  return artifact.abi;
}

// Color coded console output
const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  info: (msg) => console.log(`📌 ${msg}`),
  test: (msg) => console.log(`🧪 ${msg}`),
  result: (msg) => console.log(`📊 ${msg}`),
};

// Test Suite
class IntegrationTestSuite {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.coordinator = null;
    this.usdc = null;
    this.ws = null;
    this.testResults = [];
  }

  async initialize() {
    log.info('Initializing test suite...');
    
    // Setup provider and signer
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    
    if (CONFIG.PRIVATE_KEY) {
      this.signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
    } else {
      // Use a default test account if no private key provided
      this.signer = ethers.Wallet.createRandom().connect(this.provider);
      log.info(`Created test wallet: ${this.signer.address}`);
    }
    
    // Load contract instances
    const coordinatorABI = await loadContractABI('HiveMindCoordinator.sol');
    const usdcABI = await loadContractABI('MockUSDC.sol');
    
    this.coordinator = new ethers.Contract(CONFIG.COORDINATOR_ADDRESS, coordinatorABI, this.signer);
    this.usdc = new ethers.Contract(CONFIG.USDC_ADDRESS, usdcABI, this.signer);
    
    log.success('Test suite initialized');
  }

  // Test 1: Smart Contract Interactions
  async testSmartContracts() {
    log.test('Testing Smart Contract Interactions...');
    
    try {
      // Check platform fee
      const platformFee = await this.coordinator.platformFee();
      log.result(`Platform Fee: ${platformFee}%`);
      
      // Check agent count
      const agentCount = await this.coordinator.agentIdCounter();
      log.result(`Registered Agents: ${agentCount}`);
      
      // Check task count
      const taskCount = await this.coordinator.taskIdCounter();
      log.result(`Created Tasks: ${taskCount}`);
      
      // Get USDC balance
      const balance = await this.usdc.balanceOf(this.signer.address);
      log.result(`USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
      
      this.testResults.push({ name: 'Smart Contracts', status: 'PASSED' });
      log.success('Smart Contract tests passed');
    } catch (error) {
      this.testResults.push({ name: 'Smart Contracts', status: 'FAILED', error: error.message });
      log.error(`Smart Contract tests failed: ${error.message}`);
    }
  }

  // Test 2: API Endpoints
  async testAPIEndpoints() {
    log.test('Testing API Endpoints...');
    
    const endpoints = [
      { method: 'GET', path: '/api/swarm/stats', name: 'Swarm Stats' },
      { method: 'GET', path: '/api/swarm/status', name: 'Swarm Status' },
      { method: 'POST', path: '/api/agents/register', name: 'Agent Registration', 
        data: { name: 'TestAgent', specialization: 'testing', wallet: this.signer.address }
      },
      { method: 'POST', path: '/api/tasks/create', name: 'Task Creation',
        data: { description: 'Test Task', bounty: '100', deadline: Date.now() + 86400000 }
      },
      { method: 'POST', path: '/api/flare/prices', name: 'Flare Prices',
        data: { symbols: ['BTC/USD', 'ETH/USD'] }
      },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: `${CONFIG.API_URL}${endpoint.path}`,
          data: endpoint.data,
          timeout: 5000,
        });
        
        log.success(`${endpoint.name}: ${response.status} OK`);
        this.testResults.push({ name: endpoint.name, status: 'PASSED' });
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message;
        log.error(`${endpoint.name}: ${errorMsg}`);
        this.testResults.push({ name: endpoint.name, status: 'FAILED', error: errorMsg });
      }
    }
  }

  // Test 3: WebSocket Connection
  async testWebSocket() {
    log.test('Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
      this.ws = new WebSocket(CONFIG.WS_URL);
      
      const timeout = setTimeout(() => {
        this.testResults.push({ name: 'WebSocket', status: 'FAILED', error: 'Connection timeout' });
        log.error('WebSocket connection timeout');
        resolve();
      }, 10000);
      
      this.ws.on('open', () => {
        clearTimeout(timeout);
        log.success('WebSocket connected');
        
        // Send test message
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        log.result(`WebSocket message: ${JSON.stringify(message)}`);
        
        this.testResults.push({ name: 'WebSocket', status: 'PASSED' });
        this.ws.close();
        resolve();
      });
      
      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        this.testResults.push({ name: 'WebSocket', status: 'FAILED', error: error.message });
        log.error(`WebSocket error: ${error.message}`);
        resolve();
      });
    });
  }

  // Test 4: FTSO Price Fetching
  async testFTSOPrices() {
    log.test('Testing FTSO Price Fetching...');
    
    try {
      const response = await axios.post(`${CONFIG.API_URL}/api/flare/prices`, {
        symbols: ['BTC/USD', 'ETH/USD', 'FLR/USD']
      });
      
      if (response.data.prices && response.data.prices.length > 0) {
        response.data.prices.forEach(price => {
          log.result(`${price.symbol}: $${price.value} (${price.timestamp})`);
        });
        this.testResults.push({ name: 'FTSO Prices', status: 'PASSED' });
      } else {
        throw new Error('No prices returned');
      }
    } catch (error) {
      this.testResults.push({ name: 'FTSO Prices', status: 'FAILED', error: error.message });
      log.error(`FTSO price fetch failed: ${error.message}`);
    }
  }

  // Test 5: x402 Protocol Integration
  async testX402Protocol() {
    log.test('Testing x402 Protocol Integration...');
    
    try {
      // Test service registration
      const response = await axios.post(`${CONFIG.API_URL}/api/x402/register`, {
        serviceId: 'test-service',
        pricePerCall: '0.01',
        description: 'Test service for integration testing'
      });
      
      if (response.data.success) {
        log.result(`Service registered: ${response.data.serviceId}`);
        this.testResults.push({ name: 'x402 Protocol', status: 'PASSED' });
      } else {
        throw new Error('Service registration failed');
      }
    } catch (error) {
      this.testResults.push({ name: 'x402 Protocol', status: 'FAILED', error: error.message });
      log.error(`x402 test failed: ${error.message}`);
    }
  }

  // Test 6: LayerZero Bridge
  async testLayerZeroBridge() {
    log.test('Testing LayerZero Bridge...');
    
    try {
      const response = await axios.post(`${CONFIG.API_URL}/api/layerzero/bridge`, {
        fromChain: 'base-sepolia',
        toChain: 'arbitrum-sepolia',
        amount: '100',
        token: 'USDC',
        recipient: this.signer.address
      });
      
      if (response.data.messageId) {
        log.result(`Bridge initiated: ${response.data.messageId}`);
        log.result(`Estimated gas: ${response.data.estimatedGas}`);
        this.testResults.push({ name: 'LayerZero Bridge', status: 'PASSED' });
      } else {
        throw new Error('Bridge initiation failed');
      }
    } catch (error) {
      this.testResults.push({ name: 'LayerZero Bridge', status: 'FAILED', error: error.message });
      log.error(`LayerZero test failed: ${error.message}`);
    }
  }

  // Generate test report
  generateReport() {
    log.info('\n=== TEST REPORT ===\n');
    
    let passed = 0;
    let failed = 0;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.status === 'PASSED') passed++;
      else failed++;
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    return { passed, failed, total: this.testResults.length };
  }

  // Run all tests
  async runAllTests() {
    log.info('Starting Complete Integration Test Suite...\n');
    
    await this.initialize();
    
    // Run tests sequentially
    await this.testSmartContracts();
    await delay(1000);
    
    await this.testAPIEndpoints();
    await delay(1000);
    
    await this.testWebSocket();
    await delay(1000);
    
    await this.testFTSOPrices();
    await delay(1000);
    
    await this.testX402Protocol();
    await delay(1000);
    
    await this.testLayerZeroBridge();
    
    // Generate and return report
    return this.generateReport();
  }

  // Cleanup
  cleanup() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

// Main execution
async function main() {
  const suite = new IntegrationTestSuite();
  
  try {
    const results = await suite.runAllTests();
    
    // Exit with appropriate code
    if (results.failed > 0) {
      process.exit(1);
    } else {
      log.success('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    suite.cleanup();
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { IntegrationTestSuite };