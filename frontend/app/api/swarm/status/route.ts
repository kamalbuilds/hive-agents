import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // In production, this would connect to your actual backend
    const mockData = {
      metrics: {
        totalAgents: 24,
        activeAgents: 18,
        idleAgents: 6,
        tasksCompleted: 142,
        tasksInProgress: 7,
        totalEarnings: 4567.89,
        successRate: 87.5,
        avgResponseTime: 234,
        memoryUsage: 67,
        cpuUsage: 45,
        networkLatency: 12,
        gasSpent: 123.45
      },
      agents: [
        {
          id: 'queen-001',
          type: 'coordinator',
          status: 'active',
          capabilities: ['task-distribution', 'consensus-voting', 'swarm-optimization'],
          tasks: 45,
          earnings: 1234.56,
          cpu: 78,
          memory: 65,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3001',
          walletAddress: '0x1234567890123456789012345678901234567890'
        },
        {
          id: 'trader-002',
          type: 'trader',
          status: 'active',
          capabilities: ['arbitrage', 'market-making', 'risk-assessment'],
          tasks: 67,
          earnings: 2345.67,
          cpu: 56,
          memory: 45,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3002',
          walletAddress: '0x2345678901234567890123456789012345678901'
        },
        {
          id: 'analyst-003',
          type: 'analyzer',
          status: 'idle',
          capabilities: ['sentiment-analysis', 'pattern-recognition', 'data-mining'],
          tasks: 23,
          earnings: 456.78,
          cpu: 12,
          memory: 23,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3003',
          walletAddress: '0x3456789012345678901234567890123456789012'
        },
        {
          id: 'optimizer-004',
          type: 'optimizer',
          status: 'busy',
          capabilities: ['portfolio-optimization', 'yield-farming', 'gas-optimization'],
          tasks: 34,
          earnings: 890.12,
          cpu: 89,
          memory: 78,
          lastSeen: new Date(),
          endpoint: 'http://localhost:3004',
          walletAddress: '0x4567890123456789012345678901234567890123'
        }
      ]
    }

    return NextResponse.json(mockData)
  } catch (error) {
    console.error('Error fetching swarm status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch swarm status' },
      { status: 500 }
    )
  }
}