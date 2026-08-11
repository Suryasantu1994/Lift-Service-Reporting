import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { LogIn, ShieldCheck, ExternalLink } from 'lucide-react';

export default function Login() {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log('Attempting login...');
      await signInWithPopup(auth, provider);
      console.log('Login successful');
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/popup-blocked') {
        alert('The sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore user cancellation
      } else {
        alert(`Login failed: ${error.message}. Please try again.`);
      }
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-12 text-center border border-slate-100">
        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <ShieldCheck className="w-10 h-10 text-emerald-600" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
          LIFT SERVICE DASHBOARD
        </h1>
        <div className="mb-12">
          <p className="text-slate-500 font-medium leading-relaxed">
            Directorate of Hospitality
          </p>
          <p className="text-emerald-600 font-bold">GITAM Deemed to be University</p>
        </div>

        {isInIframe ? (
          <div className="space-y-4">
            <button
              onClick={openInNewTab}
              className="w-full flex items-center justify-center gap-4 bg-emerald-600 text-white py-4 px-6 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 group"
            >
              <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Open in New Tab
            </button>
            <p className="text-xs text-slate-400 font-medium px-4">
              Authentication requires a new window to securely verify your GITAM identity.
            </p>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Sign in with Google
          </button>
        )}

        <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          SECURE ACCESS ONLY
        </p>
      </div>
    </div>
  );
}
