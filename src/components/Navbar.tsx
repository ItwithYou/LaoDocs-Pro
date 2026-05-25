import { auth } from "../firebase";
import { UserProfile } from "../types";
import { useLanguage, useTheme } from "../contexts";
import { FileText, LogOut, Moon, Sun, Languages, User, Sparkles, ShieldCheck } from "lucide-react";

interface NavbarProps {
  userProfile: UserProfile | null;
  onUpgradeClick: () => void;
  onLogout: () => void;
  onLoginClick: () => void;
  onAdminClick?: () => void;
  onProfileClick?: () => void;
}

export default function Navbar({ userProfile, onUpgradeClick, onLogout, onLoginClick, onAdminClick, onProfileClick }: NavbarProps) {
  const { isDark, toggleDark } = useTheme();
  const { isLao, toggleLanguage } = useLanguage();
  const getBadgeStyle = (tier: string) => {
    switch (tier) {
      case "ultra":
        return "bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse";
      case "pro":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "ultra":
        return "Ultra Enterprise";
      case "pro":
        return "Business Pro";
      default:
        return "Free Plan";
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm" id="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-tiffany-500 rounded-lg flex items-center justify-center text-white shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-base sm:text-lg tracking-tight flex items-center space-x-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 truncate">LaoDocs Pro</span>
              <span className="hidden sm:inline-block text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                {isLao ? 'ໝວດເອກະສານ' : 'Document Pro'}
              </span>
            </h1>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide leading-none truncate">{isLao ? 'ລະບົບຄຸ້ມຄອງເອກະສານທາງການ' : 'Formal Document Manager'}</p>
          </div>
        </div>

        {/* User Data & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={toggleLanguage}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            title="Toggle Language"
          >
            <Languages className="w-4 h-4" />
            <span className="hidden sm:inline-block">{isLao ? 'EN' : 'ລາວ'}</span>
          </button>
          
          <button
            onClick={toggleDark}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

          {/* Subscription Badge */}
          <div className="hidden sm:flex items-center space-x-2">
            {(userProfile?.email?.toLowerCase() === "norecord88@gmail.com" || userProfile?.role === "admin") && (
              <button
                onClick={onAdminClick}
                className="flex items-center px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-full h-8 hover:bg-red-100 transition shadow-xs cursor-pointer select-none"
                title="Admin Dashboard"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Admin</span>
              </button>
            )}
            
            <div className="flex items-center px-3 py-1 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-full h-8">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${
                !userProfile ? "text-slate-600 dark:text-slate-400" :
                userProfile.subscriptionTier === "ultra" ? "text-amber-600 animate-pulse" : "text-slate-700 dark:text-slate-300"
              }`}>
                {!userProfile ? (isLao ? "ຟຣີ" : "Free") :
                 userProfile.subscriptionTier === "ultra" ? "Ultra" :
                 userProfile.subscriptionTier === "pro" ? "Pro" : (isLao ? "ຟຣີ" : "Free")}
              </span>
            </div>
            
            {(!userProfile || userProfile.subscriptionTier === "free") && (
              <button
                onClick={onUpgradeClick}
                className="text-xs bg-tiffany-500 hover:bg-tiffany-600 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition shadow-xs cursor-pointer select-none"
                id="navbar-upgrade-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLao ? 'ອັບເກຣດ' : 'Upgrade'}</span>
              </button>
            )}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

          {/* Profile Summary */}
          {userProfile ? (
            <div className="flex items-center space-x-1.5">
              <button 
                onClick={onProfileClick}
                className="w-7 h-7 rounded-full bg-tiffany-100 dark:bg-tiffany-500/20 text-tiffany-700 dark:text-tiffany-400 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-tiffany-400 transition"
                title="Edit Profile"
              >
                {userProfile.profilePhoto ? (
                  <img src={userProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={onLogout}
                className="w-7 h-7 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-500 transition cursor-pointer"
                title={isLao ? "ອອກຈາກລະບົບ" : "Log out"}
                id="navbar-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={onLoginClick}
                className="text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer select-none flex items-center space-x-2"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="hidden sm:inline">{isLao ? "ເຂົ້າສູ່ລະບົບ (Google)" : "Sign In with Google"}</span>
                <span className="sm:hidden">{isLao ? "ເຂົ້າສູ່ລະບົບ" : "Sign In"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
