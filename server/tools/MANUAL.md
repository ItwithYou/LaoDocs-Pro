# 🛠️ AI Document Tools - Developer Manual

Welcome to the tools directory! This manual explains how each tool works, how they process files, and how you can update the AI keys and models in the future.

## 📁 Tools Overview

### 1. `01-retype` (Local, Offline Mode)
- **What it does:** Extracts text from documents exactly as they are, without translation or AI formatting.
- **How it works:** It now runs **completely offline locally** so you do NOT need an API key for it.
  - Images (`.png`, `.jpg`): Extracted using `Tesseract.js` (Optical Character Recognition) supporting Lao, Thai, English, Chinese, and Korean.
  - PDFs (`.pdf`): Extracted using `pdf-parse`.
  - Word (`.docx`): Extracted using `mammoth`.
  - Excel (`.xlsx`): Extracted using `xlsx`.
  - PowerPoint (`.pptx`): Extracted using `officeparser`.
- **Where to edit:** `/server/tools/01-retype/index.ts` and `/server/utils/localExtract.ts`

### 2. `02-format-original` (Format Original Language)
- **What it does:** Reads the uploaded file and converts it into perfectly structured HTML (tables, paragraphs, headings) keeping the EXACT original language.
- **How it works:** Sends the file to the Gemini AI API with instructions to NOT translate.
- **Where to edit:** `/server/tools/02-format-original/index.ts`

### 3. `03-recommended-ai` (Translate & Format - Recommended)
- **What it does:** Reads the file, corrects typos, applies a standard Government template layout, and translates it all to the user's chosen target language (e.g., Lao).
- **How it works:** Sends the file to the Gemini AI API with the `templateInstruction` and OCR capabilities.
- **Where to edit:** `/server/tools/03-recommended-ai/index.ts`

### 4. `04-draft-document` (AI Generate from Draft)
- **What it does:** Takes a small rough draft written by the user and expands it into a fully formatted, formal Lao government letter. It can also mimic an uploaded reference Word document's layout.
- **How it works:** Sends the text and styling guide to the Gemini AI API.
- **Where to edit:** `/server/tools/04-draft-document/index.ts`

### 5. `05-convert-raw-text` (Fix Fonts & Typos)
- **What it does:** Converts old legacy Lao fonts (like Saysettha, Sanyasit) into modern Unicode standard (Phetsarath OT / standard Lao) and fixes typos, without changing the structure.
- **How it works:** Sends the raw text to the Gemini AI API to fix spelling and formatting.
- **Where to edit:** `/server/tools/05-convert-raw-text/index.ts`

---

## 🔑 How to Update API Keys & AI Models

All tools (except `01-retype`, which is now offline) use the shared Gemini client connector. To modify how AI works for tools 2-5, you edit the central file:
**👉 `/server/utils/geminiClient.ts`**

### 1. Updating the API Key:
In `/server/utils/geminiClient.ts`, you will see:
```typescript
const KEY_CANDIDATES: string[] = ["AIzaSyAwwypXuLM-Obiup6eHQuBQQbuGPbu4LDM"];
```
You can add multiple keys here. If one expires, it will automatically try the next one:
```typescript
const KEY_CANDIDATES: string[] = [
    "YOUR_NEW_API_KEY_HERE",
    "ANOTHER_BACKUP_KEY"
];
```

### 2. Updating the AI Model:
In the same file, you can change which model is used. For example, upgrading from `1.5` to `3.5`.
```typescript
export const getModelForPromptType = (promptType: string) => {
  if (promptType === "retype") {
    // We don't use this anymore since it's local, but for quick tools:
    return "gemini-3.5-flash"; 
  }
  // This is used for generating the formal drafts and translating:
  return "gemini-3.1-pro-preview"; 
};
```
Whenever Google releases a new model, just update the string here and restart your server.

---

## 🛠️ Prompts & Instructions

If you want to edit how the AI "behaves" (for instance, changing the Lao Government layout rules without touching the logic code), you can edit:
**👉 `/server/utils/prompts.ts`**

This file holds all the central prompts like `formatInstruction` and `templateInstruction`.
