// Numericals: a circuit drawn from a parts list (left) + the solution appearing step by step (right).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SANS, fade } from "./theme";
import { L, MONO } from "./lab";

type Part = { t: string; a: number[]; b: number[]; label?: string; value?: string; plus?: "a" | "b"; hi?: boolean };
// grid: x 0..10, y 0..6 (y down). Element types: w (wire), R, V (circle source, + at "plus" end, default b), I (current source, arrow a→b),
// L, C, dv / di (dependent voltage / current source, diamond), open (gap), sw (switch).
const GX = (x: number, W: number) => 70 + (x / 10) * (W - 140), GY = (y: number) => 230 + (y / 6) * 620;
const Elem: React.FC<{ p: Part; W: number }> = ({ p, W }) => {
  const [x1, y1, x2, y2] = [GX(p.a[0], W), GY(p.a[1]), GX(p.b[0], W), GY(p.b[1])];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const h = 52; const col = p.hi ? L.amber : L.text; const wc = L.wire;
  const lead = <><line x1={x1} y1={y1} x2={mx - ux * h} y2={my - uy * h} stroke={wc} strokeWidth={5} /><line x1={mx + ux * h} y1={my + uy * h} x2={x2} y2={y2} stroke={wc} strokeWidth={5} /></>;
  const vert = Math.abs(uy) > 0.7; const lx = mx + (vert ? 66 : 0), ly = my + (vert ? 8 : -62);
  const txt = (p.label || p.value) && <g><text x={lx} y={ly} textAnchor={vert ? "start" : "middle"} fill={col} fontFamily={MONO} fontSize={26} fontWeight={800}>{p.label}</text>
    {p.value && <text x={lx} y={ly + 30} textAnchor={vert ? "start" : "middle"} fill={L.dim} fontFamily={MONO} fontSize={24} fontWeight={700}>{p.value}</text>}</g>;
  const P = (t: number, s = 0) => `${mx + ux * t + nx * s},${my + uy * t + ny * s}`;
  if (p.t === "w") return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={wc} strokeWidth={5} />;
  if (p.t === "arr") { const ax = x1 + dx * 0.62, ay = y1 + dy * 0.62; return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={wc} strokeWidth={5} />
    <polygon points={`${ax + ux * 22},${ay + uy * 22} ${ax - ux * 10 + nx * 14},${ay - uy * 10 + ny * 14} ${ax - ux * 10 - nx * 14},${ay - uy * 10 - ny * 14}`} fill={p.hi ? L.amber : L.cyan} />
    <text x={ax + nx * (Math.abs(uy) > 0.7 ? 80 : 44)} y={ay + ny * 44 + 10} textAnchor="middle" fill={p.hi ? L.amber : L.cyan} fontFamily={MONO} fontSize={28} fontWeight={800}>{p.label}</text></g>; }
  if (p.t === "open") return <g><line x1={x1} y1={y1} x2={mx - ux * 30} y2={my - uy * 30} stroke={wc} strokeWidth={5} /><line x1={mx + ux * 30} y1={my + uy * 30} x2={x2} y2={y2} stroke={wc} strokeWidth={5} />
    <circle cx={mx - ux * 30} cy={my - uy * 30} r={7} fill={L.text} /><circle cx={mx + ux * 30} cy={my + uy * 30} r={7} fill={L.text} />{txt}</g>;
  if (p.t === "sw") return <g><line x1={x1} y1={y1} x2={mx - ux * 30} y2={my - uy * 30} stroke={wc} strokeWidth={5} /><line x1={mx + ux * 30} y1={my + uy * 30} x2={x2} y2={y2} stroke={wc} strokeWidth={5} />
    <line x1={mx - ux * 30} y1={my - uy * 30} x2={mx + ux * 26 + nx * 26} y2={my + uy * 26 + ny * 26} stroke={col} strokeWidth={5} /><circle cx={mx - ux * 30} cy={my - uy * 30} r={7} fill={L.text} /><circle cx={mx + ux * 30} cy={my + uy * 30} r={7} fill={L.text} />{txt}</g>;
  let body: React.ReactNode = null;
  if (p.t === "R") body = <polyline points={[P(-h), ...Array.from({ length: 6 }, (_, i) => P(-h + ((i + 0.5) * 2 * h) / 6, i % 2 ? -16 : 16)), P(h)].join(" ")} fill="none" stroke={p.hi ? L.amber : "#d9822b"} strokeWidth={5} strokeLinejoin="round" />;
  if (p.t === "L") body = <g>{[0, 1, 2, 3].map((i) => <path key={i} d={`M${P(-h + i * 26, 0)} A13 13 0 0 1 ${P(-h + (i + 1) * 26, 0)}`} fill="none" stroke={col} strokeWidth={5} transform="" />)}</g>;
  if (p.t === "C") body = <g><line x1={mx - ux * 10 + nx * 26} y1={my - uy * 10 + ny * 26} x2={mx - ux * 10 - nx * 26} y2={my - uy * 10 - ny * 26} stroke={col} strokeWidth={6} />
    <line x1={mx + ux * 10 + nx * 26} y1={my + uy * 10 + ny * 26} x2={mx + ux * 10 - nx * 26} y2={my + uy * 10 - ny * 26} stroke={col} strokeWidth={6} />
    <line x1={mx - ux * h} y1={my - uy * h} x2={mx - ux * 10} y2={my - uy * 10} stroke={wc} strokeWidth={5} /><line x1={mx + ux * 10} y1={my + uy * 10} x2={mx + ux * h} y2={my + uy * h} stroke={wc} strokeWidth={5} /></g>;
  if (p.t === "V" || p.t === "I") { const plusB = (p.plus || "b") === "b";
    body = <g><circle cx={mx} cy={my} r={40} fill={L.bg0} stroke={col} strokeWidth={5} />
      {p.t === "V" ? <><text x={mx + ux * (plusB ? 18 : -18)} y={my + uy * (plusB ? 18 : -18) + 10} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={30} fontWeight={800}>+</text>
        <text x={mx - ux * (plusB ? 18 : -18)} y={my - uy * (plusB ? 18 : -18) + 10} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={30} fontWeight={800}>−</text></>
      : <><line x1={mx - ux * 24} y1={my - uy * 24} x2={mx + ux * 18} y2={my + uy * 18} stroke={col} strokeWidth={5} /><polygon points={`${mx + ux * 28},${my + uy * 28} ${mx + ux * 10 + nx * 11},${my + uy * 10 + ny * 11} ${mx + ux * 10 - nx * 11},${my + uy * 10 - ny * 11}`} fill={col} /></>}</g>; }
  if (p.t === "dv" || p.t === "di") body = <g><polygon points={`${P(-40)} ${P(0, 40)} ${P(40)} ${P(0, -40)}`} fill={L.bg0} stroke={col} strokeWidth={5} />
    {p.t === "dv" ? <text x={mx} y={my + 10} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>±</text>
      : <><line x1={mx - ux * 20} y1={my - uy * 20} x2={mx + ux * 14} y2={my + uy * 14} stroke={col} strokeWidth={4} /><polygon points={`${mx + ux * 22},${my + uy * 22} ${mx + ux * 8 + nx * 9},${my + uy * 8 + ny * 9} ${mx + ux * 8 - nx * 9},${my + uy * 8 - ny * 9}`} fill={col} /></>}</g>;
  return <g>{lead}{body}{txt}</g>;
};

