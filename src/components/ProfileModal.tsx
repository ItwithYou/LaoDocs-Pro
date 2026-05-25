import React, { useState } from "react";
import { UserProfile } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, User } from "lucide-react";

interface ProfileModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export default function ProfileModal({ userProfile, onClose, onUpdate }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(userProfile.displayName || "");
  const [birthday, setBirthday] = useState(userProfile.birthday || "");
  const [profilePhoto, setProfilePhoto] = useState(userProfile.profilePhoto || "");
  const [isSaving, setIsSaving] = useState(false);

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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-tiffany-600" />
            Edit Profile
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-slate-100 overflow-hidden mb-2 bg-slate-100 flex items-center justify-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <label className="text-xs text-tiffany-600 font-bold cursor-pointer hover:underline">
              Change Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Birthday</label>
            <input 
              type="date" 
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-tiffany-600 hover:bg-tiffany-700 text-white font-bold py-2.5 rounded-lg mt-4 disabled:opacity-75 shadow-sm transition"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
