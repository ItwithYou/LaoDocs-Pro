export const legacyToUnicodeMap: Record<string, string> = {
  // Consonants mapping (A1-BB)
  "¡": "ກ", "¢": "ຂ", "£": "ຄ", "¤": "ງ", "¥": "ຈ", "¦": "ສ", "§": "ຊ", "¨": "ຍ", "©": "ດ", "ª": "ຕ", "«": "ຖ", "¬": "ທ", "­": "ນ", "®": "ບ", "¯": "ປ", "°": "ຜ", "±": "ຝ", "²": "ພ", "³": "ຟ", "´": "ມ", "µ": "ຢ", "¶": "ຣ", "·": "ລ", "¸": "ວ", "¹": "ຫ", "º": "ອ", "»": "ຮ",
  // Specials (BC-BF)
  "¼": "ຯ", "½": "ະ", "¾": "າ", "¿": "ຳ",
  // Vowels prefix (C0-C4)
  "À": "ເ", "Á": "ແ", "Â": "ໂ", "Ã": "ໃ", "Ä": "ໄ",
  // Tone marks and upper signs (C5-CA)
  "Å": "໌", "Æ": "່", "Ç": "້", "È": "໊", "É": "໋", "Ê": "ໍ",
  // Ligatures (CB-CC)
  "Ë": "ໜ", "Ì": "ໝ",
  // Base characters for tonemarks (legacy typing rules)
  "Í": "ໞ", "Î": "ຫ", "Ï": "໠",
  // Digits (D0-D9) maybe? 1-9? In Lao saysettha numbers are normal ascii 0-9 usually, but sometimes mapping exists.
  // Actually, standard saysettha leaves numbers as ASCII unless using specific keys.
  
  // Vowels upper/lower (F1-F9) and alternatives
  "ñ": "ັ", "ò": "ິ", "ó": "ີ", "ô": "ຶ", "õ": "ື", "ö": "ຸ", "÷": "ູ", "ø": "ົ", "ù": "ຼ", "ú": "ຼ", "û": "ຼ",
  "ê": "ັ", "ë": "ິ", "ì": "ີ", "í": "ຶ", "î": "ື", "ï": "ົ", "ð": "ຼ"
};

export function convertSaysetthaToUnicode(text: string): string {
    return text.split('').map(char => legacyToUnicodeMap[char] || char).join('');
}
