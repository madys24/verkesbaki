import { db, getOrCreateDriveFolder, uploadImageToDrive, getAccessToken, auth } from './firebase';
import { collection, getDocs, doc, setDoc, query, orderBy, limit, writeBatch, getDoc } from 'firebase/firestore';
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
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
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
  return localStorage.getItem('pkh_production_mode') !== 'false';
};

const getKpmColName = (): string => isProductionMode() ? 'kpm' : 'demo_kpm';
const getVerifikasiColName = (): string => isProductionMode() ? 'verifikasi' : 'demo_verifikasi';

// Cache to avoid multi-seeding triggers in the same workspace session
let masterKpmSeeded = false;

export const DBService = {
  /**
   * Fetches the complete master KPM records list.
   * If authenticated, it attempts Firestore (and seeds if empty).
   * Otherwise, it loads from local seed database.
   */
  async getKPMList(): Promise<MasterKPM[]> {
    try {
      // Direct Firestore fetch - always use Firestore where possible (Solusi B)
      const kpmColRef = collection(db, getKpmColName());
      let snapshot;
      try {
        snapshot = await getDocs(kpmColRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, getKpmColName());
        throw e;
      }
      
      // Determine if database was previously seeded/initialized, avoiding force seed of empty master databases.
      const seedingDocRef = doc(db, 'metadata', 'seeding_status_' + getKpmColName());
      let seededStatus = false;
      try {
        const seedingDoc = await getDoc(seedingDocRef);
        if (seedingDoc.exists()) {
          const data = seedingDoc.data();
          seededStatus = data && data.seeded === true;
        }
      } catch (e) {
        console.warn("Could not check Firestore seeding status, fallback to localStorage:", e);
      }

      const localSeeded = localStorage.getItem('pkh_seeded_' + getKpmColName()) === 'true';
      if (localSeeded) {
        seededStatus = true;
      }

      if (snapshot.empty && !masterKpmSeeded && !seededStatus) {
        console.log("Firestore 'kpm' collection is empty. Seeding INITIAL_MASTER_KPM data...");
        const localKpms = MockDatabase.getMasterKPM();
        
        // Seed Firestore using a batch
        const batch = writeBatch(db);
        localKpms.forEach((kpm) => {
          const docRef = doc(db, getKpmColName(), kpm.KPMID);
          batch.set(docRef, kpm);
        });
        
        // Set metadata seeding status in Firestore
        batch.set(seedingDocRef, { seeded: true, seededAt: new Date().toISOString() });

        try {
          await batch.commit();
          localStorage.setItem('pkh_seeded_' + getKpmColName(), 'true');
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, getKpmColName());
          throw e;
        }
        masterKpmSeeded = true;
        return localKpms;
      }

      if (snapshot.empty && seededStatus) {
        // Explicitly cleared by user, return empty array instead of seeding demo data
        return [];
      }

      const kpms: MasterKPM[] = [];
      snapshot.forEach((doc) => {
        kpms.push(doc.data() as MasterKPM);
      });
      return kpms;
    } catch (err) {
      console.warn("Firestore 'kpm' fetch failed. Falling back to Mock DB:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        // Only propagate strict security or validation schema errors
        throw err;
      }
    }
    
    // Default offline fallback
    return MockDatabase.getMasterKPM();
  },

  /**
   * Submits reports containing multiple individual members checkups.
   * Saves to Firestore subcollections if logged in, and uploads photos to Google Drive.
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

    // 1. Generate months to submit
    const { getMonthsForTriwulan } = await import('./triwulan');
    const monthsToGenerate = params.jenisPeriode === 'Bulanan' 
      ? [params.bulanPilihan] 
      : getMonthsForTriwulan(params.bulanPilihan);

    console.log("Membuka sesi pendaftaran laporan ke Firestore...");

    try {
      // 2. Identify or Create 'Verifikasi-PKH' folder in Google Drive only if accessToken is present
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

        // 3. Upload to Google Drive if authorized, otherwise store base64 data URL directly (Solusi B)
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

        // Create Report Entity (PKH Verifikasi Report)
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

        // Write to Firestore /verifikasi/{verifikasiId}
        try {
          await setDoc(doc(db, getVerifikasiColName(), verifikasiId), report);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${getVerifikasiColName()}/${verifikasiId}`);
          throw e;
        }

        // Write Details to Firestore /verifikasi/{verifikasiId}/details/{detailId}
        const detailId = `DTL-${verifikasiId}`;
        const detailData = {
          DetailID: detailId,
          VerifikasiID: verifikasiId,
          NamaKomponenPKH: `${member.jenisKomponen} ke-${member.memberIndex + 1} (${member.bulan})`,
          NomorResi: `RESI-${Date.now()}-${memberIdx}`,
          JenisKomponen: member.jenisKomponen,
          NamaAnggota: member.namaAnggota
        };
        try {
          await setDoc(doc(db, getVerifikasiColName(), verifikasiId, 'details', detailId), detailData);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${getVerifikasiColName()}/${verifikasiId}/details/${detailId}`);
          throw e;
        }

        // Write Photos/Docs to Firestore /verifikasi/{verifikasiId}/dokumen/{dokumenId}
        if (driveFotoKegiatanUrl) {
          const docId1 = `DOC-KEG-${verifikasiId}`;
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
          const docId2 = `DOC-FORM-${verifikasiId}`;
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
              DokumenID: `DOC-KEG-${verifikasiId}`,
              VerifikasiID: verifikasiId,
              JenisDokumen: 'Foto Kegiatan' as const,
              NamaFile: member.fotoKegiatanName || 'foto_kegiatan.jpg',
              FileURL: driveFotoKegiatanUrl,
              UploadDate: new Date().toISOString()
            }] : []),
            ...(driveFotoFormUrl ? [{
              DokumenID: `DOC-FORM-${verifikasiId}`,
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
      console.error("Gagal menyimpan ke Firestore:", err);
      // Fallback
      console.log("Menggunakan fallback penyimpanan lokal...");
      return MockDatabase.submitIndividualVerifications(params);
    }
  },

  /**
   * Fetches all verification submissions (and their details)
   * Merges mock submissions with Firestore verification collection
   */
  async getAllReports(): Promise<VerifikasiPKH[]> {
    try {
      const verifikasiColRef = collection(db, getVerifikasiColName());
      let snapshot;
      try {
        snapshot = await getDocs(verifikasiColRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, getVerifikasiColName());
        throw e;
      }
      
      const reports: VerifikasiPKH[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          reports.push(doc.data() as VerifikasiPKH);
        });
      }
      
      // Merge with any offline mock data that has not been synced to keep consistency
      const mockReports = MockDatabase.getVerifikasi();
      const mergedSet = new Map<string, VerifikasiPKH>();
      
      // Add all mock records 
      mockReports.forEach(r => mergedSet.set(r.VerifikasiID, r));
      // Overwrite/add real cloud records
      reports.forEach(r => mergedSet.set(r.VerifikasiID, r));
      
      return Array.from(mergedSet.values()).sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
    } catch (err) {
      console.warn("Firestore 'verifikasi' query failed, returning Mock reports:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
    }

    return MockDatabase.getVerifikasi().sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
  },

  /**
   * Fetches all subcollection details for a list of verification reports.
   */
  async getAllDetails(reports: VerifikasiPKH[]): Promise<DetailKomponenVerifikasi[]> {
    try {
      const details: DetailKomponenVerifikasi[] = [];
      const promises = reports.map(async (r) => {
        const detailsColRef = collection(db, getVerifikasiColName(), r.VerifikasiID, 'details');
        let snap;
        try {
          snap = await getDocs(detailsColRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `${getVerifikasiColName()}/${r.VerifikasiID}/details`);
          throw e;
        }
        snap.forEach((doc) => {
          details.push(doc.data() as DetailKomponenVerifikasi);
        });
      });
      await Promise.all(promises);
      
      const mockDetails = MockDatabase.getDetailKomponen();
      const mergedSet = new Map<string, DetailKomponenVerifikasi>();
      mockDetails.forEach(d => mergedSet.set(d.DetailID, d));
      details.forEach(d => mergedSet.set(d.DetailID, d));
      return Array.from(mergedSet.values());
    } catch (err) {
      console.warn("Gagal mengambil subcollection 'details' dari Firestore:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      return MockDatabase.getDetailKomponen();
    }
  },

  /**
   * Fetches all subcollection documents for a list of verification reports.
   */
  async getAllDokumen(reports: VerifikasiPKH[]): Promise<DokumenVerifikasi[]> {
    try {
      const docs: DokumenVerifikasi[] = [];
      const promises = reports.map(async (r) => {
        const docColRef = collection(db, getVerifikasiColName(), r.VerifikasiID, 'dokumen');
        let snap;
        try {
          snap = await getDocs(docColRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `${getVerifikasiColName()}/${r.VerifikasiID}/dokumen`);
          throw e;
        }
        snap.forEach((doc) => {
          docs.push(doc.data() as DokumenVerifikasi);
        });
      });
      await Promise.all(promises);
      
      const mockDocs = MockDatabase.getDokumen();
      const mergedSet = new Map<string, DokumenVerifikasi>();
      mockDocs.forEach(d => mergedSet.set(d.DokumenID, d));
      docs.forEach(d => mergedSet.set(d.DokumenID, d));
      return Array.from(mergedSet.values());
    } catch (err) {
      console.warn("Gagal mengambil subcollection 'dokumen' dari Firestore:", err);
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      return MockDatabase.getDokumen();
    }
  },

  /**
   * Adds a new MasterKPM record to Firestore (and mirrors to Mockdb)
   */
  async addMasterKPM(kpm: MasterKPM): Promise<void> {
    try {
      await setDoc(doc(db, getKpmColName(), kpm.KPMID), kpm);
    } catch (err) {
      console.error("Gagal menambahkan KPM ke Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `${getKpmColName()}/${kpm.KPMID}`);
      } catch (authErr) {
        // Log secure details or show status info to admins
        throw authErr;
      }
      throw err;
    }
    MockDatabase.addMasterKPM(kpm);
  },

  /**
   * Adds multiple MasterKPM records using Firestore writeBatch (chunks of 500)
   * Highly optimized to perform bulk insert very fast in few network roundtrips.
   */
  async batchAddMasterKPM(kpms: MasterKPM[]): Promise<number> {
    try {
      let dbWrites = 0;
      const CHUNK_SIZE = 500;
      
      // Get the current local mock database list
      const localList = MockDatabase.getMasterKPM();
      const existingIds = new Set(localList.map(item => item.KPMID));
      const newlyAddedKpms: MasterKPM[] = [];

      for (let i = 0; i < kpms.length; i += CHUNK_SIZE) {
        const chunk = kpms.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach((kpm) => {
          const docRef = doc(db, getKpmColName(), kpm.KPMID);
          batch.set(docRef, kpm);
          
          // Stage for local database update
          newlyAddedKpms.push(kpm);
          dbWrites++;
        });
        
        await batch.commit();
      }

      // Merge newly added items with local database, overwriting if duplicate ID
      const updatedLocalList = [...localList];
      newlyAddedKpms.forEach(newKpm => {
        const idx = updatedLocalList.findIndex(x => x.KPMID === newKpm.KPMID);
        if (idx !== -1) {
          updatedLocalList[idx] = newKpm;
        } else {
          updatedLocalList.push(newKpm);
        }
      });
      MockDatabase.saveMasterKPM(updatedLocalList);

      return dbWrites;
    } catch (err) {
      console.error("Gagal melakukan batch import KPM ke Firestore:", err);
      handleFirestoreError(err, OperationType.WRITE, getKpmColName());
      throw err;
    }
  },

  /**
   * Updates an existing MasterKPM record in Firestore (and mirrors to Mockdb)
   */
  async updateMasterKPM(kpm: MasterKPM): Promise<void> {
    try {
      await setDoc(doc(db, getKpmColName(), kpm.KPMID), kpm);
    } catch (err) {
      console.error("Gagal memperbarui KPM di Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `${getKpmColName()}/${kpm.KPMID}`);
      } catch (authErr) {
        throw authErr;
      }
      throw err;
    }
    MockDatabase.updateMasterKPM(kpm);
  },

  /**
   * Deletes a MasterKPM record from Firestore (and mirrors to Mockdb)
   */
  async deleteKPM(kpmId: string): Promise<void> {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, getKpmColName(), kpmId));
    } catch (err) {
      console.error("Gagal menghapus KPM dari Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `${getKpmColName()}/${kpmId}`);
      } catch (authErr) {
        throw authErr;
      }
      throw err;
    }
    MockDatabase.deleteKPM(kpmId);
  },

  /**
   * Updates verification approval/rejection status in Firestore
   */
  async updateVerificationStatus(verifikasiId: string, status: 'Tersubmit' | 'Tervalidasi' | 'Ditolak'): Promise<void> {
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, getVerifikasiColName(), verifikasiId), { Status: status });
    } catch (err) {
      console.error("Gagal memperbarui status laporan di Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `${getVerifikasiColName()}/${verifikasiId}`);
      } catch (authErr) {
        throw authErr;
      }
      throw err;
    }
    MockDatabase.updateStatus(verifikasiId, status);
  },

  /**
   * Clears all KPM records from Firestore and marks seeding as done to prevent automatic seeding of demo data.
   */
  async clearAllKPM(): Promise<void> {
    try {
      const kpmColRef = collection(db, getKpmColName());
      const snapshot = await getDocs(kpmColRef);
      const batch = writeBatch(db);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Set the seeding status to true so it doesn't seed on next fetch!
      const seedingDocRef = doc(db, 'metadata', 'seeding_status_' + getKpmColName());
      batch.set(seedingDocRef, { seeded: true, clearedAt: new Date().toISOString() });
      
      await batch.commit();
      
      // Also mark as seeded locally
      localStorage.setItem('pkh_seeded_' + getKpmColName(), 'true');
    } catch (err) {
      console.error("Gagal membersihkan Firestore KPM:", err);
      handleFirestoreError(err, OperationType.DELETE, getKpmColName());
      throw err;
    }
  }
};
