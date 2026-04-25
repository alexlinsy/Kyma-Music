'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader } from 'lucide-react';

interface MoodSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MoodSettings: React.FC<MoodSettingsProps> = ({ isOpen, onClose }) => {
  const [rules, setRules] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/user/mood-rules')
        .then(res => res.json())
        .then(data => {
          setRules(data.content);
          setIsLoading(false);
        })
        .catch(() => {
          setRules('// Could not load mood rules...');
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    await fetch('/api/user/mood-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: rules }),
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-kyma-panel border border-kyma-text/10 rounded-2xl w-full max-w-2xl shadow-2xl text-kyma-text transition-colors duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Mood Rules</h2>
                <p className="text-sm text-zinc-400 mt-1">Define how Kyma reacts to different vibes and environments.</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader className="animate-spin text-zinc-500" />
                </div>
              ) : (
                <textarea
                  className="w-full h-64 bg-black/40 p-4 rounded-xl border border-kyma-text/10 focus:ring-2 focus:ring-kyma-primary focus:outline-none font-mono text-sm resize-none custom-scrollbar"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder={"- On rainy days: Play more Jazz\\n- After 6pm: Play some Disco or Funk"}
                />
              )}
            </div>
            <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 text-sm font-bold bg-kyma-primary text-white rounded-lg hover:brightness-90 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <><Loader size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Rules</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MoodSettings;
