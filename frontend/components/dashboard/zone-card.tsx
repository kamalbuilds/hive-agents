'use client';

import { motion } from 'framer-motion';
import { Trees, Droplets, Bug, Sprout, AlertTriangle, TrendingUp } from 'lucide-react';
import { CommunityZone } from '@/lib/types';

interface ZoneCardProps {
  zone: CommunityZone;
  onClick?: () => void;
}

export function ZoneCard({ zone, onClick }: ZoneCardProps) {
  const getStatusColor = (status: CommunityZone['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'verified': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'carbon': return <Trees className="w-5 h-5" />;
      case 'water': return <Droplets className="w-5 h-5" />;
      case 'biodiversity': return <Bug className="w-5 h-5" />;
      case 'soil': return <Sprout className="w-5 h-5" />;
      default: return null;
    }
  };

  const hasAlerts = zone.metrics.biodiversity.biodiversityIndex < 60 || 
                   zone.metrics.waterQuality.index < 60;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer border border-gray-200 dark:border-gray-700"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {zone.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {zone.location.area} hectares
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasAlerts && (
            <span className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(zone.status)}`}>
            {zone.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {getMetricIcon('carbon')}
            <span className="text-xs text-gray-600 dark:text-gray-400">Carbon</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {zone.metrics.carbonSequestration.current.toFixed(1)}t
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {zone.metrics.carbonSequestration.change > 0 ? '+' : ''}
            {zone.metrics.carbonSequestration.change.toFixed(1)}%
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {getMetricIcon('biodiversity')}
            <span className="text-xs text-gray-600 dark:text-gray-400">Biodiversity</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {zone.metrics.biodiversity.biodiversityIndex}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {zone.metrics.biodiversity.speciesCount} species
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {getMetricIcon('water')}
            <span className="text-xs text-gray-600 dark:text-gray-400">Water</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {zone.metrics.waterQuality.index}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Quality Index</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {getMetricIcon('soil')}
            <span className="text-xs text-gray-600 dark:text-gray-400">Soil</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {zone.metrics.soilHealth.fertility}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Fertility Score</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Owner: {zone.owner.name}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Updated {new Date(zone.metrics.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}