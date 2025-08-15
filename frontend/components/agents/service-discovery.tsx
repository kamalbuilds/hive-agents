'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, ShoppingCart, TrendingUp, Clock, DollarSign } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  provider: string
  price: number
  currency: string
  calls: number
  rating: number
  capabilities: string[]
  endpoint: string
}

export function ServiceDiscovery() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    discoverServices()
  }, [])

  const discoverServices = async () => {
    setLoading(true)
    
    // Mock data - replace with actual x402 Bazaar API call
    const mockServices: Service[] = [
      {
        id: 'srv-001',
        name: 'Advanced Market Analysis',
        description: 'Real-time market sentiment and trend analysis using AI',
        provider: 'agent-researcher-001',
        price: 0.005,
        currency: 'USDC',
        calls: 1234,
        rating: 4.8,
        capabilities: ['sentiment-analysis', 'trend-detection'],
        endpoint: 'https://api.hivemind.ai/services/market-analysis'
      },
      {
        id: 'srv-002',
        name: 'Cross-Chain Arbitrage Scanner',
        description: 'Identify profitable arbitrage opportunities across multiple chains',
        provider: 'agent-trader-002',
        price: 0.01,
        currency: 'USDC',
        calls: 567,
        rating: 4.9,
        capabilities: ['arbitrage', 'cross-chain'],
        endpoint: 'https://api.hivemind.ai/services/arbitrage-scanner'
      },
      {
        id: 'srv-003',
        name: 'Smart Contract Auditor',
        description: 'Automated security analysis and vulnerability detection',
        provider: 'agent-analyzer-003',
        price: 0.02,
        currency: 'USDC',
        calls: 234,
        rating: 4.7,
        capabilities: ['security-audit', 'vulnerability-scan'],
        endpoint: 'https://api.hivemind.ai/services/contract-audit'
      },
      {
        id: 'srv-004',
        name: 'DeFi Yield Optimizer',
        description: 'Optimize yield farming strategies across protocols',
        provider: 'agent-optimizer-004',
        price: 0.008,
        currency: 'USDC',
        calls: 890,
        rating: 4.6,
        capabilities: ['yield-optimization', 'defi-strategy'],
        endpoint: 'https://api.hivemind.ai/services/yield-optimizer'
      }
    ]
    
    setTimeout(() => {
      setServices(mockServices)
      setLoading(false)
    }, 1000)
  }

  const purchaseService = async (service: Service) => {
    console.log('Purchasing service:', service)
    // Implement x402 payment flow
    alert(`Service "${service.name}" purchased for ${service.price} ${service.currency}!`)
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Service Bazaar</h2>
        <p className="text-gray-400">Discover and purchase AI agent services with x402 micropayments</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Discovering services...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredServices.map(service => (
            <Card key={service.id} className="bg-gray-800 border-gray-700 hover:border-yellow-500 transition">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-white">{service.name}</CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      {service.description}
                    </CardDescription>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    ⭐ {service.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-2">
                    {service.capabilities.map(cap => (
                      <Badge key={cap} variant="secondary" className="bg-gray-700 text-gray-300">
                        {cap}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-gray-700">
                    <div className="text-center">
                      <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-400">Price</p>
                      <p className="text-white font-semibold">${service.price}</p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-400">Calls</p>
                      <p className="text-white font-semibold">{service.calls}</p>
                    </div>
                    <div className="text-center">
                      <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-400">Response</p>
                      <p className="text-white font-semibold">~2s</p>
                    </div>
                  </div>

                  {/* Provider */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">Provider</p>
                      <p className="text-sm text-gray-300">{service.provider}</p>
                    </div>
                    <Button
                      onClick={() => purchaseService(service)}
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Purchase
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredServices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No services found matching your search.</p>
          <Button
            onClick={discoverServices}
            className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black"
          >
            Refresh Services
          </Button>
        </div>
      )}
    </div>
  )
}