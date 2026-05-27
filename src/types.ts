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
  cancelAtPeriodEnd?: boolean;
  role?: "user" | "admin";
  createdAt: any; // Firestore Timestamp
  isOnline?: boolean;
  lastActiveAt?: string;
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
  recommendedFormat?: string;
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
      "Upload up to 1 file at a time (after sign in)",
      "Convert legacy Lao fonts to standard Phetsarath OT (unlimited raw text)",
      "1 daily AI formatting and Lao translation credit",
      "Basic document viewing and standard storage"
    ],
    perksLao: [
      "ອັບໂຫຼດໄຟລ໌ໄດ້ຄັ້ງລະ 1 ໄຟລ໌ (ຫຼັງເຂົ້າສູ່ລະບົບ)",
      "ປ່ຽນຟອນເກົ່າໃຫ້ເປັນຟອນມາດຕະຖານ Phetsarath OT (ບໍ່ຈຳກັດຂໍ້ຄວາມ)",
      "ຈັດຮູບແບບພາສາເດີມ ແລະ ແແປລາວດ້ວຍ AI ໄດ້ຢ່າງລະ 1 ຄັ້ງຕໍ່ມື້",
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
      "Upload up to 20 files at once",
      "Unlimited AI formatting, translation, and high-fidelity OCR scanning",
      "Download in various document file formats",
      "In-app printing formatted perfectly for A4 official templates",
      "Secure, private administrative document drawer"
    ],
    perksLao: [
      "ອັບໂຫຼດໄຟລ໌ໄດ້ຄັ້ງລະ 20 ໄຟລ໌",
      "ບໍ່ຈໍາກັດການໃຊ້ງານ ບໍ່ຈໍາກັດ",
      "ສາມາດດາວໂຫຼດເປັນຟາຍຕ່າງໆ",
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
      "Upload up to 50 files at once",
      "Edit document text and fields directly inside the preview workspace",
      "AI administrative summary extraction & metadata management",
      "Highest-priority cloud node execution queue for rapid scaling"
    ],
    perksLao: [
      "ລວມເອົາທຸກຟີເຈີທີ່ມີໃນເວີຊັນ Pro",
      "ອັບໂຫຼດໄຟລ໌ໄດ້ຄັ້ງລະ 50 ໄຟລ໌",
      "ແກ້ໄຂຟິນຂໍ້ມູນ ແລະ ຂໍ້ຄວາມຂອງເອກະສານໄດ້ໂດຍກົງຈາກໜ້າຈໍ",
      "ສະກັດຂໍ້ມູນຫຍໍ້ AI, ຊື່ຜູ້ສົ່ງ, ຜູ້ຮັບ ແລະ ເລກທີເອກະສານໂດຍອັດຕະໂນມັດ",
      "ບູລິມະສິດສູງສຸດໃນການປະມວນຜົນເອກະສານດ້ວຍຄວາມໄວສູງ"
    ],
    maxTokensPerOcr: 32000,
    supportType: "Dedicated Human Support",
    supportTypeLao: "ຊ່ວຍເຫຼືອໂດຍທີມງານສ່ວນຕົວ"
  }
];

export const SUBSCRIPTION_DURATIONS = [
  { id: "1m", months: 1, label: "1 Month", labelLao: "1 ເດືອນ", factor: 1 },
  { id: "3m", months: 3, label: "3 Months", labelLao: "3 ເດືອນ", factor: 2.7 },
  { id: "6m", months: 6, label: "6 Months", labelLao: "6 ເດືອນ", factor: 5 },
  { id: "1y", months: 12, label: "1 Year", labelLao: "1 ປີ", factor: 9 },
];

