import React, { useState, useEffect } from 'react';
import { 
  Highlighter, 
  Activity, 
  BarChart3, 
  Sliders, 
  GitFork, 
  Clock, 
  AlertTriangle, 
  Globe, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  Lightbulb, 
  Shield, 
  Info, 
  FileText, 
  Lock, 
  CheckCircle2
} from 'lucide-react';
import { COPY } from '../copy';

export default function EvidenceExplorer({
  verdict = 'not_sure',
  severityLevel = 'medium',
  modelScore = 0.5,
  modelType = 'Pattern comparison',
  noticed = [],
  links = [],
  todo = [],
  originalText = ''
}) {
  // 6 Advanced Graph-Based Visualizations:
  // 1. highlight -> Message Highlight
  // 2. risk_heatmap -> Risk Heatmap
  // 3. bar_graph -> Risk Bar Graph
  // 4. breakdown -> Risk Breakdown
  // 5. threat_map -> Threat Connection Map
  // 6. timeline -> Evidence Timeline
  const [activeTab, setActiveTab] = useState('highlight');
  const [showHighlightedView, setShowHighlightedView] = useState(true);

  // Group detected warning signs into simple categories
  const urgencyWords = noticed.filter((n) => 
    /urgent|immediately|blocked|suspended|disconnected|immediate|rush|act now|hurry|freeze|24 hours|expire|warning/i.test(n.text)
  );
  const credentialWords = noticed.filter((n) => 
    /kyc|otp|pan card|aadhaar|password|wire transfer|refund|bank|account|pin|cvv|credentials|login/i.test(n.text)
  );
  const otherWords = noticed.filter((n) => 
    !urgencyWords.includes(n) && !credentialWords.includes(n)
  );

  const [activeItem, setActiveItem] = useState(() => {
    if (noticed && noticed.length > 0) {
      return { type: 'finding', data: noticed[0] };
    }
    if (links && links.length > 0) {
      return { type: 'link', data: links[0] };
    }
    return { type: 'message', data: { text: 'Submitted message', count: originalText.length } };
  });

  useEffect(() => {
    if (noticed && noticed.length > 0) {
      setActiveItem({ type: 'finding', data: noticed[0] });
    } else if (links && links.length > 0) {
      setActiveItem({ type: 'link', data: links[0] });
    } else {
      setActiveItem({ type: 'message', data: { text: 'Submitted message', count: originalText.length } });
    }
  }, [noticed, links, originalText]);

  // 1. Tool 3: Risk Bar Graph Categories
  const barGraphCategories = [
    {
      id: 'urgency',
      title: 'Pressure & rush words',
      items: urgencyWords,
      count: urgencyWords.length,
      severity: urgencyWords.length > 0 ? (verdict === 'likely_scam' ? 'High Risk' : 'Caution') : 'None found',
      barColor: urgencyWords.length > 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-hover)]',
      barWidth: urgencyWords.length > 0 ? (urgencyWords.length > 1 ? '85%' : '55%') : '6%',
      summary: 'Words that rush you to act before you have time to think.'
    },
    {
      id: 'links',
      title: 'Suspicious web links',
      items: links,
      count: links.length,
      severity: links.length > 0 ? (links.some(l => l.looks_like) ? 'High Risk' : 'Caution') : 'None found',
      barColor: links.length > 0 ? 'bg-red-500' : 'bg-[var(--color-surface-hover)]',
      barWidth: links.length > 0 ? (links.some(l => l.looks_like) ? '95%' : '60%') : '6%',
      summary: 'Web addresses that hide their true destination or imitate real services.'
    },
    {
      id: 'credentials',
      title: 'Password or personal details request',
      items: credentialWords,
      count: credentialWords.length,
      severity: credentialWords.length > 0 ? 'High Risk' : 'None found',
      barColor: credentialWords.length > 0 ? 'bg-amber-500' : 'bg-[var(--color-surface-hover)]',
      barWidth: credentialWords.length > 0 ? '75%' : '6%',
      summary: 'Requests asking for your passwords, OTP codes, bank account, or identity cards.'
    },
    {
      id: 'patterns',
      title: 'Similarity to known scams',
      items: otherWords,
      count: modelScore ? 1 : 0,
      severity: modelScore >= 0.75 ? 'High Risk' : modelScore >= 0.40 ? 'Caution' : 'Low Risk',
      barColor: modelScore >= 0.75 ? 'bg-red-400' : modelScore >= 0.40 ? 'bg-amber-400' : 'bg-emerald-500',
      barWidth: `${Math.max(10, Math.min(100, Math.round(modelScore * 100)))}%`,
      summary: `${Math.round(modelScore * 100)}% match against thousands of known scam templates.`
    }
  ];

  // 2. Tool 2: Risk Heatmap (Key Danger Areas)
  const heatmapAreas = [
    {
      id: 'pressure',
      name: 'Pressure Words',
      sub: 'Deadlines, threats of account lockout, or urgent warnings',
      level: urgencyWords.length >= 2 ? 4 : urgencyWords.length === 1 ? 3 : (verdict === 'likely_scam' ? 2 : 1),
      levelLabel: urgencyWords.length >= 2 ? 'High Risk' : urgencyWords.length === 1 ? 'Elevated' : (verdict === 'likely_scam' ? 'Caution' : 'Low Risk'),
      activeColor: urgencyWords.length >= 2 ? 'bg-red-500' : urgencyWords.length === 1 ? 'bg-[var(--color-accent)]' : 'bg-emerald-500',
      evidenceCount: urgencyWords.length,
      evidenceSummary: urgencyWords.length > 0 
        ? `${urgencyWords.length} pressure word${urgencyWords.length > 1 ? 's' : ''} found: ${urgencyWords.map(w => `"${w.text}"`).join(', ')}`
        : 'No urgent pressure words or deadline threats found.'
    },
    {
      id: 'links',
      name: 'Web Links & Addresses',
      sub: 'Imposter website links or unverified addresses',
      level: links.some(l => l.looks_like) ? 4 : links.length > 0 ? 3 : 1,
      levelLabel: links.some(l => l.looks_like) ? 'High Risk' : links.length > 0 ? 'Elevated' : 'Low Risk',
      activeColor: links.some(l => l.looks_like) ? 'bg-red-500' : links.length > 0 ? 'bg-amber-500' : 'bg-emerald-500',
      evidenceCount: links.length,
      evidenceSummary: links.length > 0 
        ? `${links.length} web link${links.length > 1 ? 's' : ''} found: ${links.map(l => l.shown).join(', ')}`
        : 'No web addresses or external links were found.'
    },
    {
      id: 'details',
      name: 'Password or Personal Details Request',
      sub: 'Asking for OTPs, PINs, passwords, or government ID cards',
      level: credentialWords.length >= 2 ? 4 : credentialWords.length === 1 ? 3 : 1,
      levelLabel: credentialWords.length >= 2 ? 'High Risk' : credentialWords.length === 1 ? 'Elevated' : 'Low Risk',
      activeColor: credentialWords.length >= 2 ? 'bg-red-500' : credentialWords.length === 1 ? 'bg-amber-500' : 'bg-emerald-500',
      evidenceCount: credentialWords.length,
      evidenceSummary: credentialWords.length > 0
        ? `${credentialWords.length} sensitive detail request${credentialWords.length > 1 ? 's' : ''}: ${credentialWords.map(w => `"${w.text}"`).join(', ')}`
        : 'No requests for passwords or personal details found.'
    },
    {
      id: 'confidence',
      name: 'How Sure the Result Is',
      sub: 'Pattern match against verified scam communications',
      level: modelScore >= 0.85 ? 4 : modelScore >= 0.60 ? 3 : modelScore >= 0.35 ? 2 : 1,
      levelLabel: modelScore >= 0.85 ? 'High Risk' : modelScore >= 0.60 ? 'Elevated' : modelScore >= 0.35 ? 'Caution' : 'Low Risk',
      activeColor: modelScore >= 0.85 ? 'bg-red-500' : modelScore >= 0.60 ? 'bg-amber-500' : modelScore >= 0.35 ? 'bg-amber-600' : 'bg-emerald-500',
      evidenceCount: 1,
      evidenceSummary: `The wording has a ${Math.round(modelScore * 100)}% match with patterns common in scam messages.`
    }
  ];

  // 3. Tool 4: Risk Breakdown (Proportional Share)
  const computeRiskBreakdown = () => {
    if (verdict === 'no_signs' && links.length === 0 && noticed.length === 0) {
      return [
        { id: 'benign', name: 'Normal Communication', percent: 100, count: originalText.length, color: 'bg-emerald-500', note: 'Wording matches typical, legitimate messages with no danger signs.' }
      ];
    }

    // Proportional calculation based on actual findings
    const mlWeight = Math.round(modelScore * 40);
    const linkWeight = links.length > 0 ? (links.some(l => l.looks_like) ? 35 : 25) : 5;
    const urgencyWeight = urgencyWords.length > 0 ? Math.min(25, urgencyWords.length * 12) : 5;
    const credentialWeight = credentialWords.length > 0 ? Math.min(25, credentialWords.length * 12) : 5;
    
    const sum = mlWeight + linkWeight + urgencyWeight + credentialWeight;
    const normML = Math.round((mlWeight / sum) * 100);
    const normLink = Math.round((linkWeight / sum) * 100);
    const normUrgency = Math.round((urgencyWeight / sum) * 100);
    const normCred = 100 - (normML + normLink + normUrgency);

    return [
      { id: 'ml_factor', name: 'Scam Pattern Match', percent: normML, count: 1, color: 'bg-red-500', note: `${Math.round(modelScore * 100)}% match with known scam messages.` },
      { id: 'link_factor', name: 'Suspicious Links', percent: normLink, count: links.length, color: 'bg-amber-500', note: `${links.length} web address${links.length === 1 ? '' : 'es'} found in message.` },
      { id: 'urgency_factor', name: 'Pressure Words', percent: normUrgency, count: urgencyWords.length, color: 'bg-[var(--color-accent)]', note: `${urgencyWords.length} rush or panic word${urgencyWords.length === 1 ? '' : 's'}.` },
      { id: 'cred_factor', name: 'Password or ID Requests', percent: normCred, count: credentialWords.length, color: 'bg-orange-500', note: `${credentialWords.length} request${credentialWords.length === 1 ? '' : 's'} for personal or bank details.` }
    ];
  };

  const breakdownFactors = computeRiskBreakdown();

  // 4. Tool 6: Evidence Timeline Milestones (NO fake milliseconds)
  const timelineMilestones = [
    {
      step: 1,
      title: 'Message Received Privately',
      status: 'Private',
      statusColor: 'text-emerald-400',
      icon: Lock,
      metric: originalText ? `${originalText.length} characters` : 'Not available',
      desc: 'Checked temporarily in computer memory. Nothing is ever saved to a database or tracked.',
      itemData: { type: 'timeline', title: 'Message Received Privately', detail: `Examined ${originalText ? originalText.length : 0} characters in temporary memory with zero permanent storage.` }
    },
    {
      step: 2,
      title: 'Web Links Checked',
      status: links.length > 0 ? (links.some(l => l.looks_like) ? 'Fake Brand Link' : 'External Link') : 'No Links Found',
      statusColor: links.some(l => l.looks_like) ? 'text-red-400' : links.length > 0 ? 'text-amber-400' : 'text-emerald-400',
      icon: Globe,
      metric: `${links.length} web link${links.length === 1 ? '' : 's'}`,
      desc: links.length > 0 ? `Found ${links.length} web address(es). Links were checked safely as plain text and never opened.` : 'No website addresses were discovered in this message.',
      itemData: { type: 'timeline', title: 'Web Links Checked', detail: links.length > 0 ? links.map(l => l.shown + (l.looks_like ? ` (Impersonating ${l.looks_like})` : '')).join(', ') : 'Zero web links found.' }
    },
    {
      step: 3,
      title: 'Warning Words Checked',
      status: noticed.length > 0 ? `${noticed.length} Flagged` : 'Clean Words',
      statusColor: noticed.length > 0 ? 'text-amber-400' : 'text-emerald-400',
      icon: Eye,
      metric: `${noticed.length} detected word${noticed.length === 1 ? '' : 's'}`,
      desc: noticed.length > 0 ? `Flagged ${urgencyWords.length} pressure word(s) and ${credentialWords.length} request(s) for personal details.` : 'No pushy deadlines, threats, or password traps were discovered.',
      itemData: { type: 'timeline', title: 'Warning Words Checked', detail: noticed.length > 0 ? noticed.map(n => `"${n.text}": ${n.why}`).join(' | ') : 'No urgency or credential traps discovered.' }
    },
    {
      step: 4,
      title: 'Scam Pattern Check',
      status: modelScore >= 0.60 ? 'Scam Patterns Found' : modelScore >= 0.35 ? 'Ambiguous' : 'Looks Normal',
      statusColor: modelScore >= 0.60 ? 'text-red-400' : modelScore >= 0.35 ? 'text-amber-400' : 'text-emerald-400',
      icon: BarChart3,
      metric: typeof modelScore === 'number' ? `${Math.round(modelScore * 100)}% match` : 'Not available',
      desc: `Compared the phrasing against thousands of verified legitimate and scam messages.`,
      itemData: { type: 'timeline', title: 'Scam Pattern Check', detail: `The wording shows a ${Math.round(modelScore * 100)}% pattern match with typical scam templates.` }
    },
    {
      step: 5,
      title: 'Final Safety Advice',
      status: verdict === 'likely_scam' ? 'Action Needed' : verdict === 'not_sure' ? 'Be Careful' : 'Safe to Read',
      statusColor: verdict === 'likely_scam' ? 'text-red-400' : verdict === 'not_sure' ? 'text-amber-400' : 'text-emerald-400',
      icon: ShieldCheck,
      metric: `${todo.length} safe step${todo.length === 1 ? '' : 's'}`,
      desc: `Created clear, step-by-step guidance so you know exactly what to do next.`,
      itemData: { type: 'timeline', title: 'Final Safety Advice', detail: `Assigned a risk level of "${severityLevel === 'critical' ? 'High Risk' : severityLevel === 'high' ? 'High Risk' : severityLevel === 'medium' ? 'Caution Needed' : 'Low Risk'}". Recommended ${todo.length} immediate safety action(s).` }
    }
  ];

  const toolDescriptions = {
    highlight: "Read your message with suspicious words and links highlighted. Click any highlight to see why.",
    risk_heatmap: "Overview of key danger areas, from low risk to high risk.",
    bar_graph: "Main warning signs shown as simple horizontal bars.",
    breakdown: "How different warning signs contribute to this result.",
    threat_map: "See how the message, detected warning signs, and advice connect.",
    timeline: "Step-by-step review of how your message was examined."
  };

  const hasAnyEvidence = noticed.length > 0 || links.length > 0;

  return (
    <div className="w-full card-flat space-y-0 text-left">
      
      {/* 1. Navigation Header & Responsive Tabs */}
      <div className="p-4 sm:p-5 bg-[var(--color-surface)] border-b border-[var(--color-border)] space-y-3">
        <div className="space-y-0.5">
          <span className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5 font-normal">
            <Shield size={14} className="text-[var(--color-accent)]" />
            <span>Evidence Explorer · 6 Visual Tools</span>
          </span>
          <p className="text-[14px] text-[var(--color-text)] font-medium">
            {toolDescriptions[activeTab]}
          </p>
        </div>

        {/* Responsive 6-Tool Navigation Grid (2 cols mobile, 3 cols tablet, 6 cols desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
          {/* Tool 1: Message Highlight */}
          <button
            type="button"
            onClick={() => setActiveTab('highlight')}
            className={`px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'highlight'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <Highlighter size={14} className="shrink-0" />
            <span className="truncate">1. Message Highlight</span>
          </button>

          {/* Tool 2: Risk Heatmap */}
          <button
            type="button"
            onClick={() => setActiveTab('risk_heatmap')}
            className={`px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'risk_heatmap'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <Activity size={14} className="shrink-0" />
            <span className="truncate">2. Risk Heatmap</span>
          </button>

          {/* Tool 3: Risk Bar Graph */}
          <button
            type="button"
            onClick={() => setActiveTab('bar_graph')}
            className={`px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'bar_graph'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <BarChart3 size={14} className="shrink-0" />
            <span className="truncate">3. Risk Bar Graph</span>
          </button>

          {/* Tool 4: Risk Breakdown */}
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'breakdown'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <Sliders size={14} className="shrink-0" />
            <span className="truncate">4. Risk Breakdown</span>
          </button>

          {/* Tool 5: Threat Connection Map */}
          <button
            type="button"
            onClick={() => setActiveTab('threat_map')}
            className={`px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'threat_map'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <GitFork size={14} className="shrink-0" />
            <span className="truncate">5. Threat Map</span>
          </button>

          {/* Tool 6: Evidence Timeline */}
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'timeline'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <Clock size={14} className="shrink-0" />
            <span className="truncate">6. Timeline</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Work Area (7 cols active graph, 5 cols detail panel) */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-[var(--color-bg)]">
        
        {/* LEFT COLUMN: ACTIVE TOOL (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)] pb-1 border-b border-[var(--color-border)]">
            <span className="flex items-center gap-1.5">
              <Info size={13} className="text-[var(--color-accent)]" />
              <span>Click any element below to see why it matters</span>
            </span>
            <span className="text-xs">Based on actual check</span>
          </div>

          {/* TOOL 1: MESSAGE HIGHLIGHT */}
          {activeTab === 'highlight' && (
            <div className="space-y-3.5">
              {/* Legend & View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px]">
                <div className="flex flex-wrap items-center gap-3 text-[var(--color-text-muted)]">
                  <span className="text-[var(--color-text)] font-medium">Color Key:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[var(--color-accent)]" />
                    <span>Pressure words</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span>Personal detail asks</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-red-500" />
                    <span>Suspicious links</span>
                  </span>
                </div>

                {/* View Switcher Toggle */}
                <div className="inline-flex items-center gap-1 p-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-xs">
                  <button
                    type="button"
                    onClick={() => setShowHighlightedView(true)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      showHighlightedView 
                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium' 
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Highlights
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHighlightedView(false)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      !showHighlightedView 
                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium' 
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Plain text
                  </button>
                </div>
              </div>

              {/* Message Display Area */}
              <div className="p-5 card-flat text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-words min-h-[160px]">
                {(() => {
                  if (!originalText) {
                    return <span className="text-[var(--color-text-muted)]">No message text was provided for this check.</span>;
                  }

                  if (!showHighlightedView || (!noticed.length && !links.length)) {
                    return (
                      <div className="space-y-3">
                        <p>{originalText}</p>
                        {!hasAnyEvidence && (
                          <div className="pt-2 text-xs text-emerald-400 flex items-center gap-1.5 border-t border-[var(--color-border)]">
                            <ShieldCheck size={15} />
                            <span>No suspicious words, pushy deadlines, or deceptive links were found in this message.</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Build search tokens from verified findings and links
                  const searchTokens = [
                    ...noticed.map(n => n.text),
                    ...links.map(l => l.shown)
                  ].filter(Boolean);

                  if (searchTokens.length === 0) {
                    return <span>{originalText}</span>;
                  }

                  const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                  const pattern = new RegExp(`(${searchTokens.map(escapeRegex).join('|')})`, 'gi');
                  const parts = originalText.split(pattern);

                  return parts.map((part, index) => {
                    const matchedNotice = noticed.find(n => n.text.toLowerCase() === part.toLowerCase());
                    const matchedLink = links.find(l => l.shown.toLowerCase() === part.toLowerCase());

                    if (matchedNotice || matchedLink) {
                      const item = matchedNotice 
                        ? { type: 'finding', data: matchedNotice }
                        : { type: 'link', data: matchedLink };

                      const isSelected = activeItem?.data?.text?.toLowerCase() === part.toLowerCase() ||
                                         activeItem?.data?.shown?.toLowerCase() === part.toLowerCase();

                      const isUrgency = urgencyWords.some(w => w.text.toLowerCase() === part.toLowerCase());
                      const isCred = credentialWords.some(w => w.text.toLowerCase() === part.toLowerCase());

                      let tagColor = 'bg-red-900/40 text-red-200 border-red-700/60';
                      if (isUrgency) tagColor = 'bg-[var(--color-accent)]/20 text-[var(--color-text)] border-[var(--color-accent)]/60';
                      else if (isCred) tagColor = 'bg-amber-500/20 text-[var(--color-text)] border-amber-500/60';

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveItem(item)}
                          className={`inline-block font-medium px-2 py-0.5 rounded mx-0.5 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold shadow-sm'
                              : `${tagColor} hover:opacity-90`
                          }`}
                          title="Click to view explanation"
                        >
                          {part}
                        </button>
                      );
                    }
                    return <span key={index}>{part}</span>;
                  });
                })()}
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
                <span>Click any highlighted word above to view why it was flagged</span>
                <span>{hasAnyEvidence ? `${noticed.length + links.length} warning sign${noticed.length + links.length === 1 ? '' : 's'} identified` : 'Clear text'}</span>
              </div>
            </div>
          )}

          {/* TOOL 2: RISK HEATMAP */}
          {activeTab === 'risk_heatmap' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 card-flat space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-text)]">Danger Area Levels</span>
                  <span>Low Risk → High Risk</span>
                </div>

                <div className="space-y-3">
                  {heatmapAreas.map((area) => {
                    const isSelected = activeItem?.type === 'area' && activeItem?.data?.id === area.id;

                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => setActiveItem({ type: 'area', data: area })}
                        className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer space-y-3 ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[14px]">
                          <div>
                            <span className="font-semibold text-[var(--color-text)] block">
                              {area.name}
                            </span>
                            <span className="text-[12px] text-[var(--color-text-muted)]">
                              {area.sub}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
                            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded font-sans uppercase tracking-wider ${
                              area.level === 4 ? 'bg-red-950/80 text-red-300 border border-red-800' :
                              area.level === 3 ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                              area.level === 2 ? 'bg-amber-950/40 text-amber-200 border border-amber-900' :
                              'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            }`}>
                              {area.levelLabel}
                            </span>
                          </div>
                        </div>

                        {/* 4-Block Visual Heatmap Intensity Scale */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {[1, 2, 3, 4].map((stepIdx) => {
                            const isFilled = stepIdx <= area.level;
                            return (
                              <div
                                key={stepIdx}
                                className={`h-2.5 rounded-sm transition-all ${
                                  isFilled
                                    ? stepIdx === 4 ? 'bg-red-500' :
                                      stepIdx === 3 ? 'bg-amber-500' :
                                      stepIdx === 2 ? 'bg-amber-400' : 'bg-emerald-500'
                                    : 'bg-[var(--color-surface-hover)]'
                                }`}
                              />
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[12px] text-[var(--color-text-muted)] pt-0.5">
                          <span>Risk: {area.levelLabel}</span>
                          <span className="text-[var(--color-accent)] font-medium">Click to inspect</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TOOL 3: RISK BAR GRAPH */}
          {activeTab === 'bar_graph' && (
            <div className="space-y-3">
              {barGraphCategories.map((cat) => {
                const isSelected = activeItem?.type === 'category' && activeItem?.data?.id === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveItem({ type: 'category', data: cat })}
                    className={`w-full p-4 card-flat text-left transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                        : 'hover:border-[var(--color-text-muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="font-semibold text-[var(--color-text)]">
                        {cat.title}
                      </span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {cat.severity}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${cat.barColor}`}
                        style={{ width: cat.barWidth }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)]">
                      <span className="truncate pr-2">{cat.summary}</span>
                      <span className="shrink-0 text-[var(--color-accent)] font-medium">
                        {cat.count > 0 ? `${cat.count} found` : 'None found'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TOOL 4: RISK BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              <div className="p-5 card-flat space-y-5">
                <div className="space-y-1">
                  <h4 className="text-[15px] font-semibold text-[var(--color-text)] font-serif">
                    What Contributed to This Result
                  </h4>
                  <p className="text-[13px] text-[var(--color-text-muted)]">
                    Shows which warning signs had the biggest impact on this check.
                  </p>
                </div>

                {/* Stacked Proportional Bar Graph */}
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-[var(--color-surface-hover)]">
                  {breakdownFactors.map((factor, idx) => (
                    <div
                      key={idx}
                      className={`${factor.color} h-full transition-all duration-500`}
                      style={{ width: `${factor.percent}%` }}
                      title={`${factor.name}: ${factor.percent}%`}
                    />
                  ))}
                </div>

                {/* Individual Factor Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {breakdownFactors.map((factor) => {
                    const isSelected = activeItem?.type === 'factor' && activeItem?.data?.id === factor.id;

                    return (
                      <button
                        key={factor.id}
                        type="button"
                        onClick={() => setActiveItem({ type: 'factor', data: factor })}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
                            <span className={`w-2.5 h-2.5 rounded-full ${factor.color}`} />
                            <span>{factor.percent}% Share</span>
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)]">
                            {factor.count} item{factor.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <h5 className="font-semibold text-[13px] text-[var(--color-text)] leading-snug">
                          {factor.name}
                        </h5>
                        <p className="text-[12px] text-[var(--color-text-muted)] line-clamp-2">
                          {factor.note}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TOOL 5: THREAT CONNECTION MAP */}
          {activeTab === 'threat_map' && (
            <div className="space-y-4">
              {!hasAnyEvidence ? (
                <div className="p-8 card-flat text-center space-y-2">
                  <ShieldCheck size={28} className="text-emerald-500 mx-auto" />
                  <h4 className="font-semibold text-[15px] text-[var(--color-text)] font-serif">No warning signs found</h4>
                  <p className="text-[13px] text-[var(--color-text-muted)] max-w-sm mx-auto">
                    The check found no pushy language, fake threats, or deceptive links in this message.
                  </p>
                </div>
              ) : (
                <div className="p-5 card-flat space-y-4">
                  {/* Origin Node */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setActiveItem({ type: 'message', data: { text: 'Submitted message', count: originalText.length } })}
                      className={`px-4 py-2.5 rounded-lg border text-[13px] transition-all cursor-pointer flex items-center gap-2 ${
                        activeItem?.type === 'message'
                          ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)] text-[var(--color-text)] font-medium'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
                      }`}
                    >
                      <FileText size={15} className="text-[var(--color-accent)]" />
                      <span>Original message ({originalText.length} characters)</span>
                    </button>
                  </div>

                  <div className="flex justify-center my-0.5">
                    <div className="w-px h-5 bg-[var(--color-border)]" />
                  </div>

                  {/* Branch Nodes: Warning Signs & Suspicious Links */}
                  <div className="space-y-2 text-center">
                    <span className="text-xs text-[var(--color-text-muted)] block">
                      Warning signs & web links found
                    </span>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      {noticed.map((sig, idx) => {
                        const isSelected = activeItem?.type === 'finding' && activeItem?.data?.text === sig.text;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveItem({ type: 'finding', data: sig })}
                            className={`px-3 py-1.5 rounded-md border text-[13px] transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                            }`}
                          >
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>"{sig.text}"</span>
                          </button>
                        );
                      })}

                      {links.map((lnk, idx) => {
                        const isSelected = activeItem?.type === 'link' && activeItem?.data?.shown === lnk.shown;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveItem({ type: 'link', data: lnk })}
                            className={`px-3 py-1.5 rounded-md border text-[13px] transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-red-600 text-white font-semibold'
                                : 'bg-[var(--result-danger-bg)] border-[var(--result-danger-border)] text-[var(--result-danger-text)] hover:border-red-500'
                            }`}
                          >
                            <Globe size={13} className="shrink-0" />
                            <span>{lnk.shown}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-center my-0.5">
                    <div className="w-px h-5 bg-[var(--color-border)]" />
                  </div>

                  {/* Terminal Outcome Node */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setActiveItem({ type: 'verdict', data: { verdict, severityLevel, reason: COPY.result.verdictLabels[verdict]?.subtitle } })}
                      className={`px-4 py-2.5 rounded-lg border text-[13px] transition-all cursor-pointer flex items-center gap-2 ${
                        activeItem?.type === 'verdict'
                          ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]'
                      }`}
                    >
                      <ShieldAlert size={15} className={verdict === 'likely_scam' ? 'text-red-400' : 'text-amber-400'} />
                      <span className="font-semibold text-[var(--color-text)]">
                        Result: {verdict === 'likely_scam' ? 'Likely a Scam' : verdict === 'not_sure' ? 'Needs Caution' : 'Looks Safe'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TOOL 6: EVIDENCE TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="p-5 card-flat space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-text)]">Step-by-Step Safety Review</span>
                  <span>5 Steps Completed</span>
                </div>

                <div className="relative pl-6 space-y-5 border-l-2 border-[var(--color-border)] ml-3">
                  {timelineMilestones.map((ms) => {
                    const Icon = ms.icon;
                    const isSelected = activeItem?.type === 'timeline' && activeItem?.data?.step === ms.step;

                    return (
                      <button
                        key={ms.step}
                        type="button"
                        onClick={() => setActiveItem({ type: 'timeline', data: { ...ms, ...ms.itemData } })}
                        className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer relative group space-y-2 ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        {/* Timeline Marker Bullet */}
                        <div className={`absolute -left-[31px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-accent)] border-[var(--color-bg)] text-[#1B130E]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                        }`}>
                          <span className="text-[10px] font-bold">{ms.step}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[14px] text-[var(--color-text)] flex items-center gap-2">
                            <Icon size={14} className="text-[var(--color-accent)]" />
                            <span>{ms.title}</span>
                          </span>
                          <span className={`text-[12px] font-medium ${ms.statusColor}`}>
                            {ms.status}
                          </span>
                        </div>

                        <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                          {ms.desc}
                        </p>

                        <div className="flex items-center justify-between text-[12px] pt-1 border-t border-[var(--color-border)]">
                          <span className="text-[var(--color-text-muted)]">
                            Actual check:
                          </span>
                          <span className="font-medium text-[var(--color-text)]">
                            {ms.metric}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: EVIDENCE DETAILS PANEL (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 card-flat space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-[var(--color-accent)]" />
                <h4 className="font-semibold text-[15px] text-[var(--color-text)] font-serif">
                  Evidence Details
                </h4>
              </div>
              <span className="text-[12px] text-[var(--color-text-muted)] px-2.5 py-0.5 rounded bg-[var(--color-surface-hover)]">
                {activeItem?.type === 'finding' ? 'Detected Word' : 
                 activeItem?.type === 'link' ? 'Web Link' : 
                 activeItem?.type === 'category' ? 'Warning Bar' : 
                 activeItem?.type === 'area' ? 'Risk Area' :
                 activeItem?.type === 'factor' ? 'Result Factor' :
                 activeItem?.type === 'timeline' ? 'Check Step' : 'Summary'}
              </span>
            </div>

            {/* Word Finding Details */}
            {activeItem?.type === 'finding' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-[var(--color-accent)] font-medium flex items-center gap-1.5">
                    <Eye size={13} />
                    <span>What was found</span>
                  </span>
                  <p className="text-[14px] font-medium text-[var(--color-text)]">
                    "{activeItem.data.text}"
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-red-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>Why it matters</span>
                  </span>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.why}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <Shield size={13} />
                    <span>What you should do next</span>
                  </span>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    Do not rush or reply. Verify directly by contacting the real organization using a phone number you look up yourself.
                  </p>
                </div>
              </div>
            )}

            {/* Link Finding Details */}
            {activeItem?.type === 'link' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-red-400 font-medium flex items-center gap-1.5">
                    <Globe size={13} />
                    <span>Web link found</span>
                  </span>
                  <p className="text-[14px] font-medium text-red-300 break-all">
                    {activeItem.data.shown}
                  </p>
                  {activeItem.data.looks_like && (
                    <span className="text-[12px] text-[var(--color-accent)] block pt-1">
                      Impersonating: {activeItem.data.looks_like}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-[var(--color-text-muted)] font-medium">
                    Why it is suspicious
                  </span>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.note}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-emerald-400 font-medium">
                    Safe handling
                  </span>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    This web address was examined strictly as text. We never open or visit unfamiliar links.
                  </p>
                </div>
              </div>
            )}

            {/* Category Finding Details (Risk Bar Graph) */}
            {activeItem?.type === 'category' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h5 className="font-semibold text-[15px] text-[var(--color-text)]">
                    {activeItem.data.title}
                  </h5>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.summary}
                  </p>
                </div>

                {activeItem.data.items && activeItem.data.items.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <span className="text-[12px] text-[var(--color-text-muted)] font-medium">
                      Warning signs found in this category:
                    </span>
                    {activeItem.data.items.map((it, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px] space-y-1">
                        <span className="font-semibold text-[var(--color-accent)]">
                          "{it.text || it.shown}"
                        </span>
                        <p className="text-[var(--color-text-muted)]">
                          {it.why || it.note}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--color-text-muted)] italic p-3 rounded-lg bg-[var(--color-surface)]">
                    No specific trigger words were identified in this category for this message.
                  </p>
                )}
              </div>
            )}

            {/* Danger Area Details (Risk Heatmap) */}
            {activeItem?.type === 'area' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className={`text-[11px] font-sans px-2 py-0.5 rounded font-semibold uppercase ${
                    activeItem.data.level === 4 ? 'bg-red-950/80 text-red-300 border border-red-800' :
                    activeItem.data.level === 3 ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                    activeItem.data.level === 2 ? 'bg-amber-950/40 text-amber-200 border border-amber-900' :
                    'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  }`}>
                    {activeItem.data.levelLabel}
                  </span>
                  <h5 className="font-semibold text-[15px] text-[var(--color-text)] pt-1">
                    {activeItem.data.name}
                  </h5>
                  <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.sub}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-[var(--color-text-muted)] font-medium">
                    What was found:
                  </span>
                  <p className="text-[14px] text-[var(--color-text)]">
                    {activeItem.data.evidenceSummary}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-emerald-400 font-medium">
                    What you should do next:
                  </span>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.level >= 3 
                      ? 'Be extremely cautious. Do not click links or provide personal info until you verify with the sender independently.'
                      : 'Safe hygiene applies. Never send banking passwords or verification codes to anyone.'}
                  </p>
                </div>
              </div>
            )}

            {/* Factor Details (Risk Breakdown) */}
            {activeItem?.type === 'factor' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] font-semibold">
                    {activeItem.data.percent}% Share of Result
                  </span>
                  <h5 className="font-semibold text-[15px] text-[var(--color-text)] pt-1">
                    {activeItem.data.name}
                  </h5>
                  <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.note}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-[var(--color-text-muted)] font-medium">
                    How it affects your safety:
                  </span>
                  <p className="text-[14px] text-[var(--color-text)]">
                    Represents {activeItem.data.percent}% of the total warning score, supported by {activeItem.data.count} detected signal(s).
                  </p>
                </div>
              </div>
            )}

            {/* Timeline Details (Evidence Timeline) */}
            {activeItem?.type === 'timeline' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-emerald-400 font-semibold">
                    {activeItem.data.status}
                  </span>
                  <h5 className="font-semibold text-[15px] text-[var(--color-text)] pt-1">
                    Step {activeItem.data.step}: {activeItem.data.title}
                  </h5>
                  <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.desc}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-[var(--color-accent)] font-medium">
                    What this step confirmed:
                  </span>
                  <p className="text-[14px] text-[var(--color-text)]">
                    {activeItem.data.detail}
                  </p>
                </div>
              </div>
            )}

            {/* Summary Details */}
            {(activeItem?.type === 'message' || activeItem?.type === 'verdict') && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h5 className="font-semibold text-[15px] text-[var(--color-text)]">
                    Check Summary
                  </h5>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    {verdict === 'likely_scam' 
                      ? 'This message contains common scam language or deceptive links designed to make you act quickly without verifying.'
                      : verdict === 'not_sure'
                      ? 'This message is ambiguous. We recommend checking with the sender directly.'
                      : 'No recognizable scam tactics or deceptive links were found in this text.'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px] space-y-1">
                  <span className="text-[var(--color-text-muted)] block">
                    Risk level: <strong className="text-[var(--color-accent)]">{severityLevel === 'critical' ? 'High Risk' : severityLevel === 'high' ? 'High Risk' : severityLevel === 'medium' ? 'Caution Needed' : 'Low Risk'}</strong>
                  </span>
                  <span className="text-[var(--color-text-muted)] block">
                    We don't save your messages.
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
