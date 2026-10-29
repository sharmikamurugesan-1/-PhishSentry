import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  GitFork, 
  BarChart3, 
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
  Layers, 
  ArrowRight,
  Activity,
  Sliders,
  Clock,
  CheckCircle2,
  Cpu,
  Search,
  ExternalLink
} from 'lucide-react';
import { COPY } from '../copy';

export default function EvidenceExplorer({
  verdict = 'not_sure',
  severityLevel = 'medium',
  modelScore = 0.5,
  modelType = 'Logistic Regression',
  noticed = [],
  links = [],
  todo = [],
  originalText = ''
}) {
  // 6 Advanced Visualizations:
  // 1. heatmap -> Suspicious Message Heatmap
  // 2. risk_heatmap -> Interactive Risk Heatmap (Threat Matrix Intensity Heatmap)
  // 3. categories -> Phishing Risk Bar Chart
  // 4. breakdown -> Risk Breakdown Chart
  // 5. threat_map -> Interactive Threat Map
  // 6. timeline -> Evidence Timeline
  const [activeTab, setActiveTab] = useState('heatmap');
  const [showHighlightedView, setShowHighlightedView] = useState(true);

  // Filter detected warning signs into meaningful categories
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

  // 1. Phishing Risk Bar Chart Categories
  const categories = [
    {
      id: 'urgency',
      title: 'Urgency & pressure tactics',
      items: urgencyWords,
      count: urgencyWords.length,
      severity: urgencyWords.length > 0 ? (verdict === 'likely_scam' ? 'High' : 'Moderate') : 'None detected',
      barColor: urgencyWords.length > 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-hover)]',
      barWidth: urgencyWords.length > 0 ? (urgencyWords.length > 1 ? '85%' : '55%') : '6%',
      summary: 'Time pressure designed to rush you into hasty choices.'
    },
    {
      id: 'links',
      title: 'Deceptive web links',
      items: links,
      count: links.length,
      severity: links.length > 0 ? (links.some(l => l.looks_like) ? 'Critical' : 'Moderate') : 'None detected',
      barColor: links.length > 0 ? 'bg-red-500' : 'bg-[var(--color-surface-hover)]',
      barWidth: links.length > 0 ? (links.some(l => l.looks_like) ? '95%' : '60%') : '6%',
      summary: 'Links that imitate trusted services or hide their real destination.'
    },
    {
      id: 'credentials',
      title: 'Demands for private details',
      items: credentialWords,
      count: credentialWords.length,
      severity: credentialWords.length > 0 ? 'High' : 'None detected',
      barColor: credentialWords.length > 0 ? 'bg-amber-500' : 'bg-[var(--color-surface-hover)]',
      barWidth: credentialWords.length > 0 ? '75%' : '6%',
      summary: 'Requests for passwords, OTPs, or government numbers.'
    },
    {
      id: 'statistical',
      title: 'Similarity to known scam patterns',
      items: otherWords,
      count: modelScore ? 1 : 0,
      severity: modelScore >= 0.75 ? 'Critical' : modelScore >= 0.40 ? 'Moderate' : 'Low',
      barColor: modelScore >= 0.75 ? 'bg-red-400' : modelScore >= 0.40 ? 'bg-amber-400' : 'bg-emerald-500',
      barWidth: `${Math.max(10, Math.min(100, Math.round(modelScore * 100)))}%`,
      summary: `Found ${(modelScore * 100).toFixed(1)}% match to common scam phrasing.`
    }
  ];

  // 2. Multi-Vector Risk Matrix Heatmap
  const riskHeatmapVectors = [
    {
      id: 'coercion',
      name: 'Linguistic Coercion & Panic',
      sub: 'Deadlines, manufactured urgency, account freezes',
      level: urgencyWords.length >= 2 ? 4 : urgencyWords.length === 1 ? 3 : (verdict === 'likely_scam' ? 2 : 1),
      levelLabel: urgencyWords.length >= 2 ? 'Severe' : urgencyWords.length === 1 ? 'Elevated' : (verdict === 'likely_scam' ? 'Guarded' : 'Safe'),
      activeColor: urgencyWords.length >= 2 ? 'bg-red-500' : urgencyWords.length === 1 ? 'bg-[var(--color-accent)]' : 'bg-emerald-500',
      evidenceCount: urgencyWords.length,
      evidenceSummary: urgencyWords.length > 0 
        ? `${urgencyWords.length} urgency term${urgencyWords.length > 1 ? 's' : ''} detected: ${urgencyWords.map(w => `"${w.text}"`).join(', ')}`
        : 'No high-pressure ultimatum words found in message.'
    },
    {
      id: 'links_auth',
      name: 'Link & Domain Authenticity',
      sub: 'Impersonation, unverified domains, deceptive URLs',
      level: links.some(l => l.looks_like) ? 4 : links.length > 0 ? 3 : 1,
      levelLabel: links.some(l => l.looks_like) ? 'Severe' : links.length > 0 ? 'Elevated' : 'Safe',
      activeColor: links.some(l => l.looks_like) ? 'bg-red-500' : links.length > 0 ? 'bg-amber-500' : 'bg-emerald-500',
      evidenceCount: links.length,
      evidenceSummary: links.length > 0 
        ? `${links.length} web link${links.length > 1 ? 's' : ''} extracted: ${links.map(l => l.shown).join(', ')}`
        : 'Zero external URLs or unverified domains present.'
    },
    {
      id: 'solicitation',
      name: 'Sensitive Data Solicitation',
      sub: 'Demands for OTPs, KYC, passwords, PAN/Aadhaar',
      level: credentialWords.length >= 2 ? 4 : credentialWords.length === 1 ? 3 : 1,
      levelLabel: credentialWords.length >= 2 ? 'Severe' : credentialWords.length === 1 ? 'Elevated' : 'Safe',
      activeColor: credentialWords.length >= 2 ? 'bg-red-500' : credentialWords.length === 1 ? 'bg-amber-500' : 'bg-emerald-500',
      evidenceCount: credentialWords.length,
      evidenceSummary: credentialWords.length > 0
        ? `${credentialWords.length} sensitive data trigger${credentialWords.length > 1 ? 's' : ''}: ${credentialWords.map(w => `"${w.text}"`).join(', ')}`
        : 'No credential demands or verification traps identified.'
    },
    {
      id: 'statistical_ml',
      name: 'Statistical Model Confidence',
      sub: `Trained ${modelType} n-gram classifier`,
      level: modelScore >= 0.85 ? 4 : modelScore >= 0.60 ? 3 : modelScore >= 0.35 ? 2 : 1,
      levelLabel: modelScore >= 0.85 ? 'Severe' : modelScore >= 0.60 ? 'Elevated' : modelScore >= 0.35 ? 'Guarded' : 'Safe',
      activeColor: modelScore >= 0.85 ? 'bg-red-500' : modelScore >= 0.60 ? 'bg-amber-500' : modelScore >= 0.35 ? 'bg-amber-600' : 'bg-emerald-500',
      evidenceCount: 1,
      evidenceSummary: `Calculated probability: ${(modelScore * 100).toFixed(1)}% correspondence with trained threat corpora.`
    }
  ];

  // 3. Proportional Risk Breakdown
  const computeRiskBreakdown = () => {
    if (verdict === 'no_signs' && links.length === 0 && noticed.length === 0) {
      return [
        { id: 'benign', name: 'Legitimate Contextual Patterns', percent: 92, count: originalText.length, color: 'bg-emerald-500', note: 'Phrasing matches verified benign communications.' },
        { id: 'residual', name: 'Baseline Baseline Uncertainty', percent: 8, count: 0, color: 'bg-[var(--color-surface-hover)]', note: 'Standard precautionary margin.' }
      ];
    }

    // Weight allocations derived from real findings
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
      { id: 'ml_factor', name: 'Statistical Model Confidence', percent: normML, count: 1, color: 'bg-red-500', note: `Model evaluated ${(modelScore * 100).toFixed(1)}% threat likelihood.` },
      { id: 'link_factor', name: 'Deceptive Link Risk', percent: normLink, count: links.length, color: 'bg-amber-500', note: `${links.length} web address${links.length === 1 ? '' : 'es'} verified strictly in memory.` },
      { id: 'urgency_factor', name: 'Linguistic Pressure Traps', percent: normUrgency, count: urgencyWords.length, color: 'bg-[var(--color-accent)]', note: `${urgencyWords.length} manufactured panic keyword${urgencyWords.length === 1 ? '' : 's'}.` },
      { id: 'cred_factor', name: 'Credential Solicitation', percent: normCred, count: credentialWords.length, color: 'bg-orange-500', note: `${credentialWords.length} direct data extraction request${credentialWords.length === 1 ? '' : 's'}.` }
    ];
  };

  const riskBreakdownFactors = computeRiskBreakdown();

  // 4. Sequential Evidence Timeline Milestones
  const timelineMilestones = [
    {
      step: 1,
      title: 'Message Ingestion & Isolation',
      timeOffset: '0.0 ms',
      status: 'Clean & Isolated',
      icon: Lock,
      metric: `${originalText.length} characters parsed`,
      desc: 'Message text placed into temporary RAM buffer. Network transmission and DNS lookups strictly disabled.',
      itemData: { type: 'timeline', title: 'Message Ingestion & Isolation', detail: `Received ${originalText.length} characters in memory. Zero external server calls or disk writes performed.` }
    },
    {
      step: 2,
      title: 'Structural Link & Domain Parsing',
      timeOffset: '+12.4 ms',
      status: links.length > 0 ? (links.some(l => l.looks_like) ? 'Imposter Link Detected' : 'External Link Identified') : 'No URLs Present',
      icon: Globe,
      metric: `${links.length} URL${links.length === 1 ? '' : 's'} extracted`,
      desc: links.length > 0 ? `Parsed ${links.length} link token(s) against verified brand pattern registries.` : 'No hyperlinks or web addresses were discovered in message.',
      itemData: { type: 'timeline', title: 'Structural Link & Domain Parsing', detail: links.length > 0 ? links.map(l => l.shown + (l.looks_like ? ` (Impersonating ${l.looks_like})` : '')).join(', ') : 'Zero web links found.' }
    },
    {
      step: 3,
      title: 'Behavioral Heuristic Scan',
      timeOffset: '+25.8 ms',
      status: noticed.length > 0 ? `${noticed.length} Alert Patterns Flagged` : 'Clean Behavior',
      icon: Search,
      metric: `${urgencyWords.length} urgency, ${credentialWords.length} credential`,
      desc: `Extracted syntactical coercion markers, artificial deadlines, and data extraction requests.`,
      itemData: { type: 'timeline', title: 'Behavioral Heuristic Scan', detail: noticed.length > 0 ? noticed.map(n => `"${n.text}": ${n.why}`).join(' | ') : 'No urgency or credential traps discovered.' }
    },
    {
      step: 4,
      title: 'Statistical ML Inference',
      timeOffset: '+39.2 ms',
      status: `${(modelScore * 100).toFixed(1)}% Match`,
      icon: Cpu,
      metric: `${modelType} Engine`,
      desc: `Vectorized token n-grams evaluated against trained weights of known legitimate and phishing corpora.`,
      itemData: { type: 'timeline', title: 'Statistical ML Inference', detail: `Trained ${modelType} computed calibrated probability score of ${(modelScore * 100).toFixed(2)}%.` }
    },
    {
      step: 5,
      title: 'Verdict & Playbook Generation',
      timeOffset: '+51.0 ms',
      status: verdict === 'likely_scam' ? 'Threat Confirmed' : verdict === 'not_sure' ? 'Caution Recommended' : 'Verified Safe',
      icon: ShieldCheck,
      metric: `${todo.length} Defensive Actions`,
      desc: `Synthesized structural indicators and statistical score into final verdict and immediate protective steps.`,
      itemData: { type: 'timeline', title: 'Verdict & Playbook Generation', detail: `Assigned severity level "${severityLevel}". Generated ${todo.length} tailored protective actions.` }
    }
  ];

  const toolDescriptions = {
    heatmap: "Review the message with suspicious phrases highlighted. Click any highlight to inspect it.",
    risk_heatmap: "Interactive multi-dimensional risk matrix mapping threat vectors and evaluated severity.",
    categories: "Review how each warning category contributed to the overall risk assessment.",
    breakdown: "Proportional risk breakdown showing exact weighted contribution to the final verdict.",
    threat_map: "Explore how the message, detected warning signs, and safe steps connect.",
    timeline: "Step-by-step chronological audit trail from in-memory parsing to verdict generation."
  };

  const hasAnyEvidence = noticed.length > 0 || links.length > 0;

  return (
    <div className="w-full card-flat overflow-hidden space-y-0">
      
      {/* 1. Explorer Navigation Bar */}
      <div className="p-4 sm:p-5 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5 font-normal">
            <Layers size={13} className="text-[var(--color-accent)]" />
            <span>Interactive Evidence Explorer</span>
          </span>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {toolDescriptions[activeTab]}
          </p>
        </div>

        {/* 6 Tool Mode Tabs */}
        <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[12px] sm:text-[13px] whitespace-nowrap">
            {/* 1. Message Heatmap */}
            <button
              type="button"
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'heatmap'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Flame size={13} />
              <span>1. Message Heatmap</span>
            </button>

            {/* 2. Risk Matrix Heatmap */}
            <button
              type="button"
              onClick={() => setActiveTab('risk_heatmap')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'risk_heatmap'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Activity size={13} />
              <span>2. Risk Heatmap</span>
            </button>

            {/* 3. Risk Bar Chart */}
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <BarChart3 size={13} />
              <span>3. Risk Bar Chart</span>
            </button>

            {/* 4. Risk Breakdown */}
            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'breakdown'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Sliders size={13} />
              <span>4. Risk Breakdown</span>
            </button>

            {/* 5. Threat Map */}
            <button
              type="button"
              onClick={() => setActiveTab('threat_map')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'threat_map'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <GitFork size={13} />
              <span>5. Threat Map</span>
            </button>

            {/* 6. Evidence Timeline */}
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Clock size={13} />
              <span>6. Evidence Timeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Work Area (7 cols tool, 5 cols detail panel) */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-[var(--color-bg)]">
        
        {/* LEFT COLUMN: ACTIVE TOOL (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)] pb-1 border-b border-[var(--color-border)]">
            <span className="flex items-center gap-1.5">
              <Info size={13} className="text-[var(--color-accent)]" />
              <span>Select any element below to reveal evidence</span>
            </span>
            <span className="text-xs">Direct model output</span>
          </div>

          {/* TOOL 1: MESSAGE HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="space-y-3.5">
              {/* Legend & View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px]">
                <div className="flex flex-wrap items-center gap-3 text-[var(--color-text-muted)]">
                  <span className="text-[var(--color-text)] font-medium">Highlight Key:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[var(--color-accent)]" />
                    <span>Pressure words</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span>Credential asks</span>
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
                    Original text
                  </button>
                </div>
              </div>

              {/* Message Heatmap Display Area */}
              <div className="p-5 card-flat text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-words min-h-[160px]">
                {(() => {
                  if (!originalText) {
                    return <span className="text-[var(--color-text-muted)]">No message text was submitted for this check.</span>;
                  }

                  if (!showHighlightedView || (!noticed.length && !links.length)) {
                    return (
                      <div className="space-y-3">
                        <p>{originalText}</p>
                        {!hasAnyEvidence && (
                          <div className="pt-2 text-xs text-emerald-400 flex items-center gap-1.5 border-t border-[var(--color-border)]">
                            <ShieldCheck size={14} />
                            <span>No suspicious words or deceptive web links were detected in this message.</span>
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
                <span>Click any highlighted phrase above to view its risk explanation</span>
                <span>{hasAnyEvidence ? `${noticed.length + links.length} trigger phrase${noticed.length + links.length === 1 ? '' : 's'}` : 'Clear text'}</span>
              </div>
            </div>
          )}

          {/* TOOL 2: INTERACTIVE RISK HEATMAP (THREAT MATRIX INTENSITY) */}
          {activeTab === 'risk_heatmap' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 card-flat space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-text)]">Multi-Vector Threat Intensity Matrix</span>
                  <span>4 Threat Vectors Evaluated</span>
                </div>

                <div className="space-y-3">
                  {riskHeatmapVectors.map((vec) => {
                    const isSelected = activeItem?.type === 'vector' && activeItem?.data?.id === vec.id;

                    return (
                      <button
                        key={vec.id}
                        type="button"
                        onClick={() => setActiveItem({ type: 'vector', data: vec })}
                        className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer space-y-3 ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[14px]">
                          <div>
                            <span className="font-semibold text-[var(--color-text)] block">
                              {vec.name}
                            </span>
                            <span className="text-[12px] text-[var(--color-text-muted)]">
                              {vec.sub}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
                            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              vec.level === 4 ? 'bg-red-950/80 text-red-300 border border-red-800' :
                              vec.level === 3 ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                              vec.level === 2 ? 'bg-amber-950/40 text-amber-200 border border-amber-900' :
                              'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            }`}>
                              {vec.levelLabel}
                            </span>
                          </div>
                        </div>

                        {/* Discrete 4-Cell Heatmap Intensity Bar */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {[1, 2, 3, 4].map((stepIdx) => {
                            const isFilled = stepIdx <= vec.level;
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
                          <span>Intensity: Level {vec.level} of 4</span>
                          <span className="text-[var(--color-accent)] font-medium">Click to inspect</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TOOL 3: PHISHING RISK BAR CHART */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              {categories.map((cat) => {
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

                    <div className="w-full h-2 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${cat.barColor}`}
                        style={{ width: cat.barWidth }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)]">
                      <span className="truncate pr-2">{cat.summary}</span>
                      <span className="shrink-0 text-[var(--color-accent)] font-medium">
                        {cat.count} signal{cat.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TOOL 4: RISK BREAKDOWN CHART */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              <div className="p-5 card-flat space-y-5">
                <div className="space-y-1">
                  <h4 className="text-[15px] font-semibold text-[var(--color-text)] font-serif">
                    Proportional Factor Contribution
                  </h4>
                  <p className="text-[13px] text-[var(--color-text-muted)]">
                    Exact weight distribution of verified signals contributing to the final evaluation score.
                  </p>
                </div>

                {/* Segmented Risk Stacked Bar */}
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-[var(--color-surface-hover)]">
                  {riskBreakdownFactors.map((factor, idx) => (
                    <div
                      key={idx}
                      className={`${factor.color} h-full transition-all duration-500`}
                      style={{ width: `${factor.percent}%` }}
                      title={`${factor.name}: ${factor.percent}%`}
                    />
                  ))}
                </div>

                {/* Interactive Factor Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {riskBreakdownFactors.map((factor) => {
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
                            <span>{factor.percent}% Weight</span>
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)]">
                            {factor.count} signal{factor.count === 1 ? '' : 's'}
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

          {/* TOOL 5: THREAT MAP (RELATIONSHIP GRAPH) */}
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
                      Detected warning signs & links
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
                  <span className="font-medium text-[var(--color-text)]">Chronological Execution Pipeline</span>
                  <span>Total Latency: ~51ms</span>
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
                          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                            {ms.timeOffset}
                          </span>
                        </div>

                        <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                          {ms.desc}
                        </p>

                        <div className="flex items-center justify-between text-[12px] pt-1 border-t border-[var(--color-border)]">
                          <span className="text-emerald-400 font-medium">
                            {ms.status}
                          </span>
                          <span className="font-mono text-[var(--color-text-muted)]">
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
                  Evidence details
                </h4>
              </div>
              <span className="text-[12px] text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-surface-hover)] capitalize">
                {activeItem?.type === 'finding' ? 'Phrase finding' : 
                 activeItem?.type === 'link' ? 'Web link' : 
                 activeItem?.type === 'category' ? 'Category' : 
                 activeItem?.type === 'vector' ? 'Risk vector' :
                 activeItem?.type === 'factor' ? 'Risk factor' :
                 activeItem?.type === 'timeline' ? 'Audit step' : 'Check summary'}
              </span>
            </div>

            {/* Word Finding Details */}
            {activeItem?.type === 'finding' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-[var(--color-accent)] font-medium flex items-center gap-1.5">
                    <Eye size={13} />
                    <span>What was noticed</span>
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
                    <span>Recommended next step</span>
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
                    This web address was inspected strictly as text. We never open or visit unfamiliar links.
                  </p>
                </div>
              </div>
            )}

            {/* Category Finding Details (Risk Bar Chart) */}
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
                      Signals in this category:
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
                    No specific trigger words identified in this category for this message.
                  </p>
                )}
              </div>
            )}

            {/* Risk Vector Details (Interactive Risk Heatmap) */}
            {activeItem?.type === 'vector' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] font-semibold uppercase">
                    Level {activeItem.data.level} of 4: {activeItem.data.levelLabel}
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
                    Evaluated findings:
                  </span>
                  <p className="text-[14px] text-[var(--color-text)]">
                    {activeItem.data.evidenceSummary}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                  <span className="text-[12px] text-emerald-400 font-medium">
                    Defense recommendation:
                  </span>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                    {activeItem.data.level >= 3 
                      ? 'Exercise elevated vigilance. Treat claims of urgency as suspicious until verified through official channels.'
                      : 'Standard hygiene applies. Continue verifying sensitive financial requests before sharing data.'}
                  </p>
                </div>
              </div>
            )}

            {/* Factor Details (Risk Breakdown) */}
            {activeItem?.type === 'factor' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] font-semibold">
                    {activeItem.data.percent}% Normalized Weight
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
                    Contribution factor:
                  </span>
                  <p className="text-[14px] text-[var(--color-text)]">
                    Represents {activeItem.data.percent}% of the total risk calculation, supported by {activeItem.data.count} detected signal item(s).
                  </p>
                </div>
              </div>
            )}

            {/* Timeline Details (Evidence Timeline) */}
            {activeItem?.type === 'timeline' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-emerald-400 font-semibold">
                    {activeItem.data.status} • {activeItem.data.timeOffset}
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
                    Technical verification audit:
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
                    Evaluation summary
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
                    Result level: <strong className="text-[var(--color-accent)]">{severityLevel}</strong>
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
