import { callGeminiConvert, GeminiResponseSchema } from "../../utils/geminiClient";
import { buildDocumentPart } from "../../utils/documentParser";

export async function retypeDocument(fileBase64: string, mimeType: string): Promise<GeminiResponseSchema> {
    if (!fileBase64 || !mimeType) {
        throw new Error("Missing file base64 data or mimeType");
    }
    const isPdf = mimeType.toLowerCase().includes("pdf");
    
    // Custom system instruction for exact character-by-character retyping based on visual memory
    const systemPrompt = `
You are an expert transcriber and document parser. The user uploaded a ${isPdf ? "PDF" : "Image/document"} containing complex Lao typography and legacy fonts that standard OCR cannot read.
Your task is to "scan, render, and retype" the entire document. You must use your internal LLM memory of Lao characters to visually match and retype exactly what is written in the document.

CRITICAL DIRECTIONS:
1. Do NOT translate from Lao to English or vice-versa. Retype everything exactly in the source language (Lao, English, Numbers). 
2. Match characters exactly to what you see. Correct any obvious physical scanning artifacts but do not change the words.
3. Keep the original layout structure, paragraphs, list numbering.
4. DO NOT wrap the output in any <div style="...">. Just output simple HTML like <p> and <br>.
`;

    console.log("[Tool 01] Retyping document via Gemini API...");
    
    // Construct the standard contents array for Google GenAI SDK
    const contents = [
        buildDocumentPart(mimeType, fileBase64),
        { text: "Retype this document exactly, verbatim in the original language, adhering to the transcription rules." }
    ];

    const response = await callGeminiConvert(contents, "retype", false, systemPrompt.trim());
    const rawText = response.convertedText || "";
    
    // We will ensure it is wrapped in an A4 container for the frontend
    const A4Wrapper = `
<div style="font-family: 'Times New Roman', 'Phetsarath OT', serif; padding: 2cm 2cm 2cm 3cm; box-sizing: border-box; min-height: 100%;">
${rawText}
</div>
    `.trim();

    return {
        title: response.title || "Retyped Document (AI OCR)",
        sender: response.sender || "",
        receiver: response.receiver || "",
        referenceNo: response.referenceNo || "",
        referenceDate: response.referenceDate || "",
        flowStatus: response.flowStatus || "Draft",
        recommendedFormat: response.recommendedFormat || "Word",
        originalText: response.originalText || rawText,
        convertedText: A4Wrapper,
        summary: response.summary || "Retyped accurately using AI character matching to ensure Lao fonts are rendered properly."
    };
}


