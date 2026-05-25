import React, { useState } from "react";
import { UserProfile } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, User, MessageCircle, ArrowLeft } from "lucide-react";
import SupportChat from "./SupportChat";
import { useLanguage } from "../contexts";

interface ProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onUpdate: (updatedProfile: UserProfile) => void;
  onLoginClick: () => void;
}

export default function ProfileModal({ userProfile, onClose, onUpdate, onLoginClick }: ProfileModalProps) {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4">
      <div className={`bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${view === 'chat' ? 'h-[600px]' : 'p-6'}`}>
        {view === "profile" ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-tiffany-600" />
                {isLao ? "ແກ້ໄຂຂໍ້ມູນສ່ວນຕົວ" : "Edit Profile"}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center mb-4">
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isLao ? "ຊື່" : "Name"}</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder={isLao ? "ຊື່ຂອງທ່ານ" : "Your name"}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{isLao ? "ວັນເດືອນປີເກີດ" : "Birthday"}</label>
                <input 
                  type="date" 
                  value={birthday}
                  onChange={e => setBirthday(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-tiffany-600 hover:bg-tiffany-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-75 shadow-sm transition cursor-pointer"
                >
                  {isSaving ? (isLao ? "ກຳລັງບັນທຶກ..." : "Saving...") : (isLao ? "ບັນທຶກຂໍ້ມູນ" : "Save Profile")}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[10px] uppercase font-bold tracking-widest">{isLao ? "ຊ່ວຍເຫຼືອ" : "Support"}</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                </div>

                <button
                  onClick={() => setView("chat")}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-indigo-500" />
                  {isLao ? "ຕິດຕໍ່ແອັດມິນ (Customer Chat)" : "Chat with Admin"}
                </button>
              </div>
            </div>
          </>
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
