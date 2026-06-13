/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MasterKPM, VerifikasiPKH, DetailKomponenVerifikasi, DokumenVerifikasi } from '../types';
import { getMonthsForTriwulan } from '../utils/triwulan';

// Predefined Indonesia regional structures for mock KPM
export const INDONESIA_REGIONAL = {
  kecamatanList: ['Kartasura', 'Grogol', 'Baki', 'Mojolaban', 'Sukoharjo'],
  desaList: {
    'Kartasura': ['Kartasura', 'Pabelan', 'Singopuran', 'Makamhaji', 'Gumpang'],
    'Grogol': ['Grogol', 'Kwarasan', 'Madegondo', 'Langon', 'Cemani'],
    'Baki': ['Baki Pandeyan', 'Gentan', 'Kajen', 'Duwet'],
    'Mojolaban': ['Palur', 'Bekonang', 'Wirun', 'Laboto'],
    'Sukoharjo': ['Sukoharjo', 'Begajah', 'Jetis', 'Gayam']
  } as Record<string, string[]>
};

const INITIAL_MASTER_KPM: MasterKPM[] = [
  {
    KPMID: 'KPM-001',
    NomorKK: '3276010000000001',
    NamaKepalaKeluarga: 'Suryadi Pratama',
    Alamat: 'Jl. Ahmad Yani No. 45, Kartasura, RT 02/RW 03',
    Desa: 'Pabelan',
    Kecamatan: 'Kartasura',
    Kabupaten: 'Kabupaten Sukoharjo',
    RT: '02',
    RW: '03',
    JumlahIbuHamil: 1,
    JumlahBalita: 2,
    JumlahLansia: 1,
    JumlahDisabilitas: 0,
    TotalAgregatKomponen: 4,
    StatusKPM: 'Aktif',
    NamaPendamping: 'Ahmad Fauzi'
  },
  {
    KPMID: 'KPM-002',
    NomorKK: '3276010000000002',
    NamaKepalaKeluarga: 'Bambang Hermawan',
    Alamat: 'Perumahan Solo Baru Blok C5, RT 04/RW 11',
    Desa: 'Grogol',
    Kecamatan: 'Grogol',
    Kabupaten: 'Kabupaten Sukoharjo',
    RT: '04',
    RW: '11',
    JumlahIbuHamil: 0,
    JumlahBalita: 1,
    JumlahLansia: 1,
    JumlahDisabilitas: 1,
    TotalAgregatKomponen: 3,
    StatusKPM: 'Aktif',
    NamaPendamping: 'Siti Rahmaawati'
  },
  {
    KPMID: 'KPM-003',
    NomorKK: '3276010000000003',
    NamaKepalaKeluarga: 'Siti Aminah',
    Alamat: 'Kampung Gentan RT 01/RW 02',
    Desa: 'Gentan',
    Kecamatan: 'Baki',
    Kabupaten: 'Kabupaten Sukoharjo',
    RT: '01',
    RW: '02',
    JumlahIbuHamil: 1,
    JumlahBalita: 0,
    JumlahLansia: 0,
    JumlahDisabilitas: 0,
    TotalAgregatKomponen: 1,
    StatusKPM: 'Aktif',
    NamaPendamping: 'Ahmad Fauzi'
  },
  {
    KPMID: 'KPM-004',
    NomorKK: '3276010000000004',
    NamaKepalaKeluarga: 'Kuswandi',
    Alamat: 'Jl. Palur Indah Gg. Masjid No. 12',
    Desa: 'Palur',
    Kecamatan: 'Mojolaban',
    Kabupaten: 'Kabupaten Sukoharjo',
    RT: '03',
    RW: '05',
    JumlahIbuHamil: 0,
    JumlahBalita: 0,
    JumlahLansia: 1,
    JumlahDisabilitas: 0,
    TotalAgregatKomponen: 1,
    StatusKPM: 'Aktif',
    NamaPendamping: 'Dewi Lestari'
  },
  {
    KPMID: 'KPM-005',
    NomorKK: '3276010000000005',
    NamaKepalaKeluarga: 'Agus Setiawan',
    Alamat: 'Gg. Swadaya Begajah RT 05/RW 01',
    Desa: 'Begajah',
    Kecamatan: 'Sukoharjo',
    Kabupaten: 'Kabupaten Sukoharjo',
    RT: '05',
    RW: '01',
    JumlahIbuHamil: 0,
    JumlahBalita: 0,
    JumlahLansia: 0,
    JumlahDisabilitas: 0,
    TotalAgregatKomponen: 0, // 0 components test-case
    StatusKPM: 'Aktif',
    NamaPendamping: 'Budi Utomo'
  },
  {
    KPMID: 'KPM-006',
    NomorKK: '3276010000000006',
    NamaKepalaKeluarga: 'Hartono Widodo',
    Alamat: 'Jl. Raden Saleh Gg. Utama Sukoharjo',
    Desa: 'Sukoharjo',
    Kecamatan: 'Sukoharjo',
    Kabupaten: 'Kabupaten Sukoharjo',
    RT: '01',
    RW: '04',
    JumlahIbuHamil: 1,
    JumlahBalita: 1,
    JumlahLansia: 0,
    JumlahDisabilitas: 0,
    TotalAgregatKomponen: 2,
    StatusKPM: 'Tidak Aktif', // Inactive test-case
    NamaPendamping: 'Dewi Lestari'
  }
];

