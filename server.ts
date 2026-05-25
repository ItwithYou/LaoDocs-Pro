import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit for base64 PDF and Image uploads
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// AI Document Parser & Font Converter endpoint
import mammoth from "mammoth";

app.post("/api/gemini/convert", async (req, res) => {
  try {
    const { fileBase64, mimeType, promptType, rawLaoText, documentContext, referenceFormatFileBase64, referenceFormatFileMimeType } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in secrets." });
    }

    let contents: any[] = [];
    let promptString = "";
    
    let extractedReferenceText = "";
    if (referenceFormatFileBase64 && referenceFormatFileMimeType && promptType === "generate") {
      if (referenceFormatFileMimeType.includes("wordprocessingml.document")) {
        const refBuffer = Buffer.from(referenceFormatFileBase64, "base64");
        const { value: refText } = await mammoth.extractRawText({ buffer: refBuffer });
        extractedReferenceText = refText || "";
      } else {
        contents.push({
          inlineData: {
            mimeType: referenceFormatFileMimeType,
            data: referenceFormatFileBase64,
          }
        });
      }
    }

    // Convert Word documents to raw text before processing
    let processedRawText = rawLaoText || "";
    let isWordDoc = false;
    if (fileBase64 && mimeType && mimeType.includes("wordprocessingml.document")) {
      isWordDoc = true;
      const buffer = Buffer.from(fileBase64, "base64");
      const { value: wordText } = await mammoth.extractRawText({ buffer });
      processedRawText = wordText || " ";
    }

    const formatInstruction = `
IMPORT FONT MAPPING RULES (CRITICAL):
For the converted formatted content (HTML formatted), you MUST ALWAYS separate Lao characters from Latin letters and numbers to apply beautiful typographic fonts (Phetsarath OT for Lao, Times New Roman for Latin):
1. Every Lao letter, Lao word, or Lao phrase MUST be wrapped in an HTML span tag with the class "font-lao":
   e.g., <span class="font-lao">ສະບາຍດີ</span>, <span class="font-lao">ສາທາລະນະລັດ...</span>
2. Every Latin letter (English word / name), Number (digits 0-9), punctuation (/, -, (, ), &), or code reference MUST be wrapped in an HTML span tag with the class "font-roman":
   e.g., <span class="font-roman">No. 129/PM</span>, <span class="font-roman">2026-05-25</span>, <span class="font-roman">Ministry</span>.
3. CRITICAL: Clean all double spaces and remove unnecessary spaces between words, especially in Lao text (as Lao generally does not use spaces between words). Ensure there are no double spaces.
4. Correct and fix any Error Fonts, weird font artifacts, legacy encoded text, and typos. Fix font errors so everything is clean Unicode Lao.`;

    const templateInstruction = `
5. Structure the output as an elegant, clean Lao Government formal letter template containing:
   - Motto header: centered "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ" (font-lao) and "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ" (font-lao)
   - Left side: Issuer organization / Department
   - Right side: Reference ID (ເລກທີ...) and Date (ວັນທີ...)
   - Standard Subject ("ເລື່ອງ: ...") and Attention ("ຮຽນ: ...")
   - Spaced paragraphs, clean alignments
   - Representative signatory block at the bottom right.`;

    if (promptType === "generate") {
      promptString = `
You are an expert Lao government administrative assistant.
The admin has defined the following standard structural template / rules for this type of document:
"""
${documentContext || "Standard official Lao documentation template."}
"""

${extractedReferenceText ? `The admin ALSO uploaded a reference layout document for you to strictly mimic. The extracted text flow is: \n"""\n${extractedReferenceText}\n"""\nFollow this reference structure exactly.` : ""}

The user has provided the following rough draft or request:
"""
${processedRawText}
"""

Write a completely polished, formal Lao government letter/document satisfying the user's request while strictly following the admin's structural rules above.
Expand on details formally if the user's draft is too brief.
${formatInstruction}
${templateInstruction}
`;
      contents.push({ text: promptString });
    } else if (promptType === "font-convert" || isWordDoc) {
      promptString = `
You are given a raw piece of text written in Lao.
Perform the following:
1. Parse and correct any spelling/typo errors.
2. If it contains old Lao font spellings or transcriptions (such as Saysettha, Sanyasit), convert them to modern unicode Lao text (Phetsarath OT / standard Lao).
3. Do NOT add any extra information, headers, or structural content that is not present in the source text. Your job is ONLY to convert and format the exact text provided securely.
4. Output the raw plain text. DO NOT use any HTML tags like <span class="font-roman">, just output exactly the converted text.

Text to convert:
"""
${processedRawText}
"""
`;
      contents.push({ text: promptString });
    } else {
      if (!fileBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing file base64 data or mimeType" });
      }

      const isPdf = mimeType.toLowerCase().includes("pdf");
      const documentPart = {
        inlineData: {
          mimeType: mimeType,
          data: fileBase64,
        },
      };

      promptString = `
You are given an uploaded ${isPdf ? "PDF" : "Image"} document containing a Lao formal letter or business log.
Perform OCR, correct any transcription errors, convert any legacy Lao fonts (typewriter or legacy ASCII representations) to modern unicode Lao language, and align the output with standard Lao government administration patterns.
${formatInstruction}
${templateInstruction}
`;
      contents.push(documentPart);
      contents.push({ text: promptString });
    }

    // Call Gemini 3.5 Flash for multimodal processing and JSON generation
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are an expert Lao government administrative assistant and structural document translation machine. You read documents (images, PDFs, or raw text), normalize fonts into modern Unicode Lao (Phetsarath) and Latin numbers/letters (Times New Roman), and structure letters in formal administrative templates.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Extract the exact Subject or Title of the document" },
            sender: { type: Type.STRING, description: "Extract the administrative department or company sending this letter" },
            receiver: { type: Type.STRING, description: "Extract the target recipient organization or person" },
            originalText: { type: Type.STRING, description: "Full transcript of the parsed text prior to formatting" },
            convertedText: { type: Type.STRING, description: "Fully formatted formal governmental HTML body string using nested font-lao and font-roman spans." },
            flowStatus: { type: Type.STRING, description: "Automatic tracking status recommendation, e.g. Draft, Received, Processing, Filed" },
            summary: { type: Type.STRING, description: "A summary of the letters intent and core contents (1-2 sentences)" },
            referenceNo: { type: Type.STRING, description: "Administrative letter number, e.g., '145/ກປ'" },
            referenceDate: { type: Type.STRING, description: "Date of the formal letter, converted to standard format if possible" }
          },
          required: ["title", "sender", "receiver", "originalText", "convertedText", "flowStatus", "summary"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text received from Gemini.");
    }

    let cleanText = responseText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\n?/, "").replace(/```\n?$/, "").trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\n?/, "").replace(/```\n?$/, "").trim();
    }
    const resultData = JSON.parse(cleanText);
    return res.json(resultData);

  } catch (error: any) {
    console.error("Gemini Converter Endpoint Error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process document. Please check your inputs and try again."
    });
  }
});

// Setup Vite Dev Server / Static Asset hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lao Document Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
