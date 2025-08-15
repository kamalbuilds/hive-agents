'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Info, Leaf, Award, Calendar, MapPin } from 'lucide-react';
import { MarketplaceListing, EnvironmentalCredit } from '@/lib/types';

interface CreditListingCardProps {
  listing: MarketplaceListing;
  credit: EnvironmentalCredit;
  onPurchase: () => void;
}

export function CreditListingCard({ listing, credit, onPurchase }: CreditListingCardProps) {
  const getCreditTypeColor = (type: EnvironmentalCredit['type']) => {
    switch (type) {
      case 'carbon': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'biodiversity': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'water': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'soil': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreditIcon = (type: EnvironmentalCredit['type']) => {
    switch (type) {
      case 'carbon': return '🌳';
      case 'biodiversity': return '🦋';
      case 'water': return '💧';
      case 'soil': return '🌱';
      default: return '🌍';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Header with gradient */}
      <div className="h-2 bg-gradient-to-r from-green-400 to-blue-500" />
      
      <div className="p-6">
        {/* Credit Type Badge */}
        <div className="flex justify-between items-start mb-4">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getCreditTypeColor(credit.type)}`}>
            <span className="text-lg">{getCreditIcon(credit.type)}</span>
            {credit.type.charAt(0).toUpperCase() + credit.type.slice(1)} Credit
          </span>
          {credit.status === 'verified' && (
            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>

        {/* Description */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {listing.description}
        </h3>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Vintage: {credit.vintageYear}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>Zone: {credit.zoneId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Leaf className="w-4 h-4" />
            <span>Methodology: {credit.methodology}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {listing.price} {listing.currency}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              per credit
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Available: {listing.quantity} credits</span>
            <span>Min purchase: {listing.minPurchase}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPurchase}
            className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
          >
            <ShoppingCart className="w-4 h-4" />
            Purchase
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Info className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}