import { callGeminiConvert, GeminiResponseSchema, AIAuth } from "../../utils/geminiClient";
import { convertSaysetthaToUnicode } from "./converter";

export async function convertRawText(text: string, auth?: AIAuth): Promise<GeminiResponseSchema> {
    const preConvertedText = convertSaysetthaToUnicode(text);

    const promptString = `
You are an expert Lao document converter.
You are given a raw piece of text that was already converted from legacy Saysettha ASCII to modern Lao Unicode.
The text might contain some spelling errors, typos, or disjointed characters resulting from the automatic conversion map.

Perform the following:
1. Parse and correct any spelling/typo errors in the Lao text to make it readable and correct. Read the context and fix the broken words.
2. Keep the original document formatting and paragraphs.
3. Output ONLY the converted plain text, no HTML span tags, no explanations. Do not include markdown \`\`\` blocks if possible.

Text to fix and format:
"""
${preConvertedText}
"""
`;
    return callGeminiConvert([{ text: promptString }], "font-convert", false, undefined, auth);
}