// Seed initial Verifications with realistic history
const INITIAL_VERIFIKASI: VerifikasiPKH[] = [
  {
    VerifikasiID: 'VER-ID-001',
    KPMID: 'KPM-003',
    NomorKK: '3276010000000003',
    JenisPeriode: 'Bulanan',
    BulanPelaporan: 'Mei',
    TahunPelaporan: 2026,
    TanggalEntry: '2026-05-15',
    Catatan: 'Ibu hamil rutin kontrol ke Posyandu Melati setiap bulan ketiga.',
    NomorLaporan: 'LAP-202605-001',
    Status: 'Tervalidasi',
    CreatedAt: '2026-05-15T09:00:00Z'
  },
  {
    VerifikasiID: 'VER-ID-002',
    KPMID: 'KPM-004',
    NomorKK: '3276010000000004',
    JenisPeriode: 'Bulanan',
    BulanPelaporan: 'Mei',
    TahunPelaporan: 2026,
    TanggalEntry: '2026-05-18',
    Catatan: 'Lansia sehat, kontrol berkala posbindu.',
    NomorLaporan: 'LAP-202605-002',
    Status: 'Tersubmit',
    CreatedAt: '2026-05-18T14:30:00Z'
  },
  {
    VerifikasiID: 'VER-ID-003',
    KPMID: 'KPM-002',
    NomorKK: '3276010000000002',
    JenisPeriode: 'Triwulanan',
    BulanPelaporan: 'Januari', // Part 1 of triwulan
    TahunPelaporan: 2026,
    TanggalEntry: '2026-04-10',
    Catatan: 'Verifikasi triwulan I (Jan, Feb, Mar). Balita dan lansia aktif imunisasi/kehadiran posyandu.',
    NomorLaporan: 'LAP-202601-3276010000000002-01',
    Status: 'Tervalidasi',
    CreatedAt: '2026-04-10T10:15:00Z'
  },
  {
    VerifikasiID: 'VER-ID-004',
    KPMID: 'KPM-002',
    NomorKK: '3276010000000002',
    JenisPeriode: 'Triwulanan',
    BulanPelaporan: 'Februari', // Part 2 of triwulan
    TahunPelaporan: 2026,
    TanggalEntry: '2026-04-10',
    Catatan: 'Verifikasi triwulan I (Jan, Feb, Mar). Balita dan lansia aktif imunisasi/kehadiran posyandu.',
    NomorLaporan: 'LAP-202602-3276010000000002-02',
    Status: 'Tervalidasi',
    CreatedAt: '2026-04-10T10:15:00Z'
  },
  {
    VerifikasiID: 'VER-ID-005',
    KPMID: 'KPM-002',
    NomorKK: '3276010000000002',
    JenisPeriode: 'Triwulanan',
    BulanPelaporan: 'Maret', // Part 3 of triwulan
    TahunPelaporan: 2026,
    TanggalEntry: '2026-04-10',
    Catatan: 'Verifikasi triwulan I (Jan, Feb, Mar). Balita dan lansia aktif imunisasi/kehadiran posyandu.',
    NomorLaporan: 'LAP-202603-3276010000000002-03',
    Status: 'Tersubmit',
    CreatedAt: '2026-04-10T10:15:00Z'
  }
];

