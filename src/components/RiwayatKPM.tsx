/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, FileText, CheckCircle2, Clock, XCircle, Image, RefreshCw, 
  ChevronDown, ChevronUp, MapPin, Eye, AlertCircle
} from 'lucide-react';
import { MockDatabase } from '../data/mockDb';
import { VerifikasiPKH, DetailKomponenVerifikasi, DokumenVerifikasi, MasterKPM } from '../types';
import { DBService } from '../utils/dbService';

interface RiwayatKPMProps {
  initialKK?: string;
  onGoToWizard?: () => void;
  isProduction?: boolean;
}

export default function RiwayatKPM({ initialKK = '', onGoToWizard, isProduction = false }: RiwayatKPMProps) {
  const [searchKK, setSearchKK] = useState(initialKK);
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [filterTahun, setFilterTahun] = useState('2026');
  const [hasSearched, setHasSearched] = useState(initialKK !== '');

  // DB Records
  const [allVerifikasi, setAllVerifikasi] = useState<VerifikasiPKH[]>([]);
  const [allDetails, setAllDetails] = useState<DetailKomponenVerifikasi[]>([]);
  const [allDokumens, setAllDokumens] = useState<DokumenVerifikasi[]>([]);
  const [allKPMs, setAllKPMs] = useState<MasterKPM[]>([]);

  // Expanded views for detailed accordion lists
  const [expandedVerifId, setExpandedVerifId] = useState<string | null>(null);

  // Selected Photo for modal preview
  const [modalPhoto, setModalPhoto] = useState<{ url: string; title: string } | null>(null);

  const fetchDatabase = async () => {
    try {
      const verifikasiList = await DBService.getAllReports();
      setAllVerifikasi(verifikasiList);
    } catch (err) {
      console.warn("Gagal mendapatkan riwayat verifikasi dari cloud:", err);
      setAllVerifikasi(MockDatabase.getVerifikasi());
    }

    try {
      const kpmList = await DBService.getKPMList();
      setAllKPMs(kpmList);
    } catch (err) {
      console.warn("Gagal mendapatkan KPM list dari cloud:", err);
      setAllKPMs(MockDatabase.getMasterKPM());
    }

    setAllDetails(MockDatabase.getDetailKomponen());
    setAllDokumens(MockDatabase.getDokumen());
  };

  useEffect(() => {
    fetchDatabase();
  }, [isProduction]);

  // Filter & Search Logic
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
  };

  const getFilteredReports = () => {
    let list = [...allVerifikasi];
    
    // Sort chronologically (latest first)
    list.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());

    // Filter by KK
    if (searchKK.trim() !== '') {
      list = list.filter(item => item.NomorKK.includes(searchKK.trim()));
    } else if (hasSearched) {
      // If user explicitly searched with empty box, show nothing or everything?
      // Let's keep it to only matched KK if they input something, otherwise show all if not looking up specific KK
    }

    // Filter by Month
    if (filterBulan !== 'Semua') {
      list = list.filter(item => item.BulanPelaporan === filterBulan);
    }

    // Filter by Year
    if (filterTahun !== 'Semua') {
      list = list.filter(item => item.TahunPelaporan.toString() === filterTahun);
    }

    return list;
  };

  const currentReportsList = getFilteredReports();

  // Find corresponding KPM metadata for profile display on search
  const firstReportMatched = currentReportsList.length > 0 ? currentReportsList[0] : null;
  const currentKPMProfile = searchKK.trim() !== '' 
    ? allKPMs.find(k => k.NomorKK === searchKK.trim()) 
    : (firstReportMatched ? allKPMs.find(k => k.NomorKK === firstReportMatched.NomorKK) : null);

  const selectSuggestedKK = (kk: string) => {
    setSearchKK(kk);
    setHasSearched(true);
  };

  const monthsList = [
    'Semua', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="text-center md:text-left space-y-1.5">
        <h2 id="riwayat-header" className="text-2xl font-bold text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-2">
          <span>📋</span>
          Riwayat Penyerahan & Verifikasi KPM
        </h2>
        <p className="text-slate-500 text-sm">
          Cari berdasarkan Nomor KK keluarga Anda untuk melacak status persetujuan laporan bulanan/triwulan.
        </p>
      </div>

      {/* Lookup controls */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Search Panel Box */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            
            {/* KK No Input */}
            <div className="space-y-1.5">
              <label htmlFor="search-kk-history" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Cari Nomor KK</label>
              <div className="relative">
                <input
                  id="search-kk-history"
                  type="text"
                  placeholder="Ketik 16 digit KK..."
                  value={searchKK}
                  onChange={(e) => setSearchKK(e.target.value)}
                  maxLength={16}
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono placeholder-slate-400 text-slate-900"
                />
                {searchKK && (
                  <button 
                    type="button" 
                    onClick={() => { setSearchKK(''); setHasSearched(false); }} 
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-bold text-[11px]"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Month select */}
            <div className="space-y-1.5">
              <label htmlFor="bulan-filter" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Bulan</label>
              <select
                id="bulan-filter"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                {monthsList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year select */}
            <div className="space-y-1.5">
              <label htmlFor="tahun-filter" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Tahun</label>
              <select
                id="tahun-filter"
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                <option value="Semua">Semua Tahun</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

          </form>

          {/* Quick instructions/suggestions if hasn't searched */}
          {!hasSearched && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-3 text-xs text-blue-900 leading-normal">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
              <p>
                Ketik 16 Digit Nomor Kartu Keluarga (KK) Anda di atas untuk menyaring dan memantau riwayat laporan verifikasi kesehatan keluarga Anda secara spesifik.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Target results header & profile panel */}
      {hasSearched && currentKPMProfile && (
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Informasi KPM Yang Dicari
            </span>
            <h3 className="font-bold text-lg">{currentKPMProfile.NamaKepalaKeluarga}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              {currentKPMProfile.Alamat}, Desa {currentKPMProfile.Desa}, Kec. {currentKPMProfile.Kecamatan}, {currentKPMProfile.Kabupaten}
            </p>
          </div>

          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">No KK:</span>
              <span className="font-mono text-emerald-400 font-bold">{currentKPMProfile.NomorKK}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Status KPM:</span>
              <span className={`font-semibold ${currentKPMProfile.StatusKPM === 'Aktif' ? 'text-green-400' : 'text-red-400'}`}>
                ● {currentKPMProfile.StatusKPM}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN RENDER LIST */}
      <div id="riwayat-results-block" className="space-y-4">
        
        {currentReportsList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-3">
            <span className="text-4xl">📭</span>
            <h4 className="font-bold text-slate-700">Tidak Ada Laporan Verifikasi Ditemukan</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Silakan pastikan Nomor KK yang Anda masukkan di atas tepat dan sudah pernah mendaftarkan verifikasi. Klik tombol "Mulai Verifikasi Mandiri" jika ingin memprakarsai entri laporan baru.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              Menampilkan {currentReportsList.length} Laporan Ditemukan:
            </p>

            {currentReportsList.map((report) => {
              const isExpanded = expandedVerifId === report.VerifikasiID;
              
              // Filter details & docs for this specific report
              const reportDetails = allDetails.filter(d => d.VerifikasiID === report.VerifikasiID);
              const reportDocs = allDokumens.filter(doc => doc.VerifikasiID === report.VerifikasiID);

              // Format date
              const entryDateFormatted = new Date(report.TanggalEntry).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
              });

              return (
                <div 
                  key={report.VerifikasiID}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow transition-shadow"
                >
                  
                  {/* Accordion header card row */}
                  <div 
                    onClick={() => setExpandedVerifId(isExpanded ? null : report.VerifikasiID)}
                    className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    
                    {/* Period title */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-teal-900 bg-teal-100 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {report.JenisPeriode}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ID: {report.VerifikasiID.substring(0, 14)}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-800">
                        Bulan Pelaporan: <span className="text-blue-800">{report.BulanPelaporan} {report.TahunPelaporan}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Di-submit pada {entryDateFormatted} &bull; KK {report.NomorKK}
                      </p>
                    </div>

                    {/* Status badge & detail toggle */}
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Nomor Laporan</span>
                        <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {report.NomorLaporan}
                        </span>
                      </div>

                      {/* Status Badges */}
                      {report.Status === 'Tersubmit' && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          Tersubmit
                        </span>
                      )}
                      {report.Status === 'Tervalidasi' && (
                        <span className="bg-green-100 text-green-800 border border-green-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                          Tervalidasi
                        </span>
                      )}
                      {report.Status === 'Ditolak' && (
                        <span className="bg-red-100 text-red-800 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Ditolak
                        </span>
                      )}

                      {/* Arrow toggle icon */}
                      <span className="text-slate-400 p-1.5 bg-slate-50 rounded-full hover:bg-slate-100">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>

                    </div>

                  </div>

                  {/* Expanded block values */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs leading-normal">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Notes block */}
                        <div className="md:col-span-2 space-y-1.5 p-3.5 bg-white rounded-lg border border-slate-200/60 shadow-sm text-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Catatan Tambahan Verifikasi KPM:</span>
                          <p className="italic">"{report.Catatan || 'Tidak ada catatan.'}"</p>
                        </div>

                        {/* Timing stamps */}
                        <div className="p-3.5 bg-white rounded-lg border border-slate-200/60 shadow-sm text-slate-600 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Data Perekaman:</span>
                          <p>Entry Date: <strong>{report.TanggalEntry}</strong></p>
                          <p>ID Transaksi: <strong className="font-mono">{report.VerifikasiID}</strong></p>
                        </div>

                      </div>

                      {/* HEALTH COMPONENTS INNER TABLE */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <span>🩺</span>
                          Detail Komponen Kesehatan PKH Resmi & Nomor Resi Terdaftar
                        </span>

                        {reportDetails.length === 0 ? (
                          <div className="p-3 bg-white text-center border text-slate-400 text-[11px] italic">
                            Otomatis merujuk data dinamis Master KPM terdaftar.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
                            <table className="w-full text-left text-xs divide-y divide-slate-100">
                              <thead className="bg-slate-100 text-slate-700 font-bold">
                                <tr>
                                  <th className="px-4 py-2">No</th>
                                  <th className="px-4 py-2">Jenis Komponen</th>
                                  <th className="px-4 py-2">Nama Anggota Keluarga</th>
                                  <th className="px-4 py-2 font-mono">Nomor Resi Otomatis</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {reportDetails.map((det, idx) => (
                                  <tr key={det.DetailID} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-2 font-semibold">{idx + 1}</td>
                                    <td className="px-4 py-2 font-medium">{det.NamaKomponenPKH}</td>
                                    <td className="px-4 py-2 font-semibold text-slate-900">{det.NamaAnggota || 'Sesuai Master'}</td>
                                    <td className="px-4 py-2 font-mono text-indigo-700 font-bold">{det.NomorResi}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* UPLOADED ATTACHMENT IMAGES PREVIEW */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <span>📷</span>
                          Dokumen Pembuktian Fisik Terlampir
                        </span>

                        {reportDocs.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px]">Tidak ada file bukti fisik terlampir dalam simulasi transaksi ini.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {reportDocs.map((doc) => (
                              <div 
                                key={doc.DokumenID}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 hover:border-blue-400 transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-2 max-w-[70%]">
                                  <Image className="w-5 h-5 text-blue-600 shrink-0" />
                                  <div className="truncate">
                                    <p className="font-bold text-slate-800 text-[11px] truncate">{doc.JenisDokumen}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{doc.NamaFile}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setModalPhoto({ url: doc.FileURL, title: doc.JenisDokumen })}
                                  className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                                >
                                  <Eye className="w-3 h-3" />
                                  Lihat File
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* PHOTO PREVIEW MODAL */}
      {modalPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full border border-slate-300 shadow-2xl relative">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide">{modalPhoto.title}</h3>
              <button
                type="button"
                onClick={() => setModalPhoto(null)}
                className="text-white bg-white/15 hover:bg-white/20 hover:text-red-400 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup [×]
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-950">
              <img 
                src={modalPhoto.url} 
                alt={modalPhoto.title} 
                className="max-h-[70vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-50 text-center text-[10px] text-slate-400 italic">
              Dokumen validasi resmi Pendamping PKH Kecamatan Baki.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
