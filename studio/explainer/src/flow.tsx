import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
const SANS = "Montserrat, Poppins, Arial, sans-serif";
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.out(Easing.cubic);
const Studio: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "linear-gradient(180deg, #f4f8fd 0%, #e6eef8 100%)", overflow: "hidden" }}>
    
    {children}</AbsoluteFill>;
};
const Streak: React.FC<{ start: number; y: number }> = ({ start, y }) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [start, start + 34], [-900, 2300], { ...cl, easing: Easing.inOut(Easing.quad) });
  const o = interpolate(f, [start, start + 6, start + 28, start + 36], [0, 1, 1, 0], cl);
  return <div style={{ position: "absolute", left: x, top: y, width: 900, height: 10, borderRadius: 10, opacity: o, transform: "rotate(-8deg)",
    background: "linear-gradient(90deg, transparent, #3b82f6 60%, #e0f0ff)", boxShadow: "0 0 40px 12px rgba(37,99,235,.55)" }} />;
};
const PIECES: [string, number, number][] = [
  ["20,20 70,20 170,150 135,178", -50, -40],
  ["185,20 235,20 170,150 145,118", 50, -40],
  ["135,178 170,150 170,330 135,295", 0, 60],
  ["225,130 262,130 262,330 225,295", 0, 60],
  ["275,130 360,130 395,168 395,210 360,248 300,248 300,214 345,214 358,200 358,178 345,164 275,164", 60, 0],
  ["318,248 360,248 405,330 363,330", 40, 40],
];
const Logo: React.FC<{ at: number; top: number; w: number; word?: boolean }> = ({ at, top, w, word = true }) => {
  const f = useCurrentFrame(); const k = w / 420;
  const glint = interpolate(f, [at + 44, at + 74], [-30, 130], cl);
  const letters = "GETYR".split("");
  return <div style={{ position: "absolute", left: 960 - w / 2, top, width: w }}>
    <svg width={w} height={350 * k} viewBox="0 0 420 350" style={{ overflow: "visible", filter: "drop-shadow(0 12px 18px rgba(37,99,235,.25))" }}>
      <defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bfe3ff" /><stop offset=".45" stopColor="#6fb6f6" /><stop offset="1" stopColor="#2b7de0" /></linearGradient>
        <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0.3"><stop offset={`${(glint - 12) / 100}`} stopColor="#fff" stopOpacity="0" /><stop offset={`${glint / 100}`} stopColor="#fff" stopOpacity=".85" /><stop offset={`${(glint + 12) / 100}`} stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="pc">{PIECES.map(([pt], i) => <polygon key={i} points={pt} />)}</clipPath></defs>
      {PIECES.map(([pt, dx, dy], i) => { const p = interpolate(f, [at + i * 6, at + i * 6 + 16], [0, 1], { ...cl, easing: ease });
        return <polygon key={i} points={pt} fill="url(#ice)" opacity={p} transform={`translate(${dx * (1 - p)} ${dy * (1 - p)})`} />; })}
      <rect width="420" height="350" fill="url(#gl)" clipPath="url(#pc)" />
    </svg>
    {word && <div style={{ textAlign: "center", marginTop: 26 * k, fontFamily: SANS, fontWeight: 700, fontSize: 64 * k, letterSpacing: 16 * k, color: "#16213a" }}>
      {letters.map((c, i) => <span key={i} style={{ opacity: interpolate(f, [at + 50 + i * 4, at + 58 + i * 4], [0, 1], cl) }}>{c}</span>)}</div>}
  </div>;
};
const Line: React.FC<{ at: number; top: number; size: number; color?: string; sp?: number; w?: number; children: React.ReactNode }> = ({ at, top, size, color = "#1f2937", sp = 6, w = 600, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 20], [0, 1], { ...cl, easing: ease });
  return <div style={{ position: "absolute", top, width: 1920, textAlign: "center", fontFamily: SANS, fontWeight: w, fontSize: size, color,
    letterSpacing: sp + (1 - p) * 14, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{children}</div>;
};
export const FlowIntro: React.FC = () => (
  <Studio>
    <Logo at={10} top={210} w={480} />
    <Line at={82} top={775} size={30} color="#5b6b85" sp={8} w={500}>Get Your Root</Line>
    <Line at={100} top={850} size={30} color="#2563eb" sp={8} w={500}>KNOWLEDGE • TECHNOLOGY • BUSINESS • IDEAS</Line>
  </Studio>);
const Icon: React.FC<{ bg: string; ch: string; i: number }> = ({ bg, ch, i }) => {
  const f = useCurrentFrame(); const p = interpolate(f, [70 + i * 6, 88 + i * 6], [0, 1], { ...cl, easing: Easing.out(Easing.back(2)) });
  return <div style={{ width: 84, height: 84, borderRadius: 20, background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: SANS, fontWeight: 800, fontSize: 40, transform: `scale(${p})`, boxShadow: "0 10px 24px rgba(0,0,0,.18)" }}>{ch}</div>;
};
export const FlowOutro: React.FC = () => {
  const f = useCurrentFrame();
  const cx = interpolate(f, [120, 160], [1500, 1010], { ...cl, easing: ease }), cy = interpolate(f, [120, 160], [1060, 905], { ...cl, easing: ease });
  const done = f >= 168, press = f >= 162 && f < 172 ? 0.94 : 1;
  const bp = interpolate(f, [100, 118], [0, 1], { ...cl, easing: Easing.out(Easing.back(1.6)) });
  return <Studio>
    <Line at={6} top={70} size={64} w={800}>Thank you for watching</Line>
    <Line at={22} top={160} size={32} color="#2563eb" sp={4} w={500}>Stay curious. Keep learning.</Line>
    <Logo at={20} top={225} w={300} />
    <Line at={60} top={560} size={26} sp={8} w={500}>LEARN • BUILD • INNOVATE • GROW</Line>
    <div style={{ position: "absolute", top: 690, left: 0, width: 1920, display: "flex", justifyContent: "center", gap: 26, alignItems: "center" }}>
      <Icon bg="#ff0000" ch="▶" i={0} /><Icon bg="#111" ch="X" i={1} /><Icon bg="linear-gradient(45deg,#f9a825,#e91e63,#7b1fa2)" ch="◎" i={2} /><Icon bg="#229ed9" ch="➤" i={3} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: "#1f2937", marginLeft: 10, opacity: interpolate(f, [94, 108], [0, 1], cl) }}>@GetYr_io</div>
    </div>
    <div style={{ position: "absolute", left: 960 - 230, top: 850, width: 460, height: 110, borderRadius: 22, transform: `scale(${bp * press})`,
      background: done ? "#6b7280" : "linear-gradient(180deg,#3b82f6,#1d4ed8)", boxShadow: done ? "none" : "0 0 50px rgba(37,99,235,.6)",
      color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 48, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 2 }}>
      {done ? "✓ SUBSCRIBED" : "SUBSCRIBE"}</div>
    <svg style={{ position: "absolute", left: cx, top: cy, opacity: interpolate(f, [118, 124], [0, 1], cl) }} width="60" height="70" viewBox="0 0 24 28">
      <path d="M2 2 L2 22 L7 17 L11 26 L14 25 L10 16 L17 16 Z" fill="#fff" stroke="#111" strokeWidth="1.5" /></svg>
  </Studio>;
};
