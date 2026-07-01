import { GoogleGenAI, Type } from "@google/genai";

// API keys are NOT hard-coded. Provide GEMINI_API_KEY via environment (.env.local
// locally, or the host's env vars in production). Admins can also add keys at
// runtime through the Settings panel (see addRuntimeApiKey below).
const KEY_CANDIDATES: string[] = [];
const TOOL_API_KEYS: Record<string, string> = {};

export function addRuntimeApiKey(key: string, toolAction?: string) {
  if (!key || key.trim().length <= 5) return;
  const tKey = key.trim();
  
  if (toolAction && toolAction !== "global") {
    TOOL_API_KEYS[toolAction] = tKey;
  } else if (!KEY_CANDIDATES.includes(tKey)) {
    KEY_CANDIDATES.unshift(tKey);
  }
}

// Model can be overridden with the GEMINI_MODEL env var; defaults to a known-good model.
export const getModelForPromptType = (promptType: string) => {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
};

export function getCandidateApiKeys(promptType?: string): string[] {
  const keys: string[] = [];
  
  if (promptType && TOOL_API_KEYS[promptType]) {
    keys.push(TOOL_API_KEYS[promptType]);
  }
  
  for (const candidate of KEY_CANDIDATES) {
    if (!keys.includes(candidate)) {
      keys.push(candidate);
    }
  }

  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY.trim())) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  
  return keys.filter(k => k && k.length > 5);
}

export interface GeminiResponseSchema {
  title: string;
  sender: string;
  receiver: string;
  originalText: string;
  convertedText: string;
  flowStatus: string;
  summary: string;
  referenceNo: string;
  referenceDate: string;
  recommendedFormat: string;
}

export async function callGeminiConvert(
  contents: any[], 
  promptType: string, 
  isOcr: boolean = false,
  customSystemInstruction?: string
): Promise<GeminiResponseSchema> {
    const keys = getCandidateApiKeys(promptType);
    if (keys.length === 0) {
      throw new Error("Gemini API key is missing. Please configuration your key in Settings or contact the developer.");
    }

    const payload: any[] = [];
    for (const part of contents) {
      if (typeof part === "string") {
        payload.push({ text: part });
      } else if (part && typeof part === "object") {
        if (part.text) {
          payload.push({ text: part.text });
        } else if (part.inlineData) {
          payload.push({
            inlineData: {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            }
          });
        } else if (part.type === "image_url" || part.imageUrl) {
          const urlStr = part.imageUrl?.url || part.image_url?.url || "";
          if (urlStr.startsWith("data:")) {
            const matches = urlStr.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              payload.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          }
        }
      }
    }

    const activeKey = keys[0];
    const ai = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const baseSystemInstruction = "You are an expert document transcriber and translator. You read documents (ALL pages of multi-page PDFs, images, or raw text) and convert them accurately. When processing PDFs, you MUST process and convert ALL PAGES of the document, maintaining the sequential order.";
    const model = getModelForPromptType(promptType);
    
    // Choose the active system instruction
    const systemInstruction = customSystemInstruction 
      ? customSystemInstruction 
      : (isOcr 
          ? baseSystemInstruction + " You are ALSO a Lao government administrative assistant. You structure letters in formal administrative templates and translate accurately."
          : baseSystemInstruction);

    console.log(`[Gemini Request] Mapping and processing via Google GenAI on ${model}...`);

    const response = await ai.models.generateContent({
      model: model,
      contents: payload,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Extract the exact Subject or Title of the document" },
            sender: { type: Type.STRING, description: "Extract the administrative department or company sending this letter" },
            receiver: { type: Type.STRING, description: "Extract the target recipient organization or person" },
            originalText: { type: Type.STRING, description: "Full transcript of the parsed text prior to formatting" },
            convertedText: { type: Type.STRING, description: "Fully formatted formal governmental HTML body string without font-level span classes." },
            flowStatus: { type: Type.STRING, description: "Automatic tracking status recommendation, e.g. Draft, Received, Processing, Filed" },
            summary: { type: Type.STRING, description: "A summary of the letters intent and core contents (1-2 sentences)" },
            referenceNo: { type: Type.STRING, description: "Administrative letter number, e.g., '145/ກປ'" },
            referenceDate: { type: Type.STRING, description: "Date of the formal letter, converted to standard format if possible" },
            recommendedFormat: { type: Type.STRING, description: "Based on the content of the document (tables, slides, standard letter etc), recommend the best export format: 'Word', 'Excel', 'PowerPoint', or 'PDF'." }
          },
          required: ["title", "sender", "receiver", "originalText", "convertedText", "flowStatus", "summary", "recommendedFormat"]
        }
      }
    });

    const rawResponse = response.text || "";
    return safeParseGeminiResponse(rawResponse);
}

