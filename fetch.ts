import * as https from "https";
import * as fs from "fs";

const options = {
  hostname: 'upload.wikimedia.org',
  path: '/wikipedia/commons/thumb/0/04/Emblem_of_Laos.svg/200px-Emblem_of_Laos.svg.png',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

https.get(options, (res) => {
  let data: any[] = [];
  res.on("data", (chunk) => {
    data.push(chunk);
  });
  res.on("end", () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString("base64");
    fs.writeFileSync("logoB64.txt", base64);
  });
});
