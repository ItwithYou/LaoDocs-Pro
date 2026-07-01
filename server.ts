import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import HTMLtoDOCX from "html-to-docx";
import JSZip from "jszip";
import { extractTextFromWordBase64 } from "./server/utils/documentParser";

import { draftDocument } from "./server/tools/04-draft-document";
import { convertRawText } from "./server/tools/05-convert-raw-text";
import { retypeDocument } from "./server/tools/01-retype";
import { formatOriginal } from "./server/tools/02-format-original";
import { processRecommended } from "./server/tools/03-recommended-ai";
import { addRuntimeApiKey, getCandidateApiKeys } from "./server/utils/geminiClient";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit for base64 PDF and Image uploads
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

app.post("/api/admin/set-api-key", (req, res) => {
  const { apiKey, toolAction } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: "API key is required" });
  }
  addRuntimeApiKey(apiKey, toolAction);
  res.json({ success: true, message: "API key added to runtime successfully" });
});

app.get("/api/admin/get-api-keys", async (req, res) => {
  try {
    const keys = getCandidateApiKeys();
    const result: any[] = [];

    for (const k of keys) {
      if (!k) continue;
      const masked = k.substring(0, 7) + "..." + k.substring(k.length - 4);
      let status = "Checking...";
      let errorMessage = "";

      try {
        const ai = new GoogleGenAI({ apiKey: k });
        // Use a ultra simple, cheapest model test to see if API responds correctly
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "Hello",
        });
        if (response && response.text) {
          status = "Active & Working";
        } else {
          status = "No Response";
        }
      } catch (err: any) {
        status = "Invalid / Expired";
        errorMessage = err.message || String(err);
      }

      result.push({
        masked,
        status,
        errorMessage,
        isDefault: false,
        isEnv: k === process.env.GEMINI_API_KEY
      });
    }

    res.json({ keys: result });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load keys", message: error.message });
  }
});

// AI Document Parser & Font Converter endpoint
app.post("/api/gemini/convert", async (req, res) => {
  try {
    const { 
        fileBase64, 
        mimeType, 
        promptType, 
        rawLaoText, 
        documentContext, 
        referenceFormatFileBase64, 
        referenceFormatFileMimeType,
        targetLanguage
    } = req.body;

    let isWordDoc = false;
    let processedRawText = rawLaoText || "";

    if (fileBase64 && mimeType && mimeType.includes("wordprocessingml.document")) {
      isWordDoc = true;
      processedRawText = await extractTextFromWordBase64(fileBase64);
    }

    let result;

    if (promptType === "generate") {
        result = await draftDocument(processedRawText, documentContext, referenceFormatFileBase64, referenceFormatFileMimeType, targetLanguage);
    } 
    else if (promptType === "font-convert" || isWordDoc) {
        result = await convertRawText(processedRawText);
    } 
    else if (promptType === "retype") {
        result = await retypeDocument(fileBase64, mimeType);
    } 
    else if (promptType === "format-original") {
        result = await formatOriginal(fileBase64, mimeType);
    } 
    else {
        result = await processRecommended(fileBase64, mimeType, targetLanguage);
    }

    return res.json(result);

  } catch (error: any) {
    console.error("Gemini Converter Endpoint Error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process document. Please check your inputs and try again."
    });
  }
});

