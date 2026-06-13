/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Users, Activity, Calendar, Camera, CheckCircle2, 
  ArrowRight, ArrowLeft, Upload, RotateCcw, AlertTriangle, FileText, Check, ShieldAlert,
  Baby, Accessibility, Heart
} from 'lucide-react';
import { MockDatabase } from '../data/mockDb';
import { MasterKPM, VerifikasiPKH } from '../types';
import { getMonthsForTriwulan } from '../utils/triwulan';
import { DBService } from '../utils/dbService';

interface VerifikasiFormProps {
  onSuccess: (reports: VerifikasiPKH[]) => void;
  onCancel: () => void;
  prepopulatedKK?: string;
  isProduction?: boolean;
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const getDateLimitsForMonth = (bulanName: string, year: number) => {
  const monthIdx = INDO_MONTHS.indexOf(bulanName);
  if (monthIdx === -1) {
    return { min: '', max: '', def: `${year}-01-01` };
  }
  const pad = (n: number) => n.toString().padStart(2, '0');
  const monthNumStr = pad(monthIdx + 1);
  const min = `${year}-${monthNumStr}-01`;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const max = `${year}-${monthNumStr}-${pad(lastDay)}`;
  
  // Choose default day in month: use today if today falls in the target month and year,
  // otherwise default to the 15th
  const today = new Date();
  let def = `${year}-${monthNumStr}-15`;
  if (today.getFullYear() === year && today.getMonth() === monthIdx) {
    def = today.toISOString().split('T')[0];
  }
  return { min, max, def };
};

export default function VerifikasiForm({ onSuccess, onCancel, prepopulatedKK = '', isProduction = false }: VerifikasiFormProps) {
  // Navigation steps: 1 (Search KK), 2 (Select Periode), 3 (Input Form & Member Names), 4 (Upload & Submit)
  const [step, setStep] = useState(1);
  const [searchKK, setSearchKK] = useState(prepopulatedKK);
  const [foundKPM, setFoundKPM] = useState<MasterKPM | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Step 2 Form States
  const [jenisPeriode, setJenisPeriode] = useState<'Bulanan' | 'Triwulanan'>('Bulanan');
  const [selectedBulan, setSelectedBulan] = useState('Juni');
  const [selectedTriwulan, setSelectedTriwulan] = useState('Triwulan II (April-Juni)');
  const [selectedTahun, setSelectedTahun] = useState(2026);

  // Step 3 & 4 Form States (Individual Member Forms)
  interface IndividualMemberForm {
    jenisKomponen: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
    label: string; // e.g. "Ibu Hamil ke-1"
    namaAnggota: string;
    tanggalEntry: string;
    catatan: string;
    fotoKegiatan: string;
    fotoKegiatanName: string;
    fotoForm: string;
    fotoFormName: string;
    bulan: string;
    memberIndex: number;
  }

  const [memberForms, setMemberForms] = useState<IndividualMemberForm[]>([]);
  const [activeMemberTab, setActiveMemberTab] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessReports, setSubmitSuccessReports] = useState<VerifikasiPKH[]>([]);

  // List of active KPMs from mockDB for easy testing autocomplete
  const [allKPMs, setAllKPMs] = useState<MasterKPM[]>([]);
  useEffect(() => {
    const fetchKPMs = async () => {
      try {
        const list = await DBService.getKPMList();
        setAllKPMs(list);
      } catch (err) {
        console.error("Gagal memuat KPM dari cloud:", err);
        setAllKPMs(MockDatabase.getMasterKPM());
      }
    };
    fetchKPMs();
  }, []);

