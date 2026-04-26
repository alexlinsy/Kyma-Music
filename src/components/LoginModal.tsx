'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginAction, signupAction, verifyInviteCodeAction } from '@/app/actions/auth';
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
  const [inviteCode, setInviteCode] = useState('');

  async function handleOAuth(provider: 'google' | 'apple') {
    setIsLoading(true);
    setError('');
    const isValid = await verifyInviteCodeAction(inviteCode);
    if (!isValid) {
      setError('A valid Invitation Code is required for Social Login.');
      setIsLoading(false);
      return;
    }
    
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

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

              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-kyma-primary uppercase tracking-widest pl-1">
                  {authMode === 'login' ? 'Invite Code (For Social Login Only)' : 'Invitation Code'}
                </label>
                <input id="inviteCode" name="inviteCode" type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required={authMode === 'signup'} className="bg-kyma-primary/5 border border-kyma-primary/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-kyma-primary/50 focus:bg-kyma-primary/10 transition-all text-kyma-primary placeholder:text-kyma-primary/30" placeholder="Enter Invite Code" />
              </motion.div>

              <div className="flex flex-col gap-3 mt-4">
                <button type="submit" disabled={isLoading} className="bg-white text-black font-bold uppercase tracking-wider text-[11px] py-3.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]">
                   {authMode === 'login' ? 'Log In' : 'Create Account'}
                </button>
                
                <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} className="bg-transparent text-zinc-500 font-bold uppercase tracking-wider text-[10px] py-2 rounded-xl hover:text-white transition-colors">
                   {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>

                <div className="flex items-center gap-3 my-2">
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">OR Social Login</span>
                  <div className="h-px bg-white/5 flex-1" />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => handleOAuth('google')} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-black/40 border border-white/5 hover:bg-black/60 text-white font-bold uppercase tracking-wider text-[10px] py-3 rounded-xl transition-colors disabled:opacity-50">
                    <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      <path d="M1 1h22v22H1z" fill="none"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
