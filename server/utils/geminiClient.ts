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

// ---------------------------------------------------------------------------
// Multi-provider "bring your own key" support.
// Users paste their own key; we auto-detect the provider from the key shape.
// ---------------------------------------------------------------------------
export type AIProvider = "gemini" | "openai" | "openrouter";

export interface AIAuth {
  apiKey?: string;
  provider?: AIProvider | string;
  model?: string;
}

// Guess the provider from the API key format.
export function detectProvider(key?: string): AIProvider {
  const k = (key || "").trim();
  if (k.startsWith("sk-or-")) return "openrouter";
  if (k.startsWith("sk-")) return "openai";
  if (k.startsWith("AIza")) return "gemini";
  // Unknown/empty: if a key was given assume an OpenAI-compatible endpoint,
  // otherwise fall back to Gemini (server env key).
  return k ? "openai" : "gemini";
}

function resolveProvider(auth?: AIAuth): AIProvider {
  const p = (auth?.provider || "").toString().trim().toLowerCase();
  if (p === "gemini" || p === "openai" || p === "openrouter") return p;
  return detectProvider(auth?.apiKey);
}

// Default model per provider when the user does not specify one.
function defaultModelFor(provider: AIProvider): string {
  if (provider === "openrouter") return process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.2-11b-vision-instruct:free";
  if (provider === "openai") return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

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
  customSystemInstruction?: string,
  auth?: AIAuth
): Promise<GeminiResponseSchema> {
    const baseSystemInstruction = "You are an expert document transcriber and translator. You read documents (ALL pages of multi-page PDFs, images, or raw text) and convert them accurately. When processing PDFs, you MUST process and convert ALL PAGES of the document, maintaining the sequential order.";
    const systemInstruction = customSystemInstruction
      ? customSystemInstruction
      : (isOcr
          ? baseSystemInstruction + " You are ALSO a Lao government administrative assistant. You structure letters in formal administrative templates and translate accurately."
          : baseSystemInstruction);

    const provider = resolveProvider(auth);

    // OpenAI / OpenRouter / any OpenAI-compatible provider.
    if (provider !== "gemini") {
      if (!auth?.apiKey) {
        throw new Error(`An API key is required to use ${provider}. Add your key in the AI Keys panel.`);
      }
      return callOpenAICompatible(contents, systemInstruction, { ...auth, provider });
    }

    // Gemini path — use the user's own key if provided, else server env/candidates.
    const keys = auth?.apiKey ? [auth.apiKey.trim()] : getCandidateApiKeys(promptType);
    if (keys.length === 0) {
      throw new Error("No Gemini API key found. Add your own key in the AI Keys panel, or set GEMINI_API_KEY on the server.");
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

    const model = auth?.model?.trim() || getModelForPromptType(promptType);
    console.log(`[AI Request] provider=gemini model=${model}...`);

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

// ---------------------------------------------------------------------------
// OpenAI-compatible providers (OpenAI, OpenRouter, and any compatible endpoint).
// Uses the standard /chat/completions API with vision (image) content blocks.
// ---------------------------------------------------------------------------
const JSON_FIELDS_INSTRUCTION = `

Return ONLY a single valid JSON object (no markdown fences, no commentary) with these exact string fields:
"title", "sender", "receiver", "originalText", "convertedText", "flowStatus", "summary", "referenceNo", "referenceDate", "recommendedFormat".
- "convertedText" must contain the fully formatted HTML body of the document.
- "recommendedFormat" must be one of: "Word", "Excel", "PowerPoint", "PDF".`;

async function callOpenAICompatible(
  contents: any[],
  systemInstruction: string,
  auth: AIAuth
): Promise<GeminiResponseSchema> {
  const provider = (auth.provider as AIProvider) || "openai";
  const key = (auth.apiKey || "").trim();
  const model = auth.model?.trim() || defaultModelFor(provider);

  const baseUrl =
    provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";

  // Convert our generic content parts into OpenAI message content blocks.
  const userBlocks: any[] = [];
  let pdfSkipped = false;
  for (const part of contents) {
    if (typeof part === "string") {
      userBlocks.push({ type: "text", text: part });
    } else if (part && typeof part === "object") {
      if (part.text) {
        userBlocks.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        const mime = part.inlineData.mimeType || "";
        const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
        if (mime.includes("pdf")) {
          if (provider === "openrouter") {
            // OpenRouter supports file inputs for some models.
            userBlocks.push({ type: "file", file: { filename: "document.pdf", file_data: dataUrl } });
          } else {
            pdfSkipped = true;
          }
        } else {
          userBlocks.push({ type: "image_url", image_url: { url: dataUrl } });
        }
      }
    }
  }
  if (pdfSkipped) {
    userBlocks.push({
      type: "text",
      text: "[A PDF was uploaded but this provider cannot read PDFs directly. For PDF files, please use a Google Gemini key.]",
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.APP_URL || "https://laodocs.com";
    headers["X-Title"] = "LaoDocs Pro";
  }

  const body: any = {
    model,
    messages: [
      { role: "system", content: systemInstruction + JSON_FIELDS_INSTRUCTION },
      { role: "user", content: userBlocks },
    ],
    temperature: 0.2,
    max_tokens: 8000,
  };
  // Native JSON mode is reliable on OpenAI; many free OpenRouter models reject it,
  // so we rely on the prompt + robust parser there instead.
  if (provider === "openai") {
    body.response_format = { type: "json_object" };
  }

  console.log(`[AI Request] provider=${provider} model=${model}...`);

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`${provider} API error ${resp.status}: ${errText.slice(0, 400)}`);
  }

  const json: any = await resp.json();
  const rawText: string = json?.choices?.[0]?.message?.content || "";
  if (!rawText) {
    return createEmptyResponse(`${provider} returned an empty response`);
  }
  return safeParseGeminiResponse(rawText);
}

