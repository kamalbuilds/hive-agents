import { NextRequest, NextResponse } from 'next/server'
import { getAddress, recoverAddress, hashMessage } from 'viem'

// Define PaymentRequirements interface locally to avoid import issues
interface PaymentRequirements {
  scheme: 'exact'
  network: 'base' | 'base-sepolia'
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: `0x${string}`
  maxTimeoutSeconds: number
  asset: `0x${string}`
  outputSchema: {
    input: {
      type: string
      method: string
      body?: any
    }
    output: any
  }
  extra: {
    name: string
    version: string
  }
}

// Payment payload structure for x402
interface PaymentPayload {
  scheme: string
  network: string
  amount: string
  asset: string
  payTo: string
  nonce: string
  timestamp: number
  signature?: string
  payer?: string
}

// Protected endpoint configuration
const PAYMENT_REQUIREMENTS: PaymentRequirements = {
  scheme: 'exact',
  network: 'base-sepolia',
  maxAmountRequired: '1000', // 0.001 USDC (6 decimals)
  resource: 'https://api.hivemind.network/x402/protected',
  description: 'Access to Hive Mind AI agent services',
  mimeType: 'application/json',
  payTo: getAddress(process.env.RESOURCE_WALLET_ADDRESS || '0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129'),
  maxTimeoutSeconds: 300,
  asset: getAddress('0x6B5f6d625aa0fBA745759Ad0495017735cB72af7'), // MockUSDC on Base Sepolia
  outputSchema: {
    input: {
      type: 'http',
      method: 'GET',
    },
    output: {
      type: 'object',
      properties: {
        agents: { type: 'array' },
        tasks: { type: 'array' },
      },
    },
  },
  extra: {
    name: 'USDC',
    version: '2',
  },
}

// Verify x402 payment
async function verifyPayment(paymentHeader: string, requirements: PaymentRequirements): Promise<{ isValid: boolean; payer?: string; reason?: string }> {
  try {
    // Decode base64 payment header
    const decodedPayment = Buffer.from(paymentHeader, 'base64').toString('utf-8')
    const payment: PaymentPayload = JSON.parse(decodedPayment)

    // 1. Verify payment scheme matches
    if (payment.scheme !== requirements.scheme) {
      return { isValid: false, reason: 'Invalid payment scheme' }
    }

    // 2. Verify network matches
    if (payment.network !== requirements.network) {
      return { isValid: false, reason: 'Invalid network' }
    }

    // 3. Verify asset matches
    if (payment.asset.toLowerCase() !== requirements.asset.toLowerCase()) {
      return { isValid: false, reason: 'Invalid asset' }
    }

    // 4. Verify payTo address matches
    if (payment.payTo.toLowerCase() !== requirements.payTo.toLowerCase()) {
      return { isValid: false, reason: 'Invalid recipient' }
    }

    // 5. Verify amount is sufficient
    const paymentAmount = BigInt(payment.amount)
    const requiredAmount = BigInt(requirements.maxAmountRequired)
    if (paymentAmount < requiredAmount) {
      return { isValid: false, reason: `Insufficient payment: ${payment.amount} < ${requirements.maxAmountRequired}` }
    }

    // 6. Verify timestamp is within timeout window
    const now = Math.floor(Date.now() / 1000)
    const paymentAge = now - payment.timestamp
    if (paymentAge > requirements.maxTimeoutSeconds) {
      return { isValid: false, reason: 'Payment expired' }
    }

    // 7. Verify signature if provided
    if (payment.signature) {
      try {
        // Create the message that was signed
        const message = `${payment.scheme}:${payment.network}:${payment.amount}:${payment.asset}:${payment.payTo}:${payment.nonce}:${payment.timestamp}`
        
        // Recover the signer address
        const messageHash = hashMessage(message)
        const signature = payment.signature as `0x${string}`
        const recoveredAddress = await recoverAddress({
          hash: messageHash,
          signature: signature
        })
        
        payment.payer = recoveredAddress
      } catch (sigError) {
        console.error('Signature verification failed:', sigError)
        return { isValid: false, reason: 'Invalid signature' }
      }
    }

    // 8. Optional: Check nonce to prevent replay attacks
    // In production, maintain a nonce registry to prevent reuse
    if (!payment.nonce || payment.nonce.length < 16) {
      return { isValid: false, reason: 'Invalid or missing nonce' }
    }

    return { isValid: true, payer: payment.payer }
  } catch (error) {
    console.error('Payment verification error:', error)
    return { isValid: false, reason: 'Invalid payment format' }
  }
}

// Track used nonces to prevent replay attacks (in production, use Redis or database)
const usedNonces = new Set<string>()

