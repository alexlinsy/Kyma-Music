const { EdgeTTS } = require('@andresaya/edge-tts');

async function list() {
  const tts = new EdgeTTS();
  const voices = await tts.getVoices();
  console.log(JSON.stringify(voices.filter(v => v.ShortName.includes('Sonia') || v.ShortName.includes('Ava')), null, 2));
}

list();
