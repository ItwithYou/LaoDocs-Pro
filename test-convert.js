const txt = "¡ : »ø®Á®®À°¡½¦¾«óõ¡ªê©, ¾¤Ä, ÉÃ¢½Î¾©À¥É¨ A4 À§";
console.log(txt.split('').map(c => c + " : " + c.charCodeAt(0).toString(16)).join('\n'));
