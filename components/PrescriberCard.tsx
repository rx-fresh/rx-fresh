import React from 'react';
import type { Prescriber } from '../types';
import { StarIcon, PinIcon, SparklesIcon, TrendingUpIcon } from './Icons';

interface PrescriberCardProps {
  prescriber: Prescriber;
  isBlurred?: boolean;
}

const PrescriberCard: React.FC<PrescriberCardProps> = ({ prescriber, isBlurred = false }) => {
  const scoreColor = prescriber.score >= 4.5 ? 'text-green-400' : prescriber.score >= 3.5 ? 'text-yellow-400' : 'text-red-400';
  const blurClass = isBlurred ? 'blur-sm select-none' : '';
  
  // Check if this prescriber has multiple locations
  const hasMultipleLocations = (prescriber as any).locations && (prescriber as any).locations.length > 1;
  const locationCount = hasMultipleLocations ? (prescriber as any).locations.length : 1;

  return (
    <div className={`bg-gray-800/70 border border-gray-700/50 rounded-xl p-4 transition-all duration-300 hover:border-purple-500/50 hover:bg-gray-800`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-white">{prescriber.name}</h3>
          <p className="text-sm text-purple-300">{prescriber.specialty}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900/50`}>
          <StarIcon className={`w-4 h-4 ${scoreColor}`} />
          <span className={`font-bold text-sm ${scoreColor}`}>{prescriber.score.toFixed(1)}</span>
        </div>
      </div>

      <div className={`mt-4 space-y-2 text-sm text-gray-300`}>
         <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Based on <span className="font-bold text-white">{prescriber.total_claims}</span> recent claims</span>
         </div>
        <div className={`flex items-center gap-2 ${blurClass}`}>
          <PinIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="flex-1">
            <span>{prescriber.address}</span>
            {hasMultipleLocations && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                  +{locationCount - 1} more location{locationCount > 2 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`mt-4 p-3 bg-gray-900/50 rounded-lg flex items-center gap-3 ${blurClass}`}>
        <SparklesIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
        <p className="text-sm text-gray-300 italic">{prescriber.focus}</p>
      </div>
    </div>
  );
};

export default PrescriberCard;