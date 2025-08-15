# 🚀 Hive Mind - Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Hive Mind autonomous agent swarm to production networks.

## 🔧 Prerequisites

1. **Node.js 18+** and npm installed
2. **Funded wallets** on target networks
3. **API Keys** for:
   - Coinbase Developer Platform (CDP)
   - x402 Protocol (optional)
   - RPC providers (Alchemy/Infura recommended)

## 📋 Deployment Steps

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
- `DEPLOYER_PRIVATE_KEY` - Wallet with funds for deployment
- `CDP_API_KEY_NAME` - Your CDP API key name
- `CDP_API_KEY_PRIVATE` - Your CDP API private key

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy to Base Sepolia

```bash
# Fund your deployer wallet first!
# Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia

# Run deployment script
node scripts/deploy-base-sepolia.js
```

The script will:
- Deploy HiveMindCoordinator contract
- Deploy MockUSDC for testing
- Mint 10,000 test USDC
- Save deployment addresses

### 4. Verify Contracts (Optional)

```bash
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS
```

### 5. Start Services

```bash
# Start backend server
npm run server

# In another terminal, start WebSocket server
npm run websocket

# In another terminal, start frontend
npm run dev
```

## 🧪 Testing Integration

### Run Integration Tests

```bash
node scripts/test-real-integration.js
```

This will test:
- ✅ FTSO V2 price fetching from Flare
- ✅ x402 payment gateway
- ✅ CDP AgentKit wallet creation
- ✅ WebSocket real-time updates

### Manual Testing

1. **Test FTSO Prices**:
```bash
curl -X POST http://localhost:3001/api/flare/prices \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["BTC/USD", "ETH/USD"]}'
```

2. **Test Agent Registration**:
```bash
curl -X POST http://localhost:3001/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "TestAgent", "capabilities": ["trading"]}'
```

3. **Test WebSocket Connection**:
```javascript
const ws = new WebSocket('ws://localhost:3002');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['prices', 'swarm']
  }));
});
```

## 🌐 Network Configurations

### Base Sepolia
- RPC: `https://sepolia.base.org`
- Chain ID: `84532`
- Explorer: `https://sepolia.basescan.org`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Flare Coston2
- RPC: `https://coston2-api.flare.network/ext/C/rpc`
- Chain ID: `114`
- FTSO V2: `0x3d893C53D9e8056135C26C8c638B76C8b60Df726`

### Arbitrum Sepolia
- RPC: `https://sepolia-rollup.arbitrum.io/rpc`
- Chain ID: `421614`
- LayerZero: `0x6EDCE65403992e310A62460808c4b910D972f10f`

## 📊 Production Monitoring

### Health Check Endpoints

- `GET /health` - System health
- `GET /api/swarm/stats` - Swarm statistics
- `GET /metrics` - Prometheus metrics

### Recommended Monitoring Stack

1. **Prometheus** for metrics collection
2. **Grafana** for visualization
3. **AlertManager** for alerts
4. **Loki** for log aggregation

## 🔒 Security Checklist

- [ ] Never commit private keys
- [ ] Use hardware wallets for mainnet
- [ ] Enable rate limiting on APIs
- [ ] Implement proper CORS policies
- [ ] Use HTTPS in production
- [ ] Regular security audits
- [ ] Monitor for unusual activity
- [ ] Backup agent seeds securely

## 🚨 Troubleshooting

### Common Issues

1. **"Insufficient balance" error**
   - Fund your wallet with testnet ETH
   - Check the correct network is configured

2. **"FTSO price fetch failed"**
   - Verify Flare RPC is accessible
   - Check feed IDs are correct

3. **"CDP API error"**
   - Verify API credentials are correct
   - Check API rate limits

4. **"x402 payment failed"**
   - Ensure wallet has USDC balance
   - Verify facilitator URL is correct

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run server
```

## 📝 Production Checklist

Before going to mainnet:

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Backup procedures in place
- [ ] Incident response plan
- [ ] Documentation updated
- [ ] Team trained on operations

## 🆘 Support

- GitHub Issues: [Report bugs](https://github.com/your-repo/issues)
- Discord: [Join community](https://discord.gg/your-discord)
- Email: support@hivemind.ai

## 📚 Additional Resources

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Smart Contract Docs](./CONTRACTS.md)
- [Agent Development Guide](./AGENTS.md)

---

**Last Updated**: January 2025
**Version**: 1.0.0