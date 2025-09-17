
import React, { useState } from 'react';
import { SearchIcon } from './Icons';

interface ChatInterfaceProps {
  onSearch: (query: string) => void;
  initialMessage: string;
  error: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSearch, initialMessage, error }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="w-full text-center flex flex-col items-center justify-center animate-fade-in">
      <p className="text-lg text-gray-300 mb-6">{initialMessage}</p>
      {error && <p className="text-red-400 bg-red-900/50 border border-red-500/50 rounded-md px-4 py-2 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="w-full max-w-md relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., 'Wegovy in Austin, TX'"
          className="w-full bg-gray-900/80 border border-purple-500/50 rounded-full py-3 pl-5 pr-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-300 shadow-lg shadow-purple-500/10"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-br from-purple-500 to-cyan-500 text-white rounded-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200"
        >
          <SearchIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
