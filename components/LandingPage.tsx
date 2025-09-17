import React, { useEffect } from 'react';
import { LogoIcon, StarIcon, CheckIcon } from './Icons';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    return () => {
      revealElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const GlassCard: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/50 shadow-lg ${className}`}>
        {children}
    </div>
  );
  
  const TestimonialCard: React.FC<{ name: string; role: string; avatarBg: string; quote: string; delay?: string }> = ({ name, role, avatarBg, quote, delay }) => (
    <GlassCard className={`reveal ${delay || ''}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-full ${avatarBg}`}></div>
        <div>
            <div className="font-semibold text-white">{name}</div>
            <div className="text-sm text-slate-400">{role}</div>
        </div>
      </div>
      <div className="flex gap-1 mb-4 text-yellow-400">
        {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5" />)}
      </div>
      <p className="text-white/90 leading-relaxed">"{quote}"</p>
    </GlassCard>
  );

  return (
    <div className="bg-slate-900 text-white/90 antialiased">
        <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(at_40%_20%,hsla(217,91%,60%,0.3)_0px,transparent_50%),radial-gradient(at_80%_0%,hsla(190,96%,42%,0.3)_0px,transparent_50%),radial-gradient(at_0%_50%,hsla(262,88%,66%,0.2)_0px,transparent_50%),radial-gradient(at_80%_50%,hsla(330,81%,60%,0.3)_0px,transparent_50%),radial-gradient(at_0%_100%,hsla(145,83%,41%,0.2)_0px,transparent_50%),radial-gradient(at_80%_100%,hsla(262,88%,66%,0.3)_0px,transparent_50%)]"></div>
        </div>
        
        <header className="relative z-20 py-6 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
                <LogoIcon className="w-10 h-10 text-gray-400" />
                <h1 className="text-2xl font-bold tracking-tighter text-white">
                    <span className="bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text pr-1">RX</span>
                    Prescribers
                </h1>
            </div>
        </header>

        <main className="relative z-10">
            <section className="py-16 sm:py-24 px-4 sm:px-8">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-tight">
                        Find Your Perfect
                        <span className="block bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">Prescriber in Minutes</span>
                    </h1>
                    
                    <p className="max-w-xl mx-auto mt-6 text-lg sm:text-xl text-slate-400 leading-relaxed">
                        Stop the endless search. Our AI analyzes thousands of providers to find the perfect match for your specific medication needs and location.
                    </p>
                    
                    <div className="mt-10 mb-16">
                        <button onClick={onStart} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform duration-300">
                            Launch AI Assistant &rarr;
                        </button>
                    </div>

                    <div className="reveal grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl mx-auto mt-16 text-center">
                        <div>
                            <div className="text-4xl font-extrabold gradient-text">95%</div>
                            <div className="text-sm text-slate-400">Success Rate</div>
                        </div>
                        <div>
                            <div className="text-4xl font-extrabold gradient-text">&lt;2min</div>
                            <div className="text-sm text-slate-400">Average Search</div>
                        </div>
                        <div>
                            <div className="text-4xl font-extrabold gradient-text">10K+</div>
                            <div className="text-sm text-slate-400">Providers</div>
                        </div>
                        <div>
                            <div className="text-4xl font-extrabold gradient-text">24/7</div>
                            <div className="text-sm text-slate-400">AI Available</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="py-24 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Get Started in <span className="gradient-text">3 Simple Steps</span></h2>
                        <p className="mt-4 text-lg text-slate-400">
                            Our streamlined process makes finding the right healthcare provider effortless.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-16 gap-x-8">
                        <div className="reveal">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 flex-shrink-0 bg-blue-500/10 border border-blue-500 rounded-full flex items-center justify-center text-xl font-bold text-blue-400">1</div>
                                <h3 className="text-xl font-bold m-0">Tell Us Your Needs</h3>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                Simply tell our AI assistant what medication you're looking for and your location. It's as easy as sending a text.
                            </p>
                        </div>
                        <div className="reveal [transition-delay:200ms]">
                             <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 flex-shrink-0 bg-purple-500/10 border border-purple-500 rounded-full flex items-center justify-center text-xl font-bold text-purple-400">2</div>
                                <h3 className="text-xl font-bold m-0">AI Finds Matches</h3>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                Our system instantly queries our live database and enriches the results with AI to find your best options.
                            </p>
                        </div>
                        <div className="reveal [transition-delay:400ms]">
                             <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 flex-shrink-0 bg-cyan-500/10 border border-cyan-500 rounded-full flex items-center justify-center text-xl font-bold text-cyan-400">3</div>
                                <h3 className="text-xl font-bold m-0">Connect With Care</h3>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                               Receive a curated list of top prescribers, complete with contact details and satisfaction scores, ready for you to take the next step.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            <section className="py-24 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                            Trusted by <span className="gradient-text">Thousands</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-400">
                            See what our users are saying about finding care with RX Prescribers.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <TestimonialCard 
                            name="Sarah M."
                            role="ADHD Patient"
                            avatarBg="bg-gradient-to-br from-pink-500 to-red-500"
                            quote="I spent 6 months trying to find an ADHD specialist. RX Prescribers found me three perfect matches in under 2 minutes. Already got my prescription and my life is changing!"
                        />
                         <TestimonialCard 
                            name="Michael R."
                            role="Anxiety Treatment"
                            avatarBg="bg-gradient-to-br from-blue-500 to-cyan-400"
                            quote="The AI understood exactly what I needed for my anxiety treatment. Found a specialist who takes my insurance and had same-week availability. Incredible!"
                            delay="[transition-delay:200ms]"
                        />
                         <TestimonialCard 
                            name="Jennifer L."
                            role="Diabetes Management"
                            avatarBg="bg-gradient-to-br from-emerald-500 to-green-400"
                            quote="Managing diabetes requires the right endocrinologist. This platform found me a specialist who not only prescribes Ozempic but also provides comprehensive care. Game-changer!"
                            delay="[transition-delay:400ms]"
                        />
                    </div>
                </div>
            </section>
            
            <section className="py-24 px-4 sm:px-8 bg-gradient-to-b from-transparent to-slate-900/80">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                         Ready to Find Your <span className="gradient-text">Perfect Prescriber</span>?
                    </h2>
                     <p className="text-lg text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
                        Join thousands who've already found their ideal healthcare providers. One search could change your life.
                    </p>
                    
                    <GlassCard className="reveal text-left">
                       <div className="text-center mb-6">
                            <div className="text-5xl font-extrabold text-white mb-1">$9.99</div>
                            <div className="text-slate-400">One-time payment</div>
                             <div className="text-xs text-slate-500">No subscriptions • No hidden fees</div>
                       </div>
                        
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
                            <div className="flex items-center gap-3">
                                <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-slate-300">Complete prescriber profiles</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-slate-300">Real-time prescription data</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-slate-300">AI-powered match scores</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-slate-300">Full Prescriber Address</span>
                            </div>
                       </div>
                                                
                        <button onClick={onStart} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-lg py-4 px-10 rounded-full shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform duration-300">
                             Start Your Search Now
                         </button>
                         <p className="text-xs text-slate-500 mt-4 text-center">30-day money-back guarantee • HIPAA secure</p>
                    </GlassCard>
                </div>
            </section>
        </main>

        <footer className="text-center py-8 px-4 text-sm text-slate-500 relative z-10">
            <p>&copy; 2024 RX Prescribers. All Rights Reserved. Data provided by RX Prescribers API.</p>
        </footer>
    </div>
  );
};

export default LandingPage;
