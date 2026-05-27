# Tool 2: Format Original (`02-format-original`) - Developer Manual

This manual details the capabilities and responsibilities of **Tool 2 (Format Original)** in the system. Per your instructions, this manual lists what the tool does now and tracks all changes made.

## 📌 What Tool 2 Can Do Now

Tool 2 (`/server/tools/02-format-original/index.ts`) is designed to parse an uploaded document and convert it into structurally identical, valid HTML while preserving its original language without translating.

### Core Features & Integration:
1. **Engine Upgrade (OpenRouter SDK):**
   - No longer uses Gemini API directly for layout-preserving conversions.
   - Initialized with the official SDK: `import { OpenRouter } from "@openrouter/sdk"`.
   - Leverages **`google/gemini-2.5-flash`** (OpenRouter) as the primary multimodal model to process layout information and render images/PDFs.
   - Uses the dedicated, hardcoded OpenRouter key: `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` with native streaming enabled.

2. **File Input & Visual Mapping:**
   - Accepts base64 encoded document images/PDFs and processes them.
   - Encodes the file using standard OpenAI-compatible `image_url` block payload (`data:${mimeType};base64,...`) passed to OpenRouter.

3. **Verbatim Transcription & Structure Preservation:**
   - Strict instructions to transcribe text in the **ORIGINAL** language.
   - Enforces no translations (preserving Lao, English, numbering, tabular formatting, headings, alignment) verbatim.

4. **Response Structure & Formatting:**
   - Solicits a strictly formatted JSON representation containing metadata (`title`, `sender`, `receiver`, `referenceNo`, `referenceDate`, `flowStatus`, `summary`, `recommendedFormat`) and the `convertedText` body.
   - **Page Formatting Wrapper:** Synthesizes and wraps the final output block in an A4 digital context with custom padding of `padding: 2cm 2cm 2cm 3cm;` to match formal Lao standard templates.
   - **Cross-Language Fallback Typography:** Sets `font-family: 'Times New Roman', 'Phetsarath OT', serif;` to dynamically fallback to Phetsarath OT for Lao letters and Times New Roman for English and Numeric content.

---

## 📝 Change History

- **2026-05-26:**
  - Migrated the tool from `callGeminiConvert` to the official `@openrouter/sdk` client.
  - Implemented the `openrouter/owl-alpha` model to stream and parse output.
  - Set the active authentication key to `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`.
  - Configured custom A4 margins and high-fidelity dual Unicode layout rendering wrapping.
  - **SDK Schema Fix:** Corrected input validation error (`SDKValidationError: Input validation failed`) by mapping snake_case `image_url` property to camelCase `imageUrl` (with inner `url` property) in alignment with the `@openrouter/sdk` operational strict typing scheme.
  - **Vision Model Fix:** Resolved `No endpoints found that support image input` error on OpenRouter by migrating the primary formatting engine to the highly capable multimodal **`google/gemini-2.5-flash`** model. This provides full native visual parsing of physical styles, lists, headers, alignments, and tabular layouts while preserving text in the source language.
  - **Credit/Token Restriction Fix:** Resolved the credit pricing limitation error (`PaymentRequiredResponseError: This request requires more credits, or fewer max_tokens`) by limiting the conversational request's maximum output tokens to a solid **`maxTokens: 4000`** with a deterministic **`temperature: 0.1`**, ensuring it processes successfully under key limit constraints.
