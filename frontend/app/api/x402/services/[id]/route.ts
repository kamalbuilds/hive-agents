import { NextRequest, NextResponse } from 'next/server'

// x402 Payment Protocol Implementation for individual services
// This endpoint handles payment-required API calls to registered agents

interface PaymentRequirements {
  scheme: string
  network: string
  maxAmountRequired: string
  resource: string
  description: string
  payTo: string
  asset: string
  maxTimeoutSeconds: number
}

// Mock service data (would be from database in production)
const getServiceById = (id: string) => {
  return {
    id,
    name: `Hive Mind Agent ${id}`,
    description: 'AI-powered analysis and optimization service',
    endpoint: `https://api.hivemind.network/agents/${id}`,
    payTo: '0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129',
    price: '$0.001',
    network: 'base-sepolia' as const,
    capabilities: ['analysis', 'optimization', 'prediction'],
    status: 'active'
  }
}

function generatePaymentRequirements(serviceId: string): PaymentRequirements {
  const service = getServiceById(serviceId)
  
  // Convert dollar price to atomic USDC amount (6 decimals)
  const priceInDollars = parseFloat(service.price.slice(1))
  const atomicAmount = Math.floor(priceInDollars * 10 ** 6).toString()
  
  return {
    scheme: 'exact',
    network: service.network,
    maxAmountRequired: atomicAmount,
    resource: service.endpoint,
    description: service.description,
    payTo: service.payTo,
    asset: '0x6B5f6d625aa0fBA745759Ad0495017735cB72af7', // MockUSDC on Base Sepolia
    maxTimeoutSeconds: 300
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceId = params.id
  
  // Get service details
  const service = getServiceById(serviceId)
  
  if (!service || service.status !== 'active') {
    return NextResponse.json(
      { error: 'Service not found or inactive' },
      { status: 404 }
    )
  }
  
  // Return service info with x402 payment requirements
  return NextResponse.json({
    service,
    x402: {
      version: 1,
      accepts: [generatePaymentRequirements(serviceId)]
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceId = params.id
  const paymentHeader = request.headers.get('X-PAYMENT')
  
  // Get service details
  const service = getServiceById(serviceId)
  
  if (!service || service.status !== 'active') {
    return NextResponse.json(
      { error: 'Service not found or inactive' },
      { status: 404 }
    )
  }
  
  // Check for payment header
  if (!paymentHeader) {
    // Return 402 Payment Required
    return NextResponse.json(
      {
        x402Version: 1,
        error: 'Payment required to access this service',
        accepts: [generatePaymentRequirements(serviceId)]
      },
      { 
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  // Parse request body
  const body = await request.json()
  const { task, params } = body
  
  // Simulate agent processing (in production, forward to actual agent)
  const result = await processAgentTask(serviceId, task, params)
  
  // Return result with payment confirmation
  return NextResponse.json({
    success: true,
    serviceId,
    task,
    result,
    payment: {
      status: 'captured',
      amount: service.price,
      network: service.network
    },
    timestamp: new Date()
  })
}

// Simulate agent task processing
async function processAgentTask(
  agentId: string,
  task: string,
  params: any
): Promise<any> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Return different results based on task type
  switch (task) {
    case 'analyze':
      return {
        analysis: {
          sentiment: 'positive',
          confidence: 0.87,
          keywords: params.keywords || ['ai', 'blockchain', 'optimization'],
          summary: 'Market conditions favorable for deployment'
        }
      }
      
    case 'optimize':
      return {
        optimization: {
          originalValue: params.value || 100,
          optimizedValue: (params.value || 100) * 1.15,
          improvement: '15%',
          recommendations: [
            'Increase parallel processing',
            'Implement caching strategy',
            'Optimize database queries'
          ]
        }
      }
      
    case 'predict':
      return {
        prediction: {
          metric: params.metric || 'price',
          currentValue: params.current || 100,
          predictedValue: (params.current || 100) * 1.08,
          timeframe: '24h',
          confidence: 0.75
        }
      }
      
    default:
      return {
        message: 'Task processed successfully',
        taskId: `task-${Date.now()}`,
        agentId
      }
  }
}