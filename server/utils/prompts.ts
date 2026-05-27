export const formatInstruction = `
IMPORT FONT MAPPING RULES (CRITICAL):
For the converted formatted content (HTML formatted), DO NOT use manual font tagging (no \`<span class="font-lao">\` or \`<span class="font-roman">\`).
The application automatically handles mixed-language text via CSS fallback chains. Just output raw, valid HTML structure (paragraphs, div, table, strong, em).
Do NOT wrap individual words or phrases in spans solely for language detection.
3. CRITICAL: Clean all double spaces and remove unnecessary spaces between words, especially in Lao text (as Lao generally does not use spaces between words). Ensure there are no double spaces.
4. Correct and fix any Error Fonts, weird font artifacts, legacy encoded text, and typos. Fix font errors so everything is clean Unicode Lao.`;

export const templateInstruction = `
5. Structure the output as an elegant, clean Lao Government formal letter template containing:
   - Motto header: centered "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ" and "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ"
   - Side-by-Side Items (CRITICAL FOR WORD/DOCX COMPATIBILITY):
     To ensure elements align perfectly side-by-side when exported to Microsoft Word/DOCX (which does not support flexbox or float layouts), you MUST use a completely borderless HTML structure table:
     \`<table style="width: 100%; border: none; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">
       <tr>
         <td style="width: 50%; border: none; padding: 0px 4px; text-align: left; vertical-align: top;">
           [ຊື່ກະຊວງ/ອົງການຈັດຕັ້ງຂັ້ນເທິງ]<br/>[ຊື່ພະແນກ/ຫ້ອງການບໍລິຫານ]<br/>ເລກທີ: [.....]/ຫກ
         </td>
         <td style="width: 50%; border: none; padding: 0px 4px; text-align: right; vertical-align: top;">
           ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ [.....]
         </td>
       </tr>
     </table>\`
   - Standard Subject ("ເລື່ອງ: ...") and Attention ("ຮຽນ: ...")
   - Spaced paragraphs, clean alignments
   - Representative signatory block at the bottom right. For side-by-side bottom layouts (e.g., recipient distribution list on the left and signatory stamp zone on the right), also use a clean borderless 2-column HTML table structure to preserve side-by-side alignments in DOCX.`;
