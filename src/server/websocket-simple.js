#!/usr/bin/env node

import pkg from 'ws';
const WebSocketServer = pkg.WebSocketServer || pkg.Server;

const PORT = process.env.WS_PORT || 3003;

console.log(`🚀 Starting HIVE MIND WebSocket Server on port ${PORT}...`);

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

// Store connected clients
const clients = new Set();

// Mock data generator
function generateMockData() {
  return {
    swarm_update: {
      type: 'swarm_update',
      metrics: {
        totalAgents: 5,
        activeAgents: 3,
        idleAgents: 2,
        tasksCompleted: Math.floor(Math.random() * 100) + 50,
        tasksInProgress: Math.floor(Math.random() * 10) + 1,
        totalEarnings: Math.random() * 1000 + 500,
        successRate: 85 + Math.random() * 15,
        avgResponseTime: Math.floor(Math.random() * 100) + 50,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        networkLatency: Math.floor(Math.random() * 50) + 10,
        gasSpent: Math.random() * 10 + 1
      },
      agents: [
        {
          id: 'queen-coordinator',
          type: 'coordinator',
          status: 'active',
          capabilities: ['task-distribution', 'consensus-voting'],
          tasks: 45,
          earnings: 123.45,
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3001'
        },
        {
          id: 'trader-001',
          type: 'trader',
          status: 'busy',
          capabilities: ['arbitrage', 'market-making'],
          tasks: 23,
          earnings: 67.89,
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3002'
        },
        {
          id: 'analyzer-001',
          type: 'analyzer',
          status: 'active',
          capabilities: ['sentiment-analysis', 'pattern-recognition'],
          tasks: 34,
          earnings: 89.12,
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3003'
        },
        {
          id: 'optimizer-001',
          type: 'optimizer',
          status: 'idle',
          capabilities: ['portfolio-optimization', 'yield-farming'],
          tasks: 12,
          earnings: 34.56,
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3004'
        },
        {
          id: 'researcher-001',
          type: 'researcher',
          status: 'idle',
          capabilities: ['data-collection', 'report-generation'],
          tasks: 8,
          earnings: 12.34,
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3005'
        }
      ]
    },
    price_update: {
      type: 'price_update',
      prices: [
        {
          pair: 'FLR/USD',
          price: 0.0245 + Math.random() * 0.002,
          change: (Math.random() - 0.5) * 10,
          volume24h: 1500000 + Math.random() * 500000,
          source: 'flare',
          lastUpdate: new Date(),
          confidence: 99.5
        },
        {
          pair: 'XRP/USD',
          price: 0.52 + Math.random() * 0.05,
          change: (Math.random() - 0.5) * 8,
          volume24h: 25000000 + Math.random() * 5000000,
          source: 'flare',
          lastUpdate: new Date(),
          confidence: 99.8
        },
        {
          pair: 'BTC/USD',
          price: 45000 + Math.random() * 2000,
          change: (Math.random() - 0.5) * 5,
          volume24h: 500000000 + Math.random() * 100000000,
          source: 'flare',
          lastUpdate: new Date(),
          confidence: 99.9
        },
        {
          pair: 'ETH/USD',
          price: 2500 + Math.random() * 100,
          change: (Math.random() - 0.5) * 6,
          volume24h: 200000000 + Math.random() * 50000000,
          source: 'flare',
          lastUpdate: new Date(),
          confidence: 99.7
        }
      ]
    },
    task_update: {
      type: 'task_update',
      completed: Math.floor(Math.random() * 100) + 50,
      inProgress: Math.floor(Math.random() * 10) + 1,
      pending: Math.floor(Math.random() * 20) + 5
    }
  };
}

// Handle new connections
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`✅ New client connected from ${clientIp}`);
  
  clients.add(ws);
  
  // Send initial data
  const initialData = generateMockData();
  ws.send(JSON.stringify(initialData.swarm_update));
  ws.send(JSON.stringify(initialData.price_update));
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received:', data);
      
      if (data.type === 'subscribe') {
        console.log(`Client subscribed to channels:`, data.channels);
        // Send acknowledgment
        ws.send(JSON.stringify({ 
          type: 'subscription_confirmed', 
          channels: data.channels 
        }));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('❌ Client disconnected');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast updates to all connected clients
function broadcastUpdate(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Send periodic updates
setInterval(() => {
  const mockData = generateMockData();
  
  // Broadcast swarm updates
  broadcastUpdate(mockData.swarm_update);
  
  // Broadcast price updates
  broadcastUpdate(mockData.price_update);
  
  // Broadcast task updates
  broadcastUpdate(mockData.task_update);
  
  console.log(`📡 Broadcasted updates to ${clients.size} clients`);
}, 5000); // Every 5 seconds

// Send occasional cross-chain transaction updates
setInterval(() => {
  const crossChainTx = {
    type: 'crosschain_tx',
    transaction: {
      id: `tx-${Date.now()}`,
      sourceChain: ['base', 'ethereum', 'arbitrum'][Math.floor(Math.random() * 3)],
      destChain: ['flare', 'polygon', 'optimism'][Math.floor(Math.random() * 3)],
      amount: Math.floor(Math.random() * 1000) + 100,
      token: 'USDC',
      status: ['pending', 'confirmed'][Math.floor(Math.random() * 2)],
      timestamp: new Date(),
      txHash: '0x' + Math.random().toString(36).substring(2, 15),
      layerZeroMessageId: '0x' + Math.random().toString(36).substring(2, 15)
    }
  };
  
  broadcastUpdate(crossChainTx);
  console.log(`🌉 Broadcasted cross-chain transaction`);
}, 15000); // Every 15 seconds

// Log connection to Base Sepolia
console.log('\n📊 Connected to Base Sepolia:');
console.log('   HiveMindCoordinator: 0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129');
console.log('   MockUSDC: 0x6B5f6d625aa0fBA745759Ad0495017735cB72af7');
console.log('   Explorer: https://sepolia.basescan.org/address/0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129');

console.log(`\n✨ WebSocket server running on ws://localhost:${PORT}`);
console.log('   Waiting for connections...\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('👋 WebSocket server closed');
    process.exit(0);
  });
});