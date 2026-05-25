import React, { useState, useEffect } from "react";
import { UserProfile, LaoLetterDocument } from "../types";
import { db, handleFirestoreError, OperationType, auth } from "../firebase";
import { collection, getDocs, query, orderBy, getDoc, doc, where, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { ShieldCheck, X, Users, RefreshCw, KeyRound, AlertCircle, FileText, Upload, ChevronDown } from "lucide-react";

interface AdminDashboardProps {
  onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [aiTypes, setAiTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'templates' | 'aitypes' | 'bankqrs'>('requests');
  
  const [bankQrUrlPro, setBankQrUrlPro] = useState("");
  const [bankQrUrlUltra, setBankQrUrlUltra] = useState("");
  const [isSavingQr, setIsSavingQr] = useState(false);

  // Template Form
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateFile, setTemplateFile] = useState<{name: string, data: string} | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const templateFileInputRef = React.useRef<HTMLInputElement>(null);

  // AI Type Form
  const [aiTypeName, setAiTypeName] = useState("");
  const [aiTypeInstructions, setAiTypeInstructions] = useState("");
  const [aiTypeFile, setAiTypeFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const aiTypeFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSavingAiType, setIsSavingAiType] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRequests();
    fetchSettings();
    fetchTemplates();
    fetchAiTypes();
  }, []);

  const fetchAiTypes = async () => {
    try {
      const q = query(collection(db, "aitypes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const types = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setAiTypes(types);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const tmpls = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setTemplates(tmpls);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, "subscriptionRequests"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const reqs = snap.docs.map(d => d.data());
      setRequests(reqs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveRequest = async (req: any, months: number) => {
    try {
      // 1. Update Request
      await updateDoc(doc(db, "subscriptionRequests", req.id), { status: "approved" });
      
      // 2. Update User Profile
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      await updateDoc(doc(db, "users", req.userId), { 
        subscriptionTier: req.requestedTier,
        subscriptionEnd: endDate.toISOString()
      });
      
      setMessage({ type: 'success', text: "Request approved and user tier upgraded!" });
      fetchRequests();
      fetchUsers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRejectRequest = async (req: any) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      await updateDoc(doc(db, "subscriptionRequests", req.id), { 
        status: "rejected", 
        rejectionReason: reason 
      });
      setMessage({ type: 'success', text: "Request rejected." });
      fetchRequests();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, "settings", "general");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBankQrUrlPro(docSnap.data().bankQrUrlPro || docSnap.data().bankQrUrl || "");
        setBankQrUrlUltra(docSnap.data().bankQrUrlUltra || docSnap.data().bankQrUrl || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      setTemplateFile({ name: file.name, data });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !templateFile) {
      setMessage({ type: 'error', text: 'Name and file are required.' });
      return;
    }
    
    setIsUploadingTemplate(true);
    try {
      const newRef = doc(collection(db, "templates"));
      await setDoc(newRef, {
        name: templateName,
        description: templateDescription,
        fileName: templateFile.name,
        fileBase64: templateFile.data,
        createdAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: "Template added successfully." });
      setTemplateName("");
      setTemplateDescription("");
      setTemplateFile(null);
      if (templateFileInputRef.current) templateFileInputRef.current.value = "";
      fetchTemplates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setIsUploadingTemplate(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteDoc(doc(db, "templates", id));
      setMessage({ type: 'success', text: "Template deleted." });
      fetchTemplates();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAiTypeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const mimeType = file.type || data.substring(data.indexOf(":")+1, data.indexOf(";"));
      const base64Only = data.split(",")[1] || data;
      setAiTypeFile({ name: file.name, data: base64Only, mimeType });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAiType = async () => {
    if (!aiTypeName || !aiTypeInstructions) {
      setMessage({ type: 'error', text: 'Name and instructions are required.' });
      return;
    }
    
    setIsSavingAiType(true);
    try {
      const newRef = doc(collection(db, "aitypes"));
      const payload: any = {
        name: aiTypeName,
        instructions: aiTypeInstructions,
        createdAt: new Date().toISOString()
      };
      
      if (aiTypeFile) {
        payload.referenceFileName = aiTypeFile.name;
        payload.referenceFileBase64 = aiTypeFile.data;
        payload.referenceFileMimeType = aiTypeFile.mimeType;
      }
      
      await setDoc(newRef, payload);
      setMessage({ type: 'success', text: "AI Type added successfully." });
      setAiTypeName("");
      setAiTypeInstructions("");
      setAiTypeFile(null);
      if (aiTypeFileInputRef.current) aiTypeFileInputRef.current.value = "";
      fetchAiTypes();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setIsSavingAiType(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDeleteAiType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this AI type?")) return;
    try {
      await deleteDoc(doc(db, "aitypes", id));
      setMessage({ type: 'success', text: "AI Type deleted." });
      fetchAiTypes();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tier: 'pro' | 'ultra') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions
        const MAX_DIM = 400;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64String = canvas.toDataURL('image/jpeg', 0.8);
        if (tier === 'pro') setBankQrUrlPro(base64String);
        else setBankQrUrlUltra(base64String);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBankQr = async () => {
    setIsSavingQr(true);
    try {
      await setDoc(doc(db, "settings", "general"), { bankQrUrlPro, bankQrUrlUltra }, { merge: true });
      setMessage({ type: 'success', text: "Bank QR Codes saved successfully." });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "Failed to save Bank QR Codes." });
    } finally {
      setIsSavingQr(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedUsers: UserProfile[] = [];
      
      for (const docSnap of querySnapshot.docs) {
        const user = docSnap.data() as UserProfile;
        // Fetch document count
        const docsQuery = query(collection(db, "documents"), where("ownerId", "==", user.userId));
        const docsSnap = await getDocs(docsQuery);
        (user as any).docCount = docsSnap.size;
        fetchedUsers.push(user);
      }
      
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ type: 'error', text: "Failed to fetch users." });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) {
      setMessage({ type: 'error', text: "User has no email address." });
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: 'success', text: `Password reset email sent to ${email}` });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
    
    // Clear message after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdateTier = async (userId: string, newTier: 'free' | 'pro' | 'ultra') => {
    try {
      await updateDoc(doc(db, "users", userId), { subscriptionTier: newTier });
      setUsers(users.map(u => u.userId === userId ? { ...u, subscriptionTier: newTier } : u));
      setMessage({ type: 'success', text: `User tier updated to ${newTier.toUpperCase()}` });
    } catch (error: any) {
      console.error("Error updating tier:", error);
      setMessage({ type: 'error', text: `Failed to update tier: ${error.message}` });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: `User role updated to ${newRole.toUpperCase()}` });
    } catch (error: any) {
      console.error("Error updating role:", error);
      setMessage({ type: 'error', text: `Failed to update role: ${error.message}` });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-red-500" />
              LaoDoc Admin Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Superuser access panel</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Refresh Users"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900 min-h-0 space-y-6">
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
            }`}>
              {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
              {message.type === 'success' && <ShieldCheck className="w-4 h-4" />}
              {message.text}
            </div>
          )}
          
          <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <button onClick={() => setActiveTab('requests')} className={`text-sm font-bold whitespace-nowrap ${activeTab === 'requests' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>Payment Requests</button>
            <button onClick={() => setActiveTab('users')} className={`text-sm font-bold whitespace-nowrap ${activeTab === 'users' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>Registered Users</button>
            <button onClick={() => setActiveTab('templates')} className={`text-sm font-bold whitespace-nowrap ${activeTab === 'templates' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>Official Templates</button>
            <button onClick={() => setActiveTab('aitypes')} className={`text-sm font-bold whitespace-nowrap ${activeTab === 'aitypes' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>AI Doc Types</button>
            <button onClick={() => setActiveTab('bankqrs')} className={`text-sm font-bold whitespace-nowrap ${activeTab === 'bankqrs' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>Bank QRs</button>
          </div>

          {activeTab === 'bankqrs' ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-tiffany-500" />
                Bank QR Code Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Upload Bank QR Code images to display to users in the subscription modal.</p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pro Plan QR Code</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => handleFileUpload(e, 'pro')}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-tiffany-50 file:text-tiffany-700 hover:file:bg-tiffany-100 dark:file:bg-slate-800 dark:file:text-tiffany-400"
                    />
                    {bankQrUrlPro && (
                      <img src={bankQrUrlPro} alt="Pro QR Preview" className="h-10 w-10 object-cover border border-slate-200 rounded-lg" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ultra Plan QR Code</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => handleFileUpload(e, 'ultra')}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-tiffany-50 file:text-tiffany-700 hover:file:bg-tiffany-100 dark:file:bg-slate-800 dark:file:text-tiffany-400"
                    />
                    {bankQrUrlUltra && (
                      <img src={bankQrUrlUltra} alt="Ultra QR Preview" className="h-10 w-10 object-cover border border-slate-200 rounded-lg" />
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={handleSaveBankQr}
                    disabled={isSavingQr || (!bankQrUrlPro && !bankQrUrlUltra)}
                    className="bg-tiffany-600 hover:bg-tiffany-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition shadow-sm disabled:opacity-75 mt-2"
                  >
                    {isSavingQr ? 'Saving...' : 'Save QRs'}
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'aitypes' ? (
            <div className="space-y-6">
               <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                 <h3 className="font-bold text-slate-900 dark:text-white mb-4">Add AI Generation Document Type</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Type Name</label>
                     <input type="text" value={aiTypeName} onChange={(e) => setAiTypeName(e.target.value)} className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white" placeholder="e.g. ແບບຟອມໜັງສືສະເໜີ (Proposal)" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">AI Instructions / Context</label>
                     <textarea rows={4} value={aiTypeInstructions} onChange={(e) => setAiTypeInstructions(e.target.value)} className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white" placeholder="Provide system instructions to the AI on how to format this type of document..." />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Format Guide File (Optional Reference)</label>
                     <input type="file" ref={aiTypeFileInputRef} accept=".docx,.doc,.pdf" onChange={handleAiTypeFileUpload} className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-tiffany-50 file:text-tiffany-700 hover:file:bg-tiffany-100 dark:file:bg-slate-800 dark:file:text-tiffany-400" />
                     <p className="text-[10px] text-slate-500 mt-1">Upload a real formatted document so AI uses it to learn the layout exactly.</p>
                   </div>
                   <button onClick={handleSaveAiType} disabled={isSavingAiType} className="bg-tiffany-600 hover:bg-tiffany-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                     <Upload className="w-4 h-4" />
                     {isSavingAiType ? "Saving..." : "Save AI Type"}
                   </button>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-900 dark:text-white mb-4">Manage AI Document Types</h3>
                 <div className="space-y-3">
                   {aiTypes.map(type => (
                     <div key={type.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                       <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-xl flex items-center justify-center shrink-0">
                           <FileText className="text-indigo-600 dark:text-indigo-300 w-5 h-5" />
                         </div>
                         <div>
                           <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{type.name}</h4>
                           <p className="text-[10px] text-slate-500 line-clamp-1 max-w-sm">{type.instructions}</p>
                         </div>
                       </div>
                       <button onClick={() => handleDeleteAiType(type.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Delete</button>
                     </div>
                   ))}
                   {aiTypes.length === 0 && <p className="text-slate-500 text-sm italic">No AI types created yet.</p>}
                 </div>
               </div>
            </div>
          ) : activeTab === 'templates' ? (
            <div className="space-y-6">
               <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                 <h3 className="font-bold text-slate-900 dark:text-white mb-4">Add New Template</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Template Title/Name</label>
                     <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white" placeholder="e.g. ແບບຟອມໜັງສືສະເໜີ (Proposal)" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Subtitle</label>
                     <input type="text" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white" placeholder="e.g. Official Proposal Template • DOCX" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Template File (.docx)</label>
                     <input type="file" ref={templateFileInputRef} accept=".docx,.doc,.pdf" onChange={handleTemplateFileUpload} className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-tiffany-50 file:text-tiffany-700 hover:file:bg-tiffany-100 dark:file:bg-slate-800 dark:file:text-tiffany-400" />
                   </div>
                   <button onClick={handleSaveTemplate} disabled={isUploadingTemplate} className="bg-tiffany-600 hover:bg-tiffany-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                     <Upload className="w-4 h-4" />
                     {isUploadingTemplate ? "Uploading..." : "Save Template"}
                   </button>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold text-slate-900 dark:text-white mb-4">Manage Templates</h3>
                 <div className="space-y-3">
                   {templates.map(tmpl => (
                     <div key={tmpl.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                       <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-xl flex items-center justify-center shrink-0">
                           <FileText className="text-indigo-600 dark:text-indigo-300 w-5 h-5" />
                         </div>
                         <div>
                           <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{tmpl.name}</h4>
                           <p className="text-[10px] text-slate-500">{tmpl.description} • {tmpl.fileName}</p>
                         </div>
                       </div>
                       <button onClick={() => handleDeleteTemplate(tmpl.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Delete</button>
                     </div>
                   ))}
                   {templates.length === 0 && <p className="text-slate-500 text-sm italic">No templates uploaded yet.</p>}
                 </div>
               </div>
            </div>
          ) : activeTab === 'requests' ? (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-tiffany-500" />
                Subscription Requests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(req => (
                  <div key={req.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50">
                    <p className="font-bold text-slate-900 dark:text-white">Email: {req.email}</p>
                    <p className="text-xs text-slate-500">Tier: {req.requestedTier.toUpperCase()}</p>
                    <p className={`text-xs font-bold my-2 ${req.status === 'pending' ? 'text-amber-500' : req.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>STATUS: {req.status.toUpperCase()}</p>
                    
                    <a href={req.slipBase64} target="_blank" className="block my-3 underline text-blue-500 text-xs">View Slip Image</a>

                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveRequest(req, 1)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-3 py-1 rounded">Approve 1 Month</button>
                        <button onClick={() => handleApproveRequest(req, 12)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-3 py-1 rounded">Approve 1 Year</button>
                        <button onClick={() => handleRejectRequest(req)} className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-3 py-1 rounded">Reject</button>
                      </div>
                    )}
                    {req.rejectionReason && <p className="text-[10px] text-red-500 mt-2">Reason: {req.rejectionReason}</p>}
                  </div>
                ))}
                {requests.length === 0 && <p className="text-xs text-slate-500">No requests.</p>}
              </div>
            </div>
          ) : (

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Photo</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Birthday</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Docs</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-tiffany-500" />
                        <p>Loading users...</p>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No users found in database.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                            {user.profilePhoto ? (
                              <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {user.displayName || "Unknown User"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {user.birthday || "Not Set"}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {user.email || "No Email"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => handleUpdateRole(user.userId, e.target.value as 'user' | 'admin')}
                              className={`appearance-none outline-none border focus:ring-2 focus:ring-tiffany-500 rounded text-xs font-bold uppercase tracking-wider px-2 py-1 cursor-pointer pr-6 ${
                                user.role === 'admin' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30' :
                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <select
                              value={user.subscriptionTier || 'free'}
                              onChange={(e) => handleUpdateTier(user.userId, e.target.value as 'free' | 'pro' | 'ultra')}
                              className={`appearance-none outline-none border focus:ring-2 focus:ring-tiffany-500 rounded text-xs font-bold uppercase tracking-wider px-2 py-1 cursor-pointer pr-6 ${
                                user.subscriptionTier === 'ultra' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' :
                                user.subscriptionTier === 'pro' ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30' :
                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="ultra">Ultra</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                          {(user as any).docCount || 0}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {user.createdAt && (user.createdAt as any).toDate 
                            ? (user.createdAt as any).toDate().toLocaleDateString()
                            : new Date(user.createdAt || Date.now()).toLocaleDateString()
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleResetPassword(user.email)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
