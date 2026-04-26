'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginAction, signupAction } from '@/app/actions/auth';
import { X, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export default function LoginModal({ isOpen, onClose, reason }: Props) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    const formData = new FormData(e.currentTarget);
    const actionType = authMode;

    try {
      let res: any;
      if (actionType === 'login') {
         res = await loginAction(formData);
      } else {
         res = await signupAction(formData);
      }

      if (res?.error) setError(res.error);
      else if (res?.message) setMessage(res.message);
      else if (res?.success) {
         window.location.reload(); 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-[#181818]/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[2rem] max-h-[85vh] overflow-y-auto border border-white/5 shadow-2xl flex flex-col w-[calc(100%-2rem)] sm:w-full max-w-[360px] gap-5 relative z-10 custom-scrollbar">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"><X size={16} /></button>
            
            <div className="text-center mb-2">
                <div className="w-12 h-12 bg-kyma-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-kyma-primary/30">
                  <Lock size={20} className="text-kyma-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tighter text-white mb-2">
                   {authMode === 'login' ? 'Unlock Kyma' : 'Join Kyma Space'}
                </h2>
                {reason ? (
                   <p className="text-xs text-kyma-primary leading-tight">{reason}</p>
                ) : (
                   <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-medium">
                     {authMode === 'login' ? 'Authentication Space' : 'Invite Only'}
                   </p>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && <div className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-lg text-center font-medium">{error}</div>}
              {message && <div className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-lg text-center font-medium">{message}</div>}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Email</label>
                <input id="email" name="email" type="email" required className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0075de]/50 focus:bg-black/50 transition-all text-white placeholder:text-zinc-700" placeholder="your@email.com" />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Password</label>
                <input id="password" name="password" type="password" required minLength={6} className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0075de]/50 focus:bg-black/50 transition-all text-white placeholder:text-zinc-700" placeholder="••••••••" />
              </div>

              {authMode === 'signup' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-kyma-primary uppercase tracking-widest pl-1">Invitation Code</label>
                  <input id="inviteCode" name="inviteCode" type="text" required className="bg-kyma-primary/5 border border-kyma-primary/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-kyma-primary/50 focus:bg-kyma-primary/10 transition-all text-kyma-primary placeholder:text-kyma-primary/30" placeholder="Enter Invite Code" />
                </motion.div>
              )}

              <div className="flex flex-col gap-3 mt-4">
                <button type="submit" disabled={isLoading} className="bg-white text-black font-bold uppercase tracking-wider text-[11px] py-3.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]">
                   {authMode === 'login' ? 'Log In' : 'Create Account'}
                </button>
                
                <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} className="bg-transparent text-zinc-500 font-bold uppercase tracking-wider text-[10px] py-2 rounded-xl hover:text-white transition-colors">
                   {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
