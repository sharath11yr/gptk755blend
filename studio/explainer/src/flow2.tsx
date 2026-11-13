import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
const F = "'Inter Display', Inter, Arial, sans-serif";
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.out(Easing.cubic);
const t = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...cl, easing: ease });

const Room: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg,#d9dbe0 0%,#e9eaee 45%,#f1f2f5 62%,#dfe1e6 100%)", overflow: "hidden" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 45% at 50% 45%, rgba(255,255,255,.75), transparent 70%)" }} />
    {children}
  </AbsoluteFill>);

// glowing light trail following a path, with a bright head
const Trail: React.FC<{ d: string; len: number; a: number; b: number; fadeAt: number }> = ({ d, len, a, b, fadeAt }) => {
  const f = useCurrentFrame(); const p = t(f, a, b); const o = interpolate(f, [a, a + 4, fadeAt, fadeAt + 15], [0, 1, 1, 0], cl);
  const tail = len * 0.55;
  return <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
    <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
    <path d={d} fill="none" stroke="#8fd0ff" strokeWidth={5} strokeLinecap="round" filter="url(#glow)"
      strokeDasharray={`${tail} ${len * 3}`} strokeDashoffset={tail - len * p} />
    <path d={d} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray={`${tail} ${len * 3}`} strokeDashoffset={tail - len * p} />
  </svg>;
};
const Orb: React.FC<{ x: number; y: number; o: number; r?: number }> = ({ x, y, o, r = 14 }) =>
  <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", opacity: o, background: "#fff",
    boxShadow: `0 0 ${r}px ${r / 2}px #fff, 0 0 ${r * 4}px ${r * 2}px rgba(56,160,255,.8), 0 0 ${r * 10}px ${r * 4}px rgba(56,160,255,.35)` }} />;

export const Mark: React.FC<{ w: number; p?: number; word?: number; tag?: number; shine?: number }> = ({ w, p = 1, word = 1, tag = 1, shine = -1 }) => {
  const bars = [0, 1, 2, 3].map((i) => Math.max(0, Math.min(1, p * 1.6 - 0.35 - i * 0.12)));
  return <svg width={w} height={w * 0.8} viewBox="0 0 600 480" style={{ overflow: "visible", filter: "drop-shadow(10px 18px 14px rgba(0,0,0,.22))" }}>
    <defs>
      <linearGradient id="dk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a3f48" /><stop offset=".5" stopColor="#15181d" /><stop offset="1" stopColor="#2a2e35" /></linearGradient>
      <linearGradient id="bl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4fa8ff" /><stop offset=".55" stopColor="#1f6fe5" /><stop offset="1" stopColor="#0d47b8" /></linearGradient>
      <linearGradient id="sh" x1="0" x2="1"><stop offset={Math.max(0, shine - .1)} stopColor="#fff" stopOpacity="0" /><stop offset={Math.max(0, shine)} stopColor="#fff" stopOpacity=".75" /><stop offset={Math.max(0, shine + .1)} stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <g opacity={p} transform={`translate(${(1 - p) * -40} 0)`}><text x="300" y="250" textAnchor="end" fontFamily={F} fontWeight={900} fontSize="300" fill="url(#dk)" dx="22">Y</text></g>
    <g opacity={p} transform={`translate(${(1 - p) * 40} 0)`}><text x="300" y="250" textAnchor="start" fontFamily={F} fontWeight={900} fontSize="300" fill="url(#bl)" dx="14">R</text></g>
    {[[268, 205], [290, 188], [312, 168], [334, 146]].map(([x, y], i) => <rect key={i} x={x - 22} y={y + (240 - y) * (1 - bars[i])} width={15} height={(240 - y) * bars[i]} rx={2} fill="url(#bl)" />)}
    <path d="M232 252 Q330 245 390 172" fill="none" stroke="url(#bl)" strokeWidth={8} strokeLinecap="round" strokeDasharray={240} strokeDashoffset={240 * (1 - Math.max(0, p * 1.5 - .5))} />
    <path d="M374 168 L400 158 L394 186 Z" fill="#1f6fe5" opacity={p > .95 ? 1 : 0} />
    <text x="300" y="370" textAnchor="middle" fontFamily={F} fontWeight={800} fontSize="118" fill="url(#dk)" opacity={word} letterSpacing={(1 - word) * 20}>GetYr_io</text>
    <text x="300" y="440" textAnchor="middle" fontFamily={F} fontWeight={700} fontSize="38" letterSpacing={8 + (1 - tag) * 10} fill="#1f2937" opacity={tag}>GET YOUR ROOT</text>
    
  </svg>;
};
const Reflect: React.FC<{ children: React.ReactNode; top: number; o: number }> = ({ children, top, o }) =>
  <div style={{ position: "absolute", left: 0, width: 1920, top, display: "flex", justifyContent: "center", transform: "scaleY(-1)", opacity: o * 0.12, filter: "blur(4px)",
    WebkitMaskImage: "linear-gradient(0deg, #000, transparent 45%)", maskImage: "linear-gradient(0deg, #000, transparent 45%)" }}>{children}</div>;