// Seed components
const INITIAL_DETAIL: DetailKomponenVerifikasi[] = [
  // Details for verification 1 (Siti Aminah, KPM-003, Ibu Hamil: 1)
  {
    DetailID: 'DET-001',
    VerifikasiID: 'VER-ID-001',
    NamaKomponenPKH: 'Ibu Hamil',
    NomorResi: 'VER-202605-3276010000000003-001',
    JenisKomponen: 'Ibu Hamil'
  },
  // Details for verification 2 (Kuswandi, KPM-004, Lansia: 1)
  {
    DetailID: 'DET-002',
    VerifikasiID: 'VER-ID-002',
    NamaKomponenPKH: 'Lansia',
    NomorResi: 'VER-202605-3276010000000004-001',
    JenisKomponen: 'Lansia'
  },
  // Details for verification 3 (Bambang, KPM-002, Balita:1, Lansia:1, Disabilitas:1)
  {
    DetailID: 'DET-003',
    VerifikasiID: 'VER-ID-003',
    NamaKomponenPKH: 'Balita (1)',
    NomorResi: 'VER-202601-3276010000000002-001',
    JenisKomponen: 'Balita'
  },
  {
    DetailID: 'DET-004',
    VerifikasiID: 'VER-ID-003',
    NamaKomponenPKH: 'Lansia (1)',
    NomorResi: 'VER-202601-3276010000000002-002',
    JenisKomponen: 'Lansia'
  },
  {
    DetailID: 'DET-005',
    VerifikasiID: 'VER-ID-003',
    NamaKomponenPKH: 'Disabilitas (1)',
    NomorResi: 'VER-202601-3276010000000002-003',
    JenisKomponen: 'Disabilitas'
  }
];

// Seed documents
const INITIAL_DOKUMEN: DokumenVerifikasi[] = [
  {
    DokumenID: 'DOK-001',
    VerifikasiID: 'VER-ID-001',
    JenisDokumen: 'Foto Kegiatan',
    NamaFile: 'kegiatan_posyandu_may.jpg',
    FileURL: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=400&q=80',
    UploadDate: '2026-05-15T09:00:00Z'
  },
  {
    DokumenID: 'DOK-002',
    VerifikasiID: 'VER-ID-001',
    JenisDokumen: 'Foto Form Verifikasi',
    NamaFile: 'form_verifikasi_kpm3.png',
    FileURL: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=400&q=80',
    UploadDate: '2026-05-15T09:01:00Z'
  },
  {
    DokumenID: 'DOK-003',
    VerifikasiID: 'VER-ID-002',
    JenisDokumen: 'Foto Kegiatan',
    NamaFile: 'kontrol_lansia.jpg',
    FileURL: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
    UploadDate: '2026-05-18T14:30:00Z'
  },
  {
    DokumenID: 'DOK-004',
    VerifikasiID: 'VER-ID-002',
    JenisDokumen: 'Foto Form Verifikasi',
    NamaFile: 'form_verif_pkh_004.png',
    FileURL: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=400&q=80',
    UploadDate: '2026-05-18T14:31:00Z'
  }
];

// Helper to initialize and retrieve database
export class MockDatabase {
  static getMasterKPM(): MasterKPM[] {
    const data = localStorage.getItem('pkh_master_kpm');
    if (!data) {
      localStorage.setItem('pkh_master_kpm', JSON.stringify(INITIAL_MASTER_KPM));
      return INITIAL_MASTER_KPM;
    }
    return JSON.parse(data);
  }

  static saveMasterKPM(list: MasterKPM[]) {
    localStorage.setItem('pkh_master_kpm', JSON.stringify(list));
  }

  static getVerifikasi(): VerifikasiPKH[] {
    const data = localStorage.getItem('pkh_verifikasi');
    if (!data) {
      localStorage.setItem('pkh_verifikasi', JSON.stringify(INITIAL_VERIFIKASI));
      return INITIAL_VERIFIKASI;
    }
    return JSON.parse(data);
  }

  static saveVerifikasi(list: VerifikasiPKH[]) {
    localStorage.setItem('pkh_verifikasi', JSON.stringify(list));
  }

  static getDetailKomponen(): DetailKomponenVerifikasi[] {
    const data = localStorage.getItem('pkh_detail_komponen');
    if (!data) {
      localStorage.setItem('pkh_detail_komponen', JSON.stringify(INITIAL_DETAIL));
      return INITIAL_DETAIL;
    }
    return JSON.parse(data);
  }

  static saveDetailKomponen(list: DetailKomponenVerifikasi[]) {
    localStorage.setItem('pkh_detail_komponen', JSON.stringify(list));
  }

  static getDokumen(): DokumenVerifikasi[] {
    const data = localStorage.getItem('pkh_dokumen');
    if (!data) {
      localStorage.setItem('pkh_dokumen', JSON.stringify(INITIAL_DOKUMEN));
      return INITIAL_DOKUMEN;
    }
    return JSON.parse(data);
  }

