# Tool 4: Draft Document (`04-draft-document`) - Developer Manual

This manual details the capabilities and responsibilities of **Tool 4 (Draft Document)** in the current system. Any future changes made to this tool will be recorded here.

## 📌 What Tool 4 Can Do Now

Tool 4 (`/server/tools/04-draft-document/index.ts`) is an AI-powered drafting assistant designed specifically for creating formal Lao government administrative documents. It takes a brief rough draft or request and expands it into a fully formatted, formal document that strictly adheres to predefined administrative structural rules.

### Core Features (Updated):
1. **Frontend Draft Workspace Integration (React Component):**
   - The system now features a dedicated React component (`AutomatedDocumentDrafter.tsx`) exposing trilingual support (Lao, English, Chinese).
   - Allows users to select standard Document Types (e.g., Decree, Resolution, Order, Proposal, Notice, Auto-Detect) dynamically via a dropdown.
   - Text Area placeholder guides the user to submit brief prompts for full formal expansion.

2. **Backend API Request Handling:**
   - Modified the `draftDocument()` logic to accept a dedicated `targetLanguage` string payload parameter over the API endpoint.
   - Converts the `documentContext` argument organically into the `documentType` parameter, supporting standard Lao government layouts.

3. **Intelligent Document Architecture Instructions:**
   - The LLM prompt explicitly enforces mandatory Lao governance standard layout logic (Top Center headers: "ສາທາລະນະລັດ...", Document Title, Sender/Receiver formats).
   - Translates headers based on the requested output language dynamically.
   - Forces HTML tags to render formally according to specified printing margins: Top 2cm, Bottom 2cm, Right 2cm, Left 3cm.

4. **Formatting Constraints & API Client:**
   - Executes via the shared `callGeminiConvert` utility.
   - Ensures the generated document structure maps perfectly to `GeminiResponseSchema` so that elements easily map back into the unified generic text viewer.
