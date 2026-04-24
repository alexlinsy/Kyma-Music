'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Plus, Trash2, Save } from 'lucide-react';

interface Routine {
  time: string;
  activity: string;
  musicStyle: string;
}

interface RoutineSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoutineSettings({ isOpen, onClose }: RoutineSettingsProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/user/routines')
        .then(res => res.json())
        .then(data => setRoutines(data.routines || []));
    }
  }, [isOpen]);

  const addRoutine = () => {
    setRoutines([...routines, { time: '08:00', activity: 'Coffee', musicStyle: 'Jazz' }]);
  };

  const removeRoutine = (index: number) => {
    setRoutines(routines.filter((_, i) => i !== index));
  };

  const updateRoutine = (index: number, field: keyof Routine, value: string) => {
    const next = [...routines];
    next[index] = { ...next[index], [field]: value };
    setRoutines(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/user/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routines })
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-[#181818] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0075de]/10 rounded-xl text-[#0075de]"><Clock size={20} /></div>
                <h2 className="text-xl font-bold text-white">Daily Routines</h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
              {routines.map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <input type="time" value={r.time} onChange={e => updateRoutine(i, 'time', e.target.value)} className="bg-transparent text-white font-mono text-sm focus:outline-none" />
                  <input type="text" placeholder="Activity" value={r.activity} onChange={e => updateRoutine(i, 'activity', e.target.value)} className="bg-transparent text-white text-sm flex-1 focus:outline-none border-b border-white/10" />
                  <input type="text" placeholder="Music Style" value={r.musicStyle} onChange={e => updateRoutine(i, 'musicStyle', e.target.value)} className="bg-transparent text-[#0075de] text-sm flex-1 focus:outline-none border-b border-white/10" />
                  <button onClick={() => removeRoutine(i)} className="text-zinc-600 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={addRoutine} className="flex-1 py-3 bg-white/5 text-zinc-300 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Add Time Block
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-3 bg-[#0075de] text-white rounded-xl font-bold hover:bg-[#005bab] transition-all flex items-center justify-center gap-2">
                {isSaving ? 'Saving...' : <><Save size={18} /> Save Routine</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
