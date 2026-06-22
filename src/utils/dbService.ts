import { db, getOrCreateDriveFolder, uploadImageToDrive, getAccessToken, auth, isFirebaseConfigured } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { supabase, isSupabaseConfigured } from './supabase';
import { MasterKPM, VerifikasiPKH, DetailKomponenVerifikasi, DokumenVerifikasi } from '../types';
import { MockDatabase } from '../data/mockDb';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  if (
    errMessage.includes('permission-denied') || 
    errMessage.toLowerCase().includes('permission') || 
    errMessage.toLowerCase().includes('insufficient')
  ) {
    const errInfo: FirestoreErrorInfo = {
      error: errMessage,
      authInfo: {
        userId: auth?.currentUser?.uid,
        email: auth?.currentUser?.email,
        emailVerified: auth?.currentUser?.emailVerified,
        isAnonymous: auth?.currentUser?.isAnonymous,
        tenantId: auth?.currentUser?.tenantId,
        providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
  throw error;
}

const isProductionMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!isFirebaseConfigured() && !isSupabaseConfigured()) return false;
  return localStorage.getItem('pkh_production_mode') !== 'false';
};

// Map collection/table names cleanly
const getKpmColName = (): string => isProductionMode() ? 'pkh_master_kpm_live' : 'pkh_master_kpm_demo';
const getVerifikasiColName = (): string => isProductionMode() ? 'pkh_verifikasi_live' : 'pkh_verifikasi_demo';
const getDetailsColName = (): string => isProductionMode() ? 'pkh_details_live' : 'pkh_details_demo';
const getDokumenColName = (): string => isProductionMode() ? 'pkh_dokumen_live' : 'pkh_dokumen_demo';

