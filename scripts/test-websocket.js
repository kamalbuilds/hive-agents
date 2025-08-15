#!/usr/bin/env node

import pkg from 'ws';
const WebSocket = pkg.WebSocket || pkg;

console.log('🧪 Testing WebSocket connection...');

const ws = new WebSocket('ws://localhost:3003');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Send subscription message
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['swarm', 'prices', 'tasks']
  }));
  
  console.log('📨 Sent subscription request');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📩 Received:', message.type);
  
  if (message.type === 'swarm_update') {
    console.log('   Agents:', message.metrics.totalAgents);
    console.log('   Tasks:', message.metrics.tasksCompleted);
  } else if (message.type === 'price_update') {
    console.log('   Prices:', message.prices.map(p => `${p.pair}: $${p.price.toFixed(4)}`).join(', '));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔚 Connection closed');
});

// Close after 10 seconds
setTimeout(() => {
  console.log('⏰ Test complete, closing connection...');
  ws.close();
  process.exit(0);
}, 10000);