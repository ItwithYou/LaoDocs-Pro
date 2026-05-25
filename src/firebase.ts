import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { 
  getFirestore, 
  getDoc as fGetDoc, 
  getDocs as fGetDocs, 
  setDoc as fSetDoc, 
  updateDoc as fUpdateDoc, 
  deleteDoc as fDeleteDoc 
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize with custom database id if provided
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Offline detection state
let isOfflineMode = localStorage.getItem("lao_docs_is_offline") === "true";

export function setOfflineMode(value: boolean) {
  isOfflineMode = value;
  localStorage.setItem("lao_docs_is_offline", String(value));
  // Dispatch a custom event to notify React components instantly
  window.dispatchEvent(new CustomEvent("lao_docs_offline_change", { detail: value }));
}

export function getOfflineMode() {
  return isOfflineMode;
}

// Local storage key constants
const USERS_KEY = "lao_docs_users";
const DOCUMENTS_KEY = "lao_docs_documents";
const TEMPLATES_KEY = "lao_docs_templates";
const AITYPES_KEY = "lao_docs_aitypes";
const SUBS_KEY = "lao_docs_subscriptions";

// Prepopulate mock/local data on load so templates and AI types are instantly available offline
export function initializeOfflineData() {
  if (!localStorage.getItem(TEMPLATES_KEY)) {
    const defaultTemplates = [
      {
        id: "tmpl_proposal",
        name: "ແບບຟອມ ໜັງສືສະເໜີ (Official Project Proposal)",
        description: "ລັດຖະການ ແລະ ເອກະຊົນ • ຟອນ ເພັດສະລາດ OT ມາດຕະຖານ",
        fileName: "proposal_template.docx",
        fileBase64: "", 
        createdAt: new Date().toISOString()
      },
      {
        id: "tmpl_decision",
        name: "ແບບຟອມ ຂໍ້ຕົກລົງ (Administrative Decision)",
        description: "ສໍາລັບການແຕ່ງຕັ້ງ, ອະນຸມັດ ຫຼື ຕົກລົງວຽກງານ • ຟອນ ເພັດສະລາດ OT",
        fileName: "decision_template.docx",
        fileBase64: "",
        createdAt: new Date().toISOString()
      },
      {
        id: "tmpl_notice",
        name: "ແບບຟອມ ແຈ້ງການ (Official Notice / Announcement)",
        description: "ສໍາລັບແຈ້ງການກອງປະຊຸມ, ແຈ້ງການຈັດຕັ້ງປະຕິບັດ • ຟອນ ເພັດສະລາດ OT",
        fileName: "notification_template.docx",
        fileBase64: "",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(defaultTemplates));
  }

  if (!localStorage.getItem(AITYPES_KEY)) {
    const defaultAiTypes = [
      {
        id: "ai_decision",
        name: "ຂໍ້ຕົກລົງ (Decision)",
        instructions: "ຮ່າງຂໍ້ຕົກລົງຕາມລະບຽບການບໍລິຫານລັດຖະການ ແລະ ວິສາຫະກິດ, ການກໍານົດວັດຖຸປະສົງ, ເນື້ອໃນແຕ່ລະມາດຕາ, ແລະ ບົດບັນຍັດສຸດທ້າຍ.",
        createdAt: new Date().toISOString()
      },
      {
        id: "ai_proposal",
        name: "ໃບສະເໜີ (Proposal)",
        instructions: "ຮ່າງໜັງສືສະເໜີຂໍທຶນ, ສະເໜີອະນຸມັດໂຄງການ, ຮ່າງເນື້ອໃນຄວາມຈໍາເປັນ, ຈຸດປະສົງ, ຈຸດດີ, ຈຸດອ່ອນ ແລະ ຂໍ້ສະເໜີຈະແຈ້ງ.",
        createdAt: new Date().toISOString()
      },
      {
        id: "ai_notice",
        name: "ແຈ້ງການ (Notification / Announcement)",
        instructions: "ຮ່າງແຈ້ງການທາງການສໍາລັບບຸກຄົນ, ພະລາກອນ, ການແຈ້ງມະຕິ, ການຈັດຕັ້ງປະຕິບັດວຽກງານ, ວັນເວລາ ແລະ ສະຖານທີ່.",
        createdAt: new Date().toISOString()
      },
      {
        id: "ai_official_letter",
        name: "ໜັງສືທາງການ (Official Relationship Letter)",
        instructions: "ຮ່າງໜັງສືພົວພັນ, ໜັງສືເຊີນຮ່ວມງານ, ໜັງສືຕອບຮັບ ຫຼື ໜັງສືລາຍງານຄວາມຄືບໜ້າວຽກງານ.",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(AITYPES_KEY, JSON.stringify(defaultAiTypes));
  }
}

// Perform instant setup
initializeOfflineData();

// Test server connection on startup
async function probeConnection() {
  try {
    const { doc, getDocFromServer } = await import("firebase/firestore");
    await getDocFromServer(doc(db, "settings", "connection_probe"));
    setOfflineMode(false);
  } catch (err) {
    console.warn("Firestore host unavailable/connection timed out. Activating Offline Mode fallback.");
    setOfflineMode(true);
  }
}
probeConnection();

// Local cache database operations
function saveLocalDoc(path: string, data: any) {
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];
  
  if (collectionName === "users") {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    users[docId] = { ...users[docId], ...data };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else if (collectionName === "documents") {
    const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "[]");
    const existingIndex = docs.findIndex((d: any) => d.documentId === docId);
    const saveObj = { ...data, documentId: docId };
    if (existingIndex >= 0) {
      docs[existingIndex] = { ...docs[existingIndex], ...saveObj };
    } else {
      docs.push(saveObj);
    }
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  } else if (collectionName === "templates") {
    const tmpls = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
    const existingIndex = tmpls.findIndex((d: any) => d.id === docId);
    if (existingIndex >= 0) {
      tmpls[existingIndex] = { ...tmpls[existingIndex], ...data };
    } else {
      tmpls.push({ id: docId, ...data });
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tmpls));
  } else if (collectionName === "aitypes") {
    const types = JSON.parse(localStorage.getItem(AITYPES_KEY) || "[]");
    const existingIndex = types.findIndex((d: any) => d.id === docId);
    if (existingIndex >= 0) {
      types[existingIndex] = { ...types[existingIndex], ...data };
    } else {
      types.push({ id: docId, ...data });
    }
    localStorage.setItem(AITYPES_KEY, JSON.stringify(types));
  } else if (collectionName === "subscriptionRequests") {
    const reqs = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
    const existingIndex = reqs.findIndex((d: any) => d.reqId === docId || d.id === docId);
    const saveObj = { id: docId, reqId: docId, ...data };
    if (existingIndex >= 0) {
      reqs[existingIndex] = { ...reqs[existingIndex], ...saveObj };
    } else {
      reqs.push(saveObj);
    }
    localStorage.setItem(SUBS_KEY, JSON.stringify(reqs));
  }
}

function deleteLocalDoc(path: string) {
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];
  
  if (collectionName === "users") {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    delete users[docId];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else if (collectionName === "documents") {
    const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "[]");
    const filtered = docs.filter((d: any) => d.documentId !== docId);
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(filtered));
  } else if (collectionName === "templates") {
    const tmpls = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
    const filtered = tmpls.filter((d: any) => d.id !== docId);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  } else if (collectionName === "aitypes") {
    const types = JSON.parse(localStorage.getItem(AITYPES_KEY) || "[]");
    const filtered = types.filter((d: any) => d.id !== docId);
    localStorage.setItem(AITYPES_KEY, JSON.stringify(filtered));
  } else if (collectionName === "subscriptionRequests") {
    const reqs = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
    const filtered = reqs.filter((d: any) => d.reqId !== docId && d.id !== docId);
    localStorage.setItem(SUBS_KEY, JSON.stringify(filtered));
  }
}