export const DBService = {
  /**
   * Fetches the complete master KPM records list.
   * If Supabase is configured, it loads from Supabase.
   * Otherwise, it tries Firebase Firestore, with local seed database fallback.
   */
  async getKPMList(): Promise<MasterKPM[]> {
    if (!isProductionMode()) {
      return MockDatabase.getMasterKPM();
    }

    if (isSupabaseConfigured()) {
      try {
        console.log(`fetching master KPM dari Supabase table: ${getKpmColName()}`);
        const { data, error } = await supabase!
          .from(getKpmColName())
          .select('*');
        if (error) {
          throw error;
        }
        return (data || []) as MasterKPM[];
      } catch (err) {
        console.warn("Gagal mengambil daftar KPM dari Supabase:", err);
        return [];
      }
    }

    try {
      // Direct Firestore fetch
      const kpmColRef = collection(db, getKpmColName());
      const snapshot = await getDocs(kpmColRef);
      
      const kpms: MasterKPM[] = [];
      snapshot.forEach((doc) => {
        kpms.push(doc.data() as MasterKPM);
      });
      return kpms;
    } catch (err) {
      console.warn("Gagal mengambil daftar KPM dari Firestore:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      return [];
    }
  },

  /**
   * Submits reports containing multiple individual members checkups.
   * Saves to Supabase tables or Firestore subcollections, and uploads photos to Google Drive.
   */
  async submitVerificationReport(params: {
    kpm: MasterKPM;
    jenisPeriode: 'Bulanan' | 'Triwulanan';
    bulanPilihan: string;
    tahun: number;
    members: any[];
  }): Promise<VerifikasiPKH[]> {
    const accessToken = await getAccessToken();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    console.log("Membuka sesi pendaftaran laporan ke DB...");

    try {
      // Identify or Create 'Verifikasi-PKH' folder in Google Drive only if accessToken is present
      let driveFolderId = '';
      if (accessToken) {
        try {
          driveFolderId = await getOrCreateDriveFolder(accessToken);
          console.log(`Folder Google Drive siap: ID=${driveFolderId}`);
        } catch (err) {
          console.error("Gagal mendapatkan folder Google Drive:", err);
        }
      }

      const createdReports: VerifikasiPKH[] = [];

      // Process each member form
      for (let memberIdx = 0; memberIdx < params.members.length; memberIdx++) {
        const member = params.members[memberIdx];

        // Upload to Google Drive if authorized, otherwise store base64 data URL directly
        let driveFotoKegiatanUrl = member.fotoKegiatan || '';
        let driveFotoFormUrl = member.fotoForm || '';

        if (accessToken && driveFolderId) {
          if (member.fotoKegiatan && member.fotoKegiatan.startsWith('data:')) {
            const fileName = `FOTO_KEGIATAN_${member.jenisKomponen.replace(/\s+/g, '_')}_${member.bulan}_${params.tahun}_${params.kpm.NomorKK}.jpg`;
            console.log(`Mengunggah ${fileName} ke Google Drive...`);
            try {
              const uploadResult = await uploadImageToDrive(accessToken, fileName, member.fotoKegiatan, driveFolderId);
              driveFotoKegiatanUrl = uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.id}`;
            } catch (uploadError) {
              console.error("Gagal upload foto kegiatan ke Drive, fallback ke penyimpanan lokal base64:", uploadError);
            }
          }

          if (member.fotoForm && member.fotoForm.startsWith('data:')) {
            const fileName = `FOTO_RES_PAS_${member.jenisKomponen.replace(/\s+/g, '_')}_${member.bulan}_${params.tahun}_${params.kpm.NomorKK}.jpg`;
            console.log(`Mengunggah ${fileName} ke Google Drive...`);
            try {
              const uploadResult = await uploadImageToDrive(accessToken, fileName, member.fotoForm, driveFolderId);
              driveFotoFormUrl = uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.id}`;
            } catch (uploadError) {
              console.error("Gagal upload foto bukti pemeriksaan ke Drive, fallback ke penyimpanan lokal base64:", uploadError);
            }
          }
        }

        const formatMonthNum = (months.indexOf(member.bulan) + 1).toString().padStart(2, '0');
        const verifikasiId = `VER-F-${Date.now()}-${memberIdx}`;

        // Create Report Entity
        const report: VerifikasiPKH = {
          VerifikasiID: verifikasiId,
          KPMID: params.kpm.KPMID,
          NomorKK: params.kpm.NomorKK,
          JenisPeriode: params.jenisPeriode,
          BulanPelaporan: member.bulan,
          TahunPelaporan: params.tahun,
          TanggalEntry: member.tanggalEntry,
          Catatan: member.catatan || 'Verifikasi divalidasi oleh Keluarga Penerima Manfaat (KPM) secara mandiri.',
          NomorLaporan: `LAP-${params.tahun}${formatMonthNum}-${params.kpm.NomorKK}-${(memberIdx + 1).toString().padStart(2, '0')}`,
          Status: 'Tersubmit',
          CreatedAt: new Date().toISOString()
        };

        const detailId = `DTL-${verifikasiId}`;
        const detailData = {
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `${member.jenisKomponen} ke-${member.memberIndex + 1} (${member.bulan})`,
          NomorResi: `RESI-${Date.now()}-${memberIdx}`,
          JenisKomponen: member.jenisKomponen,
          NamaAnggota: member.namaAnggota
        };

        const docId1 = `DOC-KEG-${verifikasiId}`;
        const docId2 = `DOC-FORM-${verifikasiId}`;

        if (isProductionMode()) {
          if (isSupabaseConfigured()) {
            // Write to Supabase relational tables
            const { error: repErr } = await supabase!
              .from(getVerifikasiColName())
              .insert([report]);
            if (repErr) throw repErr;

            const { error: detErr } = await supabase!
              .from(getDetailsColName())
              .insert([detailData]);
            if (detErr) throw detErr;

            if (driveFotoKegiatanUrl) {
              const { error: doc1Err } = await supabase!
                .from(getDokumenColName())
                .insert([{
                  DokumenID: docId1,
                  VerifikasiID: verifikasiId,
                  JenisDokumen: 'Foto Kegiatan',
                  NamaFile: member.fotoKegiatanName || 'foto_kegiatan.jpg',
                  FileURL: driveFotoKegiatanUrl,
                  UploadDate: new Date().toISOString()
                }]);
              if (doc1Err) throw doc1Err;
            }

            if (driveFotoFormUrl) {
              const { error: doc2Err } = await supabase!
                .from(getDokumenColName())
                .insert([{
                  DokumenID: docId2,
                  VerifikasiID: verifikasiId,
                  JenisDokumen: 'Foto Form Verifikasi',
                  NamaFile: member.fotoFormName || 'foto_res_pemeriksaan.jpg',
                  FileURL: driveFotoFormUrl,
                  UploadDate: new Date().toISOString()
                }]);
              if (doc2Err) throw doc2Err;
            }
          } else {
            // Firestore Legacy Write
            try {
              await setDoc(doc(db, getVerifikasiColName(), verifikasiId), report);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `${getVerifikasiColName()}/${verifikasiId}`);
              throw e;
            }

            try {
              await setDoc(doc(db, getVerifikasiColName(), verifikasiId, 'details', detailId), detailData);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `${getVerifikasiColName()}/${verifikasiId}/details/${detailId}`);
              throw e;
            }

            if (driveFotoKegiatanUrl) {
              try {
                await setDoc(doc(db, getVerifikasiColName(), verifikasiId, 'dokumen', docId1), {
                  DokumenID: docId1,
                  VerifikasiID: verifikasiId,
                  JenisDokumen: 'Foto Kegiatan',
                  NamaFile: member.fotoKegiatanName || 'foto_kegiatan.jpg',
                  FileURL: driveFotoKegiatanUrl,
                  UploadDate: new Date().toISOString()
                });
              } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `${getVerifikasiColName()}/${verifikasiId}/dokumen/${docId1}`);
                throw e;
              }
            }

            if (driveFotoFormUrl) {
              try {
                await setDoc(doc(db, getVerifikasiColName(), verifikasiId, 'dokumen', docId2), {
                  DokumenID: docId2,
                  VerifikasiID: verifikasiId,
                  JenisDokumen: 'Foto Form Verifikasi',
                  NamaFile: member.fotoFormName || 'foto_res_pemeriksaan.jpg',
                  FileURL: driveFotoFormUrl,
                  UploadDate: new Date().toISOString()
                });
              } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `verifikasi/${verifikasiId}/dokumen/${docId2}`);
                throw e;
              }
            }
          }
        }

        createdReports.push(report);

        // Mirror entry back into Mock Database for instant local sync UI fallback
        MockDatabase.submitVerifikasiDirectly(report, {
          detail: {
            DetailID: detailId,
            VerifikasiID: verifikasiId,
            NamaKomponenPKH: detailData.NamaKomponenPKH,
            NomorResi: detailData.NomorResi,
            JenisKomponen: detailData.JenisKomponen,
            NamaAnggota: detailData.NamaAnggota
          },
          dokumen: [
            ...(driveFotoKegiatanUrl ? [{
              DokumenID: docId1,
              VerifikasiID: verifikasiId,
              JenisDokumen: 'Foto Kegiatan' as const,
              NamaFile: member.fotoKegiatanName || 'foto_kegiatan.jpg',
              FileURL: driveFotoKegiatanUrl,
              UploadDate: new Date().toISOString()
            }] : []),
            ...(driveFotoFormUrl ? [{
              DokumenID: docId2,
              VerifikasiID: verifikasiId,
              JenisDokumen: 'Foto Form Verifikasi' as const,
              NamaFile: member.fotoFormName || 'foto_res_pemeriksaan.jpg',
              FileURL: driveFotoFormUrl,
              UploadDate: new Date().toISOString()
            }] : [])
          ]
        });
      }

      return createdReports;
    } catch (err) {
      console.error("Gagal menyimpan ke database cloud:", err);
      console.log("Menggunakan fallback penyimpanan lokal...");
      return MockDatabase.submitIndividualVerifications(params);
    }
  },

  /**
   * Fetches all verification submissions
   */
  async getAllReports(): Promise<VerifikasiPKH[]> {
    if (!isProductionMode()) {
      return MockDatabase.getVerifikasi().sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase!
          .from(getVerifikasiColName())
          .select('*');
        if (error) throw error;
        return (data as VerifikasiPKH[] || []).sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
      } catch (err) {
        console.warn("Supabase verifikasi fetch failed:", err);
        return [];
      }
    }

    try {
      const verifikasiColRef = collection(db, getVerifikasiColName());
      const snapshot = await getDocs(verifikasiColRef);
      
      const reports: VerifikasiPKH[] = [];
      snapshot.forEach((doc) => {
        reports.push(doc.data() as VerifikasiPKH);
      });
      
      return reports.sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
    } catch (err) {
      console.warn("Firestore 'verifikasi' query failed:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      return [];
    }
  },

  /**
   * Fetches all details for a list of verification reports.
   */
  async getAllDetails(reports: VerifikasiPKH[]): Promise<DetailKomponenVerifikasi[]> {
    if (!isProductionMode()) {
      return MockDatabase.getDetailKomponen();
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase!
          .from(getDetailsColName())
          .select('*');
        if (error) throw error;
        return (data || []) as DetailKomponenVerifikasi[];
      } catch (err) {
        console.warn("Supabase details query failed:", err);
        return [];
      }
    }

    try {
      const details: DetailKomponenVerifikasi[] = [];
      const promises = reports.map(async (r) => {
        const detailsColRef = collection(db, getVerifikasiColName(), r.VerifikasiID, 'details');
        const snap = await getDocs(detailsColRef);
        snap.forEach((doc) => {
          details.push(doc.data() as DetailKomponenVerifikasi);
        });
      });
      await Promise.all(promises);
      return details;
    } catch (err) {
      console.warn("Gagal mengambil subcollection 'details' dari Firestore:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      return [];
    }
  },

  /**
   * Fetches all documents for a list of verification reports.
   */
  async getAllDokumen(reports: VerifikasiPKH[]): Promise<DokumenVerifikasi[]> {
    if (!isProductionMode()) {
      return MockDatabase.getDokumen();
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase!
          .from(getDokumenColName())
          .select('*');
        if (error) throw error;
        return (data || []) as DokumenVerifikasi[];
      } catch (err) {
        console.warn("Supabase dokumen query failed:", err);
        return [];
      }
    }

    try {
      const docs: DokumenVerifikasi[] = [];
      const promises = reports.map(async (r) => {
        const docColRef = collection(db, getVerifikasiColName(), r.VerifikasiID, 'dokumen');
        const snap = await getDocs(docColRef);
        snap.forEach((doc) => {
          docs.push(doc.data() as DokumenVerifikasi);
        });
      });
      await Promise.all(promises);
      return docs;
    } catch (err) {
      console.warn("Gagal mengambil subcollection 'dokumen' dari Firestore:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      return [];
    }
  },

  /**
   * Adds a new MasterKPM record
   */
  async addMasterKPM(kpm: MasterKPM): Promise<void> {
    if (isProductionMode()) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from(getKpmColName())
          .upsert([kpm]);
        if (error) throw error;
      } else {
        try {
          await setDoc(doc(db, getKpmColName(), kpm.KPMID), kpm);
        } catch (err) {
          console.error("Gagal menambahkan KPM ke Firestore:", err);
          handleFirestoreError(err, OperationType.CREATE, `${getKpmColName()}/${kpm.KPMID}`);
          throw err;
        }
      }
    }
    MockDatabase.addMasterKPM(kpm);
  },

  /**
   * Adds multiple MasterKPM records using fast bulk upserts
   */
  async batchAddMasterKPM(kpms: MasterKPM[], onProgress?: (current: number, total: number) => void): Promise<number> {
    try {
      let processedCount = 0;
      const CHUNK_SIZE = 100;
      
      // Save locally first to guarantee local data integrity
      const localList = MockDatabase.getMasterKPM();
      const updatedLocalList = [...localList];
      kpms.forEach(newKpm => {
        const idx = updatedLocalList.findIndex(x => x.KPMID === newKpm.KPMID);
        if (idx !== -1) {
          updatedLocalList[idx] = newKpm;
        } else {
          updatedLocalList.push(newKpm);
        }
      });
      MockDatabase.saveMasterKPM(updatedLocalList);

      if (isProductionMode()) {
        if (isSupabaseConfigured()) {
          // Fast Supabase Batch Upload
          for (let i = 0; i < kpms.length; i += CHUNK_SIZE) {
            const chunk = kpms.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase!
              .from(getKpmColName())
              .upsert(chunk);
            if (error) {
              throw new Error(`Supabase upload failed: ${error.message}`);
            }
            processedCount += chunk.length;
            if (onProgress) {
              onProgress(processedCount, kpms.length);
            }
          }
        } else {
          // Firestore Bulk Upload
          const { writeBatch } = await import('firebase/firestore');
          for (let i = 0; i < kpms.length; i += CHUNK_SIZE) {
            const chunk = kpms.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            
            chunk.forEach((kpm) => {
              const docRef = doc(db, getKpmColName(), kpm.KPMID);
              batch.set(docRef, kpm);
            });

            await batch.commit();
            processedCount += chunk.length;
            if (onProgress) {
              onProgress(processedCount, kpms.length);
            }
          }
        }
      } else {
        if (onProgress) {
          onProgress(kpms.length, kpms.length);
        }
      }

      return kpms.length;
    } catch (err) {
      console.error("Gagal melakukan batch import KPM:", err);
      throw err;
    }
  },

  /**
   * Updates an existing MasterKPM record
   */
  async updateMasterKPM(kpm: MasterKPM): Promise<void> {
    if (isProductionMode()) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from(getKpmColName())
          .upsert([kpm]);
        if (error) throw error;
      } else {
        try {
          await setDoc(doc(db, getKpmColName(), kpm.KPMID), kpm);
        } catch (err) {
          console.error("Gagal memperbarui KPM di Firestore:", err);
          handleFirestoreError(err, OperationType.UPDATE, `${getKpmColName()}/${kpm.KPMID}`);
          throw err;
        }
      }
    }
    MockDatabase.updateMasterKPM(kpm);
  },

  /**
   * Deletes a MasterKPM record
   */
  async deleteKPM(kpmId: string): Promise<void> {
    if (isProductionMode()) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from(getKpmColName())
          .delete()
          .eq('KPMID', kpmId);
        if (error) throw error;
      } else {
        try {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, getKpmColName(), kpmId));
        } catch (err) {
          console.error("Gagal menghapus KPM dari Firestore:", err);
          handleFirestoreError(err, OperationType.DELETE, `${getKpmColName()}/${kpmId}`);
          throw err;
        }
      }
    }
    MockDatabase.deleteKPM(kpmId);
  },

  /**
   * Updates verification approval/rejection status
   */
  async updateVerificationStatus(verifikasiId: string, status: 'Tersubmit' | 'Tervalidasi' | 'Ditolak'): Promise<void> {
    if (isProductionMode()) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from(getVerifikasiColName())
          .update({ Status: status })
          .eq('VerifikasiID', verifikasiId);
        if (error) throw error;
      } else {
        try {
          const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
          await updateDoc(firestoreDoc(db, getVerifikasiColName(), verifikasiId), { Status: status });
        } catch (err) {
          console.error("Gagal memperbarui status laporan di Firestore:", err);
          handleFirestoreError(err, OperationType.UPDATE, `${getVerifikasiColName()}/${verifikasiId}`);
          throw err;
        }
      }
    }
    MockDatabase.updateStatus(verifikasiId, status);
  },

  /**
   * Clears all KPM records
   */
  async clearAllKPM(): Promise<void> {
    if (isProductionMode()) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from(getKpmColName())
          .delete()
          .neq('KPMID', '');
        if (error) throw error;
      } else {
        try {
          const kpmColRef = collection(db, getKpmColName());
          const snapshot = await getDocs(kpmColRef);
          const { writeBatch } = await import('firebase/firestore');
          const batch = writeBatch(db);
          snapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          const seedingDocRef = doc(db, 'metadata', 'seeding_status_' + getKpmColName());
          batch.set(seedingDocRef, { seeded: true, clearedAt: new Date().toISOString() });
          
          await batch.commit();
          localStorage.setItem('pkh_seeded_' + getKpmColName(), 'true');
        } catch (err) {
          console.error("Gagal membersihkan Firestore KPM:", err);
          handleFirestoreError(err, OperationType.DELETE, getKpmColName());
          throw err;
        }
      }
    } else {
      localStorage.setItem('pkh_seeded_' + getKpmColName(), 'true');
    }
  }
};
