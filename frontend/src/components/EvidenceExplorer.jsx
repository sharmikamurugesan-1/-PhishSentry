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
  ArrowRight
} from 'lucide-react';
import { COPY } from '../copy';

export default function EvidenceExplorer({
  verdict = 'not_sure',
  severityLevel = 'medium',
  modelScore = 0.5,
  noticed = [],
  links = [],
  todo = [],
  originalText = ''
}) {
  // Tool order strictly required: 1. Message Heatmap -> 2. Threat Map -> 3. Risk Categories
  // Message Heatmap MUST be first and default selected!
  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' | 'threat_map' | 'categories'
  const [showHighlightedView, setShowHighlightedView] = useState(true);

  // Filter detected warning signs into meaningful categories
  const urgencyWords = noticed.filter((n) => 
    /urgent|immediately|blocked|suspended|disconnected|immediate|rush|act now|hurry|freeze/i.test(n.text)
  );
  const credentialWords = noticed.filter((n) => 
    /kyc|otp|pan card|aadhaar|password|wire transfer|refund|bank|account|pin|cvv/i.test(n.text)
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

  const toolDescriptions = {
    heatmap: "Review the message with suspicious phrases highlighted. Click any highlight to inspect it.",
    threat_map: "Explore how the message, detected warning signs, and safe steps connect.",
    categories: "Review how each warning category contributed to the final result."
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

        {/* Tool Mode Tabs in Strict Order: 1. Heatmap -> 2. Threat Map -> 3. Categories */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[13px] self-stretch sm:self-auto">
          {/* 1. Message Heatmap (Default & First) */}
          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Flame size={13} />
            <span>1. Message Heatmap</span>
          </button>

          {/* 2. Threat Map */}
          <button
            type="button"
            onClick={() => setActiveTab('threat_map')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'threat_map'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <GitFork size={13} />
            <span>2. Threat Map</span>
          </button>

          {/* 3. Risk Categories */}
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <BarChart3 size={13} />
            <span>3. Risk Categories</span>
          </button>
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

          {/* TOOL 1: MESSAGE HEATMAP (REPORT / EVIDENCE VIEW) */}
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

          {/* TOOL 2: THREAT MAP (RELATIONSHIP GRAPH) */}
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

          {/* TOOL 3: RISK CATEGORIES (RISK BAR CHART) */}
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
              <span className="text-[12px] text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-surface-hover)]">
                {activeItem?.type === 'finding' ? 'Phrase finding' : 
                 activeItem?.type === 'link' ? 'Web link' : 
                 activeItem?.type === 'category' ? 'Category' : 'Check summary'}
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

            {/* Category Finding Details */}
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