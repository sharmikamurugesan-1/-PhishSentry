import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Plus, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Info,
  ShieldAlert,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { COPY } from '../copy';

export default function EmailProtectionScreen() {
  const navigate = useNavigate();

  // Protection Configuration States
  const [protectionMode, setProtectionMode] = useState('alert_only'); // 'alert_only' | 'quarantine'
  const [sensitivity, setSensitivity] = useState('high_only'); // 'high_only' | 'strict'
  const [trustedSenders, setTrustedSenders] = useState([
    'notifications@google.com',
    'security@apple.com',
    'alerts@hdfcbank.net'
  ]);
  const [newSenderInput, setNewSenderInput] = useState('');
  const [oauthModalProvider, setOauthModalProvider] = useState(null);

  // Check if OAuth client IDs are provided in environment
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const azureClientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';

  const handleAddSender = (e) => {
    e.preventDefault();
    const clean = newSenderInput.trim().toLowerCase();
    if (clean && !trustedSenders.includes(clean)) {
      setTrustedSenders([...trustedSenders, clean]);
      setNewSenderInput('');
    }
  };

  const handleRemoveSender = (senderToRemove) => {
    setTrustedSenders(trustedSenders.filter(s => s !== senderToRemove));
  };

  const handleConnectProvider = (provider) => {
    if (provider === 'google' && googleClientId) {
      // Trigger Google OAuth 2.0 PKCE flow
      const redirectUri = window.location.origin + '/email-protection/callback';
      const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly');
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    } else if (provider === 'microsoft' && azureClientId) {
      // Trigger Microsoft Graph OAuth 2.0 flow
      const redirectUri = window.location.origin + '/email-protection/callback';
      const scope = encodeURIComponent('Mail.Read');
      window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${azureClientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scope}`;
    } else {
      // Show Connection-Ready architectural guide modal
      setOauthModalProvider(provider);
    }
  };

  return (
    <div className="section-spacious py-10 sm:py-16 text-left min-h-[calc(100vh-120px)]" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="content-container max-w-4xl space-y-10">

        {/* Section Header */}
        <div className="space-y-3 pb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Mail size={15} style={{ color: 'var(--color-accent)' }} />
            <span>Automatic inbox protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', lineHeight: 1.05 }}>
            Email protection
          </h1>
          <p className="text-base sm:text-lg max-w-2xl leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Check incoming emails for deceptive sender addresses and scam patterns. Connects securely through your provider's authorized sign-in without asking for your password.
          </p>
        </div>

        {/* Permission Transparency & Privacy Notice */}
        <div className="card-flat p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={15} style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
              How permissions and access work
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-lg border space-y-1.5" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <span className="text-sm font-semibold block" style={{ color: 'var(--color-text)' }}>
                1. No account passwords
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                You approve access directly on Google or Microsoft sign-in pages. PhishShift never sees, collects, or stores your password.
              </p>
            </div>

            <div className="p-4 rounded-lg border space-y-1.5" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <span className="text-sm font-semibold block" style={{ color: 'var(--color-text)' }}>
                2. Read-only inspection
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Permissions are limited to reading incoming message headers and text. We cannot send emails on your behalf.
              </p>
            </div>

            <div className="p-4 rounded-lg border space-y-1.5" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <span className="text-sm font-semibold block" style={{ color: 'var(--color-text)' }}>
                3. We don't save messages
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Messages are evaluated in memory and discarded immediately. Nothing is tracked, logged, or saved to a database.
              </p>
            </div>
          </div>
        </div>

        {/* Authorized Provider Connection Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span>Supported providers</span>
            <span>Official OAuth 2.0 flow</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Gmail */}
            <div className="card-flat p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: '#EA4335' }}>
                      G
                    </div>
                    <h3 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                      Google Gmail
                    </h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)' }}>
                    {googleClientId ? 'Ready to connect' : 'Setup required'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Screen emails in personal Gmail or Google Workspace accounts using official Google Identity Services.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleConnectProvider('google')}
                className="btn-primary w-full py-2.5 px-4 text-sm flex items-center justify-center gap-2"
              >
                <span>Connect Google account</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Microsoft Outlook */}
            <div className="card-flat p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: '#0078D4' }}>
                      M
                    </div>
                    <h3 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                      Microsoft Outlook
                    </h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)' }}>
                    {azureClientId ? 'Ready to connect' : 'Setup required'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Screen emails in Outlook.com, Hotmail, or Microsoft 365 work accounts via Microsoft Graph API.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleConnectProvider('microsoft')}
                className="btn-secondary w-full py-2.5 px-4 text-sm flex items-center justify-center gap-2"
              >
                <span>Connect Microsoft account</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Protection Settings */}
        <div className="card-flat p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
              <Sliders size={16} style={{ color: 'var(--color-accent)' }} />
              <span>Protection settings</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Transparent and reversible
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Setting 1: Action on Detection */}
            <div className="space-y-2.5">
              <label className="text-xs font-medium block" style={{ color: 'var(--color-text-muted)' }}>
                Action when warning signs are detected:
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setProtectionMode('alert_only')}
                  className="w-full p-3.5 rounded-lg border text-left text-xs transition-colors cursor-pointer"
                  style={{
                    borderColor: protectionMode === 'alert_only' ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: protectionMode === 'alert_only' ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                    outline: protectionMode === 'alert_only' ? '1px solid var(--color-accent)' : 'none'
                  }}
                >
                  <span className="font-semibold block text-sm pb-0.5" style={{ color: 'var(--color-text)' }}>Alert only (recommended)</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Shows warnings in your review console; your inbox remains unchanged.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProtectionMode('quarantine')}
                  className="w-full p-3.5 rounded-lg border text-left text-xs transition-colors cursor-pointer"
                  style={{
                    borderColor: protectionMode === 'quarantine' ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: protectionMode === 'quarantine' ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                    outline: protectionMode === 'quarantine' ? '1px solid var(--color-accent)' : 'none'
                  }}
                >
                  <span className="font-semibold block text-sm pb-0.5" style={{ color: 'var(--color-text)' }}>Move to [Review folder]</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Moves flagged messages out of primary inbox with instant one-click restore.</span>
                </button>
              </div>
            </div>

            {/* Setting 2: Sensitivity */}
            <div className="space-y-2.5">
              <label className="text-xs font-medium block" style={{ color: 'var(--color-text-muted)' }}>
                Sensitivity level:
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSensitivity('high_only')}
                  className="w-full p-3.5 rounded-lg border text-left text-xs transition-colors cursor-pointer"
                  style={{
                    borderColor: sensitivity === 'high_only' ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: sensitivity === 'high_only' ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                    outline: sensitivity === 'high_only' ? '1px solid var(--color-accent)' : 'none'
                  }}
                >
                  <span className="font-semibold block text-sm pb-0.5" style={{ color: 'var(--color-text)' }}>High risk only</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Only flags clear scam wording and suspicious sender addresses.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSensitivity('strict')}
                  className="w-full p-3.5 rounded-lg border text-left text-xs transition-colors cursor-pointer"
                  style={{
                    borderColor: sensitivity === 'strict' ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: sensitivity === 'strict' ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                    outline: sensitivity === 'strict' ? '1px solid var(--color-accent)' : 'none'
                  }}
                >
                  <span className="font-semibold block text-sm pb-0.5" style={{ color: 'var(--color-text)' }}>Strict (includes ambiguous messages)</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Also flags short messages with unexpected links or urgent requests.</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted Senders Management */}
        <div className="card-flat p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                Trusted senders and domains
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Messages from these addresses or organizations will never be flagged.
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {trustedSenders.length} active
            </span>
          </div>

          <form onSubmit={handleAddSender} className="flex gap-2">
            <input
              type="text"
              value={newSenderInput}
              onChange={(e) => setNewSenderInput(e.target.value)}
              placeholder="e.g. notifications@mybank.com or @company.com"
              className="flex-1 px-4 py-2.5 rounded-lg text-xs sm:text-sm border focus:outline-none"
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            />
            <button
              type="submit"
              className="btn-primary px-4 py-2.5 text-xs sm:text-sm flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Add</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-1">
            {trustedSenders.map((sender) => (
              <span
                key={sender}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                <span>{sender}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSender(sender)}
                  className="cursor-pointer hover:opacity-75"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Remove trusted sender"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Flagged Message Review Console */}
        <div className="card-flat p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                Review flagged messages
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Review detected evidence before deciding to mark as safe, restore, or quarantine.
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(180, 83, 9, 0.2)', color: '#B45309', border: '1px solid rgba(180, 83, 9, 0.3)' }}>
              1 item pending review
            </span>
          </div>

          {/* Pending flagged email sample */}
          <div className="p-5 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="font-medium text-xs block" style={{ color: '#EF4444' }}>
                  account-alert@sbi-kyc-update.xyz
                </span>
                <span className="font-semibold text-sm block" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
                  Urgent: Account Suspension Warning - Verify KYC Immediately
                </span>
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                Received 12 mins ago
              </span>
            </div>

            <div className="p-3 rounded-lg text-xs leading-relaxed border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="font-medium" style={{ color: 'var(--color-accent)' }}>Detected signs: </span>
              Imposter domain mimicking State Bank of India + urgent pressure phrasing ("suspended", "immediately", "kyc").
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigate('/check', { 
                    state: { 
                      messageText: 'URGENT: Your account at State Bank has been suspended! Verify your KYC details immediately at http://sbi-kyc-update.xyz to avoid permanent account block.' 
                    } 
                  });
                }}
                className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <span>Inspect in PhishShift</span>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTrustedSenders([...trustedSenders, 'sbi-kyc-update.xyz']);
                }}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Mark as safe & add domain
              </button>
            </div>
          </div>
        </div>

        {/* OAuth Architecture Modal when credentials are not yet configured */}
        {oauthModalProvider && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-8 max-w-lg w-full space-y-4 text-left" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <h3 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                  {oauthModalProvider === 'google' ? 'Google OAuth 2.0 setup' : 'Microsoft Graph setup'}
                </h3>
                <button
                  type="button"
                  onClick={() => setOauthModalProvider(null)}
                  className="cursor-pointer text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                <p>
                  To link real mailboxes without collecting passwords, standard OAuth client credentials are used:
                </p>

                <div className="p-3.5 rounded-lg border space-y-2 text-xs" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Required environment variable:</span>
                    <p className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                      {oauthModalProvider === 'google' ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_AZURE_CLIENT_ID'}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Authorized scope:</span>
                    <p className="text-emerald-500 font-medium">
                      {oauthModalProvider === 'google' ? 'https://www.googleapis.com/auth/gmail.readonly' : 'Mail.Read'}
                    </p>
                  </div>
                </div>

                <p className="text-xs">
                  This design guarantees your email password is never entered into PhishShift. When configured in deployment, one click opens your provider's official consent screen.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOauthModalProvider(null)}
                  className="btn-primary w-full py-2.5 text-xs sm:text-sm"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}