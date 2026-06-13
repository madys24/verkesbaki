/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Search, Users, Activity, Calendar, Camera, CheckCircle2, FileText, BarChart3, HelpCircle, 
  ArrowRight, ShieldCheck, Heart, AlertCircle
} from 'lucide-react';

interface BerandaProps {
  onStartVerification: () => void;
  onGoToRiwayat: () => void;
  onGoToAdmin: () => void;
  portalRole?: 'public' | 'admin';
}

export default function Beranda({ onStartVerification, onGoToRiwayat, onGoToAdmin, portalRole = 'public' }: BerandaProps) {
  // Configured colors & icons exactly as requested
  const guidelines = [
    {
      id: 'step-1',
      title: 'Pencarian KK',
      icon: <Search className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
      badgeColor: 'bg-blue-600 text-white',
      badge: '🔍',
      desc: 'Masukkan 16 digit Nomor KK Anda untuk mengambil profil dari Master Data.'
    },
    {
      id: 'step-2',
      title: 'Profil Keluarga',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      badgeColor: 'bg-green-700 text-white',
      badge: '👨‍👩‍👧‍👦',
      desc: 'Sistem otomatis menampilkan detail alamat dan nama Penerima Manfaat.'
    },
    {
      id: 'step-3',
      title: 'Komponen Kesehatan',
      icon: <Activity className="w-6 h-6" />,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      badgeColor: 'bg-amber-600 text-white',
      badge: '🩺',
      desc: 'Membaca otomatis jumlah Ibu Hamil, Balita, Lansia, atau Disabilitas terdaftar.'
    },
    {
      id: 'step-4',
      title: 'Periode Verifikasi',
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      badgeColor: 'bg-purple-600 text-white',
      badge: '📅',
      desc: 'Pilih pelaporan Bulanan atau Triwulan (menghasilkan 3 laporan sekaligus).'
    },
    {
      id: 'step-5',
      title: 'Upload Dokumen',
      icon: <Camera className="w-6 h-6" />,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      badgeColor: 'bg-emerald-600 text-white',
      badge: '📷',
      desc: 'Unggah bukti kegiatan Posyandu/Kesehatan dan foto form verifikasi fisik.'
    },
    {
      id: 'step-6',
      title: 'Submit Verifikasi',
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'bg-emerald-900 border-emerald-800 text-emerald-100 hover:bg-emerald-800',
      badgeColor: 'bg-emerald-500 text-white',
      badge: '✅',
      desc: 'Daftar resi laporan dibuat otomatis per komponen sesuai dengan format resmi.'
    },
    {
      id: 'step-7',
      title: 'Riwayat Laporan',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
      badgeColor: 'bg-slate-600 text-white',
      badge: '📋',
      desc: 'Pantau status penyerahan laporan kapan saja berdasarkan Nomor KK.'
    },
    {
      id: 'step-8',
      title: 'Dashboard Admin',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-blue-900 border-blue-800 text-blue-100 hover:bg-blue-800',
      badgeColor: 'bg-blue-500 text-white',
      badge: '📊',
      desc: 'Khusus Petugas / Pendamping PKH untuk me-validasi dokumen dan rekap wilayah.'
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Header Card */}
      <div id="hero-pkh" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 to-emerald-950 p-8 md:p-12 text-white shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none md:block hidden">
          <Heart className="w-64 h-64 text-teal-300" />
        </div>
        
        <div className="max-w-2xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Kementerian Sosial RI – Program Keluarga Harapan</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Verifikasi Kesehatan <span className="text-emerald-400">PKH Mandiri</span>
          </h1>

          <p className="text-teal-100 text-base md:text-lg leading-relaxed">
            Laporkan kehadiran dan pemenuhan kriteria kesehatan keluarga Anda secara mandiri berkelanjutan. 
            Sistem otomatis menggunakan data KK terdaftar Anda tanpa perlu entri manual yang rumit.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              id="btn-mulai-verif"
              onClick={onStartVerification}
              className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-900 font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              Mulai Verifikasi Mandiri
              <ArrowRight className="w-5 h-5 text-neutral-900" />
            </button>
            <button
              id="btn-cek-riwayat"
              onClick={onGoToRiwayat}
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-all cursor-pointer"
            >
              Cek Riwayat Laporan
            </button>
          </div>
        </div>
      </div>

      {/* Info Warning Bar */}
      <div id="notice-kk" className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm leading-relaxed">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm">
          <strong>Perhatian:</strong> Pastikan Nomor KK Anda terdaftar di <strong>Master Data KPM Pendamping Desa</strong>. Jika nomor KK tidak ditemukan, silakan hubungi Pendamping PKH setempat untuk sinkronisasi data.
        </p>
      </div>

      {/* Visual Guideline Section */}
      <div id="panduan-alir" className="space-y-6">
        <div className="text-center md:text-left space-y-2">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            Panduan Langkah Pelaporan & Sistem Verifikasi
          </h2>
          <p className="text-slate-500 text-sm">
            Garis alur sistematis dari awal pencarian No KK, pembentukan resi otomatis, hingga rekapitulasi data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {guidelines
            .filter((g) => portalRole === 'admin' ? true : g.id !== 'step-8')
            .map((guide, i) => (
              <div 
                id={`guide-card-${guide.id}`}
                key={guide.id}
                className={`flex flex-col h-full rounded-xl p-5 border transition-all duration-200 cursor-pointer ${guide.color} shadow-sm group`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-sm ${guide.badgeColor} font-mono font-bold text-sm`}>
                    {i + 1}
                  </span>
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-200">
                    {guide.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-2">{guide.title}</h3>
                <p className="text-xs leading-relaxed opacity-85 mt-auto">
                  {guide.desc}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Short quick actions footer - Only visible in Admin Portal */}
      {portalRole === 'admin' && (
        <div id="quick-action-links" className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-800">Butuh bantuan administrasi atau ingin memperbarui data KPM?</p>
            <p className="text-xs">Hubungi operator dinas sosial terpadu atau masuk ke Dashboard Admin pendamping.</p>
          </div>
          <button
            id="btn-buka-admin"
            onClick={onGoToAdmin}
            className="px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 border border-teal-700 text-teal-50 text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm"
          >
            Masuk Dashboard Admin 📊
          </button>
        </div>
      )}
    </div>
  );
}
