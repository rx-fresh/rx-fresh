import React from 'react';
import { CheckCircleIcon } from './Icons';

interface PaywallProps {
  onPaymentSuccess: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onPaymentSuccess }) => {
  return (
    <div className="w-full text-center flex flex-col items-center justify-center animate-fade-in p-4">
      <h2 className="text-3xl font-extrabold mb-2">
        Unlock <span className="gradient-text">Complete Access</span>
      </h2>
      <p className="text-slate-400 mb-6">
        Get full, detailed information for all prescribers in your area.
      </p>

      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 w-full max-w-sm mb-6">
        <div className="mb-4">
          <span className="text-5xl font-bold text-white">$9.99</span>
          <span className="text-slate-400">/ one-time payment</span>
        </div>
        <ul className="space-y-3 text-left text-slate-300 my-6">
          <li className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            <span>Complete prescriber profiles</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            <span>Full Prescriber Address</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            <span>AI-powered scores & insights</span>
          </li>
           <li className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            <span>Unlimited searches for 30 days</span>
          </li>
        </ul>
        <button
          onClick={onPaymentSuccess}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform duration-300"
        >
          Pay and Unlock Results
        </button>
        <p className="text-xs text-slate-500 mt-3">30-day money-back guarantee • HIPAA secure</p>
      </div>
    </div>
  );
};

export default Paywall;