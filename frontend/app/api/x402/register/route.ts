import { NextRequest, NextResponse } from 'next/server'

// Mock x402 service registry
const serviceRegistry = new Map()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, endpoint, price } = body

    if (!agentId || !endpoint) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Register service in x402 Bazaar
    const service = {
      id: agentId,
      endpoint,
      price: price || 0.001,
      name: `AI Agent ${agentId}`,
      description: 'Autonomous AI agent service',
      capabilities: ['analysis', 'prediction', 'optimization'],
      network: 'base',
      status: 'active',
      registeredAt: Date.now(),
      totalCalls: 0,
      totalEarnings: 0
    }

    // Store in registry
    serviceRegistry.set(agentId, service)

    // In production, this would register with actual x402 Bazaar
    return NextResponse.json({
      success: true,
      service,
      bazaarUrl: `https://bazaar.x402.org/service/${agentId}`
    })
  } catch (error) {
    console.error('Error registering service:', error)
    return NextResponse.json(
      { error: 'Failed to register service' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get('agentId')

  if (agentId) {
    const service = serviceRegistry.get(agentId)
    if (service) {
      return NextResponse.json(service)
    } else {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }
  }

  // Return all registered services
  const services = Array.from(serviceRegistry.values())
  return NextResponse.json({ services })
}