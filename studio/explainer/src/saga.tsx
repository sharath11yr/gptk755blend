// "The Human Journey" - original characters and settings for ENT story Shorts (vertical 1080x1920).
// {"type":"saga","bg":"savanna|forest|night|cave|ice|village","era":"ancestor|hunter|farmer","pose":"stand|walk|scared|brave|point|crouch",
//  "expr":"calm|fear|angry|happy|curious","name":"Aru","animal":"lion|none","fire":true,"caption":"short dramatic line"}
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SANS } from "./theme";

const SKY: Record<string, [string, string]> = { savanna: ["#f6b26b", "#fde3b0"], forest: ["#2f5d3a", "#6fa96f"], night: ["#0c1530", "#24305e"], cave: ["#2a1d17", "#4b3428"], ice: ["#a9cbe6", "#e8f3fb"], village: ["#8fc6e8", "#e9f5d9"] };

const Bg: React.FC<{ bg: string; f: number }> = ({ bg, f }) => {
  const [a, b] = SKY[bg] || SKY.savanna;
  return <g>
    <defs><linearGradient id={`sky-${bg}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
    <rect width="1080" height="1920" fill={`url(#sky-${bg})`} />
    {bg === "savanna" && <g><circle cx={760} cy={520} r={150} fill="#ffdd88" opacity={0.9} />
      <path d="M0 1180 Q270 1120 540 1170 T1080 1150 L1080 1920 L0 1920 Z" fill="#c9a24e" />
      <path d="M0 1260 Q300 1210 600 1260 T1080 1240 L1080 1920 L0 1920 Z" fill="#b08a3a" />
      <g transform="translate(840 1110)"><rect x={-12} y={-10} width={24} height={150} fill="#5b4126" /><ellipse cx={0} cy={-20} rx={170} ry={45} fill="#4f6b2c" /></g>
      {Array.from({ length: 28 }, (_, i) => <line key={i} x1={i * 40 + (i % 3) * 7} y1={1290} x2={i * 40 + 10 + Math.sin(f / 15 + i) * 6} y2={1230} stroke="#8a6d2a" strokeWidth={6} />)}</g>}
    {bg === "forest" && <g>{[80, 300, 560, 820, 1000].map((x, i) => <g key={i}><rect x={x - 25} y={500} width={50} height={900} fill="#3d2b1f" /><circle cx={x} cy={480} r={190} fill={i % 2 ? "#2e6b35" : "#3f8a44"} /></g>)}
      <rect y={1380} width={1080} height={540} fill="#3c6b2f" /></g>}
    {bg === "night" && <g>{Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 137) % 1080} cy={(i * 91) % 900} r={i % 5 ? 2.5 : 4} fill="#fff" opacity={0.5 + 0.5 * Math.sin(f / 10 + i)} />)}
      <circle cx={850} cy={300} r={70} fill="#f3f0d8" /><path d="M0 1250 Q540 1180 1080 1260 L1080 1920 L0 1920 Z" fill="#141a2a" /></g>}
    {bg === "cave" && <g><path d="M0 0 L1080 0 L1080 1920 L0 1920 Z M140 1400 Q140 500 540 420 Q940 500 940 1400 Z" fill="#1b120d" fillRule="evenodd" />
      <rect y={1380} width={1080} height={540} fill="#3a2a20" /></g>}
    {bg === "ice" && <g><path d="M0 900 L180 650 L360 880 L560 600 L760 860 L980 640 L1080 760 L1080 1920 L0 1920 Z" fill="#f4f9fd" stroke="#c7dcec" strokeWidth={6} />
      <rect y={1350} width={1080} height={570} fill="#e1edf6" />{Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 97 + f * 3) % 1080} cy={(i * 173 + f * 6) % 1920} r={5} fill="#fff" />)}</g>}
    {bg === "village" && <g><rect y={1300} width={1080} height={620} fill="#9cc56b" />
      {[200, 520, 840].map((x, i) => <g key={i}><rect x={x - 90} y={1120} width={180} height={180} fill="#c9925a" /><path d={`M${x - 120} 1130 L${x} 1000 L${x + 120} 1130 Z`} fill="#b5833a" /></g>)}</g>}
  </g>;
};

