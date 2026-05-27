import React, { useState } from "react";
import { Sparkles, RefreshCw, FileText, Check, ChevronDown, Wand2, Info } from "lucide-react";

interface AutomatedDocumentDrafterProps {
  onGenerate: (draftText: string, instruction: string, targetLanguage: string) => void;
  isProcessing: boolean;
  parsingError: string | null;
  draftCount?: number;
  maxDrafts?: number | string;
}

export default function AutomatedDocumentDrafter({
  onGenerate,
  isProcessing,
  parsingError,
  draftCount = 0,
  maxDrafts = 10,
}: AutomatedDocumentDrafterProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("Lao");
  const [selectedDocumentType, setSelectedDocumentType] = useState("Auto-Detect");
  const [draftText, setDraftText] = useState("");

  const DOCUMENT_TYPES = [
    { id: "Auto-Detect", label: "✨ Auto-Detect via AI / ກວດສອບອັດຕະໂນມັດ" },
    { id: "ລັດຖະບັນຍັດ", label: "ລັດຖະບັນຍັດ (Decree)" },
    { id: "ລັດຖະດຳລັດ", label: "ລັດຖະດຳລັດ (Presidential Decree)" },
    { id: "ດຳລັດ", label: "ດຳລັດ (Government Decree)" },
    { id: "ມະຕິ", label: "ມະຕິ (Resolution)" },
    { id: "ຂໍ́ຕົກລົງ", label: "ຂໍ້ຕົກລົງ (Decision)" },
    { id: "ຄຳສັ່ງ", label: "ຄຳສັ່ງ (Order)" },
    { id: "ຄຳແນະນຳ", label: "ຄຳແນະນຳ (Instruction)" },
    { id: "ແຈ້ງການ", label: "ແຈ້ງການ (Notice)" },
    { id: "ບົດບັນທຶກ", label: "ບົດບັນທຶກ (Memorandum)" },
    { id: "ບົດລາຍງານ", label: "ບົດລາຍງານ (Report)" },
    { id: "ໜັງສືສະເໜີ", label: "ໜັງສືສະເໜີ (Proposal Letter)" },
    { id: "ໜັງສືຕອບ", label: "ໜັງສືຕອບ (Reply Letter)" },
    { id: "ໃບມອບສິດ", label: "ໃບມອບສິດ (Power of Attorney)" },
    { id: "ໃບຢັ້ງຢືນ", label: "ໃບຢັ້ງຢືນ (Certificate)" },
  ];

  const SUGGESTIONS = [
    {
      title: "📝 ຂໍລາພັກວຽກ / Sick Leave Request",
      text: "ຂ້າພະເຈົ້າ ຂໍອະນຸຍາດລາພັກວຽກ ເປັນເວລາ 3 ມື້ (ເລີ່ມແຕ່ ວັນທີ 27-29 ພຶດສະພາ 2026) ເນື່ອງຈາກມີອາການເຈັບປ່ວຍ ແລະ ຕ້ອງໄດ້ພັກຜ່ອນຕາມຄຳແນະນຳຂອງແພດ. ຈຶ່ງຮຽນສະເໜີມາຍັງ ທ່ານ ຫົວໜ້າພະແນກ ເພື່ອພິຈາລະນາອະນຸມັດຊ່ວຍ.",
    type: "ໃບຢັ້ງຢືນ",
    lang: "Lao"
  },
  {
    title: "📊 ບົດລາຍງານປະຊຸມ / Meeting Summary",
    text: "ບົດລາຍງານ ຜົນການປະຊຸມ ວັນທີ 25 ພຶດສະພາ 2026 ກ່ຽວກັບການປົບປຸງລະບົບເອກະສານ ແລະ ການຫັນເປັນດີຈີຕອນພາຍໃນຫ້ອງການບໍລິຫານ. ຜູ້ນຳສະເໜີໄດ້ລາຍງານຄວາມຄືບໜ້າ 85% ແລະ ທຸກພາກສ່ວນໄດ້ຕົກລົງເຫັນດີໃນການນຳໃຊ້ລະບົບໃໝ່ຢ່າງເປັນທາງການພາຍໃນເດືອນໜ້າ.",
    type: "ບົດລາຍງານ",
    lang: "Lao"
  },
  {
    title: "💰 ໜັງສືສະເໜີງົບ / Budget Letter",
    text: "ຂໍສະເໜີອະນຸມັດງົບປະມານຈຳນວນ 15,000,000 ກີບ ເພື່ອຈັດຊື້ເຄື່ອງຄອມພິວເຕີ ແລະ ອຸປະກອນໄອທີ ຮັບໃຊ້ເຂົ້າໃນວຽກງານບໍລິຫານເອກະສານຂອງຫ້ອງການ ໃຫ້ມີຄວາມສະດວກ, ທັນສະໄໝ ແລະ ວ່ອງໄວຂຶ້ນກວ່າເກົ່າ.",
    type: "ໜັງສືສະເໜີ",
    lang: "Lao"
  },
  {
    title: "📢 ແຈ້ງການຢຸດພັກ / Holiday Notice",
    text: "ແຈ້ງການເຖິງ ພະນັກງານ-ລັດຖະກອນ ທຸກທ່ານ ຊາບວ່າ: ເນື່ອງໃນໂອກາດວັນພັກບຸນປະເພນີ, ຫ້ອງການຂອງພວກເຮົາ ຈະໄດ້ຢຸດພັກວຽກຊົ່ວຄາວເປັນເວລາ 1 ມື້ ໃນວັນທີ 1 ມິຖຸນາ 2026 ແລະ ຈະເປີດເຮັດວຽກປົກກະຕິໃນວັນຕໍ່ໄປ.",
    type: "ແຈ້ງການ",
    lang: "Lao"
  },
  {
    title: "🤝 ໃບມອບສິດ / Power of Attorney",
    text: "ຂ້າພະເຈົ້າ ຂໍມອບສິດຢ່າງເປັນທາງການໃຫ້ແກ່ ທ່ານ ສົມພອນ ສີປະເສີດ, ຮອງຫົວໜ້າພະແນກ, ມີສິດເຕັມສ່ວນໃນການເຊັນອະນຸມັດເອກະສານບໍລິຫານພາຍໃນ ແລະ ເຂົ້າຮ່ວມກອງປະຊຸມຕ່າງໆ ແທນຂ້າພະເຈົ້າ ໃນໄລຍະທີ່ຕິດພັນວຽກທາງການຢູ່ນອກສະຖານທີ່.",
    type: "ໃບມອບສິດ",
    lang: "Lao"
  }
];

  const handleGenerate = () => {
    onGenerate(draftText, selectedDocumentType, selectedLanguage);
  };

  const applySuggestion = (text: string, type: string, lang: string) => {
    setDraftText(text);
    setSelectedDocumentType(type);
    setSelectedLanguage(lang);
  };

  return (
    <div className="space-y-6">
      {/* Premium, Clean Main Container */}
      <div className="bg-slate-50/30 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-1 px-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Wand2 className="w-3.5 h-3.5" />
            </span>
            <h3 className="font-sans font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Automated Document Drafter
            </h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/20">
              📊 {draftCount}/{maxDrafts}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {/* 1. Grid of Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selector */}
            <div className="relative">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1.5 flex items-center space-x-1">
                <span>1. ເລືອກພາສາ / Target Language</span>
              </label>
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-xs appearance-none cursor-pointer transition-all"
                >
                  <option value="Lao">Lao (Default)</option>
                  <option value="English">English</option>
                  <option value="Chinese">Chinese</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Type Dropdown */}
            <div className="relative">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1.5 flex items-center space-x-1">
                <span>2. ປະເພດເອກະສານ / Document Type</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-xs appearance-none cursor-pointer transition-all"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 2. Interactive Template Prompt Ideas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center space-x-1">
                <span>💡 ຄລິກເລືອກແນວຄວາມຄິດ ຫຼື ຕົວຢ່າງ / Quick Templates & Prompts</span>
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3" /> Auto-fills Text & Fields
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1 pb-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
              {SUGGESTIONS.map((sug, i) => {
                const isActive = draftText === sug.text;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(sug.text, sug.type, sug.lang)}
                    className={`text-[11px] text-left px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium"
                        : "bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <span>{sug.title}</span>
                    {isActive && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Redesigned Text Area */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1.5 flex items-center justify-between">
              <span>3. ປ້ອນລາຍລະອຽດທີ່ຕ້ອງການຮ່າງ / What do you want to write?</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {draftText.length} characters
              </span>
            </label>
            <div className="relative">
              <textarea
                rows={5}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="e.g. ຂຽນໃບສະເໜີຂໍອະນຸມັດອຸປະກອນໄອທີ ຫ້ອງການປະຖົມສົມບູນ 15 ລ້ານກີບ ຫຼື ໃບສະເໜີວຽກງານ..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm resize-none transition-all leading-relaxed"
              />
              {draftText && (
                <button
                  type="button"
                  onClick={() => setDraftText("")}
                  className="absolute bottom-3 right-3 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Elegant Premium Submit Button with Simple Name */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleGenerate}
          disabled={isProcessing || !draftText.trim()}
          className={`px-8 py-3 rounded-xl text-xs font-bold transition-all flex items-center shadow-md transform active:scale-98 space-x-2 shrink-0 ${
            isProcessing || !draftText.trim()
              ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed border border-slate-250 dark:border-slate-700 shadow-none"
              : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer border border-emerald-600 shadow-md hover:shadow-emerald-500/10"
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="animate-spin w-4 h-4" />
              <span>Drafting Administrative Document...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Draft Document</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

