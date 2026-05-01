import { NextResponse } from 'next/server';
import dgram from 'dgram';

const GOVEE_API_KEY = process.env.GOVEE_API_KEY;
const GOVEE_DEVICE_ID = process.env.GOVEE_DEVICE_ID;
const GOVEE_MODEL = process.env.GOVEE_MODEL;
const GOVEE_LAN_IP = process.env.GOVEE_LAN_IP;

// Helper to send UDP packet for Govee LAN API
async function sendLanCommand(ip: string, msg: any) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const message = Buffer.from(JSON.stringify(msg) + "\n");
    client.send(message, 4003, ip, (err) => {
      client.close();
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export async function POST(request: Request) {
  if (!GOVEE_API_KEY || !GOVEE_DEVICE_ID || !GOVEE_MODEL) {
    return NextResponse.json({ error: 'Govee credentials not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { r, g, b, brightness, colors, forceCloud } = body;

    let lanSuccess = false;

    // --- LAN API (High Speed) ---
    if (GOVEE_LAN_IP && !forceCloud) {
      try {
        if (colors && colors.length >= 3) {
          // Whole lamp color via LAN (more reliable than segments)
          await sendLanCommand(GOVEE_LAN_IP, { msg: { cmd: "colorwc", data: { color: colors[1], colorTemInKelvin: 0 } } });
          lanSuccess = true;
        } else if (brightness !== undefined) {
          await sendLanCommand(GOVEE_LAN_IP, { msg: { cmd: "brightness", data: { value: brightness } } });
          lanSuccess = true;
        } else if (r !== undefined) {
          await sendLanCommand(GOVEE_LAN_IP, { msg: { cmd: "colorwc", data: { color: { r, g, b }, colorTemInKelvin: 0 } } });
          lanSuccess = true;
        }
      } catch (lanError) {
        console.error('[Govee LAN Error]', lanError);
      }
    }

    // --- CLOUD API (Reliability Fallback) ---
    // We always send cloud for non-beat commands (track changes) to ensure they hit.
    // For brightness pulses (beats), we skip cloud to avoid rate limits.
    if (brightness === undefined || !lanSuccess) {
      const cmd = brightness !== undefined 
        ? { name: 'brightness', value: brightness }
        : { name: 'color', value: { r: r ?? colors[1].r, g: g ?? colors[1].g, b: b ?? colors[1].b } };

      fetch('https://developer-api.govee.com/v1/devices/control', {
        method: 'PUT',
        headers: {
          'Govee-API-Key': GOVEE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device: GOVEE_DEVICE_ID,
          model: GOVEE_MODEL,
          cmd
        }),
      }).catch(err => console.error('[Govee Cloud Error]', err));
    }

    return NextResponse.json({ 
      success: true, 
      mode: lanSuccess ? (brightness !== undefined ? 'lan_pulse' : 'lan_sync') : 'cloud_only'
    });
  } catch (error: any) {
    console.error('[Govee Route Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
