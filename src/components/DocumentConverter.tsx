import React, { useState, useRef, useEffect } from "react";
import { UserProfile, LaoLetterDocument, SUBSCRIPTION_PLANS, DocumentTemplate } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from "firebase/firestore";
import { UploadCloud, FileType, Languages, Check, ArrowRight, ArrowDown, Download, Sparkles, AlertCircle, Copy, FileSpreadsheet, FileImage, FileText, RefreshCw, Lock } from "lucide-react";

interface DocumentConverterProps {
  userProfile: UserProfile | null;
  documents?: LaoLetterDocument[];
  onDocumentSaved: () => void;
  selectedDocument: LaoLetterDocument | null;
  onClearSelected: () => void;
  onRequireLogin?: () => void;
  onUpgradeClick?: () => void;
}

export default function DocumentConverter({ userProfile, documents, onDocumentSaved, selectedDocument, onClearSelected, onRequireLogin, onUpgradeClick }: DocumentConverterProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "text" | "templates" | "generate">("upload");
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [aiTypes, setAiTypes] = useState<AIDocumentType[]>([]);
  const [selectedAiType, setSelectedAiType] = useState<string>("");
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const tmpls = snap.docs.map(d => ({id: d.id, ...d.data()}) as DocumentTemplate);
        setTemplates(tmpls);
      } catch (e) {
        console.error("Failed to fetch templates", e);
      }
    };
    
    const fetchAiTypes = async () => {
      try {
        const q = query(collection(db, "aitypes"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const types = snap.docs.map(d => ({id: d.id, ...d.data()}) as AIDocumentType);
        setAiTypes(types);
        if (types.length > 0 && !selectedAiType) setSelectedAiType(types[0].id || "");
      } catch (e) {
        console.error("Failed to fetch ai types", e);
      }
    };
    
    if (activeTab === "templates") fetchTemplates();
    if (activeTab === "generate") fetchAiTypes();
  }, [activeTab]);

  // Gemini Response states (if we just translated / formatted a new doc)
  const [convertedResult, setConvertedResult] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Determine limits
  const currentPlan = userProfile ? SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscriptionTier) : null;
  const hasWordExportPrivilege = userProfile && userProfile.subscriptionTier !== "free";

  const getGuestConversionsLeft = () => {
    const val = localStorage.getItem("guestConversionsLeft");
    if (val) {
      let num = parseInt(val, 10);
      if (num > 3) {
         num = 3;
         localStorage.setItem("guestConversionsLeft", "3");
      }
      if (num < 0) num = 0;
      return num;
    }
    localStorage.setItem("guestConversionsLeft", "3");
    return 3;
  };

  const [guestConversionsLeft, setGuestConversionsLeft] = useState(getGuestConversionsLeft());

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Convert File to Base64 helper
  const getFileBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Process File Select
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setParsingError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParsingError(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFiles(Array.from(e.target.files));
    }
  };

  const validateAndSetFiles = (selectedFiles: File[]) => {
    // Limit file size based on subscription tier
    let maxSizeMB = 0.2; // Default for free/guest
    let maxFiles = 1;
    if (userProfile?.subscriptionTier === "ultra") {
      maxSizeMB = 100;
      maxFiles = 50;
    } else if (userProfile?.subscriptionTier === "pro") {
      maxSizeMB = 25;
      maxFiles = 20;
    }

    if (!userProfile && selectedFiles.length > maxFiles) {
        setParsingError(`ແຂກ (Guest) ສາມາດອັບໂຫຼດໄດ້ເທື່ອລະ 1 ຟາຍ. / Guests can only upload 1 file at a time.`);
        return;
    }
    if (userProfile?.subscriptionTier === "free" && selectedFiles.length > maxFiles) {
        setParsingError(`ສໍາລັບແພັກເກັດຟຣີ ສາມາດອັບໂຫຼດໄດ້ເທື່ອລະ 1 ຟາຍ / Free tier can only upload 1 file at a time.`);
        return;
    }

    const newFiles = (userProfile?.subscriptionTier === "ultra" || userProfile?.subscriptionTier === "pro") 
      ? [...files, ...selectedFiles].slice(0, maxFiles) 
      : [...selectedFiles].slice(0, maxFiles);

    for (let f of newFiles) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        setParsingError(`ຟາຍ ${f.name} ມີຂະໜາດໃຫຍ່ເກີນໄປ. ຂີດຈຳກັດແມ່ນ ${maxSizeMB}MB / File ${f.name} is too large. ${maxSizeMB}MB limit.`);
        return;
      }
    }
    setFiles(newFiles);
  };

  const saveDocumentDirectly = async (docToSave: any) => {
    if (!userProfile) return;
    try {
      const documentId = docToSave.documentId || "doc_" + Math.random().toString(36).substring(2, 11);
      docToSave.documentId = documentId;
      const newDocRef = doc(db, "documents", documentId);
      const docPayload: any = {
        documentId: documentId,
        ownerId: userProfile.userId,
        title: docToSave.title || "ເອກະສານແປງແລ້ວ / Converted Document",
        sender: docToSave.sender || "",
        receiver: docToSave.receiver || "",
        referenceNumber: docToSave.referenceNumber || "",
        date: docToSave.date || "",
        convertedText: docToSave.convertedText || "",
        originalText: docToSave.originalText || "",
        createdAt: serverTimestamp(),
      };
      await setDoc(newDocRef, docPayload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAction = async (draftText: string, instruction: string, referenceFileBase64?: string, referenceFileMimeType?: string) => {
    if (!userProfile && guestConversionsLeft <= 0) {
      setParsingError("You have used all 3 guest trials. Please log in or upgrade to continue.");
      return;
    }
    
    setIsProcessing(true);
    setParsingError(null);
    setConvertedResult(null);

    try {
      const payload: any = {
        rawLaoText: draftText,
        promptType: "generate",
        documentContext: instruction
      };
      
      if (referenceFileBase64 && referenceFileMimeType) {
        payload.referenceFormatFileBase64 = referenceFileBase64;
        payload.referenceFormatFileMimeType = referenceFileMimeType;
      }
      
      const response = await fetch("/api/gemini/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate document.");
      
      setConvertedResult(data);
      if (!userProfile) {
        const newVal = guestConversionsLeft - 1;
        localStorage.setItem("guestConversionsLeft", newVal.toString());
        setGuestConversionsLeft(newVal);
      }
    } catch (err: any) {
      console.error("Generate error", err);
      setParsingError(err.message || "An error occurred during document generation. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertAction = async () => {
    if (!userProfile && guestConversionsLeft <= 0) {
      setParsingError("You have used all 3 guest trials. Please log in or upgrade to continue.");
      return;
    }
    
    setIsProcessing(true);
    setParsingError(null);
    setConvertedResult(null);

    try {
      if (activeTab === "text") {
        if (!inputText.trim()) {
          setParsingError("ກະລຸນາໃສ່ຂໍ້ຄວາມກ່ອນປ່ຽນ / Please enter document text to convert.");
          setIsProcessing(false);
          return;
        }
        const payload = {
          rawLaoText: inputText,
          promptType: "font-convert",
        };
        const response = await fetch("/api/gemini/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to process text conversion.");
        setConvertedResult(data);
        if (!userProfile) {
          const newVal = guestConversionsLeft - 1;
          localStorage.setItem("guestConversionsLeft", newVal.toString());
          setGuestConversionsLeft(newVal);
        }
      } else {
        if (files.length === 0) {
          setParsingError("ກະລຸນາເລືອກ ຫຼື ວາງຟາຍເອກະສານກ່ອນ / Please upload an image or PDF letter.");
          setIsProcessing(false);
          return;
        }

        const convertedDocs = [];
        for (const f of files) {
          const base64Data = await getFileBase64(f);
          const payload = {
            fileBase64: base64Data,
            mimeType: f.type,
            promptType: "ocr",
          };
          const response = await fetch("/api/gemini/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to process text conversion.");
          data.title = f.name; // Use filename for title
          convertedDocs.push(data);
          if (!userProfile) {
             const newVal = guestConversionsLeft - 1;
             localStorage.setItem("guestConversionsLeft", newVal.toString());
             setGuestConversionsLeft(newVal);
          }
        }
        
        if (convertedDocs.length > 0) {
          setConvertedResult(convertedDocs[0]); // Preview first one
          if (userProfile && convertedDocs.length > 1) {
            for (const cDoc of convertedDocs) {
              await saveDocumentDirectly(cDoc);
            }
            onDocumentSaved();
            setFiles([]); // Clear multi-upload after saving
          } else {
            setFiles([]); // For free/single upload, clear file
          }
        }
      }
    } catch (err: any) {
      console.error("Conversion error", err);
      setParsingError(err.message || "An error occurred during AI OCR Parsing. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Check storage limits
  const calculateTotalStorageUsed = () => {
    if (!documents) return 0;
    return documents.reduce((acc, doc) => acc + JSON.stringify(doc).length, 0);
  };

  // Save parsed document to user cabinet
  const handleSaveToCabinet = async () => {
    if (!userProfile) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    // Limit storage based on subscription tier
    let maxStorageMB = 15; // Free: 15MB
    if (userProfile?.subscriptionTier === "ultra") {
      maxStorageMB = 5 * 1024; // Ultra: 5GB (5120MB)
    } else if (userProfile?.subscriptionTier === "pro") {
      maxStorageMB = 1024; // Pro: 1GB (1024MB)
    }

    const currentStorageUsed = calculateTotalStorageUsed();
    if (currentStorageUsed > maxStorageMB * 1024 * 1024) {
      alert(`Storage Limit Exceeded / ພື້ນທີ່ຈັດເກັບເຕັມ.\nYour limit is ${maxStorageMB >= 1024 ? maxStorageMB/1024 + 'GB' : maxStorageMB + 'MB'}. Please upgrade your plan to save more files.`);
      return;
    }

    const docToSave = convertedResult || selectedDocument;
    if (!docToSave) return;

    setIsSaving(true);
    try {
      const documentId = docToSave.documentId || "doc_" + Math.random().toString(36).substring(2, 11);
      const isCreate = !selectedDocument;

      const newDocRef = doc(db, "documents", documentId);
      const docPayload: any = {
        documentId: documentId,
        ownerId: userProfile.userId,
        title: docToSave.title || "ເອກະສານແປງແລ້ວ / Converted Document",
        sender: docToSave.sender || "",
        receiver: docToSave.receiver || "",
        sourceType: activeTab === "text" ? "text" : "image/pdf",
        originalText: docToSave.originalText || "",
        convertedText: docToSave.convertedText || "",
        status: docToSave.status || "saved",
        flowStatus: docToSave.flowStatus || "Draft & Verified",
        referenceNo: docToSave.referenceNo || "",
        referenceDate: docToSave.referenceDate || "",
        summary: docToSave.summary || "",
        updatedAt: serverTimestamp(),
      };

      if (isCreate) {
        docPayload.createdAt = serverTimestamp();
      } else {
        docPayload.createdAt = selectedDocument.createdAt;
      }

      await setDoc(newDocRef, docPayload);
      setIsSaving(false);
      onDocumentSaved();
      
      // Notify user visually by clearing data
      if (convertedResult) {
        setConvertedResult(null);
        setFiles([]);
        setInputText("");
      }
    } catch (err) {
      setIsSaving(false);
      handleFirestoreError(err, OperationType.WRITE, `documents/new`);
    }
  };

  // Export to Microsoft Word with correct styling
  const handleDownloadWord = () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;

    const title = activeDoc.title || "Letter_Converted";
    const bodyContent = `
      <div class="WordSection1">
        ${activeDoc.convertedText || ""}
      </div>
    `;

    const header = `
      <html xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Phetsarath&display=swap');
      
      /* Word Document Page Setup */
      @page WordSection1 {
        size: 595.3pt 841.9pt; /* A4 */
        margin: 56.7pt 56.7pt 56.7pt 85.05pt; /* Top: 2cm, Right: 2cm, Bottom: 2cm, Left: 3cm */
        mso-header-margin: 35.4pt;
        mso-footer-margin: 35.4pt;
        mso-paper-source: 0;
      }
      div.WordSection1 {
        page: WordSection1;
      }

      /* Base Font Settings */
      body, p, div, td, span {
        font-size: 12.0pt;
        font-family: "Times New Roman", serif;
        mso-ascii-font-family: "Times New Roman"; 
        mso-hansi-font-family: "Times New Roman";
        mso-bidi-font-family: "Phetsarath OT", "Sayettha OT", sans-serif;
      }
      
      .font-lao {
        font-family: "Phetsarath OT", "Sayettha OT", sans-serif !important;
        mso-ascii-font-family: "Phetsarath OT";
        mso-hansi-font-family: "Phetsarath OT";
        mso-bidi-font-family: "Phetsarath OT";
      }
      .font-roman {
        font-family: "Times New Roman", serif !important;
        mso-ascii-font-family: "Times New Roman";
        mso-hansi-font-family: "Times New Roman";
      }
      p {
        margin-top: 0cm;
        margin-right: 0cm;
        margin-bottom: 8.0pt;
        margin-left: 0cm;
        line-height: 115%;
      }
      .center {
        text-align: center;
      }
      .right {
        text-align: right;
      }
      </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const blobContent = "\ufeff" + header + bodyContent + footer;
    const blob = new Blob([blobContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Microsoft Excel with structured format mapping
  const handleDownloadExcel = () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;

    const title = activeDoc.title || "Letter_Converted";
    const bodyHTML = activeDoc.convertedText || "";

    // Create a clean layout preserving headers and structural table elements for Microsoft Excel compatibility
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Phetsarath&display=swap');
      body {
        font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif;
      }
      td, th {
        font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif;
        border: 0.5pt solid #cbd5e1;
        padding: 8px;
        font-size: 11pt;
      }
      .font-lao {
        font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif !important;
      }
      .font-roman {
        font-family: 'Times New Roman', serif !important;
      }
      p {
        margin: 0;
        line-height: 1.5;
        font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif;
      }
      </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="4" style="background-color: #0abab5; color: white; height: 45px; font-size: 14pt; font-weight: bold; text-align: center;">
                LAODOC PREMIUM EXPORT - Document Record
              </th>
            </tr>
            <tr>
              <th colspan="4" style="background-color: #0d9692; color: white; height: 30px; font-size: 12pt; font-weight: bold; text-align: center;">
                ${title}
              </th>
            </tr>
            <tr>
              <th style="background-color: #f1f5f9; text-align: left; font-weight: bold; width: 140px;">Field Name</th>
              <th colspan="3" style="background-color: #f1f5f9; text-align: left; font-weight: bold;">Document Metadata Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Reference Number</strong></td>
              <td colspan="3">${activeDoc.referenceNo || "-"}</td>
            </tr>
            <tr>
              <td><strong>Letter Date</strong></td>
              <td colspan="3">${activeDoc.referenceDate || "-"}</td>
            </tr>
            <tr>
              <td><strong>Sender Agency</strong></td>
              <td colspan="3">${activeDoc.sender || "-"}</td>
            </tr>
            <tr>
              <td><strong>Recipient Agency</strong></td>
              <td colspan="3">${activeDoc.receiver || "-"}</td>
            </tr>
            <tr>
              <td><strong>AI Executive Summary</strong></td>
              <td colspan="3" style="background-color: #f8fafc; font-style: italic;">${activeDoc.summary || "-"}</td>
            </tr>
            <tr>
              <td colspan="4" style="background-color: #072d2e; color: white; font-weight: bold; height: 35px; text-align: center;">
                CONVERTED OFFICIAL DOCUMENT TEXT (PHETSARATH OT)
              </td>
            </tr>
            <tr>
              <td colspan="4" style="vertical-align: top; padding: 20px; background-color: #ffffff; line-height: 1.8;">
                ${bodyHTML}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blobContent = "\ufeff" + header;
    const blob = new Blob([blobContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;
    
    // Extract plain texts without HTML tags using standard DOM parser
    const docHtml = activeDoc.convertedText || "";
    const el = document.createElement("div");
    el.innerHTML = docHtml;
    const plainText = el.innerText || el.textContent || "";
    
    navigator.clipboard.writeText(plainText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Active letter being rendered
  const activeDocument = convertedResult || selectedDocument;

  return (
    <div className="space-y-6" id="document-converter-card">
      {/* Upper Interaction Area */}
      {!activeDocument ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 overflow-x-auto">
            <button
              onClick={() => { setActiveTab("upload"); setParsingError(null); }}
              className={`flex-1 py-3.5 whitespace-nowrap text-[10px] sm:text-xs font-bold text-center border-b-2 transition px-2 ${
                activeTab === "upload"
                  ? "border-indigo-600 text-slate-950 dark:text-white bg-white dark:bg-slate-800"
                  : "border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              ອັບໂຫຼດຟາຍ (PDF / ຮູບພາບ)
            </button>
            <button
              onClick={() => { 
                if (!userProfile || userProfile.subscriptionTier === "free") {
                  if (onUpgradeClick) {
                    onUpgradeClick();
                  } else {
                    setParsingError("Please upgrade to Pro or Ultra to use AI Document Draft.");
                  }
                  return;
                }
                setActiveTab("generate"); setParsingError(null); 
              }}
              className={`flex-1 py-3.5 whitespace-nowrap text-[10px] sm:text-xs font-bold text-center border-b-2 transition px-2 flex items-center justify-center gap-1.5 ${
                activeTab === "generate"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-transparent text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              {(!userProfile || userProfile.subscriptionTier === "free") ? <Lock className="w-3.5 h-3.5 opacity-60" /> : <Sparkles className="w-3.5 h-3.5" />}
              ຮ່າງເອກະສານ (AI Draft)
            </button>
            <button
              onClick={() => { 
                if (!userProfile || userProfile.subscriptionTier === "free") {
                  if (onUpgradeClick) {
                    onUpgradeClick();
                  } else {
                    setParsingError("Please upgrade to Pro or Ultra to access Official Templates.");
                  }
                  return;
                }
                setActiveTab("templates"); setParsingError(null); 
              }}
              className={`flex-1 py-3.5 whitespace-nowrap text-[10px] sm:text-xs font-bold text-center border-b-2 transition px-2 flex items-center justify-center gap-1.5 ${
                activeTab === "templates"
                  ? "border-indigo-600 text-slate-950 dark:text-white bg-white dark:bg-slate-800"
                  : "border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {(!userProfile || userProfile.subscriptionTier === "free") && <Lock className="w-3.5 h-3.5 opacity-60" />}
              ແບບຟອມ (Templates)
            </button>
            <button
              onClick={() => { setActiveTab("text"); setParsingError(null); }}
              className={`flex-1 py-3.5 whitespace-nowrap text-[10px] sm:text-xs font-bold text-center border-b-2 transition px-2 ${
                activeTab === "text"
                  ? "border-indigo-600 text-slate-950 dark:text-white bg-white dark:bg-slate-800"
                  : "border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              ວາງຂໍ້ຄວາມແປງຟອນ (Raw Text Input)
            </button>
          </div>

          <div className="p-6 text-xs space-y-5">
            {parsingError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-650 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parsingError}</span>
              </div>
            )}

            {activeTab === "templates" ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Official Document Templates</h3>
                  <p className="text-[10px] text-slate-500">Download formatted templates in DOCX (Phetsarath OT) for your official needs.</p>
                </div>
                
                {templates.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                     <p className="italic">No templates available. Admins can upload templates from the Admin Dashboard.</p>
                  </div>
                ) : (
                  templates.map((tmpl, idx) => {
                     // Alternating colors for visual rhythm
                     const isIndigo = idx % 2 === 0;
                     const bgClass = isIndigo ? "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800" : "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800";
                     const iconBgClass = isIndigo ? "bg-indigo-100 dark:bg-indigo-800" : "bg-blue-100 dark:bg-blue-800";
                     const iconColorClass = isIndigo ? "text-indigo-600 dark:text-indigo-300" : "text-blue-600 dark:text-blue-300";
                     const btnClass = isIndigo ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700";

                     return (
                      <div key={tmpl.id} className={`flex flex-col sm:flex-row justify-between items-center border gap-4 p-4 rounded-2xl ${bgClass}`}>
                          <div className="flex items-center space-x-3 w-full sm:w-auto">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}>
                                <FileText className={`w-5 h-5 ${iconColorClass}`} />
                              </div>
                              <div className="flex-1 text-left">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{tmpl.name}</h4>
                                <p className="text-[10px] text-slate-500">{tmpl.description} • {tmpl.fileName}</p>
                              </div>
                          </div>
                          <a 
                            href={tmpl.fileBase64} 
                            download={tmpl.fileName}
                            className={`w-full sm:w-auto text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer ${btnClass}`} 
                            title="Download Template"
                          >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                          </a>
                      </div>
                     );
                  })
                )}
              </div>
            ) : activeTab === "generate" ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4 sm:p-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3">AI Document Drafter</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-2">Select Document Type</label>
                      <select 
                        value={selectedAiType} 
                        onChange={(e) => setSelectedAiType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {aiTypes.length === 0 && <option value="" disabled>No templates available</option>}
                        {aiTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-2">What do you want to write?</label>
                      <textarea
                        rows={5}
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        placeholder="e.g. I need to request 2 days of leave due to family matters starting tomorrow..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                        const aiType = aiTypes.find(t => t.id === selectedAiType);
                        if (aiTypes.length === 0) { setParsingError("No document types available. Admin needs to add them first."); return; }
                        if (!selectedAiType) { setParsingError("Please select a document type"); return; }
                        if (!draftText.trim()) { setParsingError("Please write what you want to generate"); return; }
                        handleGenerateAction(draftText, aiType?.instructions || "", aiType?.referenceFileBase64, aiType?.referenceFileMimeType);
                    }}
                    disabled={isProcessing}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition flex items-center shadow-lg transform active:scale-95 space-x-2 ${
                      isProcessing 
                        ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/25 text-white cursor-pointer"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin w-4 h-4" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Formatted Document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : activeTab === "upload" ? (
              /* Drag & Drop Zone */
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={(e) => {
                  // Prevent click if clicking on the camera button or other inner buttons that might stop propagation
                  fileInputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition select-none flex flex-col justify-center items-center cursor-pointer ${
                  isDragActive
                    ? "border-indigo-500 bg-indigo-50/20"
                    : "border-slate-250 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/55 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                id="doc-dropzone"
              >
                <input
                  type="file"
                  id="doc-uploader-input"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="*/*"
                  multiple
                  className="hidden"
                />
                
                <input
                  type="file"
                  id="doc-camera-input"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {files.length > 0 ? (
                  <div className="space-y-1 w-full max-w-sm my-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-2 px-3">
                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate w-4/5 text-left">{f.name}</p>
                        <p className="text-[10px] text-slate-500 whitespace-nowrap">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 mt-2 text-center">{files.length} file(s) ready to analyze</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full max-w-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="w-10 h-10 bg-white dark:bg-slate-700 cursor-pointer rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600 shadow-xs hover:bg-indigo-50 transition"
                        title="Upload File"
                      >
                        <UploadCloud className="w-5 h-5" />
                      </button>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        ວາງຟາຍ ຫຼື ຖ່າຍຮູບ / Drag & Drop File
                      </h4>
                      <button 
                        onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                        className="w-10 h-10 bg-white dark:bg-slate-700 cursor-pointer rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-600 shadow-xs hover:bg-emerald-50 transition sm:hidden"
                        title="Take Photo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                      </button>
                    </div>
                    
                    {/* Small compact formatting indicator */}
                    <div className="flex items-center space-x-3 mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 pr-3 shadow-xs">
                      <div className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        PDF/IMG
                      </div>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">DOCX Phetsarath</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400">
                      Supports high-fidelity PDF, PHOTO, TXT. Max {(userProfile?.subscriptionTier === "ultra") ? 100 : (userProfile?.subscriptionTier === "pro") ? 25 : 0.2}MB.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Text normalizer area */
              <div className="space-y-3">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">RAW OLD LAO TEXT (Saysettha/Sanyasit ASCII plain transcription)</label>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="ວາງຂໍ້ຄວາມຢູ່ບ່ອນນີ້... Paste old Lao typewriter texts here to normalize fonts to official Phetsarath OT, correct administrative errors, and format standard templates."
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-lao focus:outline-none focus:ring-2 focus:ring-tiffany-500/20 focus:border-tiffany-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {/* Execute Button */}
            {(activeTab === "upload" || activeTab === "text") && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Smart Auto Documents
                  </span>
                  {!userProfile && (
                    <span className={`mt-0.5 ${guestConversionsLeft > 0 ? 'text-[10px] font-bold text-indigo-600' : 'text-[8px] font-thin text-red-500'}`}>
                      GUEST TRIALS LEFT: {guestConversionsLeft}/3
                    </span>
                  )}
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleConvertAction}
                  className="bg-slate-900 text-white hover:bg-slate-850 py-2.5 px-6 rounded-xl font-bold transition flex items-center space-x-2 shadow-xs cursor-pointer select-none disabled:opacity-75"
                  id="convert-trigger-btn"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>ກຳລັງສະແກນວິເຄາະ / Core Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4" />
                      <span>ແປງເອກະສານ / Convert & Format</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Render Converted output Preview */
        <div className="space-y-4">
          {/* Top Action Toolbar */}
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto scbar-none">
              <button
                onClick={handleSaveToCabinet}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm whitespace-nowrap cursor-pointer disabled:opacity-75"
                title="Save Document"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={handleDownloadWord}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm whitespace-nowrap cursor-pointer"
                title="Export Microsoft Word (.DOC)"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Word</span>
              </button>

              <button
                onClick={handleDownloadExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm whitespace-nowrap cursor-pointer"
                title="Export Microsoft Excel (.XLS)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm whitespace-nowrap cursor-pointer"
                title="Copy Cleaned Plain Text"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{isCopied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <button
              onClick={() => { setConvertedResult(null); onClearSelected(); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition whitespace-nowrap cursor-pointer shrink-0 ml-4"
            >
              <span>Close</span>
            </button>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
          
          {/* Side stats & Actions */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-extrabold text-slate-950 dark:text-white flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-tiffany-500" />
                  <span>Document Details</span>
                </h4>
              </div>

              {/* Extraction Metadata Form */}
              <div className="space-y-3.5">
                <div>
                  <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">SUBJECT / SUBJECT SUBJECT</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeDocument.title || "Untitled"}</p>
                </div>

                {activeDocument.referenceNo && (
                  <div>
                    <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">ADMIN REFERENCE NO</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{activeDocument.referenceNo}</p>
                  </div>
                )}

                {activeDocument.referenceDate && (
                  <div>
                    <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">LETTER DATE</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{activeDocument.referenceDate}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">SENDER</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{activeDocument.sender || "-"}</p>
                  </div>
                  <div>
                    <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">RECIPIENT</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{activeDocument.receiver || "-"}</p>
                  </div>
                </div>

                {activeDocument.summary && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg">
                    <span className="block text-xxs font-mono text-tiffany-600 dark:text-tiffany-450 font-bold uppercase">AI SUMMARY OVERVIEW</span>
                    <p className="text-slate-650 dark:text-slate-300 mt-1 italic leading-relaxed text-[11px]">{activeDocument.summary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Render HTML Document Area */}
          <div className="md:col-span-8 flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
            {/* Simulation Header Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-slate-400 font-mono pl-2">Lao Formal Letter Digital Blueprint render</span>
              </div>
              <span className="text-[11px] font-mono text-indigo-700 font-bold">Standard Phetsarath OT / Times Roman Font</span>
            </div>

            {/* Document Body Wrapper */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-slate-50/50 flex-1 flex justify-center items-start">
              <div 
                className="gov-letter-preview w-full max-w-2xl bg-white border border-slate-200/60 shadow-md p-8 sm:p-12 text-slate-900 rounded-sm relative selection:bg-slate-200"
                id="digital-letter-output"
              >
                {/* Government Official emblem visual indicator placeholder */}
                <div className="absolute top-2.5 left-0 right-0 flex justify-center text-[9px] text-slate-350 tracking-widest font-mono uppercase">
                  Motto-Header Enforced (Phetsarath / Times New Roman)
                </div>

                <div 
                  dangerouslySetInnerHTML={{ __html: activeDocument.convertedText || "" }}
                />
              </div>
            </div>
          </div>

        </div>
        </div>
      )}
    </div>
  );
}