const Fire: React.FC<{ x: number; y: number; f: number }> = ({ x, y, f }) => <g transform={`translate(${x} ${y})`}>
  <circle r={260} fill="#ff9a3c" opacity={0.18 + 0.05 * Math.sin(f / 3)} />
  {[0, 1, 2].map((k) => <line key={k} x1={-70 + k * 70} y1={40} x2={70 - k * 70} y2={10} stroke="#5b3a1f" strokeWidth={22} strokeLinecap="round" />)}
  <path d={`M-60 10 Q-70 -${90 + 15 * Math.sin(f / 4)} 0 -${170 + 20 * Math.sin(f / 3)} Q70 -${90 + 15 * Math.cos(f / 4)} 60 10 Z`} fill="#ff6a1f" />
  <path d={`M-30 10 Q-30 -${60 + 10 * Math.sin(f / 2)} 0 -${110 + 15 * Math.cos(f / 3)} Q30 -60 30 10 Z`} fill="#ffd23f" />
</g>;

const Lion: React.FC<{ x: number; y: number; f: number }> = ({ x, y, f }) => {
  const step = Math.sin(f / 6) * 8;
  return <g transform={`translate(${x} ${y})`}>
    <ellipse cx={0} cy={0} rx={190} ry={85} fill="#c98a2e" />
    {[[-130, 60], [-60, 70], [60, 70], [130, 60]].map(([lx, ly], i) => <rect key={i} x={lx - 20} y={ly - 20 + (i % 2 ? step : -step)} width={40} height={110} rx={18} fill="#b5772a" />)}
    <path d="M180 -10 Q260 -60 250 30" fill="none" stroke="#b5772a" strokeWidth={18} strokeLinecap="round" /><circle cx={252} cy={34} r={18} fill="#6b3f12" />
    <circle cx={-190} cy={-50} r={120} fill="#7a4612" />
    <circle cx={-200} cy={-40} r={78} fill="#d89a3c" />
    <path d="M-245 -78 L-208 -62 M-155 -78 L-192 -62" stroke="#3b2412" strokeWidth={9} strokeLinecap="round" />
    <ellipse cx={-222} cy={-55} rx={11} ry={7} fill="#f2c94c" /><ellipse cx={-178} cy={-55} rx={11} ry={7} fill="#f2c94c" />
    <circle cx={-222} cy={-55} r={4} fill="#1b120d" /><circle cx={-178} cy={-55} r={4} fill="#1b120d" />
    <path d="M-212 -28 L-188 -28 L-200 -14 Z" fill="#3b2412" />
    <path d="M-238 0 Q-200 -6 -162 0 Q-170 50 -200 52 Q-230 50 -238 0 Z" fill="#5a1414" />
    <path d="M-230 2 L-224 24 L-218 3 Z M-182 3 L-176 24 L-170 2 Z" fill="#fff" />
  </g>;
};

