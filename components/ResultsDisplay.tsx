import React from 'react';
import type { Prescriber } from '../types';
import PrescriberCard from './PrescriberCard';
import { LockIcon } from './Icons';

interface ResultsDisplayProps {
  prescribers: Prescriber[];
  onReset?: () => void;
  onUnlock?: () => void;
  isTeaser?: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ prescribers, onReset, onUnlock, isTeaser = false }) => {
  const prescribersToShow = isTeaser ? prescribers.slice(0, 3) : prescribers;

  return (
    <div className="w-full animate-fade-in-fast">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">
          We found {prescribers.length} potential prescribers for you!
        </h2>
        {!isTeaser && <p className="text-gray-400 mt-1">Contact information is provided for your convenience.</p>}
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 relative">
        {prescribersToShow.map((prescriber, index) => (
          <PrescriberCard key={index} prescriber={prescriber} isBlurred={isTeaser} />
        ))}
        {isTeaser && prescribers.length > 3 && (
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-800/100 to-transparent pointer-events-none"></div>
        )}
      </div>
      
      {isTeaser && onUnlock && (
        <div className="mt-6 flex justify-center">
          <button 
              onClick={onUnlock} 
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform duration-300 flex items-center gap-2"
          >
              <LockIcon className="w-5 h-5" />
              Unlock Full Results
          </button>
        </div>
      )}
      
      {onReset && (
         <div className="mt-6 flex justify-center">
            <button 
                onClick={onReset} 
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300"
            >
                Start New Search
            </button>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
