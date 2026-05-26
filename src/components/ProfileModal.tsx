import React, { useState } from "react";
import { UserProfile } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, User, MessageCircle, ArrowLeft, Shield, Sparkles, CheckCircle2, Zap, AlertTriangle, CreditCard } from "lucide-react";
import SupportChat from "./SupportChat";
import { useLanguage } from "../contexts";

interface ProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onUpdate: (updatedProfile: UserProfile) => void;
  onLoginClick: () => void;
  onUpgradeClick?: () => void;
}

export default function ProfileModal({ userProfile, onClose, onUpdate, onLoginClick, onUpgradeClick }: ProfileModalProps) {
  const { isLao } = useLanguage();
  const [displayName, setDisplayName] = useState(userProfile.displayName || "");
  const [birthday, setBirthday] = useState(userProfile.birthday || "");
  const [profilePhoto, setProfilePhoto] = useState(userProfile.profilePhoto || "");
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<"profile" | "chat">("profile");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for base64 in Firestore (max doc size 1MB)
        alert("Image must be smaller than 500KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedProfile = {
        ...userProfile,
        displayName,
        birthday,
        profilePhoto,
      };

      await updateDoc(doc(db, "users", userProfile.userId), {
        displayName,
        birthday,
        profilePhoto,
      });

      onUpdate(updatedProfile);
      onClose();
    } catch (error) {
      console.error("Profile save error:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm(isLao ? "ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຍົກເລີກການສະໝັກ? ທ່ານຍັງສາມາດໃຊ້ງານໄດ້ຈົນກວ່າຈະໝົດອາຍຸ." : "Are you sure you want to cancel? You will still have access until the expiry date.")) {
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", userProfile.userId), {
        cancelAtPeriodEnd: true
      });
      onUpdate({ ...userProfile, cancelAtPeriodEnd: true });
      alert(isLao ? "ຍົກເລີກສຳເລັດ" : "Subscription canceled successfully.");
    } catch (error) {
      alert("Error: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ultra': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case 'pro': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4">
      <div className={`bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${view === 'chat' ? 'h-[600px]' : 'max-h-[90vh] p-6'}`}>
        {view === "profile" ? (
          <div className="overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-tiffany-600" />
                {isLao ? "ຂໍ້ມູນສ່ວນຕົວ ແລະ ການສະໝັກ" : "Profile & Subscription"}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-800 overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative group">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <label className="text-xs text-tiffany-600 font-bold cursor-pointer hover:underline">
                  {isLao ? "ປ່ຽນຮູບໂປຣໄຟລ໌" : "Change Photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isLao ? "ຊື່" : "Name"}</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-tiffany-500/30"
                    placeholder={isLao ? "ຊື່ຂອງທ່ານ" : "Your name"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isLao ? "ວັນເດືອນປີເກີດ" : "Birthday"}</label>
                  <input 
                    type="date" 
                    value={birthday}
                    onChange={e => setBirthday(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-tiffany-500/30"
                  />
                </div>
              </div>

              {/* Subscription Status Section */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {isLao ? "ສະຖານະການສະໝັກ" : "Subscription Status"}
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getTierColor(userProfile.subscriptionTier)}`}>
                    {userProfile.subscriptionTier} VERSION
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getTierColor(userProfile.subscriptionTier)}`}>
                    {userProfile.subscriptionTier === 'free' ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {userProfile.subscriptionTier === 'ultra' ? (isLao ? 'ອັນຕຼາ - Enterprise' : 'Ultra - Enterprise') :
                       userProfile.subscriptionTier === 'pro' ? (isLao ? 'ໂປຼ - Business' : 'Pro - Business') : (isLao ? 'ຟຼີ - Standard' : 'Free - Standard')}
                    </p>
                    {userProfile.subscriptionEnd ? (
                      <p className="text-[10px] text-slate-500">
                        {userProfile.cancelAtPeriodEnd 
                          ? (isLao ? `ຈະໝົດອາຍຸໃນວັນທີ: ${new Date(userProfile.subscriptionEnd).toLocaleDateString()}` : `Ends on: ${new Date(userProfile.subscriptionEnd).toLocaleDateString()}`)
                          : (isLao ? `ໝົດອາຍຸວັນທີ: ${new Date(userProfile.subscriptionEnd).toLocaleDateString()}` : `Expires: ${new Date(userProfile.subscriptionEnd).toLocaleDateString()}`)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500">{isLao ? "ໃຊ້ງານໄດ້ຕະຫຼອດໄປ" : "Lifetime access"}</p>
                    )}
                  </div>
                </div>

                {userProfile.subscriptionTier !== 'free' ? (
                  <div className="flex flex-col gap-2">
                    {!userProfile.cancelAtPeriodEnd ? (
                      <button 
                        onClick={handleCancelSubscription}
                        className="w-full py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {isLao ? "ຍົກເລີກການສະໝັກ (Cancel Subscription)" : "Cancel Subscription"}
                      </button>
                    ) : (
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-[10px] text-amber-800 dark:text-amber-400 font-medium leading-tight">
                          {isLao ? "ການສະໝັກຂອງທ່ານຖືກຍົກເລີກແລ້ວ ແລະ ຈະສິ້ນສຸດເມື່ອຮອດກຳນົດ." : "Subscription canceled. Access remains until expiry date."}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={onUpgradeClick}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isLao ? "ອັບເກຣດແພັກເກັດ (Upgrade Plan)" : "Upgrade My Account"}
                  </button>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-tiffany-600 hover:bg-tiffany-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-75 shadow-sm transition cursor-pointer"
                >
                  {isSaving ? (isLao ? "ກຳລັງບັນທຶກ..." : "Saving...") : (isLao ? "ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌" : "Save Changes")}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[10px] uppercase font-bold tracking-widest">{isLao ? "ຊ່ວຍເຫຼືອ" : "Support"}</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setView("chat")}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 rounded-xl text-xs shadow-xxs transition flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-indigo-500" />
                    {isLao ? "ຕິດຕໍ່ແອັດມິນ" : "Support"}
                  </button>
                  <button
                    onClick={onUpgradeClick}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 rounded-xl text-xs shadow-xxs transition flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    {isLao ? "ແພັກເກັດ" : "Pricing"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <button 
                onClick={() => setView("profile")}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-indigo-400 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                {isLao ? "ກັບຄືນ" : "Back"}
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
               <SupportChat 
                userProfile={userProfile} 
                onLoginClick={onLoginClick} 
                inline={true} 
               />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
