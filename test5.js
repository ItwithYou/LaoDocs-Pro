const legacyToUnicodeMap = {
  "\xa1": "ກ", "\xa2": "ຂ", "\xa3": "ຄ", "\xa4": "ງ", "\xa5": "ຈ", "\xa6": "ສ", "\xa7": "ຊ", "\xa8": "ຍ", "\xa9": "ດ", "\xaa": "ຕ", "\xab": "ຖ", "\xac": "ທ", "\xad": "ນ", "\xae": "ບ", "\xaf": "ປ",
  "\xb0": "ຜ", "\xb1": "ຝ", "\xb2": "ພ", "\xb3": "ຟ", "\xb4": "ມ", "\xb5": "ຢ", "\xb6": "ຣ", "\xb7": "ລ", "\xb8": "ວ", "\xb9": "ຫ", "\xba": "ອ", "\xbb": "ຮ", "\xbc": "ໝ", "\xbd": "ະ", "\xbe": "າ", "\xbf": "ຳ",
  "\xc0": "ເ", "\xc1": "ແ", "\xc2": "ໂ", "\xc3": "ໃ", "\xc4": "ໄ",
  "\xc8": "່", "\xc9": "້", "\xca": "໊", "\xcb": "໋", "\xcc": "໌", "\xcd": "ໍ",
  "\xce": "ໜ", "\xcf": "ໝ", "\xd0": "ໞ", "\xd1": "໠",
  "\xe1": "ັ", "\xe2": "ິ", "\xe3": "ີ", "\xe4": "ຶ", "\xe5": "ື", "\xe6": "ຸ", "\xe7": "ູ", "\xe8": "ົ", "\xe9": "ຼ", "\xea": "ັ", "\xeb": "ິ", "\xec": "ີ", "\xed": "ຶ", "\xee": "ື", "\xef": "ົ",
  "\xf1": "ັ", "\xf2": "ິ", "\xf3": "ີ", "\xf4": "ຶ", "\xf5": "ື", "\xf6": "ຸ", "\xf7": "ູ", "\xf8": "ົ", "\xf9": "ຼ", "\xfa": "ຼ", "\xfb": "ຼ", "\xfc": "ຼ", "\xfd": "ຼ"
};

let inputText = "¡ : »ø®Á®®À°¡½¦¾«óõ¡ªê©, ¾¤Ä, ÉÃ¢½Î¾©À¥É¨ A4 À§";
let processedText = inputText.split('').map(char => legacyToUnicodeMap[char] || char).join('');
        
processedText = processedText.replace(/ {2,}/g, ' ');
        
const corrections = {
  "ຫລື": "ຫຼື",
  "ຫລາຍ": "ຫຼາຍ",
  "ຮົບແບບ": "ຮູບແບບ",
  "ເຜກະສາຖີືກ": "ເອກະສານຖືກ",
  "ເຜກະສາຖ": "ເອກະສານ",
  "ຕທດ": "ຕັດ",
  "ຫາດເຈ໋ຍ": "ໜາດເຈ້ຍ",
  "ຂະຫາດ": "ຂະໜາດ",
  "ເຈ໋ຍ": "ເຈ້ຍ",
  "໋ໃຂະ": "໌ໃຂະ"
};

Object.keys(corrections).forEach((wrongWord) => {
  if (processedText.includes(wrongWord)) {
    const regex = new RegExp(wrongWord, 'g');
    processedText = processedText.replace(regex, corrections[wrongWord]);
  }
});
console.log(processedText);
