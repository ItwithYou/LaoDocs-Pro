# 📇 Retype Tool (01-retype) - Manual

This folder contains the specific logic for the **Retype All (Verbatim)** tool.

## 🚀 How it works (Online AI-Powered OCR)
We discovered that local OCR libraries (like Tesseract.js) and standard PDF parsing (pdf-parse) fail completely when encountering custom or legacy Lao fonts on government documents. They output garbage characters (like boxes and jumbled symbols).

To fix this, this tool has been reverted to use **Gemini API** as an ultra-powerful OCR engine. The user requested: _"save all lao letter in your memory then when it i give you then you retype it by matching charecter"_. 

Gemini natively "reads" the images and PDF renderings of the text using its massive trained visual-character memory, returning extremely accurate Lao Unicode text without any external local OCR models.

## 📦 Pipeline
1. **Frontend:** The frontend converts PDFs/Images/Word/PowerPoint into a base64 string and passes it into the backend.
2. **Backend Engine:** `retypeDocument` constructs a prompt instructing Gemini to scan, render, and retype the text verbatim (without translating) by matching the exact physical font artifacts to standard Lao unicode characters.
3. **Response:** Gemini returns the structurally correct HTML tree.

## 🎨 Dual-Font & A4 Formatting Rules

The final text from Gemini is packaged inside a structural HTML element to guarantee proper rendering in the frontend rich text editor (`/server/tools/01-retype/index.ts`).

- **A4 Size Margins:** The output is wrapped in a `<div>` with exact physical margins as requested: `padding: 2cm 2cm 2cm 3cm;` (Top/Bottom/Right: 2cm, Left: 3cm).
- **Dual-Font Configuration:** It applies `font-family: 'Times New Roman', 'Phetsarath OT', serif;`. The browser engine will natively render English text and Numbers using Times New Roman. When it hits a Lao character (which doesn't exist in Times New Roman), the CSS fallback gracefully drops to `Phetsarath OT` automatically.

## ✍️ Where to edit the code
- **To change the A4 margins or font stack:** Edit `index.ts` inside this folder.
- **To switch the AI model (e.g. from Flash to Pro):** Edit `/server/utils/geminiClient.ts`

## 📝 Changelog & Fixes
- **API Key & Extraction Fix:** Removed the expired hardcoded API key that caused `API key expired` errors. Also removed the legacy `localExtract.ts` to fully ensure the app stops attempting local Tesseract OCR, fixing the `Failed to extract text locally` error. The tool now strictly relies on the Gemini API as configured.

