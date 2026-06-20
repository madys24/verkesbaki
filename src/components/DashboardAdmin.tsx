/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, CheckSquare, FileText, Ban, CheckCircle2, UserCheck, UserX, AlertCircle,
  TrendingUp, MapPin, Eye, Calendar, Plus, Trash2, Edit2, RotateCcw, Filter, PieChart, Activity,
  Lock, ShieldAlert, Key, LogIn, EyeOff, Sparkles, Globe, Server, Check,
  Baby, Accessibility, Heart, Download, Upload, LogOut, Search, ClipboardList
} from 'lucide-react';
import { MockDatabase, INDONESIA_REGIONAL } from '../data/mockDb';
import { MasterKPM, VerifikasiPKH, DetailKomponenVerifikasi, DokumenVerifikasi } from '../types';
import { DBService } from '../utils/dbService';
import { auth, googleSignIn } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import RiwayatKPM from './RiwayatKPM';

export default function DashboardAdmin({ 
  onBackToHome, 
  onSelectKKForKPM, 
  isProduction = false,
  onToggleProduction,
  initialSubTab,
  initialKK = ''
}: { 
  onBackToHome?: () => void; 
  onSelectKKForKPM?: (kk: string) => void; 
  isProduction?: boolean; 
  onToggleProduction?: (prod: boolean) => void;
  initialSubTab?: 'monitoring' | 'validasi' | 'master' | 'rekap' | 'riwayat';
  initialKK?: string;
} = {}) {
  // Admin Authentication State
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem('pkh_admin_authorized') === 'true';
  });
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Track Firebase authenticated user for automatic admin permission matching
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // Automatically authorize the main user's email or registered administrative emails as Super Admin!
        if (user.email === 'androsendy@gmail.com' || user.email === 'admin@pkh.go.id') {
          setIsAdminAuthorized(true);
          sessionStorage.setItem('pkh_admin_authorized', 'true');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAdminCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    // Standard secure operator credentials for Mode Produksi
    if (adminUsername.toLowerCase() === 'admin' && adminPassword === 'pkhproduksi2026') {
      setIsAdminAuthorized(true);
      sessionStorage.setItem('pkh_admin_authorized', 'true');
    } else {
      setLoginError('ID Operator atau Kata Sandi salah. Silakan coba lagi.');
    }
  };

  const handleAdminGoogleLogin = async () => {
    setLoginError('');
    try {
      const result = await googleSignIn();
      if (result) {
        const u = result.user;
        if (u.email === 'androsendy@gmail.com' || u.email === 'admin@pkh.go.id') {
          setIsAdminAuthorized(true);
          sessionStorage.setItem('pkh_admin_authorized', 'true');
        } else {
          setLoginError(`Akun Google (${u.email}) tersambung, namun tidak terdaftar sebagai admin utama. Silakan gunakan kredensial Operator Admin yang sah.`);
        }
      }
    } catch (err) {
      console.error(err);
      setLoginError('Autentikasi Google gagal atau dibatalkan.');
    }
  };

  const handleBypassAccess = () => {
    setIsAdminAuthorized(true);
    sessionStorage.setItem('pkh_admin_authorized', 'true');
  };

  const [activeSubTab, setActiveSubTab] = useState<'monitoring' | 'validasi' | 'master' | 'rekap' | 'riwayat'>(() => {
    return initialSubTab || 'monitoring';
  });

  // State status progress untuk impor CSV/JSON
  const [importStatus, setImportStatus] = useState<{
    isLoading: boolean;
    fileName: string;
    stage: 'parsing' | 'uploading' | 'finished' | 'idle';
    total: number;
    current: number;
  }>({
    isLoading: false,
    fileName: '',
    stage: 'idle',
    total: 0,
    current: 0
  });

  // State untuk Impor via Salin-Tempel Excel (Copy-Paste)
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<MasterKPM[]>([]);
  const [pasteError, setPasteError] = useState('');
  const [isImportingPasted, setIsImportingPasted] = useState(false);
  const [pasteImportTarget, setPasteImportTarget] = useState<'current' | 'offline'>('current');

  // Filtering states for Master KPM
  const [kpmSearchQuery, setKpmSearchQuery] = useState('');
  const [kpmStatusFilter, setKpmStatusFilter] = useState<'Semua' | 'Aktif' | 'Tidak Aktif'>('Semua');
  const [kpmDesaFilter, setKpmDesaFilter] = useState<string>('Semua');
  const [kpmPendampingFilter, setKpmPendampingFilter] = useState<string>('Semua');

  // Pagination states for Master KPM
  const [kpmCurrentPage, setKpmCurrentPage] = useState<number>(1);
  const [kpmItemsPerPage, setKpmItemsPerPage] = useState<number>(10);

  // Monitoring subtab local search and filter states
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState<'Semua' | 'Belum' | 'Tersubmit' | 'Tervalidasi' | 'Ditolak'>('Semua');

  // DB States
  const [kpmList, setKpmList] = useState<MasterKPM[]>([]);
  const [verifList, setVerifList] = useState<VerifikasiPKH[]>([]);
  const [detailList, setDetailList] = useState<DetailKomponenVerifikasi[]>([]);
  const [dokumenList, setDokumenList] = useState<DokumenVerifikasi[]>([]);

  // Validasi filter state
  const [validasiFilterStatus, setValidasiFilterStatus] = useState<string>('Semua');
  const [selectedReportIDs, setSelectedReportIDs] = useState<string[]>([]);

  // Sorting state for master data KPM
  const [kpmSortKey, setKpmSortKey] = useState<string>('NamaKepalaKeluarga');
  const [kpmSortOrder, setKpmSortOrder] = useState<'asc' | 'desc'>('asc');

  // Computed filtered list for validation subtab
  const currentFilteredReports = verifList.filter(v => 
    validasiFilterStatus === 'Semua' ? true : v.Status === validasiFilterStatus
  );

  // Helper utility functions to parse RT/RW from address string if needed by sorting
  const localExtractRTVal = (addr: string): string => {
    const match = addr.match(/rt\s*[:\.]?\s*(\d+)/i);
    return match ? match[1] : '';
  };

  const localExtractRWVal = (addr: string): string => {
    const match = addr.match(/rw\s*[:\.]?\s*(\d+)/i);
    return match ? match[1] : '';
  };

  // Computed filtered list for master KPM subtab
  const masterFilteredKpmList = kpmList.filter((k) => {
    const matchesSearch = kpmSearchQuery === '' ||
      k.NamaKepalaKeluarga.toLowerCase().includes(kpmSearchQuery.toLowerCase()) ||
      k.NomorKK.includes(kpmSearchQuery);

    const matchesStatus = kpmStatusFilter === 'Semua' || k.StatusKPM === kpmStatusFilter;
    const matchesDesa = kpmDesaFilter === 'Semua' || k.Desa === kpmDesaFilter;
    const matchesPendamping = kpmPendampingFilter === 'Semua' || k.NamaPendamping === kpmPendampingFilter;

    return matchesSearch && matchesStatus && matchesDesa && matchesPendamping;
  });

  // Computed sorted list for master KPM subtab
  const sortedKpmList = [...masterFilteredKpmList].sort((a, b) => {
    let valA: any = a[kpmSortKey as keyof MasterKPM];
    let valB: any = b[kpmSortKey as keyof MasterKPM];

    if (kpmSortKey === 'RT') {
      valA = parseInt(a.RT || localExtractRTVal(a.Alamat) || '0', 10);
      valB = parseInt(b.RT || localExtractRTVal(b.Alamat) || '0', 10);
    } else if (kpmSortKey === 'RW') {
      valA = parseInt(a.RW || localExtractRWVal(a.Alamat) || '0', 10);
      valB = parseInt(b.RW || localExtractRWVal(b.Alamat) || '0', 10);
    } else if (kpmSortKey === 'TotalAgregatKomponen') {
      valA = Number(a.TotalAgregatKomponen || (Number(a.JumlahIbuHamil) + Number(a.JumlahBalita) + Number(a.JumlahLansia) + Number(a.JumlahDisabilitas)));
      valB = Number(b.TotalAgregatKomponen || (Number(b.JumlahIbuHamil) + Number(b.JumlahBalita) + Number(b.JumlahLansia) + Number(b.JumlahDisabilitas)));
    } else {
      valA = valA ? String(valA).toLowerCase() : '';
      valB = valB ? String(valB).toLowerCase() : '';
    }

    if (valA < valB) return kpmSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return kpmSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Automatically reset to Page 1 when any search/filter changes
  useEffect(() => {
    setKpmCurrentPage(1);
  }, [kpmSearchQuery, kpmStatusFilter, kpmDesaFilter, kpmPendampingFilter]);

  const totalKpmItems = sortedKpmList.length;
  const totalKpmPages = Math.ceil(totalKpmItems / kpmItemsPerPage) || 1;
  const startIndex = (kpmCurrentPage - 1) * kpmItemsPerPage;
  const paginatedKpmList = sortedKpmList.slice(startIndex, startIndex + kpmItemsPerPage);

  // Pendamping, Desa and RW Filters for Monitoring
  const [selectedPendampingFilter, setSelectedPendampingFilter] = useState<string>('Semua');
  const [selectedDesaFilter, setSelectedDesaFilter] = useState<string>('Semua');
  const [selectedRwListFilter, setSelectedRwListFilter] = useState<string[]>([]);

  // Master KPM Form states (for Add/Edit)
  const [isEditingKPM, setIsEditingKPM] = useState<boolean>(false);
  const [editingKPMItem, setEditingKPMItem] = useState<MasterKPM | null>(null);
  const [kpmFormOpen, setKpmFormOpen] = useState<boolean>(false);
  const [kpmFormError, setKpmFormError] = useState<string>('');

  // KPM Form Input attributes
  const [formKK, setFormKK] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formRT, setFormRT] = useState('');
  const [formRW, setFormRW] = useState('');
  const [formDesa, setFormDesa] = useState('Pabelan');
  const [formKec, setFormKec] = useState('Kartasura');
  const [formNamaPendamping, setFormNamaPendamping] = useState('');
  const [formIbuHamil, setFormIbuHamil] = useState(0);
  const [formBalita, setFormBalita] = useState(0);
  const [formLansia, setFormLansia] = useState(0);
  const [formDisabilitas, setFormDisabilitas] = useState(0);
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Tidak Aktif'>('Aktif');

  // Modal ImageViewer state
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);

  const fetchDB = async () => {
    try {
      const kpmData = await DBService.getKPMList();
      setKpmList(kpmData);
    } catch (err) {
      console.warn("Gagal mendapatkan KPM untuk admin portal:", err);
      setKpmList(isProduction ? [] : MockDatabase.getMasterKPM());
    }

    let loadedReports: VerifikasiPKH[] = [];
    try {
      const verifData = await DBService.getAllReports();
      setVerifList(verifData);
      loadedReports = verifData;
    } catch (err) {
      console.warn("Gagal mendapatkan Verifikasi untuk admin portal:", err);
      const fallbackVerif = isProduction ? [] : MockDatabase.getVerifikasi();
      setVerifList(fallbackVerif);
      loadedReports = fallbackVerif;
    }

    try {
      const details = await DBService.getAllDetails(loadedReports);
      setDetailList(details);
    } catch (err) {
      setDetailList(isProduction ? [] : MockDatabase.getDetailKomponen());
    }

    try {
      const docs = await DBService.getAllDokumen(loadedReports);
      setDokumenList(docs);
    } catch (err) {
      setDokumenList(isProduction ? [] : MockDatabase.getDokumen());
    }
  };

  useEffect(() => {
    fetchDB();
  }, [isProduction]);

  const openAddKpmForm = () => {
    setIsEditingKPM(false);
    setEditingKPMItem(null);
    setFormKK('');
    setFormNama('');
    setFormAlamat('');
    setFormRT('');
    setFormRW('');
    setFormDesa('Pabelan');
    setFormKec('Kartasura');
    setFormNamaPendamping('');
    setFormIbuHamil(0);
    setFormBalita(0);
    setFormLansia(0);
    setFormDisabilitas(0);
    setFormStatus('Aktif');
    setKpmFormError('');
    setKpmFormOpen(true);
  };

  const openEditKpmForm = (k: MasterKPM) => {
    setIsEditingKPM(true);
    setEditingKPMItem(k);
    setFormKK(k.NomorKK);
    setFormNama(k.NamaKepalaKeluarga);
    setFormAlamat(k.Alamat);
    setFormRT(k.RT || '');
    setFormRW(k.RW || '');
    setFormDesa(k.Desa);
    setFormKec(k.Kecamatan);
    setFormNamaPendamping(k.NamaPendamping || '');
    setFormIbuHamil(k.JumlahIbuHamil);
    setFormBalita(k.JumlahBalita);
    setFormLansia(k.JumlahLansia);
    setFormDisabilitas(k.JumlahDisabilitas);
    setFormStatus(k.StatusKPM);
    setKpmFormError('');
    setKpmFormOpen(true);
  };

  const handleSaveKpm = async (e: React.FormEvent) => {
    e.preventDefault();
    setKpmFormError('');

    if (formKK.length !== 16 || isNaN(Number(formKK))) {
      setKpmFormError('Nomor KK harus berupa 16 digit angka numerik.');
      return;
    }
    if (!formNama.trim()) {
      setKpmFormError('Nama Kepala Keluarga wajib diisi.');
      return;
    }
    if (!formNamaPendamping.trim()) {
      setKpmFormError('Nama Pendamping wajib diisi.');
      return;
    }

    if (isProduction && !firebaseUser) {
      setKpmFormError('Anda harus login dengan Akun Google terlebih dahulu untuk melakukan operasi penambahan atau perubahan Master KPM di Mode Live / Produksi.');
      return;
    }

    try {
      if (isEditingKPM && editingKPMItem) {
        await DBService.updateMasterKPM({
          ...editingKPMItem,
          NomorKK: formKK,
          NamaKepalaKeluarga: formNama,
          Alamat: formAlamat,
          RT: formRT,
          RW: formRW,
          Desa: formDesa,
          Kecamatan: formKec,
          NamaPendamping: formNamaPendamping,
          JumlahIbuHamil: Number(formIbuHamil),
          JumlahBalita: Number(formBalita),
          JumlahLansia: Number(formLansia),
          JumlahDisabilitas: Number(formDisabilitas),
          TotalAgregatKomponen: Number(formIbuHamil) + Number(formBalita) + Number(formLansia) + Number(formDisabilitas),
          Kabupaten: editingKPMItem.Kabupaten || 'Kabupaten Sukoharjo',
          StatusKPM: formStatus
        });
      } else {
        // Check duplicate KK
        const exist = kpmList.find(x => x.NomorKK === formKK);
        if (exist) {
          setKpmFormError('Nomor KK ini sudah terdaftar dalam sistem.');
          return;
        }
        await DBService.addMasterKPM({
          KPMID: `KPM-${Date.now()}`,
          NomorKK: formKK,
          NamaKepalaKeluarga: formNama,
          Alamat: formAlamat,
          RT: formRT,
          RW: formRW,
          Desa: formDesa,
          Kecamatan: formKec,
          NamaPendamping: formNamaPendamping,
          JumlahIbuHamil: Number(formIbuHamil),
          JumlahBalita: Number(formBalita),
          JumlahLansia: Number(formLansia),
          JumlahDisabilitas: Number(formDisabilitas),
          StatusKPM: formStatus,
          Kabupaten: 'Kabupaten Sukoharjo',
          TotalAgregatKomponen: Number(formIbuHamil) + Number(formBalita) + Number(formLansia) + Number(formDisabilitas)
        });
      }

      setKpmFormOpen(false);
      fetchDB();
    } catch (err) {
      setKpmFormError('Terjadi kesalahan saat menyimpan data ke Firestore: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteKpm = async (id: string) => {
    if (isProduction) {
      if (!firebaseUser) {
        alert("Anda saat ini berada di Mode Live / Produksi tetapi belum masuk (login).\n\nSilakan login menggunakan Google Super Admin terlebih dahulu di pojok kanan bawah agar dapat melakukan penghapusan data KPM!");
        return;
      }
      const userEmail = firebaseUser.email || '';
      if (userEmail !== 'androsendy@gmail.com' && userEmail !== 'admin@pkh.go.id') {
        alert(`Akun Anda (${userEmail}) tidak memiliki izin Super Admin untuk menghapus data KPM dari cloud.\n\nPenghapusan dibatalkan. Hubungi admin@pkh.go.id jika ini kesalahan.`);
        return;
      }
    }

    if (confirm('Apakah Anda yakin ingin menghapus data KPM ini? Data verifikasi lama yang bersangkutan tidak akan terhapus, tetapi KK ini tidak bisa lagi dicari.')) {
      try {
        await DBService.deleteKPM(id);
        fetchDB();
      } catch (err) {
        alert('Gagal menghapus KPM dari Firestore: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  // EXPORT MASTER KPM (JSON format)
  const handleExportKPM = () => {
    try {
      const dataStr = JSON.stringify(kpmList, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `master_kpm_export_${new Date().toISOString().slice(0, 10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert('Gagal mengekspor JSON: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // EXPORT MASTER KPM (CSV format)
  const handleExportCSV = () => {
    try {
      const headers = ['KPMID', 'NomorKK', 'NamaKepalaKeluarga', 'Alamat', 'RT', 'RW', 'Desa', 'Kecamatan', 'JumlahIbuHamil', 'JumlahBalita', 'JumlahLansia', 'JumlahDisabilitas', 'StatusKPM', 'NamaPendamping'];
      const rows = kpmList.map(k => [
        k.KPMID,
        k.NomorKK,
        k.NamaKepalaKeluarga,
        k.Alamat || '',
        k.RT || '',
        k.RW || '',
        k.Desa || '',
        k.Kecamatan || '',
        k.JumlahIbuHamil,
        k.JumlahBalita,
        k.JumlahLansia,
        k.JumlahDisabilitas,
        k.StatusKPM,
        k.NamaPendamping || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `master_kpm_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.click();
    } catch (err) {
      alert('Gagal mengekspor CSV: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // IMPORT MASTER KPM (Supports JSON and CSV)
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isProduction && !firebaseUser) {
      alert("Anda saat ini berada di Mode Live / Produksi tetapi belum masuk (login) menggunakan Akun Google Super Admin.\n\nSilakan login menggunakan Google terlebih dahulu di pojok kanan bawah agar data KPM berhasil sinkron ke cloud!");
      event.target.value = '';
      return;
    }

    setImportStatus({
      isLoading: true,
      fileName: file.name,
      stage: 'parsing',
      total: 0,
      current: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let importedList: Partial<MasterKPM>[] = [];

        // Helper to parse a CSV line properly respecting potential double-quoted cells
        const parseCsvLine = (line: string, delim: string): string[] => {
          const values: string[] = [];
          let curr = '';
          let quotes = false;
          for (let idx = 0; idx < line.length; idx++) {
            const ch = line[idx];
            if (ch === '"') {
              quotes = !quotes;
            } else if (ch === delim && !quotes) {
              values.push(curr.trim());
              curr = '';
            } else {
              curr += ch;
            }
          }
          values.push(curr.trim());
          return values.map(v => v.replace(/^"|"$/g, '').trim());
        };

        // Helper to unpack nested single-key CSV strings wrapped in objects (highly robust fallback)
        const unpackSingleKeyCsvObject = (item: any): any => {
          if (!item || typeof item !== 'object') return item;
          const keys = Object.keys(item);
          if (keys.length === 1) {
            const heading = keys[0];
            const val = item[heading];
            if (typeof val === 'string' && (heading.includes(',') || heading.includes(';'))) {
              const delimiter = heading.includes(';') ? ';' : ',';
              const headers = heading.split(delimiter).map(h => h.trim());
              const parsedValues = parseCsvLine(val, delimiter);
              const unpacked: any = {};
              headers.forEach((h, i) => {
                unpacked[h] = parsedValues[i] || '';
              });
              return unpacked;
            }
          }
          return item;
        };

        // Helper to normalize any parsed key names into standard camelCase/PascalCase database columns
        const normalizeItemKeys = (rawItem: any): Partial<MasterKPM> => {
          if (!rawItem || typeof rawItem !== 'object') return {};
          
          const normalized: any = {};
          Object.keys(rawItem).forEach(key => {
            const cleanKey = key.replace(/^"|"$/g, '').trim().replace(/\s+/g, '').replace(/[-_]+/g, '').toLowerCase();
            const val = String(rawItem[key]).trim();

            if (cleanKey === 'kpmid' || cleanKey === 'id') normalized.KPMID = val;
            else if (cleanKey === 'nomorkk' || cleanKey === 'kk' || cleanKey === 'nokk') normalized.NomorKK = val;
            else if (cleanKey === 'namakepalakeluarga' || cleanKey === 'namakk' || cleanKey === 'kepalakeluarga' || cleanKey === 'namakepalakk') normalized.NamaKepalaKeluarga = val;
            else if (cleanKey === 'alamat') normalized.Alamat = val;
            else if (cleanKey === 'rt') normalized.RT = val;
            else if (cleanKey === 'rw') normalized.RW = val;
            else if (cleanKey === 'desa' || cleanKey === 'kelurahan') normalized.Desa = val;
            else if (cleanKey === 'kecamatan') normalized.Kecamatan = val;
            else if (cleanKey === 'kabupaten' || cleanKey === 'kota') normalized.Kabupaten = val;
            else if (cleanKey === 'jumlahibuhamil' || cleanKey === 'ibuhamil') normalized.JumlahIbuHamil = Number(val) || 0;
            else if (cleanKey === 'jumlahbalita' || cleanKey === 'balita') normalized.JumlahBalita = Number(val) || 0;
            else if (cleanKey === 'jumlahlansia' || cleanKey === 'lansia') normalized.JumlahLansia = Number(val) || 0;
            else if (cleanKey === 'jumlahdisabilitas' || cleanKey === 'disabilitas') normalized.JumlahDisabilitas = Number(val) || 0;
            else if (cleanKey === 'statuskpm' || cleanKey === 'status') normalized.StatusKPM = val;
            else if (cleanKey === 'namapendamping' || cleanKey === 'pendamping') normalized.NamaPendamping = val;
            else {
              normalized[key] = val;
            }
          });
          return normalized;
        };

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          importedList = Array.isArray(parsed) ? parsed : [parsed];
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length < 2) {
            alert('CSV kosong atau format salah.');
            setImportStatus({ isLoading: false, fileName: '', stage: 'idle', total: 0, current: 0 });
            return;
          }

          // Detect delimiter automatically: Semicolon is very common in Indonesian/Excel standard outputs
          const headerLine = lines[0];
          const commaCount = (headerLine.match(/,/g) || []).length;
          const semicolonCount = (headerLine.match(/;/g) || []).length;
          const delimiter = semicolonCount > commaCount ? ';' : ',';

          const headers = headerLine.split(delimiter).map(h => h.replace(/^"|"$/g, '').trim());
          
          for (let i = 1; i < lines.length; i++) {
            const rowData = parseCsvLine(lines[i], delimiter);
            const item: any = {};
            headers.forEach((header, index) => {
              item[header] = rowData[index] || '';
            });
            importedList.push(item);
          }
        } else {
          alert('Format berkas tidak didukung. Harap upload .json atau .csv');
          setImportStatus({ isLoading: false, fileName: '', stage: 'idle', total: 0, current: 0 });
          return;
        }

        if (!Array.isArray(importedList)) {
          alert('Format data salah. Harus berupa list/array.');
          setImportStatus({ isLoading: false, fileName: '', stage: 'idle', total: 0, current: 0 });
          return;
        }

        const validatedList: MasterKPM[] = [];
        let skippedCount = 0;
        let count = 0;

        for (const item of importedList) {
          // 1. Reconstruct nested single-key CSV artifacts
          const unpackedItem = unpackSingleKeyCsvObject(item);
          
          // 2. Normalize and check fields
          const normItem = normalizeItemKeys(unpackedItem);

          if (!normItem.NomorKK || !normItem.NamaKepalaKeluarga) {
            if (Object.keys(normItem).some(k => normItem[k])) {
              skippedCount++;
            }
            continue;
          }

          // Parse RT/RW from Alamat if not explicitly declared in import file
          const kpmId = normItem.KPMID || `KPM-${Date.now()}-${count}`;
          const isRT = normItem.RT || extractRTVal(normItem.Alamat || '');
          const isRW = normItem.RW || extractRWVal(normItem.Alamat || '');

          const finalKpm: MasterKPM = {
            KPMID: kpmId,
            NomorKK: String(normItem.NomorKK),
            NamaKepalaKeluarga: String(normItem.NamaKepalaKeluarga),
            Alamat: String(normItem.Alamat || ''),
            RT: String(isRT),
            RW: String(isRW),
            Desa: String(normItem.Desa || 'Kadilangu'),
            Kecamatan: String(normItem.Kecamatan || 'Baki'),
            Kabupaten: String(normItem.Kabupaten || 'Kabupaten Sukoharjo'),
            JumlahIbuHamil: Number(normItem.JumlahIbuHamil) || 0,
            JumlahBalita: Number(normItem.JumlahBalita) || 0,
            JumlahLansia: Number(normItem.JumlahLansia) || 0,
            JumlahDisabilitas: Number(normItem.JumlahDisabilitas) || 0,
            TotalAgregatKomponen: Number(normItem.JumlahIbuHamil || 0) + Number(normItem.JumlahBalita || 0) + Number(normItem.JumlahLansia || 0) + Number(normItem.JumlahDisabilitas || 0),
            StatusKPM: (normItem.StatusKPM === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif'),
            NamaPendamping: String(normItem.NamaPendamping || 'Siti Rahmaawati')
          };

          validatedList.push(finalKpm);
          count++;
        }

        if (validatedList.length === 0) {
          alert('Tidak ada data KPM yang valid ditemukan untuk diimpor. Pastikan kolom "NomorKK" dan "NamaKepalaKeluarga" terisi.');
          setImportStatus({ isLoading: false, fileName: '', stage: 'idle', total: 0, current: 0 });
          return;
        }

        setImportStatus(prev => ({
          ...prev,
          stage: 'uploading',
          total: validatedList.length,
          current: 0
        }));

        const importedCount = await DBService.batchAddMasterKPM(validatedList, (current, total) => {
          setImportStatus(prev => ({
            ...prev,
            current,
            total
          }));
        });

        setImportStatus(prev => ({
          ...prev,
          stage: 'finished'
        }));

        let msg = `Selesai! Berhasil mengimpor ${importedCount} KPM baru ke database secara instan 🚀`;
        if (skippedCount > 0) {
          msg += `\n\nCatatan: Melewati ${skippedCount} baris data karena tidak memiliki kolom Nomor KK atau Nama Kepala Keluarga.`;
        }
        alert(msg);
        fetchDB();
      } catch (err) {
        alert('Gagal mengimpor berkas: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setImportStatus({
          isLoading: false,
          fileName: '',
          stage: 'idle',
          total: 0,
          current: 0
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // HANDLERS FOR EXCEL COPY-PASTE DIRECT GRID IMPORTER
  const handleParsePastedText = (text: string) => {
    try {
      if (!text || !text.trim()) {
        setParsedPreview([]);
        setPasteError('');
        return;
      }
      
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setParsedPreview([]);
        setPasteError('Data kosong atau tidak valid.');
        return;
      }

      const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
      const firstRow = rows[0];

      // Detect if first row contains column headers
      const isHeader = firstRow.some(cell => {
        const c = cell.toLowerCase();
        return c.includes('kk') || c.includes('nama') || c.includes('alamat') || c.includes('rt') || c.includes('rw') || c.includes('desa') || c.includes('dusun') || c.includes('pendamping');
      });

      let headers: string[] = [];
      let dataRows: string[][] = [];

      if (isHeader) {
        headers = firstRow;
        dataRows = rows.slice(1);
      } else {
        const colCount = firstRow.length;
        headers = Array.from({ length: colCount }, (_, i) => `col_${i}`);
        dataRows = rows;
      }

      const validatedList: MasterKPM[] = [];
      let count = 0;

      // Local helper to normalize key names (mirror of normalizePastedKeys but scoped)
      const localNormalize = (rawItem: any): Partial<MasterKPM> => {
        if (!rawItem || typeof rawItem !== 'object') return {};
        const normalized: any = {};
        Object.keys(rawItem).forEach(key => {
          const cleanKey = key.replace(/^"|"$/g, '').trim().replace(/\s+/g, '').replace(/[-_]+/g, '').toLowerCase();
          const val = String(rawItem[key]).trim();

          if (cleanKey === 'kpmid' || cleanKey === 'id') normalized.KPMID = val;
          else if (cleanKey === 'nomorkk' || cleanKey === 'kk' || cleanKey === 'nokk') normalized.NomorKK = val;
          else if (cleanKey === 'namakepalakeluarga' || cleanKey === 'namakk' || cleanKey === 'kepalakeluarga' || cleanKey === 'namakepalakk') normalized.NamaKepalaKeluarga = val;
          else if (cleanKey === 'alamat') normalized.Alamat = val;
          else if (cleanKey === 'rt') normalized.RT = val;
          else if (cleanKey === 'rw') normalized.RW = val;
          else if (cleanKey === 'desa' || cleanKey === 'kelurahan') normalized.Desa = val;
          else if (cleanKey === 'kecamatan') normalized.Kecamatan = val;
          else if (cleanKey === 'kabupaten' || cleanKey === 'kota') normalized.Kabupaten = val;
          else if (cleanKey === 'jumlahibuhamil' || cleanKey === 'ibuhamil') normalized.JumlahIbuHamil = Number(val) || 0;
          else if (cleanKey === 'jumlahbalita' || cleanKey === 'balita') normalized.JumlahBalita = Number(val) || 0;
          else if (cleanKey === 'jumlahlansia' || cleanKey === 'lansia') normalized.JumlahLansia = Number(val) || 0;
          else if (cleanKey === 'jumlahdisabilitas' || cleanKey === 'disabilitas') normalized.JumlahDisabilitas = Number(val) || 0;
          else if (cleanKey === 'statuskpm' || cleanKey === 'status') normalized.StatusKPM = val;
          else if (cleanKey === 'namapendamping' || cleanKey === 'pendamping') normalized.NamaPendamping = val;
          else {
            normalized[key] = val;
          }
        });
        return normalized;
      };

      for (const row of dataRows) {
        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = row[index] || '';
        });

        const normItem = localNormalize(item);

        // Fallback guesser for index-based rows if no header was detected
        if (!isHeader) {
          row.forEach((cell) => {
            if (/^\d{16}$/.test(cell)) {
              if (!normItem.NomorKK) normItem.NomorKK = cell;
            } else if (/^[A-Za-z\s'.]{3,50}$/.test(cell) && !cell.toLowerCase().includes('baki') && !cell.toLowerCase().includes('sukoharjo') && !cell.toLowerCase().includes('kadilangu')) {
              if (!normItem.NamaKepalaKeluarga) normItem.NamaKepalaKeluarga = cell;
            } else if (cell.toLowerCase().startsWith('rt')) {
              normItem.RT = cell.replace(/\D/g, '').padStart(2, '0');
            } else if (cell.toLowerCase().startsWith('rw')) {
              normItem.RW = cell.replace(/\D/g, '').padStart(2, '0');
            }
          });
        }

        if (!normItem.NomorKK && !normItem.NamaKepalaKeluarga) {
          continue;
        }

        const kpmId = normItem.KPMID || `KPM-${Date.now()}-${count}`;
        const isRT = normItem.RT || extractRTVal(normItem.Alamat || '');
        const isRW = normItem.RW || extractRWVal(normItem.Alamat || '');

        const finalKpm: MasterKPM = {
          KPMID: kpmId,
          NomorKK: String(normItem.NomorKK || `AUTOKK-${Date.now()}-${count}`),
          NamaKepalaKeluarga: String(normItem.NamaKepalaKeluarga || 'Tanpa Nama'),
          Alamat: String(normItem.Alamat || ''),
          RT: String(isRT || '00'),
          RW: String(isRW || '00'),
          Desa: String(normItem.Desa || 'Kadilangu'),
          Kecamatan: String(normItem.Kecamatan || 'Baki'),
          Kabupaten: String(normItem.Kabupaten || 'Kabupaten Sukoharjo'),
          JumlahIbuHamil: Number(normItem.JumlahIbuHamil) || 0,
          JumlahBalita: Number(normItem.JumlahBalita) || 0,
          JumlahLansia: Number(normItem.JumlahLansia) || 0,
          JumlahDisabilitas: Number(normItem.JumlahDisabilitas) || 0,
          TotalAgregatKomponen: Number(normItem.JumlahIbuHamil || 0) + Number(normItem.JumlahBalita || 0) + Number(normItem.JumlahLansia || 0) + Number(normItem.JumlahDisabilitas || 0),
          StatusKPM: (normItem.StatusKPM === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif'),
          NamaPendamping: String(normItem.NamaPendamping || 'Siti Rahmaawati')
        };

        validatedList.push(finalKpm);
        count++;
      }

      if (validatedList.length === 0) {
        setParsedPreview([]);
        setPasteError('Format data salah atau tidak ada baris valid yg terdeteksi. Pastikan mencantumkan Nomor KK dan Nama Kepala Keluarga.');
      } else {
        setParsedPreview(validatedList);
        setPasteError('');
      }
    } catch (err) {
      setParsedPreview([]);
      setPasteError('Gagal memproses teks: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExecutePasteImport = async () => {
    if (parsedPreview.length === 0) return;

    if (isProduction && pasteImportTarget === 'current' && !firebaseUser) {
      alert("Anda saat ini berada di Mode Live / Produksi tetapi belum masuk (login) menggunakan Akun Google Super Admin.\n\nSilakan login terlebih dahulu, atau ubah 'Tujuan Impor' ke 'Simpan Lokal (Offline)'!");
      return;
    }

    setIsImportingPasted(true);
    try {
      const originalProductionMode = localStorage.getItem('pkh_production_mode');
      
      if (pasteImportTarget === 'offline') {
        localStorage.setItem('pkh_production_mode', 'false');
      }

      const importedCount = await DBService.batchAddMasterKPM(parsedPreview);

      if (pasteImportTarget === 'offline') {
        if (originalProductionMode !== null) {
          localStorage.setItem('pkh_production_mode', originalProductionMode);
        } else {
          localStorage.removeItem('pkh_production_mode');
        }
      }

      alert(`Sukses! Berhasil mengimpor ${importedCount} KPM baru secara langsung dari Excel 🚀`);
      setShowPasteModal(false);
      setPastedText('');
      setParsedPreview([]);
      fetchDB();
    } catch (err) {
      alert('Gagal mengeksekusi impor data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImportingPasted(false);
    }
  };

  // CLEAR ALL MASTER KPM
  const handleClearMasterKPM = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus SELURUH data keluarga (KPM) dari master database? Seluruh data KPM master akan dibersihkan, dan sistem tidak akan memaksa memuat data demo lagi.')) {
      try {
        MockDatabase.saveMasterKPM([]);
        await DBService.clearAllKPM();
        alert('Sukses! Seluruh data master KPM berhasil dikosongkan.');
        fetchDB();
      } catch (err) {
        alert('Gagal mengosongkan master data KPM: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  // Safe file downloader
  const handleDownloadFile = async (fileUrl: string, originalName: string) => {
    try {
      if (!fileUrl) {
        alert('Tautan gambar kosong atau tidak valid.');
        return;
      }
      
      // If it's a data url / base64
      if (fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // External HTTP triggers can have CORS blocks, we first try standard secure link flow with download trigger
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Direct prompt fallback
      window.open(fileUrl, '_blank');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Tersubmit' | 'Tervalidasi' | 'Ditolak') => {
    try {
      await DBService.updateVerificationStatus(id, status);
      fetchDB();
    } catch (err) {
      alert('Gagal memperbarui status di Firestore: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleBatchUpdateStatus = async (ids: string[], status: 'Tersubmit' | 'Tervalidasi' | 'Ditolak') => {
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => DBService.updateVerificationStatus(id, status)));
      fetchDB();
      setSelectedReportIDs([]); // Reset selection state after batch operation succeeds
    } catch (err) {
      alert('Gagal memperbarui status masal di Firestore: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const toggleKpmSort = (key: string) => {
    if (kpmSortKey === key) {
      setKpmSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setKpmSortKey(key);
      setKpmSortOrder('asc');
    }
  };

  // METRICS COMPUTATIONS
  // Extract RT & RW helper
  const extractRTVal = (alamat: string): string => {
    const match = alamat.match(/RT\s*(\d+)/i);
    if (match) {
      return match[1].padStart(2, '0');
    }
    return '';
  };

  const extractRWVal = (alamat: string): string => {
    const match = alamat.match(/RW\s*(\d+)/i);
    if (match) {
      return match[1].padStart(2, '0');
    }
    return '';
  };

  // Extract RW helper
  const extractRW = (alamat: string): string => {
    const match = alamat.match(/RW\s*(\d+)/i);
    if (match) {
      return `RW ${match[1].padStart(2, '0')}`;
    }
    return '';
  };

  // Extract unique elements based on cascading rules
  const uniquePendampingList = Array.from(
    new Set(
      kpmList
        .map(k => k.NamaPendamping)
        .filter((n): n is string => !!n && n.trim() !== '')
    )
  ).sort();

  const uniqueDesaList = Array.from(
    new Set(
      kpmList
        .filter(k => selectedPendampingFilter === 'Semua' ? true : k.NamaPendamping === selectedPendampingFilter)
        .map(k => k.Desa)
        .filter((d): d is string => !!d && d.trim() !== '')
    )
  ).sort();

  const uniqueRwList = Array.from(
    new Set(
      kpmList
        .filter(k => {
          const matchPendamping = selectedPendampingFilter === 'Semua' ? true : k.NamaPendamping === selectedPendampingFilter;
          const matchDesa = selectedDesaFilter === 'Semua' ? true : k.Desa === selectedDesaFilter;
          return matchPendamping && matchDesa;
        })
        .map(k => extractRW(k.Alamat))
        .filter((rw): rw is string => !!rw)
    )
  ).sort();

  // Reset cascading Desa selector when invalid
  const uniqueDesaListString = uniqueDesaList.join(',');
  useEffect(() => {
    if (selectedDesaFilter !== 'Semua' && !uniqueDesaList.includes(selectedDesaFilter)) {
      setSelectedDesaFilter('Semua');
    }
  }, [selectedPendampingFilter, uniqueDesaListString]);

  // Reset cascading RW selector when invalid
  const uniqueRwListString = uniqueRwList.join(',');
  useEffect(() => {
    setSelectedRwListFilter(prev => {
      const filtered = prev.filter(rw => uniqueRwList.includes(rw));
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [selectedPendampingFilter, selectedDesaFilter, uniqueRwListString]);

  // Filter KPM list and Verifikasi list by the selected companion name, Desa, and RW (multi select checklist) in the Monitoring filter
  const filteredKpmList = kpmList.filter(k => {
    const matchPendamping = selectedPendampingFilter === 'Semua' ? true : k.NamaPendamping === selectedPendampingFilter;
    const matchDesa = selectedDesaFilter === 'Semua' ? true : k.Desa === selectedDesaFilter;
    const matchRw = selectedRwListFilter.length === 0 ? true : selectedRwListFilter.includes(extractRW(k.Alamat));
    return matchPendamping && matchDesa && matchRw;
  });

  const filteredVerifList = verifList.filter(v => {
    const parentKPM = kpmList.find(k => k.NomorKK === v.NomorKK);
    if (!parentKPM) return false;
    const matchPendamping = selectedPendampingFilter === 'Semua' ? true : parentKPM.NamaPendamping === selectedPendampingFilter;
    const matchDesa = selectedDesaFilter === 'Semua' ? true : parentKPM.Desa === selectedDesaFilter;
    const matchRw = selectedRwListFilter.length === 0 ? true : selectedRwListFilter.includes(extractRW(parentKPM.Alamat));
    return matchPendamping && matchDesa && matchRw;
  });

  const totalKPM = filteredKpmList.length;
  const totalLaporan = filteredVerifList.length;

  const totalBulanan = filteredVerifList.filter(v => v.JenisPeriode === 'Bulanan').length;
  const totalTriwulanan = filteredVerifList.filter(v => v.JenisPeriode === 'Triwulanan').length;

  // Reported vs unreported count
  const distinctKPMHavereported = Array.from(new Set(filteredVerifList.map(v => v.NomorKK)));
  const reportedKPMCount = filteredKpmList.filter(k => distinctKPMHavereported.includes(k.NomorKK)).length;
  const unreportedKPMCount = Math.max(0, totalKPM - reportedKPMCount);

  // Stats per month name
  const getReportsPerMonth = () => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const map: Record<string, number> = {};
    months.forEach(m => { map[m] = 0; });
    
    filteredVerifList.forEach(v => {
      if (months.includes(v.BulanPelaporan)) {
        map[v.BulanPelaporan]++;
      }
    });

    return map;
  };

  const reportsPerMonth = getReportsPerMonth();

  // Stats for types of health components aggregated
  const totalIbuHamilCount = filteredKpmList.reduce((acc, curr) => acc + curr.JumlahIbuHamil, 0);
  const totalBalitaCount = filteredKpmList.reduce((acc, curr) => acc + curr.JumlahBalita, 0);
  const totalLansiaCount = filteredKpmList.reduce((acc, curr) => acc + curr.JumlahLansia, 0);
  const totalDisabilitasCount = filteredKpmList.reduce((acc, curr) => acc + curr.JumlahDisabilitas, 0);

  // Groupings for Rekap
  const groupRekapByDesa = () => {
    const result: Record<string, { KPM: number; Laporan: number; IbuHamil: number; Balita: number; Lansia: number; Disabilitas: number }> = {};
    
    filteredKpmList.forEach(k => {
      if (!result[k.Desa]) {
        result[k.Desa] = { KPM: 0, Laporan: 0, IbuHamil: 0, Balita: 0, Lansia: 0, Disabilitas: 0 };
      }
      result[k.Desa].KPM++;
      result[k.Desa].IbuHamil += k.JumlahIbuHamil;
      result[k.Desa].Balita += k.JumlahBalita;
      result[k.Desa].Lansia += k.JumlahLansia;
      result[k.Desa].Disabilitas += k.JumlahDisabilitas;
    });

    filteredVerifList.forEach(v => {
      const parentKPM = filteredKpmList.find(k => k.NomorKK === v.NomorKK);
      if (parentKPM && result[parentKPM.Desa]) {
        result[parentKPM.Desa].Laporan++;
      }
    });

    return result;
  };

  const groupRekapByKecamatan = () => {
    const result: Record<string, { KPM: number; Laporan: number }> = {};
    filteredKpmList.forEach(k => {
      if (!result[k.Kecamatan]) {
        result[k.Kecamatan] = { KPM: 0, Laporan: 0 };
      }
      result[k.Kecamatan].KPM++;
    });

    filteredVerifList.forEach(v => {
      const parentKPM = filteredKpmList.find(k => k.NomorKK === v.NomorKK);
      if (parentKPM && result[parentKPM.Kecamatan]) {
        result[parentKPM.Kecamatan].Laporan++;
      }
    });

    return result;
  };

  const listDesa = groupRekapByDesa();
  const listKec = groupRekapByKecamatan();

  // Reset helper
  const handleResetDBData = () => {
    if (confirm('Apakah Anda mau me-reset data simulasi kembali ke setelan default awal? Seluruh laporan buatan Anda akan terhapus.')) {
      MockDatabase.resetDB();
      fetchDB();
    }
  };

  if (!isAdminAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Header decor */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 text-white text-center space-y-2 relative">
          <button
            type="button"
            onClick={() => {
              if (onToggleProduction) {
                onToggleProduction(!isProduction);
              }
            }}
            className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all shadow-sm ${
              isProduction 
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400 hover:bg-emerald-905' 
                : 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300 hover:bg-indigo-905'
            }`}
            title="Klik untuk mengubah mode sistem"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isProduction ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-400 animate-pulse'}`}></span>
            {isProduction ? 'Live / Pro 🚀' : 'Mode Demo ✨'}
          </button>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/15">
            <Lock className="w-6 h-6 text-indigo-300" />
          </div>
          <h2 id="login-title" className="text-lg font-bold tracking-tight">Pendamping PKH Baki</h2>
          <p className="text-xs text-indigo-200/90 max-w-xs mx-auto">Portal Admin & Supervisor Verifikasi Keluarga Penerima Manfaat (KPM) PKH</p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          <form onSubmit={handleAdminCredentialsLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-650 flex items-start gap-2 animate-shake">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">ID Operator / Username</label>
              <div className="relative">
                <input
                  id="admin-username"
                  type="text"
                  required
                  placeholder="Masukkan username (contoh: admin)"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Kata Sandi Sesi</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan kata sandi produksi"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer flex items-center justify-center h-5 w-5 bg-transparent"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5 text-slate-400 hover:text-slate-600" /> : <Eye className="w-4.5 h-4.5 text-slate-400 hover:text-slate-600" />}
                </button>
              </div>
              {/* Demo hints removed safely */}
            </div>

            <button
              id="btn-admin-login"
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-indigo-850 hover:from-blue-800 hover:to-indigo-900 active:from-blue-950 active:to-indigo-950 text-white font-bold text-sm rounded-xl shadow-lg transition duration-150 transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-none"
            >
              <LogIn className="w-4 h-4" />
              <span>Verifikasi Keamanan Admins</span>
            </button>
          </form>

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-250 w-full absolute"></div>
            <span className="bg-white px-3 text-[10px] text-slate-450 font-bold relative z-10 uppercase tracking-wide">Atau dengan</span>
          </div>

          {/* Google SSO Admin */}
          <button
            onClick={handleAdminGoogleLogin}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">G</span>
            <span>Masuk dengan Google (androsendy@gmail.com)</span>
          </button>

          {/* Quick Demo Access Bypass Button */}
          {!isProduction && (
            <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
              <p className="text-[10px] text-slate-400 text-center mb-2 leading-relaxed">
                * Mode Demo: Untuk keperluan evaluasi instan tanpa memasukkan sandi, Anda bisa mengklik tombol di bawah ini.
              </p>
              <button
                onClick={handleBypassAccess}
                className="px-4 py-1.5 bg-emerald-55 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-150 rounded-full font-bold text-xs tracking-tight transition duration-150 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Akses Cepat Mode Demo ✨</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden min-h-[500px]">
      
      {/* Visual Import Progress Overlay */}
      {importStatus.isLoading && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl animate-pulse">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm truncate">Mengimpor Keluarga KPM</h3>
                <p className="text-[11px] text-slate-400 font-mono truncate">{importStatus.fileName}</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                  {importStatus.stage === 'parsing' ? 'Membaca data berkas...' : 'Mengunggah ke database Firestore...'}
                </span>
                <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                  {importStatus.stage === 'uploading' 
                    ? `${importStatus.current} / ${importStatus.total} KPM` 
                    : 'Memuat'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: importStatus.stage === 'parsing' 
                      ? '25%' 
                      : `${Math.round((importStatus.current / (importStatus.total || 1)) * 100)}%` 
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Harap tidak menutup halaman ini</span>
                {importStatus.stage === 'uploading' && (
                  <span className="font-bold font-mono text-blue-600 animate-pulse bg-blue-50 px-1.5 py-0.5 rounded">
                    {Math.round((importStatus.current / (importStatus.total || 1)) * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Paste Import Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Impor KPM via Salin-Tempel Excel</h3>
                  <p className="text-[11px] text-slate-400">Salin baris dan kolom tabel data master KPM di Excel (Ctrl+C), lalu tempel (Ctrl+V) langsung di area bawah.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasteModal(false)}
                className="p-1 px-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Clipboard instructions / columns help */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 text-[11px] text-slate-600 rounded-xl space-y-1">
                <span className="font-bold text-blue-800 block">💡 Tips Format Kolom di Excel:</span>
                <p>Aplikasi akan otomatis mapping data Anda. Agar hasil maksimal, pastikan baris pertama Excel Anda memiliki nama kolom seperti:</p>
                <div className="font-mono text-[10px] bg-white px-2 py-1.5 rounded border border-blue-100/50 leading-relaxed overflow-x-auto whitespace-normal">
                  Nomor KK • Nama Kepala Keluarga • Alamat • RT • RW • Desa • Kecamatan • Jumlah Ibu Hamil • Jumlah Balita • Jumlah Lansia • Jumlah Disabilitas • Status KPM • Nama Pendamping
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1">Sistem juga cerdas mendeteksi baris angka 16-digit sebagai Nomor KK dan teks panjang sebagai Nama jika baris header tidak ditemukan!</p>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Tempel (Paste) data Excel Anda di sini:</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setPastedText(text);
                    handleParsePastedText(text);
                  }}
                  placeholder="Tempel data di sini... (Contoh: salin baris tabel Excel lalu tekan Ctrl+V di sini)"
                  className="w-full h-36 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-blue-400 focus:bg-white resize-none"
                />
              </div>

              {/* Validation / Paste status error feedback */}
              {pasteError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span>{pasteError}</span>
                </div>
              )}

              {/* Live Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Pratinjau Hasil Pembacaan ({parsedPreview.length} Baris Data Ditemukan)
                    </span>
                    <button 
                      onClick={() => { setPastedText(''); setParsedPreview([]); setPasteError(''); }}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Bersihkan
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <th className="p-2 w-10 text-center">No</th>
                          <th className="p-2">Nomor KK</th>
                          <th className="p-2">Nama Kepala Keluarga</th>
                          <th className="p-2">Alamat / RT / RW</th>
                          <th className="p-2">Desa</th>
                          <th className="p-2 text-center">Komponen</th>
                          <th className="p-2">Pendamping</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedPreview.map((kpm, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 text-slate-700">
                            <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-slate-800">{kpm.NomorKK}</td>
                            <td className="p-2 font-semibold text-slate-900">{kpm.NamaKepalaKeluarga}</td>
                            <td className="p-2">{kpm.Alamat} (RT {kpm.RT} / RW {kpm.RW})</td>
                            <td className="p-2 text-slate-600">{kpm.Desa}</td>
                            <td className="p-2 text-center bg-emerald-50/40 text-emerald-800 font-bold">
                              {kpm.JumlahIbuHamil}-{kpm.JumlahBalita}-{kpm.JumlahLansia}-{kpm.JumlahDisabilitas}
                            </td>
                            <td className="p-2 text-slate-500">{kpm.NamaPendamping}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              {/* Target Database Selection */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-slate-500 font-semibold">Tujuan Impor:</span>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setPasteImportTarget('current')}
                    className={`px-3 py-1.5 font-bold transition-all ${
                      pasteImportTarget === 'current'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ikut Mode Sistem ({isProduction ? 'Live' : 'Offline'})
                  </button>
                  <button
                    onClick={() => setPasteImportTarget('offline')}
                    className={`px-3 py-1.5 font-bold transition-all ${
                      pasteImportTarget === 'offline'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Hanya Offline-Demo (Aman & Cepat)
                  </button>
                </div>
              </div>

              {/* Proceed Buttons */}
              <div className="flex items-center gap-2 self-end w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={parsedPreview.length === 0 || isImportingPasted}
                  onClick={handleExecutePasteImport}
                  className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                    parsedPreview.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  }`}
                >
                  {isImportingPasted ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Sedang Mengimpor...</span>
                    </>
                  ) : (
                    <>
                      <span>Mulai Impor {parsedPreview.length} KPM 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Title Nav */}
      <div className="bg-blue-900 px-6 py-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/30 border border-blue-400/30 text-blue-300 text-[10px] uppercase font-bold tracking-wider">
            Sistem Evaluasi Pendamping PKH {isProduction && '• LIVE'}
          </div>
          <h2 className="text-xl font-bold tracking-tight">Dashboard Admin & Verifikator</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic mode switch inline in admin title nav */}
          <button
            type="button"
            onClick={() => {
              if (onToggleProduction) {
                onToggleProduction(!isProduction);
              }
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isProduction 
                ? 'bg-emerald-600 hover:bg-emerald-750 text-white border-emerald-500' 
                : 'bg-indigo-600 hover:bg-indigo-750 text-indigo-50 border-indigo-550'
            }`}
            title="Klik untuk mengubah mode sistem"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isProduction ? 'bg-white animate-pulse' : 'bg-indigo-300'}`}></span>
            {isProduction ? 'Live • Produksi 🚀' : 'Demo • Simulasi ✨'}
          </button>

          {!isProduction && (
            <button
              onClick={handleResetDBData}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded text-xs transition-colors cursor-pointer border border-white/10"
            >
              Reset Contoh Data 🔄
            </button>
          )}

          <button
            onClick={() => {
              setIsAdminAuthorized(false);
              sessionStorage.removeItem('pkh_admin_authorized');
              if (onBackToHome) {
                onBackToHome();
              }
            }}
            className="px-3 py-1 bg-red-650 hover:bg-red-750 text-white rounded text-xs font-bold transition-all cursor-pointer border border-red-550 flex items-center gap-1 shadow-sm"
            title="Keluar dari mode admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Admin 🚪</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Toggle for Admin section */}
      <div className="bg-slate-50 border-b border-slate-200 flex items-center overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveSubTab('monitoring')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'monitoring' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Monitoring Verifikasi 📊
        </button>
        <button
          onClick={() => setActiveSubTab('validasi')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'validasi' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Validasi Laporan 📋
        </button>
        <button
          onClick={() => setActiveSubTab('master')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'master' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Master Data KPM 👨‍👩‍👧‍👦
        </button>
        <button
          onClick={() => setActiveSubTab('rekap')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'rekap' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rekapitulasi Wilayah 🗺️
        </button>
        <button
          onClick={() => setActiveSubTab('riwayat')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'riwayat' 
              ? 'border-blue-600 text-blue-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          Riwayat Laporan KPM 📋
        </button>
      </div>

      <div className="p-6 md:p-8">
        
        {/* SUBTAB 1: MONITORING VERIFIKASI */}
        {activeSubTab === 'monitoring' && (
          <div className="space-y-6">
            
            {/* Filter Wilayah (Pendamping, Desa, RW) bar */}
            <div className="p-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-150/70 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-slate-700 pb-2 border-b border-blue-100/60">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Panel Filter Monitoring Wilayah (Sampai Tingkat Desa & RW)
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Filter Pendamping */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nama Pendamping:</label>
                  <select
                    value={selectedPendampingFilter}
                    onChange={(e) => setSelectedPendampingFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="Semua">Semua Pendamping (Tanpa Filter)</option>
                    {uniquePendampingList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Filter Desa */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Desa / Kelurahan:</label>
                  <select
                    value={selectedDesaFilter}
                    onChange={(e) => setSelectedDesaFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="Semua">Semua Kelurahan / Desa</option>
                    {uniqueDesaList.map(desa => (
                      <option key={desa} value={desa}>{desa}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Filter RW (Checklist Multi) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Rukun Warga (RW):</label>
                    {uniqueRwList.length > 0 && (
                      <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        {selectedRwListFilter.length === 0 ? 'Semua Terpilih' : `${selectedRwListFilter.length} Terpilih`}
                      </span>
                    )}
                  </div>
                  
                  {uniqueRwList.length === 0 ? (
                    <div className="px-3 py-2 bg-slate-100/50 border border-slate-200 text-slate-400 rounded-lg text-xs font-semibold">
                      Tidak ada RW tersedia
                    </div>
                  ) : (
                    <div className="border border-slate-200 bg-white rounded-lg p-2 max-h-[110px] overflow-y-auto space-y-1 shadow-inner">
                      {/* Checkbox item for "Pilih Semua" */}
                      <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedRwListFilter.length === 0}
                          onChange={() => setSelectedRwListFilter([])}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Pilih Semua RW</span>
                      </label>
                      <div className="h-px bg-slate-100 my-1" />
                      {/* Regular checklist items */}
                      <div className="grid grid-cols-2 gap-1 bg-white">
                        {uniqueRwList.map(rw => {
                          const isChecked = selectedRwListFilter.includes(rw);
                          return (
                            <label 
                              key={rw} 
                              className={`flex items-center gap-1.5 p-1 rounded border transition-all cursor-pointer text-[11px] font-semibold select-none ${
                                isChecked 
                                  ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' 
                                  : 'bg-white border-slate-150 text-slate-705 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedRwListFilter(prev => prev.filter(x => x !== rw));
                                  } else {
                                    setSelectedRwListFilter(prev => [...prev, rw]);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="truncate">{rw}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset filter button row if active */}
              {(selectedPendampingFilter !== 'Semua' || selectedDesaFilter !== 'Semua' || selectedRwListFilter.length > 0) && (
                <div className="flex justify-end pt-1 row-reverse">
                  <button
                    onClick={() => {
                      setSelectedPendampingFilter('Semua');
                      setSelectedDesaFilter('Semua');
                      setSelectedRwListFilter([]);
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-blue-200 hover:border-blue-300 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 animate-pulse"
                  >
                    <span>Reset Semua Saringan 🔄</span>
                  </button>
                </div>
              )}
            </div>

            {/* Top aggregate metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase">Total KPM Terdaftar</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-800 mt-2">{totalKPM}</h4>
                <p className="text-[10px] text-slate-400 mt-1 capitalize">Berdasarkan data input KPM Desa</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase">Laporan Masuk</span>
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-800 mt-2">{totalLaporan} Laporan</h4>
                <div className="flex items-center gap-1 text-[10px] text-purple-700 font-semibold mt-1">
                  <span>{totalBulanan} Bulanan</span> &bull; <span>{totalTriwulanan} Triwulan (Bulk)</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase">Tingkat Pelaporan KK</span>
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-800 mt-2">
                  {totalKPM > 0 ? Math.round((reportedKPMCount / totalKPM) * 100) : 0}%
                </h4>
                <p className="text-[10px] text-green-700 font-semibold mt-1">
                  {reportedKPMCount} Sudah Melapor / {unreportedKPMCount} Belum
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase">Laporan Perlu Review</span>
                  <Activity className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-800 mt-2">
                  {verifList.filter(v => v.Status === 'Tersubmit').length}
                </h4>
                <p className="text-[10px] text-amber-700 font-semibold mt-1">
                  Menunggu validasi pendamping desa
                </p>
              </div>
            </div>

            {/* Monthly distribution rekayasa bar charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Distribution by Months table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 lg:col-span-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">Grafik Masukannya Laporan Tiap Bulan (2026)</h4>
                
                <div className="space-y-2.5 pt-2">
                  {Object.entries(reportsPerMonth).map(([month, count]) => {
                    const maxVal = Math.max(...Object.values(reportsPerMonth), 1);
                    const percentage = Math.max(5, (count / maxVal) * 100);
                    
                    return (
                      <div key={month} className="flex items-center gap-3 text-xs text-slate-700">
                        <span className="w-20 truncate font-semibold">{month}</span>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                            style={{ width: `${percentage}%` }} 
                            className={`h-full rounded-full transition-all duration-300 ${
                              count > 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-200'
                            }`}
                          />
                        </div>
                        <span className="w-12 font-mono font-bold text-slate-800 text-right">{count} Laporan</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Components aggregate counts detail */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-slate-600 tracking-wider flex items-center justify-between">
                  <span>Distribusi Komponen Terdaftar</span>
                  <PieChart className="w-4 h-4 text-slate-400" />
                </h4>
                
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Heart className="w-4 h-4 text-red-500 fill-red-100" />
                        <span>Ibu Hamil</span>
                      </span>
                      <span className="font-bold text-slate-950 font-mono sm:text-xs text-[11px]">{totalIbuHamilCount} Slot</span>
                    </div>
                    <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (totalIbuHamilCount / Math.max(totalKPM, 1)) * 40)}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Baby className="w-4 h-4 text-blue-500" />
                        <span>Balita</span>
                      </span>
                      <span className="font-bold text-slate-950 font-mono sm:text-xs text-[11px]">{totalBalitaCount} Slot</span>
                    </div>
                    <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (totalBalitaCount / Math.max(totalKPM, 1)) * 40)}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <span>Lansia</span>
                      </span>
                      <span className="font-bold text-slate-950 font-mono sm:text-xs text-[11px]">{totalLansiaCount} Slot</span>
                    </div>
                    <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (totalLansiaCount / Math.max(totalKPM, 1)) * 40)}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Accessibility className="w-4 h-4 text-purple-500" />
                        <span>Disabilitas</span>
                      </span>
                      <span className="font-bold text-slate-950 font-mono sm:text-xs text-[11px]">{totalDisabilitasCount} Slot</span>
                    </div>
                    <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (totalDisabilitasCount / Math.max(totalKPM, 1)) * 40)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-900 leading-relaxed font-medium">
                  💡 Angka-angka di atas merupakan agregat kumulatif dari seluruh profil KK aktif penerima manfaat Program Keluarga Harapan.
                </div>
              </div>

            </div>

            {/* NEW SECTION: DETIL MONITORING PENERIMA (KPM) DAN BUKTI FISIK FOTO */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <span>📋</span> Detail Monitoring & Bukti Foto Verifikasi KPM
                  </h4>
                  <p className="text-xs text-slate-500">
                    Daftar lengkap KPM aktif di wilayah terpilih berserta riwayat isian form kesehatan dan berkas foto bukti fisik di lapangan.
                  </p>
                </div>
                
                {/* Search & Filter Inputs within Monitoring section */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search bar */}
                  <div className="relative flex-1 sm:w-64 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari Nama / No. KK..."
                      value={monitoringSearch}
                      onChange={(e) => setMonitoringSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-205 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>

                  {/* Status checklist filter */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">Status:</span>
                    <select
                      value={monitoringStatusFilter}
                      onChange={(e: any) => setMonitoringStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-205 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer shadow-sm w-full sm:w-auto"
                    >
                      <option value="Semua">Semua Status</option>
                      <option value="Belum">Belum Melapor ⚠️</option>
                      <option value="Tersubmit">Tersubmit (Menunggu) ⏳</option>
                      <option value="Tervalidasi">Tervalidasi (Selesai) ✅</option>
                      <option value="Ditolak">Ditolak (Perlu Perbaikan) ❌</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Rows Container */}
              <div className="space-y-4">
                {(() => {
                  // 1. First, search filter
                  const searchLower = monitoringSearch.toLowerCase();
                  let displayList = filteredKpmList.filter(k => 
                    k.NamaKepalaKeluarga.toLowerCase().includes(searchLower) || 
                    k.NomorKK.includes(searchLower)
                  );

                  // 2. Status filter
                  displayList = displayList.filter(k => {
                    const reports = verifList.filter(v => v.NomorKK === k.NomorKK);
                    const latestReport = reports.length > 0 
                      ? [...reports].sort((a,b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())[0]
                      : null;

                    if (monitoringStatusFilter === 'Semua') return true;
                    if (monitoringStatusFilter === 'Belum') return !latestReport;
                    
                    return latestReport && latestReport.Status === monitoringStatusFilter;
                  });

                  if (displayList.length === 0) {
                    return (
                      <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                        <span className="text-xl">🔍</span>
                        <p className="text-xs font-semibold">Tidak ada data KPM yang sesuai saringan ini.</p>
                      </div>
                    );
                  }

                  return displayList.map(kpm => {
                    // Get all reports of this KPM
                    const kpmReports = verifList.filter(v => v.NomorKK === kpm.NomorKK)
                      .sort((a,b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
                    
                    const hasReported = kpmReports.length > 0;
                    const latestReport = hasReported ? kpmReports[0] : null;

                    return (
                      <div key={kpm.KPMID} className="p-5 border border-slate-200 hover:border-blue-300 rounded-xl hover:shadow hover:bg-slate-50/15 transition-all duration-200 bg-white space-y-4">
                        {/* Row Header: KPM Area Profile */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md font-mono">
                                No. KK: {kpm.NomorKK}
                              </span>
                              <span className="text-[10px] text-slate-505 font-medium flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                RT {kpm.RT || '—'} / RW {kpm.RW || '—'}, Kel. {kpm.Desa}, {kpm.Kecamatan}
                              </span>
                            </div>
                            <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mt-1">
                              {kpm.NamaKepalaKeluarga}
                              <span className="text-[10px] text-slate-400 font-mono font-normal">(KPMID: {kpm.KPMID})</span>
                            </h5>
                          </div>

                          {/* Latest Status */}
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pendamping: <span className="text-slate-800 font-extrabold">{kpm.NamaPendamping || '—'}</span></span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm border ${
                              !latestReport 
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : latestReport.Status === 'Tervalidasi'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : latestReport.Status === 'Ditolak'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {!latestReport ? '⚠️ Belum Melapor' : `${latestReport.Status === 'Tersubmit' ? '⏳ Menunggu Validasi' : latestReport.Status === 'Tervalidasi' ? '✅ Tervalidasi' : '❌ Ditolak'}`}
                            </span>
                          </div>
                        </div>

                        {/* Middle Block: Components Slot & Reporting info */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                          {/* Left: Components registered */}
                          <div className="md:col-span-4 space-y-2">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Komponen Terdaftar di KK:</span>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50/40 p-2.5 border border-slate-100 rounded-lg">
                              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5 text-red-500" />
                                Ibu Hamil: <strong className="text-slate-900 font-mono">{kpm.JumlahIbuHamil}</strong>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                <Baby className="w-3.5 h-3.5 text-blue-500" />
                                Balita: <strong className="text-slate-900 font-mono">{kpm.JumlahBalita}</strong>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-amber-500" />
                                Lansia: <strong className="text-slate-900 font-mono">{kpm.JumlahLansia}</strong>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-705 flex items-center gap-1.5">
                                <Accessibility className="w-3.5 h-3.5 text-purple-500" />
                                Disabilitas: <strong className="text-slate-900 font-mono">{kpm.JumlahDisabilitas}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Right/Mid: Compilation of report and PHOTOS */}
                          <div className="md:col-span-8 space-y-3">
                            {!hasReported ? (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col justify-center items-center text-center h-full min-h-[90px]">
                                <span className="text-slate-300 text-lg mb-1">📭</span>
                                <span className="text-xs text-slate-400 font-bold italic">Belum pernah melaporkan berkas verifikasi untuk periode berjalan.</span>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {kpmReports.slice(0, 3).map((report) => {
                                  const relatedDetails = detailList.filter(d => d.VerifikasiID === report.VerifikasiID);
                                  const relatedDocs = dokumenList.filter(doc => doc.VerifikasiID === report.VerifikasiID);

                                  return (
                                    <div key={report.VerifikasiID} className="border border-slate-200/80 p-3.5 rounded-xl space-y-3 bg-slate-50/25">
                                      {/* Report header */}
                                      <div className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 flex-wrap gap-2 text-xs shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-blue-900">
                                            Laporan: Bulan {report.BulanPelaporan} / {report.TahunPelaporan}
                                          </span>
                                          <span className="bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-700 font-extrabold px-1.5 py-0.5 rounded font-mono">
                                            {report.JenisPeriode}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          Dikirim: {new Date(report.CreatedAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>

                                      {/* Document Photos Grid and Verifikasi Details */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        {/* Member verified */}
                                        <div className="space-y-2">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Anggota Terverifikasi ({relatedDetails.length}):</span>
                                          <div className="bg-white border border-slate-200 rounded-lg max-h-[110px] overflow-y-auto divide-y divide-slate-100 p-1.5 shadow-inner">
                                            {relatedDetails.length === 0 ? (
                                              <p className="text-[10px] text-slate-400 italic py-1 text-center font-semibold">Tidak ada rincian anggota terverifikasi.</p>
                                            ) : (
                                              relatedDetails.map((det) => (
                                                <div key={det.DetailID} className="p-1 flex justify-between items-center gap-2">
                                                  <div>
                                                    <span className="font-extrabold text-slate-800 block text-[10px] leading-tight">{det.NamaAnggota || '—'}</span>
                                                    <span className="text-[8px] text-slate-400 uppercase leading-none">{det.NamaKomponenPKH} &bull; {det.JenisKomponen}</span>
                                                  </div>
                                                  <span className="text-[8px] font-mono bg-blue-50 text-blue-900 border border-blue-100 px-1 py-0.5 rounded shrink-0 font-bold">
                                                    Resi: {det.NomorResi}
                                                  </span>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>

                                        {/* Physical Photo File attachments with PREVIEW AND DOWNLOAD */}
                                        <div className="space-y-2">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hasil Foto & Bukti Verifikasi:</span>
                                          {relatedDocs.length === 0 ? (
                                            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center italic text-slate-400 text-[10.5px] font-semibold shadow-inner">
                                              Tidak ada berkas bukti foto yang diunggah.
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                                              {relatedDocs.map((doc) => (
                                                <div key={doc.DokumenID} className="group bg-white border border-slate-200 hover:border-blue-300 p-2.5 rounded-xl flex flex-col gap-2.5 shadow-sm hover:shadow transition-all duration-200">
                                                  {/* Frame display image directly */}
                                                  <div className="w-full h-24 bg-slate-50 rounded-lg overflow-hidden relative border border-slate-200 flex items-center justify-center cursor-zoom-in group/img" onClick={() => setModalImage({ url: doc.FileURL, title: doc.JenisDokumen })}>
                                                    {doc.FileURL ? (
                                                      <>
                                                        <img 
                                                          src={doc.FileURL} 
                                                          alt={doc.JenisDokumen} 
                                                          className="w-full h-full object-cover group-hover/img:scale-105 transition-all duration-300" 
                                                          referrerPolicy="no-referrer"
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                          <div className="bg-white/90 text-[10px] text-slate-900 font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                                                            <Eye className="w-3 h-3 text-blue-600 animate-pulse" />
                                                            <span>Zoom 🔍</span>
                                                          </div>
                                                        </div>
                                                      </>
                                                    ) : (
                                                      <div className="flex flex-col items-center gap-1 text-slate-400">
                                                        <FileText className="w-6 h-6" />
                                                        <span className="text-[8px] font-bold uppercase">No Photo</span>
                                                      </div>
                                                    )}
                                                  </div>

                                                  <div className="space-y-0.5 min-w-0">
                                                    <span className="font-extrabold text-slate-800 text-[10.5px] block truncate leading-tight">{doc.JenisDokumen}</span>
                                                    <span className="text-[8px] text-slate-400 truncate block font-mono leading-none">{doc.NamaFile}</span>
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                                                    <button
                                                      type="button"
                                                      onClick={() => setModalImage({ url: doc.FileURL, title: doc.JenisDokumen })}
                                                      className="px-2 py-1 text-[9.5px] font-bold bg-blue-50 hover:bg-blue-105 text-blue-750 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 border border-blue-100"
                                                    >
                                                      <Eye className="w-3 h-3" />
                                                      <span>Buka</span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDownloadFile(doc.FileURL, doc.NamaFile)}
                                                      className="px-2 py-1 text-[9.5px] font-bold bg-emerald-50 hover:bg-emerald-105 text-emerald-750 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 border border-emerald-100"
                                                    >
                                                      <Download className="w-3 h-3" />
                                                      <span>Unduh</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Catatan / remark if any */}
                                      {report.Catatan && (
                                        <div className="p-2.5 border border-amber-100 bg-amber-50/20 text-slate-800 rounded-lg text-[10.5px] leading-snug">
                                          <strong>Catatan Lapangan KPM:</strong> "{report.Catatan}"
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {kpmReports.length > 3 && (
                                  <p className="text-[10px] text-slate-400 italic text-right">+ {kpmReports.length - 3} laporan sebelumnya</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 2: VALIDASI LAPORAN MASUK */}
        {activeSubTab === 'validasi' && (
          <div className="space-y-6">
              
              {/* Filter statuses control bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Saring Status:</span>
                  <div className="inline-flex gap-1">
                    {['Semua', 'Tersubmit', 'Tervalidasi', 'Ditolak'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setValidasiFilterStatus(st);
                          setSelectedReportIDs([]); // Reset selection when filters change
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                          validasiFilterStatus === st 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Ditemukan <strong>{currentFilteredReports.length}</strong> laporan verifikasi kesehatan mandiri.
                </div>
              </div>

              {/* Batch Actions and select-all checklist */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-200 text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentFilteredReports.length > 0 && selectedReportIDs.length === currentFilteredReports.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReportIDs(currentFilteredReports.map(r => r.VerifikasiID));
                        } else {
                          setSelectedReportIDs([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Pilih Semua di List ({currentFilteredReports.length})</span>
                  </label>

                  {selectedReportIDs.length > 0 && (
                    <span className="font-semibold text-slate-700 bg-blue-105 text-[11px] px-2.5 py-1 rounded">
                      Terpilih: <strong className="text-blue-800 font-mono font-extrabold">{selectedReportIDs.length}</strong> laporan
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedReportIDs.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Validasi ${selectedReportIDs.length} laporan terpilih?`)) {
                            handleBatchUpdateStatus(selectedReportIDs, 'Tervalidasi');
                          }
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Validasi Terpilih ({selectedReportIDs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Tolak ${selectedReportIDs.length} laporan terpilih?`)) {
                            handleBatchUpdateStatus(selectedReportIDs, 'Ditolak');
                          }
                        }}
                        className="px-3 py-1.5 bg-red-650 hover:bg-red-755 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs shadow-sm"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Tolak Terpilih
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Reset status ${selectedReportIDs.length} laporan ke 'Tersubmit'?`)) {
                            handleBatchUpdateStatus(selectedReportIDs, 'Tersubmit');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-sm"
                      >
                        Reset Status
                      </button>
                    </>
                  )}

                  {verifList.filter(v => v.Status === 'Tersubmit').length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allPendingIDs = verifList.filter(v => v.Status === 'Tersubmit').map(v => v.VerifikasiID);
                        if (confirm(`Apakah Anda yakin ingin memvalidasi SEMUA (${allPendingIDs.length}) laporan berstatus 'Tersubmit'?`)) {
                          handleBatchUpdateStatus(allPendingIDs, 'Tervalidasi');
                        }
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm ml-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Validasi Semua data masuk ({verifList.filter(v => v.Status === 'Tersubmit').length})
                    </button>
                  )}
                </div>
              </div>

              {/* List to perform validations */}
              <div className="space-y-4">
                {currentFilteredReports
                  .sort((a,b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())
                  .map((report) => {
                    const matchKPM = kpmList.find(k => k.NomorKK === report.NomorKK);
                    const relatedDetails = detailList.filter(d => d.VerifikasiID === report.VerifikasiID);
                    const relatedDocs = dokumenList.filter(doc => doc.VerifikasiID === report.VerifikasiID);

                    const isSelected = selectedReportIDs.includes(report.VerifikasiID);

                    return (
                      <div key={report.VerifikasiID} className={`p-5 border rounded-xl transition-all duration-200 space-y-4 ${
                        isSelected 
                          ? 'border-blue-400 bg-blue-50/10 shadow-md ring-2 ring-blue-100/50' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}>
                        
                        {/* Header block info */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-3">
                          <div className="flex items-start gap-3">
                            {/* Card level checkbox */}
                            <div className="pt-1 select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedReportIDs(prev => [...prev, report.VerifikasiID]);
                                  } else {
                                    setSelectedReportIDs(prev => prev.filter(id => id !== report.VerifikasiID));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  LAPID: {report.VerifikasiID.substring(0,12)}
                                </span>
                                <span className="text-blue-800 text-xs font-extrabold">
                                  Bulan {report.BulanPelaporan} / {report.TahunPelaporan} &bull; {report.JenisPeriode}
                                </span>
                              </div>
                              
                              <h4 className="font-bold text-base text-slate-950 flex items-center gap-1.5">
                                {matchKPM?.NamaKepalaKeluarga || 'No Name'} 
                                <span className="text-xs font-normal text-slate-500 tracking-wide font-mono">({report.NomorKK})</span>
                              </h4>
                              
                              <p className="text-[11px] text-slate-500">
                                Penerima: KPM ID {matchKPM?.KPMID} &bull; Desa {matchKPM?.Desa}, Kec. {matchKPM?.Kecamatan}
                              </p>
                            </div>
                          </div>

                        {/* Status action layout based on current status */}
                        <div className="flex items-center gap-2">
                          {report.Status === 'Tersubmit' ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateStatus(report.VerifikasiID, 'Tervalidasi')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Validasi Laporan
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(report.VerifikasiID, 'Ditolak')}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                report.Status === 'Tervalidasi' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {report.Status === 'Tervalidasi' ? 'Approved (Tervalidasi)' : 'Ditolak (Rejected)'}
                              </span>
                              <button
                                onClick={() => handleUpdateStatus(report.VerifikasiID, 'Tersubmit')}
                                className="p-1 px-2 text-[10px] text-slate-400 hover:text-slate-600 border border-slate-200 bg-white rounded cursor-pointer"
                                title="Kembalikan Status"
                              >
                                Undo 🔄
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details of health members & documentation */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-normal">
                        
                        {/* Member Names & codes verification */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex justify-between items-center text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                            <span>Daftar Anggota Keluarga Terverifikasi:</span>
                            <span className="text-slate-700 normal-case">Total: {relatedDetails.length}</span>
                          </div>

                          <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100 p-1">
                            {relatedDetails.length === 0 ? (
                              <p className="p-3 text-center text-slate-400 italic">No details found.</p>
                            ) : (
                              relatedDetails.map((det) => (
                                <div key={det.DetailID} className="p-2 flex.cols sm:flex justify-between items-center gap-3">
                                  <div>
                                    <span className="font-bold text-slate-800 block text-[11px]">{det.NamaAnggota || '—'}</span>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">{det.NamaKomponenPKH} &bull; {det.JenisKomponen}</span>
                                  </div>
                                  <span className="font-mono text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                                    Resi: {det.NomorResi}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Catatan verif */}
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-950">
                            <strong>Catatan KPM:</strong> "{report.Catatan || 'Tanpa catatan'}"
                          </div>
                        </div>

                        {/* File lists with view modal trigger */}
                        <div className="space-y-3">
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Berkas Bukti Fisik Lapangan:</p>
                          
                          <div className="flex flex-col gap-2.5">
                            {relatedDocs.map((doc) => (
                              <div key={doc.DokumenID} className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 p-2.5 rounded-lg flex items-center justify-between gap-2">
                                <div className="truncate">
                                  <span className="font-bold text-slate-800 text-[10px] block truncate">{doc.JenisDokumen}</span>
                                  <span className="text-[8px] text-slate-400 truncate block font-mono">{doc.NamaFile}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setModalImage({ url: doc.FileURL, title: doc.JenisDokumen })}
                                    className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Buka
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFile(doc.FileURL, doc.NamaFile)}
                                    className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded cursor-pointer flex items-center gap-1 shrink-0"
                                    title={`Unduh ${doc.JenisDokumen}`}
                                  >
                                    <Download className="w-3 h-3" />
                                    Unduh
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })}

              {verifList.filter(v => validasiFilterStatus === 'Semua' ? true : v.Status === validasiFilterStatus).length === 0 && (
                <div className="text-center py-12 border bg-slate-50 rounded-xl space-y-2 text-slate-400">
                  <span className="text-2xl">📋</span>
                  <p className="text-xs font-semibold">Tidak ada laporan verifikasi yang sesuai dengan kriteria filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: MASTER DATA KPM MANAGEMENT */}
        {activeSubTab === 'master' && (
          <div className="space-y-6">
            
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-850 text-base">Kelola Master Data Keluarga Penerima Manfaat</h3>
                <p className="text-xs text-slate-500">
                  Perubahan jumlah komponen kesehatan di sini akan langsung mempengaruhi resi verifikasi otomatis yang terbentuk pada form isian KPM.
                </p>
              </div>


            </div>

            {/* Import & Export Operations Panel */}
            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-extrabold text-slate-800 text-xs block flex items-center gap-1">
                  <span>📂</span> Operasi Data Master KPM
                </span>
                <span className="text-slate-500 text-[11px] block">
                  Unggah berkas untuk impor data KPM masal, atau unduh daftar KPM aktif ke dalam format .JSON / .CSV (bisa dibuka di Excel).
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Impor Button */}
                <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm" title="Unggah berkas data master KPM">
                  <Upload className="w-4 h-4" />
                  <span>Impor Berkas (.JSON / .CSV)</span>
                  <input 
                    type="file" 
                    accept=".json,.csv" 
                    onChange={handleImportFile} 
                    className="hidden" 
                  />
                </label>

                {/* Salin Tempel Excel Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPastedText('');
                    setParsedPreview([]);
                    setPasteError('');
                    setIsImportingPasted(false);
                    setShowPasteModal(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Salin tabel data master KPM langsung dari Excel lalu tempel di sini"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Salin-Tempel Excel 📋</span>
                </button>

                {/* Ekspor JSON Button */}
                <button
                  onClick={handleExportKPM}
                  className="px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-350 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Ekspor JSON</span>
                </button>

                {/* Ekspor CSV Button */}
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-350 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Ekspor CSV (Excel)</span>
                </button>

                {/* Kosongkan KPM Button */}
                <button
                  onClick={handleClearMasterKPM}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Hapus seluruh keluarga KPM dari database untuk memulai database kosong"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Kosongkan Master KPM 🗑️</span>
                </button>
              </div>
            </div>

            {/* Filter Panel KPM */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Penyaringan & Filter Cari KPM</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Search query field */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari No. KK atau Nama KPM..."
                    value={kpmSearchQuery}
                    onChange={(e) => setKpmSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Status select field */}
                <div>
                  <select
                    value={kpmStatusFilter}
                    onChange={(e) => setKpmStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Semua">Semua Status KPM</option>
                    <option value="Aktif">Status: Aktif</option>
                    <option value="Tidak Aktif">Status: Tidak Aktif</option>
                  </select>
                </div>

                {/* Desa select field */}
                <div>
                  <select
                    value={kpmDesaFilter}
                    onChange={(e) => setKpmDesaFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-semibold"
                  >
                    <option value="Semua">Semua Kelurahan</option>
                    {Array.from(new Set(kpmList.map(k => k.Desa).filter(Boolean).map(d => d.toUpperCase()))).sort().map(desa => (
                      <option key={desa} value={desa}>{desa}</option>
                    ))}
                  </select>
                </div>

                {/* Pendamping select field */}
                <div>
                  <select
                    value={kpmPendampingFilter}
                    onChange={(e) => setKpmPendampingFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Semua">Semua Pendamping</option>
                    {Array.from(new Set(kpmList.map(k => k.NamaPendamping).filter(Boolean))).sort().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* KPM Form Open dialog */}
            {kpmFormOpen && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-fade-in">
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <span>{isEditingKPM ? '⚙️ Edit Data KPM' : '➕ Registrasi KPM Baru'}</span>
                </h4>

                <form onSubmit={handleSaveKpm} className="space-y-4 text-xs">
                  {kpmFormError && (
                    <div className="p-3 bg-red-100 text-red-800 font-bold border border-red-200 rounded">
                      ⚠️ {kpmFormError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* KK */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Nomor KK (16 Digit)</label>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        placeholder="327601xxxxxxxxxx"
                        disabled={isEditingKPM}
                        value={formKK}
                        onChange={(e) => setFormKK(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    {/* Nama Kepala Keluarga */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Nama Kepala Keluarga</label>
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama lengkap..."
                        value={formNama}
                        onChange={(e) => setFormNama(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white capitalize"
                      />
                    </div>

                    {/* Alamat */}
                    <div className="space-y-1 md:col-span-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Alamat Jalan / Gg / No.</label>
                      <input
                        type="text"
                        required
                        placeholder="Kampung Swadaya Gg. Damai No. 12"
                        value={formAlamat}
                        onChange={(e) => setFormAlamat(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    {/* RT */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">RT</label>
                      <input
                        type="text"
                        placeholder="Misal: 02"
                        maxLength={5}
                        value={formRT}
                        onChange={(e) => setFormRT(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    {/* RW */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">RW</label>
                      <input
                        type="text"
                        placeholder="Misal: 03"
                        maxLength={5}
                        value={formRW}
                        onChange={(e) => setFormRW(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    {/* Kecamatan Selector */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Kecamatan</label>
                      <select
                        value={formKec}
                        onChange={(e) => {
                          const newKec = e.target.value;
                          setFormKec(newKec);
                          const relatedDesas = INDONESIA_REGIONAL.desaList[newKec] || [];
                          if (relatedDesas.length > 0) {
                            setFormDesa(relatedDesas[0]);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {INDONESIA_REGIONAL.kecamatanList.map((kec) => (
                          <option key={kec} value={kec}>{kec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Desa */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Desa / Kelurahan</label>
                      <select
                        value={formDesa}
                        onChange={(e) => setFormDesa(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {(INDONESIA_REGIONAL.desaList[formKec] || []).map((desa) => (
                          <option key={desa} value={desa}>{desa}</option>
                        ))}
                      </select>
                    </div>

                    {/* Nama Pendamping */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Nama Pendamping</label>
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama pendamping aslinya..."
                        value={formNamaPendamping}
                        onChange={(e) => setFormNamaPendamping(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[10px] uppercase">Status KPM</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'Aktif' | 'Tidak Aktif')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                      </select>
                    </div>
                  </div>

                  {/* Component input boxes */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-900 space-y-3">
                    <h5 className="font-bold uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1 pb-1 border-b border-slate-100">
                      <span>🩺</span>
                      Beban Komponen Kesehatan Keluarga:
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold block text-[10px]">Jumlah Ibu Hamil</label>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={formIbuHamil}
                          onChange={(e) => setFormIbuHamil(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded border border-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold block text-[10px]">Jumlah Balita</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={formBalita}
                          onChange={(e) => setFormBalita(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded border border-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold block text-[10px]">Jumlah Lansia</label>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={formLansia}
                          onChange={(e) => setFormLansia(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded border border-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold block text-[10px]">Jumlah Disabilitas</label>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={formDisabilitas}
                          onChange={(e) => setFormDisabilitas(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded border border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-500 font-semibold text-right">
                      Total Agregat Komponen Kesehatan: <span className="bg-slate-100 text-slate-800 px-2.0 py-0.5 rounded font-bold font-mono">
                        {Number(formIbuHamil) + Number(formBalita) + Number(formLansia) + Number(formDisabilitas)} Orang
                      </span>
                    </div>
                  </div>

                  {/* Form Trigger Row */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setKpmFormOpen(false)}
                      className="px-4 py-2 hover:bg-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Format Simpan 💾
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* Table layout representing registered KPM masters */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wide text-[10px] select-none">
                  <tr>
                    <th 
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('NamaKepalaKeluarga')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Nama Kepala / KK</span>
                        {kpmSortKey === 'NamaKepalaKeluarga' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('Alamat')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Alamat</span>
                        {kpmSortKey === 'Alamat' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('RT')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>RT</span>
                        {kpmSortKey === 'RT' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('RW')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>RW</span>
                        {kpmSortKey === 'RW' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('Desa')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Kelurahan</span>
                        {kpmSortKey === 'Desa' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('NamaPendamping')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Pendamping</span>
                        {kpmSortKey === 'NamaPendamping' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3">Komponen Ibu/Anak/Lansia/Dis.</th>
                    <th 
                      className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('TotalAgregatKomponen')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Agregat</span>
                        {kpmSortKey === 'TotalAgregatKomponen' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleKpmSort('StatusKPM')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {kpmSortKey === 'StatusKPM' && (
                          <span className="text-blue-600 font-bold">{kpmSortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 leading-normal">
                  {paginatedKpmList.map((k) => (
                    <tr key={k.KPMID} className="hover:bg-slate-50/50">
                      
                      <td className="px-4 py-3 space-y-0.5">
                        <span className="font-bold text-slate-900 block">{k.NamaKepalaKeluarga}</span>
                        <span className="font-mono text-[10px] text-slate-400 block">{k.NomorKK}</span>
                      </td>

                      <td className="px-4 py-3 truncate max-w-[150px]" title={k.Alamat}>
                        <span>{k.Alamat}</span>
                      </td>

                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-850">
                        {k.RT || extractRTVal(k.Alamat) || '-'}
                      </td>

                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-850">
                        {k.RW || extractRWVal(k.Alamat) || '-'}
                      </td>

                      <td className="px-4 py-3 uppercase font-extrabold text-blue-800 text-[10px]">
                        {k.Desa}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800">{k.NamaPendamping || '-'}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="bg-red-50 text-red-700 border border-red-100 font-semibold px-1 rounded text-[10px]">
                            Ham: {k.JumlahIbuHamil}
                          </span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 font-semibold px-1 rounded text-[10px]">
                            Bal: {k.JumlahBalita}
                          </span>
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 font-semibold px-1 rounded text-[10px]">
                            Lan: {k.JumlahLansia}
                          </span>
                          <span className="bg-purple-50 text-purple-700 border border-purple-100 font-semibold px-1 rounded text-[10px]">
                            Dis: {k.JumlahDisabilitas}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-center">
                        <span className={`px-2 py-0.5 rounded-full ${k.TotalAgregatKomponen > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {k.TotalAgregatKomponen}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          k.StatusKPM === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {k.StatusKPM}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => openEditKpmForm(k)}
                            className="p-1 px-2 border border-slate-200 hover:border-blue-400 text-blue-600 rounded cursor-pointer"
                            title="Edit Profil KPM"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKpm(k.KPMID)}
                            className="p-1 px-2 border border-slate-200 hover:border-red-400 text-red-500 rounded cursor-pointer"
                            title="Hapus KPM"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                  {paginatedKpmList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                        Tidak ada data KPM yang cocok dengan kriteria filter penyaringan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-600">
              <div>
                Menampilkan <span className="font-bold text-slate-850">{totalKpmItems === 0 ? 0 : startIndex + 1}</span> sampai <span className="font-bold text-slate-850">{Math.min(startIndex + kpmItemsPerPage, totalKpmItems)}</span> dari <span className="font-bold text-slate-850">{totalKpmItems}</span> keluarga (KPM)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={kpmCurrentPage === 1}
                  onClick={() => setKpmCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold text-slate-700 transition"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center gap-1 text-xs">
                  Halaman <span className="font-bold text-slate-850">{kpmCurrentPage}</span> dari <span className="font-bold text-slate-850">{totalKpmPages}</span>
                </div>
                <button
                  type="button"
                  disabled={kpmCurrentPage === totalKpmPages}
                  onClick={() => setKpmCurrentPage(prev => Math.min(prev + 1, totalKpmPages))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold text-slate-700 transition"
                >
                  Selanjutnya
                </button>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 4: REKAPITULASI WILAYAH */}
        {activeSubTab === 'rekap' && (
          <div className="space-y-6">
            
            <div className="space-y-1">
              <h3 className="font-bold text-slate-850 text-base">Rekapitulasi Indikator Wilayah & Laporan</h3>
              <p className="text-xs text-slate-500">
                Pilih tabular rekap untuk memonitor kontribusi partisipasi masyarakat per desa / kelurahan terdaftar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Rekap per Desa */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-xs uppercase text-slate-700 flex items-center justify-between">
                  <span>Rekapitulasi per Desa / Kelurahan</span>
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-bold">
                      <tr>
                        <th className="px-4 py-2">Nama Desa</th>
                        <th className="px-4 py-2 text-center">KK Terdaftar</th>
                        <th className="px-4 py-2 text-center">Komponen Kesehatan</th>
                        <th className="px-4 py-2 text-center">Laporan Masuk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {Object.entries(listDesa).map(([desa, stats]) => {
                        const totalComp = stats.IbuHamil + stats.Balita + stats.Lansia + stats.Disabilitas;
                        return (
                          <tr key={desa}>
                            <td className="px-4 py-2 bg-slate-50 font-semibold">{desa}</td>
                            <td className="px-4 py-2 text-center font-bold">{stats.KPM} KK</td>
                            <td className="px-4 py-2 text-center font-mono">
                              <span>{totalComp} Total</span> <span className="text-[10px] text-slate-400 block">(H:{stats.IbuHamil} B:{stats.Balita} L:{stats.Lansia} D:{stats.Disabilitas})</span>
                            </td>
                            <td className="px-4 py-2 text-center font-mono text-blue-700 font-extrabold">{stats.Laporan} Laporan</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informative advice & Statistics box */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <span>💡</span>
                    <span>Informasi Pelaporan Kecamatan</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sistem evaluasi pelaporan berjalan terpusat untuk lingkup <strong>Kecamatan terpilih</strong>. Seluruh proses pengawasan oleh Pendamping di tingkat kelurahan/desa dikonsolidasikan langsung guna mempercepat monitoring program jaminan sosial Keluarga Harapan.
                  </p>
                  
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1">
                      <span>🛡️</span>
                      Prinsip Konsistensi Data Wilayah:
                    </p>
                    <p>
                      Kabupaten pelaporan default terkunci pada <strong>Kabupaten Sukoharjo, Provinsi Jawa Tengah</strong>. Seluruh data kelurahan merujuk pada cakupan wilayah pendamping kelolaan operator.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUBTAB 5: RIWAYAT LAPORAN KPM HEALTH */}
        {activeSubTab === 'riwayat' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-850 text-base">Riwayat Penyerahan Laporan KPM</h3>
              <p className="text-xs text-slate-500">
                Gunakan menu di bawah ini untuk mencari dan melihat seluruh rekaman riwayat pelaporan verifikasi KPM Kesehatan secara detail.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <RiwayatKPM
                initialKK={initialKK}
                isProduction={isProduction}
              />
            </div>
          </div>
        )}

      </div>

      {/* RE-USABLE PHOTO DIALOG */}
      {modalImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full border border-slate-300 shadow-2xl relative">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide">{modalImage.title}</h3>
              <button
                type="button"
                onClick={() => setModalImage(null)}
                className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
              >
                Tutup [×]
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-950">
              <img 
                src={modalImage.url} 
                alt={modalImage.title} 
                className="max-h-[70vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