export const SolveScene: React.FC<any> = ({ dur, title = "", circuit = [], nodes = [], given = [], steps = [], answer = "", ask = "", stage = "solve" }) => {
  const f = useCurrentFrame(); const W = 1060;
  const lines: string[] = stage === "problem" ? [] : steps;
  const per = (dur * 0.78) / Math.max(1, lines.length + (answer ? 1 : 0));
  const fsz = Math.min(34, Math.floor(820 / (Math.max(10, ...lines.map((x) => x.length), answer.length) * 0.6)));
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <text x={W / 2} y={170} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={30} fontWeight={800} letterSpacing={3}>{title.toUpperCase()}</text>
    {circuit.map((p: Part, i: number) => <Elem key={i} p={p} W={W} />)}
    {nodes.map((n: any, i: number) => <g key={"n" + i}><circle cx={GX(n.at[0], W)} cy={GY(n.at[1])} r={10} fill={n.c === "g" ? L.green : L.text} />
      {n.label && <text x={GX(n.at[0], W) + (n.dx ?? 0)} y={GY(n.at[1]) + (n.dy ?? -26)} textAnchor="middle" fill={n.c === "g" ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={800}>{n.label}</text>}</g>)}
    {nodes.filter((n: any) => n.ground).map((n: any, i: number) => { const x = GX(n.at[0], W), y = GY(n.at[1]); return <g key={"g" + i}><line x1={x} y1={y} x2={x} y2={y + 30} stroke={L.wire} strokeWidth={5} />{[0, 1, 2].map((k) => <line key={k} x1={x - 30 + k * 9} y1={y + 30 + k * 11} x2={x + 30 - k * 9} y2={y + 30 + k * 11} stroke={L.text} strokeWidth={4} />)}</g>; })}
    <rect x={1080} y={110} width={810} height={900} rx={22} fill={L.panel} stroke={L.grid2 || L.dim} strokeWidth={2} />
    {stage === "problem" ? <g>
        <text x={1110} y={180} fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>GIVEN</text>
        {given.map((g: string, i: number) => <text key={i} x={1110} y={240 + i * 54} fill={L.text} fontFamily={MONO} fontSize={Math.min(32, Math.floor(760 / (Math.max(...given.map((x: string) => x.length)) * 0.6)))} fontWeight={700} opacity={fade(f, 8 + i * 10, 8)}>{g}</text>)}
        <text x={1110} y={300 + given.length * 54} fill={L.green} fontFamily={MONO} fontSize={30} fontWeight={800} opacity={fade(f, 20 + given.length * 10, 8)}>FIND</text>
        {String(ask).split("\n").map((a, i) => <text key={i} x={1110} y={360 + given.length * 54 + i * 50} fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700} opacity={fade(f, 28 + given.length * 10, 8)}>{a}</text>)}
      </g> : <g>
        {lines.map((s, i) => <text key={i} x={1110} y={180 + i * Math.min(70, 760 / Math.max(1, lines.length))} fill={s.startsWith("✓") ? L.green : s.startsWith("!") ? L.red : s.startsWith("Step") || s.startsWith("Shortcut") || s.startsWith("Check") ? L.cyan : L.text} fontFamily={MONO} fontSize={fsz} fontWeight={700} opacity={fade(f, 6 + i * per, 8)}>{s.replace(/^!/, "⚠ ")}</text>)}
        {answer && <g opacity={fade(f, 6 + lines.length * per, 10)}><rect x={1100} y={900} width={770} height={86} rx={16} fill={L.bg0} stroke={L.green} strokeWidth={5} />
          <text x={1485} y={956} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={Math.min(36, Math.floor(740 / (answer.length * 0.6)))} fontWeight={800}>{answer}</text></g>}
      </g>}
  </svg></AbsoluteFill>;
};
