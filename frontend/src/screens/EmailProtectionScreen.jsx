import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Info,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Bell,
  Eye,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Shield,
  LogOut,
  Calendar,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';

import {
  getInboxStatus,
  getGoogleAuthUrl,
  disconnectAccount,
  toggleDemoMode,
  scanLast30Days,
  getInboxMessages,
  reviewInboxMessage,
  getSenders,
  addSender,
  deleteSender,
  getThreatAlerts,
  markAlertRead,
  dismissAlert,
  resetDemoInbox
} from '../services/api';

export default function EmailProtectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Active top navigation tab: 'inbox' | 'review' | 'senders' | 'alerts'
  const [activeTab, setActiveTab] = useState('inbox');

  // Core Connection & Mailbox States
  const [connectionInfo, setConnectionInfo] = useState({
    provider: 'none',
    status: 'disconnected',
    email: '',
    is_demo: 0,
    last_synced: null,
    has_oauth_configured: false,
    google_client_id: ''
  });

  const [stats, setStats] = useState({
    total_messages: 0,
    pending_scans: 0,
    in_review: 0,
    safe: 0,
    blocked: 0,
    active_alerts: 0,
    unread_alerts: 0
  });

  const [messages, setMessages] = useState([]);
  const [senders, setSenders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dateRange, setDateRange] = useState({ from: 'Last 30 Days', to: 'Today' });

  // UI / Action States
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  // Modals & Detail Views
  const [releaseModalEmail, setReleaseModalEmail] = useState(null);
  const [oauthSetupGuide, setOauthSetupGuide] = useState(null);
  const [inspectEmail, setInspectEmail] = useState(null);

  // Filters
  const [resultFilter, setResultFilter] = useState('all'); // 'all' | 'safe' | 'suspicious' | 'phishing' | 'scan_failed'
  const [reviewFilter, setReviewFilter] = useState('in_review'); // 'in_review' | 'all' | 'blocked' | 'safe'
  const [senderFilter, setSenderFilter] = useState('all'); // 'all' | 'trusted' | 'blocked'

  // Sender list inputs
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderType, setNewSenderType] = useState('trusted');
  const [newSenderNote, setNewSenderNote] = useState('');

  // --------------------------------------------------------------------------
  // Initial Data & Callback Handling
  // --------------------------------------------------------------------------
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [statusRes, msgRes, sendersRes, alertsRes] = await Promise.all([
        getInboxStatus().catch(() => null),
        getInboxMessages().catch(() => ({ messages: [] })),
        getSenders().catch(() => ({ senders: [] })),
        getThreatAlerts().catch(() => ({ alerts: [] }))
      ]);

      if (statusRes) {
        setConnectionInfo(statusRes.connection || {});
        setStats(statusRes.stats || {});
      }
      if (msgRes?.messages) {
        setMessages(msgRes.messages);
      }
      if (sendersRes?.senders) {
        setSenders(sendersRes.senders);
      }
      if (alertsRes?.alerts) {
        setAlerts(alertsRes.alerts);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Could not reach backend service.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check URL parameters for OAuth callbacks
    const params = new URLSearchParams(location.search);
    if (params.get('connected') === '1') {
      setFeedback({ type: 'success', text: 'Google Gmail successfully authorized and connected!' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('auth_error')) {
      const err = params.get('auth_error');
      setFeedback({ 
        type: 'error', 
        text: err === 'access_denied' 
          ? 'Google permission was cancelled or denied.' 
          : `Google authorization failed (${err}). Please try again.` 
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadAllData();
  }, [location.search]);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // --------------------------------------------------------------------------
  // Real OAuth Connection Workflow
  // --------------------------------------------------------------------------
  const handleConnectGmail = async () => {
    try {
      setConnecting(true);
      const res = await getGoogleAuthUrl();
      if (res.configured && res.auth_url) {
        // Redirect to official Google OAuth consent screen
        window.location.href = res.auth_url;
      } else {
        // Open step-by-step setup guide modal
        setOauthSetupGuide(res.setup_guide || {
          required_env_vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
          authorized_redirect_uri: `${window.location.origin}/api/auth/google/callback`,
          scope: 'https://www.googleapis.com/auth/gmail.readonly'
        });
      }
    } catch (err) {
      showFeedback('error', 'Could not initiate Google connection.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectAccount();
      showFeedback('info', 'Your email account has been disconnected.');
      await loadAllData();
    } catch (err) {
      showFeedback('error', 'Could not disconnect account.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Sandbox Demo Mode Toggle
  // --------------------------------------------------------------------------
  const handleToggleSandbox = async (enable) => {
    try {
      setLoading(true);
      await toggleDemoMode(enable ? 'enable' : 'disable');
      showFeedback(enable ? 'info' : 'info', enable ? 'Testing Sandbox activated.' : 'Sandbox closed.');
      await loadAllData();
    } catch (err) {
      showFeedback('error', 'Could not switch testing mode.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Scan Last 30 Days Action
  // --------------------------------------------------------------------------
  const handleScanLast30Days = async () => {
    try {
      setScanning(true);
      const res = await scanLast30Days();
      if (res.date_range) {
        setDateRange(res.date_range);
      }
      showFeedback(
        'success', 
        `Scan complete! Processed ${res.scanned_count} emails: ${res.safe_count} Safe, ${res.suspicious_count} Suspicious, ${res.phishing_count} Phishing.`
      );
      await loadAllData();
    } catch (err) {
      showFeedback('error', err.message || 'Scanning failed. Please check connection.');
    } finally {
      setScanning(false);
    }
  };

  // --------------------------------------------------------------------------
  // Sender Management
  // --------------------------------------------------------------------------
  const handleAddSenderSubmit = async (e) => {
    e.preventDefault();
    if (!newSenderEmail.trim()) return;

    try {
      await addSender(newSenderEmail, newSenderType, newSenderNote);
      showFeedback('success', `Added '${newSenderEmail.toLowerCase()}' to your ${newSenderType} list.`);
      setNewSenderEmail('');
      setNewSenderNote('');
      const updated = await getSenders();
      setSenders(updated.senders || []);
    } catch (err) {
      showFeedback('error', err.message || 'Could not add sender.');
    }
  };

  const handleDeleteSender = async (senderId, email) => {
    try {
      await deleteSender(senderId);
      showFeedback('success', `Removed '${email}' from your list.`);
      setSenders(senders.filter(s => s.id !== senderId));
    } catch (err) {
      showFeedback('error', 'Could not remove sender.');
    }
  };

  // --------------------------------------------------------------------------
  // Review Actions
  // --------------------------------------------------------------------------
  const handleReviewAction = async (messageId, action, confirmation = false) => {
    try {
      const res = await reviewInboxMessage(messageId, action, confirmation);
      showFeedback('success', res.message || 'Action executed.');
      setReleaseModalEmail(null);
      await loadAllData();
    } catch (err) {
      showFeedback('error', err.message || 'Could not complete review action.');
    }
  };

  // --------------------------------------------------------------------------
  // Alert Actions
  // --------------------------------------------------------------------------
  const handleMarkAlertRead = async (alertId) => {
    try {
      await markAlertRead(alertId, true);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: 1 } : a));
    } catch (err) {
      showFeedback('error', 'Could not update alert.');
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await dismissAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
      showFeedback('success', 'Alert dismissed.');
    } catch (err) {
      showFeedback('error', 'Could not dismiss alert.');
    }
  };

  // --------------------------------------------------------------------------
  // Filter Calculations & Metrics
  // --------------------------------------------------------------------------
  const scanMetrics = useMemo(() => {
    let safeCount = 0;
    let suspiciousCount = 0;
    let phishingCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    messages.forEach(msg => {
      if (msg.scan_status === 'pending') {
        pendingCount++;
      } else if (msg.scan_status === 'scan_failed') {
        failedCount++;
      } else if (msg.verdict === 'no_signs') {
        safeCount++;
      } else if (msg.verdict === 'not_sure') {
        suspiciousCount++;
      } else {
        phishingCount++;
      }
    });

    const totalScanned = safeCount + suspiciousCount + phishingCount;
    return {
      safeCount,
      suspiciousCount,
      phishingCount,
      failedCount,
      pendingCount,
      totalScanned,
      safePercent: totalScanned > 0 ? Math.round((safeCount / totalScanned) * 100) : 0,
      suspiciousPercent: totalScanned > 0 ? Math.round((suspiciousCount / totalScanned) * 100) : 0,
      phishingPercent: totalScanned > 0 ? Math.round((phishingCount / totalScanned) * 100) : 0
    };
  }, [messages]);

  // Filtered Analyzed Messages
  const filteredMessages = useMemo(() => {
    if (resultFilter === 'all') return messages;
    if (resultFilter === 'safe') return messages.filter(m => m.verdict === 'no_signs' || m.status === 'safe' || m.status === 'released');
    if (resultFilter === 'suspicious') return messages.filter(m => m.verdict === 'not_sure');
    if (resultFilter === 'phishing') return messages.filter(m => m.verdict === 'likely_scam' || m.status === 'blocked');
    if (resultFilter === 'scan_failed') return messages.filter(m => m.scan_status === 'scan_failed');
    return messages;
  }, [messages, resultFilter]);

  // Filtered review messages
  const filteredReviewMessages = useMemo(() => {
    if (reviewFilter === 'all') return messages;
    return messages.filter(m => m.status === reviewFilter);
  }, [messages, reviewFilter]);

  // Filtered senders
  const filteredSenders = useMemo(() => {
    if (senderFilter === 'all') return senders;
    return senders.filter(s => s.list_type === senderFilter);
  }, [senders, senderFilter]);

  const isConnected = connectionInfo.status === 'connected';
  const isDemoMode = Boolean(connectionInfo.is_demo);

  return (
    <div className="section-spacious py-8 sm:py-12 text-left min-h-screen overflow-y-visible" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="content-container max-w-5xl space-y-8">

        {/* Global Feedback Banner */}
        {feedback && (
          <div 
            className={`p-4 rounded-xl flex items-center justify-between text-sm border transition-all ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : feedback.type === 'info'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : feedback.type === 'info' ? (
                <Info size={18} className="text-amber-400 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-red-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFeedback(null)} 
              className="text-xs opacity-75 hover:opacity-100 p-1"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
              <ShieldCheck size={14} />
              <span>Email Protection & Inbox Scanner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight font-serif" style={{ color: 'var(--color-text)' }}>
              Email Protection
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] max-w-xl">
              Inspect incoming emails from the last 30 days for fake senders, urgency pressure words, and malicious links.
            </p>
          </div>

          {/* Connection Status Badge & Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                <span className="font-medium truncate max-w-xs" style={{ color: 'var(--color-text)' }}>
                  {isDemoMode ? 'Testing Sandbox (Demo)' : `Connected: ${connectionInfo.email}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs bg-neutral-900/60 border-neutral-800 text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-neutral-500" />
                <span>Not Connected</span>
              </div>
            )}

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 text-red-300 hover:text-red-200"
                title="Disconnect email account"
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-[var(--color-surface-hover)]"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              title="Refresh status"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* DISCONNECTED STATE: PROMINENT CONNECT YOUR EMAIL WORKFLOW */}
        {/* ------------------------------------------------------------------ */}
        {!isConnected && (
          <div className="space-y-6">
            
            {/* Main Connect Card */}
            <div className="card-flat p-6 sm:p-8 space-y-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border border-amber-500/30 bg-amber-950/20 text-amber-300">
                  <Lock size={12} />
                  <span>Secure Official OAuth 2.0 Sign-In</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold font-serif text-[var(--color-text)]">
                  Connect Your Email Account
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  PhishShift connects directly through Google's official consent screen. We only request read-only access to inspect emails from the last 30 days. We never see or store your password, and we cannot send or delete emails.
                </p>
              </div>

              {/* Provider Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-2">
                {/* Google Gmail */}
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={connecting}
                  className="btn-primary py-3.5 px-5 text-sm flex items-center justify-center gap-3 cursor-pointer shadow-md"
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white text-stone-900 shrink-0">
                    G
                  </div>
                  <span className="font-semibold">Connect with Google Gmail</span>
                  <ChevronRight size={16} />
                </button>

                {/* Microsoft Outlook */}
                <button
                  type="button"
                  onClick={() => {
                    setOauthSetupGuide({
                      provider_name: 'Microsoft Outlook',
                      required_env_vars: ['VITE_AZURE_CLIENT_ID'],
                      authorized_redirect_uri: `${window.location.origin}/email-protection`,
                      scope: 'Mail.Read'
                    });
                  }}
                  className="btn-secondary py-3.5 px-5 text-sm flex items-center justify-center gap-3 cursor-pointer"
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-[#0078D4] text-white shrink-0">
                    M
                  </div>
                  <span>Connect Microsoft Outlook</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Privacy Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
                <div className="p-3.5 rounded-lg border space-y-1 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs font-semibold text-[var(--color-text)] block">1. No Passwords</span>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    You sign in directly on Google's login page. PhishShift never collects or sees your password.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border space-y-1 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs font-semibold text-[var(--color-text)] block">2. Read-Only Scope</span>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Access is strictly limited to reading incoming messages. We cannot send or delete mail.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border space-y-1 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs font-semibold text-[var(--color-text)] block">3. Last 30 Days Only</span>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Only recent emails from the past 30 days are evaluated. Links are analyzed as text and never clicked.
                  </p>
                </div>
              </div>
            </div>

            {/* Separated Sandbox Testing Option */}
            <div className="p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)]">
                    <Sparkles size={14} />
                    <span>Want to test before connecting?</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-text)] font-serif">
                    Launch Testing Sandbox (Demo Mode)
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-xl">
                    Experience all 4 features — 30-day overview, quarantine review queue, sender rules, and threat alerts — using realistic safe messages and bank phishing samples.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSandbox(true)}
                  className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
                >
                  <span>Launch Testing Sandbox</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* CONNECTED STATE: LAST 30 DAYS OVERVIEW & 4 CONTROL TABS */}
        {/* ------------------------------------------------------------------ */}
        {isConnected && (
          <div className="space-y-6">

            {/* Account Status Card & Last 30 Days Scanner */}
            <div className="card-flat p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Active Mailbox:</span>
                    <span className="text-sm font-semibold font-mono text-[var(--color-text)]">
                      {connectionInfo.email}
                    </span>
                    {isDemoMode && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
                        Sandbox
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-[var(--color-accent)]" />
                      <span>Scan Window: {dateRange.from} to {dateRange.to}</span>
                    </span>
                    <span>•</span>
                    <span>Provider: {isDemoMode ? 'Simulated Sandbox' : 'Google Gmail (Official OAuth)'}</span>
                  </div>
                </div>

                {/* Primary Scan Button */}
                <div className="flex items-center gap-2.5">
                  {isDemoMode && (
                    <button
                      type="button"
                      onClick={() => handleToggleSandbox(false)}
                      className="btn-secondary px-3 py-2 text-xs text-[var(--color-text-muted)]"
                      title="Exit Sandbox"
                    >
                      Exit Sandbox
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleScanLast30Days}
                    disabled={scanning}
                    className="btn-primary px-5 py-2.5 text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                    <span>{scanning ? 'Scanning Last 30 Days...' : 'Scan Last 30 Days'}</span>
                  </button>
                </div>
              </div>

              {/* Real Data Visual Graph: 30-Day Classification Overview */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  <span>30-Day Mailbox Breakdown ({scanMetrics.totalScanned} analyzed, {scanMetrics.pendingCount} pending)</span>
                  <span className="text-[11px] text-[var(--color-accent)] font-semibold">Trained ML Model Classification</span>
                </div>

                {/* Proportional Stacked Bar Graph */}
                <div className="w-full h-3.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] overflow-hidden flex">
                  {scanMetrics.safePercent > 0 && (
                    <div 
                      style={{ width: `${scanMetrics.safePercent}%` }} 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      title={`Safe: ${scanMetrics.safeCount} (${scanMetrics.safePercent}%)`} 
                    />
                  )}
                  {scanMetrics.suspiciousPercent > 0 && (
                    <div 
                      style={{ width: `${scanMetrics.suspiciousPercent}%` }} 
                      className="h-full bg-amber-500 transition-all duration-500" 
                      title={`Suspicious: ${scanMetrics.suspiciousCount} (${scanMetrics.suspiciousPercent}%)`} 
                    />
                  )}
                  {scanMetrics.phishingPercent > 0 && (
                    <div 
                      style={{ width: `${scanMetrics.phishingPercent}%` }} 
                      className="h-full bg-red-500 transition-all duration-500" 
                      title={`Phishing: ${scanMetrics.phishingCount} (${scanMetrics.phishingPercent}%)`} 
                    />
                  )}
                  {scanMetrics.totalScanned === 0 && (
                    <div className="w-full h-full bg-[var(--color-border)] opacity-40 flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                      Click 'Scan Last 30 Days' to evaluate your incoming emails
                    </div>
                  )}
                </div>

                {/* Classification Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-lg border text-center space-y-0.5 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-emerald-400">Safe Emails</span>
                    <span className="text-xl font-bold text-[var(--color-text)] font-serif">{scanMetrics.safeCount}</span>
                  </div>

                  <div className="p-3 rounded-lg border text-center space-y-0.5 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-amber-400">Suspicious (Review)</span>
                    <span className="text-xl font-bold text-[var(--color-text)] font-serif">{scanMetrics.suspiciousCount}</span>
                  </div>

                  <div className="p-3 rounded-lg border text-center space-y-0.5 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-red-400">Phishing Threats</span>
                    <span className="text-xl font-bold text-[var(--color-text)] font-serif">{scanMetrics.phishingCount}</span>
                  </div>

                  <div className="p-3 rounded-lg border text-center space-y-0.5 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-neutral-400">Total Retrieved</span>
                    <span className="text-xl font-bold text-[var(--color-text)] font-serif">{messages.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Control Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-xl border bg-[var(--color-surface)]" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'inbox'
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Mail size={15} style={{ color: activeTab === 'inbox' ? 'var(--color-accent)' : 'inherit' }} />
                <span>Analyzed Emails ({messages.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                  activeTab === 'review'
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <ShieldAlert size={15} style={{ color: activeTab === 'review' ? '#EF4444' : 'inherit' }} />
                <span>Review Emails</span>
                {stats.in_review > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {stats.in_review}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('senders')}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'senders'
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Shield size={15} style={{ color: activeTab === 'senders' ? 'var(--color-accent)' : 'inherit' }} />
                <span>Sender Lists</span>
                <span className="text-[11px] opacity-70">({senders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                  activeTab === 'alerts'
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Bell size={15} style={{ color: activeTab === 'alerts' ? '#F59E0B' : 'inherit' }} />
                <span>Threat Alerts</span>
                {alerts.filter(a => !a.is_read).length > 0 && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* TAB 1: ANALYZED EMAILS RESULTS LIST */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'inbox' && (
              <div className="card-flat p-6 space-y-4">
                {/* Result Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: `All (${messages.length})` },
                      { id: 'phishing', label: `Phishing (${scanMetrics.phishingCount})` },
                      { id: 'suspicious', label: `Suspicious (${scanMetrics.suspiciousCount})` },
                      { id: 'safe', label: `Safe (${scanMetrics.safeCount})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setResultFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          resultFilter === f.id
                            ? 'bg-[var(--color-accent)] text-stone-900 font-semibold'
                            : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-[var(--color-text-muted)]">
                    Showing {filteredMessages.length} emails
                  </span>
                </div>

                {filteredMessages.length === 0 ? (
                  <div className="py-16 text-center text-sm text-[var(--color-text-muted)] space-y-2">
                    <Mail size={32} className="mx-auto opacity-40" />
                    <p className="font-semibold text-[var(--color-text)]">No emails found in this category.</p>
                    <p className="text-xs">Try selecting 'All' or click 'Scan Last 30 Days' to refresh.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMessages.map((msg) => {
                      const isPhish = msg.verdict === 'likely_scam' || msg.status === 'blocked';
                      const isSuspicious = msg.verdict === 'not_sure';
                      const isSafe = msg.verdict === 'no_signs' || msg.status === 'safe' || msg.status === 'released';
                      const riskPercent = Math.round((msg.model_score || 0) * 100);

                      return (
                        <div 
                          key={msg.id}
                          className="p-4 sm:p-5 rounded-xl border space-y-3 bg-[var(--color-bg)]"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-medium truncate max-w-xs text-[var(--color-text)]">
                                  {msg.sender}
                                </span>
                                {isPhish ? (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/40 font-semibold">
                                    Phishing Threat
                                  </span>
                                ) : isSuspicious ? (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 font-semibold">
                                    Suspicious (In Review)
                                  </span>
                                ) : (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 font-semibold">
                                    Safe
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold truncate text-[var(--color-text)]">
                                {msg.subject}
                              </h3>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {msg.model_score !== null && msg.model_score !== undefined && (
                                <div className="text-right">
                                  <span className="text-[10px] text-[var(--color-text-muted)] block">Model Score</span>
                                  <span className="text-xs font-bold font-mono text-[var(--color-text)]">
                                    {riskPercent}%
                                  </span>
                                </div>
                              )}
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {msg.received_at}
                              </span>
                              <button
                                type="button"
                                onClick={() => setInspectEmail(msg)}
                                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                              >
                                <Eye size={13} />
                                <span>View Details</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                            {msg.snippet || msg.body}
                          </p>

                          {/* Warning signs preview */}
                          {msg.warning_signs && msg.warning_signs.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-1.5">
                              {msg.warning_signs.map((sign, idx) => (
                                <span 
                                  key={idx}
                                  className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] text-amber-300/90 bg-[var(--color-surface)] flex items-center gap-1"
                                >
                                  <AlertTriangle size={10} className="text-amber-400" />
                                  <span>{sign}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* TAB 2: REVIEW EMAILS (QUARANTINE QUEUE) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'review' && (
              <div className="card-flat p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                  <div>
                    <h2 className="text-lg font-semibold font-serif text-[var(--color-text)]">
                      Emails Waiting for Review
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Suspicious emails flagged by the ML model. Releasing an email requires confirmation.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'in_review', label: 'Waiting for Review' },
                      { id: 'blocked', label: 'Blocked' },
                      { id: 'safe', label: 'Marked Safe' },
                      { id: 'all', label: 'All' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setReviewFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          reviewFilter === f.id
                            ? 'bg-[var(--color-accent)] text-stone-900 font-semibold'
                            : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredReviewMessages.length === 0 ? (
                  <div className="py-16 text-center text-sm text-[var(--color-text-muted)] space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-60" />
                    <p className="font-semibold text-base text-[var(--color-text)]">Queue is clear</p>
                    <p className="text-xs">No emails currently waiting for review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReviewMessages.map((msg) => {
                      const riskPercent = Math.round((msg.model_score || 0) * 100);
                      const isHighRisk = riskPercent >= 70;

                      return (
                        <div 
                          key={msg.id}
                          className="p-5 sm:p-6 rounded-xl border space-y-4 bg-[var(--color-bg)]"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-medium text-red-400">
                                  {msg.sender}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded font-semibold uppercase bg-amber-950 text-amber-300 border border-amber-500/30">
                                  {msg.status === 'in_review' ? 'Needs Review' : msg.status}
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-[var(--color-text)] font-serif">
                                {msg.subject}
                              </h3>
                            </div>

                            <div className="p-3 rounded-lg border bg-[var(--color-surface)] text-right shrink-0 min-w-[130px]" style={{ borderColor: 'var(--color-border)' }}>
                              <div className="text-[11px] text-[var(--color-text-muted)]">Threat Risk</div>
                              <div className="text-lg font-bold font-serif" style={{ color: isHighRisk ? '#EF4444' : '#F59E0B' }}>
                                {riskPercent}% Likelihood
                              </div>
                              <div className="w-full h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden mt-1">
                                <div 
                                  className={`h-full ${isHighRisk ? 'bg-red-500' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, Math.max(5, riskPercent))}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {msg.warning_signs && msg.warning_signs.length > 0 && (
                            <div className="p-3.5 rounded-lg border space-y-1.5 bg-[var(--color-surface)]" style={{ borderColor: 'var(--color-border)' }}>
                              <span className="text-xs font-semibold flex items-center gap-1.5 text-[var(--color-accent)]">
                                <AlertTriangle size={13} />
                                <span>Detected Warning Signs:</span>
                              </span>
                              <ul className="text-xs text-[var(--color-text)] space-y-1 pl-4 list-disc marker:text-amber-400">
                                {msg.warning_signs.map((sign, idx) => (
                                  <li key={idx} className="leading-relaxed">{sign}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)]/50 p-3 rounded-lg border border-[var(--color-border)] leading-relaxed font-mono">
                            {msg.body}
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--color-border)]">
                            <button
                              type="button"
                              onClick={() => setInspectEmail(msg)}
                              className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                            >
                              <Eye size={13} />
                              <span>View Full Report</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReviewAction(msg.id, 'mark_safe')}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check size={13} />
                              <span>Mark as Safe</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReviewAction(msg.id, 'keep_blocked')}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-300 bg-red-950/30 hover:bg-red-950/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShieldAlert size={13} />
                              <span>Keep Blocked</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReleaseModalEmail(msg)}
                              className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              <span>Release to Inbox...</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* TAB 3: SENDER LISTS (TRUSTED & BLOCKED) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'senders' && (
              <div className="space-y-6">
                <div className="card-flat p-6 sm:p-7 space-y-4">
                  <div className="space-y-1 pb-3 border-b border-[var(--color-border)]">
                    <h2 className="text-lg font-semibold font-serif text-[var(--color-text)]">
                      Manage Sender Rules
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Addresses and domains added here are evaluated during every inbox scan.
                    </p>
                  </div>

                  <form onSubmit={handleAddSenderSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5">
                        <label className="text-xs font-medium block pb-1 text-[var(--color-text-muted)]">
                          Email Address or Domain
                        </label>
                        <input
                          type="text"
                          value={newSenderEmail}
                          onChange={(e) => setNewSenderEmail(e.target.value)}
                          placeholder="e.g. notifications@mybank.com or @company.com"
                          className="w-full px-3.5 py-2.5 rounded-lg text-xs sm:text-sm border focus:outline-none bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-xs font-medium block pb-1 text-[var(--color-text-muted)]">
                          Rule Type
                        </label>
                        <select
                          value={newSenderType}
                          onChange={(e) => setNewSenderType(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-xs sm:text-sm border focus:outline-none bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                        >
                          <option value="trusted">Trusted Sender</option>
                          <option value="blocked">Blocked Sender</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-xs font-medium block pb-1 text-[var(--color-text-muted)]">
                          Optional Note
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSenderNote}
                            onChange={(e) => setNewSenderNote(e.target.value)}
                            placeholder="e.g. Verified portal"
                            className="flex-1 px-3 py-2.5 rounded-lg text-xs border focus:outline-none bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                          />
                          <button
                            type="submit"
                            className="btn-primary px-4 py-2.5 text-xs sm:text-sm flex items-center gap-1 shrink-0"
                          >
                            <Plus size={14} />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Senders Table */}
                <div className="card-flat p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold font-serif text-[var(--color-text)]">
                        Active Rules ({filteredSenders.length})
                      </h3>
                      <div className="flex items-center gap-1">
                        {['all', 'trusted', 'blocked'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSenderFilter(t)}
                            className={`px-2.5 py-1 rounded text-xs capitalize cursor-pointer ${
                              senderFilter === t 
                                ? 'bg-[var(--color-accent)] text-stone-900 font-semibold' 
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--color-border)]">
                    {filteredSenders.map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[var(--color-text)] truncate">
                              {s.email}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              s.list_type === 'trusted'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-950/60 text-red-300 border border-red-500/30'
                            }`}>
                              {s.list_type}
                            </span>
                          </div>
                          {s.note && (
                            <p className="text-[var(--color-text-muted)] text-[11px] truncate">{s.note}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSender(s.id, s.email)}
                          className="p-1.5 rounded text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* TAB 4: THREAT ALERTS */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'alerts' && (
              <div className="card-flat p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                  <div>
                    <h2 className="text-lg font-semibold font-serif text-[var(--color-text)]">
                      Instant Threat Alerts
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Generated when suspicious or phishing emails are detected.
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {alerts.filter(a => !a.is_read).length} unread
                  </span>
                </div>

                {alerts.length === 0 ? (
                  <div className="py-16 text-center space-y-2 text-[var(--color-text-muted)]">
                    <ShieldCheck size={36} className="mx-auto text-emerald-400 opacity-60" />
                    <p className="font-semibold text-base text-[var(--color-text)]">No Active Alerts</p>
                    <p className="text-xs">No threats detected in your recent emails.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          alert.is_read ? 'bg-[var(--color-bg)] opacity-85' : 'bg-[var(--color-surface)] border-amber-500/40 shadow-sm'
                        }`}
                        style={{ borderColor: alert.is_read ? 'var(--color-border)' : 'rgba(245, 158, 11, 0.4)' }}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {!alert.is_read && <span className="w-2 h-2 rounded-full bg-red-500" />}
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300">
                              {alert.severity_level || 'high'} Threat
                            </span>
                            <span className="text-xs font-mono text-[var(--color-text)] truncate max-w-xs">
                              {alert.sender}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-[var(--color-text)]">
                            {alert.subject}
                          </h4>
                          <span className="text-[11px] text-[var(--color-text-muted)] block">
                            Detected: {alert.detected_at}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!alert.is_read && (
                            <button
                              type="button"
                              onClick={() => handleMarkAlertRead(alert.id)}
                              className="btn-secondary px-2.5 py-1 text-xs"
                            >
                              Mark Read
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveTab('review')}
                            className="btn-primary px-3 py-1 text-xs flex items-center gap-1"
                          >
                            <span>Review</span>
                            <ArrowRight size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDismissAlert(alert.id)}
                            className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-red-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* DETAILED EMAIL REPORT MODAL */}
        {/* ------------------------------------------------------------------ */}
        {inspectEmail && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-7 max-w-2xl w-full space-y-5 text-left bg-[var(--color-surface)] border border-[var(--color-border)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="font-semibold text-lg font-serif text-[var(--color-text)]">
                    Detailed Email Analysis Report
                  </h3>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Analyzed using trained TF-IDF & Logistic Regression model
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectEmail(null)}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Email Summary Header */}
              <div className="space-y-2 text-xs bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-border)]">
                <div>
                  <span className="text-[var(--color-text-muted)]">From: </span>
                  <span className="font-mono text-sm text-[var(--color-text)] font-semibold">{inspectEmail.sender}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Subject: </span>
                  <span className="font-semibold text-sm text-[var(--color-text)]">{inspectEmail.subject}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Received: </span>
                  <span className="text-[var(--color-text)]">{inspectEmail.received_at}</span>
                </div>
                <div className="pt-1 flex items-center gap-3">
                  <span className="text-[var(--color-text-muted)]">Verdict:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    inspectEmail.verdict === 'likely_scam' ? 'bg-red-950 text-red-300' :
                    inspectEmail.verdict === 'not_sure' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {inspectEmail.verdict === 'likely_scam' ? 'Phishing Threat' : inspectEmail.verdict === 'not_sure' ? 'Suspicious' : 'Safe'}
                  </span>
                  {inspectEmail.model_score !== null && (
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">
                      Risk Score: {Math.round(inspectEmail.model_score * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Detected Warning Signs */}
              {inspectEmail.warning_signs && inspectEmail.warning_signs.length > 0 && (
                <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-1.5">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>Why this was flagged:</span>
                  </span>
                  <ul className="text-xs text-[var(--color-text)] space-y-1 pl-4 list-disc marker:text-amber-400">
                    {inspectEmail.warning_signs.map((sign, idx) => (
                      <li key={idx} className="leading-relaxed">{sign}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safe Content View */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Extracted Message Text (Cleaned):</span>
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text)] font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto select-text">
                  {inspectEmail.body}
                </div>
              </div>

              {/* Recommended Next Steps */}
              <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] space-y-1 text-xs">
                <span className="font-semibold text-[var(--color-text)] block">Recommended Next Steps:</span>
                <ul className="text-[var(--color-text-muted)] space-y-1 pl-4 list-disc">
                  {inspectEmail.verdict === 'likely_scam' ? (
                    <>
                      <li>Do not click any links or download attached files from this message.</li>
                      <li>Never share one-time passcodes (OTPs), PINs, or banking passwords.</li>
                      <li>Keep the email blocked and report it to your organization's IT helpdesk.</li>
                    </>
                  ) : inspectEmail.verdict === 'not_sure' ? (
                    <>
                      <li>Verify unexpected requests directly through an official known phone number.</li>
                      <li>Do not reply directly to this sender address.</li>
                    </>
                  ) : (
                    <>
                      <li>This message shows normal legitimate communication patterns.</li>
                      <li>Always remain watchful if payment instructions change unexpectedly.</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/check', { state: { messageText: `${inspectEmail.subject}\n\n${inspectEmail.body}` } });
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  <span>Open in Message Inspector</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectEmail(null)}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MANDATORY RELEASE CONFIRMATION MODAL */}
        {/* ------------------------------------------------------------------ */}
        {releaseModalEmail && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-7 max-w-lg w-full space-y-5 text-left border border-amber-500/40 bg-[var(--color-surface)]">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle size={24} className="shrink-0" />
                <h3 className="font-semibold text-lg font-serif text-[var(--color-text)]">
                  Confirm Email Release
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
                <p>
                  You are about to restore this message from the review queue back into your active inbox:
                </p>

                <div className="p-3 rounded-lg border space-y-1 bg-[var(--color-bg)] border-[var(--color-border)]">
                  <div className="font-semibold text-[var(--color-text)] truncate">{releaseModalEmail.subject}</div>
                  <div className="text-xs font-mono text-red-400">{releaseModalEmail.sender}</div>
                </div>

                <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs space-y-1">
                  <span className="font-semibold block">⚠️ Safety Warning:</span>
                  <p>
                    If this message contains deceptive links or asks for sensitive passwords or personal details, clicking them could compromise your account security.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setReleaseModalEmail(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction(releaseModalEmail.id, 'release', true)}
                  className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Yes, I understand and release</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* GOOGLE OAUTH SETUP GUIDE MODAL */}
        {/* ------------------------------------------------------------------ */}
        {oauthSetupGuide && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-8 max-w-xl w-full space-y-5 text-left bg-[var(--color-surface)] border border-[var(--color-border)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="font-semibold text-lg font-serif text-[var(--color-text)]">
                    Google OAuth 2.0 Configuration Required
                  </h3>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Real Google account connection requires OAuth credentials in your deployment environment.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOauthSetupGuide(null)}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
                <p>
                  To allow real users to sign in securely with Google without entering passwords, configure OAuth 2.0 in the Google Cloud Console:
                </p>

                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-2.5 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)] block font-medium">1. Authorized Redirect URI:</span>
                    <p className="font-mono text-emerald-400 select-all p-1.5 rounded bg-black/30 mt-1">
                      {oauthSetupGuide.authorized_redirect_uri || `${window.location.origin}/api/auth/google/callback`}
                    </p>
                  </div>

                  <div>
                    <span className="text-[var(--color-text-muted)] block font-medium">2. Required Scope:</span>
                    <p className="font-mono text-[var(--color-accent)] select-all p-1.5 rounded bg-black/30 mt-1">
                      https://www.googleapis.com/auth/gmail.readonly
                    </p>
                  </div>

                  <div>
                    <span className="text-[var(--color-text-muted)] block font-medium">3. Render / Server Environment Variables:</span>
                    <ul className="list-disc pl-4 space-y-1 font-mono text-[var(--color-text)] mt-1">
                      <li>GOOGLE_CLIENT_ID</li>
                      <li>GOOGLE_CLIENT_SECRET</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs space-y-1">
                  <span className="font-semibold block">💡 Testing in the meantime:</span>
                  <p>
                    You can test the entire 4-feature workflow immediately using the <strong>Testing Sandbox (Demo Mode)</strong> below.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOauthSetupGuide(null);
                    handleToggleSandbox(true);
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Launch Testing Sandbox Instead</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOauthSetupGuide(null)}
                  className="btn-primary px-4 py-2 text-xs"
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