// Aru: an original character whose look changes with the era
const Hero: React.FC<{ x: number; y: number; era: string; pose: string; expr: string; f: number }> = ({ x, y, era, pose, expr, f }) => {
  const skin = era === "ancestor" ? "#6b4a33" : "#a8714a"; const hair = era === "ancestor" ? "#3a2618" : "#2b1d14";
  const fur = era === "ancestor" ? null : era === "hunter" ? "#8a5a2b" : "#c7a46b";
  const walk = pose === "walk" ? Math.sin(f / 5) * 20 : 0; const crouch = pose === "crouch" || pose === "scared" ? 50 : 0;
  const lean = era === "ancestor" ? 12 : 0;
  const armR = pose === "point" ? [190, -120] : pose === "brave" ? [150, -230] : pose === "scared" ? [70, -150] : [60, 120 + walk];
  const armL = pose === "scared" ? [-70, -150] : pose === "brave" ? [-80, 60] : [-60, 120 - walk];
  const eyes = expr === "fear" ? 13 : 9;
  const mouth = expr === "happy" ? "M-26 40 Q0 64 26 40" : expr === "fear" ? "" : expr === "angry" ? "M-24 52 L24 44" : expr === "curious" ? "M-12 48 Q0 40 12 48" : "M-20 46 L20 46";
  return <g transform={`translate(${x} ${y + crouch}) rotate(${lean})`}>
    <ellipse cx={0} cy={420 - crouch} rx={140} ry={20} fill="#000" opacity={0.15} />
    <line x1={-30} y1={200} x2={-60 - walk} y2={410 - crouch} stroke={skin} strokeWidth={46} strokeLinecap="round" />
    <line x1={30} y1={200} x2={60 + walk} y2={410 - crouch} stroke={skin} strokeWidth={46} strokeLinecap="round" />
    <path d="M-85 -40 Q-95 120 -70 220 L70 220 Q95 120 85 -40 Q0 -80 -85 -40 Z" fill={skin} />
    {era === "ancestor" && <path d="M-85 -30 Q0 -70 85 -30 Q100 100 80 210 L-80 210 Q-100 100 -85 -30 Z" fill={hair} opacity={0.55} />}
    {fur && <path d="M-95 60 L95 40 L105 250 L60 230 L30 260 L0 232 L-30 262 L-60 232 L-100 255 Z" fill={fur} stroke="#5b3a1f" strokeWidth={5} />}
    {fur && era === "hunter" && <path d="M-80 -30 L60 70" stroke={fur} strokeWidth={30} />}
    <line x1={-70} y1={-10} x2={armL[0] - 20} y2={armL[1]} stroke={skin} strokeWidth={38} strokeLinecap="round" />
    <line x1={70} y1={-10} x2={armR[0] + 20} y2={armR[1]} stroke={skin} strokeWidth={38} strokeLinecap="round" />
    {era === "hunter" && <g><line x1={armR[0] + 20} y1={armR[1] + 160} x2={armR[0] + 20} y2={armR[1] - 260} stroke="#6b4a2a" strokeWidth={12} />
      <path d={`M${armR[0] + 4} ${armR[1] - 250} L${armR[0] + 20} ${armR[1] - 320} L${armR[0] + 36} ${armR[1] - 250} Z`} fill="#8d8d8d" /></g>}
    {era === "farmer" && <g><line x1={armR[0] + 20} y1={armR[1] + 140} x2={armR[0] + 20} y2={armR[1] - 160} stroke="#6b4a2a" strokeWidth={12} /><path d={`M${armR[0] + 20} ${armR[1] + 140} l60 30 l-10 -50 z`} fill="#8d8d8d" /></g>}
    <g transform="translate(0 -170)">
      <ellipse cx={0} cy={0} rx={era === "ancestor" ? 92 : 80} ry={era === "ancestor" ? 86 : 92} fill={skin} />
      <path d={era === "ancestor" ? "M-92 -10 Q-80 -110 0 -105 Q80 -110 92 -10 Q60 -60 0 -55 Q-60 -60 -92 -10 Z" : "M-84 -20 Q-90 -120 0 -112 Q90 -120 84 -20 Q70 -70 20 -78 Q-40 -60 -84 -20 Z"} fill={hair} />
      {era === "ancestor" && <ellipse cx={0} cy={40} rx={55} ry={38} fill="#8a6447" />}
      <path d="M-50 -18 L-14 -22 M50 -18 L14 -22" stroke={hair} strokeWidth={10} strokeLinecap="round" transform={expr === "angry" ? "rotate(8)" : ""} />
      <circle cx={-32} cy={4} r={eyes} fill="#1b120d" /><circle cx={32} cy={4} r={eyes} fill="#1b120d" />
      <circle cx={-29} cy={0} r={3} fill="#fff" /><circle cx={35} cy={0} r={3} fill="#fff" />
      {expr === "fear" ? <ellipse cx={0} cy={50} rx={14} ry={20} fill="#3b2412" /> : <path d={mouth} fill={expr === "happy" ? "#3b2412" : "none"} stroke="#3b2412" strokeWidth={7} strokeLinecap="round" />}
      {expr === "fear" && <path d="M70 -60 q10 20 0 30 q-10 -10 0 -30" fill="#7fc6ff" />}
    </g>
  </g>;
};

export const SagaScene: React.FC<any> = ({ dur, bg = "savanna", era = "hunter", pose = "stand", expr = "calm", name, animal = "none", fire = false, caption, partcard }) => {
  const f = useCurrentFrame();
  const lionX = interpolate(f, [0, dur * 0.7], [1400, 820], { extrapolateRight: "clamp" });
  return <AbsoluteFill><svg viewBox="0 0 1080 1920" width="100%" height="100%">
    <Bg bg={bg} f={f} />
    {fire && <Fire x={760} y={1500} f={f} />}
    {animal === "lion" && <Lion x={lionX} y={1420} f={f} />}
    <Hero x={animal === "lion" ? 330 : 420} y={1100} era={era} pose={pose} expr={expr} f={f} />
    {name && <text x={animal === "lion" ? 330 : 420} y={1620} textAnchor="middle" fill="#fff" stroke="#000" strokeWidth={2} fontFamily={SANS} fontSize={44} fontWeight={800}>{name}</text>}
    {caption && <g opacity={interpolate(f, [4, 14], [0, 1], { extrapolateRight: "clamp" })}><rect x={60} y={180} width={960} height={190} rx={28} fill="#000" opacity={0.55} />
      <text x={540} y={295} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={Math.min(64, Math.floor(900 / (String(caption).length * 0.5)))} fontWeight={900}>{caption}</text></g>}
    {partcard && <g><rect x={240} y={1700} width={600} height={110} rx={20} fill="#e63946" /><text x={540} y={1773} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={52} fontWeight={900}>{partcard}</text></g>}
  </svg></AbsoluteFill>;
};
