import { callGeminiConvert, GeminiResponseSchema, AIAuth } from "../../utils/geminiClient";

export async function draftDocument(
    rawLaoText: string,
    documentContext: string, // Used for documentType
    referenceFormatFileBase64?: string,
    referenceFormatFileMimeType?: string,
    targetLanguage?: string, // Added targetLanguage
    auth?: AIAuth
): Promise<GeminiResponseSchema> {
    
    // Validate targetLanguage
    const selectedLanguage = targetLanguage || "Lao";
    const documentType = documentContext || "Auto-Detect";

    const promptString = `
You are an expert administrative assistant for the Lao PDR. Your task is to generate a highly formal, perfectly structured official document based on the user's rough input.
Instructions:
1.	Language Requirement: You must write the final document entirely in ${selectedLanguage}.
2.	Document Type: The user requested a ${documentType}. If the type is "Auto-Detect", analyze the user's request and select the most appropriate document type from standard Lao administrative forms.
3.	Page Setup & Formatting Constraints: The output must be formatted to fit a standard A4 page with the following margins: Top 2cm, Bottom 2cm, Right 2cm, Left 3cm. (Assume the text will be rendered in Phetsarath OT for Lao, and Times New Roman for Latin characters/numbers).
4.	Document Architecture: You MUST adhere strictly to the standard Lao official document structure:
o	Top Center: 'ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ' and 'ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ' (Translate these to the selected language if not Lao).
o	Top Left Issuer and Top Right Date: You MUST structure these side-by-side using an HTML table with border: none (border-collapse: collapse; width: 100%; border: 0) with 50% width cells. The left cell aligns the issuing authority, and the right cell aligns the location/date. Do not use float divs, absolute positioning, CSS grid, or CSS flexbox as Microsoft Word does not support them properly.
o	Center: Document Title (Bold).
o	Body: Use Roman numerals for main sections (I, II) and standard numbers for subsections (1, 2).
o	Bottom Zones (Distribution Block on Left, Signatory Block on Right): You MUST also format these side-by-side using an HTML table with width: 100%; border: none; to avoid structural stacked collapse.
5.	Content Generation: Expand the user's prompt into highly professional, bureaucratic terminology suitable for government or official corporate use. Leave placeholders like [......] if specific names, dates, or reference numbers are missing.

User's request or rough input:
"""
${rawLaoText || ""}
"""

Please directly return the final document content structured with HTML elements appropriate for a rich-text editor, so it can be previewed seamlessly.
`;

    const contents: any[] = [{ text: promptString }];
    return callGeminiConvert(contents, "generate", false, undefined, auth);
}

