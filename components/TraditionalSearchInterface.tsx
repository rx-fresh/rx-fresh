import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canPerformSearch, getUserCapabilities } from '../lib/contentGating';
import { requiresUpgrade, generateUpgradeMessage } from '../services/upgradeService';

interface SearchFilters {
  medication: string;
  zipcode: string;
  specialties: string[];
  radius: number;
  acceptsInsurance: boolean;
}

interface TraditionalSearchInterfaceProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  onSwitchToAI: () => void;
  error?: string | null;
}

const specialtyOptions = [
  'Family Medicine',
  'Internal Medicine',
  'Psychiatry',
  'Pain Management',
  'Oncology',
  'Cardiology',
  'Endocrinology',
  'Neurology'
];

export default function TraditionalSearchInterface({ 
  onSearch, 
  onSwitchToAI, 
  error 
}: TraditionalSearchInterfaceProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    medication: '',
    zipcode: '',
    specialties: [],
    radius: 25,
    acceptsInsurance: false
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);
  
  const capabilities = getUserCapabilities(user);
  const canSearch = canPerformSearch(user, 1, 1);

  useEffect(() => {
    const upgradeContext = requiresUpgrade(user, 'view_results');
    if (upgradeContext) {
      setUpgradePrompt(generateUpgradeMessage(upgradeContext));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!filters.medication.trim()) {
      return;
    }

    if (!canSearch.canSearch) {
      setUpgradePrompt(canSearch.reason || 'Upgrade needed');
      return;
    }

    // Convert filters to natural language query for backend
    let query = `Find prescribers for ${filters.medication}`;
    if (filters.zipcode) {
      query += ` near ${filters.zipcode}`;
    }
    if (filters.specialties.length > 0) {
      query += ` specializing in ${filters.specialties.join(', ')}`;
    }
    if (filters.radius !== 25) {
      query += ` within ${filters.radius} miles`;
    }
    if (filters.acceptsInsurance) {
      query += ' who accept insurance';
    }

    onSearch(query, filters);
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    if (!capabilities.canSearch || capabilities.maxDrugsPerSearch === 1) {
      setUpgradePrompt('Upgrade to Premium to use multiple filters simultaneously');
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      specialties: checked 
        ? [...prev.specialties, specialty]
        : prev.specialties.filter(s => s !== specialty)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header with AI toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Find Prescribers</h2>
          <p className="text-gray-400 text-sm">Search by medication and location</p>
        </div>
        <button
          onClick={onSwitchToAI}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg"
          title="Switch to AI Assistant (Ctrl+T)"
        >
          🤖 Try AI Assistant
        </button>
      </div>

      {/* Upgrade prompt */}
      {upgradePrompt && (
        <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
              ⬆
            </div>
            <div>
              <p className="text-white text-sm">{upgradePrompt}</p>
              <button className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                View Plans →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="medication" className="block text-sm font-medium text-gray-300 mb-2">
              Medication *
            </label>
            <input
              type="text"
              id="medication"
              value={filters.medication}
              onChange={(e) => setFilters(prev => ({ ...prev, medication: e.target.value }))}
              placeholder="e.g. Ozempic, Adderall, Insulin"
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label htmlFor="zipcode" className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <input
              type="text"
              id="zipcode"
              value={filters.zipcode}
              onChange={(e) => setFilters(prev => ({ ...prev, zipcode: e.target.value }))}
              placeholder="ZIP code"
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center space-x-2"
        >
          <span>{showAdvanced ? '▼' : '▶'} Advanced Options</span>
          {!capabilities.canSearch && (
            <span className="text-xs text-gray-500">(Premium feature)</span>
          )}
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-700/20 rounded-lg border border-gray-600/30">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Specialties
              </label>
              <div className="grid grid-cols-2 gap-2">
                {specialtyOptions.map((specialty) => (
                  <label key={specialty} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.specialties.includes(specialty)}
                      onChange={(e) => handleSpecialtyChange(specialty, e.target.checked)}
                      className="rounded text-cyan-500 focus:ring-cyan-500"
                      disabled={!capabilities.canSearch}
                    />
                    <span className={!capabilities.canSearch ? 'text-gray-500' : 'text-gray-300'}>
                      {specialty}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="radius" className="block text-sm font-medium text-gray-300 mb-2">
                Search Radius: {filters.radius} miles
              </label>
              <input
                type="range"
                id="radius"
                min="5"
                max="100"
                value={filters.radius}
                onChange={(e) => setFilters(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                className="w-full accent-cyan-500"
                disabled={!capabilities.canSearch}
              />
            </div>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={filters.acceptsInsurance}
                onChange={(e) => setFilters(prev => ({ ...prev, acceptsInsurance: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-cyan-500"
                disabled={!capabilities.canSearch}
              />
              <span className={!capabilities.canSearch ? 'text-gray-500' : 'text-gray-300'}>
                Accepts Insurance
              </span>
            </label>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!filters.medication.trim() || !canSearch.canSearch}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
        >
          {!canSearch.canSearch ? canSearch.reason : 'Search Prescribers'}
        </button>
      </form>

      {/* Credits Display */}
      {user && user.subscription_tier !== 'free' && (
        <div className="flex items-center justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
          <span>
            {capabilities.hasUnlimitedSearches 
              ? 'Unlimited searches' 
              : `${user.credits_remaining} searches remaining`
            }
          </span>
          <span className="text-xs">
            {user.subscription_tier === 'basic' ? 'Basic Plan' : 'Premium Plan'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Benefits of AI */}
      <div className="mt-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-lg border border-gray-600/30">
        <h3 className="text-sm font-medium text-gray-300 mb-2">💡 Pro Tip</h3>
        <p className="text-xs text-gray-400 mb-3">
          Our AI assistant can understand natural language queries like "Find pediatricians near 90210 who prescribe ADHD medications" 
          and provide personalized recommendations.
        </p>
        <button
          onClick={onSwitchToAI}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
        >
          Try the AI Assistant →
        </button>
      </div>
    </div>
  );
}
