'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Smartphone, QrCode, ChevronLeft, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (cookie: string, uid: number) => void;
}

// Thin wrapper that always calls our server-side proxy to avoid CORS.
async function neteaseProxy(action: string, params?: Record<string, any>, cookie?: string) {
  const res = await fetch('/api/netease', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params, cookie }),
  });
  if (!res.ok) throw new Error(`Proxy ${action} failed: ${res.status}`);
  return res.json();
}

export default function NeteaseLoginModal({ isOpen, onClose, onLoginSuccess }: Props) {
  const [mode, setMode] = useState<'select' | 'qr' | 'sms' | 'cookie'>('select');
  const [cookieInput, setCookieInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // QR
  const [qrImg, setQrImg] = useState('');         // base64 data-url from API
  const [qrKey, setQrKey] = useState('');
  const [qrStatus, setQrStatus] = useState<'loading' | 'waiting' | 'scanned' | 'expired'>('loading');
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // SMS
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!isOpen) {
      stopQrPolling();
      setMode('select');
      setError('');
      setQrImg('');
      setQrKey('');
      setQrStatus('loading');
    }
  }, [isOpen]);

  function stopQrPolling() {
    if (qrIntervalRef.current) {
      clearInterval(qrIntervalRef.current);
      qrIntervalRef.current = null;
    }
  }

  // ---------- QR ----------
  async function startQrLogin() {
    setMode('qr');
    setError('');
    setQrImg('');
    setQrStatus('loading');
    stopQrPolling();

    try {
      // 1. Get unikey from NetEase
      const keyData = await neteaseProxy('qrKey');
      if (!keyData.unikey) throw new Error('无法获取二维码 Key，请稍后重试');
      const key = keyData.unikey as string;
      setQrKey(key);

      // 2. Build the standard NetEase scan login URL
      //    When scanned with NetEase app → triggers the login confirmation flow
      const loginUrl = `https://music.163.com/login?codekey=${key}`;

      // 3. Render QR code image via qrserver.com (free, reliable, no dependency)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(loginUrl)}&size=220x220&margin=10&color=0-0-0&bgcolor=255-255-255`;
      setQrImg(qrImageUrl);
      setQrStatus('waiting');

      // 4. Poll for scan confirmation every 2 seconds
      qrIntervalRef.current = setInterval(async () => {
        try {
          const checkData = await neteaseProxy('qrCheck', { key });
          // 801 = waiting, 802 = scanned (awaiting confirmation), 803 = confirmed, 800 = expired
          if (checkData.code === 800) {
            setQrStatus('expired');
            stopQrPolling();
          } else if (checkData.code === 802) {
            setQrStatus('scanned');
          } else if (checkData.code === 803) {
            stopQrPolling();
            const cookie = checkData._setCookie || checkData.cookie || '';
            if (cookie) {
              onLoginSuccess(cookie, checkData.userId || 0);
              onClose();
            } else {
              setError('登录成功但未获取到 Cookie，请改用 Cookie 方式登录');
            }
          }
        } catch { /* silently retry */ }
      }, 2000);
    } catch (err: any) {
      setError('二维码登录失败: ' + (err.message || '请检查网络'));
      setQrStatus('expired');
    }
  }

  // ---------- SMS ----------
  async function sendSms() {
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的11位中国大陆手机号'); return; }
    setSending(true);
    setError('');
    try {
      const data = await neteaseProxy('smsSend', { phone });
      if (data.code === 200) {
        setCountdown(60);
        const timer = setInterval(() => setCountdown(p => { if (p <= 1) { clearInterval(timer); return 0; } return p - 1; }), 1000);
      } else {
        setError(data.msg || '发送验证码失败，请稍后重试');
      }
    } catch (err: any) {
      setError('发送失败: ' + err.message);
    } finally { setSending(false); }
  }

  async function verifySms(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError('请输入6位验证码'); return; }
    setIsLoading(true);
    setError('');
    try {
      const data = await neteaseProxy('smsVerify', { phone, captcha: code });
      if (data.code === 200) {
        const cookie = data._setCookie || data.cookie || '';
        onLoginSuccess(cookie, data.account?.id || 0);
        onClose();
      } else {
        setError(data.msg || '验证码错误或已过期');
      }
    } catch (err: any) {
      setError('验证失败: ' + err.message);
    } finally { setIsLoading(false); }
  }

  // ---------- Cookie ----------
  async function handleCookieLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const cookie = decodeURIComponent(cookieInput.trim());
      if (!cookie) throw new Error('请输入有效的 Cookie');
      const testData = await neteaseProxy('validate', undefined, cookie);
      if (testData && !testData.error) {
        onLoginSuccess(cookie, 0);
        onClose();
        setCookieInput('');
        setMode('select');
      } else {
        throw new Error('Cookie 无效或已过期，请重新获取');
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请检查 Cookie');
    } finally { setIsLoading(false); }
  }

  function handleClose() {
    stopQrPolling();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-kyma-panel/80 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col w-full max-w-[400px] gap-5 relative z-10"
          >
            <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors">
              <X size={16} />
            </button>

            <div className="text-center mb-2">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <Music size={20} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tighter text-white mb-2">网易云音乐</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                {mode === 'select' ? '选择登录方式' : mode === 'qr' ? '扫码登录' : mode === 'sms' ? '短信验证' : 'Cookie 登录'}
              </p>
            </div>

            {/* Select Mode */}
            {mode === 'select' && (
              <div className="flex flex-col gap-4">
                <button onClick={startQrLogin}
                  className="flex items-center gap-4 p-4 bg-black/30 border border-white/5 rounded-xl hover:bg-black/50 hover:border-red-500/30 transition-all">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <QrCode size={20} className="text-red-500" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">扫码登录</div>
                    <div className="text-zinc-500 text-xs">使用网易云音乐 App 扫码</div>
                  </div>
                </button>

                <button onClick={() => setMode('sms')}
                  className="flex items-center gap-4 p-4 bg-black/30 border border-white/5 rounded-xl hover:bg-black/50 hover:border-red-500/30 transition-all">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Smartphone size={20} className="text-red-500" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">短信验证</div>
                    <div className="text-zinc-500 text-xs">手机号 + 验证码登录</div>
                  </div>
                </button>

                <button onClick={() => setMode('cookie')}
                  className="flex items-center gap-4 p-4 bg-black/30 border border-white/5 rounded-xl hover:bg-black/50 hover:border-red-500/30 transition-all">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">Cookie 登录</div>
                    <div className="text-zinc-500 text-xs">从浏览器复制 Cookie（备选）</div>
                  </div>
                </button>
              </div>
            )}

            {/* QR Mode */}
            {mode === 'qr' && (
              <div className="flex flex-col gap-4 items-center">
                <button onClick={() => { stopQrPolling(); setMode('select'); }}
                  className="self-start text-zinc-500 text-xs hover:text-white transition-colors flex items-center gap-1">
                  <ChevronLeft size={14} /> 返回
                </button>

                {error && <div className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-lg text-center font-medium w-full">{error}</div>}

                {qrStatus === 'loading' && (
                  <div className="w-44 h-44 bg-black/40 rounded-xl flex items-center justify-center">
                    <Loader2 size={32} className="text-red-500 animate-spin" />
                  </div>
                )}

                {qrStatus !== 'loading' && qrStatus !== 'expired' && qrImg && (
                  <div className="relative">
                    <div className="w-44 h-44 bg-white rounded-xl p-2 flex items-center justify-center">
                      <img src={qrImg} alt="NetEase QR Code" className="w-full h-full object-contain" />
                    </div>
                    {qrStatus === 'scanned' && (
                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                        <span className="text-white text-sm font-medium">✓ 已扫码，等待确认...</span>
                      </div>
                    )}
                  </div>
                )}

                {qrStatus === 'expired' && !error && (
                  <div className="w-44 h-44 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-3">
                    <span className="text-zinc-500 text-sm">二维码已过期</span>
                    <button onClick={startQrLogin} className="text-red-500 text-xs flex items-center gap-1 hover:text-red-400 transition-colors">
                      <RefreshCw size={12} /> 重新生成
                    </button>
                  </div>
                )}

                <p className="text-zinc-500 text-xs text-center">
                  {qrStatus === 'waiting' ? '打开网易云音乐 App → 右上角扫一扫' :
                   qrStatus === 'scanned' ? '请在手机上点击「确认登录」' :
                   qrStatus === 'expired' ? '二维码已过期' : '正在生成二维码...'}
                </p>
              </div>
            )}

            {/* SMS Mode */}
            {mode === 'sms' && (
              <form onSubmit={verifySms} className="flex flex-col gap-4">
                <button type="button" onClick={() => setMode('select')}
                  className="text-zinc-500 text-xs hover:text-white transition-colors text-left flex items-center gap-1">
                  <ChevronLeft size={14} /> 返回
                </button>

                {error && <div className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-lg text-center font-medium">{error}</div>}

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">手机号</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                    className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-all text-white placeholder:text-zinc-700"
                    placeholder="请输入11位手机号" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">验证码</label>
                  <div className="flex gap-2">
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} required maxLength={6}
                      className="flex-1 bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-all text-white placeholder:text-zinc-700"
                      placeholder="6位验证码" />
                    <button type="button" onClick={sendSms} disabled={countdown > 0 || sending}
                      className="px-4 py-2 bg-red-500/20 text-red-500 text-xs rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50 whitespace-nowrap">
                      {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '获取验证码'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading || !code}
                  className="bg-red-500 text-white font-bold uppercase tracking-wider text-[11px] py-3.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 mt-2">
                  {isLoading ? '验证中...' : '登录'}
                </button>
              </form>
            )}

            {/* Cookie Mode */}
            {mode === 'cookie' && (
              <form onSubmit={handleCookieLogin} className="flex flex-col gap-4">
                <button type="button" onClick={() => setMode('select')}
                  className="text-zinc-500 text-xs hover:text-white transition-colors text-left flex items-center gap-1">
                  <ChevronLeft size={14} /> 返回
                </button>

                {error && <div className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-lg text-center font-medium">{error}</div>}

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">粘贴 Cookie</label>
                  <textarea value={cookieInput} onChange={e => setCookieInput(e.target.value)} required rows={4}
                    className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-all text-white placeholder:text-zinc-700 resize-none font-mono text-xs"
                    placeholder="粘贴从浏览器复制的完整 Cookie..." />
                </div>

                <div className="bg-kyma-bg/50 rounded-lg p-3">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">复制 Cookie 步骤</div>
                  <div className="text-[10px] text-zinc-600 leading-relaxed space-y-1">
                    <p>1. 浏览器打开 <span className="text-red-400">music.163.com</span> 并登录</p>
                    <p>2. 按 <span className="text-white">F12</span> → Network 标签</p>
                    <p>3. 刷新页面，点击任意 163.com 请求</p>
                    <p>4. 在 <span className="text-white">Request Headers</span> 中找到 Cookie 并复制</p>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2">关键字段: <span className="text-red-400">MUSIC_U</span>, <span className="text-red-400">JSESSIONID-WYYY</span></p>
                </div>

                <button type="submit" disabled={isLoading || !cookieInput.trim()}
                  className="bg-red-500 text-white font-bold uppercase tracking-wider text-[11px] py-3.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 mt-2">
                  {isLoading ? '验证中...' : '登录'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}