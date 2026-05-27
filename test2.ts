import HTMLtoDOCX from 'html-to-docx';
import fs from 'fs';

async function generate() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Times New Roman", "Phetsarath OT", serif; font-size: 12pt; }
    p { margin-bottom: 8pt; line-height: 1.15; text-align: justify; }
  </style>
</head>
<body>
  <p>Hello world</p>
</body>
</html>`;
  const buf = await HTMLtoDOCX(html, null, {
    margins: { top: 1134, bottom: 1134, left: 1701, right: 1134 }
  });
  fs.writeFileSync('test2.docx', buf as Buffer);
  console.log("Size:", buf.length);
}
generate().catch(console.error);