  const initializeMemberForms = () => {
    if (!foundKPM) return;
    
    // Determine months to generate
    let monthsToGenerate: string[] = [];
    if (jenisPeriode === 'Bulanan') {
      monthsToGenerate = [selectedBulan];
    } else {
      monthsToGenerate = getMonthsForTriwulan(selectedTriwulan);
    }

    // Double check: if we already have the correct number of slots with correct months and year, don't clear!
    const expectedLength = (foundKPM.JumlahIbuHamil + foundKPM.JumlahBalita + foundKPM.JumlahLansia + foundKPM.JumlahDisabilitas) * monthsToGenerate.length;
    
    if (memberForms.length === expectedLength) {
      const allMonthsMatched = memberForms.every(form => monthsToGenerate.includes(form.bulan));
      const yearMatched = memberForms.every(form => form.tanggalEntry.startsWith(selectedTahun.toString()));
      if (allMonthsMatched && yearMatched) {
        return;
      }
    }

    // Helper to find pre-existing data (to preserve if they just went back and forth, or to keep names)
    const getExistingForm = (jenis: string, idx: number, b: string) => {
      const exactMatch = memberForms.find(f => f.jenisKomponen === jenis && f.memberIndex === idx && f.bulan === b);
      if (exactMatch) return exactMatch;
      const nameMatch = memberForms.find(f => f.jenisKomponen === jenis && f.memberIndex === idx);
      return nameMatch ? { namaAnggota: nameMatch.namaAnggota } : null;
    };

    const slots: IndividualMemberForm[] = [];

    monthsToGenerate.forEach((bulan) => {
      const { def } = getDateLimitsForMonth(bulan, selectedTahun);
      
      // Ibu Hamil
      for (let i = 0; i < foundKPM.JumlahIbuHamil; i++) {
        const existing = getExistingForm('Ibu Hamil', i, bulan);
        slots.push({
          jenisKomponen: 'Ibu Hamil',
          label: `Ibu Hamil ke-${i + 1} (${bulan})`,
          namaAnggota: existing?.namaAnggota || '',
          tanggalEntry: (existing as any)?.tanggalEntry && (existing as any).tanggalEntry.startsWith(selectedTahun.toString()) ? (existing as any).tanggalEntry : def,
          catatan: (existing as any)?.catatan || '',
          fotoKegiatan: (existing as any)?.fotoKegiatan || '',
          fotoKegiatanName: (existing as any)?.fotoKegiatanName || '',
          fotoForm: (existing as any)?.fotoForm || '',
          fotoFormName: (existing as any)?.fotoFormName || '',
          bulan: bulan,
          memberIndex: i
        });
      }
      // Balita
      for (let i = 0; i < foundKPM.JumlahBalita; i++) {
        const existing = getExistingForm('Balita', i, bulan);
        slots.push({
          jenisKomponen: 'Balita',
          label: `Balita ke-${i + 1} (${bulan})`,
          namaAnggota: existing?.namaAnggota || '',
          tanggalEntry: (existing as any)?.tanggalEntry && (existing as any).tanggalEntry.startsWith(selectedTahun.toString()) ? (existing as any).tanggalEntry : def,
          catatan: (existing as any)?.catatan || '',
          fotoKegiatan: (existing as any)?.fotoKegiatan || '',
          fotoKegiatanName: (existing as any)?.fotoKegiatanName || '',
          fotoForm: (existing as any)?.fotoForm || '',
          fotoFormName: (existing as any)?.fotoFormName || '',
          bulan: bulan,
          memberIndex: i
        });
      }
      // Lansia
      for (let i = 0; i < foundKPM.JumlahLansia; i++) {
        const existing = getExistingForm('Lansia', i, bulan);
        slots.push({
          jenisKomponen: 'Lansia',
          label: `Lansia ke-${i + 1} (${bulan})`,
          namaAnggota: existing?.namaAnggota || '',
          tanggalEntry: (existing as any)?.tanggalEntry && (existing as any).tanggalEntry.startsWith(selectedTahun.toString()) ? (existing as any).tanggalEntry : def,
          catatan: (existing as any)?.catatan || '',
          fotoKegiatan: (existing as any)?.fotoKegiatan || '',
          fotoKegiatanName: (existing as any)?.fotoKegiatanName || '',
          fotoForm: (existing as any)?.fotoForm || '',
          fotoFormName: (existing as any)?.fotoFormName || '',
          bulan: bulan,
          memberIndex: i
        });
      }
      // Disabilitas
      for (let i = 0; i < foundKPM.JumlahDisabilitas; i++) {
        const existing = getExistingForm('Disabilitas', i, bulan);
        slots.push({
          jenisKomponen: 'Disabilitas',
          label: `Disabilitas ke-${i + 1} (${bulan})`,
          namaAnggota: existing?.namaAnggota || '',
          tanggalEntry: (existing as any)?.tanggalEntry && (existing as any).tanggalEntry.startsWith(selectedTahun.toString()) ? (existing as any).tanggalEntry : def,
          catatan: (existing as any)?.catatan || '',
          fotoKegiatan: (existing as any)?.fotoKegiatan || '',
          fotoKegiatanName: (existing as any)?.fotoKegiatanName || '',
          fotoForm: (existing as any)?.fotoForm || '',
          fotoFormName: (existing as any)?.fotoFormName || '',
          bulan: bulan,
          memberIndex: i
        });
      }
    });

    setMemberForms(slots);
    setActiveMemberTab(0);
  };

  // Sync memberForms layout when foundKPM changes
  useEffect(() => {
    if (foundKPM) {
      initializeMemberForms();
    } else {
      setMemberForms([]);
    }
  }, [foundKPM]);

