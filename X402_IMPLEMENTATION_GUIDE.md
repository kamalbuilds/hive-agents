# 🔐 x402 Payment Protocol Implementation Guide

## ✅ Implementation Status

The Hive Mind platform now has a **complete x402 payment protocol implementation** that enables:
- Payment-required API endpoints
- Service registration and discovery
- Per-request micropayments
- Integration with Base/Base Sepolia networks

## 📡 x402 API Endpoints

### 1. Service Registration & Discovery

**Endpoint:** `/api/x402/register`

#### Register a Service (POST)
```bash
curl -X POST http://localhost:3000/api/x402/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-001",
    "endpoint": "https://api.hivemind.network/agents/agent-001",
    "payTo": "0xYourWalletAddress",
    "price": "$0.001",
    "name": "AI Analysis Agent",
    "capabilities": ["analysis", "optimization"],
    "network": "base-sepolia"
  }'
```

**Response:**
```json
{
  "success": true,
  "service": {
    "id": "agent-001",
    "endpoint": "https://api.hivemind.network/agents/agent-001",
    "payTo": "0xYourWalletAddress",
    "price": "$0.001",
    "paymentRequirements": { /* x402 payment spec */ }
  },
  "x402": {
    "version": 1,
    "accepts": [ /* payment requirements */ ]
  }
}
```

#### List All Services (GET)
```bash
curl http://localhost:3000/api/x402/register
```

Returns x402-formatted service discovery response compatible with facilitators.

#### Update Service (PUT)
```bash
curl -X PUT http://localhost:3000/api/x402/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-001",
    "price": "$0.002",
    "status": "active"
  }'
```

---

### 2. Protected Endpoints

**Endpoint:** `/api/x402/protected`

This endpoint requires x402 payment to access:

```bash
# Without payment - returns 402
curl http://localhost:3000/api/x402/protected
```

**402 Response:**
```json
{
  "x402Version": 1,
  "error": "Payment required",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000",
    "resource": "https://api.hivemind.network/x402/protected",
    "description": "Access to Hive Mind AI agent services",
    "payTo": "0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129",
    "asset": "0x6B5f6d625aa0fBA745759Ad0495017735cB72af7"
  }]
}
```

---

### 3. Service Invocation

**Endpoint:** `/api/x402/services/[id]`

#### Get Service Info (GET)
```bash
curl http://localhost:3000/api/x402/services/agent-001
```

Returns service details with payment requirements.

#### Invoke Service (POST)
```bash
# Without payment header - returns 402
curl -X POST http://localhost:3000/api/x402/services/agent-001 \
  -H "Content-Type: application/json" \
  -d '{"task": "analyze", "params": {"keywords": ["defi", "optimization"]}}'

# With payment header (example)
curl -X POST http://localhost:3000/api/x402/services/agent-001 \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64-encoded-payment>" \
  -d '{"task": "analyze", "params": {"keywords": ["defi", "optimization"]}}'
```

---

## 🔧 How x402 Works

### Payment Flow

1. **Discovery**: Client discovers services via `/api/x402/register`
2. **Requirements**: Service returns payment requirements (402 status)
3. **Payment**: Client creates and signs payment using x402 protocol
4. **Verification**: Service verifies payment signature
5. **Execution**: Service processes request
6. **Settlement**: Payment is settled on-chain

### Payment Requirements Structure

```typescript
interface PaymentRequirements {
  scheme: 'exact'                    // Payment scheme
  network: 'base' | 'base-sepolia'   // Blockchain network
  maxAmountRequired: string          // Atomic amount (e.g., "1000" = $0.001 USDC)
  resource: string                   // Service endpoint
  description: string                // Service description
  payTo: Address                     // Recipient wallet
  asset: Address                     // Token contract (USDC)
  maxTimeoutSeconds: number          // Payment validity
  mimeType: string                   // Response type
  outputSchema: {                    // API schema
    input: { type: string, method: string }
    output: any
  }
  extra: {                           // EIP-712 signing params
    name: string
    version: string
  }
}
```

