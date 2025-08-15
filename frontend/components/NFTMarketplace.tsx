'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, ShoppingCart, Image, DollarSign, Activity,
  ExternalLink, Search, Filter, ArrowUpDown, Sparkles,
  Package, Eye, Heart, Share2, RefreshCw, CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOpenSea } from '@/hooks/useOpenSea'
import type { OpenSeaCollection, OpenSeaNFT, OpenSeaToken } from '@/lib/opensea-mcp'

interface NFTMarketplaceProps {
  walletAddress?: string
  onPurchase?: (nft: OpenSeaNFT) => void
}

export function NFTMarketplace({ walletAddress, onPurchase }: NFTMarketplaceProps) {
  const {
    loading,
    error,
    trendingCollections,
    topTokens,
    fetchTrendingCollections,
    fetchTopTokens,
    searchCollections,
    getNFTPortfolio,
    getCollectionAnalytics
  } = useOpenSea()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'ONE_HOUR' | 'ONE_DAY' | 'SEVEN_DAYS'>('ONE_DAY')
  const [selectedCollection, setSelectedCollection] = useState<OpenSeaCollection | null>(null)
  const [portfolio, setPortfolio] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'trending' | 'portfolio' | 'tokens'>('trending')

  // Load initial data
  useEffect(() => {
    fetchTrendingCollections(selectedTimeframe)
    fetchTopTokens()
    
    if (walletAddress) {
      loadPortfolio()
    }
  }, [selectedTimeframe, walletAddress])

  const loadPortfolio = async () => {
    if (!walletAddress) return
    const portfolioData = await getNFTPortfolio(walletAddress)
    setPortfolio(portfolioData)
  }

  const handleSearch = async () => {
    if (!searchQuery) return
    const results = await searchCollections(searchQuery)
    // Handle search results
  }

  const handleCollectionClick = async (collection: OpenSeaCollection) => {
    setSelectedCollection(collection)
    const analytics = await getCollectionAnalytics(collection.slug)
    // Handle analytics data
  }

  const formatPrice = (price?: number) => {
    if (!price) return '—'
    return price < 0.01 ? '<0.01' : price.toFixed(2)
  }

  const formatVolume = (volume?: number) => {
    if (!volume) return '—'
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`
    return volume.toFixed(0)
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Image className="w-6 h-6 text-purple-400" />
            NFT Marketplace
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Powered by OpenSea MCP • Real-time marketplace data
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 bg-gray-800/50 border-gray-700 text-white w-full sm:w-64"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-purple-500 hover:bg-purple-600"
            disabled={loading}
          >
            Search
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'trending'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Trending Collections
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tokens'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          Top Tokens
        </button>
        {walletAddress && (
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'portfolio'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            My Portfolio
          </button>
        )}
      </div>

      {/* Timeframe Selector for Trending */}
      {activeTab === 'trending' && (
        <div className="flex gap-2">
          {(['ONE_HOUR', 'ONE_DAY', 'SEVEN_DAYS'] as const).map((timeframe) => (
            <Button
              key={timeframe}
              size="sm"
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={selectedTimeframe === timeframe ? 'bg-purple-500' : ''}
            >
              {timeframe === 'ONE_HOUR' ? '1H' : timeframe === 'ONE_DAY' ? '24H' : '7D'}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchTrendingCollections(selectedTimeframe)}
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'trending' && (
          <motion.div
            key="trending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {trendingCollections.map((collection, index) => (
              <motion.div
                key={collection.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-purple-500 transition-all cursor-pointer"
                  onClick={() => handleCollectionClick(collection)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {collection.imageUrl && (
                          <img
                            src={collection.imageUrl}
                            alt={collection.name}
                            className="w-12 h-12 rounded-lg"
                          />
                        )}
                        <div>
                          <CardTitle className="text-white text-lg flex items-center gap-2">
                            {collection.name}
                            {collection.verified && (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            {collection.chain || 'Ethereum'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">Floor Price</p>
                        <p className="text-white font-medium">
                          {formatPrice(collection.floorPrice)} ETH
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Volume</p>
                        <p className="text-white font-medium">
                          {formatVolume(collection.totalVolume)} ETH
                        </p>
                      </div>
                    </div>
                    
                    {collection.description && (
                      <p className="text-gray-400 text-sm mt-3 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'tokens' && (
          <motion.div
            key="tokens"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {topTokens.map((token, index) => (
              <motion.div
                key={token.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{token.name}</p>
                      <p className="text-gray-400 text-sm">{token.symbol}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-medium">${formatPrice(token.price)}</p>
                    <p className={`text-sm ${
                      (token.priceChange24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(token.priceChange24h || 0) >= 0 ? '+' : ''}
                      {(token.priceChange24h || 0).toFixed(2)}%
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">24h Volume</p>
                    <p className="text-white">${formatVolume(token.volume24h)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">Market Cap</p>
                    <p className="text-white">${formatVolume(token.marketCap)}</p>
                  </div>
                  
                  <Button
                    size="sm"
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400"
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Trade
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'portfolio' && portfolio && (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400">Total NFTs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">{portfolio.totalCount}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400">Est. Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">
                    {formatPrice(portfolio.estimatedValue)} ETH
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400">Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">
                    {portfolio.profile?.collections?.length || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* NFT Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolio.nfts?.map((nft: OpenSeaNFT, index: number) => (
                <motion.div
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg overflow-hidden hover:border-purple-500 transition-all"
                >
                  {nft.imageUrl && (
                    <img
                      src={nft.imageUrl}
                      alt={nft.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="text-white font-medium text-sm truncate">{nft.name}</p>
                    <p className="text-gray-400 text-xs">#{nft.tokenId}</p>
                    {nft.price && (
                      <p className="text-purple-400 text-sm mt-2">
                        {formatPrice(nft.price)} ETH
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}