// Stick-figure story scenes for Shorts (vertical 1080x1920).
// {"type":"stick","pose":"worry|shock|happy|point|think|wave","say":"...","name":"Ravi",
//  "prop":"none|circuit","circuit":{"resistor":false,"state":"burn|ok|off","label":"9 V","meter":"20 mA"},"card":"I = V / R"}
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SANS, fade } from "./theme";
import { L, MONO } from "./lab";

const Stick: React.FC<{ x: number; y: number; pose: string; f: number; name?: string }> = ({ x, y, pose, f, name }) => {
  const bob = Math.sin(f / 6) * 6; const ink = L.text;
  const arms: Record<string, number[][]> = {
    worry: [[-60, 70], [60, 70]], shock: [[-90, -40], [90, -40]], happy: [[-80, -60], [80, -60]],
    point: [[-60, 80], [140, -10]], think: [[-50, 80], [40, -20]], wave: [[-60, 80], [90 + Math.sin(f / 4) * 20, -90]],
  };
  const [la, ra] = arms[pose] || arms.worry;
  const mouth = pose === "happy" || pose === "wave" ? `M-22 18 Q0 40 22 18` : pose === "shock" ? "" : pose === "point" ? `M-18 24 L18 24` : `M-22 32 Q0 14 22 32`;
  return <g transform={`translate(${x} ${y + bob})`}>
    <circle cx={0} cy={-170} r={70} fill={L.bg0} stroke={ink} strokeWidth={9} />
    <g transform="translate(0 -170)">
      <circle cx={-24} cy={-12} r={pose === "shock" ? 11 : 8} fill={ink} /><circle cx={24} cy={-12} r={pose === "shock" ? 11 : 8} fill={ink} />
      {pose === "shock" ? <ellipse cx={0} cy={28} rx={14} ry={18} fill={ink} /> : <path d={mouth} fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" />}
      {pose === "worry" && <><line x1={-40} y1={-34} x2={-12} y2={-26} stroke={ink} strokeWidth={6} /><line x1={40} y1={-34} x2={12} y2={-26} stroke={ink} strokeWidth={6} /></>}
      {pose === "think" && <circle cx={70} cy={-80} r={10} fill={ink} opacity={0.5} />}
    </g>
    <line x1={0} y1={-100} x2={0} y2={110} stroke={ink} strokeWidth={10} strokeLinecap="round" />
    <line x1={0} y1={-60} x2={la[0]} y2={la[1] - 60 + 60} stroke={ink} strokeWidth={10} strokeLinecap="round" />
    <line x1={0} y1={-60} x2={ra[0]} y2={ra[1]} stroke={ink} strokeWidth={10} strokeLinecap="round" />
    <line x1={0} y1={110} x2={-55} y2={250} stroke={ink} strokeWidth={10} strokeLinecap="round" />
    <line x1={0} y1={110} x2={55} y2={250} stroke={ink} strokeWidth={10} strokeLinecap="round" />
    {name && <text x={0} y={310} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={40} fontWeight={700}>{name}</text>}
  </g>;
};

const Circuit: React.FC<{ c: any; f: number; dur: number }> = ({ c, f, dur }) => {
  const burn = c.state === "burn", ok = c.state === "ok", hasR = !!c.resistor;
  const rIn = hasR ? interpolate(f, [4, 22], [-500, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const X0 = 170, X1 = 910, Y0 = 330, Y1 = 760;
  const flicker = burn ? (f % 8 < 4 ? 1 : 0.3) * interpolate(f, [0, dur * 0.5, dur * 0.6], [1, 1, 0], { extrapolateRight: "clamp" }) : 0;
  const dots = Array.from({ length: 10 }, (_, i) => { const L2 = 2 * (X1 - X0 + Y1 - Y0); const sp = burn ? 18 : ok ? 6 : 0; let d = ((i / 10) * L2 + f * sp) % L2;
    const pts: number[][] = [[X0, Y1], [X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]]; for (let k = 0; k < 4; k++) { const sl = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); if (d <= sl) return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * (d / sl), pts[k][1] + (pts[k + 1][1] - pts[k][1]) * (d / sl)]; d -= sl; } return pts[0]; });
  return <g>
    <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={L.wire} strokeWidth={10} rx={8} />
    {c.state !== "off" && dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={burn ? 16 : 11} fill={burn ? L.red : L.electron} />)}
    <g><rect x={X0 - 60} y={470} width={120} height={150} rx={14} fill={L.panel} stroke={L.text} strokeWidth={6} /><rect x={X0 - 25} y={452} width={50} height={20} fill={L.text} />
      <text x={X0} y={565} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={40} fontWeight={800}>{c.label || "9 V"}</text></g>
    <g transform={`translate(${X1} 545)`}>
      {ok && <circle r={110} fill="#ffd34d" opacity={0.35 + 0.15 * Math.sin(f / 5)} />}
      {burn && <circle r={130} fill="#ff5a3c" opacity={flicker * 0.5} />}
      <path d="M-50 40 L-50 -20 A50 50 0 0 1 50 -20 L50 40 Z" fill={burn && f > dur * 0.6 ? "#555" : ok ? "#ffe680" : "#ff8a8a"} stroke={L.text} strokeWidth={6} />
      <line x1={-25} y1={40} x2={-25} y2={90} stroke={L.text} strokeWidth={6} /><line x1={25} y1={40} x2={25} y2={90} stroke={L.text} strokeWidth={6} />
      <text x={0} y={150} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={34} fontWeight={700}>LED</text>
      {burn && f > dur * 0.55 && [0, 1, 2].map((k) => { const t = ((f - dur * 0.55) + k * 14) % 42; return <circle key={k} cx={-20 + k * 20} cy={-80 - t * 4} r={18 + t * 0.8} fill="#888" opacity={0.6 - t / 80} />; })}
    </g>
    {hasR && <g transform={`translate(${540 + rIn} ${Y0})`}><rect x={-120} y={-45} width={240} height={90} rx={30} fill="#e9d3a8" stroke="#b89a66" strokeWidth={5} />
      {["#7a4a1e", "#111", "#7a4a1e", "#c9a227"].map((col, i) => <rect key={i} x={-80 + i * 42} y={-45} width={20} height={90} fill={col} />)}
      <text x={0} y={-70} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={38} fontWeight={800}>{c.rlabel || "RESISTOR"}</text></g>}
    {c.meter && <g><rect x={360} y={820} width={360} height={100} rx={18} fill={L.panel} stroke={burn ? L.red : L.green} strokeWidth={6} />
      <text x={540} y={888} textAnchor="middle" fill={burn ? L.red : L.green} fontFamily={MONO} fontSize={52} fontWeight={800}>{c.meter}</text></g>}
  </g>;
};