function getCollectionPath(queryRef: any): string {
  if (queryRef.path) {
    return queryRef.path;
  }
  if (queryRef._query && queryRef._query.path) {
    const segments = queryRef._query.path.segments || [];
    return segments.join("/");
  }
  const str = String(queryRef);
  if (str.includes("documents")) return "documents";
  if (str.includes("templates")) return "templates";
  if (str.includes("aitypes")) return "aitypes";
  if (str.includes("subscriptionRequests")) return "subscriptionRequests";
  return "";
}

// Resilient Wrapper Methods
export async function safeGetDoc(docRef: any) {
  const path = docRef.path;
  const parts = path.split("/");
  const collectionName = parts[0];
  const docId = parts[1];

  if (isOfflineMode) {
    let data: any = null;
    if (collectionName === "users") {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
      data = users[docId] || null;
    } else if (collectionName === "documents") {
      const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "[]");
      data = docs.find((d: any) => d.documentId === docId) || null;
    } else if (collectionName === "templates") {
      const tmpls = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
      data = tmpls.find((t: any) => t.id === docId) || null;
    }
    return {
      exists: () => data !== null,
      data: () => data,
      id: docId
    };
  }

  try {
    const snap = await fGetDoc(docRef);
    if (snap.exists() && collectionName === "users") {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
      users[docId] = snap.data();
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return snap;
  } catch (err) {
    console.warn("Network unreachable on getDoc. Falling back to local state.", err);
    setOfflineMode(true);
    let data: any = null;
    if (collectionName === "users") {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
      data = users[docId] || null;
    } else if (collectionName === "documents") {
      const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "[]");
      data = docs.find((d: any) => d.documentId === docId) || null;
    } else if (collectionName === "templates") {
      const tmpls = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
      data = tmpls.find((t: any) => t.id === docId) || null;
    }
    return {
      exists: () => data !== null,
      data: () => data,
      id: docId
    };
  }
}

