import { useState } from "react";
import { X, KeyRound, Check, ExternalLink, Sparkles } from "lucide-react";
import { AIProvider, StoredKeys, loadKeys, saveKeys, detectProvider } from "../lib/aiKeys";

interface ApiKeyModalProps {
  onClose: () => void;
  isLao?: boolean;
}

interface ProviderMeta {
  id: AIProvider;
  name: string;
  placeholder: string;
  hint: string;
  hintLao: string;
  getKeyUrl: string;
  defaultModel: string;
  free: boolean;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    placeholder: "AIza...",
    hint: "Free tier. Reads photos AND PDFs. Best free option.",
    hintLao: "ໃຊ້ຟຣີ. ອ່ານຮູບພາບ ແລະ ໄຟລ໌ PDF ໄດ້. ແນະນຳໃຫ້ໃຊ້.",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    defaultModel: "gemini-2.5-flash",
    free: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    placeholder: "sk-or-...",
    hint: "One key, many models — including FREE vision models that read photos.",
    hintLao: "ກະແຈດຽວ ໃຊ້ໄດ້ຫຼາຍໂມເດວ ລວມທັງໂມເດວຟຣີທີ່ອ່ານຮູບພາບໄດ້.",
    getKeyUrl: "https://openrouter.ai/keys",
    defaultModel: "meta-llama/llama-3.2-11b-vision-instruct:free",
    free: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    hint: "GPT-4o / GPT-4o-mini. Reads photos (paid). PDFs need Gemini.",
    hintLao: "GPT-4o / GPT-4o-mini. ອ່ານຮູບພາບໄດ້ (ເສຍຄ່າ). PDF ໃຫ້ໃຊ້ Gemini.",
    getKeyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
    free: false,
  },
];

export default function ApiKeyModal({ onClose, isLao = true }: ApiKeyModalProps) {
  const [keys, setKeys] = useState<StoredKeys>(() => loadKeys());
  const [saved, setSaved] = useState(false);

  const activeProvider: AIProvider = keys.active || "gemini";

  const updateKey = (id: AIProvider, value: string) => {
    setKeys((prev) => {
      const next: StoredKeys = { ...prev, [id]: value };
      // Auto-select the first provider the user types a key into.
      if (value.trim() && !prev.active) next.active = detectProvider(value);
      return next;
    });
    setSaved(false);
  };

  const updateModel = (id: AIProvider, value: string) => {
    setKeys((prev) => ({ ...prev, models: { ...(prev.models || {}), [id]: value } }));
    setSaved(false);
  };

  const setActive = (id: AIProvider) => {
    setKeys((prev) => ({ ...prev, active: id }));
    setSaved(false);
  };

  const handleSave = () => {
    saveKeys(keys);
    setSaved(true);
    setTimeout(() => onClose(), 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-tiffany-500/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-tiffany-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isLao ? "ກະແຈ AI ຂອງທ່ານ" : "Your AI Keys"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isLao
                  ? "ໃສ່ກະແຈຂອງທ່ານເອງ ເກັບໄວ້ໃນເຄື່ອງທ່ານເທົ່ານັ້ນ"
                  : "Use your own key — stored only on your device"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              {isLao
                ? "ໃສ່ກະແຈຢ່າງໜ້ອຍ 1 ອັນ ແລ້ວກົດເລືອກໃຫ້ເປັນຕົວໃຊ້ງານ. ເມື່ອມີກະແຈ ເຄື່ອງມືທັງໝົດຈະໃຊ້ໄດ້ບໍ່ຈຳກັດ."
                : "Add at least one key and mark it active. Once a key is set, all tools work with no daily limit."}
            </p>
          </div>

          {PROVIDERS.map((p) => {
            const isActive = activeProvider === p.id;
            const val = keys[p.id] || "";
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3.5 transition ${
                  isActive
                    ? "border-tiffany-400 dark:border-tiffany-600 bg-tiffany-50/40 dark:bg-tiffany-950/10"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{p.name}</span>
                    {p.free && (
                      <span className="text-[8px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                        Free
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActive(p.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition flex items-center gap-1 ${
                      isActive
                        ? "bg-tiffany-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3" />}
                    {isActive ? (isLao ? "ກຳລັງໃຊ້" : "Active") : isLao ? "ເລືອກ" : "Use this"}
                  </button>
                </div>

                <input
                  type="password"
                  value={val}
                  onChange={(e) => updateKey(p.id, e.target.value)}
                  placeholder={p.placeholder}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-tiffany-400"
                />

                <input
                  type="text"
                  value={keys.models?.[p.id] ?? ""}
                  onChange={(e) => updateModel(p.id, e.target.value)}
                  placeholder={`${isLao ? "ໂມເດວ" : "Model"} (${p.defaultModel})`}
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 focus:outline-none focus:border-tiffany-400"
                />

                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-slate-400 leading-tight pr-2">{isLao ? p.hintLao : p.hint}</p>
                  <a
                    href={p.getKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-tiffany-600 dark:text-tiffany-400 hover:underline shrink-0 flex items-center gap-0.5"
                  >
                    {isLao ? "ເອົາກະແຈ" : "Get key"} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-2xl">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-tiffany-500 hover:bg-tiffany-600 text-white font-bold text-sm cursor-pointer transition flex items-center justify-center gap-2"
          >
            {saved ? <Check className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            {saved ? (isLao ? "ບັນທຶກແລ້ວ" : "Saved") : isLao ? "ບັນທຶກກະແຈ" : "Save keys"}
          </button>
        </div>
      </div>
    </div>
  );
}
