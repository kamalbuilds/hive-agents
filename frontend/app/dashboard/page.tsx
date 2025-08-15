'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Globe, Activity } from 'lucide-react';
import { ZoneCard } from '@/components/dashboard/zone-card';
import { ImpactMetrics } from '@/components/dashboard/impact-metrics';
import { CommunityZone } from '@/lib/types';

// Mock data for demonstration
const mockZones: CommunityZone[] = [
  {
    id: 'zone-1',
    name: 'Amazon Rainforest Reserve',
    description: 'Protected rainforest area with high biodiversity',
    location: {
      latitude: -3.4653,
      longitude: -62.2159,
      area: 1250
    },
    owner: {
      accountId: '0.0.1234',
      name: 'Indigenous Community Collective',
      type: 'community'
    },
    metrics: {
      carbonSequestration: {
        current: 450,
        baseline: 400,
        change: 12.5
      },
      biodiversity: {
        speciesCount: 342,
        biodiversityIndex: 85,
        endangeredSpecies: ['Jaguar', 'Harpy Eagle', 'Giant River Otter']
      },
      waterQuality: {
        index: 92,
        pollutants: []
      },
      soilHealth: {
        organicMatter: 8.5,
        erosionRate: 0.2,
        fertility: 88
      },
      lastUpdated: new Date()
    },
    status: 'verified',
    createdAt: new Date('2024-01-15'),
    verifiedAt: new Date('2024-02-01')
  },
  {
    id: 'zone-2',
    name: 'Coastal Mangrove Sanctuary',
    description: 'Mangrove restoration project for carbon sequestration',
    location: {
      latitude: 10.3156,
      longitude: -85.8402,
      area: 850
    },
    owner: {
      accountId: '0.0.5678',
      name: 'Ocean Conservation Trust',
      type: 'organization'
    },
    metrics: {
      carbonSequestration: {
        current: 320,
        baseline: 250,
        change: 28.0
      },
      biodiversity: {
        speciesCount: 189,
        biodiversityIndex: 72,
        endangeredSpecies: ['Sea Turtle', 'Manatee']
      },
      waterQuality: {
        index: 78,
        pollutants: ['microplastics']
      },
      soilHealth: {
        organicMatter: 6.2,
        erosionRate: 0.5,
        fertility: 75
      },
      lastUpdated: new Date()
    },
    status: 'active',
    createdAt: new Date('2024-03-10')
  }
];

const mockMetrics = {
  totalCarbon: 15420,
  totalBiodiversity: 78,
  totalWater: 85,
  totalSoil: 81,
  communitiesSupported: 127,
  creditsIssued: 8542,
  marketValue: 425000
};

const mockHistoricalData = [
  { date: 'Jan', carbon: 1200, biodiversity: 75, water: 82, month: 'Jan', carbonCredits: 120, biodiversityCredits: 45, waterCredits: 30, soilCredits: 25 },
  { date: 'Feb', carbon: 1350, biodiversity: 76, water: 83, month: 'Feb', carbonCredits: 135, biodiversityCredits: 48, waterCredits: 32, soilCredits: 28 },
  { date: 'Mar', carbon: 1480, biodiversity: 77, water: 84, month: 'Mar', carbonCredits: 145, biodiversityCredits: 52, waterCredits: 35, soilCredits: 30 },
  { date: 'Apr', carbon: 1520, biodiversity: 78, water: 85, month: 'Apr', carbonCredits: 155, biodiversityCredits: 55, waterCredits: 38, soilCredits: 32 },
  { date: 'May', carbon: 1650, biodiversity: 79, water: 86, month: 'May', carbonCredits: 165, biodiversityCredits: 58, waterCredits: 40, soilCredits: 35 },
  { date: 'Jun', carbon: 1780, biodiversity: 80, water: 87, month: 'Jun', carbonCredits: 175, biodiversityCredits: 62, waterCredits: 42, soilCredits: 38 }
];

export default function DashboardPage() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'zones' | 'alerts'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                EcoNexus Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitor and manage your environmental impact zones
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Register New Zone
            </motion.button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'overview'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setSelectedTab('zones')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'zones'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Impact Zones
              </div>
            </button>
            <button
              onClick={() => setSelectedTab('alerts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                selectedTab === 'alerts'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              AI Monitoring Alerts
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ImpactMetrics metrics={mockMetrics} historicalData={mockHistoricalData} />
          </motion.div>
        )}

        {selectedTab === 'zones' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Search and Filter Bar */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search zones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Zone Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockZones.map((zone) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  onClick={() => console.log('Zone clicked:', zone.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {selectedTab === 'alerts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Unusual Activity Detected - Amazon Reserve
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    AI analysis detected potential deforestation activity in sector 3. Satellite imagery shows 2.3 hectares of tree cover loss.
                  </p>
                  <div className="flex gap-3 mt-3">
                    <button className="text-sm text-yellow-600 dark:text-yellow-400 font-medium hover:underline">
                      View Details
                    </button>
                    <button className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Biodiversity Improvement - Mangrove Sanctuary
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    3 new bird species detected via bioacoustic monitoring. Biodiversity index increased by 5 points.
                  </p>
                  <div className="flex gap-3 mt-3">
                    <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      View Report
                    </button>
                    <button className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}