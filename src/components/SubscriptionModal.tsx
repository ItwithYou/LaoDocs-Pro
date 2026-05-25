import { SUBSCRIPTION_PLANS, SubscriptionPlan, UserProfile, PaymentSettings } from "../types";
import { db, handleFirestoreError, OperationType, safeGetDoc, safeGetDocs, safeSetDoc, safeUpdateDoc } from "../firebase";
import { doc, serverTimestamp, query, collection, where } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Check, CreditCard, Sparkles, X, Shield, Award, Upload, ExternalLink, Globe } from "lucide-react";
import { useLanguage } from "../contexts";

interface SubscriptionModalProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onUpdateProfile: (newTier: "free" | "pro" | "ultra") => void;
}

export default function SubscriptionModal({ userProfile, onClose, onUpdateProfile }: SubscriptionModalProps) {
  const { isLao } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<"LAK" | "USD">("LAK");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNo, setCardNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [slipBase64, setSlipBase64] = useState<string | null>(null);

  const [bankQrUrlPro, setBankQrUrlPro] = useState<string | null>(null);
  const [bankQrUrlUltra, setBankQrUrlUltra] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await safeGetDoc(docRef);
        if (docSnap.exists()) {
          setBankQrUrlPro(docSnap.data().bankQrUrlPro || docSnap.data().bankQrUrl || null);
          setBankQrUrlUltra(docSnap.data().bankQrUrlUltra || docSnap.data().bankQrUrl || null);
        }
      } catch (err) {
        console.error("Error fetching payment settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const submitSubscriptionRequest = async (planId: "pro" | "ultra") => {
    if (!userProfile || !slipBase64) return;
    setIsProcessing(true);
    try {
      const q = query(collection(db, "subscriptionRequests"), where("userId", "==", userProfile.userId), where("status", "==", "pending"));
      const snap = await safeGetDocs(q);
      if (!snap.empty) {
        alert("You already have a pending request. Please wait for admin approval.");
        setIsProcessing(false);
        return;
      }
      
      const reqId = "req_" + Math.random().toString(36).substring(2, 11);
      const reqRef = doc(db, "subscriptionRequests", reqId);
      await safeSetDoc(reqRef, {
        id: reqId,
        userId: userProfile.userId,
        email: userProfile.email,
        displayName: userProfile.displayName || "",
        requestedTier: planId,
        slipBase64: slipBase64,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("Payment slip submitted! Admin will verify soon. \nສົ່ງບິນສຳເລັດ! ກະລຸນາລໍຖ້າແອັດມິນກວດສອບ.");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error submitting slip");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = async (planId: "free" | "pro" | "ultra") => {
    if (!userProfile) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, "users", userProfile.userId);
      await safeUpdateDoc(userRef, {
        subscriptionTier: planId,
        updatedAt: serverTimestamp(),
      });
      onUpdateProfile(planId);
      setSelectedPlan(null);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      setIsProcessing(false);
      handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.userId}`);
    }
  };

  const isCurrentPlan = (planId: string) => userProfile && userProfile.subscriptionTier === planId;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" id="pricing-modal-overlay">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>{isLao ? "ລາຄາ ແລະ ສະໝັກບໍລິການ" : "Pricing & Subscriptions"}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isLao ? "ປົດລັອກການແປງໄຟລ໌ PDF-to-Word ແລະ ປ່ຽນຟອນເອກະສານທາງການລາວຢ່າງມີປະສິດທິພາບ" : "Unleash powerful PDF-to-Word & font conversions for Lao official letters"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!selectedPlan ? (
            <div className="grid md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrent = userProfile?.subscriptionTier === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                      isCurrent
                        ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/10"
                        : "border-slate-205 hover:border-indigo-400 hover:shadow-md"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{isLao ? plan.nameLao : plan.name}</h3>
                        {isCurrent && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                            {isLao ? "ແພັກເກັດປັດຈຸບັນ" : "Active Plan"}
                          </span>
                        )}
                      </div>
                      <p className="text-xxs font-mono text-slate-400 mt-0.5">{isLao ? plan.supportTypeLao : plan.supportType}</p>

                      <div className="my-4">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {plan.priceUSD === 0 ? (isLao ? "ຟຣີ" : "Free") : `$${plan.priceUSD}`}
                        </span>
                        {plan.priceUSD > 0 && <span className="text-xs text-slate-500"> / {isLao ? plan.periodLao : plan.period}</span>}
                        {plan.priceLAK > 0 && (
                          <div className="text-xs text-indigo-700 font-mono mt-0.5">
                            ~ {plan.priceLAK.toLocaleString()} LAK / {isLao ? "ເດືອນ" : "month"}
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

                      <ul className="space-y-2.5 mb-6 text-xs text-slate-600 dark:text-slate-350">
                        {(isLao ? plan.perksLao : plan.perks).map((perk, i) => (
                          <li key={i} className="flex items-start">
                            <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      disabled={isCurrent}
                      onClick={() => {
                        if (plan.id === "free") {
                          handleUpgrade("free");
                        } else {
                          setSelectedPlan(plan);
                        }
                      }}
                      className={`w-full py-2 px-4 rounded-xl font-medium text-xs transition select-none cursor-pointer ${
                        isCurrent
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          : plan.id === "free"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      }`}
                    >
                      {isCurrent ? (isLao ? "ແພັກເກັດປັດຈຸບັນ" : "Active Plan") : (isLao ? `ເລືອກ ${plan.nameLao}` : `Choose ${plan.name}`)}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Multi-Currency Dual Billing UI (LAK via QR or USD via Credit Card) */
            <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs animate-in fade-in duration-200">
              
              {/* Header inside billing */}
              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                  {paymentCurrency === "LAK" ? <Award className="w-5 h-5 animate-pulse" /> : <CreditCard className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isLao ? "ເລືອກວິທີການຊຳລະເງິນ" : "Choose Payment Method"}
                  </h3>
                  <p className="text-xxs text-slate-500 dark:text-slate-400">
                    {isLao ? "ຮອງຮັບການຈ່າຍດ້ວຍ QR ຂອງທະນາຄານລາວ ຫຼື ບັດເຄຣດິດ USD" : "Supports local Lao bank QR transfer or international USD credit card"}
                  </p>
                </div>
              </div>

              {/* Order summary info bar */}
              <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-5 flex justify-between items-center shadow-xxs">
                <div>
                  <p className="text-xs font-bold text-slate-850 dark:text-slate-150">
                    {isLao ? selectedPlan.nameLao : selectedPlan.name} Tier
                  </p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {isLao 
                      ? `ໂຄຕ້າ AI & OCR: ${selectedPlan.maxTokensPerOcr.toLocaleString()} ຕົວອັກສອນ` 
                      : `AI & OCR limit: ${selectedPlan.maxTokensPerOcr.toLocaleString()} tokens`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {paymentCurrency === "LAK" ? `${selectedPlan.priceLAK.toLocaleString()} LAK` : `$${selectedPlan.priceUSD}`}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    /{isLao ? selectedPlan.periodLao : selectedPlan.period}
                  </p>
                </div>
              </div>

              {/* DUAL CURRENCY NAVIGATION SELECTOR */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setPaymentCurrency("LAK")}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition duration-150 cursor-pointer select-none ${
                    paymentCurrency === "LAK"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-500 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="text-sm">🇱🇦</span>
                  <span>{isLao ? "ເງິນກີບ LAK (BCEL QR)" : "Lao Kip LAK (QR)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentCurrency("USD")}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition duration-150 cursor-pointer select-none ${
                    paymentCurrency === "USD"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-500 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="text-sm">🇺🇸</span>
                  <span>{isLao ? "ບັດໂດລາ USD (Card)" : "US Dollar USD (Card)"}</span>
                </button>
              </div>

              {/* CONDITION 1: LAK QR CODE PAYMENT (BCEL One) */}
              {paymentCurrency === "LAK" ? (
                <div className="mb-5 flex flex-col items-center bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 animate-in fade-in duration-150">
                  <p className="text-xs font-black mb-1.5 text-slate-800 dark:text-slate-200 text-center">
                    {isLao ? "ຫຼ້າສຸດ: ບັດສະແກນຜ່ານ BCEL One / ທຸກທະນາຄານ" : "Scan via BCEL One / All Lao Banks"}
                  </p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-extrabold text-center mb-3">
                    {isLao 
                      ? `ຍອດໂອນ: ${selectedPlan.priceLAK.toLocaleString()} ກີບ (LAK)` 
                      : `Total Due: ${selectedPlan.priceLAK.toLocaleString()} LAK`}
                  </p>

                  {/* QR Image fallback dynamically */}
                  <div className="relative p-2 bg-white rounded-xl shadow-xs border border-slate-100 max-w-[200px] aspect-square mb-3.5 flex items-center justify-center">
                    <img
                      src={selectedPlan.id === "ultra" 
                        ? (bankQrUrlUltra || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://laodocs.com/pay/ultra-150k&color=0f172a`)
                        : (bankQrUrlPro || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://laodocs.com/pay/pro-100k&color=0f172a`)
                      }
                      alt="BCEL One Bank QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                  
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mb-4 leading-normal">
                    {isLao 
                      ? "ສະແກນຈ່າຍດ້ວຍ QR ດ້ານເທິງ, ຈາກນັ້ນອັບໂຫຼດສະລິບການໂອນເງິນຂອງທ່ານເພື່ອໃຫ້ແອັດມິນອະນຸມັດ." 
                      : "Scan with your banking app to transfer, then upload the receipt below for admin verification."}
                  </p>
                  
                  {/* Upload Drop Zone */}
                  <div className="w-full relative border-2 border-dashed border-indigo-150 dark:border-indigo-900/40 bg-indigo-50/15 dark:bg-indigo-900/5 rounded-xl p-3 flex flex-col items-center">
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-extrabold mb-1.5 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      {isLao ? "ອັບໂຫຼດໃບບິນ (PNG/JPG)" : "Attach Payment Slip (PNG/JPG)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSlipBase64(reader.result as string);
                          };
                          reader.readAsDataURL(f);
                        }
                      }}
                      className="text-[9px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-100 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-200 dark:hover:file:bg-indigo-900/50 w-full dark:text-slate-300"
                    />
                    {slipBase64 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black mt-2 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        {isLao ? "ແນບໃບບິນສຳເລັດ" : "Slip receipt attached successfully"}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* CONDITION 2: USD CREDIT CARD PAYMENT */
                <div className="space-y-4 mb-5 animate-in fade-in duration-150">
                  <div className="space-y-3.5 text-xs bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">{isLao ? "ຊື່ເທິງບັດ" : "NAME ON CARD"}</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="CARDHOLDER NAME"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">{isLao ? "ເລກບັດເຄຣດິດ" : "CARD NUMBER"}</label>
                      <input
                        type="text"
                        value={cardNo}
                        onChange={(e) => setCardNo(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="4000 0000 0000 0000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">{isLao ? "ວັນໝົດອາຍຸ" : "EXPIRATION"}</label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono tracking-wider text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">{isLao ? "ລະຫັດ CVC" : "CVC CODE"}</label>
                        <input
                          type="password"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          maxLength={3}
                          placeholder="***"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Disclaimer */}
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-5 flex items-start space-x-1.5 bg-slate-100/40 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/20">
                <Shield className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {paymentCurrency === "LAK"
                    ? (isLao ? "ຫຼັງຈາກກວດສອບການໂອນເງິນ, ແອັດມິນຈະແຈ້ງເຕືອນ ແລະ ອັບເກຣດບັນຊີໃຫ້ທ່ານທັນທີ." : "After scanning and uploading the transfer slip receipt, our administrative team will manually verify and upgrade your account.") 
                    : (isLao ? "ທ່ານໄດ້ຮັບປະກັນຄວາມປອດໄພດ້ວຍລະບົບ Stripe Secure Socket Encryption. ທ່ານສາມາດຍົກເລີກການສະໝັກໄດ້ທຸກເວລາ." : "Payment links redirect to official Stripe Checkout. Local custom form operates in immediate testing sandbox. Securely encrypted by SSL protocols.")}
                </span>
              </div>

              {/* Navigation Action Buttons footer */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-705 dark:text-slate-300 py-2 rounded-xl font-bold text-xs transition transition-colors cursor-pointer"
                  disabled={isProcessing}
                >
                  {isLao ? "ກັບຄືນ" : "Back"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (paymentCurrency === "LAK") {
                      if (!slipBase64) {
                        alert(isLao ? "ກະລຸນາອັບໂຫຼດສະລິບການໂອນເງິນກ່ອນ" : "Please attach your bank payment slip first.");
                        return;
                      }
                      submitSubscriptionRequest(selectedPlan.id);
                    } else {
                      // USD direct update simulation with valid notification
                      handleUpgrade(selectedPlan.id);
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>
                        {paymentCurrency === "LAK"
                          ? (isLao ? "ສົ່ງໃບບິນແລ້ວ" : "Submit Receipt Slip") 
                          : (isLao ? "ຢືນຢັນການຊຳລະເງິນ" : "Process Credit Card")}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
