import React, { useState, useEffect, useRef } from "react";
import { collection, doc, query, orderBy, onSnapshot, setDoc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { MessageCircle, X, Send, Camera, Image, Check, AlertCircle, LogIn, Sparkles, ChevronLeft, ArrowRight, UserPlus, ZoomIn, Eye, Trash2, CheckCheck, Landmark } from "lucide-react";
import { db, auth } from "../firebase";
import { UserProfile } from "../types";
import { useLanguage } from "../contexts";
import html2canvas from "html2canvas";

interface SupportChatProps {
  userProfile: UserProfile | null;
  onLoginClick: () => void;
  inline?: boolean;
  defaultTab?: "user-chat" | "admin-portal";
}

interface ChatSession {
  chatId: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage?: string;
  updatedAt: any;
  unreadByAdmin?: boolean;
  unreadByUser?: boolean;
}

interface ChatMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  text?: string;
  screenshot?: string;
  createdAt: any;
}

export default function SupportChat({ userProfile, onLoginClick, inline = false, defaultTab }: SupportChatProps) {
  const { isLao } = useLanguage();
  const [isOpen, setIsOpen] = useState(inline || false);
  const [activeTab, setActiveTab] = useState<"user-chat" | "admin-portal">(defaultTab || "user-chat");
  const [inputText, setInputText] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // User Mode States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userChatSession, setUserChatSession] = useState<ChatSession | null>(null);

  // Admin Mode States
  const [allChatSessions, setAllChatSessions] = useState<ChatSession[]>([]);
  const [selectedAdminChatId, setSelectedAdminChatId] = useState<string | null>(null);
  const [adminMessages, setAdminMessages] = useState<ChatMessage[]>([]);
  const [activeAdminChat, setActiveAdminChat] = useState<ChatSession | null>(null);

  // Lightbox view for screenshot inspection
  const [viewingScreenshotImg, setViewingScreenshotImg] = useState<string | null>(null);

  // Element reference for scroll triggers
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const adminChatBottomRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!userProfile;
  const isAdmin = userProfile?.role === "admin" || userProfile?.userId === "zVEwrk4m8XNueS0HiNRDIgMHwWm2";

  // If role is admin and they open the chat, we override their tab to "admin-portal"
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (isAdmin) {
      setActiveTab("admin-portal");
    } else {
      setActiveTab("user-chat");
    }
  }, [isAdmin, defaultTab]);

  // Scroll to bottom helper
  const scrollToBottom = (refObj: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      refObj.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // User Mode: Listen to single user's chat session status
  useEffect(() => {
    const isModeAdmin = isAdmin || defaultTab === "admin-portal";
    if (!isLoggedIn || isModeAdmin || (!isOpen && !inline)) return;

    const chatRef = doc(db, "chats", userProfile.userId);
    const unsubscribeChat = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        setUserChatSession(snap.data() as ChatSession);
      } else {
        setUserChatSession(null);
      }
    });

    return () => unsubscribeChat();
  }, [isLoggedIn, isAdmin, isOpen, inline, userProfile?.userId, defaultTab]);

  // User Mode: Listen to single user's messages list in real-time
  useEffect(() => {
    const isModeAdmin = isAdmin || defaultTab === "admin-portal";
    if (!isLoggedIn || isModeAdmin || (!isOpen && !inline)) return;

    const messagesCol = collection(db, "chats", userProfile.userId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgsList: ChatMessage[] = [];
      snapshot.forEach((docItem) => {
        msgsList.push(docItem.data() as ChatMessage);
      });
      setMessages(msgsList);
      scrollToBottom(chatBottomRef);

      // If the chat window is open and user receives admin messages, clear the user unread badge
      if (msgsList.length > 0) {
        const lastMsgObj = msgsList[msgsList.length - 1];
        if (lastMsgObj.senderId !== userProfile.userId) {
          // Message came from admin, update unread state
          const chatRef = doc(db, "chats", userProfile.userId);
          updateDoc(chatRef, { unreadByUser: false }).catch((e) => console.log("Unread set fail:", e));
        }
      }
    });

    return () => unsubscribeMessages();
  }, [isLoggedIn, isAdmin, isOpen, inline, userProfile?.userId, defaultTab]);

  // ADMIN Mode: Listen to all incoming support chats
  useEffect(() => {
    const isModeAdmin = isAdmin || defaultTab === "admin-portal";
    if (!isModeAdmin || (!isOpen && !inline)) return;

    const chatsCol = collection(db, "chats");
    const q = query(chatsCol, orderBy("updatedAt", "desc"));

    const unsubscribeAllChats = onSnapshot(q, (snapshot) => {
      const chatsList: ChatSession[] = [];
      snapshot.forEach((docItem) => {
        chatsList.push(docItem.data() as ChatSession);
      });
      setAllChatSessions(chatsList);
    });

    return () => unsubscribeAllChats();
  }, [isAdmin, isOpen, inline, defaultTab]);

  // ADMIN Mode: Listen to selected customer's messages thread
  useEffect(() => {
    const isModeAdmin = isAdmin || defaultTab === "admin-portal";
    if (!isModeAdmin || !selectedAdminChatId || (!isOpen && !inline)) return;

    const targetChat = allChatSessions.find(c => c.chatId === selectedAdminChatId);
    if (targetChat) {
      setActiveAdminChat(targetChat);
    }

    const messagesCol = collection(db, "chats", selectedAdminChatId, "messages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    const unsubscribeAdminMsgs = onSnapshot(q, (snapshot) => {
      const msgsList: ChatMessage[] = [];
      snapshot.forEach((docItem) => {
        msgsList.push(docItem.data() as ChatMessage);
      });
      setAdminMessages(msgsList);
      scrollToBottom(adminChatBottomRef);

      // Reset the unread state for Admin on selecting/opening this chat
      const chatRef = doc(db, "chats", selectedAdminChatId);
      updateDoc(chatRef, { unreadByAdmin: false }).catch(() => {});
    });

    return () => unsubscribeAdminMsgs();
  }, [isAdmin, selectedAdminChatId, isOpen, inline, allChatSessions, defaultTab]);

  // Check overall unread messages to display badges on floating launcher
  const [unreadCountForWidget, setUnreadCountForWidget] = useState(0);
  useEffect(() => {
    if (!isLoggedIn) return;
    const isModeAdmin = isAdmin || defaultTab === "admin-portal";

    if (isModeAdmin) {
      // For Admin, count active chats where unreadByAdmin is true
      const unsubscribeAdminCount = onSnapshot(collection(db, "chats"), (snapshot) => {
        let unreadTotal = 0;
        snapshot.forEach((docItem) => {
          const chatData = docItem.data();
          if (chatData.unreadByAdmin) {
            unreadTotal++;
          }
        });
        setUnreadCountForWidget(unreadTotal);
      });
      return () => unsubscribeAdminCount();
    } else {
      // For standard Client, listen to their private chat's unreadByUser status
      const unsubscribeUserCount = onSnapshot(doc(db, "chats", userProfile.userId), (snap) => {
        if (snap.exists() && snap.data().unreadByUser) {
          setUnreadCountForWidget(1);
        } else {
          setUnreadCountForWidget(0);
        }
      });
      return () => unsubscribeUserCount();
    }
  }, [isLoggedIn, isAdmin, userProfile?.userId, defaultTab]);

  // Handle client-side DOM capture utilizing html2canvas library
  const handleTakeScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Target the main wrapper container of our applet
      const targetElement = document.getElementById("app-dashboard-wrapper") || document.body;
      
      const canvas = await html2canvas(targetElement, {
        scale: 1, // Keep scale low for efficient base64 packaging
        logging: false,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains("dark") ? "#0f172a" : "#f8fafc"
      });

      // Construct smaller viewport representation in memory to satisfy 1MB Firestore limitations cleanly
      const maxDimension = 750;
      let targetWidth = canvas.width;
      let targetHeight = canvas.height;

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      const resizer = document.createElement("canvas");
      resizer.width = targetWidth;
      resizer.height = targetHeight;
      const ctx = resizer.getContext("2d");
      if (ctx) {
        ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#0f172a" : "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      }

      // Convert to highly compressed JPEG data url (~40KB size average)
      const compressedB64 = resizer.toDataURL("image/jpeg", 0.6);
      setScreenshotPreview(compressedB64);
    } catch (err) {
      console.error("Failed to generate capture slip:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Submit new Chat Message (User Mode)
  const handleUserSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isLoggedIn || (!inputText.trim() && !screenshotPreview) || isSending) return;

    setIsSending(true);
    try {
      const chatId = userProfile.userId;
      const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      
      // Ensure chat session exists in parent. Set or Update.
      const chatDocRef = doc(db, "chats", chatId);
      const chatPayload: ChatSession = {
        chatId: chatId,
        userId: chatId,
        userName: userProfile.displayName || "Client User",
        userEmail: userProfile.email || "client@laodocs.com",
        lastMessage: screenshotPreview ? "🖼️ Screen Captured Shot" : inputText.trim(),
        updatedAt: serverTimestamp(),
        unreadByAdmin: true,
        unreadByUser: false
      };
      
      await setDoc(chatDocRef, chatPayload, { merge: true });

      // Create message sub-collection entry
      const messageDocRef = doc(db, "chats", chatId, "messages", messageId);
      const messagePayload: ChatMessage = {
        messageId,
        senderId: chatId,
        senderName: userProfile.displayName || "Client User",
        text: inputText.trim(),
        screenshot: screenshotPreview || "",
        createdAt: serverTimestamp()
      };

      await setDoc(messageDocRef, messagePayload);

      // Wipe inputs
      setInputText("");
      setScreenshotPreview(null);
      scrollToBottom(chatBottomRef);
    } catch (err) {
      console.error("Failed to submit message to support team:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Submit Admin Reply
  const handleAdminSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin || !selectedAdminChatId || (!inputText.trim() && !screenshotPreview) || isSending) return;

    setIsSending(true);
    try {
      const chatId = selectedAdminChatId;
      const messageId = "msg_admin_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      
      // Update parent Chat document
      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        lastMessage: screenshotPreview ? "🖼️ Screen Captured Reply" : inputText.trim(),
        updatedAt: serverTimestamp(),
        unreadByUser: true,
        unreadByAdmin: false
      });

      // Write Message in subcollection
      const messageDocRef = doc(db, "chats", chatId, "messages", messageId);
      const messagePayload: ChatMessage = {
        messageId,
        senderId: "admin_support_liaison",
        senderName: userProfile?.displayName || "LaoDocs Support",
        text: inputText.trim(),
        screenshot: screenshotPreview || "",
        createdAt: serverTimestamp()
      };

      await setDoc(messageDocRef, messagePayload);

      // Clean input systems
      setInputText("");
      setScreenshotPreview(null);
      scrollToBottom(adminChatBottomRef);
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* 2. Chat interface Panel Modal */}
      {isOpen && (
        <div className={inline ? "w-full h-full bg-white dark:bg-slate-900 flex flex-col overflow-hidden" : "fixed bottom-24 right-6 w-full max-w-[370px] h-[525px] sm:h-[550px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100] animate-in slide-in-from-bottom-5 fade-in duration-200"}>
          
          {/* USER CLIENT CHAT INTERFACE */}
          {activeTab === "user-chat" && (
            <>
              {/* Header block */}
              {!inline && (
                <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 py-3.5 flex justify-between items-center text-white">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs ring-2 ring-white/10 animate-pulse">
                      LA
                    </div>
                    <div>
                      <h4 className="font-bold text-xs tracking-wide">
                        {isLao ? "ຝ່າຍບໍລິການ ແລະ ແກ້ໄຂບັນຫາ" : "LaoDocs Support Admin"}
                      </h4>
                      <p className="text-[10px] text-indigo-150 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        {isLao ? "ແອັດມິນພ້ອມຊ່ວຍເຫຼືອຕະຫຼອດ 24 ຊົ່ວໂມງ" : "Support team is active online"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Chat messages stream body */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/60 space-y-3">
                
                {/* Intro greeting */}
                <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/85 text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>{isLao ? "ສະບາຍດີຜູ້ນຳໃຊ້ LaoDocs" : "Welcome, valued user!"}</span>
                  </div>
                  <span>
                    {isLao 
                      ? "ທ່ານສາມາດພິມສອບຖາມແອັດມິນກ່ຽວກັບການຈັດຮູບເອກະສານ, ການແປງຟອນ ຫຼື ບັນຫາຕ່າງໆ. ນອກຈາກນີ້ທ່ານສາມາດຖ່າຍພາບໜ້າຈໍໃນຫນ້າແປງເອກະສານຂອງທ່ານເພື່ອສົ່ງໃຫ້ແອັດມິນກວດສອບໂດຍກົງໄດ້ອີກດ້ວຍ!" 
                      : "Type your query below. You can also take a screenshot of your active document converting workspace to let our administrators assist you faster!"}
                  </span>
                </div>

                {!isLoggedIn ? (
                  /* Call to action login screen */
                  <div className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-1.50 dark:border-slate-800 p-6 text-center shadow-xs flex flex-col justify-center items-center h-48 my-8">
                    <LogIn className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-3" />
                    <h5 className="font-bold text-xs text-slate-850 dark:text-white mb-1.5">
                      {isLao ? "ຕ້ອງເຂົ້າສູ່ລະບົບກ່ອນສົນທະນາ" : "Login Required"}
                    </h5>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mb-4 px-2">
                      {isLao 
                        ? "ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອເປີດຫ້ອງສົນທະນາກວດສອບເອກະສານສ່ວນຕົວກັບແອັດມິນ" 
                        : "Sign in with Google to open an authenticated, secure private support line with admins."}
                    </p>
                    <button
                      onClick={onLoginClick}
                      className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-4 rounded-full transition shadow-xs cursor-pointer"
                    >
                      <span>{isLao ? "ເຂົ້າສູ່ລະບົບດ້ວຍ Google" : "Sign In with Google"}</span>
                    </button>
                  </div>
                ) : (
                  /* Print messages of user and support */
                  <>
                    {messages.length === 0 ? (
                      <div className="text-center text-[10px] text-slate-400/80 dark:text-slate-500 py-12">
                        {isLao ? "ບໍ່ມີປະຫວັດການສົນທະນາ. ພິມຂໍ້ຄວາມທຳອິດເພື່ອເລີ່ມ!" : "No previous support history. Start the conversation!"}
                      </div>
                    ) : (
                      messages.map((item) => {
                        const isSelf = item.senderId === userProfile.userId;
                        return (
                          <div
                            key={item.messageId}
                            className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                          >
                            <span className="text-[9px] text-slate-400 font-mono mb-0.5 px-1">{item.senderName}</span>
                            <div className="max-w-[85%] flex flex-col">
                              {/* Display attached snapshot preview if any */}
                              {item.screenshot && (
                                <div className="relative rounded-t-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xxs bg-slate-900 aspect-video mb-px group">
                                  <img
                                    src={item.screenshot}
                                    alt="User workspace capture shot"
                                    className="w-full h-full object-cover select-none brightness-95"
                                  />
                                  <button
                                    onClick={() => setViewingScreenshotImg(item.screenshot || null)}
                                    className="absolute inset-0 m-auto bg-slate-950/50 hover:bg-slate-950/70 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                    title="View Full Screenshot"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              
                              {/* Text message bubble */}
                              {item.text && (
                                <div
                                  className={`px-3 py-2 text-xs leading-normal font-sans shadow-xxs ${
                                    isSelf
                                      ? `bg-indigo-600 text-white ${item.screenshot ? "rounded-b-xl" : "rounded-2xl rounded-tr-xs"}`
                                      : `bg-white dark:bg-slate-800 dark:text-slate-100 text-slate-900 ${item.screenshot ? "rounded-b-xl" : "rounded-2xl rounded-tl-xs"}`
                                  }`}
                                >
                                  {item.text}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </>
                )}
              </div>

              {/* Input section user control */}
              {isLoggedIn && (
                <form
                  onSubmit={handleUserSendMessage}
                  className="p-3 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 flex flex-col"
                >
                  {/* Screenshot Thumbnail Preview if selected */}
                  {screenshotPreview && (
                    <div className="flex items-center justify-between p-1.5 mb-2 bg-indigo-50/50 dark:bg-indigo-950/35 border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded border border-indigo-200 dark:border-indigo-800 overflow-hidden shrink-0">
                          <img src={screenshotPreview} alt="Snapshot attachment file" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold truncate max-w-[170px]">
                          {isLao ? "ແນບຮູບຖ່າຍຫນ້າຈໍສຳເລັດ" : "Workspace Screenshot Attached"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScreenshotPreview(null)}
                        className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded text-slate-500 hover:text-indigo-800 dark:text-indigo-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    {/* Capture button */}
                    <button
                      type="button"
                      disabled={isCapturing}
                      onClick={handleTakeScreenshot}
                      className={`p-2 rounded-xl transition cursor-pointer shrink-0 border ${
                        screenshotPreview
                          ? "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-700/80"
                      }`}
                      title={isLao ? "ຖ່າຍພາບໜ້າຈໍເອກະສານ" : "Capture document Workspace screenshot"}
                    >
                      {isCapturing ? (
                        <div className="w-4 h-4 border-2 border-slate-550 border-t-indigo-600 rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 animate-pulse" />
                      )}
                    </button>

                    {/* Chat field input text */}
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={isLao ? "ພິມສອບຖາມແອັດມິນທີ່ນີ້..." : "Type reply to admin support..."}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5 text-xs outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100"
                    />

                    {/* Submit sending button */}
                    <button
                      type="submit"
                      disabled={isSending || (!inputText.trim() && !screenshotPreview)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-600 transition flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ADMINISTRATORS CHAT LISTS AND RESPONSES PANEL */}
          {activeTab === "admin-portal" && (
            <>
              {/* Header Title bar of admin */}
              {!inline && (
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center space-x-2">
                    <Landmark className="w-4 h-5 text-indigo-400 animate-pulse" />
                    <div>
                      <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-400">
                        LaoDocs Support HQ
                      </h4>
                      <p className="text-[9px] text-slate-400">
                        {selectedAdminChatId ? `Conversing with Client` : `Management Portal`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!selectedAdminChatId ? (
                /* Thread list view for administrative agents */
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/80 p-3.5 space-y-2.5">
                  <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                    {isLao ? "ລາຍຊື່ລູກຄ້າທີ່ກຳລັງຕິດຕໍ່ສອບຖາມ" : "Customer Support Sessions"}
                  </h5>
                  
                  {allChatSessions.length === 0 ? (
                    <div className="text-center text-[10px] py-14 text-slate-400/85">
                      {isLao ? "ບໍ່ມີການສົນທະນາມາຈາກລູກຄ້າເທື່ອ." : "Zero clients waiting in support queue!"}
                    </div>
                  ) : (
                    allChatSessions.map((session) => {
                      const hasUnread = session.unreadByAdmin === true;
                      return (
                        <div
                          key={session.chatId}
                          onClick={() => setSelectedAdminChatId(session.chatId)}
                          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border hover:border-indigo-400 transition shadow-xxs cursor-pointer flex flex-col gap-1.5 relative ${
                            hasUnread
                              ? "border-amber-400 shadow-sm bg-amber-50/15 dark:bg-amber-500/5"
                              : "border-slate-150 dark:border-slate-850"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[190px]">
                              {session.userName}
                            </span>
                            {hasUnread && (
                              <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full animate-pulse">
                                NEW REQ
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-slate-450 dark:text-slate-400 truncate font-mono">
                            {session.userEmail}
                          </div>

                          <div className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5 border-t border-slate-100 dark:border-slate-800/80 pt-1 flex items-center gap-1">
                            <ArrowRight className="w-2.5 h-2.5 text-indigo-500" />
                            <span>{session.lastMessage || "Client opened a session"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Detail messages viewing for a selected user session chat thread */
                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/80 min-h-0">
                  {/* Selected Customer Bar Header */}
                  <div className="px-3.5 py-2 bg-slate-150 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedAdminChatId(null);
                        setAdminMessages([]);
                        setActiveAdminChat(null);
                      }}
                      className="inline-flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-indigo-650 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">{isLao ? "ກັບຄືນ" : "Back Queue"}</span>
                    </button>
                    
                    <div className="text-right max-w-[170px]">
                      <div className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                        {activeAdminChat?.userName}
                      </div>
                      <div className="text-[8px] font-mono text-slate-400 truncate">
                        {activeAdminChat?.userEmail}
                      </div>
                    </div>
                  </div>

                  {/* Customer conversation body render flow */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {adminMessages.map((item) => {
                      const isSelf = item.senderId === "admin_support_liaison";
                      return (
                        <div
                          key={item.messageId}
                          className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[9px] text-slate-400 font-mono mb-0.5 px-1">{item.senderName}</span>
                          <div className="max-w-[85%] flex flex-col">
                            {/* Embedded screenshot preview */}
                            {item.screenshot && (
                              <div className="relative rounded-t-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xxs bg-slate-900 aspect-video mb-px group">
                                <img
                                  src={item.screenshot}
                                  alt="Screenshot capture of workspace element"
                                  className="w-full h-full object-cover select-none brightness-95"
                                />
                                <button
                                  onClick={() => setViewingScreenshotImg(item.screenshot || null)}
                                  className="absolute inset-0 m-auto bg-slate-950/50 hover:bg-slate-950/70 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                  title="Expand Screen Shot"
                                >
                                  <ZoomIn className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {/* Message bubble */}
                            {item.text && (
                              <div
                                className={`px-3 py-2 text-xs leading-normal shadow-xxs ${
                                  isSelf
                                    ? `bg-slate-900 text-indigo-400 border border-slate-840 ${item.screenshot ? "rounded-b-xl" : "rounded-2xl rounded-tr-xs"}`
                                    : `bg-slate-200 text-slate-950 dark:bg-slate-800 dark:text-slate-100 ${item.screenshot ? "rounded-b-xl" : "rounded-2xl rounded-tl-xs"}`
                                }`}
                              >
                                {item.text}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={adminChatBottomRef} />
                  </div>

                  {/* Reply controls for Admin agent */}
                  <form
                    onSubmit={handleAdminSendMessage}
                    className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type standard administrative reply here...."
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !inputText.trim()}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-xl disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-600 transition flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* 3. LIGHTBOX POPUP FULL SCREEN SCREENSHOT MAGNIFIER VIEW */}
      {viewingScreenshotImg && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
            onClick={() => setViewingScreenshotImg(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-250 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 mr-1 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">Captured Workspace Screenshot Analysis</h3>
                <p className="text-[9px] text-slate-400 mt-0.5">High-fidelity view sent over standard Firestore client sync channel</p>
              </div>
              <button
                onClick={() => setViewingScreenshotImg(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-750 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 p-4 flex items-center justify-center select-none">
              <img
                src={viewingScreenshotImg}
                referrerPolicy="no-referrer"
                alt="Workspace zoom inspection viewer"
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-805"
              />
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-800/20">
              <button
                onClick={() => setViewingScreenshotImg(null)}
                className="px-4 py-1.5 bg-slate-905 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-[10px] font-bold rounded-lg cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
