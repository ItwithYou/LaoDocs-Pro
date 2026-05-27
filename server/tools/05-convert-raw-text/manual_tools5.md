# Tool 5: ແປງຟອນ (Convert) - Developer Manual

This manual details the capabilities and responsibilities of **Tool 5 (ແປງຟອນ / Convert)** in the current system. Note: Only this tool will be documented and discussed per your instructions, and any future changes made to this tool will be recorded here.

## 📌 What Tool 5 Can Do Now

Tool 5's functionality in the UI (formerly known as `Raw Text Input`, now `ແປງຟອນ (Convert)`) has been heavily refactored to be **OFFLINE by default**. It parses raw Lao text, corrects common grammar and typographical errors using a local dictionary, and structures font assignments efficiently using CSS mapping instead of API calls.

### Core Features (Offline Mode UI):
1. **Raw Text Input Handling (Offline):**
   - Receives raw input text directly in the browser. 
   - Uses zero API quota, removing the guest trial limit entirely for this specific tab.

2. **Smart Grammar & Typo Auto-Fix (Offline):**
   - Contains a built-in offline dictionary mapping common Lao grammar/spelling errors to correct versions (e.g., `ຫລື` → `ຫຼື`, `ຫລາຍ` → `ຫຼາຍ`, `ຂື້ນ` → `ຂຶ້ນ`, `ໃຫມ່` → `ໃໝ່`, and more).
   - If an error is matched and fixed, it immediately triggers an `alert()` to explicitly notify the user about which words were automatically corrected.

3. **Smart Spacing Clean-up:**
   - Cleans up and normalizes double spaces (standardizing spacing automatically).
   - Limits line-breaks to a maximum of 2 to keep documents neat.

4. **Offline Font Auto-Formatting (Petsarath OT + Times New Roman):**
   - Instead of inserting literal `<span class="font-roman">` HTML tags via a heavy AI prompt, the translated text is placed inside a container with `.global-doc-font` CSS (`font-family: 'Times New Roman', 'Phetsarath OT'`). Let the browser's native font-fallback automatically render numbers and Latin characters in Times New Roman, and Lao characters in Phetsarath OT.

5. **Legacy Server Tool (Deprecated for Text Tab):**
   - The original `/server/tools/05-convert-raw-text/index.ts` containing the Gemini API prompt is still available on the backend if needed by other workflows, but the Document Converter frontend UI has been strictly decoupled from it for this offline workflow.

---
*(Note: As per your instructions, I will only focus on this tool, and any updates made to this tool's code in the future will be appended/modified in this manual file.)*
