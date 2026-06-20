/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Beranda from './components/Beranda';
import VerifikasiForm from './components/VerifikasiForm';
import RiwayatKPM from './components/RiwayatKPM';
import DashboardAdmin from './components/DashboardAdmin';
import { VerifikasiPKH } from './types';
import { 
  Heart, ShieldAlert, CheckCircle, ExternalLink, Activity, Info, BarChart3, 
  Search, FileText, User, Users, Compass, HelpCircle, Sparkles, LogOut, Link
} from 'lucide-react';
import { googleSignIn, logout, initAuth, isFirebaseConfigured } from './utils/firebase';
import { User as FirebaseUser } from 'firebase/auth';

type AppView = 'beranda' | 'wizard' | 'riwayat' | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('beranda');
  const [adminInitialTab, setAdminInitialTab] = useState<'monitoring' | 'validasi' | 'master' | 'rekap' | 'riwayat'>('monitoring');
  
  // Realtime Production vs Demo mode switch state stored locally
  const [isProduction, setIsProduction] = useState<boolean>(() => {
    return isFirebaseConfigured() && localStorage.getItem('pkh_production_mode') !== 'false';
  });

  const handleToggleProduction = (productionVal: boolean) => {
    if (productionVal && !isFirebaseConfigured()) {
      alert('Sistem Firebase belum dikonfigurasi atau belum terhubung.\n\nHarap jalankan Setup Firebase di panel samping kanan AI Studio terlebih dahulu untuk memulai Mode Live!');
      return;
    }
    setIsProduction(productionVal);
    localStorage.setItem('pkh_production_mode', productionVal ? 'true' : 'false');
    window.dispatchEvent(new Event('storage'));
  };

  const [portalRole, setPortalRole] = useState<'public' | 'admin'>(() => {
    if (typeof window === 'undefined') return 'public';
    const queryParams = new URLSearchParams(window.location.search);
    const isHashAdmin = window.location.hash.toLowerCase().includes('admin');
    const isQueryAdmin = queryParams.get('portal') === 'admin' || queryParams.get('role') === 'admin';
    return (isQueryAdmin || isHashAdmin) ? 'admin' : 'public';
  });

  useEffect(() => {
    const handleURLChange = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const isHashAdmin = window.location.hash.toLowerCase().includes('admin');
      const isQueryAdmin = queryParams.get('portal') === 'admin' || queryParams.get('role') === 'admin';
      const role = (isQueryAdmin || isHashAdmin) ? 'admin' : 'public';
      setPortalRole(role);
      
      if (role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView((prev) => (prev === 'admin' ? 'beranda' : prev));
      }
    };

    window.addEventListener('popstate', handleURLChange);
    window.addEventListener('hashchange', handleURLChange);
    
    // Call initially
    handleURLChange();
    
    return () => {
      window.removeEventListener('popstate', handleURLChange);
      window.removeEventListener('hashchange', handleURLChange);
    };
  }, []);
  
  // High-level states passed or shared between screens
  const [prepopulatedKK, setPrepopulatedKK] = useState<string>('');
  
  // Status banner for newly submitted verifications
  const [submissionSuccessInfo, setSubmissionSuccessInfo] = useState<VerifikasiPKH[] | null>(null);

  // Authentication & Session States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      const errStr = JSON.stringify(err) + " " + String(err?.message || err || '');
      const isPopupError = errStr.toLowerCase().includes('popup-blocked') || 
                           errStr.toLowerCase().includes('cancelled-popup-request') || 
                           errStr.toLowerCase().includes('popup') ||
                           errStr.toLowerCase().includes('cancelled') ||
                           errStr.toLowerCase().includes('closed-by-user');
      if (isPopupError) {
        setAuthError('popup-blocked');
      } else {
        setAuthError(err?.message || String(err));
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartVerif = (kkCode = '') => {
    setPrepopulatedKK(kkCode);
    setSubmissionSuccessInfo(null);
    setCurrentView('wizard');
  };

  const handleWizardSuccess = (submittedReports: VerifikasiPKH[]) => {
    setSubmissionSuccessInfo(submittedReports);
    // Automatically transition to the history or stay to show the congratulations modal
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* Dynamic Iframe Sandbox Assistant Banner */}
      {isInIframe && !user && (
        <div id="iframe-helper-notice" className="bg-amber-500 text-white text-xs font-bold py-2.5 px-4 shadow-sm z-50 text-center flex items-center justify-center gap-1.5 border-b border-amber-600/20">
          <span>💡</span>
          <span>
            Aplikasi berjalan di pratinjau AI Studio. Jika koneksi Drive dilarang/diblokir, mohon
          </span>
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-amber-100 font-extrabold flex items-center gap-0.5 whitespace-nowrap"
          >
            Buka di Tab Baru <ExternalLink className="w-3 h-3 inline ml-0.5" />
          </a>
          <span>agar peramban mengizinkan popup autentikasi Google.</span>
        </div>
      )}

      {/* Top Main Navigation Header Bar */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div 
            onClick={() => { setCurrentView('beranda'); setSubmissionSuccessInfo(null); }} 
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-700/10 group-hover:scale-105 transition-all">
              🩺
            </div>
            <div>
              <div className="font-extrabold text-sm md:text-base text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                <span>PKH <span className="text-emerald-600">Kesehatan</span></span>
                {portalRole === 'admin' ? (
                  <span className="text-[10px] py-0.5 px-2 bg-indigo-50 text-indigo-805 font-extrabold border border-indigo-200 rounded-full">
                    Admin Portal 🛠️
                  </span>
                ) : (
                  <span className="text-[10px] py-0.5 px-2 bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-250 rounded-full">
                    Mandiri
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-1 tracking-wider uppercase">Kecamatan Baki</span>
            </div>
          </div>

          {/* Core Navigation Items & Auth Panel */}
          <div className="flex items-center gap-3.5">
            <nav className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm font-bold">
              <button
                id="nav-beranda"
                onClick={() => { setCurrentView('beranda'); setSubmissionSuccessInfo(null); }}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'beranda' 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Compass className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Beranda</span>
              </button>

              <button
                id="nav-wizard"
                onClick={() => handleStartVerif('')}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'wizard' 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Activity className="w-4 h-4 text-amber-600" />
                <span>Verifikasi Mandiri</span>
              </button>

              {portalRole === 'admin' && (
                <button
                  id="nav-admin"
                  onClick={() => { setAdminInitialTab('monitoring'); setCurrentView('admin'); setSubmissionSuccessInfo(null); }}
                  className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'admin' 
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Admin Portal 📊</span>
                </button>
              )}
            </nav>

            <div className="h-5 w-[1px] bg-slate-200 hidden md:block"></div>

            {/* Live cloud database indicator */}
            {authLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin"></div>
            ) : user ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-extrabold text-emerald-800 text-[11px] tracking-wide uppercase">
                  Google Drive Live
                </span>
                <button
                  onClick={handleSignOut}
                  title="Putuskan Hubungan Google Drive"
                  className="p-1 ml-1 text-emerald-600 hover:text-red-650 rounded-full hover:bg-emerald-100/50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-850 text-white font-extrabold text-[11px] rounded-xl shadow-md cursor-pointer transition duration-150 transform hover:-translate-y-0.5"
              >
                <span className="bg-white text-emerald-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">G</span>
                <span>Hubungkan Drive ☁️</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Render current subview depending on active select state */}
        {currentView === 'beranda' && (
          <Beranda 
            onStartVerification={() => handleStartVerif('')}
            onGoToRiwayat={() => {
              setAdminInitialTab('riwayat');
              setCurrentView('admin');
            }}
            onGoToAdmin={() => setCurrentView('admin')}
            portalRole={portalRole}
          />
        )}

        {currentView === 'wizard' && (
          <VerifikasiForm 
            onSuccess={handleWizardSuccess}
            onCancel={() => setCurrentView('beranda')}
            prepopulatedKK={prepopulatedKK}
            isProduction={isProduction}
          />
        )}

        {currentView === 'admin' && (
          <DashboardAdmin 
            onBackToHome={() => setCurrentView('beranda')}
            onSelectKKForKPM={(kkCode) => {
              handleStartVerif(kkCode);
            }}
            isProduction={isProduction}
            onToggleProduction={handleToggleProduction}
            initialSubTab={adminInitialTab}
            initialKK={prepopulatedKK}
          />
        )}

      </main>

      {/* SUCCESS SUBMISSION DISPLAYER MODAL DIALOG */}
      {submissionSuccessInfo && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-emerald-100 animate-in fade-in-50 zoom-in-95 duration-200">
            
            {/* Modal Header banner */}
            <div className="bg-emerald-750 p-6 text-center text-white space-y-2">
              <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center text-3xl mx-auto border border-white/20">
                🎉
              </div>
              <h4 className="text-xl font-extrabold tracking-tight">Kirim Verifikasi Berhasil!</h4>
              <p className="text-emerald-150 text-xs">
                Sistem berhasil menyimpan seluruh komponen otomatis ke Master Data KPM PKH.
              </p>
            </div>

            {/* Modal Content Summary info */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Penerima Manfaat / No. KK</span>
                <div className="flex items-center justify-between text-slate-800">
                  <span className="font-mono font-bold text-indigo-850 text-sm">
                    {submissionSuccessInfo[0]?.NomorKK}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold py-0.5 px-2 rounded-full border border-emerald-200">
                    {submissionSuccessInfo[0]?.JenisPeriode} Pelaporan
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5 space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Laporan Dibentuk:</span>
                <div className="space-y-1.5">
                  {submissionSuccessInfo.map((rep, index) => (
                    <div key={rep.VerifikasiID} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-150">
                      <div>
                        <span className="font-bold text-slate-800">Laporan #{index + 1}: {rep.BulanPelaporan} {rep.TahunPelaporan}</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Status: <strong className="text-indigo-805">Tersubmit (Menunggu Validasi)</strong></div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-[11px] bg-white px-2 py-0.5 rounded border">
                        {rep.NomorLaporan}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl leading-relaxed text-[11px]">
                <strong>Informasi Verifikator:</strong> Laporan Anda sekarang terdaftar secara aman di database. Pendamping wilayah Anda akan menginstruksikan persetujuan dalam 2-3 hari kerja.
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSubmissionSuccessInfo(null);
                  setCurrentView('beranda');
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer text-slate-700 transition"
              >
                Kembali ke Beranda
              </button>
              <button
                onClick={() => {
                  const targetKK = submissionSuccessInfo[0]?.NomorKK;
                  setSubmissionSuccessInfo(null);
                  // Redirect to history with filters configured for this KK inside admin panel
                  setPrepopulatedKK(targetKK);
                  setAdminInitialTab('riwayat');
                  setCurrentView('admin');
                }}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-sm"
              >
                Lihat di Riwayat Laporan 📋
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Humble and Authentic Portal Footer */}
      <footer className="bg-white border-t border-slate-150 py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-400 font-medium">
          <div className="space-y-1">
            <p className="text-slate-600 font-bold">Aplikasi Verifikasi Kesehatan Mandiri PKH</p>
            <p>Dikembangkan untuk mempermudah pendaftaran laporan Keluarga Penerima Manfaat PKH.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 shadow-sm">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Mode Sistem:</span>
                <button
                  onClick={() => handleToggleProduction(!isProduction)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all border cursor-pointer shadow-sm ${
                    isProduction 
                      ? 'bg-emerald-500 text-white border-emerald-600 font-black' 
                      : 'bg-indigo-100 text-indigo-850 hover:bg-indigo-200 border-indigo-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${isProduction ? 'bg-white animate-pulse' : 'bg-indigo-505'}`}></span>
                  {isProduction ? 'MODE LIVE / PRODUKSI 🚀' : 'MODE DEMO & SOSIALISASI ✨'}
                </button>
              </div>
            )}
            {user && <span className="text-slate-300">|</span>}
            <span>Pendamping Kecamatan Baki © 2026</span>
          </div>
        </div>
      </footer>

      {/* MODAL ERROR AUTENTIKASI / POPUP BLOCKED */}
      {authError && (
        <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-red-100 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-red-50 p-5 border-b border-red-100 flex items-start gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl text-red-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-950 tracking-tight">Koneksi Drive Terblokir</h4>
                <p className="text-[10px] text-red-700/80 font-bold uppercase tracking-wide">
                  {authError === 'popup-blocked' ? 'Browser Popup Blocked Detected' : 'Authentication Failure'}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs leading-relaxed text-slate-650">
              {authError === 'popup-blocked' ? (
                <>
                  <p>
                    Peramban Anda mendeteksi upaya pembukaan jendela baru (popup login) dari dalam **iframe pratinjau** AI Studio, dan memblokirnya demi alasan keamanan.
                  </p>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-250 text-[11px] text-amber-900 font-medium">
                    <p className="font-extrabold mb-1 flex items-center gap-1.5 text-amber-950">
                      <Info className="w-3.5 h-3.5 text-amber-700" /> Solusi Termudah:
                    </p>
                    Klik tombol <strong>Buka di Tab Baru ↗️</strong> di bawah untuk memuat aplikasi di tab mandiri sendiri, lalu klik kembali tombol <strong>Hubungkan Drive</strong>.
                  </div>
                </>
              ) : (
                <p>
                  Gagal menghubungkan akun Google Anda: <code className="block bg-slate-50 border p-2 rounded mt-2 font-mono text-[10px] text-red-700 break-all">{authError}</code>
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setAuthError(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-extrabold rounded-lg cursor-pointer text-slate-700 transition"
              >
                Tutup
              </button>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAuthError(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                <span>Buka di Tab Baru ↗️</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