  static saveDokumen(list: DokumenVerifikasi[]) {
    localStorage.setItem('pkh_dokumen', JSON.stringify(list));
  }

  // Find KPM by Nomor KK
  static findKPMByKK(nomorKK: string): MasterKPM | null {
    const list = this.getMasterKPM();
    return list.find(item => item.NomorKK === nomorKK) || null;
  }

  // Submit separate verifications for each family member slot
  static submitIndividualVerifications(params: {
    kpm: MasterKPM;
    jenisPeriode: 'Bulanan' | 'Triwulanan';
    bulanPilihan: string; // "Mei" or "Triwulan I (Jan-Mar)"
    tahun: number;
    members: {
      jenisKomponen: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
      label: string;
      namaAnggota: string;
      tanggalEntry: string;
      catatan: string;
      fotoKegiatan: string;
      fotoForm: string;
      bulan?: string;
    }[];
  }): VerifikasiPKH[] {
    const verifikasiList = this.getVerifikasi();
    const detailList = this.getDetailKomponen();
    const dokumenList = this.getDokumen();

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    let monthsToGenerate: string[] = [];
    if (params.jenisPeriode === 'Bulanan') {
      monthsToGenerate = [params.bulanPilihan];
    } else {
      monthsToGenerate = getMonthsForTriwulan(params.bulanPilihan);
    }

    const createdVerifications: VerifikasiPKH[] = [];

    params.members.forEach((member, memberIdx) => {
      const currentMonths = member.bulan ? [member.bulan] : monthsToGenerate;

      currentMonths.forEach((bulan, monthIdx) => {
        const verifikasiId = `VER-ID-${Date.now()}-${memberIdx}-${monthIdx}`;
        const formatMonthNum = (months.indexOf(bulan) + 1).toString().padStart(2, '0');
        
        // LAP-{YYYYMM}-{NomorKK}-{MemberIdx}
        const nomorLaporan = `LAP-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${(memberIdx + 1).toString().padStart(2, '0')}`;

        const newVerif: VerifikasiPKH = {
          VerifikasiID: verifikasiId,
          KPMID: params.kpm.KPMID,
          NomorKK: params.kpm.NomorKK,
          JenisPeriode: params.jenisPeriode,
          BulanPelaporan: bulan,
          TahunPelaporan: params.tahun,
          TanggalEntry: member.tanggalEntry,
          Catatan: member.catatan,
          NomorLaporan: nomorLaporan,
          Status: 'Tersubmit',
          CreatedAt: new Date().toISOString()
        };

        verifikasiList.push(newVerif);
        createdVerifications.push(newVerif);

        // Resi suffix formatting
        const detailId = `DET-${Date.now()}-${memberIdx}-${monthIdx}-1`;
        const autoResi = `VER-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${(memberIdx + 1).toString().padStart(3, '0')}`;
        
        detailList.push({
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `${member.label}`,
          NomorResi: autoResi,
          JenisKomponen: member.jenisKomponen,
          NamaAnggota: member.namaAnggota
        });

        if (member.fotoKegiatan) {
          dokumenList.push({
            DokumenID: `DOK-${Date.now()}-${memberIdx}-${monthIdx}-1`,
            VerifikasiID: verifikasiId,
            JenisDokumen: 'Foto Kegiatan',
            NamaFile: `kegiatan_${member.label.toLowerCase().replace(/ /g, '_')}_${params.kpm.NomorKK}.jpg`,
            FileURL: member.fotoKegiatan,
            UploadDate: new Date().toISOString()
          });
        }

        if (member.fotoForm) {
          dokumenList.push({
            DokumenID: `DOK-${Date.now()}-${memberIdx}-${monthIdx}-2`,
            VerifikasiID: verifikasiId,
            JenisDokumen: 'Foto Form Verifikasi',
            NamaFile: `form_verif_${member.label.toLowerCase().replace(/ /g, '_')}_${params.kpm.NomorKK}.jpg`,
            FileURL: member.fotoForm,
            UploadDate: new Date().toISOString()
          });
        }
      });
    });

    this.saveVerifikasi(verifikasiList);
    this.saveDetailKomponen(detailList);
    this.saveDokumen(dokumenList);

    return createdVerifications;
  }