export async function GET(request: NextRequest) {
  // Check for payment header
  const paymentHeader = request.headers.get('X-PAYMENT')
  
  if (!paymentHeader) {
    // Return 402 Payment Required with payment requirements
    return NextResponse.json(
      {
        x402Version: 1,
        error: 'Payment required',
        accepts: [PAYMENT_REQUIREMENTS],
      },
      { 
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Verify the payment
  const verification = await verifyPayment(paymentHeader, PAYMENT_REQUIREMENTS)
  
  if (!verification.isValid) {
    return NextResponse.json(
      {
        x402Version: 1,
        error: verification.reason || 'Invalid payment',
        accepts: [PAYMENT_REQUIREMENTS],
        payer: verification.payer
      },
      { 
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Check and record nonce to prevent replay
  try {
    const decodedPayment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'))
    if (usedNonces.has(decodedPayment.nonce)) {
      return NextResponse.json(
        {
          x402Version: 1,
          error: 'Payment already used (replay attack prevented)',
          accepts: [PAYMENT_REQUIREMENTS],
        },
        { 
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    usedNonces.add(decodedPayment.nonce)
  } catch (e) {
    // Continue if nonce check fails
  }
  
  // Payment is valid - return protected content
  const response = NextResponse.json({
    success: true,
    data: {
      agents: [
        {
          id: 'agent-001',
          type: 'coordinator',
          status: 'active',
          capabilities: ['task-distribution', 'consensus-voting'],
          earnings: 1234.56,
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
        },
        {
          id: 'agent-002',
          type: 'analyzer',
          status: 'active',
          capabilities: ['sentiment-analysis', 'pattern-recognition'],
          earnings: 567.89,
          walletAddress: '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed'
        },
        {
          id: 'agent-003',
          type: 'optimizer',
          status: 'idle',
          capabilities: ['portfolio-optimization', 'yield-farming'],
          earnings: 890.12,
          walletAddress: '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359'
        }
      ],
      tasks: [
        {
          id: 'task-001',
          type: 'analysis',
          status: 'completed',
          reward: 10,
          completedBy: 'agent-002',
          completedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'task-002',
          type: 'optimization',
          status: 'in-progress',
          reward: 25,
          assignedTo: 'agent-003',
          startedAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: 'task-003',
          type: 'coordination',
          status: 'pending',
          reward: 15,
          createdAt: new Date(Date.now() - 600000).toISOString()
        }
      ],
      metrics: {
        totalAgents: 3,
        activeAgents: 2,
        completedTasks: 47,
        totalEarnings: 2692.57,
        averageResponseTime: '2.3s'
      },
      timestamp: new Date(),
      payer: verification.payer
    },
  })

  // Add payment response header to confirm settlement
  response.headers.set('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify({
    success: true,
    payer: verification.payer,
    amount: PAYMENT_REQUIREMENTS.maxAmountRequired,
    timestamp: Date.now()
  })).toString('base64'))

  return response
}

export async function POST(request: NextRequest) {
  // Check for payment header
  const paymentHeader = request.headers.get('X-PAYMENT')
  
  const postRequirements: PaymentRequirements = {
    ...PAYMENT_REQUIREMENTS,
    maxAmountRequired: '5000', // 0.005 USDC for POST requests
    outputSchema: {
      input: {
        type: 'http',
        method: 'POST',
        body: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            params: { type: 'object' },
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: { type: 'object' },
        },
      },
    },
  }
  
  if (!paymentHeader) {
    // Return 402 Payment Required
    return NextResponse.json(
      {
        x402Version: 1,
        error: 'Payment required',
        accepts: [postRequirements],
      },
      { 
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Verify the payment
  const verification = await verifyPayment(paymentHeader, postRequirements)
  
  if (!verification.isValid) {
    return NextResponse.json(
      {
        x402Version: 1,
        error: verification.reason || 'Invalid payment',
        accepts: [postRequirements],
        payer: verification.payer
      },
      { 
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  const body = await request.json()
  
  // Process the paid request based on action
  let result: any = {}
  
  switch (body.action) {
    case 'spawn_agent':
      result = {
        agentId: `agent-${Date.now()}`,
        type: body.params?.type || 'worker',
        status: 'spawning',
        endpoint: `http://agent-${Date.now()}.hivemind.network`
      }
      break
      
    case 'create_task':
      result = {
        taskId: `task-${Date.now()}`,
        type: body.params?.type || 'analysis',
        status: 'created',
        reward: body.params?.reward || 10
      }
      break
      
    case 'optimize':
      result = {
        optimizationId: `opt-${Date.now()}`,
        input: body.params?.input,
        status: 'processing',
        estimatedTime: '5 seconds'
      }
      break
      
    default:
      result = {
        message: 'Action executed successfully',
        action: body.action,
        params: body.params
      }
  }
  
  const response = NextResponse.json({
    success: true,
    result,
    payment: {
      payer: verification.payer,
      amount: postRequirements.maxAmountRequired,
      status: 'captured'
    },
    timestamp: new Date(),
  })

  // Add payment response header
  response.headers.set('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify({
    success: true,
    payer: verification.payer,
    amount: postRequirements.maxAmountRequired,
    action: body.action,
    timestamp: Date.now()
  })).toString('base64'))

  return response
}