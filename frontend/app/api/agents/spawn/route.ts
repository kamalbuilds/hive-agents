import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, capabilities, walletAddress } = body

    // Generate unique agent ID
    const agentId = `${type}-${Date.now().toString(36)}`
    const port = 3000 + Math.floor(Math.random() * 1000)

    // In production, this would actually spawn a new agent process
    const newAgent = {
      id: agentId,
      type,
      status: 'active',
      capabilities: capabilities || [],
      tasks: 0,
      earnings: 0,
      cpu: Math.floor(Math.random() * 50),
      memory: Math.floor(Math.random() * 50),
      lastSeen: new Date(),
      endpoint: `http://localhost:${port}`,
      walletAddress: walletAddress || `0x${Math.random().toString(16).substr(2, 40)}`
    }

    // Simulate agent registration delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json(newAgent)
  } catch (error) {
    console.error('Error spawning agent:', error)
    return NextResponse.json(
      { error: 'Failed to spawn agent' },
      { status: 500 }
    )
  }
}