  // Insert a new verification submission (supports bulanan and triwulanan bulk logic)
  static submitVerification(params: {
    kpm: MasterKPM;
    jenisPeriode: 'Bulanan' | 'Triwulanan';
    bulanPilihan: string; // "Mei" or "Triwulan I (Jan-Mar)" etc.
    tahun: number;
    tanggalEntry: string;
    catatan: string;
    fotoKegiatanBase64: string;
    fotoFormBase64: string;
    namaAnggotaList: string[]; // List of names entered by KPM for each component slot
  }): VerifikasiPKH[] {
    const verifikasiList = this.getVerifikasi();
    const detailList = this.getDetailKomponen();
    const dokumenList = this.getDokumen();

    // Months translation map for indexing or sequential submissions
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Determine which months get generated
    let monthsToGenerate: string[] = [];
    if (params.jenisPeriode === 'Bulanan') {
      monthsToGenerate = [params.bulanPilihan];
    } else {
      monthsToGenerate = getMonthsForTriwulan(params.bulanPilihan);
    }

    const createdVerifications: VerifikasiPKH[] = [];

    monthsToGenerate.forEach((bulan, index) => {
      const verifikasiId = `VER-ID-${Date.now()}-${index}`;
      const formatMonthNum = (months.indexOf(bulan) + 1).toString().padStart(2, '0');
      
      // Auto-generated Report Number: VER-{YYYYMM}-{NomorKK}-{Urutan} per component
      // Let's create an overall report code: LAP-{YYYYMM}-{NomorKK}
      const nomorLaporan = `LAP-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}`;

      const newVerif: VerifikasiPKH = {
        VerifikasiID: verifikasiId,
        KPMID: params.kpm.KPMID,
        NomorKK: params.kpm.NomorKK,
        JenisPeriode: params.jenisPeriode,
        BulanPelaporan: bulan,
        TahunPelaporan: params.tahun,
        TanggalEntry: params.tanggalEntry,
        Catatan: params.catatan,
        NomorLaporan: nomorLaporan,
        Status: 'Tersubmit',
        CreatedAt: new Date().toISOString()
      };

      verifikasiList.push(newVerif);
      createdVerifications.push(newVerif);

      // Create detailing components automatically based on MasterKPM health stats
      let itemIndex = 1;

      // Add Ibu Hamil
      for (let i = 0; i < params.kpm.JumlahIbuHamil; i++) {
        const detailId = `DET-${Date.now()}-${itemIndex}`;
        const autoResi = `VER-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${itemIndex.toString().padStart(3, '0')}`;
        detailList.push({
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `Ibu Hamil (${i + 1})`,
          NomorResi: autoResi,
          JenisKomponen: 'Ibu Hamil',
          NamaAnggota: params.namaAnggotaList[itemIndex - 1] || 'Anggota Ibu Hamil'
        });
        itemIndex++;
      }

      // Add Balita
      for (let i = 0; i < params.kpm.JumlahBalita; i++) {
        const detailId = `DET-${Date.now()}-${itemIndex}`;
        const autoResi = `VER-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${itemIndex.toString().padStart(3, '0')}`;
        detailList.push({
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `Balita (${i + 1})`,
          NomorResi: autoResi,
          JenisKomponen: 'Balita',
          NamaAnggota: params.namaAnggotaList[itemIndex - 1] || 'Anggota Balita'
        });
        itemIndex++;
      }

      // Add Lansia
      for (let i = 0; i < params.kpm.JumlahLansia; i++) {
        const detailId = `DET-${Date.now()}-${itemIndex}`;
        const autoResi = `VER-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${itemIndex.toString().padStart(3, '0')}`;
        detailList.push({
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `Lansia (${i + 1})`,
          NomorResi: autoResi,
          JenisKomponen: 'Lansia',
          NamaAnggota: params.namaAnggotaList[itemIndex - 1] || 'Anggota Lansia'
        });
        itemIndex++;
      }

      // Add Disabilitas
      for (let i = 0; i < params.kpm.JumlahDisabilitas; i++) {
        const detailId = `DET-${Date.now()}-${itemIndex}`;
        const autoResi = `VER-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${itemIndex.toString().padStart(3, '0')}`;
        detailList.push({
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `Disabilitas (${i + 1})`,
          NomorResi: autoResi,
          JenisKomponen: 'Disabilitas',
          NamaAnggota: params.namaAnggotaList[itemIndex - 1] || 'Anggota Disabilitas'
        });
        itemIndex++;
      }

      // Upload Documents
      if (params.fotoKegiatanBase64) {
        dokumenList.push({
          DokumenID: `DOK-${Date.now()}-1`,
          VerifikasiID: verifikasiId,
          JenisDokumen: 'Foto Kegiatan',
          NamaFile: `kegiatan_${bulan.toLowerCase()}_${params.kpm.NomorKK}.jpg`,
          FileURL: params.fotoKegiatanBase64,
          UploadDate: new Date().toISOString()
        });
      }

      if (params.fotoFormBase64) {
        dokumenList.push({
          DokumenID: `DOK-${Date.now()}-2`,
          VerifikasiID: verifikasiId,
          JenisDokumen: 'Foto Form Verifikasi',
          NamaFile: `form_verif_${bulan.toLowerCase()}_${params.kpm.NomorKK}.jpg`,
          FileURL: params.fotoFormBase64,
          UploadDate: new Date().toISOString()
        });
      }
    });

    // Save changes to localStorage
    this.saveVerifikasi(verifikasiList);
    this.saveDetailKomponen(detailList);
    this.saveDokumen(dokumenList);

    return createdVerifications;
  }

