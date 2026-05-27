
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractText(file: File): Promise<string> {
  if (file.type.includes('wordprocessingml.document')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // @ts-ignore
      text += content.items.map((item: any) => item.str).join(" ");
    }
    return text;
  } else if (file.type.startsWith('image/')) {
    const result = await Tesseract.recognize(file, 'eng+lao');
    return result.data.text;
  }
  return "Unsupported file type";
}
