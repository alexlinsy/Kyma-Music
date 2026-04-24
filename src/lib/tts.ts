export async function generateSpeech(text: string) {
  try {
    const response = await fetch(`/api/tts?t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) throw new Error('TTS request failed');

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('TTS Error:', error);
    return null;
  }
}