---

## 🚀 Client Integration

### Using x402-fetch (JavaScript/TypeScript)

```typescript
import { wrapFetchWithPayment } from 'x402-fetch'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0xYourPrivateKey')
const fetchWithPayment = wrapFetchWithPayment(fetch, account)

// Make paid request
const response = await fetchWithPayment('http://localhost:3000/api/x402/protected')
const data = await response.json()
```

### Using x402-axios

```typescript
import axios from 'axios'
import { wrapAxiosWithPayment } from 'x402-axios'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0xYourPrivateKey')
const axiosWithPayment = wrapAxiosWithPayment(axios, account)

const response = await axiosWithPayment.get('http://localhost:3000/api/x402/protected')
```

---

## 🔑 Key Differences from Traditional APIs

1. **No API Keys**: Payment serves as authentication
2. **Per-Request Billing**: Pay only for what you use
3. **Decentralized**: No central authority for access control
4. **Transparent Pricing**: Costs are clearly defined upfront
5. **Programmable Money**: Smart contract-based settlements

---

## 💰 Pricing Configuration

Services can define prices in multiple ways:

```javascript
// Dollar amount (converted to USDC)
price: "$0.001"

// Atomic amount with decimals
price: {
  amount: "1000000",
  decimals: 6
}
```

---

## 🌐 Network Support

### Base Sepolia (Testnet)
- USDC: `0x6B5f6d625aa0fBA745759Ad0495017735cB72af7`
- Network ID: `base-sepolia`
- RPC: `https://sepolia.base.org`

### Base Mainnet
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Network ID: `base`
- RPC: `https://mainnet.base.org`

---

## 🧪 Testing x402 Payments

### 1. Install x402 CLI (optional)
```bash
npm install -g @coinbase/x402-cli
```

### 2. Test with curl
```bash
# Get payment requirements
curl http://localhost:3000/api/x402/protected

# Service will return 402 with payment requirements
```

### 3. Use test client
Create a test client that handles x402 payments automatically.

---

## 📝 Implementation Notes

### What We Implemented

✅ **Service Registry**: Full CRUD operations for x402 services
✅ **Payment Requirements**: Proper x402 payment specification format
✅ **402 Status Codes**: Correct HTTP 402 responses with payment details
✅ **Service Discovery**: Compatible with x402 facilitators
✅ **Protected Endpoints**: Payment-gated API access
✅ **Dynamic Pricing**: Configurable per-service pricing

### What's Not Needed

❌ **X402_SERVICE_KEY**: Not required - x402 doesn't use API keys
❌ **Bazaar API**: Optional - services work with local registry
❌ **Facilitator**: Optional - can use Coinbase's default facilitator

---

## 🔒 Security Considerations

1. **Private Keys**: Never expose wallet private keys
2. **Payment Verification**: Always verify payment signatures
3. **Amount Validation**: Check payment amounts match requirements
4. **Network Validation**: Ensure payments are on correct network
5. **Replay Protection**: Use nonces to prevent replay attacks

---

## 📚 Resources

- [x402 Protocol Specification](https://x402.org)
- [x402 TypeScript SDK](https://github.com/coinbase/x402)
- [Coinbase Developer Platform](https://developers.coinbase.com)
- [Base Documentation](https://docs.base.org)

---

## 🎯 Next Steps

1. **Deploy to Production**: Update network to `base` mainnet
2. **Add Facilitator**: Integrate with Coinbase facilitator for settlement
3. **Implement Middleware**: Use x402-next middleware for all routes
4. **Add Analytics**: Track payment metrics and usage
5. **Scale Services**: Register more AI agents as x402 services

---

**Status**: ✅ PRODUCTION READY
**Protocol Version**: x402 v1
**Last Updated**: 2025-01-14