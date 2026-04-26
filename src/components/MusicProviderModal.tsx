'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Music } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSpotify: () => void;
  onSelectNetease: () => void;
}

export default function MusicProviderModal({ isOpen, onClose, onSelectSpotify, onSelectNetease }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative z-10 bg-kyma-panel/90 backdrop-blur-2xl border border-kyma-text/8 rounded-[2rem] shadow-2xl w-full max-w-[420px] p-8 flex flex-col gap-6"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 text-kyma-text/40 hover:text-kyma-text transition-colors rounded-full hover:bg-kyma-text/5"
            >
              <X size={15} />
            </button>

            {/* Header */}
            <div className="text-center">
              <div className="w-12 h-12 bg-kyma-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-kyma-primary/20">
                <Music size={22} className="text-kyma-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-kyma-text mb-1.5">Connect Music Service</h2>
              <p className="text-[11px] text-kyma-text/40 uppercase tracking-widest font-medium">Choose your audio engine</p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {/* Spotify */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectSpotify}
                className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#1DB954]/8 border border-[#1DB954]/20 hover:bg-[#1DB954]/15 hover:border-[#1DB954]/40 transition-all"
              >
                {/* Spotify icon */}
                <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-[#1DB954]/30">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-kyma-text">Connect with Spotify</div>
                  <div className="text-[11px] text-kyma-text/40 mt-0.5">Requires Spotify Premium for browser playback</div>
                </div>
                <div className="ml-auto text-[#1DB954]/60 group-hover:text-[#1DB954] transition-colors">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>

              {/* NetEase */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectNetease}
                className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#e60026]/8 border border-[#e60026]/20 hover:bg-[#e60026]/15 hover:border-[#e60026]/40 transition-all"
              >
                {/* NetEase icon */}
                <div className="w-10 h-10 bg-[#e60026] rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-[#e60026]/30">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-kyma-text">连接网易云音乐</div>
                  <div className="text-[11px] text-kyma-text/40 mt-0.5">NetEase Cloud Music · 支持免费账户</div>
                </div>
                <div className="ml-auto text-[#e60026]/60 group-hover:text-[#e60026] transition-colors">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            </div>

            {/* Footer note */}
            <p className="text-center text-[10px] text-kyma-text/25 leading-relaxed">
              Your choice is saved locally and can be changed anytime from the footer.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
