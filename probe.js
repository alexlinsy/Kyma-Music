
const { EdgeTTS } = require('@andresaya/edge-tts');
const tts = new EdgeTTS();
console.log('Synthesize func:', tts.synthesize.toString().substring(0, 500));
