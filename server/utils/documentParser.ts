import mammoth from "mammoth";

export async function extractTextFromWordBase64(base64Data: string): Promise<string> {
    const buffer = Buffer.from(base64Data, "base64");
    const { value: wordText } = await mammoth.extractRawText({ buffer });
    return wordText || " ";
}

export function buildDocumentPart(mimeType: string, fileBase64: string) {
    return {
        inlineData: {
          mimeType: mimeType,
          data: fileBase64,
        }
    };
}
