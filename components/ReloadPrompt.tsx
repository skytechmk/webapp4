import React from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RotateCcw, X } from 'lucide-react';

export const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      // Optional: Check for updates every hour
      if (r) {
          setInterval(() => {
            r.update();
          }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-3 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-sm">
          {offlineReady ? 'App ready to work offline' : 'New content available, click on reload button to update.'}
        </h3>
        <button onClick={close} className="text-slate-400 hover:text-white">
            <X size={16} />
        </button>
      </div>
      
      {needRefresh && (
        <button 
          onClick={() => updateServiceWorker(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
           <RotateCcw size={16} /> Reload & Update
        </button>
      )}
    </div>
  );
};