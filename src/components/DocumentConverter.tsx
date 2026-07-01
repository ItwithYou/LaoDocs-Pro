import React, { useState, useRef, useEffect } from "react";
import { extractText } from "../lib/textExtractor";
import { UserProfile, LaoLetterDocument, SUBSCRIPTION_PLANS, DocumentTemplate, AIDocumentType } from "../types";
import { db, handleFirestoreError, OperationType, safeGetDocs, safeSetDoc } from "../firebase";
import { doc, serverTimestamp, collection, query, orderBy } from "firebase/firestore";
import { UploadCloud, FileType, Languages, Check, ArrowRight, ArrowDown, Download, Sparkles, AlertCircle, Copy, FileSpreadsheet, FileImage, FileText, RefreshCw, Lock, Printer, Edit, Save, Presentation, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, ImagePlus, Trash2, Maximize2, Minimize2, X, KeyRound } from "lucide-react";
import AutomatedDocumentDrafter from "./AutomatedDocumentDrafter";
import ApiKeyModal from "./ApiKeyModal";
import { getActiveAuth, hasAnyKey } from "../lib/aiKeys";
import { useLanguage } from "../contexts";

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
  const [textOutput, setTextOutput] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "text" | "templates" | "generate">("upload");
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [aiTypes, setAiTypes] = useState<AIDocumentType[]>([]);
  const [selectedAiType, setSelectedAiType] = useState<string>("");
  const [draftText, setDraftText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Lao");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasUserKey, setHasUserKey] = useState<boolean>(() => hasAnyKey());
  const { isLao } = useLanguage();

  // Keep the "has key" indicator in sync when the user saves keys.
  useEffect(() => {
    const sync = () => setHasUserKey(hasAnyKey());
    window.addEventListener("laodocs_ai_keys_change", sync);
    return () => window.removeEventListener("laodocs_ai_keys_change", sync);
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
        const snap = await safeGetDocs(q);
        const tmpls = snap.docs.map(d => ({id: d.id, ...d.data()}) as DocumentTemplate);
        setTemplates(tmpls);
      } catch (e) {
        console.error("Failed to fetch templates", e);
      }
    };
    
    const fetchAiTypes = async () => {
      try {
        const q = query(collection(db, "aitypes"), orderBy("createdAt", "desc"));
        const snap = await safeGetDocs(q);
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

  // Document Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [editedHtml, setEditedHtml] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedSender, setEditedSender] = useState("");
  const [editedReceiver, setEditedReceiver] = useState("");
  const [editedRefNo, setEditedRefNo] = useState("");
  const [editedRefDate, setEditedRefDate] = useState("");
  const [editedSummary, setEditedSummary] = useState("");

  // A4 Preview Scaling factor for mobile responsiveness
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const activeDocument = convertedResult || selectedDocument;

  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth;
        const targetWidth = 850;
        if (containerWidth < targetWidth) {
          // Add a safety margin so it is slightly smaller and fits perfectly within mobile views
          setPreviewScale((containerWidth - 10) / targetWidth);
        } else {
          setPreviewScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer1 = setTimeout(handleResize, 150);
    const timer2 = setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [selectedDocument, convertedResult, isEditing, editedHtml]);

  // Synchronize editing inputs with selected document
  useEffect(() => {
    setSelectedImage(null); // Reset selected image on document change
    if (activeDocument) {
      setEditedHtml(activeDocument.convertedText || "");
      setEditedTitle(activeDocument.title || "");
      setEditedSender(activeDocument.sender || "");
      setEditedReceiver(activeDocument.receiver || "");
      setEditedRefNo(activeDocument.referenceNo || activeDocument.referenceNo || "");
      setEditedRefDate(activeDocument.referenceDate || activeDocument.referenceDate || "");
      setEditedSummary(activeDocument.summary || "");
    } else {
      setEditedHtml("");
      setEditedTitle("");
      setEditedSender("");
      setEditedReceiver("");
      setEditedRefNo("");
      setEditedRefDate("");
      setEditedSummary("");
      setIsEditing(false);
    }
  }, [convertedResult, selectedDocument]);

  // Handle active selection outline styling for rich image interaction
  useEffect(() => {
    if (editorRef.current) {
      const imgs = editorRef.current.querySelectorAll("img");
      imgs.forEach((img) => {
        (img as HTMLImageElement).style.outline = "";
        (img as HTMLImageElement).style.outlineOffset = "";
      });
    }
    if (selectedImage) {
      selectedImage.style.outline = "3px solid #6366f1";
      selectedImage.style.outlineOffset = "3px";
    }
  }, [selectedImage]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const insertImageRef = useRef<HTMLInputElement>(null);

  const applyStyle = (command: string, value: string = "") => {
    // Focus the editor to ensure styling is applied inside it
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditedHtml(editorRef.current.innerHTML);
    }
  };

  const adjustImageStyle = (styleName: string, value: string = "") => {
    if (!selectedImage) return;

    if (styleName === "float") {
      if (value === "left") {
        selectedImage.style.float = "left";
        selectedImage.style.display = "inline-block";
        selectedImage.style.margin = "10px 20px 10px 0";
      } else if (value === "right") {
        selectedImage.style.float = "right";
        selectedImage.style.display = "inline-block";
        selectedImage.style.margin = "10px 0 10px 20px";
      } else if (value === "none") {
        selectedImage.style.float = "none";
        selectedImage.style.display = "block";
        selectedImage.style.margin = "15px auto";
      } else if (value === "inline") {
        selectedImage.style.float = "none";
        selectedImage.style.display = "inline-block";
        selectedImage.style.margin = "10px";
      }
    } else if (styleName === "size") {
      const currentWidthStr = selectedImage.style.maxWidth || selectedImage.style.width || "50%";
      let currentWidthNum = parseInt(currentWidthStr) || 50;
      if (value === "increase") {
        currentWidthNum = Math.min(100, currentWidthNum + 10);
      } else if (value === "decrease") {
        currentWidthNum = Math.max(10, currentWidthNum - 10);
      }
      selectedImage.style.maxWidth = `${currentWidthNum}%`;
      selectedImage.style.width = ""; // Reset simple width to favor responsive maxWidth bounds
    } else if (styleName === "delete") {
      selectedImage.remove();
      setSelectedImage(null);
    }

    if (editorRef.current) {
      setEditedHtml(editorRef.current.innerHTML);
    }
  };

  const handleInsertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      editorRef.current?.focus();
      
      const imgHtml = `<img src="${base64}" class="inserted-document-photo rounded-xl shadow-md border border-slate-200 dark:border-slate-800 transition-all duration-200" style="max-width: 50%; max-height: 350px; object-fit: contain; margin: 12px; display: inline-block; cursor: move; vertical-align: middle; float: none;" alt="inserted asset" />&nbsp;`;
      
      let inserted = false;
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel && sel.getRangeAt && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          if (editorRef.current?.contains(range.startContainer)) {
            range.deleteContents();
            const el = document.createElement("div");
            el.innerHTML = imgHtml;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = el.firstChild)) {
              frag.appendChild(node);
            }
            range.insertNode(frag);
            inserted = true;
          }
        }
      }
      
      if (!inserted && editorRef.current) {
        editorRef.current.innerHTML += imgHtml;
      }

      if (editorRef.current) {
        setEditedHtml(editorRef.current.innerHTML);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Determine limits
  const currentPlan = userProfile ? SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscriptionTier) : null;
  const hasWordExportPrivilege = userProfile && userProfile.subscriptionTier !== "free";
  const isFreeUser = !userProfile || userProfile.subscriptionTier === "free";

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
    let maxSizeMB = 0.2; // Default for guest
    let maxFiles = 1;
    if (userProfile) {
      if (userProfile.subscriptionTier === "ultra") {
        maxSizeMB = 100;
        maxFiles = 50;
      } else if (userProfile.subscriptionTier === "pro") {
        maxSizeMB = 25;
        maxFiles = 20;
      } else {
        // Free tier after sign in
        maxSizeMB = 0.3;
        maxFiles = 1;
      }
    }

    if (!userProfile && selectedFiles.length > maxFiles) {
        setParsingError(`ແຂກ (Guest) ສາມາດອັບໂຫຼດໄດ້ເທື່ອລະ 1 ຟາຍ. ກະລຸນາອັບເກຣດແພັກເກັດເພື່ອອັບໂຫຼດໄດ້ຫຼາຍໄຟລ໌ພ້ອມກັນ! / Guests can only upload 1 file at a time. Please upgrade to upload multiple files.`);
        return;
    }
    if (userProfile?.subscriptionTier === "free" && selectedFiles.length > maxFiles) {
        setParsingError(`ສໍາລັບແພັກເກັດຟຣີ ສາມາດອັບໂຫຼດໄດ້ເທື່ອລະ 1 ຟາຍ. ກະລຸນາອັບເກຣດແພັກເກັດເພື່ອອັບໂຫຼດໄດ້ຫຼາຍໄຟລ໌ພ້ອມກັນ! / Free tier can only upload 1 file at a time. Please upgrade to upload multiple files.`);
        return;
    }

    const newFiles = (userProfile?.subscriptionTier === "ultra" || userProfile?.subscriptionTier === "pro") 
      ? [...files, ...selectedFiles].slice(0, maxFiles) 
      : [...selectedFiles].slice(0, maxFiles);

    for (let f of newFiles) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        setParsingError(`ຟາຍ ${f.name} ມີຂະໜາດໃຫຍ່ເກີນໄປ. ຂີດຈຳກັດຂອງແພັກເກັດປັດຈຸບັນແມ່ນ ${maxSizeMB}MB. ກະລຸນາອັບເກຣດແພັກເກັດເພື່ອອັບໂຫຼດໄຟລ໌ໄດ້ສູງສຸດຮອດ 100MB! / File ${f.name} is too large. Current limit is ${maxSizeMB}MB. Please upgrade your plan to process files up to 100MB!`);
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
        recommendedFormat: docToSave.recommendedFormat || "",
        createdAt: serverTimestamp(),
      };
      await safeSetDoc(newDocRef, docPayload);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBackend = async (url: string, payload: any): Promise<any> => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error("HOSTINGER_STATIC_ROUTING_ERROR");
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("HOSTINGER_STATIC_ROUTING_ERROR");
      }

      if (!response.ok) {
        throw new Error(data?.error || `API error with status ${response.status}`);
      }
      return data;
    } catch (err: any) {
      if (err.message === "HOSTINGER_STATIC_ROUTING_ERROR" || err.message === "HOSTINGER_DEPLOYMENT_ERROR" || (err.message && err.message.includes("HOSTINGER"))) {
        throw new Error("connection problem");
      }
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("conn") || msg.includes("failed to fetch")) {
        throw new Error("connection problem");
      }
      throw err;
    }
  };

  const handleGenerateAction = async (draftText: string, instruction: string, targetLanguage: string, referenceFileBase64?: string, referenceFileMimeType?: string) => {
    const checkResult = checkToolUsageAllowed("draft");
    if (!checkResult.allowed) {
      setParsingError(checkResult.error || "Over the limit, please upgrade.");
      if (onUpgradeClick && (!userProfile || userProfile.subscriptionTier === "free")) {
        onUpgradeClick();
      }
      return;
    }
    
    setIsProcessing(true);
    setParsingError(null);
    setConvertedResult(null);

    try {
      const payload: any = {
        rawLaoText: draftText,
        promptType: "generate",
        documentContext: instruction,
        targetLanguage: targetLanguage,
      };

      if (referenceFileBase64 && referenceFileMimeType) {
        payload.referenceFormatFileBase64 = referenceFileBase64;
        payload.referenceFormatFileMimeType = referenceFileMimeType;
      }

      // Attach the user's own API key (if they added one).
      const auth = getActiveAuth();
      if (auth) {
        payload.userApiKey = auth.userApiKey;
        payload.provider = auth.provider;
        if (auth.model) payload.model = auth.model;
      }

      const data = await fetchBackend("/api/gemini/convert", payload);
      
      setConvertedResult(data);
      incrementDailyToolUsage("draft");
      
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

  const getDailyToolUsage = (toolName: string) => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`daily_usage_${toolName}`);
    if (!stored) return 0;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        return parsed.count;
      }
    } catch (e) {
      // ignore
    }
    return 0;
  };

  const incrementDailyToolUsage = (toolName: string) => {
    const today = new Date().toDateString();
    const currentCount = getDailyToolUsage(toolName);
    localStorage.setItem(`daily_usage_${toolName}`, JSON.stringify({
      date: today,
      count: currentCount + 1
    }));
  };

  const checkToolUsageAllowed = (toolName: string): { allowed: boolean; error?: string } => {
    const isGuest = !userProfile;
    const tier = userProfile ? userProfile.subscriptionTier : "guest";

    // When the user brings their own API key, everything is unlimited —
    // they are paying for their own usage.
    if (hasAnyKey()) {
      return { allowed: true };
    }

    // Tool 5 is always unlimited for all users
    if (toolName === "font-convert") {
      return { allowed: true };
    }

    // Standardize tool 4 name as "draft" or "generate" to "draft"
    const normalizedToolName = (toolName === "generate" || toolName === "draft") ? "draft" : toolName;
    const usageCount = getDailyToolUsage(normalizedToolName);

    if (isGuest) {
      if (normalizedToolName === "retype") {
        if (usageCount >= 3) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ທ່ານເລີ່ມຕົ້ນທົດລອງພິມຄືນເອກະສານໄດ້ສູງສຸດ 3 ຄັ້ງຕໍ່ມື້ເທົ່ານັ້ນ. ກະລຸນາເຂົ້າສູ່ລະບົບ ຫຼື ອັບເກຣດແພັກເກດ / Guest limit of 3 retype conversions per day reached. Please sign in or upgrade."
          };
        }
        return { allowed: true };
      }
      
      if (normalizedToolName === "format-original") {
        return {
          allowed: false,
          error: "ຂໍອະໄພ, ທ່ານຈຳເປັນຕ້ອງເຂົ້າສູ່ລະບົບ ຫຼື ອັບເກຣດເພື່ອໃຊ້ເຄື່ອງມືຈັດຮູບແບບພາສາເດີມ! / Format Original is exclusive to signed-in users. Please sign in or upgrade."
        };
      }
      
      if (normalizedToolName === "ocr") {
        return {
          allowed: false,
          error: "ຂໍອະໄພ, ທ່ານຈຳເປັນຕ້ອງເຂົ້າສູ່ລະບົບ ຫຼື ອັບເກຣດເພື່ອໃຊ້ເຄື່ອງມືແປ ແລະ ຈັດຮູບແບບ! / Translate & Format is exclusive to signed-in users. Please sign in or upgrade."
        };
      }
      
      if (normalizedToolName === "draft") {
        return {
          allowed: false,
          error: "ຂໍອະໄພ, ກະລຸນາເຂົ້າສູ່ລະບົບ ຫຼື ອັບເກຣດເພື່ອໃຊ້ເຄື່ອງມືຮ່າງເອກະສານກັບ AI! (ຜູ້ໃຊ້ທີ່ເຂົ້າສູ່ລະບົບແບບຟຣີ ໄດ້ຮັບສິດຮ່າງເອກະສານ 1 ຄັ້ງຕໍ່ມື້) / AI Document Drafting requires you to sign in. Standard accounts get 1 free draft per day."
        };
      }
    }

    if (tier === "free") {
      if (normalizedToolName === "retype") {
        if (usageCount >= 5) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ທ່ານໃຊ້ງານພິມຄືນເອກະສານ ຮອດຂີດຈຳກັດ 5 ຄັ້ງຕໍ່ມື້ແລ້ວ. ກະລຸນາອັບເກຣດແພັກເກດ / Free Tier limit of 5 retype conversions per day reached. Please upgrade to unlock more."
          };
        }
        return { allowed: true };
      }
      if (normalizedToolName === "format-original") {
        if (usageCount >= 1) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ເວີຊັນຟຣີ ສາມາດຈັດຮູບແບບເອກະສານໄດ້ 1 ຄັ້ງຕໍ່ມື້ເທົ່ານັ້ນ. ກະລຸນາອັບເກຣດແພັກເກດ / Free Tier limit of 1 Format Original conversion per day reached. Please upgrade."
          };
        }
        return { allowed: true };
      }
      if (normalizedToolName === "ocr") {
        if (usageCount >= 1) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ເວີຊັນຟຣີ ສາມາດແປ ແລະ ຈັດຮູບແບບໄດ້ 1 ຄັ້ງຕໍ່ມື້ເທົ່ານັ້ນ. ກະລຸນາອັບເກຣດແພັກເກດ / Free Tier limit of 1 Translate & Format conversion per day reached. Please upgrade."
          };
        }
        return { allowed: true };
      }
      if (normalizedToolName === "draft") {
        if (usageCount >= 1) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ບັນຊີທົ່ວໄປ (Free) ສາມາດຮ່າງເອກະສານໄດ້ 1 ຄັ້ງຕໍ່ມື້ເທົ່ານັ້ນ. ກະລຸນາອັບເກຣດແພັກເກດເພື່ອຮ່າງເອກະສານແບບບໍ່ຈຳກັດ! / Free Tier limit of 1 document draft per day reached. Please upgrade to unlock premium drafting."
          };
        }
        return { allowed: true };
      }
    }

    if (tier === "pro") {
      if (normalizedToolName === "retype" || normalizedToolName === "format-original") {
        return { allowed: true };
      }
      if (normalizedToolName === "ocr") {
        if (usageCount >= 25) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ທ່ານໃຊ້ງານເຄື່ອງມືແປ ແລະ ຈັດຮູບແບບ ຮອດຂີດຈຳກັດ PRO: 25 ຄັ້ງຕໍ່ມື້ແລ້ວ. / PRO tier limit of 25 Translate & Format conversions per day reached."
          };
        }
        return { allowed: true };
      }
      if (normalizedToolName === "draft") {
        if (usageCount >= 10) {
          return {
            allowed: false,
            error: "ຂໍອະໄພ, ທ່ານໃຊ້ງານເຄື່ອງມືຮ່າງເອກະສານ ຮອດຂີດຈຳກັດ PRO: 10 ຄັ້ງຕໍ່ມື້ແລ້ວ. ອັບເກຣດ ULTRA ເພື່ອໃຊ້ງານແບບບໍ່ຈຳກັດ! / PRO tier limit of 10 document drafts per day reached."
          };
        }
        return { allowed: true };
      }
    }

    if (tier === "ultra") {
      return { allowed: true };
    }

    return { allowed: true };
  };

  const handleConvertAction = async (promptTypeArg: string = "ocr") => {
    const isFreeUser = !userProfile || userProfile.subscriptionTier === "free";
    const isProUser = userProfile && userProfile.subscriptionTier !== "free";

    const checkResult = checkToolUsageAllowed(promptTypeArg);
    if (!checkResult.allowed) {
      setParsingError(checkResult.error || "Over the limit, please upgrade.");
      if (onUpgradeClick && (isFreeUser || !userProfile)) {
        onUpgradeClick();
      }
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

        // Offline Smart Conversion
        
        // 1. First, decode Saysettha/Sanyasit ASCII to Unicode Phetsarath OT
        const legacyToUnicodeMap: Record<string, string> = {
          "\xa1": "ກ", "\xa2": "ຂ", "\xa3": "ຄ", "\xa4": "ງ", "\xa5": "ຈ", "\xa6": "ສ", "\xa7": "ຊ", "\xa8": "ຍ", "\xa9": "ດ", "\xaa": "ຕ", "\xab": "ຖ", "\xac": "ທ", "\xad": "ນ", "\xae": "ບ", "\xaf": "ປ",
          "\xb0": "ຜ", "\xb1": "ຝ", "\xb2": "ພ", "\xb3": "ຟ", "\xb4": "ມ", "\xb5": "ຢ", "\xb6": "ຣ", "\xb7": "ລ", "\xb8": "ວ", "\xb9": "ຫ", "\xba": "ອ", "\xbb": "ຮ", "\xbc": "ໝ", "\xbd": "ະ", "\xbe": "າ", "\xbf": "ຳ",
          "\xc0": "ເ", "\xc1": "ແ", "\xc2": "ໂ", "\xc3": "ໃ", "\xc4": "ໄ",
          "\xc8": "່", "\xc9": "້", "\xca": "໊", "\xcb": "໋", "\xcc": "໌", "\xcd": "ໍ",
          "\xce": "ໜ", "\xcf": "ໝ", "\xd0": "ໞ", "\xd1": "໠",
          "\xe1": "ັ", "\xe2": "ິ", "\xe3": "ີ", "\xe4": "ຶ", "\xe5": "ື", "\xe6": "ຸ", "\xe7": "ູ", "\xe8": "ົ", "\xe9": "ຼ", "\xea": "ັ", "\xeb": "ິ", "\xec": "ີ", "\xed": "ຶ", "\xee": "ື", "\xef": "ົ",
          "\xf1": "ັ", "\xf2": "ິ", "\xf3": "ີ", "\xf4": "ຶ", "\xf5": "ື", "\xf6": "ຸ", "\xf7": "ູ", "\xf8": "ົ", "\xf9": "ຼ", "\xfa": "ຼ", "\xfb": "ຼ", "\xfc": "ຼ", "\xfd": "ຼ"
        };
        
        let processedText = inputText.split('').map(char => legacyToUnicodeMap[char] || char).join('');
        
        // 2. Clean double spaces (very smart)
        processedText = processedText.replace(/ {2,}/g, ' ');
        processedText = processedText.replace(/\n{3,}/g, '\n\n'); // max 2 line breaks

        // 2. Common Grammar & Typo Fixes (Offline Dictionary)
        const corrections: Record<string, string> = {
          "ຫລື": "ຫຼື",
          "ຫລາຍ": "ຫຼາຍ",
          "ຫນຶ່ງ": "ໜຶ່ງ",
          "ໃຫມ່": "ໃໝ່",
          "ຫມູ່": "ໝູ່",
          "ຫມາຍ": "ໝາຍ",
          "ຫນ້າ": "ໜ້າ",
          "ຫນີ": "ໜີ",
          "ຫມາ": "ໝາ",
          "ຫມູ": "ໝູ",
          "ຫມໍ": "ໝໍ",
          "ຫມາກ": "ໝາກ",
          "ຂື້ນ": "ຂຶ້ນ",
          "ນ້ຳ": "ນໍ້າ",
          "ຊ້ຳ": "ຊໍ້າ",
          "ພີມ": "ພິມ",
          "ອື່ນໆ": "ອື່ນໆ",
          "ຮົບແບບ": "ຮູບແບບ",
          "ເຜກະສາຖີືກ": "ເອກະສານຖືກ",
          "ເຜກະສາຖ": "ເອກະສານ",
          "ຕທດ": "ຕັດ",
          "ຫາດເຈ໋ຍ": "ໜາດເຈ້ຍ",
          "ຂະຫາດ": "ຂະໜາດ",
          "ເຈ໋ຍ": "ເຈ້ຍ",
          "໋ໃຂະ": "໌ໃຂະ"
        };

        const fixedWords: string[] = [];

        Object.keys(corrections).forEach((wrongWord) => {
          if (processedText.includes(wrongWord)) {
            const regex = new RegExp(wrongWord, 'g');
            processedText = processedText.replace(regex, corrections[wrongWord]);
            fixedWords.push(`"${wrongWord}" → "${corrections[wrongWord]}"`);
          }
        });

        setTextOutput(processedText);
        
        if (fixedWords.length > 0) {
          alert(`✅ Smart Grammar Auto-Fix Applied:\n${fixedWords.join('\n')}`);
        }
        
        // No guest trial limit hit on offline mode since it uses no credits.
        setIsProcessing(false);
        return;
      } else {
        if (files.length === 0) {
          setParsingError("ກະລຸນາເລືອກ ຫຼື ວາງຟາຍເອກະສານກ່ອນ / Please upload an image, PDF, or PowerPoint document.");
          setIsProcessing(false);
          return;
        }

        const convertedDocs = [];
        for (const f of files) {
          const base64Data = await getFileBase64(f);
          const payload: any = {
            fileBase64: base64Data,
            mimeType: f.type,
            promptType: promptTypeArg,
            targetLanguage: targetLanguage,
          };
          // Attach the user's own API key (if they added one).
          const auth = getActiveAuth();
          if (auth) {
            payload.userApiKey = auth.userApiKey;
            payload.provider = auth.provider;
            if (auth.model) payload.model = auth.model;
          }
          const data = await fetchBackend("/api/gemini/convert", payload);
          data.title = f.name; // Use filename for title
          convertedDocs.push(data);
          if (!userProfile) {
             const newVal = guestConversionsLeft - 1;
             localStorage.setItem("guestConversionsLeft", newVal.toString());
             setGuestConversionsLeft(newVal);
          }
        }
        
        if (convertedDocs.length > 0) {
          incrementDailyToolUsage(promptTypeArg);
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
      setParsingError(err.message || "An error occurred during parsing. Please retry.");
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
        title: editedTitle || docToSave.title || "ເອກະສານແປງແລ້ວ / Converted Document",
        sender: editedSender !== undefined ? editedSender : (docToSave.sender || ""),
        receiver: editedReceiver !== undefined ? editedReceiver : (docToSave.receiver || ""),
        sourceType: activeTab === "text" ? "text" : "image/pdf",
        originalText: docToSave.originalText || "",
        convertedText: editedHtml || docToSave.convertedText || "",
        status: docToSave.status || "saved",
        flowStatus: docToSave.flowStatus || "Draft & Verified",
        referenceNo: editedRefNo !== undefined ? editedRefNo : (docToSave.referenceNo || ""),
        referenceDate: editedRefDate !== undefined ? editedRefDate : (docToSave.referenceDate || ""),
        summary: editedSummary !== undefined ? editedSummary : (docToSave.summary || ""),
        recommendedFormat: docToSave.recommendedFormat || "",
        updatedAt: serverTimestamp(),
      };

      if (isCreate) {
        docPayload.createdAt = serverTimestamp();
      } else {
        docPayload.createdAt = selectedDocument.createdAt;
      }

      await safeSetDoc(newDocRef, docPayload);
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

  // Export to Microsoft Word with native generation
  const handleDownloadWord = async () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;

    try {
      setIsProcessing(true);
      let safeTitle = (editedTitle || activeDoc.title || "Letter_Converted").replace(/\s+/g, "_");
      if (safeTitle.endsWith(".docx")) {
        safeTitle = safeTitle.substring(0, safeTitle.length - 5);
      }
      
      const htmlContent = editedHtml || activeDoc.convertedText || "";

      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ htmlContent })
      });

      if (!response.ok) {
        throw new Error("Failed to generate DOCX");
      }

      const data = await response.json();
      const byteCharacters = atob(data.docxBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeTitle}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert("Failed to export Word file natively: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to Microsoft Excel with structured format mapping
  const handleDownloadExcel = () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;

    const title = editedTitle || activeDoc.title || "Letter_Converted";
    const bodyHTML = editedHtml || activeDoc.convertedText || "";

    // Create a clean layout preserving headers and structural table elements for Microsoft Excel compatibility
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Phetsarath&display=swap');
      body {
        font-family: 'Phetsarath OT', serif;
      }
      td, th {
        font-family: 'Phetsarath OT', serif;
        border: 0.5pt solid #cbd5e1;
        padding: 8px;
        font-size: 11pt;
      }
      .global-doc-font {
        font-family: 'Phetsarath OT', serif !important;
      }
      .font-roman {
        font-family: 'Phetsarath OT', serif !important;
      }
      p {
        margin: 0;
        line-height: 1.5;
        font-family: 'Phetsarath OT', serif;
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
              <td colspan="3">${editedRefNo !== undefined ? editedRefNo : (activeDoc.referenceNo || "-")}</td>
            </tr>
            <tr>
              <td><strong>Letter Date</strong></td>
              <td colspan="3">${editedRefDate !== undefined ? editedRefDate : (activeDoc.referenceDate || "-")}</td>
            </tr>
            <tr>
              <td><strong>Sender Agency</strong></td>
              <td colspan="3">${editedSender !== undefined ? editedSender : (activeDoc.sender || "-")}</td>
            </tr>
            <tr>
              <td><strong>Recipient Agency</strong></td>
              <td colspan="3">${editedReceiver !== undefined ? editedReceiver : (activeDoc.receiver || "-")}</td>
            </tr>
            <tr>
              <td><strong>Executive Summary</strong></td>
              <td colspan="3" style="background-color: #f8fafc; font-style: italic;">${editedSummary !== undefined ? editedSummary : (activeDoc.summary || "-")}</td>
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

  // Export to Microsoft PowerPoint using pptxgenjs package
  const handleDownloadPPT = () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;

    // Build PPTX library instance
    import("pptxgenjs").then((pptxgenModule) => {
      const pptx = new pptxgenModule.default();
      const title = editedTitle || activeDoc.title || "Letter_Converted";
      pptx.layout = "LAYOUT_16x9";

      // SLIDE 1: formal cover page
      const slide1 = pptx.addSlide();
      slide1.background = { fill: "F8FAFC" }; // off white / slate

      // Frame layout accent
      slide1.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 0.5, w: 9.0, h: 4.625,
        line: { color: "0ABAB5", width: 2 }
      });

      // Cover Logo block
      slide1.addText("ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", {
        x: 1.0, y: 0.8, w: 8.0, h: 0.4,
        align: "center", fontFace: "Phetsarath OT", fontSize: 15, bold: true, color: "0D9692"
      });
      slide1.addText("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", {
        x: 1.0, y: 1.15, w: 8.0, h: 0.3,
        align: "center", fontFace: "Phetsarath OT", fontSize: 10, italic: true, color: "64748B"
      });

      // Title
      slide1.addText(title, {
        x: 1.0, y: 1.8, w: 8.0, h: 1.2,
        align: "center", fontFace: "Phetsarath OT", fontSize: 22, bold: true, color: "1E293B"
      });

      // Metadata values
      slide1.addText(`ເລກທີ: ${editedRefNo || activeDoc.referenceNo || "-"}     ວັນທີ: ${editedRefDate || activeDoc.referenceDate || "-"}`, {
        x: 1.0, y: 3.1, w: 8.0, h: 0.4,
        align: "center", fontFace: "Phetsarath OT", fontSize: 13, bold: true, color: "475569"
      });

      slide1.addText(`ຈາກ / Sender: ${editedSender || activeDoc.sender || "-"} \nເຖິງ / Recipient: ${editedReceiver || activeDoc.receiver || "-"}`, {
        x: 1.0, y: 3.7, w: 8.0, h: 0.8,
        align: "center", fontFace: "Phetsarath OT", fontSize: 11, italic: true, color: "475569"
      });

      slide1.addText("LAODOC OFFICIAL PRESENTATION SLIDES", {
        x: 1.0, y: 4.8, w: 8.0, h: 0.3,
        align: "center", fontFace: "Arial", fontSize: 8, bold: true, color: "94A3B8"
      });

      // SLIDE 2: Executive summary slide if exists
      const summaryText = editedSummary || activeDoc.summary;
      if (summaryText) {
        const slide2 = pptx.addSlide();
        slide2.background = { fill: "FFFFFF" };
        
        slide2.addText("ບົດສະຫຼຸບຫຍໍ້ / Executive Summary", {
          x: 0.7, y: 0.5, w: 8.6, h: 0.6,
          align: "left", fontFace: "Phetsarath OT", fontSize: 18, bold: true, color: "0D9692"
        });

        slide2.addShape(pptx.ShapeType.line, {
          x: 0.7, y: 1.1, w: 8.6, h: 0.0,
          line: { color: "CCCCCC", width: 1 }
        });

        slide2.addText(summaryText, {
          x: 0.7, y: 1.5, w: 8.6, h: 3.5,
          align: "left", fontFace: "Phetsarath OT", fontSize: 13, color: "334155", lineSpacing: 22
        });
      }

      // SLIDE 3+: split paragraphs out as content pages
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = editedHtml || activeDoc.convertedText || "";

      let textBlocks: string[] = [];
      const paragraphs = tempDiv.querySelectorAll("p, div, li, tr");
      if (paragraphs.length > 0) {
        paragraphs.forEach(p => {
          const txt = p.textContent?.trim();
          if (txt && txt.length > 10 && !textBlocks.includes(txt)) {
            textBlocks.push(txt);
          }
        });
      } else {
        const text = tempDiv.innerText || tempDiv.textContent || "";
        textBlocks = text.split("\n").map(t => t.trim()).filter(t => t.length > 10);
      }

      // Clean metadata noise
      textBlocks = textBlocks.filter(b => 
        !b.includes("ສາທາລະນະລັດ") && 
        !b.includes("ສັນຕິພາບ") &&
        !b.includes("ເລກທີ") &&
        !b.includes("ວັນທີ")
      );

      let currentSlideText = "";
      let slideIndex = 1;

      const addSlideBlock = (txtBlock: string, idx: number) => {
        const slide = pptx.addSlide();
        slide.background = { fill: "FFFFFF" };

        slide.addText(`ເນື້ອໃນເອກະສານ / Document Content (ພາກທີ ${idx})`, {
          x: 0.7, y: 0.5, w: 8.6, h: 0.6,
          align: "left", fontFace: "Phetsarath OT", fontSize: 18, bold: true, color: "0D9692"
        });

        slide.addShape(pptx.ShapeType.line, {
          x: 0.7, y: 1.1, w: 8.6, h: 0.0,
          line: { color: "CCCCCC", width: 1 }
        });

        slide.addText(txtBlock, {
          x: 0.7, y: 1.5, w: 8.6, h: 3.5,
          align: "left", fontFace: "Phetsarath OT", fontSize: 12, color: "1E293B", lineSpacing: 22
        });
      };

      for (const block of textBlocks) {
        if ((currentSlideText + "\n\n" + block).length > 550 && currentSlideText.length > 0) {
          addSlideBlock(currentSlideText, slideIndex);
          slideIndex++;
          currentSlideText = block;
        } else {
          currentSlideText = currentSlideText ? (currentSlideText + "\n\n" + block) : block;
        }
      }

      if (currentSlideText) {
        addSlideBlock(currentSlideText, slideIndex);
      }

      pptx.writeFile({ fileName: `${title.replace(/\s+/g, "_")}_slides.pptx` });
    }).catch(err => {
      console.error("Failed to load pptxgenjs", err);
      alert("Error generating PowerPoint Slides. Please try again.");
    });
  };

  // Formal A4 print configuration setup (Top: 2cm, Right: 2cm, Bottom: 2cm, Left: 3cm)
  const handlePrintDocument = () => {
    const activeDoc = convertedResult || selectedDocument;
    if (!activeDoc) return;

    const printContent = editedHtml || activeDoc.convertedText || "";

    // Create a temporary hidden iframe for printing to prevent main UI disruption and iframe-sandbox lockouts
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument?.defaultView;
    if (!doc) {
      // Fallback if iframe content window cannot be built
      window.print();
      return;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lao Document - Print</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Phetsarath:wght@400;700&display=swap');
            @page {
              size: A4;
              margin: 2cm 2cm 2cm 3cm; /* Formal Ministry Margins: Top 2cm, Right 2cm, Bottom 2cm, Left 3cm */
            }
            body {
              font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif;
              font-size: 11pt;
              line-height: 1.0;
              color: #000000;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }
            p {
              margin-top: 0in;
              margin-bottom: 0in; /* Dual single spacing style */
              line-height: inherit;
            }
            .global-doc-font {
              font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif !important;
            }
            /* Precise preservation of tables, lines, borders, and margins */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 12px 0 !important;
            }
            td, th {
              border: 0.5pt solid #000000 !important;
              padding: 6px 8px !important;
              vertical-align: top !important;
            }
            .text-center, .center { text-align: center !important; }
            .text-right, .right { text-align: right !important; }
            .text-left, .left { text-align: left !important; }
            .text-justify { text-align: justify !important; }
            .font-bold, .font-semibold { font-weight: bold !important; }
          </style>
        </head>
        <body>
          <div class="global-doc-font" spellcheck="false">
            ${printContent}
          </div>
          <script>
            window.addEventListener('DOMContentLoaded', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 400); // Allow fonts to load and layout to settle before opening window dialog
            });
          </script>
        </body>
        </html>
      `);
      iframeDoc.close();
    }

    // Safely cleanup the printing iframe after 15 seconds to allow user interaction completion
    setTimeout(() => {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 15000);
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

  return (
    <div className="space-y-6" id="document-converter-card">
      {/* Bring-your-own-key bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <KeyRound className={`w-4 h-4 shrink-0 ${hasUserKey ? "text-emerald-500" : "text-tiffany-500"}`} />
          <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
            {hasUserKey
              ? (isLao ? "ກຳລັງໃຊ້ກະແຈ AI ຂອງທ່ານ • ໃຊ້ໄດ້ບໍ່ຈຳກັດ" : "Using your own AI key • unlimited")
              : (isLao ? "ໃສ່ກະແຈ AI ຂອງທ່ານ (Gemini / OpenAI / OpenRouter) ເພື່ອໃຊ້ບໍ່ຈຳກັດ" : "Add your AI key (Gemini / OpenAI / OpenRouter) for unlimited use")}
          </span>
        </div>
        <button
          onClick={() => setShowApiKeyModal(true)}
          className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-tiffany-500 hover:bg-tiffany-600 text-white cursor-pointer flex items-center gap-1 transition"
        >
          <KeyRound className="w-3.5 h-3.5" />
          {hasUserKey ? (isLao ? "ຈັດການກະແຈ" : "Manage") : (isLao ? "ໃສ່ກະແຈ" : "Add key")}
        </button>
      </div>

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
              ອັບໂລດຟາຍ (Upload)
            </button>
            <button
              onClick={() => { 
                setActiveTab("generate"); 
                setParsingError(null); 
              }}
              className={`flex-1 py-3.5 whitespace-nowrap text-[10px] sm:text-xs font-bold text-center border-b-2 transition px-2 flex items-center justify-center gap-1.5 ${
                activeTab === "generate"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-transparent text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              ຮ່າງເອກະສານ (Draft)
            </button>
            <button
              onClick={() => { 
                setActiveTab("templates"); setParsingError(null); 
              }}
              className={`flex-1 py-3.5 whitespace-nowrap text-[10px] sm:text-xs font-bold text-center border-b-2 transition px-2 flex items-center justify-center gap-1.5 ${
                activeTab === "templates"
                  ? "border-indigo-600 text-slate-950 dark:text-white bg-white dark:bg-slate-800"
                  : "border-transparent text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
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
              ແປງຟອນ (Convert)
            </button>
          </div>

          <div className="p-6 text-xs space-y-5">
            {parsingError && (() => {
              const isUpgradePrompt = parsingError.toLowerCase().includes("upgrade") || 
                                      parsingError.toLowerCase().includes("limit") || 
                                      parsingError.includes("ອັບເກຣດ") || 
                                      parsingError.includes("ເກີນ") || 
                                      parsingError.includes("ຈຳກັດ") ||
                                      parsingError.includes("exclusive") ||
                                      parsingError.includes("pro") ||
                                      parsingError.includes("ultra");

              return (
                <div 
                  id="doc-conversion-error-banner"
                  className={`p-5 rounded-2xl flex items-start gap-4 shadow-md relative overflow-hidden text-left transition-all ${
                    isUpgradePrompt
                      ? "bg-slate-900 border border-amber-500/30 text-white"
                      : "bg-amber-50/80 dark:bg-amber-950/20 border border-amber-250/50 dark:border-amber-900/40 text-amber-900 dark:text-amber-200"
                  }`}
                >
                  {/* Decorative background pulse glow for premium notice */}
                  {isUpgradePrompt && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  )}

                  {isUpgradePrompt ? (
                    <Sparkles className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  )}

                  <div className="flex-1">
                    {isUpgradePrompt ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold font-sans text-[10px] uppercase tracking-wider mb-1">
                          <span>✨ PRO FEATURE NOTICE / ແຈ້ງການບໍລິການພິເສດ</span>
                        </div>
                        <p className="text-slate-100 font-semibold text-[12.5px] leading-relaxed block whitespace-pre-line pr-6">
                          {parsingError}
                        </p>
                        {onUpgradeClick && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={onUpgradeClick}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-bold transition-all hover:scale-102 cursor-pointer select-none shadow-md font-sans active:scale-98"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                              <span>ອັບເກຣດເວີຊັນ / Upgrade Now</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-[12.5px] block leading-normal whitespace-pre-line pr-6">
                          {parsingError.toLowerCase().includes("connection")
                            ? "ເກີດບັນຫາໃນການເຊື່ອມຕໍ່ (connection problem)"
                            : parsingError}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dismiss Button */}
                  <button
                    onClick={() => setParsingError(null)}
                    className={`absolute top-3.5 right-3.5 p-1 rounded-lg transition-colors cursor-pointer ${
                      isUpgradePrompt
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        : "text-amber-700/60 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400/60 dark:hover:text-amber-300 dark:hover:bg-amber-900/40"
                    }`}
                    title="Dismiss notice"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

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
              <AutomatedDocumentDrafter 
                onGenerate={(draftText, instruction, targetLanguage) => {
                  handleGenerateAction(draftText, instruction, targetLanguage);
                }} 
                isProcessing={isProcessing} 
                parsingError={parsingError} 
                draftCount={getDailyToolUsage("draft")}
                maxDrafts={
                  !userProfile 
                    ? "0 (Sign in for 1/day)" 
                    : userProfile.subscriptionTier === "ultra" 
                    ? "Unlimited" 
                    : userProfile.subscriptionTier === "pro" 
                    ? 10 
                    : 1
                }
              />
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
                        <div className="flex items-center w-full min-w-0 pr-3">
                          <p className="font-bold text-slate-900 dark:text-slate-200 truncate pr-2 text-left">{f.name}</p>
                          <p className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFiles(files.filter((_, index) => index !== i));
                          }}
                          className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
                      Supports high-fidelity PDF, PHOTO, TXT.{(userProfile?.subscriptionTier !== "ultra") && ` Max ${userProfile?.subscriptionTier === "pro" ? "25" : (userProfile ? "0.3" : "0.2")}MB.`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Text normalizer area */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">RAW OLD LAO TEXT (Saysettha/Sanyasit ASCII)</label>
                  <textarea
                    rows={12}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="ວາງຂໍ້ຄວາມຢູ່ບ່ອນນີ້... Paste old Lao typewriter texts here to convert fonts to official Phetsarath OT / Times New Roman."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-tiffany-500/20 focus:border-tiffany-500 text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Saysettha', 'Sanyasit', 'Lao Sans Pro', 'Alice5', sans-serif" }}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">MODERN LAO TEXT (Phetsarath OT)</label>
                  <textarea
                    rows={12}
                    value={textOutput}
                    readOnly
                    placeholder="Converted text will appear here. You can copy it directly."
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm global-doc-font focus:outline-none text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Phetsarath OT', 'Times New Roman', serif" }}
                  />
                </div>
              </div>
            )}

            {/* Execute Button */}
            {(activeTab === "upload" || activeTab === "text") && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                {!userProfile && (
                  <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-205 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-tiffany-500" />
                        Guest Trial Tracker
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Guests get 3 free document conversions. Offline Font normalizer is completely free.</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-xs">
                        USED: <span className="text-slate-900 dark:text-white font-mono text-xs">{3 - guestConversionsLeft} / 3</span>
                      </span>
                      <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-xs ${guestConversionsLeft > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'}`}>
                        REMAINING: <span className="font-mono text-xs">{guestConversionsLeft}</span>
                      </span>
                    </div>
                  </div>
                )}

                {activeTab !== "text" && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        ເລືອກຮູບແບບການປ່ຽນແປງເອກະສານ / Choose Mode
                      </span>
                      {files.length === 0 && (
                        <span className="text-[10.5px] font-medium text-amber-605 dark:text-amber-400 animate-pulse bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md">
                          * ອັບໂຫຼດໄຟລ໌ກ່ອນຈຶ່ງຈະສາມາດກົດໄດ້
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Button 1: Retype verbatim */}
                      <button
                        disabled={isProcessing || files.length === 0}
                        onClick={() => handleConvertAction("retype")}
                        className="flex flex-col items-start p-3.5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm select-none"
                      >
                        <div className="flex items-center gap-2 mb-1.5 w-full">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-805 dark:text-white leading-tight">
                            ພິມຄືນຕາມເດີມ
                          </span>
                          {!userProfile ? (
                            <span className="ml-auto text-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                              {getDailyToolUsage("retype")}/3
                            </span>
                          ) : isFreeUser ? (
                            <span className="ml-auto text-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                              {getDailyToolUsage("retype")}/5
                            </span>
                          ) : (
                            <span className="ml-auto text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                              Unlimit
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mb-1 font-semibold">
                          Retype All (Verbatim)
                        </p>
                        <span className="text-[9px] text-slate-400 leading-tight">
                          ພິມຄືນທຸກຢ່າງ ຕາມພາສາຕົ້ນສະບັບເດີມ (ອັງກິດ, ຈີນ, ລາວ...) ໂດຍຮັກສາຮູບແບບເດີມ
                        </span>
                      </button>

                      {/* Button 2: Format in original language */}
                      <button
                        disabled={isProcessing || files.length === 0}
                        onClick={() => handleConvertAction("format-original")}
                        className="flex flex-col items-start p-3.5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm select-none"
                      >
                        <div className="flex items-center gap-2 mb-1.5 w-full">
                          <div className="p-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-805 dark:text-white leading-tight">
                            ຈັດຮູບແບບພາສາເດີມ
                          </span>
                          {!userProfile ? (
                            <span className="ml-auto text-[8px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-sans font-bold shrink-0">
                              LOCKED
                            </span>
                          ) : isFreeUser ? (
                            <span className="ml-auto text-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                              {getDailyToolUsage("format-original")}/1
                            </span>
                          ) : (
                            <span className="ml-auto text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                              Unlimit
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mb-1 font-semibold">
                          Format Original Language
                        </p>
                        <span className="text-[9px] text-slate-400 leading-tight">
                          ຈັດຮູບແບບεອກະສານທາງການ ໂດຍຮັກສາພາສາຕົ້ນສະບັບເດີມ ປັບຕົວໜັງສືໃຫ້ງາມ
                        </span>
                      </button>

                      {/* Button 3: Translate to Formal Format */}
                      <button
                        type="button"
                        disabled={isProcessing || files.length === 0}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName.toLowerCase() === 'select' || target.tagName.toLowerCase() === 'option') {
                            return;
                          }
                          handleConvertAction("ocr");
                        }}
                        className="flex flex-col items-start p-3.5 text-left rounded-2xl border border-indigo-200 dark:border-indigo-850 bg-indigo-50/20 hover:bg-indigo-50/40 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all duration-200 relative overflow-hidden group select-none justify-between"
                      >
                        <div className="absolute top-0 right-0 p-1 bg-indigo-600 text-[8px] text-white font-bold rounded-bl-lg tracking-wider uppercase">
                          Recommended
                        </div>
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-1.5 w-full">
                            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
                              <Languages className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-400 leading-tight">
                              ແປ ແລະ ຈັດຮູບແບບ
                            </span>
                            {!userProfile ? (
                              <span className="ml-auto mr-12 text-[8px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-sans font-bold text-center shrink-0">
                                LOCKED
                              </span>
                            ) : isFreeUser ? (
                              <span className="ml-auto mr-12 text-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold text-center shrink-0">
                                {getDailyToolUsage("ocr")}/1
                              </span>
                            ) : userProfile?.subscriptionTier === "pro" ? (
                              <span className="ml-auto mr-12 text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-sans font-bold text-center shrink-0">
                                {Math.min(getDailyToolUsage("ocr"), 25)}/25
                                <br />PRO
                              </span>
                            ) : (
                              <span className="ml-auto mr-12 text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold text-center shrink-0">
                                Unlimit
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-500 leading-normal mb-1 font-semibold">
                            Translate & Format
                          </p>
                          <span className="text-[9px] text-slate-400 leading-tight block mb-3">
                            ແປທຸກພາສາ ແລະ ຈັດຮູບແບບອອກມາເປັນຮ່າງເອກະສານທາງການ
                          </span>
                        </div>
                        
                        <div className="w-full flex items-center justify-between border-t border-indigo-100 dark:border-indigo-900/50 pt-2 mt-auto">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Target Language:</label>
                          <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 w-[100px]"
                          >
                            <option value="Lao">Lao</option>
                            <option value="English">English</option>
                            <option value="Thai">Thai</option>
                            <option value="Chinese">Chinese</option>
                            <option value="Korean">Korean</option>
                          </select>
                        </div>
                      </button>
                    </div>

                    {isProcessing && (
                      <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3 animate-pulse mt-3">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          ກຳລັງສະແກນວິເຄາະ ແລະ ແປງເອກະສານ... / Processing in Progress...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Render Converted output Preview */
        <div className="space-y-4 font-sans text-slate-800 dark:text-slate-200">
          {/* Top Action Toolbar */}
          <div className="flex flex-row flex-nowrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto scbar-none w-full select-none">
            <div className="flex flex-row flex-nowrap items-center gap-1.5 shrink-0">
              <button
                onClick={handleSaveToCabinet}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-705 dark:text-slate-100 bg-emerald-50 hover:bg-emerald-150 border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-350 hover:scale-102 transition shrink-0 cursor-pointer disabled:opacity-70"
                title="Save Changes to Cabinet"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>

              <div className="w-px h-5 bg-slate-250 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={() => {
                  const isUltraUser = userProfile?.subscriptionTier === "ultra";
                  if (!isUltraUser) {
                    setParsingError("ຂໍອະໄພ, ການແກ້ໄຂເອກະສານແມ່ນສະເພາະເວີຊັນ ULTRA ເທົ່ານັ້ນ. ກະລຸນາອັບເກຣດແພັກເກດຂອງທ່ານ! / Document editing is exclusive to ULTRA version. Please upgrade your plan.");
                    if (onUpgradeClick) {
                      onUpgradeClick();
                    }
                    return;
                  }
                  setIsEditing(!isEditing);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs whitespace-nowrap cursor-pointer hover:scale-102 ${
                  isEditing 
                    ? "bg-indigo-650 text-white hover:bg-indigo-700 border border-indigo-600 dark:bg-indigo-800 dark:border-indigo-750" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-250 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title={isEditing ? "Exit Edit Mode and View Final Draft" : "Turn on Edit Mode to Modify Fields & Text Directly - ULTRA Only"}
              >
                {isEditing ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>Done Editing</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Edit</span>
                    {userProfile?.subscriptionTier !== "ultra" && (
                      <span className="text-[8px] bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded font-extrabold uppercase font-mono ml-1">
                        Ultra
                      </span>
                    )}
                  </>
                )}
              </button>

              <div className="w-px h-5 bg-slate-250 dark:bg-slate-700 mx-0.5"></div>

              <button
                onClick={handleDownloadWord}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-102 transition whitespace-nowrap cursor-pointer"
                title="Export Microsoft Word (.DOC)"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Word</span>
              </button>

              <button
                onClick={handleDownloadExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-102 transition whitespace-nowrap cursor-pointer"
                title="Export Microsoft Excel (.XLS)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleDownloadPPT}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-102 transition whitespace-nowrap cursor-pointer"
                title="Export Slide PowerPoint (.PPTX)"
              >
                <Presentation className="w-3.5 h-3.5 text-amber-500" />
                <span>PowerPoint</span>
              </button>

              <button
                onClick={() => {
                  if (isFreeUser) {
                    setParsingError("ຂໍອະໄພ, ຟັງຊັນການພິມເອກະສານແມ່ນສະເພາະ PRO ຫຼື ULTRA ເທົ່ານັ້ນ. ກະລຸນາອັບເກຣດແພັກເກດຂອງທ່ານ! / The Print feature is exclusive to PRO or ULTRA tiers. Please upgrade to unlock.");
                    onUpgradeClick?.();
                  } else {
                    handlePrintDocument();
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:scale-102 transition whitespace-nowrap cursor-pointer ${
                  isFreeUser 
                    ? "text-amber-600 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/20 border border-amber-250/50 dark:border-amber-900/40 hover:bg-amber-50/40 dark:hover:bg-amber-950/40" 
                    : "text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title="Print Document directly on A4 paper format size with custom official settings (PRO+ exclusive)"
              >
                {isFreeUser ? (
                  <Lock className="w-3.5 h-3.5 text-amber-550 shrink-0" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-slate-650 dark:text-slate-400 shrink-0" />
                )}
                <span>Print</span>
                {isFreeUser && (
                  <span className="text-[8px] bg-amber-500 text-slate-950 px-1 py-0.5 rounded font-extrabold uppercase font-mono tracking-wider ml-1">
                    PRO+
                  </span>
                )}
              </button>

              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-102 transition whitespace-nowrap cursor-pointer"
                title="Copy Cleaned Plain Text"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{isCopied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <button
              onClick={() => { setConvertedResult(null); onClearSelected(); }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-105 transition whitespace-nowrap cursor-pointer shrink-0 ml-4 hover:scale-102"
            >
              <span>Close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
            {/* Side stats & Actions */}
            <div className="lg:col-span-12 space-y-4 order-2 block">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 text-xs transition-all duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="font-extrabold text-slate-950 dark:text-white flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-tiffany-500" />
                    <span>{isEditing ? "Edit Metadata / ປັບປຸງຂໍ້ມູນ" : "Document Details / ຂໍ້ມູນເອກະສານ"}</span>
                    {isFreeUser && (
                      <span className="text-[8px] bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-extrabold uppercase font-mono tracking-wider ml-1">
                        PRO/ULTRA Only
                      </span>
                    )}
                  </h4>
                  {isEditing && (
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded font-bold tracking-wide uppercase animate-pulse">
                      Edit Mode
                    </span>
                  )}
                </div>

                {/* Extraction Metadata Form & Inputs */}
                <div className="space-y-4">
                  {isFreeUser ? (
                    <div className="py-8 px-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3 select-none">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-550 flex items-center justify-center shadow-xs">
                        <Lock className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="space-y-1.5 max-w-sm">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          ຂໍ້ມູນເອກະສານ ສະເພາະເວີຊັນ PRO ແລະ ULTRA
                        </p>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                          ຟັງຊັນສະແດງຜົນ ແລະ ປັບແຕ່ງຂໍ້ມູນຫຍໍ້ຂອງເອກະສານແມ່ນສະເພາະເວີຊັນ PRO ຫຼື ULTRA ເທົ່ານັ້ນ. ກະລຸນາອັບເກຣດແພັກເກດຂອງທ່ານເພື່ອປົດລັອກ.
                        </p>
                        <p className="text-[10px] text-amber-650 dark:text-amber-450 font-bold leading-normal">
                          Document Details/Metadata overview is restricted to PRO or ULTRA users.
                        </p>
                      </div>
                      <button
                        onClick={onUpgradeClick}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-2 px-4 rounded-xl shadow-xs transition-all duration-200 hover:scale-102 flex items-center gap-1.5 cursor-pointer select-none"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>ອັບເກຣດເວີຊັນ / Upgrade Now</span>
                      </button>
                    </div>
                  ) : isEditing ? (
                    <>
                      <div className="space-y-1">
                        <label className="block text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">Document Title / Subject</label>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-505/25 focus:border-indigo-500 focus:outline-none focus:bg-white text-slate-900 dark:text-white"
                          placeholder="Untitled document"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">Ref Number</label>
                          <input
                            type="text"
                            value={editedRefNo}
                            onChange={(e) => setEditedRefNo(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-505/25 focus:border-indigo-500 focus:outline-none focus:bg-white text-slate-900 dark:text-white"
                            placeholder="e.g. 102/ກະຊວງ"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">Letter Date</label>
                          <input
                            type="text"
                            value={editedRefDate}
                            onChange={(e) => setEditedRefDate(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-505/25 focus:border-indigo-500 focus:outline-none focus:bg-white text-slate-900 dark:text-white"
                            placeholder="e.g. 15.05.2026"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">Sender Department</label>
                          <input
                            type="text"
                            value={editedSender}
                            onChange={(e) => setEditedSender(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-505/25 focus:border-indigo-500 focus:outline-none focus:bg-white text-slate-905 dark:text-white"
                            placeholder="Primary Sender"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">Recipient Agency</label>
                          <input
                            type="text"
                            value={editedReceiver}
                            onChange={(e) => setEditedReceiver(e.target.value)}
                            className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-550/25 focus:border-indigo-505 focus:outline-none focus:bg-white text-slate-909 dark:text-white"
                            placeholder="Primary Recipient"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">Summary Note</label>
                        <textarea
                          rows={4}
                          value={editedSummary}
                          onChange={(e) => setEditedSummary(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-250 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-505/25 focus:border-indigo-500 focus:outline-none focus:bg-white text-slate-950 dark:text-white font-serif italic"
                          placeholder="Write executive summary here..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">SUBJECT / ຫົວຂໍ້ເອກະສານ</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5 text-xs sm:text-sm">{editedTitle || "Untitled"}</p>
                      </div>

                      {editedRefNo && (
                        <div>
                          <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">ADMIN REFERENCE NO</span>
                          <p className="font-mono font-semibold text-slate-850 dark:text-slate-200 mt-0.5">{editedRefNo}</p>
                        </div>
                      )}

                      {editedRefDate && (
                        <div>
                          <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">LETTER DATE</span>
                          <p className="font-mono text-slate-850 dark:text-slate-200 mt-0.5">{editedRefDate}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">SENDER</span>
                          <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{editedSender || "-"}</p>
                        </div>
                        <div>
                          <span className="block text-xxs font-mono text-slate-400 font-bold uppercase">RECIPIENT</span>
                          <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{editedReceiver || "-"}</p>
                        </div>
                      </div>

                      {editedSummary && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-lg">
                          <span className="block text-xxs font-mono text-tiffany-600 dark:text-tiffany-450 font-bold uppercase">SUMMARY OVERVIEW</span>
                          <p className="text-slate-650 dark:text-slate-300 mt-1 italic leading-relaxed text-[11px] font-serif">{editedSummary}</p>
                        </div>
                      )}
                      {activeDocument?.recommendedFormat && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-150 dark:border-indigo-800/40 rounded-lg">
                          <span className="block text-xxs font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase">AI EXPORT RECOMMENDATION</span>
                          <p className="text-slate-650 dark:text-slate-300 mt-1 leading-relaxed text-[11px]">Based on the file content's layout, AI recommends exporting this to: <strong>{activeDocument.recommendedFormat}</strong>.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Render HTML Document Area */}
            <div className="lg:col-span-12 order-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden min-h-[900px]">
              {/* Simulation Header Header */}
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-red-400 shadow-xs"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-xs"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-xs"></span>
                  <span className="text-[10px] text-slate-500 font-mono pl-2">A4 Layout Preview (.DOCX Export Equivalent)</span>
                </div>
                <div className="flex items-center">
                  <FileType className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Document Body Wrapper - Scrollable Editor Pane */}
              <div className="p-2 sm:p-6 lg:p-8 overflow-x-hidden overflow-y-auto bg-slate-200/50 dark:bg-slate-900 flex-1 flex flex-col justify-start items-center w-full">
                
                {/* Formatter Warning info banner */}
                {isEditing && (
                  <div className="w-full max-w-[850px] mb-3 p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 text-[10px] rounded-xl flex items-center gap-2 shadow-xxs transform transition duration-300 select-none">
                    <Edit className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span><strong>ໂໝດແກ້ໄຂເປີດຢູ່:</strong> ທ່ານສາມາດຄລິກໃສ່ຂໍ້ຄວາມພາຍໃນເຈ້ຍ A4 ດ້ານລຸ່ມນີ້ເພື່ອປ່ຽນແປງ ຫຼື ພິມຂໍ້ຄວາມໃຫມ່ໄດ້ທັນທີ. / <strong>Edit mode active:</strong> Click anywhere inside the text document on the sheet below to edit or reformat.</span>
                  </div>
                )}

                {/* Formatting Rich-Text Toolbar when isEditing is True */}
                {isEditing && (
                  <div className="w-full max-w-[850px] mb-3 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl p-2 shadow-xs flex flex-wrap items-center gap-2 select-none">
                    {/* Basic Styling Group */}
                    <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
                      <button
                        onClick={() => applyStyle("bold")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Bold / ຕົວໜາ"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyStyle("italic")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Italic / ຕົວອຽງ"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyStyle("underline")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Underline / ຂີດກ້ອງ"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Alignment Group */}
                    <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
                      <button
                        onClick={() => applyStyle("justifyLeft")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Align Left / ຈັດຊ້າຍ"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyStyle("justifyCenter")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Align Center / ຈັດກາງ"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyStyle("justifyRight")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Align Right / ຈັດຂວາ"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => applyStyle("justifyFull")}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-200 cursor-pointer transition active:scale-95"
                        title="Justify / ຈັດສະເໝີຂ້າງ"
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Color selection dot group */}
                    <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
                      <span className="text-[9px] text-slate-400 font-bold mr-1 uppercase">Color:</span>
                      <button
                        onClick={() => applyStyle("foreColor", "#0f172a")}
                        className="w-4 h-4 rounded-full bg-slate-900 border border-white dark:border-slate-700 hover:scale-125 transition shadow-xxs cursor-pointer"
                        title="Black / ດຳ"
                      />
                      <button
                        onClick={() => applyStyle("foreColor", "#dc2626")}
                        className="w-4 h-4 rounded-full bg-red-600 border border-white dark:border-slate-700 hover:scale-125 transition shadow-xxs cursor-pointer"
                        title="Red / ແດງ"
                      />
                      <button
                        onClick={() => applyStyle("foreColor", "#2563eb")}
                        className="w-4 h-4 rounded-full bg-blue-600 border border-white dark:border-slate-700 hover:scale-125 transition shadow-xxs cursor-pointer"
                        title="Blue / ຟ້າ"
                      />
                      <button
                        onClick={() => applyStyle("foreColor", "#059669")}
                        className="w-4 h-4 rounded-full bg-emerald-600 border border-white dark:border-slate-700 hover:scale-125 transition shadow-xxs cursor-pointer"
                        title="Green / ຂຽວ"
                      />
                      <button
                        onClick={() => applyStyle("foreColor", "#d97706")}
                        className="w-4 h-4 rounded-full bg-amber-600 border border-white dark:border-slate-700 hover:scale-125 transition shadow-xxs cursor-pointer"
                        title="Amber / ເຫຼືອງ"
                      />
                    </div>

                    {/* Insertion of Images and Photos */}
                    <div className="flex items-center gap-1">
                      <input
                        type="file"
                        ref={insertImageRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleInsertImage}
                      />
                      <button
                        onClick={() => insertImageRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition cursor-pointer active:scale-97 border border-indigo-150 dark:border-indigo-950"
                        title="Insert Photo / ວາງຮູບພາບ"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>Insert Photo / ຮູບພາບ</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dynamic Photo Control Widget when an Image is Selected in Edit Mode */}
                {isEditing && selectedImage && (
                  <div className="w-full max-w-[850px] mb-3 bg-indigo-50 border border-indigo-200 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-850 dark:text-indigo-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in select-none">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                      <span className="text-xs font-bold font-mono">PHOTO CONTROLS / ປັບແຕ່ງຮູບພາບ:</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Floating alignment options */}
                      <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Position:</span>
                      <button 
                        onClick={() => adjustImageStyle("float", "left")}
                        className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer"
                        title="Float Left (Text wraps on right) / ຕິດຊ້າຍ"
                      >
                        Float Left
                      </button>
                      <button 
                        onClick={() => adjustImageStyle("float", "right")}
                        className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer"
                        title="Float Right (Text wraps on left) / ຕິດຂວາ"
                      >
                        Float Right
                      </button>
                      <button 
                        onClick={() => adjustImageStyle("float", "none")}
                        className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer"
                        title="Centered Block (Text breaks to next line) / ຈັດກາງ"
                      >
                        Center
                      </button>
                      <button 
                        onClick={() => adjustImageStyle("float", "inline")}
                        className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer"
                        title="Continuous Inline Flow / ແຖວດຽວ"
                      >
                        Inline
                      </button>

                      <div className="w-px h-4 bg-slate-250 dark:bg-slate-750 mx-1"></div>

                      {/* Resizing options */}
                      <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 font-mono">Size:</span>
                      <button 
                        onClick={() => adjustImageStyle("size", "increase")}
                        className="p-1 px-2.5 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer flex items-center gap-1"
                        title="Increase Photo Width / ຂະຫຍາຍໃຫຍ່ຂຶ້ນ"
                      >
                        <Maximize2 className="w-3 h-3 text-emerald-500" />
                        <span>+10%</span>
                      </button>
                      <button 
                        onClick={() => adjustImageStyle("size", "decrease")}
                        className="p-1 px-2.5 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer flex items-center gap-1"
                        title="Decrease Photo Width / ຫຍໍ້ຂະໜາດລົງ"
                      >
                        <Minimize2 className="w-3 h-3 text-amber-500" />
                        <span>-10%</span>
                      </button>

                      <div className="w-px h-4 bg-slate-250 dark:bg-slate-750 mx-1"></div>

                      {/* Delete option */}
                      <button 
                        onClick={() => adjustImageStyle("delete")}
                        className="p-1 px-2.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title="Remove Photo from Document / ລົບຮູບພາບ"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Responsive scaling container */}
                <div 
                  ref={previewContainerRef} 
                  className="w-full flex justify-center items-start overflow-hidden py-4 select-none bg-slate-200/20 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/30"
                  style={{ 
                    height: previewScale < 1 ? `${1150 * previewScale + 60}px` : "auto" 
                  }}
                >
                  <div 
                    className={`a4-page-standard gov-letter-preview bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 shadow-xl sm:shadow-2xl rounded-sm text-slate-900 dark:text-slate-100 relative selection:bg-indigo-200 dark:selection:bg-indigo-800/80 ring-1 ring-slate-900/5 transition-all`}
                    id="digital-letter-output"
                    style={{
                      transform: previewScale < 1 ? `scale(${previewScale})` : "none",
                      transformOrigin: "top center",
                      width: "820px", 
                      minWidth: "820px",
                      minHeight: "1120px",
                      padding: "2cm 2cm 2cm 3cm",
                      margin: 0,
                    }}
                  >
                  {/* Government Official emblem visual indicator placeholder */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center text-[9px] text-slate-300 tracking-widest font-mono uppercase select-none">
                    A4 Formal Layout Boundary
                  </div>

                  <div 
                    ref={editorRef}
                    contentEditable={isEditing}
                    spellCheck={false}
                    suppressContentEditableWarning={true}
                    onInput={(e) => {
                      setEditedHtml(e.currentTarget.innerHTML);
                    }}
                    onBlur={(e) => {
                      setEditedHtml(e.currentTarget.innerHTML);
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === "IMG") {
                        setSelectedImage(target as HTMLImageElement);
                      } else {
                        setSelectedImage(null);
                      }
                    }}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (items) {
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf("image") !== -1) {
                            const file = items[i].getAsFile();
                            if (file) {
                              e.preventDefault();
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                const imgHtml = `<img src="${base64}" class="inserted-document-photo rounded-xl shadow-md border border-slate-200 dark:border-slate-800 transition-all duration-200" style="max-width: 50%; max-height: 350px; object-fit: contain; margin: 12px; display: inline-block; cursor: move; vertical-align: middle; float: none;" alt="inserted asset" />&nbsp;`;
                                
                                let inserted = false;
                                if (window.getSelection) {
                                  const sel = window.getSelection();
                                  if (sel && sel.getRangeAt && sel.rangeCount) {
                                    const range = sel.getRangeAt(0);
                                    if (editorRef.current?.contains(range.startContainer)) {
                                      range.deleteContents();
                                      const el = document.createElement("div");
                                      el.innerHTML = imgHtml;
                                      const frag = document.createDocumentFragment();
                                      let node;
                                      while ((node = el.firstChild)) {
                                        frag.appendChild(node);
                                      }
                                      range.insertNode(frag);
                                      inserted = true;
                                    }
                                  }
                                }
                                
                                if (!inserted && editorRef.current) {
                                  editorRef.current.innerHTML += imgHtml;
                                }

                                if (editorRef.current) {
                                  setEditedHtml(editorRef.current.innerHTML);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: editedHtml || activeDocument.convertedText || "" }}
                    className={`pt-4 text-[13px] sm:text-sm global-doc-font leading-loose outline-none focus:outline-none w-full min-h-[960px] ${
                      isEditing ? "border border-dashed border-indigo-300 dark:border-indigo-750 p-4 rounded bg-indigo-50/5" : ""
                    }`}
                  />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {showApiKeyModal && (
        <ApiKeyModal onClose={() => setShowApiKeyModal(false)} isLao={isLao} />
      )}
    </div>
  );
}
