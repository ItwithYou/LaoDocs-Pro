export interface PaymentSettings {
  bcelQrUrl: string;
  bcelAccountName: string;
  bcelAccountNumber: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  birthday?: string;
  profilePhoto?: string;
  subscriptionTier: "free" | "pro" | "ultra";
  subscriptionEnd?: string;
  role?: "user" | "admin";
  createdAt: any; // Firestore Timestamp
}

export interface SubscriptionRequest {
  id?: string;
  userId: string;
  email: string;
  displayName?: string;
  requestedTier: "pro" | "ultra";
  slipBase64: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: any;
}

export interface DocumentTemplate {
  id?: string;
  name: string;
  description: string;
  fileBase64: string;
  fileName: string;
  createdAt: any;
}

export interface AIDocumentType {
  id?: string;
  name: string; // e.g. "Proposal (ໜັງສືສະເໜີ)"
  instructions: string; // e.g. "Write a formal proposal to the director. Include date, subject, and reason."
  createdAt: any;
}

export type DocumentStatus = "draft" | "saved" | "final";

export interface LaoLetterDocument {
  documentId: string;
  ownerId: string;
  title: string;
  sender?: string;
  receiver?: string;
  sourceType: "text" | "image" | "pdf";
  originalText?: string;
  convertedText?: string;
  status: DocumentStatus;
  flowStatus?: string; // e.g., Sent, Received, Drafted, Archived, Under Review
  referenceNo?: string;
  referenceDate?: string;
  summary?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface SubscriptionPlan {
  id: "free" | "pro" | "ultra";
  name: string;
  nameLao: string;
  priceUSD: number;
  priceLAK: number;
  period: string;
  periodLao: string;
  perks: string[];
  perksLao: string[];
  maxTokensPerOcr: number;
  supportType: string;
  supportTypeLao: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    nameLao: "ຟຼີ",
    priceUSD: 0,
    priceLAK: 0,
    period: "Forever",
    periodLao: "ຕະຫຼອດໄປ",
    perks: [
      "Upload up to 1 file at a time, max 0.3MB (after sign in)",
      "Convert legacy Lao fonts to standard Phetsarath OT (unlimited raw text)",
      "1 daily AI formatting and Lao translation credit",
      "Basic document viewing and standard storage"
    ],
    perksLao: [
      "ອັບໂຫຼດໄຟລ໌ໄດ້ຄັ້ງລະ 1 ໄຟລ໌, ສູງສຸດ 0.3MB (ຫຼັງເຂົ້າສູ່ລະບົບ)",
      "ປ່ຽນຟອນເກົ່າໃຫ້ເປັນຟອນມາດຕະຖານ Phetsarath OT (ບໍ່ຈຳກັດຂໍ້ຄວາມ)",
      "ຈັດຮູບແບບພາສາເດີມ ແລະ ແປລາວດ້ວຍ AI ໄດ້ຢ່າງລະ 1 ຄັ້ງຕໍ່ມື້",
      "ສະແດງ ແລະ ຈັດເກັບເອກະສານແບບທົ່ວໄປ"
    ],
    maxTokensPerOcr: 1000,
    supportType: "Community Support",
    supportTypeLao: "ຊ່ວຍເຫຼືອຜ່ານກຸ່ມຜູ້ໃຊ້ງານ"
  },
  {
    id: "pro",
    name: "Pro",
    nameLao: "ໂປຼ",
    priceUSD: 5,
    priceLAK: 100000,
    period: "month",
    periodLao: "ເດືອນ",
    perks: [
      "Upload up to 20 files at once, max 25MB per file",
      "Unlimited AI formatting, translation, and high-fidelity OCR scanning",
      "Export documents to Microsoft Word (.doc) formats in 1-click",
      "In-app printing formatted perfectly for A4 official templates",
      "Secure, private administrative document drawer"
    ],
    perksLao: [
      "ອັບໂຫຼດໄຟລ໌ໄດ້ຄັ້ງລະ 20 ໄຟລ໌, ສູງສຸດ 25MB ຕໍ່ໄຟລ໌",
      "ບໍ່ຈຳກັດການໃຊ້ງານ OCR, ຈັດຮູບແບບ ແລະ ແແປພາສາລາວດ້ວຍ AI",
      "ດາວໂຫຼດເອກະສານເປັນໄຟລ໌ Microsoft Word (.doc) 在 1 ຄລິກ",
      "ພິມເອກະສານໂດຍກົງໃນຮູບແບບ A4 ດ້ວຍການຕັ້ງຄ່າມາດຕະຖານ",
      "ບັນທຶກ ແລະ ຈັດການເອກະສານໃນຕູ້ລິ້ນຊັກສ່ວນຕົວທີ່ປອດໄພ"
    ],
    maxTokensPerOcr: 8000,
    supportType: "24/7 Premium Support",
    supportTypeLao: "ຊ່ວຍເຫຼືອລະດັບພຣີມຽມ 24/7"
  },
  {
    id: "ultra",
    name: "Ultra",
    nameLao: "ອັນຕຼາ",
    priceUSD: 8,
    priceLAK: 150000,
    period: "month",
    periodLao: "ເດືອນ",
    perks: [
      "Includes everything in Business Pro",
      "Upload up to 50 files at once, max 100MB per file",
      "Edit document text and fields directly inside the preview workspace",
      "AI administrative summary extraction & metadata management",
      "Highest-priority cloud node execution queue for rapid scaling"
    ],
    perksLao: [
      "ລວມເອົາທຸກຟີເຈີທີ່ມີໃນເວີຊັນ Pro",
      "ອັບໂຫຼດໄຟລ໌ໄດ້ຄັ້ງລະ 50 ໄຟລ໌, ສູງສຸດ 100MB ຕໍ່ໄຟລ໌",
      "ແກ້ໄຂຟິນຂໍ້ມູນ ແລະ ຂໍ້ຄວາມຂອງເອກະສານໄດ້ໂດຍກົງຈາກໜ້າຈໍ",
      "ສະກັດຂໍ້ມູນຫຍໍ້ AI, ຊື່ຜູ້ສົ່ງ, ຜູ້ຮັບ ແລະ ເລກທີເອກະສານໂດຍອັດຕະໂນມັດ",
      "ບູລິມະສິດສູງສຸດໃນການປະມວນຜົນເອກະສານດ້ວຍຄວາມໄວສູງ"
    ],
    maxTokensPerOcr: 32000,
    supportType: "Dedicated Human Support",
    supportTypeLao: "ຊ່ວຍເຫຼືອໂດຍທີມງານສ່ວນຕົວ"
  }
];
