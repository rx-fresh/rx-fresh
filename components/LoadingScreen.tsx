
import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Connecting to prescriber network...",
  "Analyzing local prescription trends...",
  "Cross-referencing healthcare providers...",
  "Compiling your personalized list...",
  "Finalizing results...",
];

const LoadingScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-4 border-t-purple-400 border-r-purple-400 border-b-cyan-400 border-l-cyan-400 rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-2 border-t-cyan-500 border-r-cyan-500 border-b-gray-600 border-l-gray-600 rounded-full animate-spin [animation-direction:reverse]"></div>
      </div>
      <p className="text-lg text-gray-300 transition-opacity duration-500">
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
};

export default LoadingScreen;
