import { NextRequest, NextResponse } from 'next/server'
import { getAddress, Address } from 'viem'

// x402 Payment Requirements type definition
interface PaymentRequirements {
  scheme: 'exact'
  network: 'base' | 'base-sepolia'
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: Address
  maxTimeoutSeconds: number
  asset: Address
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

// x402 Service Registry for Hive Mind agents
// This endpoint manages agent services that accept x402 payments
const serviceRegistry = new Map()

interface X402Service {
  id: string
  endpoint: string
  payTo: Address
  price: string | { amount: string; decimals: number }
  name: string
  description: string
  capabilities: string[]
  network: 'base' | 'base-sepolia'
  status: 'active' | 'inactive' | 'suspended'
  registeredAt: number
  totalCalls: number
  totalEarnings: number
  paymentRequirements?: PaymentRequirements
  metadata?: Record<string, any>
}

// Generate x402 payment requirements for a service
function generatePaymentRequirements(service: X402Service): PaymentRequirements {
  // Determine the atomic amount based on price format
  let maxAmountRequired: string
  let decimals = 6 // Default to USDC decimals
  
  if (typeof service.price === 'string') {
    // Price in dollars like "$0.001"
    if (service.price.startsWith('$')) {
      const amount = parseFloat(service.price.slice(1))
      maxAmountRequired = Math.floor(amount * 10 ** decimals).toString()
    } else {
      // Direct atomic amount
      maxAmountRequired = service.price
    }
  } else {
    maxAmountRequired = service.price.amount
    decimals = service.price.decimals
  }

  // Get USDC address for the network
  const assetAddress = service.network === 'base' 
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base Mainnet USDC
    : '0x6B5f6d625aa0fBA745759Ad0495017735cB72af7' // Base Sepolia MockUSDC

  return {
    scheme: 'exact',
    network: service.network,
    maxAmountRequired,
    resource: service.endpoint as any,
    description: service.description,
    mimeType: 'application/json',
    payTo: service.payTo,
    maxTimeoutSeconds: 300,
    asset: getAddress(assetAddress),
    outputSchema: {
      input: {
        type: 'http',
        method: 'POST',
        body: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            params: { type: 'object' },
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          result: { type: 'object' },
          success: { type: 'boolean' },
        },
      },
    },
    extra: {
      name: 'USDC',
      version: '2',
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      agentId, 
      endpoint, 
      payTo, 
      price = '$0.001', 
      name, 
      description, 
      capabilities, 
      network = 'base-sepolia',
      metadata 
    } = body

    // Validate required parameters
    if (!agentId || !endpoint || !payTo) {
      return NextResponse.json(
        { error: 'Missing required parameters: agentId, endpoint, and payTo are required' },
        { status: 400 }
      )
    }

    // Validate endpoint URL
    try {
      new URL(endpoint)
    } catch {
      return NextResponse.json(
        { error: 'Invalid endpoint URL' },
        { status: 400 }
      )
    }

    // Validate Ethereum address
    let validPayTo: Address
    try {
      validPayTo = getAddress(payTo)
    } catch {
      return NextResponse.json(
        { error: 'Invalid payTo address' },
        { status: 400 }
      )
    }

    // Validate network
    if (network !== 'base' && network !== 'base-sepolia') {
      return NextResponse.json(
        { error: 'Invalid network. Must be "base" or "base-sepolia"' },
        { status: 400 }
      )
    }

    // Check if service already exists
    if (serviceRegistry.has(agentId)) {
      const existingService = serviceRegistry.get(agentId)
      return NextResponse.json({
        success: false,
        error: 'Service already registered',
        service: existingService
      }, { status: 409 })
    }

    // Create service object
    const service: X402Service = {
      id: agentId,
      endpoint,
      payTo: validPayTo,
      price,
      name: name || `Hive Mind Agent ${agentId}`,
      description: description || 'AI agent service powered by Hive Mind',
      capabilities: capabilities || ['analysis', 'prediction', 'optimization'],
      network,
      status: 'active',
      registeredAt: Date.now(),
      totalCalls: 0,
      totalEarnings: 0,
      metadata
    }

    // Generate payment requirements
    service.paymentRequirements = generatePaymentRequirements(service)

    // Store in registry
    serviceRegistry.set(agentId, service)

    // Return success response with x402 payment requirements
    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        endpoint: service.endpoint,
        payTo: service.payTo,
        price: service.price,
        name: service.name,
        description: service.description,
        capabilities: service.capabilities,
        network: service.network,
        status: service.status,
        registeredAt: service.registeredAt,
        paymentRequirements: service.paymentRequirements
      },
      x402: {
        version: 1,
        accepts: [service.paymentRequirements],
        endpoint: `${request.nextUrl.origin}/api/x402/services/${agentId}`,
      }
    })
  } catch (error) {
    console.error('Error registering service:', error)
    return NextResponse.json(
      { 
        error: 'Failed to register service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')

    if (agentId) {
      // Get specific service
      const service = serviceRegistry.get(agentId)
      if (service) {
        // Return service with x402 payment requirements
        return NextResponse.json({
          ...service,
          x402: {
            version: 1,
            accepts: [service.paymentRequirements],
          }
        })
      } else {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }
    }

    // Return all registered services
    let services = Array.from(serviceRegistry.values())
    
    // Filter by status if provided
    if (status) {
      services = services.filter(s => s.status === status)
    }

    // Sort by registration date (newest first)
    services.sort((a, b) => b.registeredAt - a.registeredAt)

    // Return services formatted for x402 discovery
    const x402Services = services.map(service => ({
      resource: service.endpoint,
      type: 'ai-agent',
      lastUpdated: service.registeredAt,
      x402Version: 1,
      accepts: [service.paymentRequirements],
      metadata: {
        id: service.id,
        name: service.name,
        description: service.description,
        capabilities: service.capabilities,
        status: service.status,
        totalCalls: service.totalCalls,
        totalEarnings: service.totalEarnings,
      }
    }))

    return NextResponse.json({ 
      items: x402Services,
      total: services.length,
      network: services[0]?.network || 'base-sepolia'
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch services',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId parameter' },
        { status: 400 }
      )
    }

    const service = serviceRegistry.get(agentId)
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Update service status to inactive instead of deleting
    service.status = 'inactive'
    serviceRegistry.set(agentId, service)

    return NextResponse.json({
      success: true,
      message: 'Service deactivated successfully',
      service: {
        id: service.id,
        status: service.status
      }
    })
  } catch (error) {
    console.error('Error deactivating service:', error)
    return NextResponse.json(
      { 
        error: 'Failed to deactivate service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT endpoint to update service configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, price, status, metadata } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      )
    }

    const service = serviceRegistry.get(agentId)
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Update service properties
    if (price !== undefined) service.price = price
    if (status !== undefined) service.status = status
    if (metadata !== undefined) service.metadata = { ...service.metadata, ...metadata }

    // Regenerate payment requirements if price changed
    if (price !== undefined) {
      service.paymentRequirements = generatePaymentRequirements(service)
    }

    serviceRegistry.set(agentId, service)

    return NextResponse.json({
      success: true,
      service,
      x402: {
        version: 1,
        accepts: [service.paymentRequirements],
      }
    })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}