app.post("/api/export/docx", async (req, res) => {
  const { htmlContent } = req.body;
  try {
    let cleanedHtml = htmlContent || "";
    if (!cleanedHtml) {
      return res.status(400).json({ error: "Missing HTML content" });
    }

    // Strip out interactive/script/style/vector/button elements completely to prevent html-to-docx parser crashes
    cleanedHtml = cleanedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleanedHtml = cleanedHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    cleanedHtml = cleanedHtml.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");
    cleanedHtml = cleanedHtml.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "");

    // Clean up double-spacing and standard typography layout anomalies
    cleanedHtml = cleanedHtml.replace(/[ \t]{2,}/g, ' ');

    // Convert legacy <center> tags to paragraphs with direct text alignment styles for compatibility
    cleanedHtml = cleanedHtml.replace(/<center>/gi, '<p style="text-align: center;">');
    cleanedHtml = cleanedHtml.replace(/<\/center>/gi, '</p>');

    // Convert only leaf-level <div> tags (divs with no nested tables, divs, or paragraphs) to <p> tags.
    // This allows alignment styles on leaf content to render correctly in Word while preserving container layouts.
    let previousHtml;
    do {
      previousHtml = cleanedHtml;
      cleanedHtml = cleanedHtml.replace(/<div\b([^>]*)>([^<]*(?:<(?!div|table|p|tr|td)[^>]*>[^<]*)*)<\/div>/gi, '<p$1>$2</p>');
    } while (cleanedHtml !== previousHtml);

    // Standardize all element structures, merging classes/alignments to a single 'style' attribute and removing duplicates
    let currentTableHasBorder = false;
    cleanedHtml = cleanedHtml.replace(/<([a-z1-6]+)\b([^>]*)>/gi, (match, tagName, attrs) => {
      const lowerTag = tagName.toLowerCase();
      
      // Extract class, style, align attributes
      let classMatch = attrs.match(/class=["']([^"']*)["']/i);
      let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      let alignMatch = attrs.match(/align=["']([^"']*)["']/i);

      let classes = classMatch ? classMatch[1] : "";
      let styles = styleMatch ? styleMatch[1].trim() : "";
      if (styles && !styles.endsWith(";")) styles += ";";
      
      let align = alignMatch ? alignMatch[1] : "";

      // Determine text alignments from classes and align attribute
      let alignment = "";
      if (classes.includes("text-center") || align === "center" || classes.includes("center")) {
        alignment = "center";
      } else if (classes.includes("text-right") || align === "right" || classes.includes("right")) {
        alignment = "right";
      } else if (classes.includes("text-justify") || align === "justify" || classes.includes("justify")) {
        alignment = "justify";
      } else if (classes.includes("text-left") || align === "left" || classes.includes("left")) {
        alignment = "left";
      }

      if (alignment && !styles.includes("text-align")) {
        styles += ` text-align: ${alignment};`;
      }

      // Handle font weights
      if ((classes.includes("font-bold") || classes.includes("font-semibold")) && !styles.includes("font-weight")) {
        styles += " font-weight: bold;";
      }

      // Handle table styling
      if (lowerTag === "table") {
        if (!styles.includes("width")) {
          styles += " width: 100%;";
        }
        if (!styles.includes("border-collapse")) {
          styles += " border-collapse: collapse;";
        }
        
        const hasBorderAttr = attrs.match(/border=["']([^"']*)["']/i);
        const borderVal = hasBorderAttr ? hasBorderAttr[1] : null;
        const hasBorderClass = classes.includes("border");
        
        // If inline style has 'border: none' or 'border: 0' explicitly:
        const normalizedStylesForCheck = styles.replace(/\s/g, "").toLowerCase();
        const hasInlineNoBorder = normalizedStylesForCheck.includes("border:none") || normalizedStylesForCheck.includes("border:0") || normalizedStylesForCheck.includes("border:0px") || normalizedStylesForCheck.includes("border-left:none") || normalizedStylesForCheck.includes("border-top:none");
        const hasInlineBorder = styles.includes("border:") && !hasInlineNoBorder;

        if (hasInlineNoBorder) {
          currentTableHasBorder = false;
          // Strip existing borders and write direct border: none;
          styles = styles.replace(/border\s*:\s*[^;]+/gi, "").trim();
          styles += " border: none;";
        } else if (hasInlineBorder || (borderVal !== null && borderVal !== "0") || hasBorderClass) {
          currentTableHasBorder = true;
          if (!styles.includes("border")) {
            styles += " border: 0.5pt solid #000000;";
          }
        } else {
          // If no explicit style, default to border: none for professional layout headers
          currentTableHasBorder = false;
          styles += " border: none;";
        }
      }

      // Handle table cells styling
      let cellWidth = "";
      if (lowerTag === "td" || lowerTag === "th") {
        if (!styles.includes("padding")) {
          styles += " padding: 6px 8px;";
        }
        if (!styles.includes("vertical-align")) {
          styles += " vertical-align: top;";
        }
        
        // Fix html-to-docx bug with style="width: 50%" crashing invalid XML name @w
        const widthMatch = styles.match(/width\s*:\s*([^;]+)/i);
        if (widthMatch) {
          cellWidth = widthMatch[1].trim();
          styles = styles.replace(/width\s*:\s*[^;]+;?/gi, "").trim();
        }

        const normalizedStylesForCheck = styles.replace(/\s/g, "").toLowerCase();
        const hasInlineNoBorder = normalizedStylesForCheck.includes("border:none") || normalizedStylesForCheck.includes("border:0") || normalizedStylesForCheck.includes("border:0px") || normalizedStylesForCheck.includes("border-left:none") || normalizedStylesForCheck.includes("border-top:none");
        const hasInlineBorder = styles.includes("border:") && !hasInlineNoBorder;

        if (hasInlineNoBorder) {
          styles = styles.replace(/border\s*:\s*[^;]+/gi, "").trim();
          styles += " border: none;";
        } else if (hasInlineBorder || currentTableHasBorder) {
          if (!styles.includes("border")) {
            styles += " border: 0.5pt solid #000000;";
          }
        } else {
          // Default cell style is border: none unless table has border
          styles += " border: none;";
        }
      }

      // Standard paragraphs
      if (lowerTag === "p" || lowerTag === "div") {
        if (!styles.includes("line-height")) {
          styles += " line-height: 1.0;";
        }
        if (!styles.includes("margin")) {
          styles += " margin-top: 0in; margin-bottom: 0in;";
        }
      }

      // Add default font to body/div/p if not already there to ensure perfect dual font rendering
      if (lowerTag === "body" || lowerTag === "p" || lowerTag === "td" || lowerTag === "th" || lowerTag === "div") {
        if (!styles.includes("font-family")) {
          styles += " font-family: 'Times New Roman', 'Phetsarath OT', 'Phetsarath', serif;";
        }
        if (!styles.includes("font-size")) {
          styles += " font-size: 12pt;";
        }
        if (!styles.includes("color")) {
          styles += " color: #000000;";
        }
      }

      // Build clean attributes by filtering out class/align/style/border attributes
      let cleanAttrs = attrs
        .replace(/class=["']([^"']*)["']/gi, "")
        .replace(/style=["']([^"']*)["']/gi, "")
        .replace(/align=["']([^"']*)["']/gi, "")
        .replace(/border=["']([^"']*)["']/gi, "")
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      if (styles) {
        cleanAttrs = `style="${styles.replace(/\s+/g, " ").trim()}" ${cleanAttrs}`.trim();
      }

      if ((lowerTag === "td" || lowerTag === "th") && cellWidth) {
        cleanAttrs = `width="${cellWidth}" ${cleanAttrs}`.trim();
      }

      return `<${tagName} ${cleanAttrs}>`.replace(/\s+>/, ">");
    });

    const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: "Phetsarath OT", "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.0;
      color: #000000;
    }
    p {
      margin-top: 0pt;
      margin-bottom: 0pt;
      line-height: 1.0;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
      margin-bottom: 8pt;
    }
    td, th {
      padding: 6px 8px;
      vertical-align: top;
    }
    .text-center, .center { text-align: center; }
    .text-right, .right { text-align: right; }
    .text-left, .left { text-align: left; }
    .text-justify { text-align: justify; }
    .font-bold, .font-semibold { font-weight: bold; }
  </style>
</head>
<body spellcheck="false">
  ${cleanedHtml}
</body>
</html>`;

    let fileBuffer;
    try {
      fileBuffer = await HTMLtoDOCX(wrappedHtml, null, {
        margins: {
          top: 1134, // 2cm
          bottom: 1134, // 2cm
          left: 1701, // 3cm
          right: 1134, // 2cm
          header: 720,
          footer: 720,
          gutter: 0
        },
         font: "Phetsarath OT",
        table: {
          row: { cantSplit: true }
        }
      });
    } catch (primaryErr) {
      console.warn("Primary DOCX generation failed, retrying with raw stripped style...", primaryErr);
      const ultraCleanHtml = wrappedHtml.replace(/style=["']([^"']*)["']/gi, "");
      fileBuffer = await HTMLtoDOCX(ultraCleanHtml, null, {
        margins: {
          top: 1134,
          bottom: 1134,
          left: 1701,
          right: 1134,
          header: 720,
          footer: 720,
          gutter: 0
        },
        // Keep the Lao font on the fallback path too, otherwise Lao glyphs
        // render as empty boxes when the primary generation fails.
        font: "Phetsarath OT"
      });
    }

    const zip = await JSZip.loadAsync(fileBuffer);

    // Dual-font mapping: Latin letters & digits use Times New Roman, while Lao
    // (a complex script) is routed to Phetsarath OT via the w:cs / w:eastAsia
    // slots. If a viewer ever shows Lao as boxes, set every typeface below to
    // "Phetsarath OT" to force the Lao font everywhere.
    const applyDualFonts = async (filePath) => {
      if (zip.file(filePath)) {
        let xml = await zip.file(filePath).async("string");
        xml = xml.replace(/<w:rFonts\b[^>]*?\/?>/g, '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Phetsarath OT" w:eastAsia="Phetsarath OT" w:hint="default" />');
        zip.file(filePath, xml);
      }
    };

    // Rewrite the theme font scheme so Word never falls back to Calibri for
    // either Latin or Lao text.
    const applyThemeFonts = async (filePath) => {
      if (zip.file(filePath)) {
        let xml = await zip.file(filePath).async("string");
        xml = xml.replace(/<a:latin\b[^>]*?\/?>/g, '<a:latin typeface="Times New Roman"/>');
        xml = xml.replace(/<a:ea\b[^>]*?\/?>/g, '<a:ea typeface="Phetsarath OT"/>');
        xml = xml.replace(/<a:cs\b[^>]*?\/?>/g, '<a:cs typeface="Phetsarath OT"/>');
        zip.file(filePath, xml);
      }
    };

    await applyDualFonts("word/styles.xml");
    await applyDualFonts("word/document.xml");
    await applyThemeFonts("word/theme/theme1.xml");

    const modifiedBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const buffer = Buffer.from(modifiedBuffer);
    res.json({ docxBase64: buffer.toString("base64") });
  } catch (err: any) {
    console.error("Error generating DOCX:", err);
    res.status(500).json({ error: "Failed to generate native DOCX document.", message: err.message });
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
