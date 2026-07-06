import { callGeminiConvert, GeminiResponseSchema, AIAuth } from "../../utils/geminiClient";
import { buildDocumentPart } from "../../utils/documentParser";
import { formatInstruction, templateInstruction } from "../../utils/prompts";

export async function processRecommended(fileBase64: string, mimeType: string, targetLanguage: string = "Lao", auth?: AIAuth): Promise<GeminiResponseSchema> {
    if (!fileBase64 || !mimeType) {
        throw new Error("Missing file base64 data or mimeType");
    }
    const isPdf = mimeType.toLowerCase().includes("pdf");
    
    const promptString = `
You are given an uploaded ${isPdf ? "PDF" : "Image"} document containing a formal letter or business log.
Perform OCR, correct any transcription errors, convert any legacy fonts to modern unicode text, and translate it to ${targetLanguage}.
IMPORTANT: The entire document AND all analysis fields in the JSON response (title, sender, receiver, summary, flowStatus) MUST be written in the selected target language: ${targetLanguage}. 
Align the output with standard ${targetLanguage} administration patterns.
${formatInstruction}
${templateInstruction}
`;

    const contents = [
        buildDocumentPart(mimeType, fileBase64),
        { text: promptString }
    ];

    // NOTE: This uses OCR system prompt addition
    return callGeminiConvert(contents, "ocr", true, undefined, auth);
}
