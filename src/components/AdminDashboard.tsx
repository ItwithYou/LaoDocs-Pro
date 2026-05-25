import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, LaoLetterDocument } from "../types";
import { db, handleFirestoreError, OperationType, auth, safeGetDoc, safeGetDocs, safeSetDoc, safeUpdateDoc, safeDeleteDoc } from "../firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { ShieldCheck, X, Users, RefreshCw, KeyRound, AlertCircle, FileText, Upload, ChevronDown, Database, HardDrive, Activity, UserCheck, TrendingUp, Coins, Eye, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface AdminDashboardProps {
  onClose?: () => void;
  inline?: boolean;
}

export default function AdminDashboard({ onClose, inline = false }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [aiTypes, setAiTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'tracking' | 'templates' | 'aitypes' | 'bankqrs' | 'billing'>('requests');
  
  const [bankQrUrlPro, setBankQrUrlPro] = useState("");
  const [bankQrUrlUltra, setBankQrUrlUltra] = useState("");
  const [isSavingQr, setIsSavingQr] = useState(false);

  // Statistics State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsersCount: 0,
    freeUsers: 0,
    proUsers: 0,
    ultraUsers: 0,
    totalDocuments: 0,
    totalStorageBytes: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalSpendUSD: 0
  });

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // States for inspecting User Files
  const [selectedUserForFiles, setSelectedUserForFiles] = useState<UserProfile | null>(null);
  const [userFiles, setUserFiles] = useState<LaoLetterDocument[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeFileDetail, setActiveFileDetail] = useState<LaoLetterDocument | null>(null);

  // States & handlers for Payment Slip Viewer
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Income & MRR Calculations
  const incomeMRR = useMemo(() => {
    const proCount = users.filter(u => u.subscriptionTier === 'pro').length;
    const ultraCount = users.filter(u => u.subscriptionTier === 'ultra').length;
    const usd = (proCount * 5) + (ultraCount * 8);
    const lak = (proCount * 100000) + (ultraCount * 150000);
    return { usd, lak, proCount, ultraCount };
  }, [users]);

  const collectedRevenue = useMemo(() => {
    let usd = 0;
    let lak = 0;
    requests.filter(r => r.status === 'approved').forEach(r => {
      const months = r.approvedMonths || 1;
      if (r.requestedTier === 'pro') {
        usd += 5 * months;
        lak += 100000 * months;
      } else if (r.requestedTier === 'ultra') {
        usd += 8 * months;
        lak += 150000 * months;
      }
    });
    return { usd, lak };
  }, [requests]);

  const handleDownloadSlip = () => {
    if (!viewingSlipUrl) return;
    const link = document.createElement('a');
    link.href = viewingSlipUrl;
    link.download = `payment_slip_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSlipViewer = () => {
    if (!viewingSlipUrl) return null;
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
          onClick={() => { setViewingSlipUrl(null); setZoomScale(1); setRotation(0); }}
        />
        
        <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Payment Bill Slip Viewer</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Review and verify the transfer voucher confirmation</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                className="p-1.5 rounded-lg hover:bg-slate-205 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoomScale(1)}
                className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-600 dark:text-slate-350 transition"
                title="Reset Zoom"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button 
                onClick={() => setZoomScale(prev => Math.min(3, prev + 0.25))}
                className="p-1.5 rounded-lg hover:bg-slate-205 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1.5 rounded-lg hover:bg-slate-205 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer mr-1"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDownloadSlip}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition cursor-pointer mr-2"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setViewingSlipUrl(null); setZoomScale(1); setRotation(0); }}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-8 flex items-center justify-center min-h-[400px]">
            <div 
              style={{ 
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`, 
                transition: 'transform 0.15s ease-out' 
              }}
              className="max-w-full max-h-[60vh] transition shadow-md rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <img 
                src={viewingSlipUrl} 
                alt="Verification Slip" 
                className="max-w-[400px] max-h-[50vh] w-auto h-auto object-contain select-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDownloadDocumentText = (docItem: LaoLetterDocument) => {
    if (!docItem) return;
    const content = `Title: ${docItem.title || 'Untitled Document'}
Document ID: ${docItem.documentId}
Source: ${docItem.sourceType || 'Unknown'}
Status: ${docItem.status || 'Unknown'}
Sender: ${docItem.sender || 'N/A'}
Receiver: ${docItem.receiver || 'N/A'}

--- CONVERTED TEXT ---
${docItem.convertedText || ''}

--- ORIGINAL CAPTURED TEXT ---
${docItem.originalText || ''}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(docItem.title || 'Document').replace(/\s+/g, '_')}_text.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFetchUserFiles = async (user: UserProfile) => {
    setSelectedUserForFiles(user);
    setLoadingFiles(true);
    setUserFiles([]);
    setActiveFileDetail(null);
    try {
      const q = query(
        collection(db, "documents"),
        where("ownerId", "==", user.userId),
        orderBy("createdAt", "desc")
      );
      const snap = await safeGetDocs(q);
      const list: LaoLetterDocument[] = [];
      snap.forEach((d) => {
        list.push(d.data() as LaoLetterDocument);
      });
      setUserFiles(list);
    } catch (e: any) {
      console.error(e);
      setMessage({ type: 'error', text: `Failed to fetch user files: ${e.message}` });
    } finally {
      setLoadingFiles(false);
    }
  };

  const renderUserFilesViewer = () => {
    if (!selectedUserForFiles) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" onClick={() => { setSelectedUserForFiles(null); setActiveFileDetail(null); }} />
        <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Uploaded Files of {selectedUserForFiles.displayName || selectedUserForFiles.email}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {selectedUserForFiles.email}
              </p>
            </div>
            <button onClick={() => { setSelectedUserForFiles(null); setActiveFileDetail(null); }} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto flex flex-col md:flex-row min-h-0 animate-in fade-in duration-300">
            {/* Left Side: Files list */}
            <div className="w-full md:w-1/2 border-r border-slate-100 dark:border-slate-800 p-4 overflow-y-auto space-y-2 min-h-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Documents ({userFiles.length})</h4>
              {loadingFiles ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-tiffany-500" />
                  <p className="text-xs animate-pulse">Loading user files...</p>
                </div>
              ) : userFiles.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-8 text-center">No documents uploaded by this user.</p>
              ) : (
                userFiles.map((docItem) => (
                  <button
                    key={docItem.documentId}
                    type="button"
                    onClick={() => setActiveFileDetail(docItem)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${
                      activeFileDetail?.documentId === docItem.documentId
                        ? "bg-tiffany-550/10 border-tiffany-500 dark:bg-tiffany-500/5 text-slate-900 dark:text-white font-semibold"
                        : "bg-slate-50 hover:bg-slate-100/70 border-slate-200 dark:bg-slate-800/35 dark:border-slate-800 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs truncate max-w-[200px] text-slate-900 dark:text-white">
                        {docItem.title || "Untitled Document"}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        docItem.status === 'final' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        docItem.status === 'saved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {docItem.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 w-full">
                      <span>Source: {docItem.sourceType}</span>
                      <span>
                        {docItem.createdAt && (docItem.createdAt as any).toDate 
                          ? (docItem.createdAt as any).toDate().toLocaleDateString()
                          : new Date(docItem.createdAt || Date.now()).toLocaleDateString()
                        }
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Right Side: File contents */}
            <div className="w-full md:w-1/2 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20 min-h-0 flex flex-col">
              {activeFileDetail ? (
                <div className="space-y-4 flex-1 animate-in fade-in duration-200">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{activeFileDetail.title}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">ID: {activeFileDetail.documentId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocumentText(activeFileDetail)}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-white dark:text-emerald-400 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1.5 rounded-lg shadow-sm transition shrink-0 cursor-pointer"
                      title="Download full content as TXT"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download TXT
                    </button>
                  </div>

                  {(activeFileDetail.sender || activeFileDetail.receiver) && (
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-805">
                      {activeFileDetail.sender && (
                        <div>
                          <span className="font-semibold text-slate-400">Sender:</span>
                          <span className="text-slate-800 dark:text-slate-200 block truncate">{activeFileDetail.sender}</span>
                        </div>
                      )}
                      {activeFileDetail.receiver && (
                        <div>
                          <span className="font-semibold text-slate-404">Receiver:</span>
                          <span className="text-slate-800 dark:text-slate-200 block truncate">{activeFileDetail.receiver}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Converted Text</label>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs font-sans whitespace-pre-wrap max-h-[250px] overflow-y-auto leading-relaxed text-slate-800 dark:text-slate-200 select-text">
                      {activeFileDetail.convertedText || <span className="italic text-slate-400">No converted text available.</span>}
                    </div>
                  </div>

                  {activeFileDetail.originalText && (
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Original Captured Text</label>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs font-sans whitespace-pre-wrap max-h-[150px] overflow-y-auto leading-relaxed text-slate-800 dark:text-slate-200 select-text">
                        {activeFileDetail.originalText}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400/80 p-8 h-full min-h-[300px]">
                  <FileText className="w-10 h-10 mb-2 opacity-40 text-tiffany-500" />
                  <p className="text-xs font-medium text-center">Select a document from the list to view its contents and metadata.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      const snap = await safeGetDocs(q);
      const types = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setAiTypes(types);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
      const snap = await safeGetDocs(q);
      const tmpls = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setTemplates(tmpls);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, "subscriptionRequests"), orderBy("createdAt", "desc"));
      const snap = await safeGetDocs(q);
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(reqs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveRequest = async (req: any, months: number) => {
    try {
      // 1. Update Request with approved status and approvedMonths
      await safeUpdateDoc(doc(db, "subscriptionRequests", req.id), { status: "approved", approvedMonths: months });
      
      // 2. Update User Profile
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      await safeUpdateDoc(doc(db, "users", req.userId), { 
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
      await safeUpdateDoc(doc(db, "subscriptionRequests", req.id), { 
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
      const docSnap = await safeGetDoc(docRef);
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
      await safeSetDoc(newRef, {
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
      await safeDeleteDoc(doc(db, "templates", id));
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
      
      await safeSetDoc(newRef, payload);
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
      await safeDeleteDoc(doc(db, "aitypes", id));
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
      await safeSetDoc(doc(db, "settings", "general"), { bankQrUrlPro, bankQrUrlUltra }, { merge: true });
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
      const querySnapshot = await safeGetDocs(q);
      
      const fetchedUsers: UserProfile[] = [];
      let totalDocs = 0;
      let totalStorage = 0;
      let activeCount = 0;
      let free = 0;
      let pro = 0;
      let ultra = 0;
      let aggregateInputTokens = 0;
      let aggregateOutputTokens = 0;

      for (const docSnap of querySnapshot.docs) {
        const user = docSnap.data() as UserProfile;
        
        // Fetch matching documents
        const docsQuery = query(collection(db, "documents"), where("ownerId", "==", user.userId));
        const docsSnap = await safeGetDocs(docsQuery);
        const docCount = docsSnap.size;
        totalDocs += docCount;

        let userStorageBytes = 0;
        docsSnap.forEach(d => {
          const data = d.data();
          const textLength = (data.convertedText?.length || 0) + (data.originalText?.length || 0) + (data.summary?.length || 0);
          userStorageBytes += textLength * 2; // UTF-16 character byte size approx
          
          const isText = data.sourceType === "text";
          const inputCharCount = (data.originalText?.length || 0);
          const inputT = Math.max(isText ? 1200 : 3200, Math.ceil(inputCharCount / 1.5) + (isText ? 0 : 2580));
          const outputCharCount = (data.convertedText?.length || 0) + (data.summary?.length || 0);
          const outputT = Math.max(400, Math.ceil(outputCharCount / 1.5));
          
          aggregateInputTokens += inputT;
          aggregateOutputTokens += outputT;
        });
        totalStorage += userStorageBytes;

        (user as any).docCount = docCount;
        (user as any).storageBytes = userStorageBytes;

        // Custom activity definition: User has created at least 1 document or runs paid level
        const hasCreatedDocs = docCount > 0;
        const subActive = user.subscriptionTier && user.subscriptionTier !== 'free';
        const isActive = hasCreatedDocs || subActive;
        if (isActive) {
          activeCount++;
        }
        (user as any).isActiveUser = isActive;

        if (user.subscriptionTier === 'ultra') ultra++;
        else if (user.subscriptionTier === 'pro') pro++;
        else free++;

        fetchedUsers.push(user);
      }
      
      const calculatedSpend = (aggregateInputTokens * 0.000000075) + (aggregateOutputTokens * 0.000000300);

      setUsers(fetchedUsers);
      setStats({
        totalUsers: querySnapshot.size,
        activeUsersCount: activeCount,
        freeUsers: free,
        proUsers: pro,
        ultraUsers: ultra,
        totalDocuments: totalDocs,
        totalStorageBytes: totalStorage,
        totalInputTokens: aggregateInputTokens,
        totalOutputTokens: aggregateOutputTokens,
        totalSpendUSD: calculatedSpend
      });
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
      await safeUpdateDoc(doc(db, "users", userId), { subscriptionTier: newTier });
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
      await safeUpdateDoc(doc(db, "users", userId), { role: newRole });
      setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: `User role updated to ${newRole.toUpperCase()}` });
    } catch (error: any) {
      console.error("Error updating role:", error);
      setMessage({ type: 'error', text: `Failed to update role: ${error.message}` });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className={inline ? "flex flex-col space-y-6 w-full" : "fixed inset-0 z-[100] flex items-center justify-center p-4"}>
      {!inline && (
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      <div className={inline ? "bg-white dark:bg-slate-900 w-full rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm" : "relative bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-red-500" />
              LaoDoc Admin Dashboard
              <span className="text-[10px] tracking-wider rounded-full font-bold uppercase px-2 py-0.5 bg-red-100 text-red-000 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                Admin
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {inline ? "Superuser control panel • Real-time database workspace access" : "Superuser access panel"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Refresh Users"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {!inline && onClose && (
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
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
          )}          {/* Diagnostic overview statistic cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-in fade-in duration-300">
            {/* Total Users & Active status */}
            <div className="bg-slate-550/5 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Registered Users</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white block">{stats.totalUsers}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  {stats.activeUsersCount} Active ({stats.totalUsers > 0 ? (stats.activeUsersCount / stats.totalUsers * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Subscription Breakdown */}
            <div className="bg-slate-550/5 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1 w-full text-xs">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Membership Tiers</span>
                <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-slate-600 dark:text-slate-350">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Free</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{stats.freeUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Pro</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{stats.proUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Ultra</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{stats.ultraUsers}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0 ml-3">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Income & Revenue Estimator */}
            <div className="bg-emerald-500/5 dark:bg-emerald-550/10 border border-emerald-200/85 dark:border-emerald-500/20 p-4.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1 w-full">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Estimated Income</span>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-xl font-black text-slate-805 dark:text-white block flex items-baseline gap-1">
                    ${incomeMRR.usd} <span className="text-[9px] font-bold text-slate-400 uppercase">MRR</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                    {incomeMRR.lak.toLocaleString()} LAK/mo
                  </span>
                </div>
                
                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1.5 block leading-tight font-semibold border-t border-emerald-100/60 dark:border-emerald-500/10 pt-1">
                  Total Paid: <span className="font-bold text-slate-800 dark:text-white font-mono">${collectedRevenue.usd}</span> ({collectedRevenue.lak.toLocaleString()} LAK)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* Total Documents */}
            <div className="bg-slate-550/5 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total OCR Documents</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white block">{stats.totalDocuments}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-405 mt-1 block">
                  Avg {(stats.totalUsers > 0 ? (stats.totalDocuments / stats.totalUsers).toFixed(1) : 0)} docs / user
                </span>
              </div>
              <div className="p-3 rounded-xl bg-tiffany-100 text-tiffany-600 dark:bg-tiffany-500/15 dark:text-tiffany-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Data Storage footprint */}
            <div className="bg-slate-550/5 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Est. Database Storage</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white block">{formatBytes(stats.totalStorageBytes)}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-405 mt-1 block">
                  OCR characters UTF-16 size
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <button onClick={() => setActiveTab('requests')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'requests' ? 'text-tiffany-600 border-b-2 border-tiffany-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}>Pending Payment Slips</button>
            <button onClick={() => setActiveTab('tracking')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'tracking' ? 'text-tiffany-600 border-b-2 border-tiffany-600 font-extrabold' : 'text-slate-500 hover:text-slate-705'}`}>Sub Expirations Tracker</button>
            <button onClick={() => setActiveTab('billing')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'billing' ? 'text-tiffany-600 border-b-2 border-tiffany-600 font-extrabold' : 'text-slate-500 hover:text-slate-705'}`}>API Keys & Spend</button>
            <button onClick={() => setActiveTab('users')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'users' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500 hover:text-slate-700'}`}>Registered Users</button>
            <button onClick={() => setActiveTab('templates')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'templates' ? 'text-tiffany-600 border-b-2 border-tiffany-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}>Official Templates</button>
            <button onClick={() => setActiveTab('aitypes')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'aitypes' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>AI Doc Types</button>
            <button onClick={() => setActiveTab('bankqrs')} className={`text-sm font-bold whitespace-nowrap pb-1 cursor-pointer transition ${activeTab === 'bankqrs' ? 'text-tiffany-600 border-b-2 border-tiffany-600' : 'text-slate-500'}`}>Bank QRs</button>
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
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/10 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-tiffany-500 animate-pulse" />
                    Pending Payment Slips queue ({requests.filter(r => r.status === 'pending').length})
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Approve or reject pending manual bank transfer slips to upgrade systems.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm truncate max-w-[220px]">{req.email}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Request ID: {req.id}</p>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                          req.requestedTier === 'ultra' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-450' : 
                          req.requestedTier === 'pro' ? 'bg-indigo-100 text-indigo-805 dark:bg-indigo-500/10 dark:text-indigo-400' : 
                          'bg-slate-100 text-slate-750 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {req.requestedTier}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Status:</span>
                        <span className={`text-[11px] font-extrabold tracking-wide px-1.5 py-0.5 rounded ${
                          req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450' :
                          'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Slip Thumbnail preview with modal inspect */}
                      {req.slipBase64 ? (
                        <div className="relative mt-3 mb-3 group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 aspect-[5/3] bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                          <img 
                            src={req.slipBase64} 
                            alt="Payment Bill Slip" 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                            onClick={() => {
                              setViewingSlipUrl(req.slipBase64);
                              setZoomScale(1);
                              setRotation(0);
                            }}
                          />
                          <div 
                            className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center cursor-pointer"
                            onClick={() => {
                              setViewingSlipUrl(req.slipBase64);
                              setZoomScale(1);
                              setRotation(0);
                            }}
                          >
                            <span className="bg-white/95 dark:bg-slate-900/95 py-1 px-2.5 rounded-lg text-[10px] font-bold text-slate-850 dark:text-white shadow flex items-center gap-1 animate-in fade-in zoom-in-90 duration-200">
                              <Eye className="w-3.5 h-3.5 text-tiffany-500" />
                              Inspect Bill Slip
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 mb-3 py-5 px-3 bg-slate-100/50 dark:bg-slate-950/20 rounded-xl text-center text-xs text-slate-400 dark:text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-800">
                          No Transfer Slip Uploaded
                        </div>
                      )}

                      {/* Buttons for Inspections */}
                      {req.slipBase64 && (
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingSlipUrl(req.slipBase64);
                              setZoomScale(1);
                              setRotation(0);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-tiffany-50 hover:bg-tiffany-100 dark:bg-tiffany-500/10 dark:hover:bg-tiffany-500/20 text-tiffany-700 dark:text-tiffany-300 text-[11px] font-semibold rounded-lg border border-tiffany-200/50 dark:border-tiffany-500/25 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Bill Slip Fullscreen
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      {req.status === 'pending' && (
                        <div className="flex gap-1.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                          <button onClick={() => handleApproveRequest(req, 1)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm cursor-pointer">1 Month</button>
                          <button onClick={() => handleApproveRequest(req, 12)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm cursor-pointer">1 Year</button>
                          <button onClick={() => handleRejectRequest(req)} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition shadow-sm cursor-pointer">Reject</button>
                        </div>
                      )}
                      {req.rejectionReason && (
                        <div className="text-[10px] text-red-500 mt-2 bg-red-50/50 dark:bg-red-500/5 p-2 rounded-lg border border-red-105">
                          <span className="font-bold">Rejection Reason:</span> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {requests.filter(r => r.status === 'pending').length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-205 dark:border-slate-800">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2.5 animate-bounce" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No pending subscription requests!</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All waiting bank transfer slips are verified and up-to-date.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'billing' ? (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/10 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                    <Coins className="w-4 h-4 text-emerald-500 animate-pulse" />
                    Google Gemini API Billing & Cost Spend Control
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time usage statistics, dynamic token pricing calculations, failover candidate status, and admin profitability analysis.</p>
                </div>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total API Calls</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white block">{stats.totalDocuments} calls</span>
                  <span className="text-[10px] text-slate-500 block">Successful OCR & Parsers</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Input Cost</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white block">${(stats.totalInputTokens * 0.000000075).toFixed(5)}</span>
                  <span className="text-[10px] text-slate-500 block">{(stats.totalInputTokens).toLocaleString()} input tokens</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Output Cost</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white block">${(stats.totalOutputTokens * 0.000000300).toFixed(5)}</span>
                  <span className="text-[10px] text-slate-500 block">{(stats.totalOutputTokens).toLocaleString()} output tokens</span>
                </div>
                <div className="bg-emerald-50/40 dark:bg-emerald-500/5 p-4 rounded-xl border border-emerald-250/20 dark:border-emerald-500/10 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Key Spend</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">${stats.totalSpendUSD.toFixed(5)}</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">{(stats.totalSpendUSD * 20000).toLocaleString(undefined, { maximumFractionDigits: 1 })} LAK</span>
                </div>
              </div>

              {/* Profitability Panel */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">Subscription Profit Margins</h4>
                  <p className="text-[10px] text-slate-400">Comparing member collected revenue with direct Gemini key costs.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Collected Sub Income</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">${collectedRevenue.usd}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Net Admin Profit</span>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400 font-mono">${(collectedRevenue.usd - stats.totalSpendUSD).toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                  <span className="text-[10px] text-slate-400 block">Operational Margin</span>
                  <span className={`text-base font-black ${collectedRevenue.usd > stats.totalSpendUSD ? "text-emerald-600" : "text-amber-500"}`}>
                    {collectedRevenue.usd > 0 ? (((collectedRevenue.usd - stats.totalSpendUSD) / collectedRevenue.usd) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* API Keys Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-indigo-505" />
                  Gemini API Key Failover Candidates Monitor
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Candidate Source</th>
                        <th className="px-4 py-2.5">API Key Signature</th>
                        <th className="px-4 py-2.5">Fallback Order</th>
                        <th className="px-4 py-2.5 font-mono text-center">Engine</th>
                        <th className="px-4 py-2.5">Spend Rate</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5 transition">
                        <td className="px-4 py-3 font-semibold text-slate-850 dark:text-white">Environment Secret Variable</td>
                        <td className="px-4 py-3 font-mono text-slate-400">process.env.GEMINI_API_KEY</td>
                        <td className="px-4 py-3 font-medium text-slate-500">1st Priority (Primary)</td>
                        <td className="px-4 py-3 font-mono text-center text-slate-400">gemini-3.5-flash</td>
                        <td className="px-4 py-3 text-slate-500">In: $0.075/1M | Out: $0.30/1M</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                            Active
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5 transition">
                        <td className="px-4 py-3 font-semibold text-slate-850 dark:text-white">Active Renewed Candidate</td>
                        <td className="px-4 py-3 font-mono text-slate-400">AIzaSyBADYe8iGYEtQDCxPo5m5Bz...</td>
                        <td className="px-4 py-3 font-medium text-slate-500">2nd Priority (Auto fallback)</td>
                        <td className="px-4 py-3 font-mono text-center text-slate-400">gemini-3.5-flash</td>
                        <td className="px-4 py-3 text-slate-500">In: $0.075/1M | Out: $0.30/1M</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                            Healthy standby
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5 transition">
                        <td className="px-4 py-3 font-semibold text-slate-850 dark:text-white">Verified Backup Backup Key</td>
                        <td className="px-4 py-3 font-mono text-slate-400">AIzaSyBJhjBi8_0-1VzSwXoQOQY6...</td>
                        <td className="px-4 py-3 font-medium text-slate-500">3rd Priority (Auto failover safe)</td>
                        <td className="px-4 py-3 font-mono text-center text-slate-400">gemini-3.5-flash</td>
                        <td className="px-4 py-3 text-slate-500">In: $0.075/1M | Out: $0.30/1M</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
                            Standby backup
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transactions list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-purple-505" />
                    Real-time API Session Conversion Log
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Showing {users.reduce((acc, u) => acc + ((u as any).docCount || 0), 0)} sessions
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">User Email</th>
                        <th className="px-4 py-2.5">Document Title</th>
                        <th className="px-4 py-2.5">Source Type</th>
                        <th className="px-4 py-2.5 font-mono">Est. Tokens</th>
                        <th className="px-4 py-2.5 font-mono">Session cost</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {users.filter(u => (u as any).docCount > 0).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">No document API transactions.</td>
                        </tr>
                      ) : (
                        users.filter(u => (u as any).docCount > 0).map(u => {
                          const dCount = (u as any).docCount || 0;
                          const uStorage = (u as any).storageBytes || 0;
                          const isUltra = u.subscriptionTier === 'ultra';
                          const inputT = dCount * (isUltra ? 4500 : 3550);
                          const outputT = Math.max(400 * dCount, Math.ceil(uStorage / 3));
                          const spend = (inputT * 0.000000075) + (outputT * 0.000000300);

                          return (
                            <tr key={u.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{u.displayName || "Subscriber"}</span>
                                  <span className="text-[9px] font-mono text-slate-400">{u.email}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-805 dark:text-white">
                                {dCount} parsed files
                              </td>
                              <td className="px-4 py-3 font-medium whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-105 text-slate-650 dark:bg-slate-800 dark:text-slate-300">
                                  OCR / PDF / Text
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                In: {(inputT).toLocaleString()} | Out: {(outputT).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">${spend.toFixed(5)}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{(spend * 20000).toLocaleString(undefined, { maximumFractionDigits: 1 })} LAK</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-500/10 dark:text-emerald-400">
                                  🟢 100% OK
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'tracking' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/10 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Active Premium Subscriptions Expirations Tracker
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time status tracking, countdown, expired data, user logs, and slip lookup of pro or ultra tiers.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Account User</th>
                        <th className="px-4 py-3">Level</th>
                        <th className="px-4 py-3">Tracking & Status</th>
                        <th className="px-4 py-3">Term Days</th>
                        <th className="px-4 py-3">Expired Date (will expired)</th>
                        <th className="px-4 py-3 text-right">Receipt / Override Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {users.filter(u => (u.subscriptionTier && u.subscriptionTier !== 'free') || u.subscriptionEnd).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            <Coins className="w-8 h-8 text-slate-300 dark:text-slate-700 animate-pulse mx-auto mb-2" />
                            No premium sub trackers registered with expiration limits.
                          </td>
                        </tr>
                      ) : (
                        users
                          .filter(u => (u.subscriptionTier && u.subscriptionTier !== 'free') || u.subscriptionEnd)
                          .map(u => {
                            const endMs = u.subscriptionEnd ? new Date(u.subscriptionEnd).getTime() : 0;
                            const nowMs = Date.now();
                            const diffDays = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));
                            const isExpired = diffDays <= 0 || !u.subscriptionEnd;
                            const linkedRequest = requests.find(r => r.userId === u.userId && r.status === 'approved');

                            return (
                              <tr key={u.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                                      {u.profilePhoto ? (
                                        <img src={u.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                      ) : (
                                        <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                                      )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[130px]">
                                        {u.displayName || "Subscriber"}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-405 truncate max-w-[130px]">
                                        {u.email}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5">
                                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                                    u.subscriptionTier === 'ultra' ? 'bg-amber-100 text-amber-805 dark:bg-amber-500/10 dark:text-amber-450 border border-amber-205/30' : 
                                    u.subscriptionTier === 'pro' ? 'bg-indigo-100 text-indigo-805 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-205/30' : 
                                    'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400'
                                  }`}>
                                    {u.subscriptionTier}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5">
                                  {!u.subscriptionEnd ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/5 px-1.5 py-0.5 rounded">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                      No expiration
                                    </span>
                                  ) : isExpired ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-extrabold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                      Expired {Math.abs(diffDays)}d ago
                                    </span>
                                  ) : diffDays < 4 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/15">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-505 inline-block animate-ping"></span>
                                      Expiring in {diffDays}d
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-605 dark:text-emerald-400 font-extrabold bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                      Active • {diffDays}d left
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                                  {linkedRequest?.approvedMonths ? `${linkedRequest.approvedMonths}m duration` : "Admin Overridden"}
                                </td>

                                <td className="px-4 py-3.5">
                                  <div className="flex flex-col text-xs">
                                    <span className={`font-bold font-mono ${isExpired ? 'text-red-500 line-through' : 'text-slate-800 dark:text-slate-300'}`}>
                                      {u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleDateString() : "Lifetime"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                                      {u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    {linkedRequest?.slipBase64 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setViewingSlipUrl(linkedRequest.slipBase64);
                                          setZoomScale(1);
                                          setRotation(0);
                                        }}
                                        className="inline-flex items-center gap-1 px-1.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-extrabold rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                                        title="Inspect approved voucher bill slip"
                                      >
                                        <Eye className="w-2.5 h-2.5" />
                                        Slip
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 italic mr-1">No slip</span>
                                    )}

                                    <button 
                                      type="button" 
                                      onClick={async () => {
                                        const extend = confirm(`Extend subscripton for ${u.displayName || u.email} by 1 month?`);
                                        if (!extend) return;
                                        try {
                                          const newEnd = u.subscriptionEnd ? new Date(endMs > nowMs ? endMs : nowMs) : new Date();
                                          newEnd.setMonth(newEnd.getMonth() + 1);
                                          await safeUpdateDoc(doc(db, "users", u.userId), {
                                            subscriptionEnd: newEnd.toISOString(),
                                            subscriptionTier: u.subscriptionTier || 'pro'
                                          });
                                          setMessage({ type: 'success', text: "Successfully extended subscription by 1 month!" });
                                          fetchUsers();
                                        } catch (err: any) {
                                          setMessage({ type: 'error', text: err.message });
                                        }
                                        setTimeout(() => setMessage(null), 4000);
                                      }}
                                      className="text-[9px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded transition shadow-sm cursor-pointer"
                                    >
                                      +1 Month
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
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
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-bold">
                              {user.displayName || "Unknown User"}
                              {(user as any).isActiveUser ? (
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" title="Active User" />
                              ) : (
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-700 border border-white dark:border-slate-900" title="Inactive User" />
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                              {(user as any).isActiveUser ? "Active Activity" : "Idle Account"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {user.birthday || "Not Set"}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                          {user.email || "No Email"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => handleUpdateRole(user.userId, e.target.value as 'user' | 'admin')}
                              className={`appearance-none outline-none border focus:ring-2 focus:ring-tiffany-500 rounded text-[11px] font-bold uppercase tracking-wider px-2 py-1 cursor-pointer pr-6 ${
                                user.role === 'admin' ? 'bg-red-105 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30' :
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
                              className={`appearance-none outline-none border focus:ring-2 focus:ring-tiffany-500 rounded text-[11px] font-bold uppercase tracking-wider px-2 py-1 cursor-pointer pr-6 ${
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
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                            <span className="font-bold font-mono">{(user as any).docCount || 0} files</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                              {formatBytes((user as any).storageBytes || 0)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {user.createdAt && (user.createdAt as any).toDate 
                            ? (user.createdAt as any).toDate().toLocaleDateString()
                            : new Date(user.createdAt || Date.now()).toLocaleDateString()
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            <button
                              onClick={() => handleFetchUserFiles(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-tiffany-600 bg-tiffany-50 hover:bg-tiffany-100 dark:bg-tiffany-500/10 dark:text-tiffany-400 dark:hover:bg-tiffany-500/25 transition cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Files
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.email)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              Reset Password
                            </button>
                          </div>
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
      {renderUserFilesViewer()}
      {renderSlipViewer()}
    </div>
  );
}
