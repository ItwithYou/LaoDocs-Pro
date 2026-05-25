import { loginWithGoogle } from "../firebase";
import { useState } from "react";
import { FileText, ShieldCheck, Sparkles, Languages, CheckCircle2, Sun, Moon } from "lucide-react";
import { useLanguage, useTheme } from "../contexts";

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  onGuestLogin?: () => void;
}

export default function AuthScreen({ onLoginSuccess, onGuestLogin }: AuthScreenProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { isDark, toggleDark } = useTheme();
  const { isLao, toggleLanguage } = useLanguage();

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error("Auth Screen Google login failure", err);
      setErrorMsg("ການເຂົ້າສູ່ລະບົບລົ້ມເຫຼວ. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ. (Login failed. Please try again.)");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors" id="auth-screen-container">
      {/* Decorative Branding Panel */}
      <div className="md:w-1/2 bg-slate-950 p-8 sm:p-12 md:p-16 flex flex-col justify-between text-white relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-radial-gradient from-slate-900 via-slate-950 to-black opacity-80" />
        
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-505/10 rounded-full filter blur-3xl translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-505/10 rounded-full filter blur-3xl -translate-x-12 translate-y-12" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-950 shrink-0 shadow-lg">
              <FileText className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <p className="text-xxs font-mono text-slate-350 uppercase tracking-widest leading-none">LAO BUSINESS SYSTEM</p>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">LaoDoc Converter</h2>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight leading-tight mb-6">
            ລະບົບຄຸ້ມຄອງ ແລະ ແປງຟອນ ເອກະສານທາງການລາວ
          </h1>
          <p className="text-slate-300 text-sm max-w-sm mb-10">
            The secure formal letter tracking, scanning OCR, and official Phetsarath OT font converter for modern Businesses in Laos.
          </p>

          <div className="space-y-4 max-w-md">
            <div className="flex items-start space-x-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">ປ່ຽນຮູບພາບ ແລະ PDF ເປັນ Word / PDF to Word OCR</p>
                <p className="text-[11px] text-slate-400">Instantly convert scanned PDFs and mobile phone snapshots of letters into searchable, editable MS Word layouts.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <Languages className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">ແປງຟອນເກົ່າ ເປັນຟອນມາດຕະຖານ / Font Normalization</p>
                <p className="text-[11px] text-slate-400">Convert Saysettha/Sanyasit old-style layouts directly into the governmental "Phetsarath OT" Unicode font.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">ຈັດເກັບເອກະສານ ແລະ ຕິດຕາມສະຖານະ / Secure Repository</p>
                <p className="text-[11px] text-slate-400">Securely document and track letters from different ministries. Organize metadata, reference numbers, and workflow history.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-slate-800 text-xxs text-slate-400 font-mono">
          <p>AUTHORIZED LAO CLOUD RUN CONTAINER SECURED PORTAL</p>
          <p className="mt-0.5">© 2026 MINISTRY INTEGRATED COMPLIANT DESIGN SYSTEM</p>
        </div>
      </div>

      {/* Auth Interaction Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 md:p-16 bg-white dark:bg-slate-900 min-h-[400px] transition-colors relative">
        <div className="absolute top-6 right-6 flex items-center space-x-2">
          <button
            onClick={toggleLanguage}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            title="Toggle Language"
          >
            <Languages className="w-5 h-5" />
            <span className="hidden sm:inline-block">{isLao ? 'EN' : 'ລາວ'}</span>
          </button>
          
          <button
            onClick={toggleDark}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="max-w-sm w-full text-center">
          <div className="mb-8">
            <span className="inline-flex px-3 py-1 rounded-full text-xxs bg-tiffany-50 dark:bg-tiffany-500/10 text-tiffany-700 dark:text-tiffany-400 font-mono font-semibold uppercase tracking-wider mb-3">
              {isLao ? "ລະບົບເຂົ້າໃຊ້ສຳລັບພະນັກງານ" : "Institutional Gateway"}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{isLao ? "ເຂົ້າສູ່ລະບົບ" : "Account Sign-in"}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isLao ? "ກະລຸນາໃຊ້ບັນຊີ Google ເພື່ອເຂົ້າສູ່ລະບົບຢ່າງປອດໄພ." : "Please use your standard authorized Google account to register or sign-in securely."}</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-xs text-red-650 dark:text-red-400 font-medium text-left">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-3 transition active:scale-98 cursor-pointer border border-slate-900/10 shadow-sm disabled:opacity-75"
              id="google-login-btn"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {/* Custom Google Vector Icon */}
                  <svg className="w-4 h-4 text-white shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.19-5.136 4.19A5.727 5.727 0 018.21 12.87a5.727 5.727 0 015.781-5.72c1.478 0 2.822.567 3.84 1.493l2.883-2.883C18.84 3.945 16.53 3 13.992 3 8.356 3 3.8 7.556 3.8 13.193c0 5.637 4.557 10.193 10.193 10.193 6.96 0 10.749-4.852 10.22-10.285H12.24z"/>
                  </svg>
                  <span>{isLao ? "ເຂົ້າສູ່ລະບົບດ້ວຍ Google" : "Sign In with Google"}</span>
                </>
              )}
            </button>
            <button
              onClick={onGuestLogin}
              disabled={isLoggingIn}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              {isLao ? "ເຂົ້າໃຊ້ງານແບບແຂກ (ທົດລອງ 3 ຄັ້ງ)" : "Continue as Guest (3 Free Try)"}
            </button>
          </div>

          <div className="mt-8 text-xxs text-slate-450 border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="max-w-[300px] mx-auto. text-slate-400">
              {isLao ? "ຂໍ້ມູນທັງໝົດຖືກປົກປ້ອງດ້ວຍມາດຕະຖານ Firebase IAM." : "Secure authentication proxy powered by Firebase IAM services. Standard firestore data encapsulation principles are enforced automatically."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
