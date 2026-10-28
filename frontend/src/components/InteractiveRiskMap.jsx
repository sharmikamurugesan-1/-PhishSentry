import React from 'react';
import { Mail, Search, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, ArrowDown } from 'lucide-react';

export default function InteractiveRiskMap({ 
  verdict = 'not_sure', 
  severity = 'medium',
  signalsCount = 0, 
  linksCount = 0,
  activeStep = 'verdict',
  onSelectStep 
}) {
  const getVerdictTheme = () => {
    switch (verdict) {
      case 'likely_scam':
        return {
          title: 'Likely a Scam',
          desc: 'High threat detected',
          badgeClass: 'bg-red-950/80 text-red-200 border-red-800',
          activeRing: 'ring-red-400 border-red-500 bg-red-950/40',
          icon: ShieldAlert,
          iconColor: 'text-red-400'
        };
      case 'not_sure':
        return {
          title: 'Needs Caution',
          desc: 'Ambiguous patterns',
          badgeClass: 'bg-amber-950/80 text-amber-200 border-amber-800',
          activeRing: 'ring-amber-400 border-amber-500 bg-amber-950/40',
          icon: AlertTriangle,
          iconColor: 'text-amber-400'
        };
      case 'no_signs':
      default:
        return {
          title: 'Looks Safe',
          desc: 'No overt red flags',
          badgeClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-800',
          activeRing: 'ring-emerald-400 border-emerald-500 bg-emerald-950/40',
          icon: ShieldCheck,
          iconColor: 'text-emerald-400'
        };
    }
  };

  const vTheme = getVerdictTheme();
  const VerdictIcon = vTheme.icon;

  const steps = [
    {
      id: 'message',
      label: '1. Message',
      sub: 'Text in memory',
      icon: Mail,
      iconColor: 'text-[#B69A7D]'
    },
    {
      id: 'signals',
      label: '2. Warning Signs',
      sub: signalsCount > 0 ? `${signalsCount} trigger${signalsCount > 1 ? 's' : ''}` : 'No alert tokens',
      icon: Search,
      iconColor: signalsCount > 0 ? 'text-[#C58A45]' : 'text-emerald-400'
    },
    {
      id: 'verdict',
      label: `3. ${vTheme.title}`,
      sub: vTheme.desc,
      icon: VerdictIcon,
      iconColor: vTheme.iconColor,
      customClass: vTheme.badgeClass,
      activeRing: vTheme.activeRing
    },
    {
      id: 'action',
      label: '4. Next Steps',
      sub: 'Clear advice',
      icon: CheckCircle2,
      iconColor: 'text-[#8AC29B]'
    }
  ];

  return (
    <div className="w-full rounded-xl border border-[#34241B] bg-[#1B130E] p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-3 border-b border-[#2C1D15]">
        <span className="font-mono uppercase font-bold tracking-wider text-[#B69A7D]">
          Threat Evaluation Journey
        </span>
        <span className="text-[#8C7462] hidden sm:inline">
          Click any step to inspect evidence
        </span>
      </div>

      {/* Nodes Map (Horizontal on desktop, vertical on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-3 relative">
        {steps.map((st, idx) => {
          const Icon = st.icon;
          const isSelected = activeStep === st.id;

          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStep && onSelectStep(st.id)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative flex flex-col justify-between group ${
                isSelected
                  ? `${st.activeRing || 'border-[#C58A45] ring-2 ring-[#C58A45] bg-[#291B13]'} shadow-md`
                  : 'border-[#2C1D15] bg-[#201610] hover:border-[#4A3223] hover:bg-[#251A13]'
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className={`text-[11px] font-mono font-semibold ${
                  isSelected ? 'text-[#F3EBDD]' : 'text-[#8C7462]'
                }`}>
                  {st.label}
                </span>
                <Icon size={14} className={st.iconColor} aria-hidden="true" />
              </div>

              <span className="text-xs text-[#B69A7D] truncate">
                {st.sub}
              </span>

              {/* Step indicator dot */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C58A45]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
