import React, { useState, useCallback, useEffect } from 'react';
import type { Prescriber, ChatMessage } from './types';
import { ViewState } from './types';
import { findPrescribers } from './services/geminiService';
import { geminiPaymentService } from './services/geminiPaymentService';
import ChatInterface from './components/ChatInterface';
import { AuthenticatedChatInterface } from './components/AuthenticatedChatInterface';
import TraditionalSearchInterface from './components/TraditionalSearchInterface';
import LoadingScreen from './components/LoadingScreen';
import ResultsDisplay from './components/ResultsDisplay';
import LandingPage from './components/LandingPage';
import Paywall from './components/Paywall';
import ConversationalPayment from './components/ConversationalPayment';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { UserProfile } from './components/UserProfile';

import { v4 as uuidv4 } from 'uuid';

const AppContent: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [viewState, setViewState] = useState<ViewState>(ViewState.WELCOME);
  const [prescribers, setPrescribers] = useState<Prescriber[]>([]);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useTraditionalMode, setUseTraditionalMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const { user, loading } = useAuth();

  // Initialize user ID for payment tracking
  useEffect(() => {
    let storedUserId = localStorage.getItem('rx_user_id');
    if (!storedUserId) {
      storedUserId = uuidv4();
      localStorage.setItem('rx_user_id', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  // Keyboard shortcuts for mode switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T to toggle traditional mode
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setUseTraditionalMode(prev => !prev);
      }
      // Escape to go back to AI mode if in traditional mode
      if (e.key === 'Escape' && useTraditionalMode) {
        setUseTraditionalMode(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [useTraditionalMode]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setConversation([{ author: 'user', text: query }]);
    setViewState(ViewState.LOADING);
    setError(null);
    setCurrentQuery(query);

    try {
      // Check payment status before proceeding with search
      const result = await geminiPaymentService.processSearchWithPaymentCheck(query, userId);
      
      if (result.requiresPayment) {
        setShowPaymentPrompt(true);
        setViewState(ViewState.WELCOME);
        setError(null);
        return;
      }

      if (result.success && result.results && result.results.length > 0) {
        setPrescribers(result.results);
        setViewState(ViewState.TEASER);
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
  }, [userId]);

  const handleReset = () => {
    setViewState(ViewState.WELCOME);
    setPrescribers([]);
    setConversation([]);
    setError(null);
    setShowPaymentPrompt(false);
  };

  const handleUnlock = () => {
    setViewState(ViewState.PAYWALL);
  };
  
  const handlePaymentSuccess = () => {
    setViewState(ViewState.RESULTS);
    setShowPaymentPrompt(false);
  };

  const handlePaymentDeclined = () => {
    setShowPaymentPrompt(false);
    setError('Subscription required to continue searching. Please subscribe to unlock unlimited access.');
  };

  const handleConversationalPaymentSuccess = () => {
    setShowPaymentPrompt(false);
    // Retry the search after payment success
    handleSearch(currentQuery);
  };

  const renderContent = () => {
    // Show conversational payment prompt if needed
    if (showPaymentPrompt) {
      return (
        <div className="space-y-4">
          <AuthenticatedChatInterface 
            onSearch={handleSearch} 
            error={error} 
            onEscapeToTraditional={() => setUseTraditionalMode(true)}
          />
          <ConversationalPayment
            userId={userId}
            query={currentQuery}
            onPaymentSuccess={handleConversationalPaymentSuccess}
            onPaymentDeclined={handlePaymentDeclined}
            className="mt-4"
          />
        </div>
      );
    }

    switch (viewState) {
      case ViewState.LOADING:
        return <LoadingScreen />;
      case ViewState.TEASER:
        return <ResultsDisplay prescribers={prescribers} onUnlock={handleUnlock} isTeaser={true} />;
      case ViewState.PAYWALL:
        return <Paywall onPaymentSuccess={handlePaymentSuccess} userId={userId} />;
      case ViewState.RESULTS:
        return <ResultsDisplay prescribers={prescribers} onReset={handleReset} />;
      case ViewState.WELCOME:
      default:
        return useTraditionalMode ? (
          <TraditionalSearchInterface 
            onSearch={handleSearch}
            onSwitchToAI={() => setUseTraditionalMode(false)}
            error={error}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setUseTraditionalMode(true)}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                title="Switch to traditional form search (Ctrl+T)"
              >
                Prefer forms? Try traditional search →
              </button>
            </div>
            <AuthenticatedChatInterface 
              onSearch={handleSearch} 
              error={error} 
              onEscapeToTraditional={() => setUseTraditionalMode(true)}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%232d3748%22%20stroke-width%3D%221%22%3E%3Cpath%20d%3D%22M0%200h800v800H0z%22%2F%3E%3Cpath%20d%3D%22M0%20400V0l400%20400zM800%20400V0l-400%20400zM0%20400v400l400-400zM800%20400v400l-400-400z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-10"></div>
        <div className="w-full max-w-2xl mx-auto z-10">
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tighter text-white">
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text pr-1">RX</span>
                  Prescribers
                </h1>
              </div>
              {user && (
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{user.credits} credits</span>
                </button>
              )}
            </header>
            
            {showProfile && user && (
              <div className="mb-6">
                <UserProfile onClose={() => setShowProfile(false)} />
              </div>
            )}
            
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;