  // Update validation status of a report as Admin (Tersubmit -> Tervalidasi | Ditolak)
  static updateStatus(verifikasiID: string, newStatus: 'Tersubmit' | 'Tervalidasi' | 'Ditolak'): boolean {
    const list = this.getVerifikasi();
    const index = list.findIndex(v => v.VerifikasiID === verifikasiID);
    if (index !== -1) {
      list[index].Status = newStatus;
      this.saveVerifikasi(list);
      return true;
    }
    return false;
  }

  // Create a new Master KPM as Admin
  static addMasterKPM(kpm: Omit<MasterKPM, 'KPMID' | 'TotalAgregatKomponen'> & { KPMID?: string }): MasterKPM {
    const list = this.getMasterKPM();
    const total = Number(kpm.JumlahIbuHamil) + Number(kpm.JumlahBalita) + Number(kpm.JumlahLansia) + Number(kpm.JumlahDisabilitas);
    const newKPM: MasterKPM = {
      ...kpm,
      KPMID: kpm.KPMID || `KPM-${(list.length + 1).toString().padStart(3, '0')}`,
      TotalAgregatKomponen: total,
      JumlahIbuHamil: Number(kpm.JumlahIbuHamil),
      JumlahBalita: Number(kpm.JumlahBalita),
      JumlahLansia: Number(kpm.JumlahLansia),
      JumlahDisabilitas: Number(kpm.JumlahDisabilitas),
    };
    list.push(newKPM);
    this.saveMasterKPM(list);
    return newKPM;
  }

  // Edit KPM Master
  static updateMasterKPM(updated: MasterKPM) {
    const list = this.getMasterKPM();
    const idx = list.findIndex(item => item.KPMID === updated.KPMID);
    if (idx !== -1) {
      const total = Number(updated.JumlahIbuHamil) + Number(updated.JumlahBalita) + Number(updated.JumlahLansia) + Number(updated.JumlahDisabilitas);
      list[idx] = {
        ...updated,
        JumlahIbuHamil: Number(updated.JumlahIbuHamil),
        JumlahBalita: Number(updated.JumlahBalita),
        JumlahLansia: Number(updated.JumlahLansia),
        JumlahDisabilitas: Number(updated.JumlahDisabilitas),
        TotalAgregatKomponen: total,
      };
      this.saveMasterKPM(list);
    }
  }

  // Delete KPM
  static deleteKPM(kpmId: string) {
    const list = this.getMasterKPM();
    const filtered = list.filter(item => item.KPMID !== kpmId);
    this.saveMasterKPM(filtered);
  }

  // Reset local database data to default seed
  static submitVerifikasiDirectly(
    report: VerifikasiPKH,
    subResources: {
      detail: DetailKomponenVerifikasi;
      dokumen: DokumenVerifikasi[];
    }
  ) {
    const list = this.getVerifikasi();
    list.push(report);
    this.saveVerifikasi(list);

    const details = this.getDetailKomponen();
    details.push(subResources.detail);
    this.saveDetailKomponen(details);

    const docs = this.getDokumen();
    docs.push(...subResources.dokumen);
    this.saveDokumen(docs);
  }

  static resetDB() {
    localStorage.removeItem('pkh_master_kpm');
    localStorage.removeItem('pkh_verifikasi');
    localStorage.removeItem('pkh_detail_komponen');
    localStorage.removeItem('pkh_dokumen');
    this.getMasterKPM();
    this.getVerifikasi();
    this.getDetailKomponen();
    this.getDokumen();
  }
}
