const { EdgeTTS } = require('@andresaya/edge-tts');
const fs = require('fs');

async function test() {
  try {
    console.log("Testing Sonia voice...");
    const tts = new EdgeTTS({
      voice: 'en-GB-SoniaNeural'
    });
    await tts.synthesize("Hello, I am Sonia. I hope you enjoy your music today.");
    const buffer = await tts.toBuffer();
    fs.writeFileSync('test_sonia.mp3', buffer);
    console.log("Sonia test file saved to test_sonia.mp3");
  } catch (err) {
    console.error(err);
  }
}

test();
