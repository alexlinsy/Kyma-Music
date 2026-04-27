'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Music, Ban, User } from 'lucide-react';

interface TasteOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    likedGenres: string[];
    likedArtists: string[];
    dislikedGenres: string[];
  };
  onSave: (data: any) => void;
}

export default function TasteOnboarding({ isOpen, onClose, initialData, onSave }: TasteOnboardingProps) {
  const [likedGenres, setLikedGenres] = useState(initialData?.likedGenres?.join(', ') || '');
  const [likedArtists, setLikedArtists] = useState(initialData?.likedArtists?.join(', ') || '');
  const [dislikedGenres, setDislikedGenres] = useState(initialData?.dislikedGenres?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const data = {
      likedGenres: likedGenres.split(',').map(s => s.trim()).filter(s => s),
      likedArtists: likedArtists.split(',').map(s => s.trim()).filter(s => s),
      dislikedGenres: dislikedGenres.split(',').map(s => s.trim()).filter(s => s),
    };
    
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        onSave(data);
        onClose();
      }
    } catch (error) {
      console.error("Failed to save taste:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-[calc(100%-1.5rem)] sm:w-full max-w-lg bg-kyma-panel border border-kyma-text/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[85vh] text-kyma-text custom-scrollbar"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-kyma-primary/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-kyma-primary/10 rounded-xl">
                  <Sparkles size={20} className="text-kyma-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-kyma-text tracking-tight">Tune Your Brain</h2>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Musical Taste Corpus</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-kyma-text/80 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Liked Genres */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  <Music size={14} className="text-kyma-primary" />
                  Favorite Genres
                </label>
                <textarea 
                  value={likedGenres}
                  onChange={(e) => setLikedGenres(e.target.value)}
                  placeholder="Jazz, Alternative, Techno, 80's City Pop..."
                  className="w-full bg-kyma-text/5 border border-kyma-text/5 rounded-2xl p-4 text-sm text-kyma-text focus:outline-none focus:border-kyma-primary/50 transition-all min-h-[80px] resize-none placeholder:text-kyma-text/40"
                />
              </div>

              {/* Liked Artists */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  <User size={14} className="text-kyma-primary" />
                  Key Artists
                </label>
                <textarea 
                  value={likedArtists}
                  onChange={(e) => setLikedArtists(e.target.value)}
                  placeholder="Daft Punk, Miles Davis, FKJ..."
                  className="w-full bg-kyma-text/5 border border-kyma-text/5 rounded-2xl p-4 text-sm text-kyma-text focus:outline-none focus:border-kyma-primary/50 transition-all min-h-[80px] resize-none placeholder:text-kyma-text/40"
                />
              </div>

              {/* Disliked */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  <Ban size={14} className="text-rose-500/70" />
                  Avoid These Styles
                </label>
                <input 
                  type="text"
                  value={dislikedGenres}
                  onChange={(e) => setDislikedGenres(e.target.value)}
                  placeholder="Rap, EDM, Heavy Metal..."
                  className="w-full bg-kyma-text/5 border border-kyma-text/5 rounded-2xl px-4 py-3 text-sm text-kyma-text focus:outline-none focus:border-rose-500/30 transition-all placeholder:text-kyma-text/40"
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full mt-10 py-4 bg-kyma-primary text-white rounded-2xl font-bold shadow-lg shadow-kyma-primary/20 hover:brightness-90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? 'Updating Brain...' : 'Save & Start Listening'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
