import HTMLtoDOCX from 'html-to-docx';
import fs from 'fs';
import JSZip from 'jszip';

async function generate() {
  const html = `<!DOCTYPE html><html><body><p>Hello world</p></body></html>`;
  const buf = await HTMLtoDOCX(html, null, {
    margins: { top: 1134, bottom: 1134, left: 1701, right: 1134, header: 720, footer: 720, gutter: 0 }
  });
  
  const zip = await JSZip.loadAsync(buf);
  const doc = await zip.file('word/document.xml')?.async('string');
  console.log(doc);
}
generate().catch(console.error);
