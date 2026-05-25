import { SUBSCRIPTION_PLANS, SubscriptionPlan, UserProfile, PaymentSettings } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, serverTimestamp, getDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Check, CreditCard, Sparkles, X, Shield, Award, Upload } from "lucide-react";

interface SubscriptionModalProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onUpdateProfile: (newTier: "free" | "pro" | "ultra") => void;
}

export default function SubscriptionModal({ userProfile, onClose, onUpdateProfile }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNo, setCardNo] = useState("4000 1234 5678 9010");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("458");
  const [cardName, setCardName] = useState(userProfile?.displayName || "LAO BUSINESS OWNER");
  const [slipBase64, setSlipBase64] = useState<string | null>(null);

  const [bankQrUrlPro, setBankQrUrlPro] = useState<string | null>(null);
  const [bankQrUrlUltra, setBankQrUrlUltra] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);
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
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("You already have a pending request. Please wait for admin approval.");
        setIsProcessing(false);
        return;
      }
      
      const reqId = "req_" + Math.random().toString(36).substring(2, 11);
      const reqRef = doc(db, "subscriptionRequests", reqId);
      await setDoc(reqRef, {
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
      await updateDoc(userRef, {
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
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              <span>ລາຄາ ແລະ ສະໝັກບໍລິການ / Pricing & Subscriptions</span>
            </h2>
            <p className="text-xs text-slate-500">Unleash powerful PDF-to-Word & font conversions for Lao official letters</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!selectedPlan ? (
            <div className="grid md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrent = userProfile.subscriptionTier === plan.id;
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
                        <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                        {isCurrent && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                            Active Plan
                          </span>
                        )}
                      </div>
                      <p className="text-xxs font-mono text-slate-400 mt-0.5">{plan.supportType}</p>

                      <div className="my-4">
                        <span className="text-2xl font-black text-slate-900">
                          {plan.priceUSD === 0 ? "Free" : `$${plan.priceUSD}`}
                        </span>
                        {plan.priceUSD > 0 && <span className="text-xs text-slate-500"> / {plan.period}</span>}
                        {plan.priceLAK > 0 && (
                          <div className="text-xs text-indigo-700 font-mono mt-0.5">
                            ~ {plan.priceLAK.toLocaleString()} LAK / ເດືອນ
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      <ul className="space-y-2.5 mb-6 text-xs text-slate-600">
                        {plan.perks.map((perk, i) => (
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
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : plan.id === "free"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-705"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      }`}
                    >
                      {isCurrent ? "Active Plan" : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mock Billing / Card Payment UI or Bank QR */
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-100 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  {(selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro) ? <Award className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Secure Upgrade Payment</h3>
                  <p className="text-xxs text-slate-500">
                    {(selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro) ? "Scan the QR code to upgrade" : "Fast simulated stripe checkout portal"}
                  </p>
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-lg p-4 border border-slate-100 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-800">{selectedPlan.name}</p>
                  <p className="text-xxs text-indigo-600">Max OCR capacity: {selectedPlan.maxTokensPerOcr.toLocaleString()} tokens</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900">${selectedPlan.priceUSD}</p>
                  <p className="text-[10px] text-slate-400">/{selectedPlan.period}</p>
                </div>
              </div>

              {((selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro)) ? (
                <div className="mb-6 flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-sm font-semibold mb-3 text-slate-800 text-center">Scan to Pay via BCEL One / Bank QR</p>
                  <img src={((selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro)) as string} alt="Bank QR Code" className="w-48 h-48 rounded-lg shadow-sm mb-4" />
                  <p className="text-xs text-slate-500 text-center mb-4">Please scan the QR code and upload your payment receipt below.</p>
                  
                  <div className="w-full relative border-2 border-dashed border-indigo-100 bg-indigo-50/30 rounded-lg p-3 flex flex-col items-center">
                     <span className="text-xs text-indigo-700 font-semibold mb-2">Upload Slip (PNG/JPG)</span>
                     <input type="file" accept="image/*" onChange={(e) => {
                       const f = e.target.files?.[0];
                       if (f) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           setSlipBase64(reader.result as string);
                         };
                         reader.readAsDataURL(f);
                       }
                     }} className="text-[10px] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 w-full" />
                     {slipBase64 && <p className="text-[10px] text-emerald-600 font-bold mt-2">✅ Slip attached</p>}
                  </div>
                </div>
              ) : (
                /* Input forms for simulated credit card */
                <div className="space-y-4 text-xs mb-6">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">NAME ON CARD</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">CARD NUMBER</label>
                    <input
                      type="text"
                      value={cardNo}
                      onChange={(e) => setCardNo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">EXPIRATION</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono tracking-wider text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">CVC CODE</label>
                      <input
                        type="password"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        maxLength={3}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-[10px] text-slate-400 mb-6 flex items-start space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{(selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro) ? "After payment, admin will manually upgrade your tier shortly." : "By subscribing, you authorise simulated charges. You can cancel, downgrade or upgrade your plan at any instant. Securely bound via 256-bit SSL encryption."}</span>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-lg font-medium text-xs transition"
                  disabled={isProcessing}
                >
                   Back
                </button>
                <button
                  onClick={() => {
                    if ((selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro)) {
                      if (!slipBase64) {
                        alert("ກະລຸນາອັບໂຫຼດບິນກ່ອນ / Please upload your payment slip first.");
                        return;
                      }
                      submitSubscriptionRequest(selectedPlan.id);
                    } else {
                      handleUpgrade(selectedPlan.id);
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center space-x-1 shadow-sm"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>{(selectedPlan?.id === "ultra" ? bankQrUrlUltra : bankQrUrlPro) ? "Done / ໄດ້ໂອນແລ້ວ" : "Confirm Payment"}</span>
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
