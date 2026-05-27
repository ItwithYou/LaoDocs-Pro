import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { doc, collection, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, loginWithGoogle, safeGetDoc, safeSetDoc, safeGetDocs, getOfflineMode, setOfflineMode } from "./firebase";
import { UserProfile, LaoLetterDocument } from "./types";
import { ThemeContext, LanguageContext } from "./contexts";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import DocumentTracker from "./components/DocumentTracker";
import DocumentConverter from "./components/DocumentConverter";
import SubscriptionModal from "./components/SubscriptionModal";
import AdminDashboard from "./components/AdminDashboard";
import ProfileModal from "./components/ProfileModal";
import SupportChat from "./components/SupportChat";
import { Shield, Sparkles, Building, Briefcase, FileText } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(true); // Default to true so user bypasses AuthScreen on launch
  const [documents, setDocuments] = useState<LaoLetterDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<LaoLetterDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'users' | 'requests' | 'tracking' | 'templates' | 'aitypes' | 'bankqrs' | 'billing' | 'chat'>('requests');

  const [theme, setTheme] = useState<'light' | 'dark' | 'soft-blue' | 'warm-clay' | 'fresh-mint'>(() => {
    const saved = localStorage.getItem("lao-docs-theme");
    return (saved === "dark" || saved === "soft-blue" || saved === "warm-clay" || saved === "fresh-mint" || saved === "light") ? (saved as any) : "warm-clay";
  });
  const [isLao, setIsLao] = useState(true);
  const [isOfflineDevice, setIsOfflineDevice] = useState(getOfflineMode());

  // Listen to offline mode change event from firebase.ts
  useEffect(() => {
    const handleOfflineChange = (e: any) => {
      setIsOfflineDevice(e.detail);
    };
    window.addEventListener("lao_docs_offline_change", handleOfflineChange);
    return () => window.removeEventListener("lao_docs_offline_change", handleOfflineChange);
  }, []);

  // Sync theme
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'soft-blue', 'warm-clay', 'fresh-mint');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'soft-blue') {
      document.documentElement.classList.add('soft-blue');
    } else if (theme === 'warm-clay') {
      document.documentElement.classList.add('warm-clay');
    } else if (theme === 'fresh-mint') {
      document.documentElement.classList.add('fresh-mint');
    }
    localStorage.setItem("lao-docs-theme", theme);
  }, [theme]);

  // Synchronize Google Authentication events
  useEffect(() => {
    // Check for redirect result first
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        // User is signed in via redirect, onAuthStateChanged will pick it up
      }
    }).catch((error) => {
      console.error("Firebase Auth Redirect Error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setCurrentUser(user);
        await handleUserProfileSync(user);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setDocuments([]);
        setSelectedDocument(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Heartbeat to keep user isOnline as true and update lastActiveAt
  useEffect(() => {
    if (!currentUser) return;

    let destroyed = false;

    const updateStatus = async (status: boolean) => {
      if (destroyed) return;
      try {
        const { doc } = await import("firebase/firestore");
        const { safeUpdateDoc } = await import("./firebase");
        const userRef = doc(db, "users", currentUser.uid);
        await safeUpdateDoc(userRef, {
          isOnline: status,
          lastActiveAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Offline status synchronization failed:", err);
      }
    };

    // Trigger immediate active state
    updateStatus(true);

    // Heartbeat every 20 seconds to maintain online designation
    const interval = setInterval(() => {
      updateStatus(true);
    }, 20000);

    const handleUnloadStatus = () => {
      // Best effort offline signal on page closed
      updateStatus(false);
    };

    window.addEventListener("beforeunload", handleUnloadStatus);

    return () => {
      destroyed = true;
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnloadStatus);
      updateStatus(false);
    };
  }, [currentUser]);

  // Fetch or construct profile document in Firestore
  const handleUserProfileSync = async (user: any) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await safeGetDoc(userRef);

      let profileData: UserProfile;
      const isAdminUid = user.uid === "zVEwrk4m8XNueS0HiNRDIgMHwWm2";
      const isAdminEmail = user.email?.toLowerCase() === "norecord88@gmail.com";
      const isSystemAdmin = isAdminUid || isAdminEmail;

      if (!snap.exists()) {
        profileData = {
          userId: user.uid,
          email: user.email || "",
          displayName: isSystemAdmin ? "LaoDocs Admin" : (user.displayName || "Lao Business Partner"),
          subscriptionTier: isSystemAdmin ? "ultra" : "free",
          role: isSystemAdmin ? "admin" : "user",
          createdAt: new Date(),
          profilePhoto: user.photoURL || "",
          birthday: "",
        };
        await safeSetDoc(userRef, {
          ...profileData,
          createdAt: serverTimestamp(),
        });
      } else {
        const data = snap.data();
        profileData = {
          userId: data.userId,
          email: data.email || user.email || "",
          displayName: isSystemAdmin ? "LaoDocs Admin" : (data.displayName || user.displayName || "Lao Business Partner"),
          subscriptionTier: isSystemAdmin ? "ultra" : (data.subscriptionTier || "free"),
          role: isSystemAdmin ? "admin" : (data.role || "user"),
          createdAt: data.createdAt || new Date(),
          birthday: data.birthday || "",
          profilePhoto: data.profilePhoto || user.photoURL || "",
        };
        // Update database if the database values are stale for the admin
        if (isSystemAdmin && (data.role !== "admin" || data.subscriptionTier !== "ultra" || data.displayName !== "LaoDocs Admin")) {
          const { safeUpdateDoc } = await import("./firebase");
          await safeUpdateDoc(userRef, {
            role: "admin",
            subscriptionTier: "ultra",
            displayName: "LaoDocs Admin"
          });
        }
      }

      setUserProfile(profileData);
      // Fetch historical logs
      await fetchUserDocuments(user.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents owned by the logged-in user
  const fetchUserDocuments = async (uid: string) => {
    try {
      const q = query(
        collection(db, "documents"),
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snap = await safeGetDocs(q);
      const docsList: LaoLetterDocument[] = [];
      
      snap.forEach((d) => {
        docsList.push(d.data() as LaoLetterDocument);
      });

      setDocuments(docsList);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "documents");
    }
  };

  const handleGoogleLoginDirect = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
    } catch (err: any) {
      console.error("Direct Google login failure", err);
      // We rely on signInWithRedirect fallback in firebase.ts, so we don't need invasive alerts
    }
  };

  const handleLogout = async () => {
    try {
      setIsGuest(false);
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out error", err);
    }
  };

  const handleProfileTierUpdate = (newTier: "free" | "pro" | "ultra") => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        subscriptionTier: newTier,
      });
      // Refresh documents
      fetchUserDocuments(userProfile.userId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center" id="app-loading-screen">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-tiffany-500 rounded-full animate-spin" />
          <FileText className="w-6 h-6 text-tiffany-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide font-sans">LaoDocs Pro loading....</p>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <LanguageContext.Provider value={{ isLao, toggleLanguage: () => setIsLao(!isLao) }}>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300" id="app-dashboard-wrapper">
          {/* Navigation */}
      <Navbar
        userProfile={userProfile}
        onProfileClick={() => setIsProfileModalOpen(true)}
        onUpgradeClick={() => {
          if (!userProfile) {
            handleGoogleLoginDirect();
          } else {
            setIsSubscriptionModalOpen(true);
          }
        }}
        onLogout={handleLogout}
        onLoginClick={handleGoogleLoginDirect}
        onAdminClick={() => {
          setAdminInitialTab('requests');
          setIsAdminModalOpen(true);
        }}
        onChatClick={() => {
          setAdminInitialTab('chat');
          setIsAdminModalOpen(true);
        }}
      />

      {/* Main Subordinate Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        
        {isOfflineDevice && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="animate-ping inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="font-semibold text-slate-800">
                {isLao 
                  ? "ໂໝດອອຟລາຍເຮັດວຽກຢູ່ (Offline Safe Mode Active) • ເຮັດວຽກ ແລະ ບັນທຶກຂໍ້ມູນໃນເຄື່ອງຂອງທ່ານໂດຍອັດຕະໂນມັດ" 
                  : "Offline Safe Mode active • Progress is automatically saved locally to your browser."}
              </span>
            </div>
            <button 
              onClick={() => {
                setOfflineMode(false);
                window.location.reload();
              }}
              className="text-amber-800 hover:text-amber-950 font-bold text-xs underline cursor-pointer"
            >
              {isLao ? "ລອງເຊື່ອມຕໍ່ໃໝ່" : "Retry Connection"}
            </button>
          </div>
        )}

        {/* Dynamic Bento workspace grid / Admin Workspace */}
        {userProfile?.role === "admin" || userProfile?.userId === "zVEwrk4m8XNueS0HiNRDIgMHwWm2" ? (
          <div className="w-full flex-1">
            <AdminDashboard 
              inline={true} 
              userProfile={userProfile} 
              onUpdate={setUserProfile} 
              initialTab={adminInitialTab}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start flex-1">
            {/* Main Workspace - Interactive OCR & Font Conversion panel */}
            <section className="w-full lg:w-7.5/12 xl:w-8/12 space-y-6">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-tiffany-500" />
                    <span>{isLao ? 'ເອກະສານອັດຕະໂນມັດ' : 'Conversion Workspace'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isLao ? 'ປ່ຽນຮູບພາບໃຫ້ເປັນຂໍ້ຄວາມພ້ອມທັງແປງຟອນເຂົ້າສູ່ລະບົບມາດຕະຖານ' : 'Transform screenshots to editable text under standard Lao administrative rules'}
                  </p>
                </div>
              </div>

              <DocumentConverter
                userProfile={userProfile}
                documents={documents}
                onDocumentSaved={() => userProfile && fetchUserDocuments(userProfile.userId)}
                selectedDocument={selectedDocument}
                onClearSelected={() => setSelectedDocument(null)}
                onRequireLogin={handleGoogleLoginDirect}
                onUpgradeClick={() => setIsSubscriptionModalOpen(true)}
              />
            </section>

            {/* Side partition - Document Tracker Cabinet */}
            <section className="w-full lg:w-4.5/12 xl:w-4/12 lg:sticky lg:top-20 lg:max-h-[calc(100vh-8rem)]">
              <DocumentTracker
                documents={documents}
                onSelectDocument={(docItem) => setSelectedDocument(docItem)}
                selectedDocId={selectedDocument?.documentId || null}
                onRefresh={() => userProfile && fetchUserDocuments(userProfile.userId)}
              />
            </section>
          </div>
        )}

        {/* Floating Bottom Note Bar */}
        <div className="w-full mt-auto py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-b-2xl sm:rounded-2xl border-t sm:border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-center overflow-hidden">
          <div className="relative w-full overflow-hidden flex items-center h-6">
            <div className="animate-marquee flex items-center gap-2 absolute">
              <span className="inline-flex w-1.5 h-1.5 rounded-full bg-teal-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {isLao ? 
                  "LaoDocs  ຊ່ວຍທ່ານຈັດການເອກະສານທາງການ, ແປງໄຟລ໌ຮູບພາບ,.. ແລະ ແປງຟອນເກົ່າໃຫ້ເປັນ Phetsarath OT ຕາມມາດຕະຖານ ໂດຍທ່ານບໍ່ຕ້ອງໄດ້ພີມຄືເມື່ອກ່ອນແລ້ວ. " :
                  "LaoDocs helps you manage official documents, convert images, and convert legacy fonts to standard Phetsarath OT without manual typing."
                }
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription billing modal */}
      {isSubscriptionModalOpen && (
        <SubscriptionModal
          userProfile={userProfile}
          onClose={() => setIsSubscriptionModalOpen(false)}
          onUpdateProfile={handleProfileTierUpdate}
        />
      )}

      {/* Authentication Gateway Modal */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(user) => { setCurrentUser(user); }}
        />
      )}

      {isAdminModalOpen && (
        <AdminDashboard 
          userProfile={userProfile} 
          onUpdate={setUserProfile}
          onClose={() => setIsAdminModalOpen(false)} 
          initialTab={adminInitialTab}
        />
      )}
      
      {isProfileModalOpen && userProfile && (
        <ProfileModal 
          userProfile={userProfile} 
          onClose={() => setIsProfileModalOpen(false)} 
          onUpdate={setUserProfile} 
          onLoginClick={handleGoogleLoginDirect}
          onUpgradeClick={() => {
            setIsProfileModalOpen(false);
            setIsSubscriptionModalOpen(true);
          }}
          onLogout={() => {
            setIsProfileModalOpen(false);
            handleLogout();
          }}
        />
      )}
    </div>
    </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}
