import { loginWithGoogle } from "../firebase";
import { useState } from "react";
import { FileText, ShieldCheck, Languages, X, CheckSquare } from "lucide-react";
import { useLanguage } from "../contexts";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { isLao } = useLanguage();

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.error("Auth modal Google login failure", err);
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes('popup') || msg.includes('cross-origin') || msg.includes('opener')) {
        setErrorMsg(
          isLao
            ? "ກະລຸນາເປີດແອັບໃນໜ້າຕ່າງໃໝ່ (New Tab) ໂດຍຄຣິກປຸ່ມຢູ່ມຸມຂວາເທິງ ເພື່ອເຂົ້າສູ່ລະບົບ."
            : "Please open the app in a new tab using the top-right button to sign in. Popups are blocked here."
        );
      } else {
        setErrorMsg(
          isLao
            ? "ເຂົ້າສູ່ລະບົບລົ້ມເຫຼວ. ລອງເປີດແອັບໃນແຖບໃໝ່ (ປຸ່ມມຸມຂວາເທິງ). ຖ້າຍັງບັນຫາເກີດຂຶ້ນ, ອາດຈະຕ້ອງເພີ່ມໂດເມນເຂົ້າໃນ Firebase Authorized Domains."
            : "Login failed. Try opening the app in a new tab (top right). If it still fails, the app URL might need to be added to Firebase Authorized Domains."
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" id="auth-modal-overlay">
      <div 
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all flex flex-col md:flex-row md:min-h-[460px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Brand Panel (Visible on md+) */}
        <div className="hidden md:flex md:w-5/12 bg-slate-950 p-6 flex-col justify-between text-white relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-radial-gradient from-slate-900 via-slate-950 to-black opacity-8 w-full h-full" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-tiffany-500 rounded-lg flex items-center justify-center text-white shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <span className="font-sans font-black text-xs tracking-wider uppercase text-tiffany-400">LaoDoc Pro</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-white leading-snug">
                {isLao ? "ລະບົບແປງເອກະສານມາດຕະຖານ" : "Standard Document Suite"}
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isLao 
                  ? "ເຂົ້າໃຊ້ເພື່ອເກັບຮັກສາເອກະສານ, ຈັດໝວດໝູ່, ຕິດຕາມປະຫວັດ ແລະ ປົດລັອກໂຄຕ້າ OCR ເພີ່ມເຕີມ." 
                  : "Sign in to securely store documents, track historical logs, and unlock higher OCR character quotas."}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium">
                <CheckSquare className="w-3.5 h-3.5 text-tiffany-400 shrink-0" />
                <span>{isLao ? "ຕູ້ເກັບເອກະສານປອດໄພ" : "Secure Archive Cabinet"}</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-tiffany-400 shrink-0" />
                <span>{isLao ? "ຖືກຕ້ອງຕາມມາດຕະຖານ" : "Formal Compliance"}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-[9px] text-slate-550 font-mono">
            SECURED PORTAL © 2026
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between items-center relative">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-full my-auto text-center space-y-6">
            <div className="space-y-1.5">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] bg-tiffany-50 dark:bg-tiffany-500/10 text-tiffany-700 dark:text-tiffany-450 font-mono font-bold uppercase tracking-wider">
                {isLao ? "ປະຕູຄວາມປອດໄພ" : "SECURE ENTRY"}
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isLao ? "ເຂົ້າສູ່ລະບົບ / ລົງທະບຽນ" : "Sign In or Sign Up"}
              </h2>
              <p className="text-[11px] text-slate-550 dark:text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                {isLao 
                  ? "ກະລຸນາໃຊ້ບັນຊີ Google ເພື່ອເຂົ້າສູ່ລະບົບພາຍໃນປະເທດຢ່າງປອດໄພ." 
                  : "Please use your secure Google account to verify your enterprise identity."}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-55 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-[11px] text-red-650 dark:text-red-400 text-left font-medium leading-relaxed">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-sm active:scale-98 disabled:opacity-75"
              >
                {isLoggingIn ? (
                  <div className="w-4.5 h-4.5 border-2 border-slate-350 border-t-slate-900 dark:border-white/35 dark:border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.19-5.136 4.19A5.727 5.727 0 018.21 12.87a5.727 5.727 0 015.781-5.72c1.478 0 2.822.567 3.84 1.493l2.883-2.883C18.84 3.945 16.53 3 13.992 3 8.356 3 3.8 7.556 3.8 13.193c0 5.637 4.557 10.193 10.193 10.193 6.96 0 10.749-4.852 10.22-10.285H12.24z"/>
                    </svg>
                    <span>{isLao ? "ເຂົ້າສູ່ລະບົບດ້ວຍ Google" : "Continue with Google"}</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-xl text-[11px] transition cursor-pointer"
              >
                {isLao ? "ສືບຕໍ່ໃຊ້ງານແບບແຂກ" : "Continue as Guest"}
              </button>
            </div>
          </div>

          <div className="w-full text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 text-center mt-4">
            {isLao 
              ? "ເຊື່ອມຕໍ່ລະບົບໄຟລ໌ຄວາມປອດໄພດ້ວຍ Firebase IAM" 
              : "Standard secure IAM credential proxies enforced."}
          </div>
        </div>
      </div>
    </div>
  );
}
