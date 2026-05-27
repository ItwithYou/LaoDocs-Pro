import JSZip from 'jszip';
import fs from 'fs';

async function check() {
  const data = fs.readFileSync('test2.docx');
  const zip = await JSZip.loadAsync(data);
  const doc = await zip.file('word/document.xml')?.async('string');
  console.log(doc);
}
check().catch(console.error);
