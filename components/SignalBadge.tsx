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

/**
 * Interpolates heat score (1-100) to an HSL color.
 *
 * 1-20:   Deep blue   (hue ~220)
 * 20-40:  Cyan/Teal   (hue ~190)
 * 40-55:  Purple      (hue ~270)
 * 55-70:  Magenta     (hue ~310)
 * 70-85:  Orange      (hue ~30)
 * 85-100: Bright Red  (hue ~5)
 */
function scoreToHSL(score: number): { bg: string; text: string; border: string; glow: string } {
  const s = Math.max(1, Math.min(score, 100));

  let hue: number;
  let sat: number;
  let light: number;

  if (s <= 20) {
    // Deep blue → Indigo
    hue = 220 + (s / 20) * 10;  // 220-230
    sat = 55 + (s / 20) * 10;
    light = 30 + (s / 20) * 5;
  } else if (s <= 40) {
    // Indigo → Purple
    const t = (s - 20) / 20;
    hue = 230 + t * 40;         // 230-270
    sat = 65 + t * 10;
    light = 35 + t * 5;
  } else if (s <= 55) {
    // Purple → Magenta
    const t = (s - 40) / 15;
    hue = 270 + t * 40;         // 270-310
    sat = 70 + t * 10;
    light = 38 + t * 5;
  } else if (s <= 70) {
    // Magenta → Orange
    const t = (s - 55) / 15;
    hue = 310 + t * 80;         // 310-390 (wraps to 30)
    sat = 80 + t * 10;
    light = 42 + t * 6;
  } else if (s <= 85) {
    // Orange → Red-Orange
    const t = (s - 70) / 15;
    hue = 30 - t * 15;          // 30-15
    sat = 85 + t * 10;
    light = 48 + t * 4;
  } else {
    // Red-Orange → Bright Red
    const t = (s - 85) / 15;
    hue = 15 - t * 10;          // 15-5
    sat = 90 + t * 5;
    light = 50 + t * 5;
  }

  // Normalize hue
  hue = ((hue % 360) + 360) % 360;

  const bg = `hsl(${hue}, ${sat}%, ${light}%)`;
  const text = `hsl(${hue}, 100%, ${Math.min(light + 35, 92)}%)`;
  const border = `hsla(${hue}, ${sat}%, ${light + 10}%, 0.35)`;
  const glow = s >= 65 ? `0 0 ${8 + (s - 65) * 0.5}px hsla(${hue}, ${sat}%, ${light + 15}%, ${0.2 + (s - 65) * 0.01})` : 'none';

  return { bg, text, border, glow };
}

const SignalBadge: React.FC<SignalBadgeProps> = ({ heatScore, isHighAttention, triggers }) => {
  const colors = scoreToHSL(heatScore);
  const triggerCount = [triggers.unusualVolume, triggers.nearExtreme, triggers.volatilitySpike].filter(Boolean).length;

  return (
    <div className="flex items-center gap-1.5">
      {/* Pulse Dot — graduated by severity */}
      {isHighAttention && heatScore >= 75 ? (
        // Critical: large pulsing orange/red
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: colors.bg }}
          />
          <span
            className="relative inline-flex rounded-full h-2.5 w-2.5"
            style={{ backgroundColor: colors.bg, boxShadow: `0 0 8px ${colors.bg}` }}
          />
        </span>
      ) : isHighAttention ? (
        // Elevated: medium pulsing dot
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ backgroundColor: colors.bg }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: colors.bg }}
          />
        </span>
      ) : triggerCount >= 1 ? (
        // Low alert: static colored dot
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: colors.bg }}
        />
      ) : (
        // No signal: muted grey dot
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
      )}

      {/* Heat Score Pill — inline HSL gradient */}
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-[0.68rem] font-bold font-mono border"
        style={{
          background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg}dd)`,
          color: colors.text,
          borderColor: colors.border,
          boxShadow: colors.glow,
        }}
      >
        {heatScore}
      </span>

      {/* Trigger Micro-Icons */}
      <div className="hidden md:flex items-center gap-0.5 text-[0.6rem]">
        {triggers.unusualVolume && (
          <span title="Unusual Volume (>180% avg)" style={{ color: colors.text, opacity: 0.9 }}>📊</span>
        )}
        {triggers.nearExtreme && (
          <span title="Near 52-Week Extreme" style={{ color: colors.text, opacity: 0.9 }}>📍</span>
        )}
        {triggers.volatilitySpike && (
          <span title="Volatility Spike" style={{ color: colors.text, opacity: 0.9 }}>⚡</span>
        )}
      </div>

      {/* ALERT label for critical stocks */}
      {isHighAttention && heatScore >= 75 && (
        <span
          className="text-[0.6rem] font-black tracking-widest animate-pulse hidden lg:inline"
          style={{ color: colors.text }}
        >
          ALERT
        </span>
      )}
    </div>
  );
};

export default SignalBadge;
