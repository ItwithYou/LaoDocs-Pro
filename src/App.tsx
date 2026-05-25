import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, loginWithGoogle } from "./firebase";
import { UserProfile, LaoLetterDocument } from "./types";
import { ThemeContext, LanguageContext } from "./contexts";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import DocumentTracker from "./components/DocumentTracker";
import DocumentConverter from "./components/DocumentConverter";
import SubscriptionModal from "./components/SubscriptionModal";
import AdminDashboard from "./components/AdminDashboard";
import ProfileModal from "./components/ProfileModal";
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

  const [isDark, setIsDark] = useState(false);
  const [isLao, setIsLao] = useState(true);

  // Sync theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Synchronize Google Authentication events
  useEffect(() => {
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

  // Fetch or construct profile document in Firestore
  const handleUserProfileSync = async (user: any) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      let profileData: UserProfile;

      if (!snap.exists()) {
        const isAdmin = user.email?.toLowerCase() === "norecord88@gmail.com";
        profileData = {
          userId: user.uid,
          email: user.email || "",
          displayName: user.displayName || "Lao Business Partner",
          subscriptionTier: isAdmin ? "ultra" : "free",
          role: isAdmin ? "admin" : "user",
          createdAt: new Date(),
        };
        await setDoc(userRef, {
          ...profileData,
          createdAt: serverTimestamp(),
        });
      } else {
        const data = snap.data();
        profileData = {
          userId: data.userId,
          email: data.email,
          displayName: data.displayName,
          subscriptionTier: data.subscriptionTier || "free",
          role: data.role || "user",
          createdAt: data.createdAt,
        };
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
      const snap = await getDocs(q);
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
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes('popup') || msg.includes('cross-origin') || msg.includes('opener')) {
        alert(isLao ? "ກະລຸນາເປີດແອັບໃນໜ້າຕ່າງໃໝ່ (New Tab) ໂດຍຄຣິກປຸ່ມຢູ່ມຸມຂວາເທິງ ເພື່ອເຂົ້າສູ່ລະບົບ." : "Please open the app in a new tab using the top-right button to sign in. Popups are blocked here.");
      } else {
        alert(isLao ? "ເຂົ້າສູ່ລະບົບລົ້ມເຫຼວ." : "Login failed.");
      }
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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center" id="app-loading-screen">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <FileText className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-xs font-bold text-slate-800">ກຳລັງໂຫຼດຂໍ້ມູນລະບົບ... / Syncing Portal State</p>
        <p className="text-xxs text-slate-450 mt-1.5 font-mono">Secured Handshake via TLS 1.3</p>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark: () => setIsDark(!isDark) }}>
      <LanguageContext.Provider value={{ isLao, toggleLanguage: () => setIsLao(!isLao) }}>
        <div className={`min-h-screen bg-blue-50/30 dark:bg-slate-900 transition-colors flex flex-col ${isDark ? 'dark' : ''}`} id="app-dashboard-wrapper">
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
        onAdminClick={() => setIsAdminModalOpen(true)}
      />

      {/* Main Subordinate Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        
        {/* Dynamic Bento workspace grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start flex-1">
          {/* Main Workspace - Interactive OCR & Font Conversion panel */}
          <section className="w-full lg:w-7/12 xl:w-8/12 space-y-6">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-tiffany-500" />
                  <span>{isLao ? 'ຫ້ອງເຮັດວຽກຕົວແປງເອກະສານ' : 'Conversion Workspace'}</span>
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
            />
          </section>

          {/* Side partition - Document Tracker Cabinet */}
          <section className="w-full lg:w-5/12 xl:w-4/12 lg:sticky lg:top-20 lg:max-h-[calc(100vh-8rem)]">
            <DocumentTracker
              documents={documents}
              onSelectDocument={(docItem) => setSelectedDocument(docItem)}
              selectedDocId={selectedDocument?.documentId || null}
              onRefresh={() => userProfile && fetchUserDocuments(userProfile.userId)}
            />
          </section>
        </div>

        {/* Statistics & Quick Onboarding Banner */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 relative overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-tiffany-500/5 dark:bg-tiffany-500/10 rounded-full filter blur-3xl translate-x-24 -translate-y-24 shrink-0" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5">
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] bg-tiffany-50 dark:bg-tiffany-500/10 border border-tiffany-100 dark:border-white/5 text-tiffany-600 dark:text-tiffany-400 font-mono font-medium tracking-wider">
                ● Private Security Documents
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-350 max-w-xl leading-relaxed">
                {isLao ? 
                  "LaoDoc ຈັດການເອກະສານທາງການ, ແປງໄຟລ໌ຮູບພາບ/PDF ເປັນຂໍ້ຄວາມ (OCR), ແລະ ແປງຟອນເກົ່າ Saysettha ໃຫ້ເປັນ Phetsarath OT ມາດຕະຖານ." :
                  "LaoDoc manages formal letter archives, OCR translates scanner files, and sanitizes Saysettha ASCII layout structures into clean Unicode Phetsarath OT letters."
                }
              </p>
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
        <AdminDashboard onClose={() => setIsAdminModalOpen(false)} />
      )}
      
      {isProfileModalOpen && userProfile && (
        <ProfileModal 
          userProfile={userProfile} 
          onClose={() => setIsProfileModalOpen(false)} 
          onUpdate={setUserProfile} 
        />
      )}
    </div>
    </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}
