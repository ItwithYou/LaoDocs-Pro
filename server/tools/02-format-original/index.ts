import { callGeminiConvert, GeminiResponseSchema } from "../../utils/geminiClient";
import { buildDocumentPart } from "../../utils/documentParser";
import { formatInstruction } from "../../utils/prompts";

export async function formatOriginal(fileBase64: string, mimeType: string): Promise<GeminiResponseSchema> {
    if (!fileBase64 || !mimeType) {
        throw new Error("Missing file base64 data or mimeType");
    }
    const isPdf = mimeType.toLowerCase().includes("pdf");
    
    const systemPrompt = `
You are given an uploaded ${isPdf ? "PDF" : "Image"} document.
Your task is to transcribe and perfectly format the document in its ORIGINAL language.
CRITICAL DIRECTIONS:
1. Do NOT translate from Lao to English or vice-versa. Keep the text verbatim in its original language.
2. EXTRACTION GOAL: Perfectly preserve the original document structure (headings, paragraphs, tables, lists, alignment). Do NOT reformat it into a different template. Layout must mimic the source. Use valid HTML for all structural elements.

${formatInstruction}
`;

    console.log("[Tool 02] Formatting original verbatim via Gemini API...");

    const contents = [
        buildDocumentPart(mimeType, fileBase64),
        { text: "Format the document verbatim in its original language according to instructions." }
    ];

    const response = await callGeminiConvert(contents, "format-original", false, systemPrompt.trim());
    const rawText = response.convertedText || "";

    // Apply standard user dual-font configuration and A4 margins and fallback properties
    const A4Wrapper = `
<div style="font-family: 'Times New Roman', 'Phetsarath OT', serif; padding: 2cm 2cm 2cm 3cm; box-sizing: border-box; min-height: 100%;">
${rawText}
</div>
    `.trim();

    return {
        title: response.title || "Formatted Original Document (AI PDF/Image)",
        sender: response.sender || "",
        receiver: response.receiver || "",
        referenceNo: response.referenceNo || "",
        referenceDate: response.referenceDate || "",
        flowStatus: response.flowStatus || "Draft",
        recommendedFormat: response.recommendedFormat || "Word",
        originalText: response.originalText || rawText,
        convertedText: A4Wrapper,
        summary: response.summary || "Parsed and formatted accurately with the layout structure preserved verbatim in its original language using Gemini."
    };
}

