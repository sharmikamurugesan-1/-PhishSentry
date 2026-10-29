import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Shield
} from 'lucide-react';

import {
  getInboxStatus,
  connectInbox,
  scanInbox,
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

  // Active top navigation tab: 'inbox' | 'review' | 'senders' | 'alerts'
  const [activeTab, setActiveTab] = useState('inbox');

  // Core Data States
  const [connectionInfo, setConnectionInfo] = useState({
    provider: 'demo',
    status: 'connected',
    email: 'user.protect@phishshift-demo.com',
    is_demo: 1,
    last_synced: null
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

  // UI / Action States
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: string }

  // Modals & Inspection
  const [releaseModalEmail, setReleaseModalEmail] = useState(null);
  const [oauthModalProvider, setOauthModalProvider] = useState(null);
  const [inspectEmail, setInspectEmail] = useState(null);

  // Sender list form inputs
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderType, setNewSenderType] = useState('trusted'); // 'trusted' | 'blocked'
  const [newSenderNote, setNewSenderNote] = useState('');
  const [senderFilter, setSenderFilter] = useState('all'); // 'all' | 'trusted' | 'blocked'

  // Filter for review queue
  const [reviewFilter, setReviewFilter] = useState('in_review'); // 'in_review' | 'all' | 'blocked' | 'safe'

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const azureClientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';

  // --------------------------------------------------------------------------
  // Data Fetching
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
        setConnectionInfo(statusRes.connection);
        setStats(statusRes.stats);
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
      setFeedback({ type: 'error', text: 'Could not load mailbox data. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // --------------------------------------------------------------------------
  // Scan Inbox Action
  // --------------------------------------------------------------------------
  const handleScanInbox = async () => {
    try {
      setScanning(true);
      const res = await scanInbox();
      showFeedback('success', `Scan complete! Scanned ${res.scanned_count} emails: ${res.safe_count} Safe, ${res.suspicious_count} Suspicious, ${res.phishing_count} Phishing.`);
      await loadAllData();
    } catch (err) {
      showFeedback('error', err.message || 'Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // --------------------------------------------------------------------------
  // Reset Demo Mailbox
  // --------------------------------------------------------------------------
  const handleResetDemo = async () => {
    try {
      setLoading(true);
      await resetDemoInbox();
      showFeedback('success', 'Simulated demo mailbox has been reset with sample emails.');
      await loadAllData();
    } catch (err) {
      showFeedback('error', 'Could not reset demo mailbox.');
    } finally {
      setLoading(false);
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
      showFeedback('success', res.message || 'Action executed successfully.');
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
  // Connect Provider
  // --------------------------------------------------------------------------
  const handleConnectProvider = (provider) => {
    if (provider === 'google' && googleClientId) {
      const redirectUri = window.location.origin + '/email-protection';
      const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly');
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    } else if (provider === 'microsoft' && azureClientId) {
      const redirectUri = window.location.origin + '/email-protection';
      const scope = encodeURIComponent('Mail.Read');
      window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${azureClientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scope}`;
    } else {
      setOauthModalProvider(provider);
    }
  };

  // --------------------------------------------------------------------------
  // Visualizations Calculations (from real scan data)
  // --------------------------------------------------------------------------
  const scanMetrics = useMemo(() => {
    let safeCount = 0;
    let suspiciousCount = 0;
    let phishingCount = 0;
    let pendingCount = 0;

    messages.forEach(msg => {
      if (msg.scan_status === 'pending') {
        pendingCount++;
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
      pendingCount,
      totalScanned,
      safePercent: totalScanned > 0 ? Math.round((safeCount / totalScanned) * 100) : 0,
      suspiciousPercent: totalScanned > 0 ? Math.round((suspiciousCount / totalScanned) * 100) : 0,
      phishingPercent: totalScanned > 0 ? Math.round((phishingCount / totalScanned) * 100) : 0
    };
  }, [messages]);

  // Filtered senders
  const filteredSenders = useMemo(() => {
    if (senderFilter === 'all') return senders;
    return senders.filter(s => s.list_type === senderFilter);
  }, [senders, senderFilter]);

  // Filtered review messages
  const filteredReviewMessages = useMemo(() => {
    if (reviewFilter === 'all') return messages;
    return messages.filter(m => m.status === reviewFilter);
  }, [messages, reviewFilter]);

  return (
    <div className="section-spacious py-8 sm:py-12 text-left min-h-screen overflow-y-visible" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="content-container max-w-5xl space-y-8">

        {/* Global Feedback Banner */}
        {feedback && (
          <div 
            className={`p-4 rounded-xl flex items-center justify-between text-sm border transition-all ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
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

        {/* Header with Title and Mode Indicator */}
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
              Check incoming emails for fake sender addresses, urgency traps, and deceptive links with full privacy.
            </p>
          </div>

          {/* Connection Status Badge & Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <span className={`w-2 h-2 rounded-full ${connectionInfo.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {connectionInfo.is_demo ? 'Demo Simulation Mode' : 'Connected to Provider'}
              </span>
            </div>

            <button
              type="button"
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-[var(--color-surface-hover)]"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              title="Refresh mailbox data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Primary 4-Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
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
            <span>Inbox Protection</span>
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
        {/* TAB 1: INBOX PROTECTION */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'inbox' && (
          <div className="space-y-6">

            {/* Connection Status Card */}
            <div className="card-flat p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Protected Inbox:</span>
                    <span className="text-sm font-semibold font-mono" style={{ color: 'var(--color-text)' }}>
                      {connectionInfo.email || 'user.protect@phishshift-demo.com'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {connectionInfo.is_demo 
                      ? "Running in pre-configured Demo Mode so you can test live scanning, sender rules, and review actions immediately."
                      : "Connected to your real email provider via official OAuth 2.0 token."}
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg)]">
                      Scanning: Manual (Click 'Scan Inbox')
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-[var(--color-bg)]" title="Continuous background checking is not enabled. Protection runs when you click Scan Inbox.">
                      Continuous background checks: Not configured
                    </span>
                  </div>
                </div>

                {/* Scan Inbox and Reset Actions */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    disabled={scanning || loading}
                    className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                    title="Reset demo inbox back to fresh unscanned state"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleScanInbox}
                    disabled={scanning || loading}
                    className="btn-primary px-5 py-2 text-xs sm:text-sm flex items-center gap-2"
                  >
                    <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                    <span>{scanning ? 'Scanning Inbox...' : 'Scan Inbox'}</span>
                  </button>
                </div>
              </div>

              {/* Real Data Visual Graph: Scan Breakdown */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Scan Results Summary ({scanMetrics.totalScanned} scanned, {scanMetrics.pendingCount} pending)</span>
                  <span>Real ML Output</span>
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
                      Click 'Scan Inbox' to evaluate messages
                    </div>
                  )}
                </div>

                {/* Metrics Breakdown Cards */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-lg border text-center space-y-0.5" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-emerald-400">Safe Messages</span>
                    <span className="text-lg font-bold text-[var(--color-text)] font-serif">{scanMetrics.safeCount}</span>
                  </div>

                  <div className="p-3 rounded-lg border text-center space-y-0.5" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-amber-400">Suspicious (Review)</span>
                    <span className="text-lg font-bold text-[var(--color-text)] font-serif">{scanMetrics.suspiciousCount}</span>
                  </div>

                  <div className="p-3 rounded-lg border text-center space-y-0.5" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] block font-medium text-red-400">Phishing Threats</span>
                    <span className="text-lg font-bold text-[var(--color-text)] font-serif">{scanMetrics.phishingCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Email List with Live Status */}
            <div className="card-flat p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h2 className="text-base font-semibold font-serif" style={{ color: 'var(--color-text)' }}>
                  Inbox Messages ({messages.length})
                </h2>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Evaluated using trained linear models & rule verification
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--color-text-muted)] space-y-2">
                  <Mail size={24} className="mx-auto opacity-40" />
                  <p>Your mailbox is empty.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isPhish = msg.verdict === 'likely_scam' || msg.status === 'blocked';
                    const isSuspicious = msg.verdict === 'not_sure' || msg.status === 'in_review';
                    const isSafe = msg.verdict === 'no_signs' || msg.status === 'safe' || msg.status === 'released';

                    return (
                      <div 
                        key={msg.id}
                        className="p-4 rounded-xl border transition-all space-y-2.5"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-medium truncate max-w-xs" style={{ color: 'var(--color-text)' }}>
                                {msg.sender}
                              </span>
                              {msg.scan_status === 'pending' ? (
                                <span className="text-[11px] px-2 py-0.5 rounded border border-neutral-700 text-neutral-400">
                                  Not scanned yet
                                </span>
                              ) : isPhish ? (
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

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {msg.received_at}
                            </span>
                            <button
                              type="button"
                              onClick={() => setInspectEmail(msg)}
                              className="btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
                              title="View message details"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                            {(isPhish || isSuspicious) && msg.status === 'in_review' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('review');
                                }}
                                className="btn-primary px-2.5 py-1 text-xs flex items-center gap-1"
                              >
                                <span>Review</span>
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                          {msg.snippet || msg.body}
                        </p>

                        {/* Warning signs preview if flagged */}
                        {msg.warning_signs && msg.warning_signs.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {msg.warning_signs.slice(0, 2).map((sign, idx) => (
                              <span 
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] text-amber-300/90 bg-[var(--color-surface)] flex items-center gap-1"
                              >
                                <AlertTriangle size={10} className="text-amber-400" />
                                <span>{sign}</span>
                              </span>
                            ))}
                            {msg.warning_signs.length > 2 && (
                              <span className="text-[11px] px-1.5 py-0.5 text-[var(--color-text-muted)]">
                                +{msg.warning_signs.length - 2} more signs
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Provider Connection Options */}
            <div className="card-flat p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold font-serif text-[var(--color-text)]">
                    Connect Live Provider Mailbox
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Connect a real Gmail or Outlook account via secure read-only OAuth without sharing your password.
                  </p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Official OAuth 2.0
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Google */}
                <div className="p-4 rounded-xl border flex flex-col justify-between space-y-3" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-text)]">Google Gmail</span>
                      <span className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        {googleClientId ? 'Ready' : 'Setup guide available'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      Screen incoming mail in your Google Workspace or personal Gmail inbox.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConnectProvider('google')}
                    className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Connect Google Account</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Microsoft */}
                <div className="p-4 rounded-xl border flex flex-col justify-between space-y-3" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-text)]">Microsoft Outlook</span>
                      <span className="text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        {azureClientId ? 'Ready' : 'Setup guide available'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      Screen incoming mail in Outlook.com or Microsoft 365 work mailboxes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConnectProvider('microsoft')}
                    className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Connect Microsoft Account</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: REVIEW EMAILS (QUARANTINE QUEUE) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'review' && (
          <div className="space-y-6">

            <div className="card-flat p-6 sm:p-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h2 className="text-lg font-semibold font-serif text-[var(--color-text)]">
                    Emails Waiting for Review
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Examine detected signs before making a decision. Releasing an email requires your explicit confirmation.
                  </p>
                </div>

                {/* Status filter buttons */}
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
                  <p className="font-semibold text-base text-[var(--color-text)]">No emails in this queue</p>
                  <p className="text-xs">All scanned emails have been reviewed, or run 'Scan Inbox' to evaluate new messages.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviewMessages.map((msg) => {
                    const riskPercent = Math.round((msg.model_score || 0) * 100);
                    const isHighRisk = riskPercent >= 70;

                    return (
                      <div 
                        key={msg.id}
                        className="p-5 sm:p-6 rounded-xl border space-y-4"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                      >
                        {/* Header: Sender, Subject & Score */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-medium text-red-400">
                                {msg.sender}
                              </span>
                              <span className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase ${
                                msg.status === 'blocked' ? 'bg-red-950 text-red-300 border border-red-500/30' :
                                msg.status === 'safe' || msg.status === 'released' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                                'bg-amber-950 text-amber-300 border border-amber-500/30'
                              }`}>
                                {msg.status === 'in_review' ? 'Waiting for Review' : msg.status}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-[var(--color-text)] font-serif">
                              {msg.subject}
                            </h3>
                          </div>

                          {/* How Sure We Are: Risk score gauge */}
                          <div className="p-3 rounded-lg border bg-[var(--color-surface)] text-right shrink-0 min-w-[130px]" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="text-[11px] text-[var(--color-text-muted)]">Threat Risk</div>
                            <div className="text-lg font-bold font-serif" style={{ color: isHighRisk ? '#EF4444' : '#F59E0B' }}>
                              {riskPercent}% Likelihood
                            </div>
                            {/* Mini Risk Bar */}
                            <div className="w-full h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full ${isHighRisk ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, Math.max(5, riskPercent))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Warning Signs in Simple English */}
                        {msg.warning_signs && msg.warning_signs.length > 0 && (
                          <div className="p-3.5 rounded-lg border space-y-1.5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-accent)' }}>
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

                        {/* Email Text Snippet */}
                        <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)]/50 p-3 rounded-lg border border-[var(--color-border)] leading-relaxed font-mono">
                          {msg.body}
                        </div>

                        {/* Review Decision Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <button
                            type="button"
                            onClick={() => {
                              navigate('/check', { state: { messageText: `${msg.subject}\n\n${msg.body}` } });
                            }}
                            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                          >
                            <ExternalLink size={13} />
                            <span>Inspect in PhishShift</span>
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

                          {/* Release Button -> Triggers Mandatory Confirmation Modal */}
                          <button
                            type="button"
                            onClick={() => setReleaseModalEmail(msg)}
                            className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 ml-auto"
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

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: SENDER LISTS (TRUSTED & BLOCKED) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'senders' && (
          <div className="space-y-6">

            {/* Add New Sender Form */}
            <div className="card-flat p-6 sm:p-7 space-y-4">
              <div className="space-y-1 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold font-serif text-[var(--color-text)]">
                  Manage Sender Rules
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Add trusted addresses or block persistent spam domains. Sender rules are applied during every inbox scan.
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
                      className="w-full px-3.5 py-2.5 rounded-lg text-xs sm:text-sm border focus:outline-none"
                      style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
                      className="w-full px-3 py-2.5 rounded-lg text-xs sm:text-sm border focus:outline-none"
                      style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
                        placeholder="e.g. Official bank portal"
                        className="flex-1 px-3 py-2.5 rounded-lg text-xs border focus:outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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

              {/* Informational Guidance on Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-lg border text-xs space-y-1" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <span className="font-semibold block text-emerald-400">🛡️ Trusted Sender Rules</span>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    Trusted senders receive sender address verification. However, if a message contains dangerous links or credential harvesting traps, PhishShift will still warn you to protect against hijacked accounts.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border text-xs space-y-1" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <span className="font-semibold block text-red-400">🚫 Blocked Sender Rules</span>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    Messages from blocked addresses are automatically flagged as critical threats locally. Full mailbox-level blocking requires configuring email server inbox rules.
                  </p>
                </div>
              </div>
            </div>

            {/* Senders Table */}
            <div className="card-flat p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
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
                <span className="text-xs text-[var(--color-text-muted)]">
                  Saved in database
                </span>
              </div>

              {filteredSenders.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                  No senders listed in this category.
                </div>
              ) : (
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
                          <p className="text-[var(--color-text-muted)] text-[11px] truncate">
                            {s.note}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSender(s.id, s.email)}
                        className="p-1.5 rounded text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: THREAT ALERTS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">

            <div className="card-flat p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="space-y-0.5">
                  <h2 className="text-lg font-semibold font-serif text-[var(--color-text)]">
                    Instant Threat Alerts
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Warnings generated when suspicious or phishing emails are detected during an inbox scan.
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
                  <p className="text-xs max-w-sm mx-auto">
                    No active threats found. Run 'Scan Inbox' anytime to check incoming messages.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        alert.is_read 
                          ? 'bg-[var(--color-bg)] opacity-85' 
                          : 'bg-[var(--color-surface)] border-amber-500/40 shadow-sm'
                      }`}
                      style={{ borderColor: alert.is_read ? 'var(--color-border)' : 'rgba(245, 158, 11, 0.4)' }}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!alert.is_read && (
                            <span className="w-2 h-2 rounded-full bg-red-500" title="Unread alert" />
                          )}
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            alert.severity_level === 'critical' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300'
                          }`}>
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
                          onClick={() => {
                            setActiveTab('review');
                          }}
                          className="btn-primary px-3 py-1 text-xs flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ArrowRight size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDismissAlert(alert.id)}
                          className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                          title="Dismiss alert"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MANDATORY RELEASE CONFIRMATION MODAL */}
        {/* ------------------------------------------------------------------ */}
        {releaseModalEmail && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-7 max-w-lg w-full space-y-5 text-left border border-amber-500/40" style={{ backgroundColor: 'var(--color-surface)' }}>
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

                <div className="p-3 rounded-lg border space-y-1 bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="font-semibold text-[var(--color-text)] truncate">{releaseModalEmail.subject}</div>
                  <div className="text-xs font-mono text-red-400">{releaseModalEmail.sender}</div>
                </div>

                <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs space-y-1">
                  <span className="font-semibold block">⚠️ Safety Warning:</span>
                  <p>
                    If this message contains deceptive links or asks for sensitive passwords or personal details, clicking them could compromise your account security.
                  </p>
                </div>

                <p className="text-xs">
                  {connectionInfo.is_demo 
                    ? "Notice: In Demo Simulation Mode, this email will be marked as 'released' locally in your demo session."
                    : "This will move the message out of quarantine in your connected provider mailbox."}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
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
        {/* EMAIL DETAILS INSPECT MODAL */}
        {/* ------------------------------------------------------------------ */}
        {inspectEmail && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-7 max-w-xl w-full space-y-4 text-left" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-semibold text-lg font-serif text-[var(--color-text)]">
                  Email Details
                </h3>
                <button
                  type="button"
                  onClick={() => setInspectEmail(null)}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block">From:</span>
                  <span className="font-mono text-sm text-[var(--color-text)]">{inspectEmail.sender}</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block">Subject:</span>
                  <span className="font-semibold text-sm text-[var(--color-text)]">{inspectEmail.subject}</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)] block">Body:</span>
                  <div className="p-3 rounded-lg border bg-[var(--color-bg)] text-xs text-[var(--color-text)] font-mono leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
                    {inspectEmail.body}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/check', { state: { messageText: `${inspectEmail.subject}\n\n${inspectEmail.body}` } });
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  <span>Inspect in Full Analyzer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectEmail(null)}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* OAUTH CREDENTIAL SETUP MODAL */}
        {/* ------------------------------------------------------------------ */}
        {oauthModalProvider && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="card-flat p-6 sm:p-7 max-w-lg w-full space-y-4 text-left" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-semibold text-lg font-serif text-[var(--color-text)]">
                  {oauthModalProvider === 'google' ? 'Google OAuth 2.0 Setup' : 'Microsoft Graph Setup'}
                </h3>
                <button
                  type="button"
                  onClick={() => setOauthModalProvider(null)}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
                <p>
                  To link a live corporate or personal mailbox without collecting passwords, configure standard OAuth client credentials:
                </p>

                <div className="p-3.5 rounded-lg border space-y-2 text-xs bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Required environment variable:</span>
                    <p className="font-semibold font-mono" style={{ color: 'var(--color-accent)' }}>
                      {oauthModalProvider === 'google' ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_AZURE_CLIENT_ID'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Authorized redirect URI:</span>
                    <p className="font-mono text-[var(--color-text)]">
                      {window.location.origin}/email-protection
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Authorized read-only scope:</span>
                    <p className="text-emerald-400 font-mono">
                      {oauthModalProvider === 'google' ? 'https://www.googleapis.com/auth/gmail.readonly' : 'Mail.Read'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] space-y-1">
                  <span className="font-semibold text-[var(--color-text)] block">Demo Simulation vs. Live Actions:</span>
                  <p>
                    Without these credentials, PhishShift runs in <strong>Demo Simulation Mode</strong>. In Demo Mode, releasing or blocking an email operates locally on your demo session data and will not modify external mailboxes.
                  </p>
                </div>
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
