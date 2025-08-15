'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Plus, Trash2 } from 'lucide-react'

interface AgentSpawnModalProps {
  onClose: () => void
  onSpawn: (config: any) => void
}

export function AgentSpawnModal({ onClose, onSpawn }: AgentSpawnModalProps) {
  const [agentType, setAgentType] = useState('hybrid')
  const [capabilities, setCapabilities] = useState<string[]>(['data-analysis'])
  const [pricePerCall, setPricePerCall] = useState('0.001')
  const [newCapability, setNewCapability] = useState('')

  const predefinedCapabilities = [
    'data-analysis',
    'pattern-recognition',
    'market-research',
    'arbitrage',
    'risk-assessment',
    'portfolio-optimization',
    'sentiment-analysis',
    'price-prediction',
    'trend-detection',
    'smart-contract-audit',
    'cross-chain-bridging',
    'yield-optimization'
  ]

  const handleAddCapability = () => {
    if (newCapability && !capabilities.includes(newCapability)) {
      setCapabilities([...capabilities, newCapability])
      setNewCapability('')
    }
  }

  const handleRemoveCapability = (cap: string) => {
    setCapabilities(capabilities.filter(c => c !== cap))
  }

  const handleSpawn = () => {
    const config = {
      type: agentType,
      capabilities,
      pricePerCall: parseFloat(pricePerCall)
    }
    onSpawn(config)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader className="relative">
          <CardTitle className="text-2xl text-yellow-400">Spawn New Agent</CardTitle>
          <CardDescription className="text-gray-400">
            Configure and deploy a new AI agent to your swarm
          </CardDescription>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent Type */}
          <div>
            <Label htmlFor="agent-type" className="text-white mb-2">Agent Type</Label>
            <Select value={agentType} onValueChange={setAgentType}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="researcher">Researcher</SelectItem>
                <SelectItem value="trader">Trader</SelectItem>
                <SelectItem value="analyzer">Analyzer</SelectItem>
                <SelectItem value="optimizer">Optimizer</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Capabilities */}
          <div>
            <Label className="text-white mb-2">Capabilities</Label>
            <div className="space-y-3">
              {/* Selected Capabilities */}
              <div className="flex flex-wrap gap-2">
                {capabilities.map(cap => (
                  <div
                    key={cap}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <span className="text-sm text-gray-300">{cap}</span>
                    <button
                      onClick={() => handleRemoveCapability(cap)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Capability */}
              <div className="flex gap-2">
                <Select value={newCapability} onValueChange={setNewCapability}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select capability..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {predefinedCapabilities
                      .filter(cap => !capabilities.includes(cap))
                      .map(cap => (
                        <SelectItem key={cap} value={cap}>{cap}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddCapability}
                  disabled={!newCapability}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Price Per Call */}
          <div>
            <Label htmlFor="price-per-call" className="text-white mb-2">
              Price Per Call (USDC)
            </Label>
            <Input
              id="price-per-call"
              type="number"
              step="0.001"
              min="0.001"
              value={pricePerCall}
              onChange={(e) => setPricePerCall(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum: $0.001 per call (x402 protocol requirement)
            </p>
          </div>

          {/* Estimated Costs */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Deployment Costs</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Gas Fee (Base Network)</span>
                <span className="text-white">~0.001 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Initial Stake</span>
                <span className="text-white">10 USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MCP Server Setup</span>
                <span className="text-white">Free</span>
              </div>
              <div className="border-t border-gray-700 pt-1 mt-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-400">Total</span>
                  <span className="text-yellow-400">~10.001 USDC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-700 text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSpawn}
              disabled={capabilities.length === 0}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              🚀 Spawn Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}