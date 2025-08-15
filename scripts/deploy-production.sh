#!/bin/bash

# HIVE MIND Production Deployment Script
# Deploys all components to Base Sepolia testnet

set -e

echo "🚀 HIVE MIND Production Deployment"
echo "=================================="
echo ""

# Check environment variables
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ Error: DEPLOYER_PRIVATE_KEY not set in .env"
    echo "Please add your private key to deploy contracts"
    exit 1
fi

# Deploy smart contracts
echo "📝 Deploying smart contracts to Base Sepolia..."
node scripts/deploy-base-sepolia.js

echo ""
echo "✅ Contracts deployed successfully!"
echo ""

# Start backend services
echo "🔧 Starting backend services..."

# Start main server
echo "Starting API server..."
npm run server &
SERVER_PID=$!
echo "API server PID: $SERVER_PID"

# Start WebSocket server
echo "Starting WebSocket server..."
npm run websocket &
WS_PID=$!
echo "WebSocket server PID: $WS_PID"

# Wait for services to initialize
sleep 5

# Test endpoints
echo ""
echo "🧪 Testing production endpoints..."
echo ""

# Test swarm stats
echo "Testing /api/swarm/stats..."
curl -s http://localhost:3001/api/swarm/stats | jq '.'

echo ""
echo "Testing WebSocket connection..."
wscat -c ws://localhost:3003 -x '{"type":"ping"}' &
WSCAT_PID=$!
sleep 2
kill $WSCAT_PID 2>/dev/null || true

echo ""
echo "✨ Production deployment complete!"
echo ""
echo "📊 Deployment Summary:"
echo "====================="
echo "Network: Base Sepolia"
echo "API Server: http://localhost:3001"
echo "WebSocket: ws://localhost:3003"
echo "Frontend: http://localhost:3000 (run 'npm run dev' to start)"
echo ""
echo "Contract Addresses:"
cat deployments/base-sepolia.json | jq '.'
echo ""
echo "📝 Next Steps:"
echo "1. Fund the deployer wallet with Base Sepolia ETH"
echo "2. Register agents using the API"
echo "3. Create tasks and start the swarm"
echo "4. Monitor via WebSocket for real-time updates"
echo ""
echo "To stop services:"
echo "kill $SERVER_PID $WS_PID"
echo ""
echo "🎉 Hive Mind is ready for production!"