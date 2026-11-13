// Channel intro (5 s) and outro (15 s, with space for YouTube end-screen boxes). Our own design.
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { SANS, fade, prog, ease } from "./theme";
import { L, MONO, setTheme } from "./lab";

const TRACES = [
  "M0,200 H300 V420 H520", "M1920,180 H1620 V420 H1400", "M0,880 H300 V660 H520", "M1920,900 H1620 V660 H1400",
  "M960,0 V300", "M960,1080 V780", "M0,540 H520", "M1920,540 H1400",
];
const Trace: React.FC<{ d: string; p: number; i: number; f: number }> = ({ d, p, i, f }) => (
  <g>
    <path d={d} fill="none" stroke={L.cyan} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={0.75} />
    {p > 0.98 && <circle r={9} fill={L.amber}><animateMotion dur="1s" repeatCount="indefinite" path={d} begin={`${-((f + i * 7) % 30) / 30}s`} /></circle>}
  </g>
);

export const ChannelIntro: React.FC<{ name?: string; tagline?: string; theme?: string }> = ({ name = "GETYR", tagline = "Learn how things really work", theme = "ece" }) => {
  setTheme(theme);
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 38, fps, config: { damping: 11, stiffness: 120 } });
  const glow = interpolate(f, [40, 55, 150], [0, 1, 0.6], { extrapolateRight: "clamp" });
  const out = interpolate(f, [135, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${L.bg1} 0%, ${L.bg0} 70%)`, opacity: out }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute" }}>
        {TRACES.map((d, i) => <Trace key={i} d={d} i={i} f={f} p={prog(f, i * 2, 30 + i * 2, ease)} />)}
        <rect x={520} y={300} width={880} height={480} rx={40} fill={L.panel} stroke={L.cyan} strokeWidth={6} opacity={fade(f, 24, 10)} />
        {Array.from({ length: 10 }, (_, k) => [<line key={"a" + k} x1={600 + k * 80} y1={300} x2={600 + k * 80} y2={270} stroke={L.cyan} strokeWidth={6} opacity={fade(f, 26, 8)} />,
          <line key={"b" + k} x1={600 + k * 80} y1={780} x2={600 + k * 80} y2={810} stroke={L.cyan} strokeWidth={6} opacity={fade(f, 26, 8)} />])}
        <circle cx={960} cy={540} r={260 * glow} fill={L.amber} opacity={0.12 * glow} />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 170, letterSpacing: -6, color: L.text, transform: `scale(${0.6 + 0.4 * pop})`, opacity: Math.min(1, pop * 1.4) }}>
          {name.split("").map((ch, i) => <span key={i} style={{ color: i === 0 ? L.amber : L.text }}>{ch}</span>)}</div>
        <div style={{ fontFamily: MONO, fontSize: 32, letterSpacing: 6, color: L.cyan, marginTop: 6, opacity: fade(f, 62, 12) }}>{tagline.toUpperCase()}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ChannelOutro: React.FC<{ name?: string; theme?: string }> = ({ name = "GETYR", theme = "ece" }) => {
  setTheme(theme);
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 30, fps, config: { damping: 9 } });
  const press = f > 80 && f < 96;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${L.bg1} 0%, ${L.bg0} 70%)` }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", opacity: 0.18 }}>
        {TRACES.slice(0, 4).map((d, i) => <Trace key={i} d={d} i={i} f={f} p={prog(f, i * 2, 30 + i * 2, ease)} />)}
      </svg>
      <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 96, color: L.text, opacity: fade(f, 4, 12) }}>
        Thanks for watching!</div>
      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 36, color: L.cyan, letterSpacing: 4, opacity: fade(f, 14, 12) }}>
        WATCH NEXT  ↓</div>
      {/* empty, framed spaces where YouTube's end-screen elements go */}
      <div style={{ position: "absolute", left: 230, top: 340, width: 860, height: 484, borderRadius: 24, border: `6px dashed ${L.cyan}`, opacity: fade(f, 20, 12) }} />
      <div style={{ position: "absolute", left: 1270, top: 410, width: 340, height: 340, borderRadius: "50%", border: `6px dashed ${L.amber}`, opacity: fade(f, 24, 12) }} />
      <div style={{ position: "absolute", left: 1190, top: 790, width: 500, textAlign: "center", transform: `scale(${(press ? 0.92 : 1) * (0.5 + 0.5 * pop)})`, opacity: Math.min(1, pop * 1.5) }}>
        <div style={{ display: "inline-block", background: press ? "#b00" : "#e00", color: "#fff", fontFamily: SANS, fontWeight: 900, fontSize: 52, padding: "14px 46px", borderRadius: 14 }}>
          {f > 96 ? "✓ SUBSCRIBED" : "SUBSCRIBE"}</div>
        {f > 100 && <div style={{ fontSize: 50, marginTop: 6, opacity: fade(f, 100, 8) }}>🔔</div>}
      </div>
      <div style={{ position: "absolute", left: 230, bottom: 70, fontFamily: SANS, fontWeight: 800, fontSize: 40, color: L.text, opacity: fade(f, 30, 12) }}>
        {name.split("").map((ch, i) => <span key={i} style={{ color: i === 0 ? L.amber : L.text }}>{ch}</span>)}</div>
    </AbsoluteFill>
  );
};
