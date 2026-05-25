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
  priceUSD: number;
  priceLAK: number;
  period: string;
  perks: string[];
  maxTokensPerOcr: number;
  supportType: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Standard Free",
    priceUSD: 0,
    priceLAK: 0,
    period: "Forever",
    perks: [
      "Up to 3 document uploads/month",
      "Lao Font Phetsarath OT conversion",
      "English to Times New Roman conversion",
      "Standard Government letter styling"
    ],
    maxTokensPerOcr: 1000,
    supportType: "Community Support"
  },
  {
    id: "pro",
    name: "Business Pro",
    priceUSD: 5,
    priceLAK: 100000,
    period: "month",
    perks: [
      "Unlimited document uploads",
      "Full scanned PDF to editable Word document converter",
      "High-fidelity OCR from phone photos",
      "Export to MS Word document (.doc) in 1-click",
      "Private secure document drawer with security logs",
      "Priority business support"
    ],
    maxTokensPerOcr: 8000,
    supportType: "24/7 Premium Support"
  },
  {
    id: "ultra",
    name: "Enterprise Ultra / Government",
    priceUSD: 8,
    priceLAK: 150000,
    period: "month",
    perks: [
      "Everything in Pro",
      "AI Summarizer and automatic Ministry category detection",
      "Bulk OCR and conversion queueing",
      "Official administrative seal mockup overlay",
      "99.9% uptime Service Level Agreement (SLA)",
      "Dedicated account representative"
    ],
    maxTokensPerOcr: 32000,
    supportType: "Dedicated Human Support"
  }
];
