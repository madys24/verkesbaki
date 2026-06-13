import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, addDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Enable persistence so auth state persists across reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence setup failed:", err);
});

// Configure Google Auth Provider with Google Drive file scope and Google Contacts scope
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem('pkh_google_drive_token');
  } catch (e) {
    return null;
  }
})();

// Listen to auth state transitions
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = cachedAccessToken || (() => {
        try {
          return sessionStorage.getItem('pkh_google_drive_token');
        } catch (e) {
          return null;
        }
      })();

      if (activeToken) {
        cachedAccessToken = activeToken;
        if (onAuthSuccess) onAuthSuccess(user, activeToken);
      } else {
        // Fallback: If auth state restored but token is in memory (cleared on refresh),
        // we'll trigger failure so they can login and receive a fresh token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('pkh_google_drive_token');
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in workflow 
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan Access Token Google Drive dari autentikasi');
    }
    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('pkh_google_drive_token', cachedAccessToken);
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Autentikasi gagal:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve token or request login
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Sign out and clear stored token representation
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('pkh_google_drive_token');
  } catch (e) {}
};

/**
 * Ensures a directory named "Verifikasi-PKH" exists in user's Google Drive.
 * Returns the folder ID.
 */
export const getOrCreateDriveFolder = async (accessToken: string): Promise<string> => {
  try {
    // Search for existing folder
    const query = encodeURIComponent("name = 'Verifikasi-PKH' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // Not found, let's create a new folder
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const folderMetadata = {
      name: 'Verifikasi-PKH',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Berkas dan Bukti Foto Pelaporan Aplikasi Verifikasi Kesehatan Mandiri PKH'
    };

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folderMetadata)
    });

    if (!createRes.ok) {
      throw new Error(`Gagal membuat folder Drive: ${await createRes.text()}`);
    }

    const folderData = await createRes.json();
    return folderData.id;
  } catch (err) {
    console.error('Error in getOrCreateDriveFolder:', err);
    throw err;
  }
};

/**
 * Upload Base64 evidence image as JPEG file inside the "Verifikasi-PKH" Drive folder
 */
export const uploadImageToDrive = async (
  accessToken: string,
  fileName: string,
  base64Data: string,
  folderId?: string
): Promise<{ id: string; webViewLink: string }> => {
  try {
    const mimeType = 'image/jpeg';
    
    // Extract actual base64 content
    let base64Content = base64Data;
    if (base64Data.includes('base64,')) {
      base64Content = base64Data.split('base64,')[1];
    }

    const metadata = {
      name: fileName,
      mimeType: mimeType,
      ...(folderId ? { parents: [folderId] } : {})
    };

    const boundary = '314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const header = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const bodyHeader = `\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    
    const payload = delimiter + header + delimiter + bodyHeader + base64Content + close_delim;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: payload
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive API upload gagal: ${errText}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Gagal mengunggah foto ${fileName} ke Google Drive:`, err);
    throw err;
  }
};

/**
 * Validates Firestore database status
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_probe'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Koneksi Firestore luar jaringan (offline mode).");
    }
  }
}

testConnection();
