import React from 'react';

interface SignalBadgeProps {
  heatScore: number;
  isHighAttention: boolean;
  triggers: {
    unusualVolume: boolean;
    nearExtreme: boolean;
    volatilitySpike: boolean;
  };
}

const SignalBadge: React.FC<SignalBadgeProps> = ({ heatScore, isHighAttention, triggers }) => {
  // Determine color based on Heat Score (1-100)
  // 1-30: Low / Cool (Deep Blue)
  // 31-70: Medium / Warm (Purple / Magenta)
  // 71-100: High / Hot (Orange / Amber / Red)
  const getHeatColor = (score: number) => {
    if (score >= 75) return 'from-orange-500 to-red-600 text-orange-200 border-orange-500/30';
    if (score >= 40) return 'from-indigo-500 to-purple-600 text-indigo-100 border-purple-500/30';
    return 'from-blue-600 to-indigo-700 text-blue-100 border-blue-500/20';
  };

  const getBadgeGlow = (score: number) => {
    if (score >= 75) return 'shadow-[0_0_15px_rgba(249,115,22,0.35)]';
    if (score >= 40) return 'shadow-[0_0_10px_rgba(139,92,246,0.2)]';
    return '';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Pulse Dot */}
      {isHighAttention ? (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
        </span>
      ) : triggers.volatilitySpike ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted"></span>
      )}

      {/* Heat Score Pill */}
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.68rem] font-bold font-mono bg-gradient-to-r border ${getHeatColor(heatScore)} ${getBadgeGlow(heatScore)}`}>
        {heatScore}
      </span>

      {/* Trigger Icons / Tooltip indicator */}
      {isHighAttention && (
        <span className="text-[0.65rem] font-bold text-orange-400 animate-pulse hidden md:inline">
          ALERT
        </span>
      )}
    </div>
  );
};

export default SignalBadge;
