import HTMLtoDOCX from "html-to-docx";

const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Phetsarath OT", "Times New Roman", serif; font-size: 12pt; }
    p { margin-bottom: 8pt; line-height: 1.15; }
  </style>
</head>
<body>
  <p>Hello World</p>
</body>
</html>`;

async function test() {
  try {
    const fileBuffer = await HTMLtoDOCX(wrappedHtml, null, {
      margins: {
        top: 1134, // 2cm
        bottom: 1134, // 2cm
        left: 1701, // 3cm
        right: 1134, // 2cm
        header: 720,
        footer: 720,
        gutter: 0
      },
      font: "Phetsarath OT",
      table: {
        row: { cantSplit: true }
      }
    });
    console.log("Success HTMLtoDOCX");
    const JSZip = require("jszip");
    const zip = await JSZip.loadAsync(fileBuffer);
    
    const applyDualFonts = async (filePath) => {
      if (zip.file(filePath)) {
        let xml = await zip.file(filePath).async("string");
        console.log("Original XML start:", xml.substring(0, 200));
        xml = xml.replace(/w:cstheme="[^"]*"/g, "");
        xml = xml.replace(/w:cs="[^"]*"/g, "");
        xml = xml.replace(/<w:rFonts([^>]*?)(?=\/?>)/g, '<w:rFonts$1 w:cs="Phetsarath OT"');
        zip.file(filePath, xml);
      }
    };

    await applyDualFonts("word/styles.xml");
    await applyDualFonts("word/document.xml");

    const modifiedBuffer = await zip.generateAsync({ type: "nodebuffer" });
    console.log("Success JSZip");

  } catch (err) {
    console.error("FATAL ERROR", err);
  }
}

test();