const INTRO_PATH = "M200 470 C420 470 520 430 640 470 C760 510 820 380 900 420 L1400 560 C1500 590 1300 640 1000 640 L620 640 C560 640 560 600 600 560 L1380 540";
export const FlowIntro2: React.FC = () => {
  const f = useCurrentFrame();
  const head = t(f, 6, 62);
  const lp = t(f, 50, 80), wd = t(f, 78, 96), tg = t(f, 94, 110), kn = t(f, 112, 130);
  const shine = interpolate(f, [100, 135], [-0.1, 1.1], cl);
  const sw = t(f, 104, 128);
  return <Room>
    <Trail d={INTRO_PATH} len={3400} a={6} b={62} fadeAt={78} />
    <Orb x={interpolate(head, [0, .5, 1], [200, 900, 1380])} y={interpolate(head, [0, .5, 1], [470, 420, 540])} o={interpolate(f, [0, 6, 60, 74], [0, 1, 1, 0], cl)} />
    <div style={{ position: "absolute", left: 0, width: 1920, top: 180, display: "flex", justifyContent: "center", transform: `scale(${1.08 - .08 * lp})`, filter: `blur(${(1 - lp) * 10}px)` }}>
      <Mark w={720} p={lp} word={wd} tag={tg} shine={shine} /></div>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}><path d="M690 780 Q960 830 1230 760 Q1290 740 1260 700" fill="none" stroke="#3b9cff" strokeWidth={3} strokeLinecap="round"
      strokeDasharray={800} strokeDashoffset={800 * (1 - sw)} opacity={interpolate(f, [104, 112, 150, 170], [0, 1, 1, 0], cl)} style={{ filter: "drop-shadow(0 0 6px #7cc4ff)" }} /></svg>
    <div style={{ position: "absolute", top: 830, width: 1920, textAlign: "center", fontFamily: F, fontWeight: 600, fontSize: 26, letterSpacing: 5, color: "#374151", opacity: kn, transform: `translateY(${(1 - kn) * 14}px)` }}>
      KNOWLEDGE • TECHNOLOGY • BUSINESS • IDEAS</div>
  </Room>;
};