export function safeParseGeminiResponse(rawResponse: string): GeminiResponseSchema {
  const cleanInput = rawResponse.trim();
  if (!cleanInput) {
    return createEmptyResponse("Response is empty");
  }

  // Fallback candidates
  let attempt = cleanInput;

  // 1. Try direct parsing first
  try {
    return JSON.parse(attempt) as GeminiResponseSchema;
  } catch (_) {
    // Continue through fallback chain
  }

  // 2. Remove markdown format blocks
  if (attempt.startsWith("```json")) {
    attempt = attempt.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  } else if (attempt.startsWith("```")) {
    attempt = attempt.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }

  try {
    return JSON.parse(attempt) as GeminiResponseSchema;
  } catch (_) {}

  // 3. Find first { and last }
  const firstBrace = attempt.indexOf("{");
  const lastBrace = attempt.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const extracted = attempt.substring(firstBrace, lastBrace + 1);
      return JSON.parse(extracted) as GeminiResponseSchema;
    } catch (_) {}
  }

  // 4. Soft repair/extraction: Find fields via regex if completely mangled or incomplete
  console.warn("Soft repairing fallback parsing for raw response:", rawResponse);
  
  const titleMatch = rawResponse.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const senderMatch = rawResponse.match(/"sender"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const receiverMatch = rawResponse.match(/"receiver"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const flowStatusMatch = rawResponse.match(/"flowStatus"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const summaryMatch = rawResponse.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const referenceNoMatch = rawResponse.match(/"referenceNo"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const referenceDateMatch = rawResponse.match(/"referenceDate"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  const recommendedFormatMatch = rawResponse.match(/"recommendedFormat"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  
  // For larger formatted text, retrieve between convertedText quotes, or default to the full response
  let convertedText = "";
  const convertedTextMatch = rawResponse.match(/"convertedText"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"\w+"\s*:|\s*})/);
  if (convertedTextMatch) {
    convertedText = convertedTextMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  } else {
    convertedText = rawResponse;
  }

  return {
    title: titleMatch ? titleMatch[1] : "Parsed Document",
    sender: senderMatch ? senderMatch[1] : "",
    receiver: receiverMatch ? receiverMatch[1] : "",
    originalText: rawResponse,
    convertedText: convertedText,
    flowStatus: flowStatusMatch ? flowStatusMatch[1] : "Draft",
    summary: summaryMatch ? summaryMatch[1] : "Document processed with soft fallback matching.",
    referenceNo: referenceNoMatch ? referenceNoMatch[1] : "",
    referenceDate: referenceDateMatch ? referenceDateMatch[1] : "",
    recommendedFormat: recommendedFormatMatch ? recommendedFormatMatch[1] : "Word"
  };
}

function createEmptyResponse(reason: string): GeminiResponseSchema {
  return {
    title: "Document processing failure",
    sender: "",
    receiver: "",
    originalText: reason,
    convertedText: `<p style="color:red;">Error processing response: ${reason}</p>`,
    flowStatus: "Draft",
    summary: "An error occurred during API communication.",
    referenceNo: "",
    referenceDate: "",
    recommendedFormat: "Word"
  };
}

