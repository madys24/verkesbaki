/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MasterKPM {
  KPMID: string;
  NomorKK: string;
  NamaKepalaKeluarga: string;
  Alamat: string;
  Desa: string;
  Kecamatan: string;
  Kabupaten: string;
  RT?: string; // Rukun Tetangga
  RW?: string; // Rukun Warga
  JumlahIbuHamil: number;
  JumlahBalita: number;
  JumlahLansia: number;
  JumlahDisabilitas: number;
  TotalAgregatKomponen: number;
  StatusKPM: 'Aktif' | 'Tidak Aktif';
  NamaPendamping?: string; // Companion name for this family
}

export interface VerifikasiPKH {
  VerifikasiID: string;
  KPMID: string;
  NomorKK: string;
  JenisPeriode: 'Bulanan' | 'Triwulanan';
  BulanPelaporan: string; // e.g., "Januari", "Februari", etc. Or a list of months for triwulanan
  TahunPelaporan: number;
  TanggalEntry: string;
  Catatan: string;
  NomorLaporan: string;
  Status: 'Tersubmit' | 'Tervalidasi' | 'Ditolak';
  CreatedAt: string;
}

export interface DetailKomponenVerifikasi {
  DetailID: string;
  VerifikasiID: string;
  NamaKomponenPKH: string; // e.g., "Balita Ke-1", "Ibu Hamil", etc.
  NomorResi: string;
  JenisKomponen: 'Ibu Hamil' | 'Balita' | 'Lansia' | 'Disabilitas';
  NamaAnggota?: string; // Filled dynamically during verification submission
}

export interface DokumenVerifikasi {
  DokumenID: string;
  VerifikasiID: string;
  JenisDokumen: 'Foto Kegiatan' | 'Foto Form Verifikasi';
  NamaFile: string;
  FileURL: string; // Base64 or placeholder URLs
  UploadDate: string;
}

// Global filter state
export interface FilterState {
  bulan: string;
  tahun: string;
  nomorKK: string;
}
