import React, { useState, useCallback } from 'react';
import type { Prescriber, ChatMessage } from './types';
import { ViewState } from './types';
import { findPrescribers } from './services/geminiService';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import ResultsDisplay from './components/ResultsDisplay';
import LandingPage from './components/LandingPage';
import Paywall from './components/Paywall';
import { LogoIcon } from './components/Icons';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [viewState, setViewState] = useState<ViewState>(ViewState.WELCOME);
  const [prescribers, setPrescribers] = useState<Prescriber[]>([]);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setConversation([{ author: 'user', text: query }]);
    setViewState(ViewState.LOADING);
    setError(null);

    try {
      const results = await findPrescribers(query);
      if (results && results.length > 0) {
        setPrescribers(results);
        setViewState(ViewState.TEASER); // Go to teaser view first
      } else {
        setError("We couldn't find any prescribers matching your search. Please try a different medication or location.");
        setViewState(ViewState.WELCOME);
        setConversation([]);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please check your connection and try again.');
      setViewState(ViewState.WELCOME);
      setConversation([]);
    }
  }, []);

  const handleReset = () => {
    setViewState(ViewState.WELCOME);
    setPrescribers([]);
    setConversation([]);
    setError(null);
  };

  const handleUnlock = () => {
    setViewState(ViewState.PAYWALL);
  };
  
  const handlePaymentSuccess = () => {
    setViewState(ViewState.RESULTS);
  };

  const renderContent = () => {
    switch (viewState) {
      case ViewState.LOADING:
        return <LoadingScreen />;
      case ViewState.TEASER:
        return <ResultsDisplay prescribers={prescribers} onUnlock={handleUnlock} isTeaser={true} />;
      case ViewState.PAYWALL:
        return <Paywall onPaymentSuccess={handlePaymentSuccess} />;
      case ViewState.RESULTS:
        return <ResultsDisplay prescribers={prescribers} onReset={handleReset} />;
      case ViewState.WELCOME:
      default:
        return <ChatInterface onSearch={handleSearch} initialMessage="I can help you find local prescribers for any medication. Where should we start?" error={error} />;
    }
  };

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%232d3748%22%20stroke-width%3D%221%22%3E%3Cpath%20d%3D%22M0%200h800v800H0z%22%2F%3E%3Cpath%20d%3D%22M0%20400V0l400%20400zM800%20400V0l-400%20400zM0%20400v400l400-400zM800%20400v400l-400-400z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-10"></div>
        <div className="w-full max-w-2xl mx-auto z-10">
            <header className="flex items-center justify-center mb-6 gap-3">
                <LogoIcon className="w-10 h-10" />
                <h1 className="text-4xl font-bold tracking-tighter text-white">
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text pr-1">RX</span>
                  Prescribers
                </h1>
            </header>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 border border-gray-700/50 p-6 min-h-[400px] flex flex-col justify-center transition-all duration-500">
              {renderContent()}
            </div>
            <footer className="text-center mt-6 text-xs text-gray-500">
                <p>Powered by Gemini and RX Prescribers API. Patient data is always kept secure and private.</p>
            </footer>
        </div>
    </main>
  );
};

export default App;