export const StickScene: React.FC<any> = ({ dur, pose = "worry", say = "", name, prop = "none", circuit = {}, card }) => {
  const f = useCurrentFrame();
  const words = String(say).split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > 22) { lines.push(cur.trim()); cur = w; } else cur += " " + w; } if (cur.trim()) lines.push(cur.trim());
  const by = prop === "circuit" ? 1080 : 620;
  return <AbsoluteFill><svg viewBox="0 0 1080 1920" width="100%" height="100%">
    {prop === "circuit" && <Circuit c={circuit} f={f} dur={dur} />}
    {card && <g opacity={fade(f, 6, 10)}><rect x={140} y={prop === "circuit" ? 960 : 360} width={800} height={150} rx={24} fill={L.panel} stroke={L.amber} strokeWidth={6} />
      <text x={540} y={(prop === "circuit" ? 960 : 360) + 96} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={Math.min(64, Math.floor(740 / (String(card).length * 0.6)))} fontWeight={800}>{card}</text></g>}
    {say && <g opacity={fade(f, 2, 8)}><rect x={300} y={by + (card ? 200 : 0)} width={720} height={70 + lines.length * 62} rx={36} fill="#fff" stroke={L.text} strokeWidth={6} />
      <path d={`M380 ${by + (card ? 200 : 0) + 70 + lines.length * 62} l-60 70 l120 -70 z`} fill="#fff" stroke={L.text} strokeWidth={6} />
      {lines.map((l, i) => <text key={i} x={660} y={by + (card ? 200 : 0) + 80 + i * 62} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={50} fontWeight={800}>{l}</text>)}</g>}
    <Stick x={250} y={1560} pose={pose} f={f} name={name} />
  </svg></AbsoluteFill>;
};