export async function safeGetDocs(queryRef: any) {
  const colPath = getCollectionPath(queryRef);

  if (isOfflineMode) {
    let localList: any[] = [];
    if (colPath === "documents") {
      const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "[]");
      const uid = auth.currentUser?.uid;
      localList = uid ? docs.filter((d: any) => d.ownerId === uid) : docs;
    } else if (colPath === "templates") {
      localList = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
    } else if (colPath === "aitypes") {
      localList = JSON.parse(localStorage.getItem(AITYPES_KEY) || "[]");
    } else if (colPath === "subscriptionRequests") {
      localList = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
    }

    localList.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return {
      docs: localList.map((item: any) => ({
        id: item.id || item.documentId || item.reqId,
        data: () => item
      })),
      empty: localList.length === 0,
      size: localList.length,
      forEach: function(callback: (doc: any) => void) {
        this.docs.forEach(callback);
      }
    };
  }

  try {
    const snap = await fGetDocs(queryRef);
    // Sync templates and custom AI modes to local storage for quick offline retrieval
    if (snap && colPath === "templates") {
      const tmpls = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tmpls));
    } else if (snap && colPath === "aitypes") {
      const types = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      localStorage.setItem(AITYPES_KEY, JSON.stringify(types));
    } else if (snap && colPath === "documents") {
      const docs = snap.docs.map(d => d.data());
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
    }
    return snap;
  } catch (err) {
    console.warn("Network unreachable on getDocs. Falling back to local state.", err);
    setOfflineMode(true);
    let localList: any[] = [];
    if (colPath === "documents") {
      const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || "[]");
      const uid = auth.currentUser?.uid;
      localList = uid ? docs.filter((d: any) => d.ownerId === uid) : docs;
    } else if (colPath === "templates") {
      localList = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
    } else if (colPath === "aitypes") {
      localList = JSON.parse(localStorage.getItem(AITYPES_KEY) || "[]");
    } else if (colPath === "subscriptionRequests") {
      localList = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
    }

    localList.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return {
      docs: localList.map((item: any) => ({
        id: item.id || item.documentId || item.reqId,
        data: () => item
      })),
      empty: localList.length === 0,
      size: localList.length,
      forEach: function(callback: (doc: any) => void) {
        this.docs.forEach(callback);
      }
    };
  }
}

export async function safeSetDoc(docRef: any, data: any, options?: any) {
  const path = docRef.path;
  saveLocalDoc(path, data);

  if (isOfflineMode) {
    return true;
  }

  try {
    if (options) {
      await fSetDoc(docRef, data, options);
    } else {
      await fSetDoc(docRef, data);
    }
    return true;
  } catch (err) {
    console.warn("Network offline on setDoc. Saving locally.", err);
    setOfflineMode(true);
    return true;
  }
}

export async function safeUpdateDoc(docRef: any, data: any) {
  const path = docRef.path;
  saveLocalDoc(path, data);

  if (isOfflineMode) {
    return true;
  }

  try {
    await fUpdateDoc(docRef, data);
    return true;
  } catch (err) {
    console.warn("Network offline on updateDoc. Saving locally.", err);
    setOfflineMode(true);
    return true;
  }
}

export async function safeDeleteDoc(docRef: any) {
  const path = docRef.path;
  deleteLocalDoc(path);

  if (isOfflineMode) {
    return true;
  }

  try {
    await fDeleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("Network offline on deleteDoc. Deleting locally.", err);
    setOfflineMode(true);
    return true;
  }
}

// Standard login
export async function loginWithGoogle() {
  try {
    const { signInWithPopup } = await import("firebase/auth");
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Google Auth Error:", error);
    if (error.code === 'auth/popup-blocked' || error.message?.toLowerCase().includes('popup') || error.message?.toLowerCase().includes('cross-origin') || error.message?.toLowerCase().includes('opener')) {
      const { signInWithRedirect } = await import("firebase/auth");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

// Error handling system defined in Firebase Integration Skill
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error("Firestore Error Detailed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