  // Convert File to Base64 String for preservation per member index
  const handleMemberPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number, type: 'kegiatan' | 'form') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = [...memberForms];
        if (type === 'kegiatan') {
          updated[index].fotoKegiatan = reader.result as string;
          updated[index].fotoKegiatanName = file.name;
        } else {
          updated[index].fotoForm = reader.result as string;
          updated[index].fotoFormName = file.name;
        }
        setMemberForms(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Camera Simulation for easy user testing per member index
  const simulateMemberCameraCapture = (index: number, type: 'kegiatan' | 'form') => {
    const mockImages = {
      kegiatan: [
        'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=650&q=80',
        'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=650&q=80',
        'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=650&q=80'
      ],
      form: [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=650&q=80',
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=650&q=80',
        'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=650&q=80'
      ]
    };

    const source = type === 'kegiatan' ? mockImages.kegiatan : mockImages.form;
    const randomImg = source[Math.floor(Math.random() * source.length)];
    
    const updated = [...memberForms];
    if (type === 'kegiatan') {
      updated[index].fotoKegiatan = randomImg;
      updated[index].fotoKegiatanName = `kamera_kegiatan_${Date.now()}.jpg`;
    } else {
      updated[index].fotoForm = randomImg;
      updated[index].fotoFormName = `kamera_form_pkh_${Date.now()}.jpg`;
    }
    setMemberForms(updated);
  };

  const handleMemberFieldChange = (index: number, field: 'namaAnggota' | 'tanggalEntry' | 'catatan', value: string) => {
    const updated = [...memberForms];
    updated[index][field] = value;
    
    // Auto-sync names across different months for the same family member
    if (field === 'namaAnggota') {
      const targetForm = updated[index];
      updated.forEach((form, idx) => {
        if (
          idx !== index &&
          form.jenisKomponen === targetForm.jenisKomponen &&
          form.memberIndex === targetForm.memberIndex
        ) {
          form.namaAnggota = value;
        }
      });
    }
    
    setMemberForms(updated);
  };

  const isMemberFormComplete = (m: IndividualMemberForm) => {
    return (
      m.namaAnggota.trim().length >= 2 &&
      m.tanggalEntry.trim().length > 0 &&
      m.catatan.trim().length >= 2 &&
      m.fotoKegiatan.trim().length > 0 &&
      m.fotoForm.trim().length > 0
    );
  };

  const areAllMemberFormsComplete = () => {
    return memberForms.length > 0 && memberForms.every(isMemberFormComplete);
  };

  const handleSearchKK = (kkInput: string) => {
    setSearchError('');
    setHasSearched(true);
    const num = kkInput.trim();
    if (!num) {
      setSearchError('Silakan masukkan Nomor KK terlebih dahulu.');
      return;
    }
    const kpm = allKPMs.find(k => k.NomorKK === num);
    if (kpm) {
      if (kpm.StatusKPM === 'Tidak Aktif') {
        setSearchError('Nomor KK ini terdaftar tetapi berstatus TIDAK AKTIF. Silakan laporkan ke Pendamping Desa.');
        setFoundKPM(null);
      } else if (kpm.TotalAgregatKomponen === 0) {
        setSearchError('Jumlah Komponen Kesehatan KPM ini bernilai 0. Verifikasi tidak dapat dilakukan secara mandiri.');
        setFoundKPM(null);
      } else {
        setFoundKPM(kpm);
      }
    } else {
      setSearchError('Nomor KK tidak ditemukan dalam Master Data KPM. Periksa kembali entri Anda.');
      setFoundKPM(null);
    }
  };

  const handleSelectKPMAutoComplete = (kpm: MasterKPM) => {
    setSearchKK(kpm.NomorKK);
    handleSearchKK(kpm.NomorKK);
  };

  // Compile individual slots mapping in linear order (for backward compatibility / references)
  const getComponentSlots = () => {
    if (!foundKPM) return [];
    const slots: { index: number; label: string; jenis: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas' }[] = [];
    let curIndex = 0;
    
    for (let i = 0; i < foundKPM.JumlahIbuHamil; i++) {
      slots.push({ index: curIndex++, label: `Ibu Hamil ke-${i+1}`, jenis: 'Ibu Hamil' });
    }
    for (let i = 0; i < foundKPM.JumlahBalita; i++) {
      slots.push({ index: curIndex++, label: `Balita ke-${i+1}`, jenis: 'Balita' });
    }
    for (let i = 0; i < foundKPM.JumlahLansia; i++) {
      slots.push({ index: curIndex++, label: `Lansia ke-${i+1}`, jenis: 'Lansia' });
    }
    for (let i = 0; i < foundKPM.JumlahDisabilitas; i++) {
      slots.push({ index: curIndex++, label: `Disabilitas ke-${i+1}`, jenis: 'Disabilitas' });
    }
    return slots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundKPM) return;

    if (!areAllMemberFormsComplete()) {
      alert('Mohon lengkapi seluruh formulir data dan upload foto untuk setiap anggota keluarga terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      const monthSelection = jenisPeriode === 'Bulanan' ? selectedBulan : selectedTriwulan;
      
      const newReports = await DBService.submitVerificationReport({
        kpm: foundKPM,
        jenisPeriode,
        bulanPilihan: monthSelection,
        tahun: selectedTahun,
        members: memberForms
      });

      setSubmitSuccessReports(newReports);
      setStep(5); // Receipt Step
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim verifikasi data. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAndExit = () => {
    onSuccess(submitSuccessReports);
  };

  const monthsList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const quartersList = [
    'Triwulan I (Januari-Maret)',
    'Triwulan II (April-Juni)',
    'Triwulan III (Juli-September)',
    'Triwulan IV (Oktober-Desember)'
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
      
      {/* Header Form Indicator */}
      <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center border-b border-slate-800">
        <div className="space-y-1">
          <h2 className="font-bold text-lg text-emerald-400">Verifikasi Mandiri Kesehatan KPM</h2>
          <p className="text-xs text-slate-400">Pastikan data yang diinput sesuai dengan bukti kegiatan asli lapangan.</p>
        </div>
        <button 
          id="btn-batalkan-form"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold tracking-wide transition-all cursor-pointer"
        >
          Kembali ke Beranda
        </button>
      </div>

      {/* Progress Tracker (only if not on receipt step) */}
      {step < 5 && (
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between overflow-x-auto gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-700'}`}>
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span className={`text-xs font-semibold ${step === 1 ? 'text-blue-700' : 'text-slate-500'}`}>Pencarian KK</span>
          </div>
          <div className="h-px bg-slate-300 flex-1 min-w-[20px]"></div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-purple-600 text-white' : step > 2 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
              {step > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </span>
            <span className={`text-xs font-semibold ${step === 2 ? 'text-purple-700' : 'text-slate-500'}`}>Periode</span>
          </div>
          <div className="h-px bg-slate-300 flex-1 min-w-[20px]"></div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? 'bg-amber-600 text-white' : step > 3 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
              {step > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
            </span>
            <span className={`text-xs font-semibold ${step === 3 ? 'text-amber-700' : 'text-slate-500'}`}>Isi Form & Nama</span>
          </div>
          <div className="h-px bg-slate-300 flex-1 min-w-[20px]"></div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              4
            </span>
            <span className={`text-xs font-semibold ${step === 4 ? 'text-emerald-700' : 'text-slate-500'}`}>Unggah Foto & Kirim</span>
          </div>
        </div>
      )}

      {/* STEP 1: PENCARIAN NOMOR KK */}
      {step === 1 && (
        <div id="step-1-pencarian" className="p-6 md:p-8 space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-center space-y-2">
              <span className="text-3xl">🔍</span>
              <h3 className="text-lg font-bold text-slate-800">Cari Nomor KK Terdaftar</h3>
              <p className="text-xs text-slate-500">
                Data divalidasi langsung terhadap Master Data KPM yang diinput oleh Pendamping PKH.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="search-kk-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Masukkan 16 Digit Nomor KK
              </label>
              <div className="relative">
                <input
                  id="search-kk-input"
                  type="text"
                  placeholder="327601xxxxxxxxxx"
                  value={searchKK}
                  onChange={(e) => setSearchKK(e.target.value)}
                  maxLength={16}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono text-base tracking-wider placeholder-slate-400"
                />
                <button
                  id="btn-search-trigger"
                  type="button"
                  onClick={() => handleSearchKK(searchKK)}
                  className="absolute right-2 top-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari KK
                </button>
              </div>
            </div>

            {searchError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900 text-xs leading-relaxed animate-pulse">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-bold">Pencarian Tidak Dapat Dilanjutkan</p>
                  <p>{searchError}</p>
                </div>
              </div>
            )}
          </div>



          {/* Succeeded Found KPM Profile */}
          {foundKPM && (
            <div id="found-kpm-profile" className="max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-green-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👨‍👩‍👧‍👦</span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Profil Penerima Manfaat Terdaftar</h4>
                    <p className="text-xs text-slate-500">KPM ID: {foundKPM.KPMID}</p>
                  </div>
                </div>
                <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valid & Terbuka</span>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 leading-normal">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Nomor KK</p>
                  <p className="font-mono font-bold text-slate-900 tracking-wider">{foundKPM.NomorKK}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Kepala Keluarga</p>
                  <p className="font-bold text-slate-900 text-sm">{foundKPM.NamaKepalaKeluarga}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Alamat Lengkap KPM</p>
                  <p className="text-xs text-slate-900 bg-white/70 p-2 rounded-lg border border-green-100">
                    {foundKPM.Alamat}, Desa/Kel. {foundKPM.Desa}, Kec. {foundKPM.Kecamatan}, {foundKPM.Kabupaten}
                  </p>
                </div>
              </div>

              {/* HEALTH COMPONENTS READ AUTOMATICALLY */}
              <div className="space-y-4 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 tracking-wide">
                  <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Ringkasan Komponen PKH Kesehatan Terdaftar
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm relative overflow-hidden group hover:border-emerald-250 hover:shadow-md transition-all">
                    <div className="mx-auto w-8 h-8 rounded-full bg-red-50 text-red-650 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Heart className="w-4.5 h-4.5 fill-red-100" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Ibu Hamil</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 my-1">{foundKPM.JumlahIbuHamil}</p>
                    <span className="inline-block text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Restriksi 🤰</span>
                  </div>
                  
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm relative overflow-hidden group hover:border-emerald-250 hover:shadow-md transition-all">
                    <div className="mx-auto w-8 h-8 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Baby className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Balita</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 my-1">{foundKPM.JumlahBalita}</p>
                    <span className="inline-block text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Tumbuh 👶</span>
                  </div>
                  
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm relative overflow-hidden group hover:border-emerald-250 hover:shadow-md transition-all">
                    <div className="mx-auto w-8 h-8 rounded-full bg-amber-50 text-amber-650 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Activity className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Lansia</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 my-1">{foundKPM.JumlahLansia}</p>
                    <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Lansia Sehat 👵</span>
                  </div>
                  
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm relative overflow-hidden group hover:border-emerald-250 hover:shadow-md transition-all">
                    <div className="mx-auto w-8 h-8 rounded-full bg-purple-50 text-purple-650 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Accessibility className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Disabilitas</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 my-1">{foundKPM.JumlahDisabilitas}</p>
                    <span className="inline-block text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Pendampingan ♿</span>
                  </div>
                </div>

                {/* Total aggregat indicator */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-bold text-emerald-950 shadow-sm transition-all hover:bg-emerald-500/15">
                  <span className="text-center sm:text-left text-slate-700 font-semibold text-sm">Total Agregat Komponen Kesehatan Terdaftar:</span>
                  <span className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-4 py-2 rounded-full text-base sm:text-lg md:text-xl font-mono font-black tracking-wider shadow-md flex items-center gap-1.5 shrink-0">
                    <span>👥</span>
                    <span>{foundKPM.TotalAgregatKomponen} Orang</span>
                  </span>
                </div>
              </div>

              {/* Start next action */}
              <div className="flex justify-end pt-2">
                <button
                  id="btn-next-step-1"
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  Langkah Berikutnya (Pilih Periode)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* STEP 2: PILIH PERIODE VERIFIKASI */}
      {step === 2 && foundKPM && (
        <div id="step-2-periode" className="p-6 md:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-3xl">📅</span>
            <h3 className="text-lg font-bold text-slate-800">Tentukan Periode Verifikasi Kesehatan</h3>
            <p className="text-xs text-slate-500">
              Periode menentukan jumlah dokumen rekapitulasi resi laporan verifikasi bulanan yang akan otomatis dirangkum oleh sistem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-2">
            {/* option Bulanan */}
            <button
              type="button"
              onClick={() => setJenisPeriode('Bulanan')}
              className={`p-6 rounded-2xl border text-left transition-all relative cursor-pointer flex flex-col justify-between h-56 ${
                jenisPeriode === 'Bulanan' 
                  ? 'border-purple-600 bg-purple-50 hover:bg-purple-50/80 shadow-md ring-2 ring-purple-500/20' 
                  : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⏳</span>
                  {jenisPeriode === 'Bulanan' && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Terpilih</span>}
                </div>
                <h4 className="font-bold text-base text-slate-800">Verifikasi Bulanan</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Menyerahkan pelaporan berkala untuk 1 bulan tertentu saja. Berguna jika Anda mengisi laporan secara rutin tiap bulan.
                </p>
              </div>
              <div className="text-xs text-purple-700 font-bold bg-purple-100 p-2 rounded-lg mt-auto text-center">
                Menghasilkan 1 laporan verifikasi tunggal
              </div>
            </button>

            {/* option Triwulanan */}
            <button
              type="button"
              onClick={() => setJenisPeriode('Triwulanan')}
              className={`p-6 rounded-2xl border text-left transition-all relative cursor-pointer flex flex-col justify-between h-56 ${
                jenisPeriode === 'Triwulanan' 
                  ? 'border-purple-600 bg-purple-50 hover:bg-purple-50/80 shadow-md ring-2 ring-purple-500/20' 
                  : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📊</span>
                  {jenisPeriode === 'Triwulanan' && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Terpilih</span>}
                </div>
                <h4 className="font-bold text-base text-slate-800">Verifikasi Triwulanan (Bulk)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sangat praktis! Memilih Triwulanan (3 bulan sekaligus) otomatis merekam 3 laporan berkala bulanan dalam sekali submit.
                </p>
              </div>
              <div className="text-xs text-emerald-800 font-bold bg-emerald-100 p-2 rounded-lg mt-auto text-center">
                Otomatis membuat 3 laporan bulanan sekaligus
              </div>
            </button>
          </div>

          {/* Time Picker Controls */}
          <div className="max-w-md mx-auto p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pilih Waktu Pelaporan:</h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Year Select */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Tahun</label>
                <select
                  value={selectedTahun}
                  onChange={(e) => setSelectedTahun(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  <option value={2026}>2026 (Sekarang)</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              {/* Dynamic Month/Quarter Selector */}
              {jenisPeriode === 'Bulanan' ? (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Bulan</label>
                  <select
                    value={selectedBulan}
                    onChange={(e) => setSelectedBulan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">Triwulan Ke-</label>
                  <select
                    value={selectedTriwulan}
                    onChange={(e) => setSelectedTriwulan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
                  >
                    {quartersList.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 font-medium">
              💡 {jenisPeriode === 'Bulanan' 
                ? `Anda akan mengisi verifikasi kesehatan untuk bulan ${selectedBulan} ${selectedTahun}.` 
                : `Anda akan mendaftarkan 3 laporan resmi bulanan untuk periode ${selectedTriwulan} ${selectedTahun}.`
              }
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex justify-between items-center max-w-2xl mx-auto pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <button
              id="btn-next-step-2"
              type="button"
              onClick={() => {
                initializeMemberForms();
                setStep(3);
              }}
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              Lanjutkan ke Form & Anggota
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: FORM VERIFIKASI SEPARATE PER KELUARGA */}
      {step === 3 && foundKPM && memberForms.length > 0 && (
        <div id="step-3-perekaman" className="p-6 md:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
            <h3 className="text-lg font-bold text-slate-800">Pelaporan Kesehatan Anggota Keluarga</h3>
            <p className="text-xs text-slate-500">
              Isilah data kesehatan untuk masing-masing anggota keluarga di bawah secara individual. Setiap anggota wajib memiliki data pemeriksaan dan unggahan berkas masing-masing.
            </p>
          </div>

          <div id="workspace-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Col: Interactive Navigation Tabs (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Daftar Komponen Kesehatan KPM:
              </p>
              
              <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                {memberForms.map((m, idx) => {
                  const isDone = isMemberFormComplete(m);
                  const isActive = activeMemberTab === idx;
                  const iconsMap = {
                    'Ibu Hamil': '🤰',
                    'Balita': '👶',
                    'Lansia': '👵',
                    'Disabilitas': '♿'
                  };
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMemberTab(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all shrink-0 md:shrink flex items-center justify-between gap-3 cursor-pointer ${
                        isActive 
                          ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-500/35' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">
                          {iconsMap[m.jenisKomponen] || '👤'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{m.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {m.namaAnggota ? m.namaAnggota : 'Belum isi nama...'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isDone ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Selesai
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Ada Isian
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Status overall count */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1 text-slate-600">
                <div className="flex justify-between items-center font-bold">
                  <span>Progres Pengisian:</span>
                  <span className="text-indigo-600 font-mono">
                    {memberForms.filter(isMemberFormComplete).length} / {memberForms.length} Anggota
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${(memberForms.filter(isMemberFormComplete).length / memberForms.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Active Form Editor Workspace (8 cols) */}
            <div id="selected-form-workspace" className="lg:col-span-8 bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 md:p-6 space-y-6 bg-white shadow-sm duration-150">
              
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Form Pelaporan {memberForms[activeMemberTab].jenisKomponen}
                  </span>
                  <h4 className="font-bold text-slate-800 text-base mt-1">
                    Isi Data {memberForms[activeMemberTab].label}
                  </h4>
                </div>
                <span className="text-2xl">
                  {memberForms[activeMemberTab].jenisKomponen === 'Ibu Hamil' ? '🤰' : memberForms[activeMemberTab].jenisKomponen === 'Balita' ? '👶' : memberForms[activeMemberTab].jenisKomponen === 'Lansia' ? '👵' : '♿'}
                </span>
              </div>

              {/* Grid: Name, Date, Note */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label id={`lbl-nama-anggota-${activeMemberTab}`} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Nama Lengkap Anggota Keluarga <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`input-nama-anggota-${activeMemberTab}`}
                      type="text"
                      required
                      placeholder="Contoh: Siti Aminah / Ahmad Budi"
                      value={memberForms[activeMemberTab].namaAnggota}
                      onChange={(e) => handleMemberFieldChange(activeMemberTab, 'namaAnggota', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold"
                    />
                    <p className="text-[10px] text-slate-400">Pastikan nama tertulis sesuai KTP atau buku Posyandu/KIA.</p>
                  </div>

                  {/* Date field */}
                  <div className="space-y-1">
                    <label id={`lbl-tanggal-entry-${activeMemberTab}`} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Tanggal Pemeriksaan PKH <span className="text-red-500">*</span>
                    </label>
                    {(() => {
                      const activeForm = memberForms[activeMemberTab];
                      const { min, max } = getDateLimitsForMonth(activeForm.bulan, selectedTahun);
                      return (
                        <input
                          id={`input-tanggal-entry-${activeMemberTab}`}
                          type="date"
                          required
                          min={min}
                          max={max}
                          value={activeForm.tanggalEntry}
                          onChange={(e) => handleMemberFieldChange(activeMemberTab, 'tanggalEntry', e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold"
                        />
                      );
                    })()}
                    <p className="text-[10px] text-slate-400 font-semibold">Tanggal dilaksanakannya kontrol kesehatan posyandu.</p>
                  </div>
                </div>

                {/* Note textarea */}
                <div className="space-y-1">
                  <label id={`lbl-catatan-${activeMemberTab}`} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Catatan Status Kesehatan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id={`input-catatan-${activeMemberTab}`}
                    rows={2}
                    required
                    placeholder="Tuliskan keterangan detail. Contoh: Ibu Hamil rutin minum vitamin Fe, Tensi 115/80. Balita BB 12kg tinggi 98cm sehat lengkap buku Posyandu."
                    value={memberForms[activeMemberTab].catatan}
                    onChange={(e) => handleMemberFieldChange(activeMemberTab, 'catatan', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Upload Documents per member card */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Unggah Dokumen Pendukung Berkas (Khusus {memberForms[activeMemberTab].label}):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Foto Kegiatan Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xl block">👶</span>
                      <h5 className="font-bold text-xs text-slate-800 mt-1">1. Foto Kegiatan Kesehatan</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Bukti kehadiran di posyandu, timbang anak, atau minum suplemen.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {memberForms[activeMemberTab].fotoKegiatan ? (
                        <div className="relative group bg-white p-1 rounded-lg border border-slate-300">
                          <img 
                            src={memberForms[activeMemberTab].fotoKegiatan} 
                            alt="Foto Kegiatan" 
                            className="w-full h-24 object-cover rounded"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...memberForms];
                              updated[activeMemberTab].fotoKegiatan = '';
                              updated[activeMemberTab].fotoKegiatanName = '';
                              setMemberForms(updated);
                            }}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full hover:bg-red-500 transition-colors shadow-sm cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-[9px] text-emerald-800 truncate mt-1.5 font-mono font-semibold">
                            ✓ {memberForms[activeMemberTab].fotoKegiatanName || 'Sudah Unggah'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 hover:border-indigo-600 rounded-lg cursor-pointer bg-white text-slate-400 hover:text-indigo-600 transition-all">
                            <Upload className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold">Pilih Berkas Foto</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleMemberPhotoUpload(e, activeMemberTab, 'kegiatan')}
                              className="hidden" 
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => simulateMemberCameraCapture(activeMemberTab, 'kegiatan')}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            Simpan Kamera HP 📱
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Foto Form Fisik Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xl block">📄</span>
                      <h5 className="font-bold text-xs text-slate-800 mt-1">2. Foto Form Fisik Verifikasi</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Lembar KIA/KMS/Capaian Posyandu yang dicap/ttd fasilitator kesehatan.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {memberForms[activeMemberTab].fotoForm ? (
                        <div className="relative group bg-white p-1 rounded-lg border border-slate-300">
                          <img 
                            src={memberForms[activeMemberTab].fotoForm} 
                            alt="Foto Form" 
                            className="w-full h-24 object-cover rounded"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...memberForms];
                              updated[activeMemberTab].fotoForm = '';
                              updated[activeMemberTab].fotoFormName = '';
                              setMemberForms(updated);
                            }}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full hover:bg-red-500 transition-colors shadow-sm cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-[9px] text-emerald-800 truncate mt-1.5 font-mono font-semibold">
                            ✓ {memberForms[activeMemberTab].fotoFormName || 'Sudah Unggah'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 hover:border-indigo-600 rounded-lg cursor-pointer bg-white text-slate-400 hover:text-indigo-600 transition-all">
                            <Upload className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold">Pilih Berkas Foto</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleMemberPhotoUpload(e, activeMemberTab, 'form')}
                              className="hidden" 
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => simulateMemberCameraCapture(activeMemberTab, 'form')}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            Simpan Kamera HP 📱
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Horizontal navigation at workspace footer */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (activeMemberTab > 0) {
                      setActiveMemberTab(activeMemberTab - 1);
                    } else {
                      setStep(2); // Go back to period selection
                    }
                  }}
                  className="px-4 py-2 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {activeMemberTab > 0 ? `Edit ${memberForms[activeMemberTab - 1].label}` : 'Kembali Ke Periode'}
                </button>

                {activeMemberTab < memberForms.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isMemberFormComplete(memberForms[activeMemberTab])) {
                        alert('Pemberitahuan: Isian kolom nama, catatan, atau foto berstatus belum lengkap. Pastikan melengkapinya sebelum pindah / submit.');
                      }
                      setActiveMemberTab(activeMemberTab + 1);
                    }}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    Lanjut ke {memberForms[activeMemberTab + 1].label}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!areAllMemberFormsComplete()) {
                        alert('Mohon lengkapi seluruh isian nama, catatan, serta berkas foto untuk semua komponen kesehatan sebelum lanjut.');
                        return;
                      }
                      setStep(4); // Advance to confirmation review step
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    Tinjau Ringkasan Laporan
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* STEP 4: TINJAU RINGKASAN DATA LAPORAN & KIRIM */}
      {step === 4 && foundKPM && memberForms.length > 0 && (
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-3xl">📝</span>
            <h3 className="text-lg font-bold text-slate-800">Tinjau Ringkasan & Kirim Laporan</h3>
            <p className="text-xs text-slate-500">
              Berikut adalah ringkasan data kesehatan mandiri yang akan otomatis dikirim secara terpisah untuk setiap anggota keluarga.
            </p>
          </div>

          {/* Grid review of all members */}
          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
            {memberForms.map((m, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 text-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-start shadow-sm hover:border-slate-300 transition-all">
                {/* Meta block */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    {m.jenisKomponen}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{m.label}</h4>
                  <p className="text-slate-500 text-[10px]">Tanggal: {m.tanggalEntry}</p>
                </div>

                {/* Content details block (2 columns span) */}
                <div className="md:col-span-2 space-y-2 text-slate-700 leading-normal border-t md:border-t-0 md:border-l border-slate-200/80 pt-2 md:pt-0 md:pl-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">NAMA ANGGOTA</span>
                    <p className="font-extrabold text-slate-900 text-sm">{m.namaAnggota}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">CATATAN KESEHATAN</span>
                    <p className="text-xs text-slate-600 font-medium whitespace-pre-line bg-white p-2 border border-slate-100 rounded-lg">
                      {m.catatan}
                    </p>
                  </div>
                </div>

                {/* Attachments preview thumbnails */}
                <div className="flex gap-2 justify-end shrink-0 pt-2 md:pt-0">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 block font-bold mb-1">Kegiatan</span>
                    <img
                      src={m.fotoKegiatan}
                      alt="Review Kegiatan"
                      className="w-14 h-14 object-cover rounded border border-slate-300 bg-white"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 block font-bold mb-1">Form Fisik</span>
                    <img
                      src={m.fotoForm}
                      alt="Review Form"
                      className="w-14 h-14 object-cover rounded border border-slate-300 bg-white"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submission legal disclaimer */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl leading-normal text-xs text-teal-900 max-w-2xl mx-auto flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <p className="font-bold text-teal-950">Konfirmasi Penyimpanan Laporan Terpisah (KPM Mandiri)</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Dengan menekan tombol kirim verifikasi, sistem akan merekam <strong className="text-teal-950 font-bold">{memberForms.length} laporan PKH kesehatan resmi terpisah</strong> (bukan digabung) untuk setiap anggota keluarga KPM untuk masa periode yang dipilih. Masing-masing laporan dapat dipantau, dilacak, dan divalidasi secara berdikari oleh Pendamping Sosial Anda.
              </p>
            </div>
          </div>

          {/* Buttons footer */}
          <div className="flex justify-between items-center max-w-3xl mx-auto pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali Ke Edit Anggota
            </button>
            <button
              id="btn-submit-verifikasi"
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md text-white ${
                isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
            >
              {isSubmitting ? 'Mengirim Data Terpisah...' : 'Kirim Verifikasi ✔'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: RECEIPT SCREEN AFTER SUBMIT */}
      {step === 5 && (
        <div id="receipt-screen" className="p-6 md:p-8 space-y-6 text-center">
          <div className="text-emerald-600 space-y-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold animate-bounce shadow">
              ✓
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Verifikasi Mandiri Sukses Direkam!</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Seluruh laporan kesehatan anggota keluarga KPM telah terdaftar terpisah di server kementerian sosial dan siap divalidasi oleh Fasilitator PKH.
            </p>
          </div>

          {/* Receipt container box */}
          <div className="max-w-2xl mx-auto bg-slate-50 bg-gradient-to-br from-slate-50 to-indigo-50/20 rounded-2xl border border-slate-200 p-6 space-y-5 text-left text-slate-800 relative shadow-sm">
            <span className="absolute top-2 right-4 text-[10px] font-extrabold text-slate-500 font-mono uppercase bg-slate-200 px-2 py-0.5 rounded">
              Resi Laporan Terpisah
            </span>

            <div className="border-b border-dashed border-slate-200 pb-4 space-y-2 text-xs">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Informasi Induk KPM:</p>
              <div className="grid grid-cols-2 text-xs leading-normal font-medium text-slate-700">
                <div>
                  <span className="text-slate-500 block">Nomor Kartu Keluarga (KK):</span>
                  <span className="font-mono font-bold text-slate-900 tracking-wider text-sm">{foundKPM?.NomorKK}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nama Penerima Manfaat Utama:</span>
                  <span className="font-bold text-slate-900 text-sm">{foundKPM?.NamaKepalaKeluarga}</span>
                </div>
              </div>
            </div>

            {/* Main Generated Records */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Resi Bukti Pendaftaran Pelaporan per Anggota ({submitSuccessReports.length} Entri/Bulan):
              </p>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {submitSuccessReports.map((report) => {
                  const details = MockDatabase.getDetailKomponen().filter(d => d.VerifikasiID === report.VerifikasiID);
                  return (
                    <div key={report.VerifikasiID} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-sm space-y-2.5">
                      <div className="flex justify-between items-center text-slate-900 font-bold bg-slate-100 p-2 rounded font-mono text-[11px]">
                        <span>Bulan: {report.BulanPelaporan} / {report.TahunPelaporan}</span>
                        <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">
                          ID: {report.NomorLaporan}
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-600 leading-normal">
                        {details.map((detail, dIdx) => (
                          <div key={dIdx} className="space-y-1.5 p-1">
                            <div className="flex justify-between items-start text-xs font-semibold">
                              <span>
                                Komponen: <strong className="text-indigo-800">{detail.NamaKomponenPKH}</strong>
                              </span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                Kode Resi: {detail.NomorResi}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px] font-semibold text-slate-700">
                              Nama: <span className="text-slate-900 font-bold">{detail.NamaAnggota}</span> | Catatan: <span className="font-normal text-slate-500 italic">"{report.Catatan}"</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 leading-normal font-semibold">
              ⚠️ PENTING: Laporan diatas disimpan sebagai entri terpisah per masing-masing anggota keluarga. Hal ini agar Pendamping PKH memantau perkembangan kesehatan individu Anda tanpa tumpang tindih. Cek terus riwayat Anda menggunakan menu "Riwayat Verifikasi".
            </div>
          </div>

          {/* Return button */}
          <div className="pt-2">
            <button
              id="btn-selesai-verif-exit"
              type="button"
              onClick={handleFinishAndExit}
              className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all cursor-pointer shadow"
            >
              Ubah ke Lihat Riwayat Laporan ✓
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
