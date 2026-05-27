import JSZip from 'jszip';
import fs from 'fs';

async function check() {
  const data = fs.readFileSync('test2.docx');
  const zip = await JSZip.loadAsync(data);
  const files = Object.keys(zip.files);
  console.log(files);
}
check().catch(console.error);