const Icon: React.FC<{ bg: string; ch: React.ReactNode; s: number }> = ({ bg, ch, s }) =>
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transform: `scale(${s})` }}>
    <div style={{ width: 66, height: 66, borderRadius: 16, background: "#fff", boxShadow: "0 6px 16px rgba(0,0,0,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: bg, color: "#fff", fontFamily: F, fontWeight: 900, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>{ch}</div></div>
    <div style={{ fontFamily: F, fontSize: 13, color: "#4b5563" }}>@GetYr_io</div></div>;

const OUTRO_PATH = "M760 330 C700 300 820 250 860 300 C900 360 700 420 640 520 C580 640 760 720 900 640 C1040 560 1100 420 1000 400 C930 390 900 470 960 500";
export const FlowOutro2: React.FC = () => {
  const f = useCurrentFrame();
  const head = t(f, 18, 70);
  const lp = t(f, 62, 92), wd = t(f, 80, 98), tg = t(f, 92, 106);
  const shift = t(f, 112, 132);
  const left = t(f, 118, 140), fol = t(f, 132, 146), sub = t(f, 160, 176), bot = t(f, 168, 186);
  const icon = (i: number) => interpolate(f, [138 + i * 5, 150 + i * 5], [0, 1], { ...cl, easing: Easing.out(Easing.back(2)) });
  const cx = interpolate(f, [176, 196], [1700, 1555], { ...cl, easing: ease }), cy = interpolate(f, [176, 196], [900, 600], { ...cl, easing: ease });
  const done = f >= 202, press = f >= 198 && f < 206 ? .93 : 1;
  return <Room>
    <Trail d={OUTRO_PATH} len={2600} a={18} b={70} fadeAt={84} />
    <Orb x={760} y={330} o={interpolate(f, [0, 8, 18, 24], [0, 1, 1, 0], cl)} r={10} />
    <div style={{ position: "absolute", left: 0, width: 1920, top: 210 - shift * 0, display: "flex", justifyContent: "center", transform: `scale(${(1.08 - .08 * lp) * (1 - shift * .15)})`, filter: `blur(${(1 - lp) * 10}px)` }}>
      <Mark w={640} p={lp} word={wd} tag={tg} shine={interpolate(f, [96, 126], [-0.1, 1.1], cl)} /></div>
    <div style={{ position: "absolute", left: 150, top: 380, opacity: left, transform: `translateX(${(1 - left) * -40}px)` }}>
      <div style={{ fontFamily: F, fontWeight: 900, fontSize: 52, lineHeight: 1.1, color: "#1f2937" }}>THANK YOU<br />FOR WATCHING!</div>
      <div style={{ width: 70, height: 4, background: "#2563eb", margin: "18px 0", borderRadius: 2 }} />
      <div style={{ fontFamily: F, fontSize: 26, color: "#4b5563", lineHeight: 1.4 }}>Stay curious. Keep learning.<br />Keep growing.</div></div>
    <div style={{ position: "absolute", left: 1350, top: 360, width: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontFamily: F, fontWeight: 700, fontSize: 20, letterSpacing: 4, color: "#374151", opacity: fol }}>FOLLOW FOR MORE</div>
      <div style={{ display: "flex", gap: 18 }}>
        <Icon bg="#ff0000" ch="▶" s={icon(0)} /><Icon bg="#111" ch="𝕏" s={icon(1)} /><Icon bg="linear-gradient(45deg,#f9a825,#e91e63,#7b1fa2)" ch="◎" s={icon(2)} /><Icon bg="#229ed9" ch="➤" s={icon(3)} /></div>
      <div style={{ marginTop: 26, width: 290, height: 76, borderRadius: 14, transform: `scale(${sub * press})`, background: done ? "#6b7280" : "linear-gradient(180deg,#3b82f6,#1d4ed8)",
        boxShadow: done ? "none" : "0 0 34px rgba(37,99,235,.55)", color: "#fff", fontFamily: F, fontWeight: 800, fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 1 }}>
        {done ? "✓ SUBSCRIBED" : "SUBSCRIBE"}</div></div>
    <svg style={{ position: "absolute", left: cx, top: cy, opacity: interpolate(f, [174, 180], [0, 1], cl) }} width="46" height="54" viewBox="0 0 24 28">
      <path d="M2 2 L2 22 L7 17 L11 26 L14 25 L10 16 L17 16 Z" fill="#fff" stroke="#111" strokeWidth="1.5" /></svg>
    <div style={{ position: "absolute", top: 940, width: 1920, textAlign: "center", fontFamily: F, fontWeight: 600, fontSize: 22, letterSpacing: 5, color: "#374151", opacity: bot, lineHeight: 1.8 }}>
      LEARN • BUILD • INNOVATE • GROW<br />KNOWLEDGE • TECHNOLOGY • BUSINESS • IDEAS</div>
  </Room>;
};
