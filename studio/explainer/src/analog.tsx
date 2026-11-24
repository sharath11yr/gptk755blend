// Analog Electronics one-shot - Chapter 1 animations (basics).
// Every number shown is computed from the circuit values, so the picture is always physically right.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SANS, fade, prog } from "./theme";
import { L, MONO } from "./lab";

const useU = () => { const { width, height } = useVideoConfig(); return { u: Math.min(width, height) / 1080 }; };
const fmt = (v: number, unit: string) => {
  const a = Math.abs(v);
  if (unit === "A" && a < 1) return `${+(v * 1000).toFixed(a < 0.01 ? 2 : 1)} mA`;
  if (unit === "Ω" && a >= 1e6) return `${+(v / 1e6).toFixed(2)} MΩ`;
  if (unit === "Ω" && a >= 1e3) return `${+(v / 1e3).toFixed(2)} kΩ`;
  return `${+v.toFixed(a < 10 ? 2 : 1)} ${unit}`;
};

/** dots moving along a closed polyline; speed ~ current (conventional current follows the points,
 * electrons move the other way) */
const Dots: React.FC<{ pts: number[][]; t: number; speed: number; color?: string; gap?: number; r?: number }> = ({ pts, t, speed, color, gap = 40, r = 7 }) => {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const len = seg.reduce((a, b) => a + b, 0); if (!len) return null;
  const at = (d: number) => { let k = 0; while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
    const q = Math.min(1, d / (seg[k] || 1)); return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * q, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * q]; };
  const n = Math.floor(len / gap); const off = ((t * speed) % len + len) % len;
  return <g>{Array.from({ length: n }, (_, i) => { const [x, y] = at((len - ((i * gap + off) % len)) % len);
    return <circle key={i} cx={x} cy={y} r={r} fill={color || L.electron} stroke={L.bg0} strokeWidth={1.5} />; })}</g>;
};

const Battery: React.FC<{ x: number; y: number; v: number; vertical?: boolean }> = ({ x, y, v }) => (
  <g>
    <rect x={x - 46} y={y - 40} width={92} height={80} fill={L.bg0} />
    <line x1={x - 40} y1={y - 12} x2={x + 40} y2={y - 12} stroke={L.text} strokeWidth={7} />
    <line x1={x - 22} y1={y + 12} x2={x + 22} y2={y + 12} stroke={L.text} strokeWidth={12} />
    <text x={x + 56} y={y - 6} fill={L.red} fontFamily={MONO} fontSize={30} fontWeight={700}>+</text>
    <text x={x + 56} y={y + 30} fill={L.cyan} fontFamily={MONO} fontSize={30} fontWeight={700}>−</text>
    <text x={x - 60} y={y + 10} textAnchor="end" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>{fmt(v, "V")}</text>
  </g>
);
const Res: React.FC<{ x: number; y: number; ohm: number; label: string; heat?: number; horizontal?: boolean }> = ({ x, y, ohm, label, heat = 0, horizontal }) => {
  const zz = Array.from({ length: 7 }, (_, i) => horizontal ? `${x - 60 + (i + 1) * 15},${y + (i % 2 ? 20 : -20)}` : `${x + (i % 2 ? 20 : -20)},${y - 60 + (i + 1) * 15}`).join(" ");
  const ends = horizontal ? `${x - 70},${y} ${x - 60},${y} ${zz} ${x + 60},${y} ${x + 70},${y}` : `${x},${y - 70} ${x},${y - 60} ${zz} ${x},${y + 60} ${x},${y + 70}`;
  return <g>
    <rect x={x - (horizontal ? 72 : 34)} y={y - (horizontal ? 34 : 72)} width={horizontal ? 144 : 68} height={horizontal ? 68 : 144} fill={L.bg0} />
    {heat > 0 && <circle cx={x} cy={y} r={80} fill={L.red} opacity={0.08 + 0.25 * Math.min(1, heat)} />}
    <polyline points={ends} fill="none" stroke={L.amber} strokeWidth={6} strokeLinejoin="round" />
    <text x={horizontal ? x : x + 44} y={horizontal ? y - 40 : y - 6} textAnchor={horizontal ? "middle" : "start"} fill={L.text} fontFamily={MONO} fontSize={26} fontWeight={700}>{label}</text>
    <text x={horizontal ? x : x + 44} y={horizontal ? y + 62 : y + 24} textAnchor={horizontal ? "middle" : "start"} fill={L.dim} fontFamily={MONO} fontSize={24}>{fmt(ohm, "Ω")}</text>
  </g>;
};
const Meter: React.FC<{ x: number; y: number; kind: "A" | "V"; value: number }> = ({ x, y, kind, value }) => (
  <g><rect x={x - 90} y={y - 34} width={180} height={68} rx={12} fill={L.panel} stroke={kind === "A" ? L.cyan : L.green} strokeWidth={4} />
    <text x={x} y={y + 11} textAnchor="middle" fill={kind === "A" ? L.cyan : L.green} fontFamily={MONO} fontSize={30} fontWeight={700}>{fmt(value, kind)}</text></g>
);

/** DC circuit, series or parallel, with live meters.
 *  {"mode": "series"|"parallel", "v": 12, "v_to": 24 (optional sweep), "r": [100, 200], "show": ["current","voltage","heat"]} */
export const DCCircuit: React.FC<any> = ({ dur, mode = "series", v = 12, v_to, r = [100], show = ["current"] }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const V = v_to !== undefined ? interpolate(f, [dur * 0.15, dur * 0.85], [v, v_to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : v;
  const R: number[] = r.length ? r : [100];
  const Rt = mode === "series" ? R.reduce((a, b) => a + b, 0) : 1 / R.reduce((a, b) => a + 1 / b, 0);
  const I = V / Rt; const speed = 40 + I * 2500;
  const L0 = 200, R0 = 1250, T = 150, B = 650;
  const showV = show.includes("voltage"), heat = show.includes("heat");
  return (
    <AbsoluteFill style={{ opacity: fade(f, 0) }}>
      <svg viewBox="0 0 1600 800" width="100%" height="100%">
        {mode === "series" ? <>
          <polyline points={`${L0},400 ${L0},${T} ${R0},${T} ${R0},${B} ${L0},${B} ${L0},400`} fill="none" stroke={L.wire} strokeWidth={6} />
          <Dots pts={[[L0, 400], [L0, T], [R0, T], [R0, B], [L0, B], [L0, 400]]} t={f / 30} speed={speed} />
          <Battery x={L0} y={400} v={V} />
          {R.map((ri, i) => { const x = L0 + (R0 - L0) * (i + 1) / (R.length + 1); const vr = I * ri;
            return <g key={i}><Res x={x} y={T} ohm={ri} label={`R${i + 1}`} heat={heat ? (I * I * ri) / 2 : 0} horizontal />
              {showV && <Meter x={x} y={T + 110} kind="V" value={vr} />}</g>; })}
          {show.includes("current") && <Meter x={(L0 + R0) / 2} y={B} kind="A" value={I} />}
        </> : <>
          <polyline points={`${L0},400 ${L0},${T} ${R0},${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
          <polyline points={`${L0},400 ${L0},${B} ${R0},${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
          {R.map((ri, i) => { const x = 520 + i * (R0 - 520) / Math.max(1, R.length - 1 || 1) * (R.length > 1 ? 1 : 0) + (R.length === 1 ? 300 : 0);
            const Ii = V / ri; const bx = R.length === 1 ? 820 : 520 + i * ((R0 - 520) / (R.length - 1));
            return <g key={i}><line x1={bx} y1={T} x2={bx} y2={B} stroke={L.wire} strokeWidth={6} />
              <Dots pts={[[bx, T], [bx, B]]} t={f / 30} speed={40 + Ii * 2500} />
              <Res x={bx} y={400} ohm={ri} label={`R${i + 1}`} heat={heat ? (Ii * Ii * ri) / 2 : 0} />
              {show.includes("current") && <Meter x={bx} y={T + 70} kind="A" value={Ii} />}</g>; })}
          <Dots pts={[[L0, 400], [L0, T], [R0, T]]} t={f / 30} speed={speed} />
          <Dots pts={[[R0, B], [L0, B], [L0, 400]]} t={f / 30} speed={speed} />
          <Battery x={L0} y={400} v={V} />
          {show.includes("current") && <Meter x={L0 + 170} y={B + 70} kind="A" value={I} />}
        </>}
      </svg>
      <div style={{ position: "absolute", right: 50 * u, top: 40 * u, fontFamily: MONO, color: L.text, fontSize: 30 * u, textAlign: "right", lineHeight: 1.5,
        background: L.panel, padding: `${12 * u}px ${20 * u}px`, borderRadius: 12 * u, border: `${2 * u}px solid ${L.off}` }}>
        <div>R<sub>total</sub> = <b>{fmt(Rt, "Ω")}</b></div>
        <div>I = V ÷ R = <b style={{ color: L.cyan }}>{fmt(I, "A")}</b></div>
        {heat && <div>P = V × I = <b style={{ color: L.red }}>{fmt(V * I, "W")}</b></div>}
      </div>
      <div style={{ position: "absolute", left: 50 * u, bottom: 40 * u, fontFamily: MONO, color: L.electron, fontSize: 22 * u }}>● electrons (they move from − to +)</div>
    </AbsoluteFill>
  );
};

/** Zoom inside a wire / resistor: free electrons drifting between atoms, bumping more in a resistor.
 *  {"mode": "wire"|"resistor"|"no-voltage"} */
export const InsideWire: React.FC<any> = ({ dur, mode = "wire" }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const atoms = Array.from({ length: 5 * 11 }, (_, i) => [180 + (i % 11) * 125, 240 + Math.floor(i / 11) * 85]);
  const dense = mode === "resistor"; const ins = mode === "insulator";
  const drift = mode === "no-voltage" || ins ? 0 : dense ? 1.2 : 4.2;
  const rnd = (i: number, k: number) => Math.sin(i * 12.9898 + k * 78.233) * 43758.5453 % 1;
  return (
    <AbsoluteFill style={{ opacity: fade(f, 0) }}>
      <svg viewBox="0 0 1600 800" width="100%" height="100%">
        <rect x={100} y={190} width={1400} height={420} rx={40} fill={dense ? `${L.amber}18` : `${L.cyan}10`} stroke={dense ? L.amber : L.wire} strokeWidth={5} />
        {atoms.map(([x, y], i) => <g key={i}><circle cx={x + (dense ? Math.sin(f * 0.6 + i) * 4 : Math.sin(f * 0.2 + i) * 1.5)} cy={y} r={dense ? 26 : 20} fill={L.off} />
          <text x={x} y={y + 8} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>+</text></g>)}
        {!ins && Array.from({ length: 70 }, (_, i) => {
          const baseX = 120 + Math.abs(rnd(i, 1)) * 1360, baseY = 210 + Math.abs(rnd(i, 2)) * 380;
          const jitX = Math.sin(f * 0.35 + i * 1.7) * (dense ? 26 : 14), jitY = Math.cos(f * 0.31 + i * 2.3) * (dense ? 26 : 14);
          const x = 120 + ((baseX - 120 + f * drift) % 1360);
          return <circle key={i} cx={x + jitX} cy={baseY + jitY} r={8} fill={L.electron} />;
        })}
        {mode !== "no-voltage" && !ins && <g><text x={800} y={690} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>
          {dense ? "more collisions → slower drift → heat" : "electrons drift →  (current flows ←)"}</text></g>}
        {ins && atoms.map(([x, y], i) => <circle key={"b" + i} cx={x + Math.cos(f * 0.25 + i) * 30} cy={y + Math.sin(f * 0.25 + i) * 30} r={7} fill={L.electron} />)}
        {ins && <text x={800} y={690} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>insulator: every electron is held by its atom → no current</text>}
        {mode === "no-voltage" && <text x={800} y={690} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>no voltage → random motion, no net flow</text>}
      </svg>
    </AbsoluteFill>
  );
};

/** Ohm's law graph: V-I line drawn live for one or two resistors. {"r": [100, 200], "vmax": 12} */
export const OhmGraph: React.FC<any> = ({ dur, r = [100], vmax = 12 }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const p = prog(f, 10, dur * 0.8); const V = vmax * p;
  const imax = vmax / Math.min(...r); const X = (v: number) => 220 + (v / vmax) * 1100, Y = (i: number) => 680 - (i / imax) * 480;
  const cols = [L.cyan, L.amber, L.green];
  return (
    <AbsoluteFill style={{ opacity: fade(f, 0) }}>
      <svg viewBox="0 0 1600 800" width="100%" height="100%">
        <line x1={220} y1={680} x2={1360} y2={680} stroke={L.text} strokeWidth={4} /><line x1={220} y1={680} x2={220} y2={160} stroke={L.text} strokeWidth={4} />
        <text x={1370} y={690} fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>V</text>
        <text x={200} y={150} textAnchor="end" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>I</text>
        {Array.from({ length: 7 }, (_, k) => <text key={k} x={X(vmax * k / 6)} y={720} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{+(vmax * k / 6).toFixed(1)}</text>)}
        {r.map((ri: number, i: number) => <g key={i}>
          <line x1={X(0)} y1={Y(0)} x2={X(V)} y2={Y(V / ri)} stroke={cols[i % 3]} strokeWidth={7} strokeLinecap="round" />
          <circle cx={X(V)} cy={Y(V / ri)} r={12} fill={cols[i % 3]} />
          <text x={X(V) + 18} y={Y(V / ri) - 12} fill={cols[i % 3]} fontFamily={MONO} fontSize={26} fontWeight={700}>{fmt(ri, "Ω")}: {fmt(V / ri, "A")}</text></g>)}
      </svg>
      <div style={{ position: "absolute", right: 80 * u, top: 90 * u, fontFamily: SANS, fontWeight: 800, fontSize: 44 * u, color: L.text }}>
        V = {V.toFixed(1)} V</div>
    </AbsoluteFill>
  );
};

/** Worked numerical: given values, then lines appear one by one, last line highlighted.
 *  {"title": "Example", "given": ["V = 12 V", "R = 4 Ω"], "lines": ["I = V ÷ R", "I = 12 ÷ 4", "I = 3 A"]} */
export const Numerical: React.FC<any> = ({ dur, title = "SOLVED EXAMPLE", given = [], lines = [] }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const per = (dur * 0.75) / Math.max(1, lines.length);
  return (
    <AbsoluteFill style={{ padding: "9% 12%", opacity: fade(f, 0) }}>
      <div style={{ fontFamily: MONO, color: L.amber, fontSize: 30 * u, letterSpacing: 5 * u, fontWeight: 700 }}>{title}</div>
      <div style={{ display: "flex", gap: 28 * u, marginTop: 24 * u, flexWrap: "wrap" }}>
        {given.map((g: string, i: number) => <div key={i} style={{ fontFamily: MONO, fontSize: 34 * u, color: L.text, border: `${2 * u}px solid ${L.cyan}`, borderRadius: 10 * u,
          padding: `${8 * u}px ${18 * u}px`, opacity: fade(f, 6 + i * 6) }}>{g}</div>)}
      </div>
      <div style={{ marginTop: 40 * u }}>
        {lines.map((ln: string, i: number) => <div key={i} style={{ fontFamily: MONO, fontSize: 48 * u, marginTop: 14 * u, fontWeight: i === lines.length - 1 ? 800 : 500,
          color: i === lines.length - 1 ? L.green : L.text, opacity: fade(f, 20 + i * per, 8) }}>{ln}</div>)}
      </div>
    </AbsoluteFill>
  );
};

/** An atom: nucleus + electrons in shells; "free": the outer electron leaves (copper's free electron).
 *  {"element": "copper"|"hydrogen"|"silicon", "free": true} */
export const AtomScene: React.FC<any> = ({ dur, element = "copper", free = false }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const shells: number[] = element === "hydrogen" ? [1] : element === "silicon" ? [2, 8, 4] : [2, 8, 18, 1];
  const Z = shells.reduce((a, b) => a + b, 0); const cx = 800, cy = 400;
  return (
    <AbsoluteFill style={{ opacity: fade(f, 0) }}>
      <svg viewBox="0 0 1600 800" width="100%" height="100%">
        <circle cx={cx} cy={cy} r={58} fill={L.red} opacity={0.85} />
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={30} fontWeight={700}>+{Z}</text>
        {shells.map((n, k) => { const R = 110 + k * 70; const last = k === shells.length - 1;
          return <g key={k}><circle cx={cx} cy={cy} r={R} fill="none" stroke={L.off} strokeWidth={3} strokeDasharray="8 8" />
            {Array.from({ length: n }, (_, j) => {
              const a = (j / n) * Math.PI * 2 + f * (0.05 - k * 0.008);
              let x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
              if (free && last) { const p = prog(f, dur * 0.35, dur * 0.75); x += p * 520; y -= p * 120; }
              return <circle key={j} cx={x} cy={y} r={11} fill={free && last ? L.amber : L.electron} stroke={L.bg0} strokeWidth={2} />;
            })}</g>; })}
        <text x={cx} y={760} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>
          {element.toUpperCase()} ATOM · {Z} proton{Z > 1 ? "s" : ""} (+) · {Z} electron{Z > 1 ? "s" : ""} (−)</text>
        {free && <text x={1330} y={230} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={700} opacity={fade(f, dur * 0.6)}>free electron</text>}
      </svg>
    </AbsoluteFill>
  );
};

/** Water analogy: two tanks at different heights joined by a pipe (height = voltage, flow = current,
 *  narrow pipe = resistance). {"high": 0.8, "low": 0.2, "narrow": false} */
export const WaterTank: React.FC<any> = ({ dur, high = 0.8, low = 0.2, narrow = false }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const diff = Math.max(0, high - low); const speed = diff * (narrow ? 1.2 : 4);
  const pw = narrow ? 14 : 44;
  return (
    <AbsoluteFill style={{ opacity: fade(f, 0) }}>
      <svg viewBox="0 0 1600 800" width="100%" height="100%">
        <rect x={180} y={120} width={300} height={520} fill="none" stroke={L.wire} strokeWidth={6} />
        <rect x={183} y={120 + 520 * (1 - high)} width={294} height={520 * high} fill={L.cyan} opacity={0.35} />
        <rect x={1120} y={120} width={300} height={520} fill="none" stroke={L.wire} strokeWidth={6} />
        <rect x={1123} y={120 + 520 * (1 - low)} width={294} height={520 * low} fill={L.cyan} opacity={0.35} />
        <rect x={480} y={620 - pw} width={640} height={pw} fill={L.cyan} opacity={0.25} stroke={L.wire} strokeWidth={4} />
        {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={480 + ((i * 46 + f * speed * 3) % 640)} cy={620 - pw / 2} r={Math.min(9, pw / 3)} fill={L.electron} />)}
        {diff > 0.02 ? <><line x1={540} y1={120 + 520 * (1 - high)} x2={540} y2={120 + 520 * (1 - low)} stroke={L.amber} strokeWidth={5} />
          <text x={560} y={(240 + 520 * (2 - high - low)) / 2} fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={700}>height difference = VOLTAGE</text></>
          : <text x={800} y={300} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={700}>same level → no difference → NO FLOW</text>}
        <text x={800} y={700} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>
          {diff > 0.02 ? "water flow = CURRENT" : "no current"}{narrow ? "   ·   narrow pipe = RESISTANCE" : ""}</text>
      </svg>
    </AbsoluteFill>
  );
};

/** Real-world example values as bars that grow one by one (log scale, so 1.5 V and 765,000 V both fit).
 *  {"title": "Voltages around you", "unit": "V", "items": [["AA cell", 1.5], ["Phone battery", 3.7], ...]} */
export const ValueBars: React.FC<any> = ({ dur, title = "", unit = "", items = [] }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const vals = items.map((it: any[]) => +it[1]); const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.log10(hi) - Math.log10(lo) || 1; const per = (dur * 0.7) / Math.max(1, items.length);
  const W = (v: number) => 0.1 + 0.62 * (span > 0.01 ? (Math.log10(v) - Math.log10(lo)) / span : 1);
  const cols = [L.cyan, L.green, L.amber, L.red, "#7b5cff", "#d6336c"];
  const show = (v: number) => (v >= 1000 ? v.toLocaleString("en-US") : String(v));
  return (
    <AbsoluteFill style={{ padding: "11% 8% 8%", opacity: fade(f, 0) }}>
      {title && <div style={{ fontFamily: MONO, color: L.cyan, fontSize: 32 * u, letterSpacing: 4 * u, fontWeight: 700, marginBottom: 30 * u }}>{title.toUpperCase()}</div>}
      {items.map(([name, v]: any[], i: number) => { const p = prog(f, 8 + i * per, 8 + i * per + 18);
        return <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 * u, marginTop: 20 * u, opacity: fade(f, 8 + i * per, 6) }}>
          <div style={{ width: 340 * u, fontFamily: SANS, fontWeight: 700, fontSize: 34 * u, color: L.text, textAlign: "right" }}>{name}</div>
          <div style={{ flex: 1, height: 52 * u, position: "relative" }}>
            <div style={{ width: `${W(+v) * p * 100}%`, height: "100%", borderRadius: 10 * u, background: cols[i % cols.length] }} />
            <div style={{ position: "absolute", left: `calc(${W(+v) * p * 100}% + ${14 * u}px)`, top: 6 * u, whiteSpace: "nowrap", fontFamily: MONO, fontWeight: 700, fontSize: 32 * u, color: L.text }}>
              {show(+v)} {unit}</div>
          </div>
        </div>; })}
    </AbsoluteFill>
  );
};


// ------------------------------------------------------------------ the resistor up close
// {"mode":"bands","bands":["brown","black","red","gold"]}  colour code decoded band by band
// {"mode":"cutaway"}  layers revealed: leads, caps, ceramic core, carbon film, spiral cut, coating
// {"mode":"pot","r":10000}  potentiometer: wiper sweeps, resistance and lamp brightness change
const BAND: Record<string, [string, number, string]> = {
  black: ["#111", 0, ""], brown: ["#7a4a1e", 1, "±1%"], red: ["#d32f2f", 2, "±2%"], orange: ["#f57c00", 3, ""],
  yellow: ["#fbc02d", 4, ""], green: ["#2e7d32", 5, "±0.5%"], blue: ["#1565c0", 6, "±0.25%"], violet: ["#7b1fa2", 7, "±0.1%"],
  grey: ["#8a8a8a", 8, ""], white: ["#f5f5f5", 9, ""], gold: ["#c9a227", -1, "±5%"], silver: ["#bfc5cc", -2, "±10%"] };
const ohmText = (v: number) => v >= 1e6 ? `${+(v / 1e6).toFixed(2)} MΩ` : v >= 1e3 ? `${+(v / 1e3).toFixed(2)} kΩ` : `${+v.toFixed(2)} Ω`;
export const ResistorScene: React.FC<any> = ({ dur, mode = "bands", bands = ["brown", "black", "red", "gold"], r = 10000 }) => {
  const f = useCurrentFrame(); const { u } = useU();
  const W = 1920, H = 1080, cx = 960, cy = 470;
  const body = (k: number) => <g>
    <line x1={cx - 620} y1={cy} x2={cx - 330} y2={cy} stroke="#9aa3ad" strokeWidth={14} strokeLinecap="round" />
    <line x1={cx + 330} y1={cy} x2={cx + 620} y2={cy} stroke="#9aa3ad" strokeWidth={14} strokeLinecap="round" />
    <path d={`M${cx - 340} ${cy - 95} q-40 0 -40 95 q0 95 40 95 h680 q40 0 40 -95 q0 -95 -40 -95 z`} fill="#e9d3a8" stroke="#b89a66" strokeWidth={4} opacity={k} /></g>;
  if (mode === "bands") {
    const n = bands.length; const per = (dur * 0.8) / n; const cur = Math.min(n - 1, Math.floor(f / per));
    const tol = bands[n - 1]; const mult = bands[n - 2]; const digits = bands.slice(0, n - 2);
    const val = digits.reduce((a: number, b: string) => a * 10 + BAND[b][1], 0) * Math.pow(10, BAND[mult][1]);
    const xs = bands.map((_: any, i: number) => i < n - 1 ? cx - 230 + i * 110 : cx + 220);
    const roles = bands.map((_: any, i: number) => i < n - 2 ? `digit ${i + 1}` : i === n - 2 ? "multiplier" : "tolerance");
    const done = f > dur * 0.82;
    return <AbsoluteFill><svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {body(1)}
      {bands.map((b: string, i: number) => <rect key={i} x={xs[i] - 26} y={cy - 98} width={52} height={196} fill={BAND[b][0]} stroke={i === cur && !done ? L.accent || L.cyan : "none"} strokeWidth={8} opacity={fade(f, i * per, 8)} />)}
      {bands.map((b: string, i: number) => { const o = fade(f, i * per + 6, 10);
        const txt = i < n - 2 ? `${BAND[b][1]}` : i === n - 2 ? `× ${Math.pow(10, BAND[b][1]).toLocaleString("en-US")}` : BAND[b][2];
        return <g key={"t" + i} opacity={o}>
          <line x1={xs[i]} y1={cy + 110} x2={xs[i]} y2={cy + 190} stroke={L.dim} strokeWidth={3} />
          <text x={xs[i]} y={cy + 230} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>{b}</text>
          <text x={xs[i]} y={cy + 272} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={34} fontWeight={700}>{txt}</text>
          <text x={xs[i]} y={cy - 130} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{roles[i]}</text></g>; })}
      <g opacity={fade(f, dur * 0.82, 12)}><rect x={cx - 360} y={cy + 320} width={720} height={100} rx={18} fill={L.panel} stroke={L.green} strokeWidth={4} />
        <text x={cx} y={cy + 385} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={46} fontWeight={800}>{ohmText(val)}  {BAND[tol][2]}</text></g>
    </svg></AbsoluteFill>;
  }
  if (mode === "cutaway") {
    const parts: [string, number][] = [["Metal leads", 0], ["End caps", 0.14], ["Ceramic core (insulator)", 0.28], ["Carbon film (the resistance)", 0.44], ["Spiral cut sets the value", 0.6], ["Protective coating", 0.76]];
    const k = (i: number) => fade(f, parts[i][1] * dur, 12);
    const spiral = Array.from({ length: 9 }, (_, i) => `M${cx - 260 + i * 62} ${cy - 70} l40 140`).join(" ");
    return <AbsoluteFill><svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <g opacity={k(0)}><line x1={cx - 620} y1={cy} x2={cx - 300} y2={cy} stroke="#9aa3ad" strokeWidth={14} strokeLinecap="round" /><line x1={cx + 300} y1={cy} x2={cx + 620} y2={cy} stroke="#9aa3ad" strokeWidth={14} strokeLinecap="round" /></g>
      <g opacity={k(1)}><rect x={cx - 330} y={cy - 85} width={50} height={170} rx={10} fill="#b8c0c8" /><rect x={cx + 280} y={cy - 85} width={50} height={170} rx={10} fill="#b8c0c8" /></g>
      <rect x={cx - 280} y={cy - 70} width={560} height={140} fill="#f4f1ea" stroke="#cfc8b8" strokeWidth={3} opacity={k(2)} />
      <rect x={cx - 280} y={cy - 70} width={560} height={140} fill="#3a3a3a" opacity={k(3) * 0.85} />
      <path d={spiral} stroke="#f4f1ea" strokeWidth={10} opacity={k(4)} strokeDasharray={160} strokeDashoffset={160 * (1 - k(4))} />
      <path d={`M${cx - 340} ${cy - 95} q-40 0 -40 95 q0 95 40 95 h680 q40 0 40 -95 q0 -95 -40 -95 z`} fill="#e9d3a8" opacity={k(5) * 0.55} stroke="#b89a66" strokeWidth={4} />
      {parts.map(([t], i) => <text key={i} x={i % 2 ? cx + 380 : cx - 380} y={cy + 170 + Math.floor(i / 2) * 56} textAnchor={i % 2 ? "start" : "end"} opacity={k(i)} fill={i === parts.findIndex((_, j) => f < (parts[j + 1]?.[1] ?? 2) * dur) ? L.cyan : L.text} fontFamily={SANS} fontSize={32} fontWeight={600}>{t}</text>)}
    </svg></AbsoluteFill>;
  }
  // pot
  const p = interpolate(f, [dur * 0.1, dur * 0.45, dur * 0.8], [0.1, 0.9, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const Rnow = 100 + p * r; const I = 9 / (Rnow + 100); const bright = Math.min(1, I / (9 / 200));
  const ang = -135 + p * 270;
  return <AbsoluteFill><svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
    <path d={`M${560 + 220 * Math.cos(-225 * Math.PI / 180)} ${470 + 220 * Math.sin(-225 * Math.PI / 180)} A220 220 0 1 1 ${560 + 220 * Math.cos(45 * Math.PI / 180)} ${470 + 220 * Math.sin(45 * Math.PI / 180)}`} fill="none" stroke="#3a3a3a" strokeWidth={46} />
    <circle cx={560} cy={470} r={120} fill={L.panel} stroke={L.dim} strokeWidth={4} />
    <line x1={560} y1={470} x2={560 + 230 * Math.cos((ang - 90) * Math.PI / 180)} y2={470 + 230 * Math.sin((ang - 90) * Math.PI / 180)} stroke={L.amber} strokeWidth={14} strokeLinecap="round" />
    <text x={560} y={760} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30}>turn the knob → the wiper slides on the track</text>
    <rect x={980} y={300} width={560} height={110} rx={16} fill={L.panel} stroke={L.cyan} strokeWidth={4} />
    <text x={1260} y={372} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={46} fontWeight={800}>R = {ohmText(Rnow)}</text>
    <circle cx={1260} cy={620} r={110} fill={`rgba(255,200,60,${0.12 + 0.88 * bright})`} stroke={L.dim} strokeWidth={4} style={{ filter: `drop-shadow(0 0 ${60 * bright}px rgba(255,190,40,.9))` }} />
    <text x={1260} y={790} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30}>lamp brightness</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ RC charging / discharging, live graph
// {"mode":"charge"|"discharge"|"both","v":10,"r":1000,"c":0.001}  (tau = R*C seconds, shown as 5 tau)
export const RCScene: React.FC<any> = ({ dur, mode = "charge", v = 10, r = 1000, c = 0.001, lamp = false }) => {
  const f = useCurrentFrame();
  const tau = r * c; const T = 5 * tau;
  const p = interpolate(f, [dur * 0.08, dur * 0.92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const both = mode === "both"; const disch = mode === "discharge" || (both && p > 0.5);
  const tt = (both ? (p > 0.5 ? (p - 0.5) * 2 : p * 2) : p) * T;
  const vc = disch ? v * Math.exp(-tt / tau) : v * (1 - Math.exp(-tt / tau));
  const i = (disch ? -1 : 1) * (v / r) * Math.exp(-tt / tau);
  const X0 = 1000, Y0 = 820, GW = 760, GH = 520;
  const pts = (seg: "c" | "d", upto: number) => Array.from({ length: 60 }, (_, k) => { const t = (k / 59) * upto;
    const y = seg === "c" ? 1 - Math.exp(-t / tau) : Math.exp(-t / tau); return t; }).map((t) => {
    const frac = both ? (seg === "c" ? t / T / 2 : 0.5 + t / T / 2) : t / T;
    const y = seg === "c" ? 1 - Math.exp(-t / tau) : Math.exp(-t / tau);
    return `${X0 + frac * GW},${Y0 - y * GH}`; }).join(" ");
  const cUp = both ? (p > 0.5 ? T : tt) : (disch ? 0 : tt); const dUp = disch ? tt : 0;
  const sp = 30 + Math.abs(i) / (v / r) * 260;
  const loop = disch ? [[200, 300], [700, 300], [700, 760], [200, 760], [200, 300]] : [[200, 300], [700, 300], [700, 760], [200, 760], [200, 300]];
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
    <Dots pts={disch ? loop.slice().reverse() : loop} t={f / 30} speed={sp} />
    {!disch && <Battery x={200} y={530} v={v} />}
    {disch && <g><rect x={150} y={480} width={100} height={100} fill={L.bg0} /><text x={200} y={540} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={26}>{lamp ? "lamp" : "wire"}</text>
      {lamp && <circle cx={200} cy={530} r={44} fill={`rgba(255,200,60,${Math.min(1, Math.abs(i) / (v / r))})`} stroke={L.dim} strokeWidth={3} />}</g>}
    <Res x={450} y={300} ohm={r} label="R" horizontal />
    <g><rect x={640} y={500} width={120} height={70} fill={L.bg0} /><line x1={650} y1={520} x2={750} y2={520} stroke={L.amber} strokeWidth={9} /><line x1={650} y1={550} x2={750} y2={550} stroke={L.amber} strokeWidth={9} />
      <text x={770} y={545} fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>C</text></g>
    <Meter x={450} y={880} kind="V" value={vc} /><text x={450} y={950} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>capacitor voltage</text>
    <Meter x={450} y={160} kind="A" value={Math.abs(i)} />
    <line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - GH - 30} stroke={L.dim} strokeWidth={3} />
    <text x={X0 + GW} y={Y0 + 44} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>time →</text>
    <text x={X0 - 14} y={Y0 - GH} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>{v} V</text>
    <line x1={X0} y1={Y0 - GH} x2={X0 + GW} y2={Y0 - GH} stroke={L.dim} strokeDasharray="8 8" strokeWidth={2} />
    {!(both) && <g opacity={0.9}><line x1={X0 + GW / 5} y1={Y0} x2={X0 + GW / 5} y2={Y0 - GH * (disch ? 0.37 : 0.63)} stroke={L.green} strokeDasharray="6 6" strokeWidth={3} />
      <text x={X0 + GW / 5 + 10} y={Y0 - GH * (disch ? 0.37 : 0.63) - 12} fill={L.green} fontFamily={MONO} fontSize={26} fontWeight={700}>1τ: {disch ? "37%" : "63%"}</text></g>}
    {cUp > 0 && <polyline points={pts("c", cUp)} fill="none" stroke={L.cyan} strokeWidth={6} />}
    {dUp > 0 && <polyline points={pts("d", dUp)} fill="none" stroke={L.amber} strokeWidth={6} />}
    <text x={X0 + GW / 2} y={Y0 - GH - 50} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>τ = R × C = {+tau.toFixed(3)} s</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ what decides capacitance: C = εA/d
// phases: area grows, gap shrinks, dielectric slides in; C bar shows the effect
export const CapGeom: React.FC<any> = ({ dur }) => {
  const f = useCurrentFrame();
  const ph = (a: number, b: number) => interpolate(f, [dur * a, dur * b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const A = 1 + ph(0.05, 0.3); const d = 1 - 0.5 * ph(0.38, 0.62); const er = 1 + 3 * ph(0.7, 0.92);
  const C = (er * A) / d; const w = 300 * A, gap = 260 * d;
  const cx = 700, cy = 540;
  const label = f < dur * 0.34 ? "Bigger plate area A → more C" : f < dur * 0.66 ? "Smaller gap d → more C" : "Dielectric (ε) between plates → more C";
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <rect x={cx - w} y={cy - gap / 2 - 24} width={2 * w} height={24} rx={6} fill={L.amber} />
    <rect x={cx - w} y={cy + gap / 2} width={2 * w} height={24} rx={6} fill={L.amber} />
    <rect x={cx - w + (1 - ph(0.7, 0.92)) * 2 * w * -1.2} y={cy - gap / 2 + 6} width={2 * w} height={gap - 12} fill={L.cyan} opacity={0.18 * Math.min(1, ph(0.7, 0.75) * 5)} />
    {Array.from({ length: 8 }, (_, k) => <line key={k} x1={cx - w + (k + 0.5) * (2 * w / 8)} y1={cy - gap / 2 + 4} x2={cx - w + (k + 0.5) * (2 * w / 8)} y2={cy + gap / 2 - 4} stroke={L.red} strokeWidth={2} strokeDasharray="6 8" opacity={0.6} />)}
    <text x={cx} y={190} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={40} fontWeight={700}>{label}</text>
    <text x={1500} y={300} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={30}>capacitance</text>
    <rect x={1440} y={340} width={120} height={500} rx={10} fill="none" stroke={L.dim} strokeWidth={4} />
    <rect x={1446} y={834 - Math.min(488, C * 30)} width={108} height={Math.min(488, C * 30)} rx={8} fill={L.green} />
    <text x={1500} y={890} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={36} fontWeight={800}>× {C.toFixed(1)}</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ coil + moving magnet (Faraday & Lenz)
// {"mode":"magnet"}: magnet pushed in, held, pulled out; galvanometer swings one way, zero, other way
// {"mode":"field","i":1}: current through a coil, field loops grow with current
export const CoilScene: React.FC<any> = ({ dur, mode = "magnet" }) => {
  const f = useCurrentFrame();
  const cx = 860, cy = 470;
  const turns = Array.from({ length: 9 }, (_, k) => <ellipse key={k} cx={cx - 240 + k * 60} cy={cy} rx={26} ry={130} fill="none" stroke={L.amber} strokeWidth={9} />);
  if (mode === "field") {
    const I = interpolate(f, [dur * 0.1, dur * 0.5, dur * 0.75, dur * 0.95], [0, 1, 1, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      {[1, 2, 3, 4].map((k) => <ellipse key={k} cx={cx} cy={cy} rx={330 + k * 70} ry={150 + k * 70} fill="none" stroke={L.cyan} strokeWidth={4} strokeDasharray="14 12" strokeDashoffset={-f * 2} opacity={Math.max(0, I * 1.2 - k * 0.2)} />)}
      <line x1={cx - 300} y1={cy} x2={cx + 300} y2={cy} stroke={L.cyan} strokeWidth={6} opacity={I} markerEnd="" />
      {turns}
      <text x={cx + 340} y={cy - 6} fill={L.cyan} fontFamily={MONO} fontSize={30} fontWeight={700} opacity={I}>N</text>
      <text x={cx - 370} y={cy - 6} fill={L.red} fontFamily={MONO} fontSize={30} fontWeight={700} opacity={I}>S</text>
      <rect x={1500} y={380} width={300} height={100} rx={14} fill={L.panel} stroke={L.amber} strokeWidth={4} />
      <text x={1650} y={445} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={40} fontWeight={800}>I = {(I * 2).toFixed(1)} A</text>
      <text x={cx} y={900} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={32}>more current → stronger magnetic field (stored energy)</text>
    </svg></AbsoluteFill>;
  }
  const pos = interpolate(f, [dur * 0.05, dur * 0.3, dur * 0.55, dur * 0.8], [-1, 0, 0, -1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vel = interpolate(f, [dur * 0.05, dur * 0.3, dur * 0.31, dur * 0.55, dur * 0.56, dur * 0.8, dur * 0.81], [1, 1, 0, 0, -1, -1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mx = cx - 900 + (pos + 1) * 760;
  const ang = vel * 45;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {turns}
    <g><rect x={mx - 170} y={cy - 50} width={170} height={100} fill={L.red} rx={8} /><rect x={mx} y={cy - 50} width={170} height={100} fill={L.cyan} rx={8} />
      <text x={mx - 85} y={cy + 14} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={44} fontWeight={800}>S</text>
      <text x={mx + 85} y={cy + 14} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={44} fontWeight={800}>N</text></g>
    <polyline points={`${cx - 240},${cy + 130} ${cx - 240},${cy + 280} ${1500},${cy + 280} ${1500},${cy + 200}`} fill="none" stroke={L.wire} strokeWidth={5} />
    <polyline points={`${cx + 240},${cy - 130} ${cx + 240},${cy - 220} ${1640},${cy - 220} ${1640},${cy + 60}`} fill="none" stroke={L.wire} strokeWidth={5} />
    <circle cx={1570} cy={cy + 120} r={130} fill={L.panel} stroke={L.dim} strokeWidth={4} />
    <line x1={1570} y1={cy + 190} x2={1570 + 120 * Math.sin(ang * Math.PI / 180)} y2={cy + 190 - 120 * Math.cos(ang * Math.PI / 180)} stroke={L.red} strokeWidth={8} strokeLinecap="round" />
    <text x={1570} y={cy + 300} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>meter</text>
    <text x={cx} y={150} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={40} fontWeight={700}>{vel > 0 ? "Magnet moving IN → current flows" : vel < 0 ? "Magnet moving OUT → current flows the other way" : "Magnet not moving → no current"}</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ RL circuit: current builds slowly; opening the switch makes a spark
// {"mode":"on"|"off","v":10,"r":10,"l":10}  tau = L/R
export const RLScene: React.FC<any> = ({ dur, mode = "on", v = 10, r = 10, l = 10 }) => {
  const f = useCurrentFrame();
  const tau = l / r; const T = 5 * tau; const Imax = v / r;
  const p = interpolate(f, [dur * 0.1, dur * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = p * T; const on = mode === "on";
  const I = on ? Imax * (1 - Math.exp(-t / tau)) : Imax * Math.exp(-t * 6 / tau);
  const spark = !on && f > dur * 0.1 && f < dur * 0.22;
  const loop = [[200, 300], [700, 300], [700, 760], [200, 760], [200, 300]];
  const X0 = 1000, Y0 = 820, GW = 760, GH = 520;
  const curve = Array.from({ length: 60 }, (_, k) => { const tt = (k / 59) * t; const y = on ? 1 - Math.exp(-tt / tau) : Math.exp(-tt * 6 / tau);
    return `${X0 + (tt / T) * GW},${Y0 - y * GH}`; }).join(" ");
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
    {I > 0.02 && <Dots pts={loop} t={f / 30} speed={40 + (I / Imax) * 260} />}
    <Battery x={200} y={530} v={v} />
    <Res x={450} y={300} ohm={r} label="R" horizontal />
    <g><rect x={650} y={430} width={100} height={200} fill={L.bg0} />
      {Array.from({ length: 5 }, (_, k) => <path key={k} d={`M700 ${445 + k * 36} a22 18 0 1 1 0 36`} fill="none" stroke={L.amber} strokeWidth={7} />)}
      <text x={770} y={540} fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>L</text>
      {[1, 2].map((k) => <ellipse key={k} cx={700} cy={530} rx={60 + k * 30} ry={120 + k * 30} fill="none" stroke={L.cyan} strokeWidth={3} strokeDasharray="10 10" opacity={(I / Imax) * (1 - k * 0.3)} />)}</g>
    <g><rect x={420} y={730} width={120} height={60} fill={L.bg0} /><circle cx={430} cy={760} r={8} fill={L.text} /><circle cx={530} cy={760} r={8} fill={L.text} />
      <line x1={430} y1={760} x2={on || f < dur * 0.1 ? 530 : 515} y2={on || f < dur * 0.1 ? 760 : 700} stroke={L.text} strokeWidth={7} />
      {spark && <g>{[0, 1, 2, 3, 4].map((k) => <line key={k} x1={520} y1={735} x2={520 + 40 * Math.cos(k * 1.3 + f)} y2={735 + 40 * Math.sin(k * 1.3 + f)} stroke="#ffd23f" strokeWidth={5} />)}
        <circle cx={520} cy={735} r={22} fill="#fff6c2" opacity={0.9} /></g>}
      <text x={480} y={840} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>switch</text></g>
    <Meter x={450} y={160} kind="A" value={I} />
    <line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - GH - 30} stroke={L.dim} strokeWidth={3} />
    <text x={X0 + GW} y={Y0 + 44} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>time →</text>
    <text x={X0 - 14} y={Y0 - GH} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>{+Imax.toFixed(2)} A</text>
    <line x1={X0} y1={Y0 - GH} x2={X0 + GW} y2={Y0 - GH} stroke={L.dim} strokeDasharray="8 8" strokeWidth={2} />
    {on && <g><line x1={X0 + GW / 5} y1={Y0} x2={X0 + GW / 5} y2={Y0 - GH * 0.63} stroke={L.green} strokeDasharray="6 6" strokeWidth={3} />
      <text x={X0 + GW / 5 + 10} y={Y0 - GH * 0.63 - 12} fill={L.green} fontFamily={MONO} fontSize={26} fontWeight={700}>1τ: 63%</text></g>}
    {t > 0 && <polyline points={curve} fill="none" stroke={on ? L.cyan : L.red} strokeWidth={6} />}
    <text x={X0 + GW / 2} y={Y0 - GH - 50} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>{on ? `current  ·  τ = L / R = ${+tau.toFixed(2)} s` : "switch opened → current collapses → spark"}</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ sources under a changing load
// {"mode":"ideal-v"|"practical-v"|"ideal-i"|"practical-i","v":12,"ri":2,"i":2,"rp":50}
// load resistance sweeps from big to small; meters + V-I graph show how the source behaves
export const SourceScene: React.FC<any> = ({ dur, mode = "practical-v", v = 12, ri = 2, i = 2, rp = 50 }) => {
  const f = useCurrentFrame();
  const pp = interpolate(f, [dur * 0.08, dur * 0.88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); const RL = 100 * Math.pow(0.02, pp);
  const isV = mode.endsWith("-v"); const prac = mode.startsWith("practical");
  const calc = (R: number) => { if (isV) { const r0 = prac ? ri : 0; const I = v / (R + r0); return [I * R, I]; }
    const Rp = prac ? rp : 1e12; const Rt = (R * Rp) / (R + Rp); const V = i * Rt; return [V, V / R]; };
  const [Vt, It] = calc(RL);
  const X0 = 1050, Y0 = 820, GW = 720, GH = 520; const Vmax = Math.max(calc(100)[0], calc(2)[0]) * 1.15; const Imax = Math.max(calc(100)[1], calc(2)[1]) * 1.15;
  const path = Array.from({ length: 50 }, (_, k) => { const R = 100 * Math.pow(0.02, (k / 49) * pp); const [a, b] = calc(R); return `${X0 + (b / Imax) * GW},${Y0 - Math.min(1, a / Vmax) * GH}`; }).join(" ");
  const loop = [[220, 300], [700, 300], [700, 760], [220, 760], [220, 300]];
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
    <Dots pts={loop} t={f / 30} speed={40 + Math.min(1, It / Imax) * 300} />
    <g><circle cx={220} cy={530} r={70} fill={L.bg0} stroke={L.text} strokeWidth={6} />
      {isV ? <><text x={220} y={512} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={40} fontWeight={800}>+</text><text x={220} y={572} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={40} fontWeight={800}>−</text></>
        : <><line x1={220} y1={580} x2={220} y2={482} stroke={L.text} strokeWidth={6} /><path d="M200 500 L220 470 L240 500 Z" fill={L.text} /></>}
      <text x={110} y={540} textAnchor="end" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>{isV ? `${v} V` : `${i} A`}</text></g>
    {prac && isV && <Res x={460} y={300} ohm={ri} label="internal r" horizontal />}
    {prac && !isV && <g><polyline points="220,300 380,300 380,460" fill="none" stroke={L.wire} strokeWidth={6} /><polyline points="380,600 380,760" fill="none" stroke={L.wire} strokeWidth={6} /><Res x={380} y={530} ohm={rp} label="r (parallel)" /></g>}
    <Res x={700} y={530} ohm={RL} label="LOAD" />
    <Meter x={460} y={880} kind="V" value={Vt} /><text x={460} y={950} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>voltage at the load</text>
    <Meter x={460} y={160} kind="A" value={It} />
    <line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - GH - 30} stroke={L.dim} strokeWidth={3} />
    <text x={X0 + GW} y={Y0 + 44} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>current →</text>
    <text x={X0 - 14} y={Y0 - GH - 10} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>V ↑</text>
    <polyline points={path} fill="none" stroke={L.cyan} strokeWidth={6} />
    <text x={X0 + GW / 2} y={Y0 - GH - 50} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>load: {RL.toFixed(1)} Ω (getting smaller)</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ circuit vocabulary on one example circuit
// {"mode":"nodes"|"branches"|"loops"|"meshes"|"open"|"short"}
export const NetScene: React.FC<any> = ({ dur, mode = "nodes" }) => {
  const f = useCurrentFrame();
  const A = [360, 260], B = [960, 260], C = [1560, 260], D = [960, 800];
  const wire = (pts: number[][], hi = false, col?: string) => <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke={hi ? (col || L.cyan) : L.wire} strokeWidth={hi ? 12 : 6} strokeLinejoin="round" opacity={hi ? 0.9 : 1} />;
  const br: Record<string, number[][]> = { V: [[360, 260], [360, 800], [960, 800]], R1: [[360, 260], [960, 260]], R2: [[960, 260], [960, 800]], R3: [[960, 260], [1560, 260]], R4: [[1560, 260], [1560, 800], [960, 800]] };
  const keys = Object.keys(br);
  const steps = mode === "nodes" ? 4 : mode === "branches" ? 5 : mode === "loops" ? 3 : mode === "meshes" ? 2 : 1;
  const k = Math.min(steps - 1, Math.floor(interpolate(f, [dur * 0.08, dur * 0.9], [0, steps], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const loops = [["V", "R1", "R2"], ["R2", "R3", "R4"], ["V", "R1", "R3", "R4"]];
  const hiSet = mode === "branches" ? [keys[k]] : mode === "loops" || mode === "meshes" ? loops[k] : [];
  const nodes: [number[], string, boolean][] = [[A, "A", false], [B, "B", true], [C, "C", false], [D, "D (whole bottom wire)", true]];
  const open = mode === "open", short = mode === "short";
  const label = mode === "nodes" ? `Node ${nodes[k][1]}${nodes[k][2] ? " · essential node (3 or more branches meet)" : ""}`
    : mode === "branches" ? `Branch ${k + 1} of 5: ${keys[k] === "V" ? "the source" : keys[k]}`
    : mode === "loops" ? `Loop ${k + 1} of 3${k === 2 ? " (outer loop: not a mesh, it has R2 inside)" : ""}`
    : mode === "meshes" ? `Mesh ${k + 1} of 2: a loop with nothing inside it`
    : open ? "OPEN circuit: a break → current = 0, full voltage across the gap" : "SHORT circuit: a plain wire across R2 → voltage = 0, current takes the wire";
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {(mode === "meshes") && <rect x={k === 0 ? 380 : 980} y={280} width={560} height={500} fill={L.cyan} opacity={0.12} />}
    {keys.map((key) => wire(br[key]))}
    {hiSet.map((key) => wire(br[key], true, mode === "loops" ? L.amber : L.cyan))}
    <Battery x={360} y={530} v={12} />
    <Res x={660} y={260} ohm={4} label="R1" horizontal /><Res x={1260} y={260} ohm={6} label="R3" horizontal />
    {open ? <g><rect x={920} y={460} width={80} height={140} fill={L.bg0} /><circle cx={960} cy={470} r={9} fill={L.text} /><circle cx={960} cy={590} r={9} fill={L.text} />
      <text x={1000} y={540} fill={L.red} fontFamily={MONO} fontSize={30} fontWeight={700}>gap: I = 0</text></g>
      : <Res x={960} y={530} ohm={3} label="R2" />}
    {short && <g><polyline points="960,400 880,400 880,660 960,660" fill="none" stroke={L.red} strokeWidth={10} /><text x={860} y={540} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={30} fontWeight={700}>short: V = 0</text></g>}
    <Res x={1560} y={530} ohm={6} label="R4" />
    {mode === "nodes" && nodes.map(([q, n, ess], i) => <g key={i} opacity={i <= k ? 1 : 0.25}>
      {i === 3 ? <line x1={360} y1={800} x2={1560} y2={800} stroke={L.green} strokeWidth={i === k ? 16 : 10} opacity={0.7} /> : <circle cx={q[0]} cy={q[1]} r={i === k ? 26 : 18} fill={ess ? L.green : L.amber} />}
      <text x={i === 3 ? 960 : q[0]} y={i === 3 ? 860 : q[1] - 40} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={34} fontWeight={800}>{n.split(" ")[0]}</text></g>)}
    <text x={960} y={150} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={40} fontWeight={700}>{label}</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ KCL at a node: {"currents":[5,3,-2,-6]} (+ = into the node)
export const KclScene: React.FC<any> = ({ dur, currents = [5, 3, -2, -6], unknown = -1 }) => {
  const f = useCurrentFrame();
  const cx = 760, cy = 520, R = 380;
  const angs = currents.map((_: number, k: number) => (k / currents.length) * Math.PI * 2 - Math.PI / 2 + 0.4);
  const ins = currents.filter((c: number) => c > 0), outs = currents.filter((c: number) => c < 0).map((c: number) => -c);
  const rev = (k: number) => fade(f, dur * 0.12 + k * dur * 0.1, 10);
  const sumIn = ins.reduce((a: number, b: number) => a + b, 0), sumOut = outs.reduce((a: number, b: number) => a + b, 0);
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {currents.map((c: number, k: number) => { const x = cx + R * Math.cos(angs[k]), y = cy + R * Math.sin(angs[k]);
      const pts = c > 0 ? [[x, y], [cx, cy]] : [[cx, cy], [x, y]];
      const mx = (x + cx) / 2, my = (y + cy) / 2; const isU = k === unknown;
      return <g key={k} opacity={0.25 + 0.75 * rev(k)}>
        <line x1={x} y1={y} x2={cx} y2={cy} stroke={L.wire} strokeWidth={8} />
        <Dots pts={pts} t={f / 30} speed={30 + Math.abs(c) * 40} color={c > 0 ? L.cyan : L.amber} gap={34} />
        <rect x={mx - 110 + 70 * Math.sin(angs[k])} y={my - 34 - 50 * Math.cos(angs[k])} width={220} height={68} rx={12} fill={L.panel} stroke={c > 0 ? L.cyan : L.amber} strokeWidth={4} />
        <text x={mx + 70 * Math.sin(angs[k])} y={my + 12 - 50 * Math.cos(angs[k])} textAnchor="middle" fill={c > 0 ? L.cyan : L.amber} fontFamily={MONO} fontSize={32} fontWeight={800}>{isU && f < dur * 0.8 ? "I = ?" : `${Math.abs(c)} A ${c > 0 ? "in" : "out"}`}</text></g>; })}
    <circle cx={cx} cy={cy} r={30} fill={L.green} />
    <text x={cx} y={cy + 80} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>node</text>
    <g opacity={fade(f, dur * (unknown >= 0 ? 0.82 : 0.6), 12)}>
      <rect x={1300} y={340} width={520} height={330} rx={18} fill={L.panel} stroke={L.green} strokeWidth={4} />
      <text x={1560} y={420} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={36} fontWeight={700}>In:  {ins.join(" + ")} = {sumIn} A</text>
      <text x={1560} y={500} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={36} fontWeight={700}>Out: {outs.join(" + ")} = {sumOut} A</text>
      <text x={1560} y={600} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={40} fontWeight={800}>In = Out</text></g>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ KVL walk around a loop: {"v":12,"r":[100,200,300]}
export const KvlScene: React.FC<any> = ({ dur, v = 12, r = [100, 200, 300] }) => {
  const f = useCurrentFrame();
  const I = v / r.reduce((a: number, b: number) => a + b, 0);
  const drops = r.map((x: number) => +(I * x).toFixed(2));
  const loop = [[300, 820], [300, 260], [1400, 260], [1400, 820], [300, 820]];
  const seg = loop.slice(1).map((q, i) => Math.hypot(q[0] - loop[i][0], q[1] - loop[i][1])); const len = seg.reduce((a, b) => a + b, 0);
  const p = interpolate(f, [dur * 0.06, dur * 0.82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let d = p * len, k = 0; while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
  const q = Math.min(1, d / seg[k]); const mx = loop[k][0] + (loop[k + 1][0] - loop[k][0]) * q, my = loop[k][1] + (loop[k + 1][1] - loop[k][1]) * q;
  const rx = r.map((_: number, i: number) => 300 + (1100 * (i + 1)) / (r.length + 1));
  const passed = (x: number) => (k >= 1 && mx >= x) || k >= 2;
  const items: [string, number, boolean][] = [[`battery  +${v} V`, v, k >= 1 || my < 530], ...r.map((_: number, i: number) => [`R${i + 1}  −${drops[i]} V`, -drops[i], passed(rx[i])] as [string, number, boolean])];
  const total = items.filter((it) => it[2]).reduce((a, it) => a + it[1], 0);
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <polyline points={loop.map((z) => z.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
    <Battery x={300} y={540} v={v} />
    {r.map((x: number, i: number) => <g key={i}><Res x={rx[i]} y={260} ohm={x} label={`R${i + 1}`} horizontal />
      <text x={rx[i]} y={360} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={700}>{drops[i]} V</text></g>)}
    <circle cx={mx} cy={my} r={22} fill={L.green} stroke="#fff" strokeWidth={4} />
    <rect x={1500} y={240} width={360} height={110 + items.length * 60} rx={18} fill={L.panel} stroke={L.green} strokeWidth={4} />
    {items.map((it, i) => <text key={i} x={1530} y={300 + i * 60} fill={it[2] ? (it[1] > 0 ? L.cyan : L.amber) : L.dim} opacity={it[2] ? 1 : 0.35} fontFamily={MONO} fontSize={30} fontWeight={700}>{it[0]}</text>)}
    <text x={1530} y={320 + items.length * 60} fill={L.green} fontFamily={MONO} fontSize={34} fontWeight={800}>sum = {+total.toFixed(2)} V</text>
    <text x={850} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30}>walk around the loop: rises (+) and drops (−) add up to zero</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ source transformation: V-source + series R  <->  I-source + parallel R
// {"vs":12,"r":4,"rl":[8,2,20]} the same loads are connected to both; meters match exactly
export const SrcTxScene: React.FC<any> = ({ dur, vs = 12, r = 4, rl = [8, 2, 20], dir = "v2i" }) => {
  const f = useCurrentFrame();
  const is = vs / r;
  const k = Math.min(rl.length - 1, Math.floor(interpolate(f, [dur * 0.3, dur * 0.95], [0, rl.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const RL = rl[k]; const I = vs / (r + RL); const V = I * RL;
  const show2 = fade(f, dur * 0.15, 14);
  const left = (ox: number) => { const loop = [[ox + 120, 300], [ox + 600, 300], [ox + 600, 760], [ox + 120, 760], [ox + 120, 300]];
    return <g><polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
      <Dots pts={loop} t={f / 30} speed={60 + I * 40} />
      <g><circle cx={ox + 120} cy={530} r={60} fill={L.bg0} stroke={L.text} strokeWidth={6} /><text x={ox + 120} y={515} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={34} fontWeight={800}>+</text><text x={ox + 120} y={570} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={34} fontWeight={800}>−</text>
        <text x={ox + 40} y={540} textAnchor="end" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>{vs} V</text></g>
      <Res x={ox + 360} y={300} ohm={r} label="R (series)" horizontal />
      <Res x={ox + 600} y={530} ohm={RL} label="LOAD" />
      <Meter x={ox + 360} y={860} kind="A" value={I} /><Meter x={ox + 360} y={950} kind="V" value={V} /></g>; };
  const right = (ox: number) => { const loop = [[ox + 120, 300], [ox + 600, 300], [ox + 600, 760], [ox + 120, 760], [ox + 120, 300]];
    return <g opacity={show2}><polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
      <polyline points={`${ox + 330},300 ${ox + 330},460`} fill="none" stroke={L.wire} strokeWidth={6} /><polyline points={`${ox + 330},600 ${ox + 330},760`} fill="none" stroke={L.wire} strokeWidth={6} />
      <Dots pts={[[ox + 330, 300], [ox + 600, 300], [ox + 600, 760], [ox + 330, 760]]} t={f / 30} speed={60 + I * 40} />
      <g><circle cx={ox + 120} cy={530} r={60} fill={L.bg0} stroke={L.text} strokeWidth={6} /><line x1={ox + 120} y1={572} x2={ox + 120} y2={492} stroke={L.text} strokeWidth={6} /><path d={`M${ox + 102} ${510} L${ox + 120} ${480} L${ox + 138} ${510} Z`} fill={L.text} />
        <text x={ox + 40} y={540} textAnchor="end" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>{+is.toFixed(2)} A</text></g>
      <Res x={ox + 330} y={530} ohm={r} label="R (parallel)" />
      <Res x={ox + 600} y={530} ohm={RL} label="LOAD" />
      <Meter x={ox + 360} y={860} kind="A" value={I} /><Meter x={ox + 360} y={950} kind="V" value={V} /></g>; };
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {left(150)}{right(1090)}
    <text x={960} y={540} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={60} fontWeight={800} opacity={show2}>⇄</text>
    <text x={510} y={170} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={700}>Voltage source + series R</text>
    <text x={1450} y={170} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={700} opacity={show2}>Current source + parallel R</text>
    <text x={960} y={250} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={30} fontWeight={700} opacity={show2}>I_s = V_s / R = {vs} / {r} = {+is.toFixed(2)} A · same R</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ star-delta: {"mode":"d2y"|"y2d","r":[6,12,18]}
// delta: R_AB, R_BC, R_CA. star: R_A, R_B, R_C (each joined to the centre N)
const ZZ: React.FC<{ a: number[]; b: number[]; color: string; label: string; o?: number }> = ({ a, b, color, label, o = 1 }) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = Math.hypot(dx, dy), ux = dx / L2, uy = dy / L2, nx = -uy, ny = ux;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const h = 70;
  const sgn = ((m[0] - 960) * nx + (m[1] - 593) * ny) >= 0 ? 1 : -1;
  const pts = [a, [m[0] - ux * h, m[1] - uy * h], ...Array.from({ length: 6 }, (_, i) => { const t = -h + ((i + 0.5) * 2 * h) / 6; const s = i % 2 ? -18 : 18; return [m[0] + ux * t + nx * s, m[1] + uy * t + ny * s]; }), [m[0] + ux * h, m[1] + uy * h], b];
  return <g opacity={o}><polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" />
    <text x={m[0] + sgn * nx * 40} y={m[1] + sgn * ny * (Math.abs(ny) > 0.7 ? 62 : 40) + 10} textAnchor={sgn * nx > 0.3 ? "start" : sgn * nx < -0.3 ? "end" : "middle"} fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>{label}</text></g>;
};
export const StarDelta: React.FC<any> = ({ dur, mode = "d2y", r = [6, 12, 18] }) => {
  const f = useCurrentFrame();
  const A = [960, 200], B = [620, 790], C = [1300, 790], N = [960, 593];
  let Rab: number, Rbc: number, Rca: number, Ra: number, Rb: number, Rc: number;
  if (mode === "d2y") { [Rab, Rbc, Rca] = r; const S = Rab + Rbc + Rca; Ra = (Rab * Rca) / S; Rb = (Rab * Rbc) / S; Rc = (Rbc * Rca) / S; }
  else { [Ra, Rb, Rc] = r; const P = Ra * Rb + Rb * Rc + Rc * Ra; Rab = P / Rc; Rbc = P / Ra; Rca = P / Rb; }
  const t = interpolate(f, [dur * 0.35, dur * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dO = mode === "d2y" ? 1 - t * 0.75 : t, yO = mode === "d2y" ? t : 1 - t * 0.75;
  const fm = (v: number) => `${+v.toFixed(2)} Ω`;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <ZZ a={A} b={B} color={L.amber} label={`R_AB = ${fm(Rab)}`} o={dO} /><ZZ a={B} b={C} color={L.amber} label={`R_BC = ${fm(Rbc)}`} o={dO} /><ZZ a={C} b={A} color={L.amber} label={`R_CA = ${fm(Rca)}`} o={dO} />
    <ZZ a={A} b={N} color={L.cyan} label={`R_A = ${fm(Ra)}`} o={yO} /><ZZ a={B} b={N} color={L.cyan} label={`R_B = ${fm(Rb)}`} o={yO} /><ZZ a={C} b={N} color={L.cyan} label={`R_C = ${fm(Rc)}`} o={yO} />
    {[[A, "A"], [B, "B"], [C, "C"]].map(([q, n]: any, i) => <g key={i}><circle cx={q[0]} cy={q[1]} r={18} fill={L.green} /><text x={q[0] + (i === 0 ? 0 : i === 1 ? -50 : 50)} y={q[1] + (i === 0 ? -34 : 50)} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={40} fontWeight={800}>{n}</text></g>)}
    <circle cx={N[0]} cy={N[1]} r={12} fill={L.cyan} opacity={yO} />
    <text x={300} y={150} fill={L.amber} fontFamily={SANS} fontSize={36} fontWeight={700} opacity={0.4 + 0.6 * dO}>DELTA (Δ)</text>
    <text x={1620} y={150} textAnchor="end" fill={L.cyan} fontFamily={SANS} fontSize={36} fontWeight={700} opacity={0.4 + 0.6 * yO}>STAR (Y)</text>
    <text x={960} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30}>{mode === "d2y" ? "same three terminals A, B, C → same behaviour from outside" : "star → delta: same terminals, same behaviour"}</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ mesh analysis on a 2-mesh circuit
// V=12, R1=2 (top-left), R3=4 (shared, middle), R2=2 (top-right), R4=2 (right). I1=3 A, I2=1.5 A.
// {"mode":"label"|"kvl1"|"kvl2"|"solve"|"supermesh"}
export const MeshScene: React.FC<any> = ({ dur, mode = "label" }) => {
  const f = useCurrentFrame();
  const sm = mode === "supermesh";
  const wires = [[[360, 260], [1560, 260]], [[360, 260], [360, 800]], [[360, 800], [1560, 800]], [[960, 260], [960, 800]], [[1560, 260], [1560, 800]]];
  const arc = (cx: number, col: string, lab: string, o: number, spin: number) => <g opacity={o}>
    <path d={`M${cx - 120} ${530} A120 120 0 1 1 ${cx - 85} ${615}`} fill="none" stroke={col} strokeWidth={6} strokeDasharray="16 10" strokeDashoffset={-spin} />
    <path d={`M${cx - 85 - 18} ${615 - 18} L${cx - 85 + 10} ${615 - 10} L${cx - 85 - 10} ${615 + 10} Z`} fill={col} />
    <text x={cx} y={545} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={44} fontWeight={800}>{lab}</text></g>;
  const hi1 = mode === "kvl1", hi2 = mode === "kvl2";
  const eq = mode === "kvl1" ? ["Mesh 1 (clockwise):", "12 − 2·I1 − 4·(I1 − I2) = 0", "→ 6·I1 − 4·I2 = 12"]
    : mode === "kvl2" ? ["Mesh 2 (clockwise):", "− 2·I2 − 2·I2 − 4·(I2 − I1) = 0", "→ −4·I1 + 8·I2 = 0"]
    : mode === "solve" ? ["Solve:", "I1 = 3 A,  I2 = 1.5 A", "R3 carries I1 − I2 = 1.5 A ↓"]
    : sm ? ["Current source in the shared branch:", "I2 − I1 = 2 A  (source equation)", "KVL around the SUPERMESH (skip the source)"]
    : ["Step 1: one current per mesh,", "all clockwise", "shared branch carries I1 − I2"];
  const eo = fade(f, dur * 0.2, 12);
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {hi1 && <rect x={370} y={270} width={580} height={520} fill={L.cyan} opacity={0.1} />}
    {hi2 && <rect x={970} y={270} width={580} height={520} fill={L.amber} opacity={0.1} />}
    {sm && <rect x={370} y={270} width={1180} height={520} fill={L.green} opacity={0.08} stroke={L.green} strokeDasharray="14 10" strokeWidth={4} />}
    {wires.map((w, i) => <polyline key={i} points={w.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />)}
    <Battery x={360} y={530} v={12} />
    <Res x={660} y={260} ohm={2} label="R1" horizontal /><Res x={1260} y={260} ohm={2} label="R2" horizontal />
    {sm ? <g><circle cx={960} cy={530} r={54} fill={L.bg0} stroke={L.text} strokeWidth={6} /><line x1={960} y1={570} x2={960} y2={494} stroke={L.text} strokeWidth={6} /><path d="M944 512 L960 484 L976 512 Z" fill={L.text} />
      <text x={1030} y={540} fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>2 A</text></g> : <Res x={960} y={530} ohm={4} label="R3" />}
    <Res x={1560} y={530} ohm={2} label="R4" />
    {arc(660, L.cyan, "I1", hi2 ? 0.3 : 1, f * 1.5)}{arc(1260, L.amber, "I2", hi1 ? 0.3 : 1, f * 1.5)}
    {mode === "solve" && <g><rect x={990} y={700} width={200} height={56} rx={10} fill={L.panel} stroke={L.green} strokeWidth={3} /><text x={1090} y={738} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={800}>1.5 A ↓</text></g>}
    <g opacity={eo}><rect x={360} y={850} width={1200} height={180} rx={18} fill={L.panel} stroke={L.green} strokeWidth={3} />
      {eq.map((t, i) => <text key={i} x={960} y={900 + i * 52} textAnchor="middle" fill={i === 2 ? L.green : L.text} fontFamily={MONO} fontSize={i === 0 ? 28 : 36} fontWeight={i ? 800 : 600} opacity={fade(f, dur * 0.2 + i * dur * 0.15, 10)}>{t}</text>)}</g>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ nodal analysis on the same circuit as MeshScene
// nodes: Va (top middle), Vb (top right), ground = bottom wire. {"mode":"label"|"kcla"|"kclb"|"solve"|"supernode"}
export const NodalScene: React.FC<any> = ({ dur, mode = "label" }) => {
  const f = useCurrentFrame(); const sn = mode === "supernode";
  const wires = [[[360, 260], [1560, 260]], [[360, 260], [360, 800]], [[360, 800], [1560, 800]], [[960, 260], [960, 800]], [[1560, 260], [1560, 800]]];
  const eq = mode === "kcla" ? ["KCL at node Va (currents leaving = 0):", "(Va − 12)/2 + Va/4 + (Va − Vb)/2 = 0", "→ 1.25·Va − 0.5·Vb = 6"]
    : mode === "kclb" ? ["KCL at node Vb:", "(Vb − Va)/2 + Vb/2 = 0", "→ −0.5·Va + Vb = 0"]
    : mode === "solve" ? ["Solve:", "Va = 6 V,  Vb = 3 V", "I(R1) = (12 − 6)/2 = 3 A  ✓ same as mesh"]
    : sn ? ["Voltage source between Va and Vb → SUPERNODE", "Va − Vb = 2  (source equation)", "KCL around the whole supernode"]
    : ["Ground = 0 V (bottom wire)", "Unknowns: Va and Vb", "node with the battery's + side: 12 V (known)"];
  const nodeTag = (x: number, y: number, t: string, c: string, o = 1) => <g opacity={o}><circle cx={x} cy={y} r={20} fill={c} /><rect x={x - Math.max(70, t.length * 10 + 18)} y={y - 92} width={Math.max(140, t.length * 20 + 36)} height={52} rx={10} fill={L.panel} stroke={c} strokeWidth={3} />
    <text x={x} y={y - 55} textAnchor="middle" fill={c} fontFamily={MONO} fontSize={30} fontWeight={800}>{t}</text></g>;
  const solved = mode === "solve";
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {wires.map((w, i) => <polyline key={i} points={w.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />)}
    {sn && <ellipse cx={1260} cy={260} rx={400} ry={110} fill={L.green} opacity={0.1} stroke={L.green} strokeWidth={4} strokeDasharray="14 10" />}
    <Battery x={360} y={530} v={12} />
    <Res x={660} y={260} ohm={2} label="R1" horizontal />
    {sn ? <g><circle cx={1260} cy={260} r={50} fill={L.bg0} stroke={L.text} strokeWidth={6} /><text x={1232} y={272} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={32} fontWeight={800}>+</text><text x={1290} y={272} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={32} fontWeight={800}>−</text>
      <text x={1260} y={350} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>2 V</text></g> : <Res x={1260} y={260} ohm={2} label="R2" horizontal />}
    <Res x={960} y={530} ohm={4} label="R3" /><Res x={1560} y={530} ohm={2} label="R4" />
    <g><line x1={960} y1={800} x2={960} y2={850} stroke={L.wire} strokeWidth={6} />{[0, 1, 2].map((k) => <line key={k} x1={960 - 40 + k * 12} y1={850 + k * 14} x2={960 + 40 - k * 12} y2={850 + k * 14} stroke={L.text} strokeWidth={5} />)}</g>
    {nodeTag(360, 260, "12 V", L.red, 0.9)}
    {nodeTag(960, 260, solved ? "Va = 6 V" : sn ? "Va" : "Va", L.cyan, mode === "kclb" ? 0.35 : 1)}
    {nodeTag(1560, 260, solved ? "Vb = 3 V" : "Vb", L.amber, mode === "kcla" ? 0.35 : 1)}
    {mode === "kcla" && <circle cx={960} cy={260} r={60} fill="none" stroke={L.cyan} strokeWidth={5} />}
    {mode === "kclb" && <circle cx={1560} cy={260} r={60} fill="none" stroke={L.amber} strokeWidth={5} />}
    <g opacity={fade(f, dur * 0.18, 12)}><rect x={360} y={900} width={1200} height={160} rx={18} fill={L.panel} stroke={L.green} strokeWidth={3} />
      {eq.map((t, i) => <text key={i} x={960} y={945 + i * 48} textAnchor="middle" fill={i === 2 ? L.green : L.text} fontFamily={MONO} fontSize={i === 0 ? 26 : 34} fontWeight={i ? 800 : 600} opacity={fade(f, dur * 0.18 + i * dur * 0.15, 10)}>{t}</text>)}</g>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ the theorems circuit: V1=12 —R1=4— X —R3=4— V2=6, load RL=4 from X to ground
// {"mode":"both"|"v1"|"v2"|"open"|"rth"}
//  both: I_L = 1.5 A · v1: V2 shorted → 1 A · v2: V1 shorted → 0.5 A · open: load removed, V_th = 9 V · rth: sources shorted, R_th = 2 Ω
export const TheoremScene: React.FC<any> = ({ dur, mode = "both" }) => {
  const f = useCurrentFrame();
  const on1 = mode !== "v2" && mode !== "rth", on2 = mode !== "v1" && mode !== "rth";
  const loadIn = mode !== "open" && mode !== "rth";
  const X = (on1 ? 12 : 0) * 0 + (() => { const v1 = on1 ? 12 : 0, v2 = on2 ? 6 : 0; const g = 1 / 4 + 1 / 4 + (loadIn ? 1 / 4 : 0); return (v1 / 4 + v2 / 4) / g; })();
  const IL = loadIn ? X / 4 : 0;
  const src = (x: number, v: number, on: boolean) => on ? <Battery x={x} y={530} v={v} />
    : <g><rect x={x - 50} y={470} width={100} height={120} fill={L.bg0} /><line x1={x} y1={460} x2={x} y2={600} stroke={L.red} strokeWidth={8} />
      <text x={x + (x < 960 ? -20 : 20)} y={540} textAnchor={x < 960 ? "end" : "start"} fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={700}>shorted (0 V)</text></g>;
  const loop1 = [[360, 260], [960, 260], [960, 800], [360, 800], [360, 260]];
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {[[[360, 260], [1560, 260]], [[360, 260], [360, 800]], [[360, 800], [1560, 800]], [[1560, 260], [1560, 800]]].map((w, i) => <polyline key={i} points={w.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />)}
    {loadIn && <polyline points="960,260 960,800" fill="none" stroke={L.wire} strokeWidth={6} />}
    {loadIn && IL > 0.01 && <Dots pts={[[960, 300], [960, 760]]} t={f / 30} speed={60 + IL * 120} />}
    {src(360, 12, on1)}{src(1560, 6, on2)}
    <Res x={660} y={260} ohm={4} label="R1" horizontal /><Res x={1260} y={260} ohm={4} label="R3" horizontal />
    {loadIn ? <Res x={960} y={530} ohm={4} label="LOAD RL" /> : <g><circle cx={960} cy={300} r={10} fill={L.text} /><circle cx={960} cy={760} r={10} fill={L.text} />
      <rect x={880} y={470} width={160} height={120} rx={14} fill={L.panel} stroke={mode === "rth" ? L.amber : L.green} strokeWidth={4} />
      <text x={960} y={515} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{mode === "rth" ? "ohmmeter" : "voltmeter"}</text>
      <text x={960} y={560} textAnchor="middle" fill={mode === "rth" ? L.amber : L.green} fontFamily={MONO} fontSize={34} fontWeight={800}>{mode === "rth" ? "2 Ω" : `${+X.toFixed(2)} V`}</text></g>}
    <text x={985} y={250} fill={L.text} fontFamily={MONO} fontSize={34} fontWeight={800}>A</text><text x={985} y={850} fill={L.text} fontFamily={MONO} fontSize={34} fontWeight={800}>B</text>
    {loadIn && <g><rect x={1010} y={600} width={220} height={60} rx={10} fill={L.panel} stroke={L.cyan} strokeWidth={4} /><text x={1120} y={641} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={32} fontWeight={800}>{+IL.toFixed(2)} A</text></g>}
    <text x={960} y={150} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={38} fontWeight={700}>{
      mode === "both" ? "Both sources on → load current 1.5 A" : mode === "v1" ? "Only the 12 V source (6 V replaced by a short) → 1 A" : mode === "v2" ? "Only the 6 V source (12 V replaced by a short) → 0.5 A"
      : mode === "open" ? "Load removed → open-circuit voltage = V_th = 9 V" : "Sources shorted, load removed → resistance seen = R_th = 4 ∥ 4 = 2 Ω"}</text>
    {mode === "rth" && <text x={960} y={950} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30}>looking back into the terminals: R1 and R3 are now in parallel</text>}
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ maximum power transfer: {"vth":9,"rth":2}
export const MptScene: React.FC<any> = ({ dur, vth = 9, rth = 2 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [dur * 0.08, dur * 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const RL = 0.2 * Math.pow(50, p); const I = vth / (rth + RL); const P = I * I * RL; const Pmax = (vth * vth) / (4 * rth);
  const X0 = 1000, Y0 = 820, GW = 760, GH = 520; const lx = (r: number) => X0 + (Math.log(r / 0.2) / Math.log(50)) * GW; const ly = (pw: number) => Y0 - (pw / (Pmax * 1.15)) * GH;
  const curve = Array.from({ length: 80 }, (_, k) => { const r = 0.2 * Math.pow(50, (k / 79) * p); const i = vth / (rth + r); return `${lx(r)},${ly(i * i * r)}`; }).join(" ");
  const loop = [[220, 300], [700, 300], [700, 760], [220, 760], [220, 300]];
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={6} />
    <Dots pts={loop} t={f / 30} speed={40 + I * 50} />
    <Battery x={220} y={530} v={vth} /><Res x={460} y={300} ohm={rth} label="R_th" horizontal /><Res x={700} y={530} ohm={RL} label="LOAD" heat={P / Pmax} />
    <Meter x={460} y={860} kind="A" value={I} />
    <rect x={330} y={920} width={260} height={64} rx={12} fill={L.panel} stroke={L.amber} strokeWidth={4} /><text x={460} y={963} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>P = {P.toFixed(2)} W</text>
    <line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - GH - 30} stroke={L.dim} strokeWidth={3} />
    <text x={X0 + GW} y={Y0 + 44} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>load resistance →</text><text x={X0 - 14} y={Y0 - GH - 10} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>power ↑</text>
    <line x1={lx(rth)} y1={Y0} x2={lx(rth)} y2={ly(Pmax)} stroke={L.green} strokeWidth={3} strokeDasharray="8 8" opacity={p > 0.45 ? 1 : 0} />
    <text x={lx(rth)} y={ly(Pmax) - 24} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={26} fontWeight={800} opacity={p > 0.45 ? 1 : 0}>max {Pmax.toFixed(2)} W at R_L = R_th</text>
    <polyline points={curve} fill="none" stroke={L.amber} strokeWidth={6} />
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ rotating phasor -> sine wave
// {"mode":"gen"|"phase"|"rms","vm":325,"phi":60,"label2":"current"}
export const PhasorScene: React.FC<any> = ({ dur, mode = "gen", vm = 325, phi = 60, cycles = 2, label1 = "voltage", label2 = "current" }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [dur * 0.06, dur * 0.92], [0, cycles], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const th = t * 2 * Math.PI; const cx = 380, cy = 520, R = 220; const X0 = 700, GW = 1120, A = 220;
  const ph = (phi * Math.PI) / 180; const two = mode === "phase";
  const wave = (off: number, k = 1, sq = false) => Array.from({ length: 240 }, (_, i) => { const a = (i / 239) * th; const v = Math.sin(a + off) * k;
    return `${X0 + (a / (2 * Math.PI * cycles)) * GW},${cy - (sq ? v * v : v) * A}`; }).join(" ");
  const tipx = cx + R * Math.cos(th), tipy = cy - R * Math.sin(th);
  const tip2x = cx + R * 0.7 * Math.cos(th - ph), tip2y = cy - R * 0.7 * Math.sin(th - ph);
  const curX = X0 + (th / (2 * Math.PI * cycles)) * GW;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <circle cx={cx} cy={cy} r={R} fill="none" stroke={L.grid2 || L.dim} strokeWidth={2} strokeDasharray="6 8" />
    <line x1={cx - R - 30} y1={cy} x2={cx + R + 30} y2={cy} stroke={L.dim} strokeWidth={2} /><line x1={cx} y1={cy - R - 30} x2={cx} y2={cy + R + 30} stroke={L.dim} strokeWidth={2} />
    <line x1={X0} y1={cy} x2={X0 + GW} y2={cy} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={cy - A - 40} x2={X0} y2={cy + A + 40} stroke={L.dim} strokeWidth={3} />
    {mode !== "rms" && <g><line x1={cx} y1={cy} x2={tipx} y2={tipy} stroke={L.cyan} strokeWidth={8} strokeLinecap="round" /><circle cx={tipx} cy={tipy} r={10} fill={L.cyan} />
      <line x1={tipx} y1={tipy} x2={curX} y2={tipy} stroke={L.cyan} strokeWidth={2} strokeDasharray="6 6" /></g>}
    {two && <g><line x1={cx} y1={cy} x2={tip2x} y2={tip2y} stroke={L.amber} strokeWidth={8} strokeLinecap="round" /><circle cx={tip2x} cy={tip2y} r={10} fill={L.amber} />
      <path d={`M${cx + 70 * Math.cos(th - ph)} ${cy - 70 * Math.sin(th - ph)} A70 70 0 0 0 ${cx + 70 * Math.cos(th)} ${cy - 70 * Math.sin(th)}`} fill="none" stroke={L.green} strokeWidth={4} />
      <text x={cx} y={cy + R + 80} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={30} fontWeight={800}>{phi === 0 ? `φ = 0° (in phase)` : phi > 0 ? `φ = ${phi}° (${label2} lags)` : `φ = ${-phi}° (${label2} leads)`}</text></g>}
    <polyline points={wave(0)} fill="none" stroke={L.cyan} strokeWidth={6} />
    {two && <polyline points={wave(-ph, 0.7)} fill="none" stroke={L.amber} strokeWidth={6} />}
    {mode === "power" && (() => { const pw = Array.from({ length: 240 }, (_, i) => { const a = (i / 239) * th; const v = Math.sin(a) * Math.sin(a - ph);
        return `${X0 + (a / (2 * Math.PI * cycles)) * GW},${cy - v * A}`; }).join(" "); const avg = 0.5 * Math.cos(ph);
      return <g><polyline points={wave(-ph, 0.7)} fill="none" stroke={L.amber} strokeWidth={5} opacity={0.8} /><polyline points={pw} fill="none" stroke={L.green} strokeWidth={7} />
        <line x1={X0} y1={cy - avg * A} x2={X0 + GW} y2={cy - avg * A} stroke={L.red} strokeWidth={3} strokeDasharray="10 8" />
        <rect x={X0 + GW - 360} y={cy - avg * A - 52} width={360} height={40} rx={8} fill={L.bg0} opacity={0.9} />
        <text x={X0 + GW - 10} y={cy - avg * A - 22} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>average = real power P</text></g>; })()}
    {mode === "rms" && <g><polyline points={wave(0, 1, true)} fill="none" stroke={L.amber} strokeWidth={5} opacity={0.9} />
      <line x1={X0} y1={cy - 0.5 * A} x2={X0 + GW} y2={cy - 0.5 * A} stroke={L.green} strokeWidth={4} strokeDasharray="12 8" />
      <text x={X0 + GW - 10} y={cy - 0.5 * A + 36} textAnchor="end" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={800}>average of v² = Vm²/2</text>
      <line x1={X0} y1={cy - 0.707 * A} x2={X0 + GW} y2={cy - 0.707 * A} stroke={L.red} strokeWidth={3} strokeDasharray="6 8" />
      <rect x={X0 + GW - 300} y={cy - 0.707 * A - 50} width={300} height={40} rx={8} fill={L.bg0} opacity={0.9} /><text x={X0 + GW - 10} y={cy - 0.707 * A - 20} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={28} fontWeight={800}>RMS = 0.707 Vm</text>
      <text x={cx} y={cy - 40} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={32} fontWeight={800}>blue: v</text><text x={cx} y={cy + 20} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={32} fontWeight={800}>amber: v²</text></g>}
    <text x={X0 + GW} y={cy + 44} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>time →</text>
    <text x={X0 - 14} y={cy - A + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>+{vm} V</text>
    <text x={X0 - 14} y={cy + A + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>−{vm} V</text>
    <text x={X0 + GW / 2} y={170} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={32} fontWeight={700}>{mode === "gen" ? `angle = ${Math.round((th * 180) / Math.PI) % 360}°   ·   v = Vm sin(θ)` : two ? `${label1} (blue) and ${label2} (amber)` : mode === "power" ? "v (blue) × i (amber) = p (green)" : "squaring the wave, then averaging"}</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ complex plane: {"mode":"plane"|"j"|"add","re":3,"im":4}
export const ComplexScene: React.FC<any> = ({ dur, mode = "plane", re = 3, im = 4, k = 1, unit = "" }) => {
  const f = useCurrentFrame();
  const O = [700, 560], U = 70; const P = (x: number, y: number) => [O[0] + x * U, O[1] - y * U];
  const arrow = (a: number[], b: number[], c: string, w = 8, o = 1) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = Math.hypot(dx, dy) || 1, ux = dx / L2, uy = dy / L2;
    return <g opacity={o}><line x1={a[0]} y1={a[1]} x2={b[0] - ux * 18} y2={b[1] - uy * 18} stroke={c} strokeWidth={w} strokeLinecap="round" />
      <path d={`M${b[0]} ${b[1]} L${b[0] - ux * 26 - uy * 13} ${b[1] - uy * 26 + ux * 13} L${b[0] - ux * 26 + uy * 13} ${b[1] - uy * 26 - ux * 13} Z`} fill={c} /></g>; };
  const axes = <g>{Array.from({ length: 13 }, (_, k) => k - 6).map((k) => <g key={k}><line x1={P(k, -6)[0]} y1={P(k, -6)[1]} x2={P(k, 6)[0]} y2={P(k, 6)[1]} stroke={L.grid2 || "#ddd"} strokeWidth={1} /><line x1={P(-6, k)[0]} y1={P(-6, k)[1]} x2={P(6, k)[0]} y2={P(6, k)[1]} stroke={L.grid2 || "#ddd"} strokeWidth={1} /></g>)}
    <line x1={P(-6.5, 0)[0]} y1={O[1]} x2={P(6.5, 0)[0]} y2={O[1]} stroke={L.text} strokeWidth={3} /><line x1={O[0]} y1={P(0, 6.5)[1]} x2={O[0]} y2={P(0, -6.5)[1]} stroke={L.text} strokeWidth={3} />
    <text x={P(6.5, 0)[0] + 10} y={O[1] + 10} fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>real</text>
    <text x={O[0] + 14} y={P(0, 6.5)[1] - 8} fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>imaginary (j)</text></g>;
  const panel = (lines: string[]) => { const fs = Math.min(34, Math.floor(520 / (Math.max(...lines.map((x) => x.length)) * 0.6))); return <g><rect x={1300} y={300} width={580} height={70 + lines.length * 62} rx={18} fill={L.panel} stroke={L.green} strokeWidth={3} />
    {lines.map((t, i) => <text key={i} x={1590} y={360 + i * 62} textAnchor="middle" fill={i === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={fs} fontWeight={800} opacity={fade(f, dur * 0.15 + i * dur * 0.15, 10)}>{t}</text>)}</g>; };
  if (mode === "j") {
    const k = Math.min(3, Math.floor(interpolate(f, [dur * 0.12, dur * 0.85], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
    const pts = [[4, 0], [0, 4], [-4, 0], [0, -4]]; const names = ["1 × 4 = 4", "j × 4 = j4", "j² × 4 = −4", "j³ × 4 = −j4"];
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{axes}
      {pts.map((q, i) => i <= k && arrow(O, P(q[0], q[1]), i === k ? L.cyan : L.dim, i === k ? 9 : 4, i === k ? 1 : 0.5))}
      {panel(["multiply by j → turn 90°", names[k], "j² = −1"])}</svg></AbsoluteFill>;
  }
  if (mode === "add") {
    const t = interpolate(f, [dur * 0.25, dur * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const A = [4, 0], B = [0, 4]; const Bstart = [t * A[0], t * A[1]];
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{axes}
      {arrow(O, P(A[0], A[1]), L.cyan)}{arrow(P(Bstart[0], Bstart[1]), P(Bstart[0] + B[0], Bstart[1] + B[1]), L.amber)}
      {t > 0.98 && arrow(O, P(4, 4), L.green, 9)}
      {panel(["A = 4∠0°  ·  B = 4∠90°", "A + B = 4 + j4", "= 5.66 ∠ 45°"])}</svg></AbsoluteFill>;
  }
  const r = Math.hypot(re, im); const ang = (Math.atan2(im, re) * 180) / Math.PI;
  const show = fade(f, dur * 0.1, 12);
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{axes}
    <line x1={P(re, 0)[0]} y1={P(re, 0)[1]} x2={P(re, im)[0]} y2={P(re, im)[1]} stroke={L.amber} strokeWidth={4} strokeDasharray="10 8" opacity={show} />
    <text x={P(re / 2, 0)[0]} y={O[1] + 44} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>{re * k}</text>
    <text x={P(re, im / 2)[0] + 16} y={P(re, im / 2)[1]} fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>{im < 0 ? "−" : ""}j{Math.abs(im * k)}</text>
    {arrow(O, P(re, im), L.cyan)}
    <path d={`M${O[0] + 90} ${O[1]} A90 90 0 0 ${ang < 0 ? 1 : 0} ${O[0] + 90 * Math.cos((ang * Math.PI) / 180)} ${O[1] - 90 * Math.sin((ang * Math.PI) / 180)}`} fill="none" stroke={L.green} strokeWidth={4} />
    <text x={O[0] + 110} y={O[1] - 30} fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={800}>θ</text>
    {(() => { const R2 = re * k, I2 = im * k, M = r * k, sg = I2 < 0 ? "−" : "+";
      return panel([`rectangular: ${R2} ${sg} j${Math.abs(I2)}${unit}`, `r = √(${R2}² + ${Math.abs(I2)}²) = ${+M.toFixed(2)}${unit}`, `θ = tan⁻¹(${I2}/${R2}) = ${ang.toFixed(2)}°`, `polar: ${+M.toFixed(2)} ∠ ${ang.toFixed(2)}°${unit}`]); })()}
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ series RLC step response: L=1 H, C=0.25 F (ω0 = 2), R = 10 / 4 / 1 Ω
// {"show":["over","crit","under"]}
const rlcStep = (R: number, t: number) => { const L0 = 1, C0 = 0.25, w0 = 1 / Math.sqrt(L0 * C0), a = R / (2 * L0);
  if (Math.abs(a - w0) < 1e-9) return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  if (a > w0) { const d = Math.sqrt(a * a - w0 * w0), s1 = -a + d, s2 = -a - d; return 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2); }
  const wd = Math.sqrt(w0 * w0 - a * a); return 1 - Math.exp(-a * t) * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t)); };
export const DampScene: React.FC<any> = ({ dur, show = ["over", "crit", "under"] }) => {
  const f = useCurrentFrame();
  const T = 8; const p = interpolate(f, [dur * 0.06, dur * 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const X0 = 260, Y0 = 820, GW = 1400, GH = 360;
  const curves: Record<string, [number, string, string]> = { over: [10, L.cyan, "overdamped (R = 10 Ω)"], crit: [4, L.green, "critically damped (R = 4 Ω)"], under: [1, L.amber, "underdamped (R = 1 Ω)"] };
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - GH * 1.7} stroke={L.dim} strokeWidth={3} />
    <line x1={X0} y1={Y0 - GH} x2={X0 + GW} y2={Y0 - GH} stroke={L.dim} strokeDasharray="10 8" strokeWidth={2} />
    <text x={X0 - 14} y={Y0 - GH + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={26}>final</text>
    <text x={X0 + GW} y={Y0 + 84} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={26}>time (s) →</text>
    {Array.from({ length: 9 }, (_, k) => <text key={k} x={X0 + (k / 8) * GW} y={Y0 + 40} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{k}</text>)}
    {show.map((key: string, i: number) => { const [R, col, lab] = curves[key];
      const pts = Array.from({ length: 300 }, (_, k) => { const t = (k / 299) * T * p; return `${X0 + (t / T) * GW},${Y0 - rlcStep(R, t) * GH}`; }).join(" ");
      return <g key={key}><polyline points={pts} fill="none" stroke={col} strokeWidth={6} />
        <rect x={1240} y={170 + i * 60} width={36} height={14} rx={7} fill={col} /><text x={1290} y={186 + i * 60} fill={L.text} fontFamily={SANS} fontSize={30} fontWeight={700}>{lab}</text></g>; })}
    <text x={X0 + 24} y={186} fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>capacitor voltage after the switch closes</text>
    <text x={X0 + 24} y={230} fill={L.dim} fontFamily={MONO} fontSize={26}>L = 1 H · C = 0.25 F · ω₀ = 2 rad/s</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ series resonance: L = 10 mH, C = 10 µF, V = 10 V
// {"mode":"react"|"curve","r":[10,30]}
export const ResScene: React.FC<any> = ({ dur, mode = "curve", r = [10, 30] }) => {
  const f = useCurrentFrame(); const Lh = 0.01, Cf = 10e-6, V = 10; const f0 = 1 / (2 * Math.PI * Math.sqrt(Lh * Cf));
  const p = interpolate(f, [dur * 0.06, dur * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const X0 = 260, Y0 = 840, GW = 1400, GH = 560, fmax = 1200; const X = (fr: number) => X0 + (fr / fmax) * GW;
  const axes = <g><line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - GH - 30} stroke={L.dim} strokeWidth={3} />
    {[0, 200, 400, 600, 800, 1000, 1200].map((k) => <text key={k} x={X(k)} y={Y0 + 40} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{k}</text>)}
    <text x={X0 + GW} y={Y0 + 84} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={26}>frequency (Hz) →</text>
    <line x1={X(f0)} y1={Y0} x2={X(f0)} y2={Y0 - GH - 10} stroke={L.green} strokeWidth={3} strokeDasharray="10 8" />
    <text x={X(f0) + 12} y={Y0 - GH} fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={800}>f₀ = {f0.toFixed(1)} Hz</text></g>;
  const fend = 20 + p * (fmax - 20);
  if (mode === "react") {
    const xl = (fr: number) => 2 * Math.PI * fr * Lh, xc = (fr: number) => 1 / (2 * Math.PI * fr * Cf); const Ymax = 100; const Y = (v: number) => Y0 - (Math.min(v, Ymax) / Ymax) * GH;
    const line = (fn: (x: number) => number, f1 = 20) => Array.from({ length: 200 }, (_, k) => { const fr = f1 + (k / 199) * Math.max(0, fend - f1); return `${X(fr)},${Y(fn(fr))}`; }).join(" ");
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{axes}
      <polyline points={line(xl)} fill="none" stroke={L.cyan} strokeWidth={6} />{fend > 160 && <polyline points={line(xc, 160)} fill="none" stroke={L.amber} strokeWidth={6} />}
      <text x={X0 + 24} y={200} fill={L.cyan} fontFamily={MONO} fontSize={30} fontWeight={800}>X_L = 2πfL (rises)</text>
      <text x={X0 + 24} y={244} fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>X_C = 1/(2πfC) (falls)</text>
      <text x={X0 - 14} y={Y0 - GH + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>100 Ω</text>
      <rect x={X(f0) + 20} y={Y(31.6) + 90} width={300} height={44} rx={8} fill={L.bg0} opacity={p > 0.45 ? 0.92 : 0} /><text x={X(f0) + 170} y={Y(31.6) + 122} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={26} fontWeight={800} opacity={p > 0.45 ? 1 : 0}>X_L = X_C ≈ 31.6 Ω</text>
    </svg></AbsoluteFill>;
  }
  const I = (fr: number, R: number) => V / Math.hypot(R, 2 * Math.PI * fr * Lh - 1 / (2 * Math.PI * fr * Cf)); const Imax = V / Math.min(...r); const Y = (v: number) => Y0 - (v / Imax) * GH;
  const cols = [L.cyan, L.amber];
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{axes}
    <text x={X0 - 14} y={Y0 - GH + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>{Imax} A</text>
    {r.map((R: number, i: number) => { const pts = Array.from({ length: 300 }, (_, k) => { const fr = 20 + (k / 299) * (fend - 20); return `${X(fr)},${Y(I(fr, R))}`; }).join(" ");
      const bw = R / (2 * Math.PI * Lh); const Q = f0 / bw; const yh = Y((V / R) * 0.707);
      return <g key={i}><polyline points={pts} fill="none" stroke={cols[i]} strokeWidth={6} />
        {p > 0.9 && <g><line x1={X(f0 - bw / 2)} y1={yh} x2={X(f0 + bw / 2)} y2={yh} stroke={cols[i]} strokeWidth={3} strokeDasharray="6 6" /></g>}
        <text x={1240} y={200 + i * 50} fill={cols[i]} fontFamily={MONO} fontSize={28} fontWeight={800}>R = {R} Ω · Q = {Q.toFixed(2)} · BW = {bw.toFixed(0)} Hz</text></g>; })}
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ two coupled coils: {"mode":"mutual"|"dots","k":0.5}
export const CoupledScene: React.FC<any> = ({ dur, mode = "mutual", k = 0.5 }) => {
  const f = useCurrentFrame(); const t = f / 30; const i1 = Math.sin(t * 1.6); const di = Math.cos(t * 1.6);
  const coil = (cx: number, col: string) => Array.from({ length: 6 }, (_, j) => <ellipse key={j} cx={cx - 125 + j * 50} cy={520} rx={22} ry={110} fill="none" stroke={col} strokeWidth={8} />);
  const shared = Math.round(6 * k);
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {Array.from({ length: 6 }, (_, j) => { const share = j < shared; const ry = 150 + j * 34; const rx = share ? 640 + j * 20 : 240 + j * 18; const cx = share ? 960 : 600;
      return <ellipse key={j} cx={cx} cy={520} rx={rx} ry={ry} fill="none" stroke={share ? L.green : L.cyan} strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-f * 2 * Math.sign(i1)} opacity={0.25 + 0.65 * Math.abs(i1)} />; })}
    {coil(600, L.amber)}{coil(1320, L.red)}
    {mode === "dots" && <g><circle cx={460} cy={390} r={16} fill={L.text} /><circle cx={1180} cy={390} r={16} fill={L.text} />
      <text x={460} y={350} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={700}>dot</text><text x={1180} y={350} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={700}>dot</text></g>}
    <rect x={470} y={688} width={260} height={46} rx={10} fill={L.bg0} /><rect x={1190} y={688} width={260} height={46} rx={10} fill={L.bg0} /><text x={600} y={720} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={32} fontWeight={800}>coil 1 (L₁)</text>
    <text x={1320} y={720} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={32} fontWeight={800}>coil 2 (L₂)</text>
    <rect x={410} y={780} width={380} height={70} rx={12} fill={L.panel} stroke={L.amber} strokeWidth={3} /><text x={600} y={826} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>i₁ = {(i1 * 2).toFixed(2)} A</text>
    <rect x={1130} y={780} width={380} height={70} rx={12} fill={L.panel} stroke={L.red} strokeWidth={3} /><text x={1320} y={826} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={30} fontWeight={800}>v₂ = {(di * 3).toFixed(2)} V</text>
    <text x={960} y={160} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={36} fontWeight={700}>{mode === "dots" ? "current INTO a dot → induced + at the other dot" : `green flux links both coils · coupling k = ${k}`}</text>
    <text x={960} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30}>v₂ = M · di₁/dt : biggest when i₁ changes fastest, zero at its peaks</text>
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ network graph of the NetScene circuit: {"mode":"graph"|"tree"|"tieset"|"cutset"}
export const GraphScene: React.FC<any> = ({ dur, mode = "graph" }) => {
  const f = useCurrentFrame();
  const N: Record<string, number[]> = { A: [460, 300], B: [960, 300], C: [1460, 300], D: [960, 800] };
  const E: [string, string, string, string][] = [["1", "A", "D", "V"], ["2", "A", "B", "R1"], ["3", "B", "D", "R2"], ["4", "B", "C", "R3"], ["5", "C", "D", "R4"]];
  const twigs = ["1", "3", "5"];
  const ties: [string[], string][] = [[["2", "3", "1"], "tie-set of link R1: {R1, R2, V}"], [["4", "5", "3"], "tie-set of link R3: {R3, R4, R2}"]];
  const cuts: [string[], string, string][] = [[["1", "2"], "A", "cut-set of twig V: {V, R1}"], [["3", "2", "4"], "B", "cut-set of twig R2: {R2, R1, R3}"], [["5", "4"], "C", "cut-set of twig R4: {R4, R3}"]];
  const nk = mode === "tieset" ? ties.length : mode === "cutset" ? cuts.length : 1;
  const k = Math.min(nk - 1, Math.floor(interpolate(f, [dur * 0.1, dur * 0.92], [0, nk], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const hot = mode === "tieset" ? ties[k][0] : mode === "cutset" ? cuts[k][0] : [];
  const label = mode === "graph" ? "Graph: 4 nodes, 5 branches (elements become lines)" : mode === "tree" ? "Tree: twigs (green) connect all nodes, no loop · links dashed"
    : mode === "tieset" ? ties[k][1] : cuts[k][2];
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {E.map(([id, a, b, nm]) => { const [x1, y1] = N[a], [x2, y2] = N[b]; const tw = twigs.includes(id); const on = hot.includes(id);
      const showTree = mode !== "graph"; const col = on ? L.amber : showTree ? (tw ? L.green : L.dim) : L.cyan;
      const path = id === "1" ? `M${x1} ${y1} L${x1} ${y2} L${x2} ${y2}` : id === "5" ? `M${x1} ${y1} L${x1} ${y2} L${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
      const mid = id === "1" ? [x1, (y1 + y2) / 2] : id === "5" ? [x1, (y1 + y2) / 2] : [(x1 + x2) / 2, (y1 + y2) / 2];
      return <g key={id}><path d={path} fill="none" stroke={col} strokeWidth={on ? 12 : showTree && !tw ? 5 : 8} strokeDasharray={showTree && !tw && !on ? "16 12" : undefined} />
        <rect x={mid[0] - 62} y={mid[1] - 26} width={124} height={44} rx={10} fill={L.bg0} /><text x={mid[0]} y={mid[1] + 8} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={28} fontWeight={800}>{id}: {nm}</text></g>; })}
    {Object.entries(N).map(([n, [x, y]]) => <g key={n}><circle cx={x} cy={y} r={22} fill={mode === "cutset" && cuts[k][1] === n ? L.amber : L.text} />
      <text x={x} y={n === "D" ? y + 64 : y - 38} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={36} fontWeight={800}>{n}</text></g>)}
    {mode === "cutset" && <circle cx={N[cuts[k][1]][0]} cy={N[cuts[k][1]][1]} r={150} fill="none" stroke={L.amber} strokeWidth={4} strokeDasharray="12 10" />}
    <text x={960} y={150} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={38} fontWeight={700}>{label}</text>
    {mode !== "graph" && <text x={960} y={960} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={30}>twigs = n − 1 = 3 · links = b − n + 1 = 2</text>}
  </svg></AbsoluteFill>;
};

// ------------------------------------------------------------------ two-port: T network Za=2, Zb=4, Zc=6. {"mode":"box"|"tnet"|"open2"|"open1"}
export const TwoPortScene: React.FC<any> = ({ dur, mode = "box" }) => {
  const f = useCurrentFrame(); const inside = mode !== "box";
  const port = (x: number, side: string, V: string, I: string, col: string) => <g>
    <circle cx={x} cy={330} r={14} fill={L.text} /><circle cx={x} cy={730} r={14} fill={L.text} />
    <text x={x + (side === "l" ? -40 : 40)} y={540} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={40} fontWeight={800}>{V}</text>
    <text x={x + (side === "l" ? -40 : 40)} y={490} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={34} fontWeight={800}>+</text><text x={x + (side === "l" ? -40 : 40)} y={600} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={34} fontWeight={800}>−</text>
    <line x1={side === "l" ? x - 110 : x + 110} y1={300} x2={side === "l" ? x - 30 : x + 30} y2={300} stroke={L.amber} strokeWidth={5} />
    <path d={side === "l" ? `M${x - 30} 300 l-18 -10 l0 20 z` : `M${x + 30} 300 l18 -10 l0 20 z`} fill={L.amber} />
    <text x={side === "l" ? x - 70 : x + 70} y={280} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={32} fontWeight={800}>{I}</text></g>;
  const open2 = mode === "open2", open1 = mode === "open1";
  const I1 = open2 ? 1 : 0, I2 = open1 ? 1 : 0; const V1 = 8 * I1 + 6 * I2, V2 = 6 * I1 + 10 * I2;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <rect x={560} y={260} width={800} height={540} rx={24} fill={inside ? "none" : L.panel} stroke={L.text} strokeWidth={5} strokeDasharray={inside ? "16 12" : undefined} />
    {!inside && <text x={960} y={545} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={48} fontWeight={800}>TWO-PORT NETWORK</text>}
    {[[480, 330, 560, 330], [480, 730, 560, 730], [1360, 330, 1440, 330], [1360, 730, 1440, 730]].map((q, i) => <line key={i} x1={q[0]} y1={q[1]} x2={q[2]} y2={q[3]} stroke={L.wire} strokeWidth={6} />)}
    {inside && <g><polyline points="560,330 960,330 1360,330" fill="none" stroke={L.wire} strokeWidth={6} /><polyline points="560,730 1360,730" fill="none" stroke={L.wire} strokeWidth={6} />
      <polyline points="960,330 960,730" fill="none" stroke={L.wire} strokeWidth={6} />
      <Res x={760} y={330} ohm={2} label="Za" horizontal /><Res x={1160} y={330} ohm={4} label="Zb" horizontal /><Res x={960} y={530} ohm={6} label="Zc" /></g>}
    {port(480, "l", "V₁", "I₁", L.text)}{port(1440, "r", "V₂", "I₂", L.text)}
    <text x={450} y={790} textAnchor="end" fill={L.dim} fontFamily={SANS} fontSize={28}>input port 1</text><text x={1470} y={790} textAnchor="start" fill={L.dim} fontFamily={SANS} fontSize={28}>output port 2</text>
    {(open2 || open1) && <g><rect x={360} y={860} width={1200} height={150} rx={18} fill={L.panel} stroke={L.green} strokeWidth={3} />
      <text x={960} y={910} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>{open2 ? "port 2 open (I₂ = 0), I₁ = 1 A" : "port 1 open (I₁ = 0), I₂ = 1 A"}</text>
      <text x={960} y={965} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={32} fontWeight={800} opacity={fade(f, dur * 0.4, 10)}>{open2 ? `V₁ = ${V1} V → z₁₁ = 8 Ω · V₂ = ${V2} V → z₂₁ = 6 Ω` : `V₂ = ${V2} V → z₂₂ = 10 Ω · V₁ = ${V1} V → z₁₂ = 6 Ω`}</text></g>}
    <text x={960} y={170} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={36} fontWeight={700}>{mode === "box" ? "only the four terminal quantities V₁, I₁, V₂, I₂ matter" : mode === "tnet" ? "inside: a T network (Za = 2 Ω, Zb = 4 Ω, Zc = 6 Ω)" : "measuring the Z parameters"}</text>
  </svg></AbsoluteFill>;
};

export const ANALOG_SCENES: Record<string, React.FC<any>> = { twoport: TwoPortScene, graph: GraphScene, coupled: CoupledScene, resonance: ResScene, damp: DampScene, complex: ComplexScene, phasor: PhasorScene, theorem: TheoremScene, mpt: MptScene, nodal: NodalScene, mesh: MeshScene, stardelta: StarDelta, srctx: SrcTxScene, kcl: KclScene, kvl: KvlScene, net: NetScene, source: SourceScene, coil: CoilScene, rl: RLScene, rc: RCScene, capgeom: CapGeom, resistor: ResistorScene, bars: ValueBars, atom: AtomScene, water: WaterTank, dc: DCCircuit, inside: InsideWire, ohm: OhmGraph, numerical: Numerical };

// ------------------------------------------------------------------ RC high-pass filter (no boxes: circuit left, waveforms right)
/** {"type":"hpf","mode":"build"|"compare"|"run"|"sweep"|"fc","ratio":10 (f/fc),"half":"pos"|"neg"|"all","cycles":1}
 *  R = 1 kΩ, C = 0.159 µF -> fc = 1 kHz. Every value on screen is computed from the steady-state solution. */
export const HPFScene: React.FC<any> = ({ dur, mode = "run", ratio = 10, half = "all", cycles = 1, amp = 5, kind = "rc" }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const R = 1000, FC = 1000; const RL = kind === "rl";
  const sweep = mode === "sweep";
  const r = sweep ? Math.pow(10, -1.3 + 2.6 * p) : ratio;               // f / fc
  const g = r / Math.sqrt(1 + r * r), ph = Math.atan(1 / r);           // gain and phase lead
  const th0 = half === "neg" ? Math.PI : 0, th1 = half === "pos" ? Math.PI : half === "neg" ? 2 * Math.PI : 2 * Math.PI * cycles;
  const running = mode === "run";
  const th = running ? th0 + (th1 - th0) * p : 0.0001;
  const vin = amp * Math.sin(th), vout = amp * g * Math.sin(th + ph), vc = vin - vout;
  const iA = RL ? vc / R : vout / R;                               // RC: i = VR/R = Vout/R; RL: i = VR/R = (Vin-Vout)/R
  const qRL = -amp * Math.cos(th) + amp * g * Math.cos(th + ph);     // RL: charge moved = integral of current
  const reveal = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const T = 300, B = 760, XS = 200, XC = 480, XR = 720, XO = 900, YS = 530;
  const loop = [[XS, YS - 62], [XS, T], [XR, T], [XR, B], [XS, B], [XS, YS + 62]];
  const fmtF = (hz: number) => hz >= 1000 ? `${+(hz / 1000).toFixed(hz < 10000 ? 2 : 1)} kHz` : `${+hz.toFixed(hz < 100 ? 1 : 0)} Hz`;
  const fmtO = (o: number) => o >= 1000 ? `${+(o / 1000).toFixed(o < 10000 ? 2 : 1)} kΩ` : `${+o.toFixed(0)} Ω`;
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const signs = (x: number, v: number, col: string) => Array.from({ length: Math.min(5, Math.round(Math.abs(v) / amp * 5)) }, (_, k) =>
    <text key={k} x={x} y={T - 34 + k * 18} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={22} fontWeight={700}>{v >= 0 ? "+" : "−"}</text>);
  // ---- left: the circuit
  const circuit = <g>
    <g opacity={reveal(0.02)}>
      <circle cx={XS} cy={YS} r={62} fill={L.bg0} stroke={L.cyan} strokeWidth={6} />
      <path d={`M ${XS - 36} ${YS} Q ${XS - 18} ${YS - 34} ${XS} ${YS} T ${XS + 36} ${YS}`} fill="none" stroke={L.cyan} strokeWidth={5} />
      <text x={XS - 80} y={YS + 10} textAnchor="end" {...T1} fontSize={32} fill={L.cyan}>Vin</text>
      {running && <text x={XS} y={YS + 110} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={26}>{vin.toFixed(2)} V</text>}
    </g>
    <g opacity={reveal(0.2)}>
      <polyline points={`${XS},${YS - 62} ${XS},${T} ${XC - 16},${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
      {RL ? <><line x1={XC - 16} y1={T} x2={XC + 16} y2={T} stroke={L.wire} strokeWidth={6} /><Res x={XC} y={T} ohm={R} label="R" horizontal /></> : <>
      <line x1={XC - 16} y1={T - 55} x2={XC - 16} y2={T + 55} stroke={L.amber} strokeWidth={9} />
      <line x1={XC + 16} y1={T - 55} x2={XC + 16} y2={T + 55} stroke={L.amber} strokeWidth={9} />
      <text x={XC} y={T - 80} textAnchor="middle" {...T1} fontSize={32}>C</text>
      {running && <>{signs(XC - 34, vc, vc >= 0 ? L.red : L.cyan)}{signs(XC + 34, -vc, -vc >= 0 ? L.red : L.cyan)}</>}
      {(running || sweep) && <text x={XC} y={T + 100} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={26} fontWeight={700}>Xc = {fmtO(R / r)}</text>}</>}
      {running && <text x={XC} y={T + (RL ? 100 : 136)} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={24}>{RL ? "VR" : "Vc"} = {vc.toFixed(2)} V</text>}
    </g>
    <g opacity={reveal(0.4)}>
      <polyline points={`${XC + 16},${T} ${XR},${T} ${XR},${YS - 70}`} fill="none" stroke={L.wire} strokeWidth={6} />
      <polyline points={`${XR},${YS + 70} ${XR},${B} ${XS},${B} ${XS},${YS + 62}`} fill="none" stroke={L.wire} strokeWidth={6} />
      {RL ? <g><rect x={XR - 34} y={YS - 72} width={68} height={144} fill={L.bg0} />
        <path d={`M ${XR} ${YS - 70} ` + [0, 1, 2, 3].map((k) => `a 18 17.5 0 1 1 0 35`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />
        <text x={XR + 44} y={YS - 6} {...T1} fontSize={26}>L</text><text x={XR + 44} y={YS + 24} fill={L.dim} fontFamily={MONO} fontSize={24}>159 mH</text>
        {(running || sweep) && <text x={XR - 50} y={YS + 110} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={26} fontWeight={700}>XL = {fmtO(R * r)}</text>}
        {running && <g opacity={Math.min(1, Math.abs(iA) * 400)}>{[0, 1, 2].map((k) => <ellipse key={k} cx={XR} cy={YS} rx={60 + k * 22} ry={95 + k * 18} fill="none" stroke={L.electron} strokeWidth={2} strokeDasharray="6 10" />)}</g>}
      </g> : <Res x={XR} y={YS} ohm={R} label="R" />}
      <line x1={XS + 260} y1={B} x2={XS + 260} y2={B + 30} stroke={L.wire} strokeWidth={5} />
      {[0, 1, 2].map((k) => <line key={k} x1={XS + 260 - 30 + k * 10} y1={B + 30 + k * 10} x2={XS + 260 + 30 - k * 10} y2={B + 30 + k * 10} stroke={L.wire} strokeWidth={5} />)}
    </g>
    <g opacity={reveal(0.6)}>
      <line x1={XR} y1={T} x2={XO} y2={T} stroke={L.wire} strokeWidth={6} /><line x1={XR} y1={B} x2={XO} y2={B} stroke={L.wire} strokeWidth={6} />
      <circle cx={XO} cy={T} r={11} fill={L.amber} /><circle cx={XO} cy={B} r={11} fill={L.amber} />
      <text x={XO} y={YS + 10} textAnchor="middle" {...T1} fontSize={32} fill={L.green}>Vout</text>
      {running && <text x={XO} y={YS + 50} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={26}>{vout.toFixed(2)} V</text>}
      <line x1={XO} y1={T + 30} x2={XO} y2={YS - 40} stroke={L.green} strokeWidth={3} strokeDasharray="8 8" />
      <line x1={XO} y1={YS + 70} x2={XO} y2={B - 30} stroke={L.green} strokeWidth={3} strokeDasharray="8 8" />
    </g>
    {mode === "build" && <g>
      <text x={XC} y={T - 130} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={30} fontWeight={700} opacity={reveal(0.28)}>{RL ? "resistor in SERIES" : "capacitor in SERIES"}</text>
      <text x={XR + 60} y={B - 40} fill={L.amber} fontFamily={SANS} fontSize={30} fontWeight={700} opacity={reveal(0.5)}>{RL ? "inductor to GROUND" : "resistor to GROUND"}</text>
      <text x={XO + 30} y={YS + 90} fill={L.green} fontFamily={SANS} fontSize={28} fontWeight={700} opacity={reveal(0.7)}>{RL ? "output taken across L" : "output taken across R"}</text>
    </g>}
    {running && <Dots pts={loop} t={RL ? qRL : vc} speed={-26} r={8} />}
    {running && Math.abs(iA) > 1e-4 && <text x={(XC + XR) / 2 + 40} y={T - 30} textAnchor="middle" fill={L.electron} fontFamily={MONO} fontSize={26} fontWeight={700}>
      {iA > 0 ? "current →" : "← current"}</text>}
  </g>;
  // ---- right side
  const GX = 1000, GW = 820, GA = 120;
  const wave = (cy: number, fn: (t: number) => number, col: string, label: string, upto: number) => {
    const N = 160; const pts: string[] = [];
    for (let k = 0; k <= N; k++) { const t = th0 + (th1 - th0) * k / N; if (t > upto) break; pts.push(`${GX + GW * k / N},${cy - fn(t) / amp * GA}`); }
    return <g>
      <line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} />
      <line x1={GX} y1={cy - GA} x2={GX + GW} y2={cy - GA} stroke={L.dim} strokeWidth={1.5} strokeDasharray="6 8" />
      <line x1={GX} y1={cy + GA} x2={GX + GW} y2={cy + GA} stroke={L.dim} strokeWidth={1.5} strokeDasharray="6 8" />
      <text x={GX - 16} y={cy + 10} textAnchor="end" {...T1} fontSize={30} fill={col}>{label}</text>
      <text x={GX - 16} y={cy - GA + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={20}>+{amp} V</text>
      <text x={GX - 16} y={cy + GA + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={20}>−{amp} V</text>
      {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={6} strokeLinejoin="round" />}
      {pts.length > 1 && <circle cx={+pts[pts.length - 1].split(",")[0]} cy={+pts[pts.length - 1].split(",")[1]} r={10} fill={col} />}
    </g>;
  };
  let right: React.ReactNode = null;
  if (running) {
    const lab = half === "pos" ? "POSITIVE HALF-CYCLE" : half === "neg" ? "NEGATIVE HALF-CYCLE" : `${cycles} CYCLE${cycles > 1 ? "S" : ""}`;
    right = <g>
      <text x={GX + GW / 2} y={120} textAnchor="middle" fill={half === "neg" ? L.cyan : half === "pos" ? L.red : L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>{lab}</text>
      <text x={GX + GW / 2} y={166} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={26}>f = {fmtF(r * FC)}   ·   cutoff fc = 1 kHz</text>
      {wave(340, (t) => amp * Math.sin(t), L.cyan, "Vin", th)}
      {wave(720, (t) => amp * g * Math.sin(t + ph), L.green, "Vout", th)}
      <text x={GX + GW / 2} y={930} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={700}>Vout peak = {(amp * g).toFixed(2)} V  ({+(g * 100).toFixed(1)}% of Vin)</text>
    </g>;
  } else if (sweep) {
    const X0 = GX, Y0 = 820, W = GW, H = 560, lx = (rr: number) => X0 + (Math.log10(rr) + 1.3) / 2.6 * W, ly = (gg: number) => Y0 - gg * H;
    const pts: string[] = []; for (let k = 0; k <= 200; k++) { const rr = Math.pow(10, -1.3 + 2.6 * k / 200); if (rr > r) break; pts.push(`${lx(rr)},${ly(rr / Math.sqrt(1 + rr * rr))}`); }
    right = <g>
      <text x={X0 + W / 2} y={140} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>OUTPUT vs FREQUENCY</text>
      <line x1={X0} y1={Y0} x2={X0 + W} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - H - 20} stroke={L.dim} strokeWidth={3} />
      <line x1={X0} y1={ly(1)} x2={X0 + W} y2={ly(1)} stroke={L.dim} strokeDasharray="8 8" strokeWidth={2} />
      <text x={X0 - 14} y={ly(1) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>100%</text>
      <line x1={lx(1)} y1={Y0} x2={lx(1)} y2={ly(0.707)} stroke={L.amber} strokeDasharray="8 8" strokeWidth={3} />
      <line x1={X0} y1={ly(0.707)} x2={lx(1)} y2={ly(0.707)} stroke={L.amber} strokeDasharray="8 8" strokeWidth={3} />
      <text x={X0 - 14} y={ly(0.707) + 8} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={22}>70.7%</text>
      <text x={lx(1)} y={Y0 + 40} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={700}>fc = 1 kHz</text>
      <text x={X0} y={Y0 + 40} fill={L.dim} fontFamily={MONO} fontSize={22}>50 Hz</text>
      <text x={X0 + W} y={Y0 + 40} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>20 kHz</text>
      <text x={X0 + 120} y={Y0 - 30} fill={L.red} fontFamily={SANS} fontSize={26} fontWeight={700}>blocked</text>
      <text x={X0 + W - 20} y={ly(1) - 20} textAnchor="end" fill={L.green} fontFamily={SANS} fontSize={26} fontWeight={700}>passed</text>
      {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={L.green} strokeWidth={7} />}
      <circle cx={lx(r)} cy={ly(g)} r={12} fill={L.green} />
      <text x={X0 + W / 2} y={960} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>f = {fmtF(r * FC)}   →   Vout = {Math.round(g * 100)}% of Vin</text>
    </g>;
  } else if (mode === "fc") {
    const lines = RL ? ["R = 1 kΩ,   L = 159 mH", "fc = R ÷ (2π × L)", "fc = 1000 ÷ (2 × 3.14 × 0.159)", "fc ≈ 1000 Hz  =  1 kHz", "At fc:  XL = R,  Vout = 0.707 × Vin  (−3 dB)"] : ["R = 1 kΩ,   C = 0.159 µF", "fc = 1 ÷ (2π × R × C)", "fc = 1 ÷ (2 × 3.14 × 1000 × 0.000000159)", "fc ≈ 1000 Hz  =  1 kHz", "At fc:  Xc = R,  Vout = 0.707 × Vin  (−3 dB)"];
    right = <g>{lines.map((l, k) => <text key={k} x={GX} y={300 + k * 110} fill={k === 3 ? L.green : k === 4 ? L.amber : L.text} fontFamily={MONO} fontSize={k === 1 ? 44 : 36} fontWeight={700}
      opacity={interpolate(p, [k * 0.17, k * 0.17 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  } else if (mode === "compare") {
    right = <g opacity={0.95}>
      <text x={GX + GW / 2} y={170} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{RL ? "RL LOW-PASS" : "LAST VIDEO: LOW-PASS"}</text>
      {RL ? <g>
        <polyline points={`${GX + 80},640 ${GX + 80},330 ${GX + 220},330`} fill="none" stroke={L.wire} strokeWidth={5} />
        <path d={`M ${GX + 220} 330 ` + [0, 1, 2, 3].map(() => `a 17.5 18 0 1 1 35 0`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />
        <text x={GX + 290} y={290} textAnchor="middle" {...T1} fontSize={28}>L</text>
        <polyline points={`${GX + 360},330 ${GX + 560},330 ${GX + 560},415`} fill="none" stroke={L.wire} strokeWidth={5} />
        <Res x={GX + 560} y={485} ohm={R} label="R" />
        <polyline points={`${GX + 560},555 ${GX + 560},640 ${GX + 80},640`} fill="none" stroke={L.wire} strokeWidth={5} />
      </g> : <g>
      <polyline points={`${GX + 80},560 ${GX + 80},330 ${GX + 220},330`} fill="none" stroke={L.wire} strokeWidth={5} />
      <Res x={GX + 290} y={330} ohm={R} label="R" horizontal />
      <polyline points={`${GX + 360},330 ${GX + 560},330 ${GX + 560},470`} fill="none" stroke={L.wire} strokeWidth={5} />
      <line x1={GX + 510} y1={470} x2={GX + 610} y2={470} stroke={L.amber} strokeWidth={8} /><line x1={GX + 510} y1={500} x2={GX + 610} y2={500} stroke={L.amber} strokeWidth={8} />
      <text x={GX + 630} y={495} {...T1} fontSize={28}>C</text>
      <polyline points={`${GX + 560},500 ${GX + 560},640 ${GX + 80},640 ${GX + 80},560`} fill="none" stroke={L.wire} strokeWidth={5} /></g>}
      <text x={GX + GW / 2} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={30}>{RL ? "L in series · R to ground · output across R" : "R in series · C to ground · output across C"}</text>
      <text x={GX + GW / 2} y={850} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={32} fontWeight={800}>{RL ? "High-pass: SWAP them  →  R in series · L to ground" : "High-pass: SWAP them  →  C in series · R to ground"}</text>
    </g>;
  }
  const { width: VW, height: VH } = useVideoConfig();
  if (VH > VW) return <AbsoluteFill><svg viewBox="0 0 1080 1920" width="100%" height="100%">
    <g transform="translate(30,170)">{circuit}</g><g transform="translate(-880,930)">{right}</g></svg></AbsoluteFill>;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{circuit}{right}</svg></AbsoluteFill>;
};
ANALOG_SCENES.hpf = HPFScene;

// ------------------------------------------------------------------ real-world application: speaker crossover (illustrated, no photos)
/** {"type":"app","app":"crossover","focus":"high"|"low"|"both"} music in -> high-pass -> tweeter, low-pass -> woofer */
const Speaker: React.FC<{ x: number; y: number; s: number; t: number; amp: number; col: string; label: string; sub: string }> = ({ x, y, s, t, amp, col, label, sub }) => {
  const push = Math.sin(t) * amp * 10 * s;
  return <g>
    <rect x={x - 120 * s} y={y - 150 * s} width={240 * s} height={300 * s} rx={26 * s} fill="#25313d" stroke="#3a4a5a" strokeWidth={4} />
    <circle cx={x} cy={y} r={100 * s} fill="#1a232c" stroke="#4a5d70" strokeWidth={5} />
    <circle cx={x} cy={y} r={(78 + push / 4) * s} fill="#2e3b48" stroke={col} strokeWidth={4} />
    <circle cx={x} cy={y} r={(30 + push / 6) * s} fill={col} opacity={0.9} />
    {[1, 2, 3].map((k) => <path key={k} d={`M ${x + (115 + k * 26) * s} ${y - (40 + k * 14) * s} Q ${x + (135 + k * 26) * s} ${y} ${x + (115 + k * 26) * s} ${y + (40 + k * 14) * s}`}
      fill="none" stroke={col} strokeWidth={4} opacity={amp * (0.25 + 0.25 * Math.sin(t * 2 - k))} />)}
    <text x={x} y={y + 205 * s} textAnchor="middle" fill={col} fontFamily={SANS} fontSize={34} fontWeight={800}>{label}</text>
    <text x={x} y={y + 245 * s} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{sub}</text>
  </g>;
};
export const AppScene: React.FC<any> = ({ dur, app = "crossover", focus = "both", kind = "rc" }) => {
  const f = useCurrentFrame(); const t = f / 30;
  if (app === "radio") {
    const st = [{ f: 88.5, c: L.cyan }, { f: 93.5, c: L.green }, { f: 98.3, c: L.amber }, { f: 104.0, c: "#c792ea" }];
    const pick = 2; const dial = 88 + (98.3 - 88) * Math.min(1, t / 3);
    const sel = Math.abs(dial - st[pick].f) < 0.4;
    const sine = (x0: number, x1: number, y: number, k: number, a: number, col: string, op: number) => { const q: string[] = [];
      for (let x = x0; x <= x1; x += 3) q.push(`${x},${y - a * Math.sin(x / (6 + k * 3) - t * 10)}`); return <polyline key={`${y}${k}`} points={q.join(" ")} fill="none" stroke={col} strokeWidth={4} opacity={op} />; };
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: TUNING A RADIO</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>a band-pass filter picks ONE station out of many</text>
      {/* antenna + many stations arriving */}
      <line x1={220} y1={330} x2={220} y2={700} stroke="#8aa1b4" strokeWidth={8} />
      {[0, 1, 2].map((k) => <path key={k} d={`M ${190 - k * 30} ${330 - k * 20} Q 220 ${290 - k * 30} ${250 + k * 30} ${330 - k * 20}`} fill="none" stroke={L.electron} strokeWidth={3} opacity={0.3 + 0.3 * Math.sin(t * 3 - k)} />)}
      <text x={220} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={30} fontWeight={800}>ANTENNA</text>
      <text x={220} y={798} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>receives every station</text>
      {st.map((s, k) => sine(260, 620, 420 + k * 70, k, 18, s.c, 0.9))}
      {st.map((s, k) => <text key={k} x={640} y={428 + k * 70} fill={s.c} fontFamily={MONO} fontSize={22}>{s.f} MHz</text>)}
      {/* tuned LC band-pass with dial */}
      <rect x={780} y={380} width={360} height={300} rx={36} fill="rgba(240,160,60,0.10)" stroke={L.amber} strokeWidth={4} />
      <text x={960} y={430} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={800}>TUNED BAND-PASS</text>
      <circle cx={960} cy={545} r={80} fill="#1f2a35" stroke="#4a5d70" strokeWidth={5} />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => <line key={k} x1={960 + 70 * Math.cos(Math.PI * (0.8 + k * 0.233))} y1={545 + 70 * Math.sin(Math.PI * (0.8 + k * 0.233))} x2={960 + 80 * Math.cos(Math.PI * (0.8 + k * 0.233))} y2={545 + 80 * Math.sin(Math.PI * (0.8 + k * 0.233))} stroke="#8aa1b4" strokeWidth={3} />)}
      <line x1={960} y1={545} x2={960 + 62 * Math.cos(Math.PI * (0.8 + 1.4 * (dial - 88) / 16))} y2={545 + 62 * Math.sin(Math.PI * (0.8 + 1.4 * (dial - 88) / 16))} stroke={L.amber} strokeWidth={7} strokeLinecap="round" />
      <text x={960} y={660} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={800}>{dial.toFixed(1)} MHz</text>
      {/* only the selected station passes */}
      {sel && sine(1150, 1500, 530, pick, 26, st[pick].c, 1)}
      {!sel && <text x={1325} y={540} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>tuning…</text>}
      <g><rect x={1530} y={400} width={240} height={260} rx={26} fill="#25313d" stroke="#3a4a5a" strokeWidth={4} />
        <circle cx={1650} cy={530} r={88} fill="#1a232c" stroke="#4a5d70" strokeWidth={5} />
        <circle cx={1650} cy={530} r={sel ? 70 + 6 * Math.sin(t * 20) : 70} fill="#2e3b48" stroke={st[pick].c} strokeWidth={4} />
        <text x={1650} y={720} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={30} fontWeight={800}>{sel ? "ONE CLEAR STATION" : "SPEAKER"}</text></g>
    </svg></AbsoluteFill>;
  }
  if (app === "ecg") {
    const beat = (u: number) => { const x = ((u % 160) + 160) % 160; return x > 60 && x < 66 ? -(x - 60) * 18 : x >= 66 && x < 72 ? -(72 - x) * 18 + 30 * ((x - 66) / 6) : x >= 72 && x < 76 ? 30 - (x - 72) * 7.5 : x > 100 && x < 130 ? -14 * Math.sin((x - 100) / 30 * Math.PI) : 0; };
    const trace = (x0: number, x1: number, y: number, hum: number, col: string) => { const q: string[] = [];
      for (let x = x0; x <= x1; x += 2) q.push(`${x},${y + beat(x - t * 120) + hum * Math.sin(x / 5 - t * 40)}`); return <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={4} strokeLinejoin="round" />; };
    const fade = Math.min(1, Math.max(0, (t - 3) / 2));
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: THE ECG HEART MONITOR</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>a 50 Hz notch removes mains hum, and keeps the heartbeat</text>
      {/* patient with electrodes */}
      <g><circle cx={210} cy={360} r={60} fill="#e0b48a" /><rect x={140} y={430} width={140} height={260} rx={50} fill="#4f7fa8" />
        {[[180, 500], [240, 500], [210, 600]].map(([x, y], k) => <g key={k}><circle cx={x} cy={y} r={14} fill="#eee" stroke={L.amber} strokeWidth={4} /><path d={`M ${x} ${y} Q ${x + 120} ${y + 40} 330 520`} fill="none" stroke={L.amber} strokeWidth={3} /></g>)}
        <text x={210} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={30} fontWeight={800}>PATIENT</text>
        <text x={210} y={798} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>tiny heart signal (~1 mV)</text></g>
      {/* mains socket humming */}
      <g><rect x={420} y={760} width={110} height={130} rx={16} fill="#25313d" stroke="#4a5d70" strokeWidth={4} />
        <rect x={452} y={800} width={12} height={36} rx={4} fill="#111" /><rect x={486} y={800} width={12} height={36} rx={4} fill="#111" />
        {[0, 1, 2].map((k) => <path key={k} d={`M ${545 + k * 22} 790 q 12 35 0 70`} fill="none" stroke={L.red} strokeWidth={3} opacity={0.3 + 0.6 * Math.abs(Math.sin(t * 4 - k))} />)}
        <text x={475} y={930} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={24} fontWeight={800}>MAINS 50 Hz HUM</text></g>
      <text x={500} y={410} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>heartbeat buried in 50 Hz</text>
      {trace(340, 660, 520, 34, L.cyan)}
      {/* notch filter */}
      <g><rect x={690} y={420} width={300} height={200} rx={40} fill="rgba(240,90,90,0.10)" stroke={L.red} strokeWidth={4} />
        <path d="M 720 480 L 800 480 Q 830 480 840 580 Q 850 480 880 480 L 960 480" fill="none" stroke={L.red} strokeWidth={6} />
        <text x={840} y={610} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>50 Hz NOTCH</text></g>
      {trace(1010, 1330, 520, 34 * (1 - fade), L.green)}
      {/* monitor */}
      <g><rect x={1370} y={330} width={480} height={380} rx={30} fill="#1a232c" stroke="#4a5d70" strokeWidth={6} />
        <rect x={1395} y={355} width={430} height={290} rx={12} fill="#0b1a14" />
        {Array.from({ length: 9 }, (_, k) => <line key={k} x1={1395 + k * 54} y1={355} x2={1395 + k * 54} y2={645} stroke="#163126" strokeWidth={2} />)}
        {trace(1405, 1815, 500, 34 * (1 - fade), "#3dff9a")}
        <text x={1810} y={395} textAnchor="end" fill="#3dff9a" fontFamily={MONO} fontSize={30} fontWeight={800}>♥ 72</text>
        <text x={1610} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={30} fontWeight={800}>{fade > 0.9 ? "CLEAN HEARTBEAT" : "HEART MONITOR"}</text></g>
    </svg></AbsoluteFill>;
  }
  if (app === "charger") {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const brick = (x: number, w: number, h: number, hot: boolean, title: string, sub: string, eff: string, col: string) => <g>
      {hot && <ellipse cx={x + w / 2} cy={560} rx={w * 0.8} ry={h * 0.8} fill={L.red} opacity={0.12 + 0.12 * pulse} />}
      {hot && [0, 1, 2].map((k) => <path key={k} d={`M ${x + w * (0.3 + k * 0.2)} ${560 - h / 2 - 20} q 15 -30 0 -60 q -15 -30 0 -60`} fill="none" stroke={L.red} strokeWidth={4} opacity={0.3 + 0.5 * Math.abs(Math.sin(t * 3 + k))} />)}
      <rect x={x} y={560 - h / 2} width={w} height={h} rx={18} fill="#25313d" stroke={col} strokeWidth={5} />
      <text x={x + w / 2} y={566} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={28} fontWeight={800}>{eff}</text>
      <text x={x + w / 2} y={790} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={32} fontWeight={800}>{title}</text>
      <text x={x + w / 2} y={830} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{sub}</text></g>;
    const phone = (x: number) => <g><rect x={x} y={470} width={90} height={170} rx={16} fill="#1a232c" stroke="#4a5d70" strokeWidth={4} />
      <rect x={x + 10} y={485} width={70} height={130} rx={8} fill="#24384a" /><rect x={x + 22} y={530} width={46} height={50} rx={4} fill="none" stroke={L.green} strokeWidth={3} />
      <rect x={x + 26} y={576 - 40 * ((t / 4) % 1)} width={38} height={40 * ((t / 4) % 1)} fill={L.green} /></g>;
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: WHY CHARGERS GOT SMALL</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>old chargers wasted power as heat; modern ones switch</text>
      <line x1={960} y1={220} x2={960} y2={900} stroke={L.dim} strokeDasharray="10 10" strokeWidth={2} />
      {brick(200, 360, 260, true, "OLD LINEAR CHARGER", "big, heavy, warm to touch", "≈ 40-50%", L.amber)}
      <path d="M 560 560 C 640 560 640 560 700 560" fill="none" stroke="#3a4a5a" strokeWidth={8} />{phone(700)}
      {brick(1150, 170, 150, false, "MODERN SWITCHING CHARGER", "small, light, cool", "≈ 90%", L.green)}
      <path d="M 1320 560 C 1400 560 1400 560 1460 560" fill="none" stroke="#3a4a5a" strokeWidth={8} />{phone(1460)}
    </svg></AbsoluteFill>;
  }
  if (app === "board" || app === "zref") {
    const brd = app === "board";
    const blink = Math.sin(t * 6) > 0;
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>{brd ? "REAL WORLD: THE 5 V REGULATOR ON A MICROCONTROLLER BOARD" : "REAL WORLD: A ZENER GUARDING A SENSOR INPUT"}</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>{brd ? "a 9 V battery in, a steady 5 V for the chip, whatever the battery does" : "a resistor and a Zener hold the voltage at a safe, fixed level for a tiny current"}</text>
      {/* battery */}
      <g><rect x={150} y={430} width={170} height={260} rx={18} fill="#25313d" stroke="#4a5d70" strokeWidth={5} /><rect x={195} y={405} width={80} height={28} rx={6} fill="#4a5d70" />
        <text x={235} y={575} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={44} fontWeight={800}>{brd ? "9V" : "12V"}</text>
        <text x={235} y={740} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{brd ? "drops to 7 V as it runs down" : "noisy supply"}</text></g>
      <path d="M 320 520 C 420 520 420 540 520 540" fill="none" stroke={L.red} strokeWidth={6} />
      {/* green board */}
      <rect x={520} y={330} width={1250} height={460} rx={26} fill="#0f5132" stroke="#1d7a4c" strokeWidth={6} />
      {Array.from({ length: 14 }, (_, k) => <rect key={k} x={700 + k * 70} y={350} width={26} height={22} fill="#d4af37" />)}
      {/* regulator chip with tab */}
      <g><rect x={600} y={470} width={160} height={150} rx={8} fill="#1b1b1b" /><rect x={590} y={430} width={180} height={50} rx={6} fill="#9aa5b1" />
        <circle cx={680} cy={455} r={12} fill="#555" />
        {[0, 1, 2].map((k) => <rect key={k} x={622 + k * 50} y={620} width={16} height={50} fill="#c0c0c0" />)}
        <text x={680} y={555} textAnchor="middle" fill="#ddd" fontFamily={MONO} fontSize={30} fontWeight={800}>{brd ? "7805" : "R + Z"}</text>
        <text x={680} y={720} textAnchor="middle" fill="#e8f5ec" fontFamily={SANS} fontSize={26} fontWeight={800}>{brd ? "SERIES REGULATOR" : "SHUNT REGULATOR"}</text></g>
      <path d="M 760 545 L 1000 545" fill="none" stroke={L.green} strokeWidth={6} />
      <text x={880} y={525} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={30} fontWeight={800}>{brd ? "5.0 V" : "5.1 V"}</text>
      {/* main chip */}
      <g><rect x={1000} y={440} width={300} height={210} rx={10} fill="#1b1b1b" />
        {Array.from({ length: 8 }, (_, k) => <g key={k}><rect x={1015 + k * 36} y={420} width={14} height={20} fill="#c0c0c0" /><rect x={1015 + k * 36} y={650} width={14} height={20} fill="#c0c0c0" /></g>)}
        <text x={1150} y={555} textAnchor="middle" fill="#ddd" fontFamily={MONO} fontSize={28} fontWeight={800}>{brd ? "MICRO" : "SENSOR ADC"}</text>
        <text x={1150} y={720} textAnchor="middle" fill="#e8f5ec" fontFamily={SANS} fontSize={26} fontWeight={800}>needs a steady voltage</text></g>
      {/* LED */}
      <g><circle cx={1520} cy={545} r={40} fill={blink ? L.green : "#1d3b2a"} opacity={blink ? 1 : 0.6} />{blink && <circle cx={1520} cy={545} r={70} fill={L.green} opacity={0.2} />}
        <text x={1520} y={640} textAnchor="middle" fill="#e8f5ec" fontFamily={SANS} fontSize={26} fontWeight={800}>works reliably</text></g>
    </svg></AbsoluteFill>;
  }
  if (app === "cpu" || app === "powerbank" || app === "led") {
    const k = app; const flow = (x1: number, x2: number, y: number, col: string, lab: string) => <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={col} strokeWidth={8} strokeLinecap="round" />
      {Array.from({ length: 5 }, (_, i) => <circle key={i} cx={x1 + ((i / 5 + t * 0.5) % 1) * (x2 - x1)} cy={y} r={8} fill={col} />)}
      <text x={(x1 + x2) / 2} y={y - 24} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={30} fontWeight={800}>{lab}</text></g>;
    const conv = (x: number, name: string) => <g><rect x={x} y={460} width={220} height={170} rx={22} fill="#1f2a35" stroke={L.amber} strokeWidth={5} />
      <path d={`M ${x + 40} 545 ` + [0, 1, 2, 3].map(() => "a 14 14 0 1 0 28 0").join(" ")} fill="none" stroke={L.amber} strokeWidth={5} />
      <text x={x + 110} y={600} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={800}>{name}</text></g>;
    const title = k === "cpu" ? "REAL WORLD: FEEDING A LAPTOP PROCESSOR" : k === "powerbank" ? "REAL WORLD: INSIDE A POWER BANK" : "REAL WORLD: A TORCH THAT STAYS BRIGHT";
    const sub = k === "cpu" ? "a buck converter turns 12-19 V into about 1 V at huge current, right next to the chip"
      : k === "powerbank" ? "a boost converter lifts the 3.7 V battery up to the 5 V your phone expects" : "a buck-boost keeps the LED current steady whether the battery is above or below the LED voltage";
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>{title}</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>{sub}</text>
      {k === "cpu" && <g>
        <rect x={140} y={430} width={260} height={230} rx={20} fill="#25313d" stroke="#4a5d70" strokeWidth={5} /><text x={270} y={560} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={34} fontWeight={800}>19 V</text>
        <text x={270} y={710} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>LAPTOP ADAPTER</text>
        {flow(400, 700, 545, L.cyan, "19 V")}{conv(700, "BUCK")}{flow(920, 1300, 545, L.green, "1.1 V · 60 A")}
        <rect x={1300} y={390} width={330} height={310} rx={14} fill="#1b1b1b" stroke="#4a5d70" strokeWidth={5} /><rect x={1360} y={450} width={210} height={190} rx={8} fill="#8a96a3" />
        <text x={1465} y={555} textAnchor="middle" fill="#1b1b1b" fontFamily={MONO} fontSize={34} fontWeight={800}>CPU</text>
        <text x={1465} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>needs ~1 V, very steady</text></g>}
      {k === "powerbank" && <g>
        <rect x={140} y={400} width={180} height={300} rx={30} fill="#2e5a87" stroke="#4a5d70" strokeWidth={5} /><rect x={190} y={380} width={80} height={24} rx={6} fill="#4a5d70" />
        <text x={230} y={560} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={36} fontWeight={800}>3.7V</text>
        <text x={230} y={750} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>LITHIUM CELL</text>
        <text x={230} y={786} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={22}>4.2 V full → 3.0 V empty</text>
        {flow(320, 700, 545, L.cyan, "3.7 V")}{conv(700, "BOOST")}{flow(920, 1360, 545, L.green, "5.0 V")}
        <rect x={1360} y={420} width={60} height={250} rx={10} fill="#3a4a5a" />
        <rect x={1440} y={360} width={190} height={370} rx={30} fill="#1a232c" stroke="#4a5d70" strokeWidth={5} /><rect x={1458} y={385} width={154} height={300} rx={14} fill="#24384a" />
        <rect x={1505} y={470} width={60} height={110} rx={8} fill="none" stroke={L.green} strokeWidth={4} /><rect x={1511} y={574 - 98 * ((t / 4) % 1)} width={48} height={98 * ((t / 4) % 1)} fill={L.green} />
        <text x={1535} y={780} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>PHONE CHARGING</text></g>}
      {k === "led" && <g>
        {(() => { const bv = 4.2 - 1.2 * ((t / 8) % 1); return <g>
          <rect x={140} y={400} width={180} height={300} rx={30} fill="#2e5a87" stroke="#4a5d70" strokeWidth={5} /><rect x={190} y={380} width={80} height={24} rx={6} fill="#4a5d70" />
          <text x={230} y={560} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={36} fontWeight={800}>{bv.toFixed(1)}V</text>
          <text x={230} y={750} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>BATTERY</text>
          <text x={230} y={786} textAnchor="middle" fill={bv > 3.4 ? L.amber : L.cyan} fontFamily={SANS} fontSize={24} fontWeight={700}>{bv > 3.4 ? "above LED voltage: step DOWN" : "below LED voltage: step UP"}</text></g>; })()}
        {flow(320, 700, 545, L.cyan, "3.0-4.2 V")}{conv(700, "BUCK-BOOST")}{flow(920, 1300, 545, L.green, "3.4 V steady")}
        <path d="M 1330 470 L 1530 410 L 1530 680 L 1330 620 Z" fill="#3a4a5a" stroke="#4a5d70" strokeWidth={5} />
        <circle cx={1360} cy={545} r={50} fill="#fff8d0" /><path d="M 1530 410 L 1850 300 L 1850 790 L 1530 680 Z" fill="#fff3a0" opacity={0.35} />
        <text x={1450} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>SAME BRIGHTNESS</text></g>}
    </svg></AbsoluteFill>;
  }
  if (app === "zapper") {
    const zap = Math.sin(t * 9) > 0.7;
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: THE BUG ZAPPER</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>a small battery or mains input, multiplied up to thousands of volts by a diode-capacitor ladder</text>
      <rect x={160} y={420} width={200} height={260} rx={20} fill="#25313d" stroke="#4a5d70" strokeWidth={5} /><text x={260} y={560} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={32} fontWeight={800}>AC</text>
      <text x={260} y={730} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>LOW VOLTAGE</text>
      <path d="M 360 550 L 520 550" stroke={L.cyan} strokeWidth={6} />
      <rect x={520} y={430} width={520} height={240} rx={20} fill="#1f2a35" stroke={L.amber} strokeWidth={5} />
      {[0, 1, 2, 3, 4, 5].map((k) => <g key={k}><line x1={560 + k * 80} y1={470} x2={600 + k * 80} y2={630} stroke={L.amber} strokeWidth={4} />
        <rect x={548 + k * 80} y={480} width={24} height={40} fill="none" stroke={L.amber} strokeWidth={3} /><rect x={588 + k * 80} y={580} width={24} height={40} fill="none" stroke={L.amber} strokeWidth={3} /></g>)}
      <text x={780} y={720} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={28} fontWeight={800}>DIODE-CAPACITOR MULTIPLIER</text>
      <path d="M 1040 550 L 1200 550" stroke={L.red} strokeWidth={6} /><text x={1120} y={530} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={28} fontWeight={800}>~2000 V</text>
      <rect x={1200} y={330} width={480} height={440} rx={40} fill="#1a232c" stroke="#4a5d70" strokeWidth={5} />
      {Array.from({ length: 11 }, (_, k) => <line key={k} x1={1240 + k * 40} y1={360} x2={1240 + k * 40} y2={740} stroke={k % 2 ? "#8aa1b4" : "#c6d2dc"} strokeWidth={4} />)}
      <rect x={1240} y={360} width={400} height={380} fill="#6a5cff" opacity={0.15 + 0.1 * Math.sin(t * 4)} />
      {zap && <polyline points="1420,520 1440,560 1428,560 1452,610" fill="none" stroke="#fff3a0" strokeWidth={7} />}
      <g transform={`translate(${1440 + 30 * Math.sin(t * 2)},${520 + 20 * Math.cos(t * 3)})`}><ellipse cx={0} cy={0} rx={14} ry={9} fill="#333" /><ellipse cx={-6} cy={-10} rx={10} ry={6} fill="#ccc" opacity={0.7} /><ellipse cx={6} cy={-10} rx={10} ry={6} fill="#ccc" opacity={0.7} /></g>
      <text x={1440} y={820} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>HIGH-VOLTAGE GRID</text>
    </svg></AbsoluteFill>;
  }
  if (app === "solar") {
    const day = Math.sin(t * 0.8) > -0.2;
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <rect x={0} y={0} width={1920} height={1080} fill={day ? "rgba(255,220,120,0.08)" : "rgba(20,30,70,0.18)"} />
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: SOLAR PANEL CHARGING A BATTERY</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>a Schottky diode lets charge in by day, and stops the battery draining back at night</text>
      {day ? <circle cx={260} cy={290} r={60} fill="#ffd24a" /> : <circle cx={260} cy={290} r={50} fill="#d8dde8" />}
      <text x={260} y={390} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26} fontWeight={700}>{day ? "DAY" : "NIGHT"}</text>
      <g transform="translate(230,470) skewX(-12)">{Array.from({ length: 12 }, (_, k) => <rect key={k} x={(k % 4) * 90} y={Math.floor(k / 4) * 70} width={84} height={64} fill="#1f3f7a" stroke="#8aa1b4" strokeWidth={3} />)}</g>
      <text x={400} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>SOLAR PANEL</text>
      <path d="M 640 580 L 860 580" stroke={day ? L.green : L.dim} strokeWidth={7} />
      <g transform="translate(920,580)"><polygon points="-40,-36 -40,36 30,0" fill={day ? "rgba(46,196,160,0.3)" : L.bg0} stroke={L.amber} strokeWidth={6} /><line x1={30} y1={-36} x2={30} y2={36} stroke={L.amber} strokeWidth={6} /></g>
      <text x={920} y={680} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={28} fontWeight={800}>SCHOTTKY</text>
      <text x={920} y={720} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{day ? "conducts: only 0.3 V lost" : "blocks: battery can't leak back"}</text>
      {day && Array.from({ length: 6 }, (_, k) => <circle key={k} cx={640 + ((k / 6 + t * 0.4) % 1) * 560} cy={580} r={9} fill={L.electron} />)}
      <path d="M 960 580 L 1200 580" stroke={day ? L.green : L.dim} strokeWidth={7} />
      <rect x={1200} y={450} width={340} height={260} rx={22} fill="#25313d" stroke="#4a5d70" strokeWidth={5} />
      <rect x={1240} y={500} width={260} height={150} rx={10} fill="none" stroke={L.green} strokeWidth={5} />
      <rect x={1248} y={508} width={244 * (0.4 + 0.5 * ((t / 10) % 1))} height={134} fill={L.green} opacity={0.8} />
      <text x={1370} y={770} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>12 V BATTERY</text>
    </svg></AbsoluteFill>;
  }
  if (app === "relay") {
    const on = Math.sin(t * 1.2) > 0;
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: A TINY PIN SWITCHING A BIG LOAD</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>a microcontroller pin gives ~1 mA; one transistor turns that into the ~100 mA a relay or motor needs</text>
      <rect x={140} y={400} width={300} height={260} rx={14} fill="#1b1b1b" />{Array.from({ length: 6 }, (_, k) => <g key={k}><rect x={160 + k * 46} y={380} width={16} height={20} fill="#c0c0c0" /><rect x={160 + k * 46} y={660} width={16} height={20} fill="#c0c0c0" /></g>)}
      <text x={290} y={540} textAnchor="middle" fill="#ddd" fontFamily={MONO} fontSize={30} fontWeight={800}>MICRO</text>
      <text x={290} y={740} textAnchor="middle" fill={on ? L.green : L.dim} fontFamily={MONO} fontSize={26} fontWeight={800}>pin: {on ? "HIGH 5 V · 1 mA" : "LOW 0 V"}</text>
      <path d="M 440 530 L 700 530" stroke={on ? L.cyan : L.dim} strokeWidth={6} />
      <circle cx={760} cy={530} r={70} fill={L.bg0} stroke={on ? L.green : L.amber} strokeWidth={6} /><text x={760} y={540} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={800}>NPN</text>
      <text x={760} y={650} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={26} fontWeight={800}>{on ? "SATURATED: switch ON" : "CUTOFF: switch OFF"}</text>
      <path d="M 780 460 L 780 330 L 1100 330" stroke={on ? L.electron : L.dim} strokeWidth={6} fill="none" />
      <rect x={1100} y={260} width={260} height={150} rx={14} fill="#2d5ea8" /><text x={1230} y={345} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={30} fontWeight={800}>RELAY</text>
      <text x={1230} y={450} textAnchor="middle" fill={L.electron} fontFamily={MONO} fontSize={24} fontWeight={800}>{on ? "100 mA" : "0 mA"}</text>
      <path d="M 1360 335 L 1500 335" stroke={on ? L.amber : L.dim} strokeWidth={6} />
      <g transform="translate(1600,500)"><circle r={110} fill="#25313d" stroke="#4a5d70" strokeWidth={6} />
        {[0, 1, 2].map((k) => <rect key={k} x={-14} y={-100} width={28} height={90} rx={10} fill="#8aa1b4" transform={`rotate(${k * 120 + (on ? t * 400 : 0)})`} />)}<circle r={18} fill="#8aa1b4" /></g>
      <text x={1600} y={680} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>{on ? "FAN RUNNING" : "FAN OFF"}</text>
    </svg></AbsoluteFill>;
  }
  if (app === "thermal") {
    const T = 25 + 50 * ((t / 6) % 1); const b = 100 * (1 + (T - 25) / 50);
    const fixIc = 2 * b / 100, vdIc = 1.924 + (2.004 - 1.924) * Math.min(1, (b - 100) / 100);
    const sine = (x0: number, y: number, clip: number, col: string) => { const q: string[] = []; for (let x = 0; x <= 520; x += 4) { let v = 70 * Math.sin(x / 30 - t * 4); v = Math.max(-clip, Math.min(clip, v)); q.push(`${x0 + x},${y - v}`); } return <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} />; };
    const clipF = Math.max(15, 70 - (fixIc - 2) * 55);
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: AN AMPLIFIER WARMING UP</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>as a transistor heats, its β rises; good biasing keeps the sound clean anyway</text>
      <rect x={120} y={260} width={160} height={560} rx={80} fill="#25313d" stroke="#4a5d70" strokeWidth={5} />
      <rect x={160} y={780 - 480 * (T - 25) / 50} width={80} height={480 * (T - 25) / 50 + 20} rx={40} fill={L.red} />
      <text x={200} y={880} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={34} fontWeight={800}>{T.toFixed(0)} °C</text>
      <text x={200} y={930} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={800}>β ≈ {b.toFixed(0)}</text>
      <text x={700} y={300} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={32} fontWeight={800}>FIXED BIAS: IC = {fixIc.toFixed(2)} mA</text>
      {sine(440, 450, clipF, L.amber)}<text x={700} y={590} textAnchor="middle" fill={clipF < 60 ? L.red : L.dim} fontFamily={SANS} fontSize={26} fontWeight={700}>{clipF < 60 ? "Q-point drifts → output clips → distorted sound" : "sounds fine… for now"}</text>
      <text x={700} y={680} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={32} fontWeight={800}>VOLTAGE-DIVIDER BIAS: IC = {vdIc.toFixed(2)} mA</text>
      {sine(440, 820, 999, L.green)}<text x={700} y={960} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={26} fontWeight={700}>Q-point stays put → clean sound</text>
      <g transform="translate(1500,560)"><path d="M -120 -60 L -40 -60 L 60 -160 L 60 160 L -40 60 L -120 60 Z" fill="#25313d" stroke="#4a5d70" strokeWidth={6} />
        {[0, 1, 2].map((k) => <path key={k} d={`M ${110 + k * 50} -${70 + k * 30} Q ${150 + k * 60} 0 ${110 + k * 50} ${70 + k * 30}`} fill="none" stroke={L.green} strokeWidth={5} opacity={0.4 + 0.5 * Math.abs(Math.sin(t * 4 - k))} />)}</g>
    </svg></AbsoluteFill>;
  }
  if (app === "adc") {
    const noisy = (x: number, a: number, b: number) => a * Math.sin(x / 40 - t * 4) + b * Math.sin(x / 4 - t * 30);
    const wv = (x0: number, x1: number, y: number, a: number, b: number, col: string) => { const q: string[] = [];
      for (let x = x0; x <= x1; x += 3) q.push(`${x},${y - noisy(x, a, b)}`); return <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={4} />; };
    const lit = (k: number) => 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + k));
    return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: INSIDE YOUR PHONE'S MICROPHONE</text>
      <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>a filter (very often a Butterworth) cleans the sound before it becomes numbers</text>
      {/* microphone */}
      <g><rect x={130} y={420} width={120} height={200} rx={60} fill="#25313d" stroke="#3a4a5a" strokeWidth={4} />
        {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={150} y1={460 + k * 28} x2={230} y2={460 + k * 28} stroke="#4a5d70" strokeWidth={4} />)}
        <rect x={180} y={620} width={20} height={70} fill="#3a4a5a" /><rect x={140} y={690} width={100} height={16} rx={8} fill="#3a4a5a" />
        <text x={190} y={760} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={32} fontWeight={800}>MICROPHONE</text>
        <text x={190} y={798} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>voice + high-pitched noise</text></g>
      {wv(270, 600, 520, 40, 16, L.cyan)}
      {/* Butterworth filter */}
      <g><rect x={610} y={430} width={300} height={180} rx={40} fill="rgba(46,196,160,0.12)" stroke={L.green} strokeWidth={4} />
        <path d={`M 650 520 Q 700 470 760 470 L 790 470 Q 830 470 870 560`} fill="none" stroke={L.green} strokeWidth={6} />
        <text x={760} y={590} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={26} fontWeight={800}>BUTTERWORTH</text>
        <text x={760} y={652} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>flat for the voice · cuts the rest</text></g>
      {wv(920, 1180, 520, 40, 0, L.green)}
      {/* ADC chip */}
      <g><rect x={1190} y={420} width={220} height={200} rx={18} fill="#1f2a35" stroke="#4a5d70" strokeWidth={4} />
        {Array.from({ length: 6 }, (_, k) => <g key={k}><rect x={1205 + k * 34} y={404} width={14} height={16} fill="#8aa1b4" /><rect x={1205 + k * 34} y={620} width={14} height={16} fill="#8aa1b4" /></g>)}
        <text x={1300} y={530} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={40} fontWeight={800}>ADC</text>
        <text x={1300} y={690} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>analog → digital</text></g>
      {/* numbers stream to the phone */}
      {Array.from({ length: 7 }, (_, k) => <text key={k} x={1430 + ((k * 40 + f * 3) % 240)} y={530} fill={L.electron} fontFamily={MONO} fontSize={26} opacity={lit(k)}>{(k * 37 + Math.floor(t * 4)) % 2 ? "1" : "0"}</text>)}
      <g><rect x={1690} y={350} width={170} height={330} rx={30} fill="#1a232c" stroke="#4a5d70" strokeWidth={5} />
        <rect x={1705} y={380} width={140} height={260} rx={12} fill="#24384a" />
        {[0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={1725 + k * 20} y={510 - 40 * lit(k)} width={12} height={80 * lit(k)} rx={4} fill={L.green} />)}
        <text x={1775} y={740} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={30} fontWeight={800}>CLEAN VOICE</text></g>
    </svg></AbsoluteFill>;
  }
  const hiOn = focus !== "low", loOn = focus !== "high";
  const mix = (x: number, a: number, b: number) => a * Math.sin(x / 70 - t * 3) + b * Math.sin(x / 9 - t * 18);
  const wave = (x0: number, x1: number, y: number, a: number, b: number, col: string, op = 1) => {
    const pts: string[] = []; for (let x = x0; x <= x1; x += 4) pts.push(`${x},${y - mix(x, a, b)}`);
    return <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={4} opacity={op} />;
  };
  // amplifier
  const amp = <g>
    <rect x={90} y={400} width={260} height={280} rx={30} fill="#25313d" stroke="#3a4a5a" strokeWidth={4} />
    {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={120 + k * 44} y={430} width={30} height={60} rx={6} fill={L.cyan} opacity={0.25 + 0.75 * Math.abs(Math.sin(t * 3 + k))} />)}
    <circle cx={220} cy={590} r={50} fill="#1a232c" stroke={L.amber} strokeWidth={5} />
    <line x1={220} y1={590} x2={220 + 36 * Math.cos(-2.2 + Math.sin(t) * 0.4)} y2={590 + 36 * Math.sin(-2.2 + Math.sin(t) * 0.4)} stroke={L.amber} strokeWidth={6} strokeLinecap="round" />
    <text x={220} y={740} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>AMPLIFIER</text>
    <text x={220} y={780} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>music: bass + treble mixed</text>
  </g>;
  const filt = (x: number, y: number, hp: boolean, on: boolean) => <g opacity={on ? 1 : 0.25}>
    <rect x={x - 140} y={y - 60} width={280} height={120} rx={60} fill={hp ? "rgba(46,196,160,0.12)" : "rgba(240,160,60,0.12)"} stroke={hp ? L.green : L.amber} strokeWidth={4} />
    {hp ? <g><line x1={x - 100} y1={y - 26} x2={x - 100} y2={y + 26} stroke={L.green} strokeWidth={7} /><line x1={x - 84} y1={y - 26} x2={x - 84} y2={y + 26} stroke={L.green} strokeWidth={7} />
      <text x={x + 25} y={y + 11} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={800}>HIGH-PASS</text></g>
      : <text x={x} y={y + 12} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={30} fontWeight={800}>LOW-PASS</text>}
  </g>;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>REAL WORLD: THE SPEAKER CROSSOVER</text>
    <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>inside almost every hi-fi speaker box</text>
    {amp}
    {wave(350, 700, 540, 40, 14, L.cyan)}
    <path d="M 700 540 C 760 540 760 330 820 330" fill="none" stroke={L.wire} strokeWidth={5} />
    <path d="M 700 540 C 760 540 760 770 820 770" fill="none" stroke={L.wire} strokeWidth={5} />
    {filt(930, 330, true, hiOn)}{filt(930, 770, false, loOn)}
    {wave(1070, 1470, 330, 0, 18, L.green, hiOn ? 1 : 0.2)}
    {wave(1070, 1430, 770, 45, 0, L.amber, loOn ? 1 : 0.2)}
    <g opacity={hiOn ? 1 : 0.3}><Speaker x={1560} y={300} s={0.7} t={t * 18} amp={hiOn ? 1 : 0} col={L.green} label="TWEETER" sub="small cone · high notes" /></g>
    <g opacity={loOn ? 1 : 0.3}><Speaker x={1560} y={720} s={1.05} t={t * 3} amp={loOn ? 1 : 0} col={L.amber} label="WOOFER" sub="big cone · bass" /></g>
  </svg></AbsoluteFill>;
};
ANALOG_SCENES.app = AppScene;

// ------------------------------------------------------------------ Butterworth low-pass filter (LC ladder, orders 1-4)
/** {"type":"bw","mode":"build"|"orders"|"flat"|"signal"|"calc","n":2}
 *  Doubly terminated LC ladder, Rs = RL = 1 kΩ, fc = 1 kHz. Element g-values from the Butterworth table.
 *  |H| (normalised to the pass-band) = 1/sqrt(1+(f/fc)^2n). */
const BW_G: Record<number, number[]> = { 1: [2], 2: [1.414, 1.414], 3: [1, 2, 1], 4: [0.765, 1.848, 1.848, 0.765] };
const bwMag = (r: number, n: number) => 1 / Math.sqrt(1 + Math.pow(r, 2 * n));
const cheb4 = (r: number) => { // 4th-order Chebyshev, 1 dB ripple (for comparison only), normalised to its pass-band peak
  const eps = 0.5088; const T = r <= 1 ? Math.cos(4 * Math.acos(r)) : Math.cosh(4 * Math.acosh(r)); return 1 / Math.sqrt(1 + eps * eps * T * T); };
export const ButterScene: React.FC<any> = ({ dur, mode = "orders", n = 2 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const showN = mode === "orders" ? Math.min(4, 1 + Math.floor(p * 4)) : mode === "signal" ? Math.min(4, 1 + Math.floor(p * 4)) : n;
  const fmtL = (h: number) => h >= 1 ? `${+h.toFixed(2)} H` : `${+(h * 1000).toFixed(0)} mH`;
  const fmtC = (c: number) => `${+(c * 1e9).toFixed(0)} nF`;
  const W = 2 * Math.PI * 1000, R = 1000;
  // ---- left: the ladder for order showN
  const T = 300, B = 760, XS = 150, YS = 530;
  const g = BW_G[showN] || BW_G[2];
  const xs = g.map((_, k) => 420 + k * (430 / Math.max(1, g.length)));          // element x positions
  const XL = 860;
  const reveal = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const coilH = (x: number) => `M ${x - 52} ${T} ` + [0, 1, 2, 3].map(() => `a 13 15 0 1 1 26 0`).join(" ");
  const ladder = <g>
    <circle cx={XS} cy={YS} r={56} fill={L.bg0} stroke={L.cyan} strokeWidth={6} />
    <path d={`M ${XS - 32} ${YS} Q ${XS - 16} ${YS - 30} ${XS} ${YS} T ${XS + 32} ${YS}`} fill="none" stroke={L.cyan} strokeWidth={5} />
    <text x={XS} y={YS + 100} textAnchor="middle" {...T1} fontSize={30} fill={L.cyan}>Vin</text>
    <polyline points={`${XS},${YS - 56} ${XS},${T} ${215},${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
    <Res x={285} y={T} ohm={R} label="Rs" horizontal />
    <line x1={355} y1={T} x2={XL} y2={T} stroke={L.wire} strokeWidth={6} />
    <polyline points={`${XS},${YS + 56} ${XS},${B} ${XL},${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
    {g.map((gv, k) => { const x = xs[k], series = k % 2 === 0, o = reveal(0.15 + k * 0.17);
      return series ? <g key={k} opacity={o}><rect x={x - 56} y={T - 20} width={112} height={40} fill={L.bg0} />
          <path d={coilH(x)} fill="none" stroke={L.amber} strokeWidth={6} />
          <text x={x} y={T - 44} textAnchor="middle" {...T1} fontSize={26}>L{k + 1}</text>
          <text x={x} y={T + 56} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{fmtL(gv * R / W)}</text></g>
        : <g key={k} opacity={o}><line x1={x} y1={T} x2={x} y2={YS - 14} stroke={L.wire} strokeWidth={6} /><line x1={x} y1={YS + 14} x2={x} y2={B} stroke={L.wire} strokeWidth={6} />
          <line x1={x - 44} y1={YS - 14} x2={x + 44} y2={YS - 14} stroke={L.amber} strokeWidth={9} /><line x1={x - 44} y1={YS + 14} x2={x + 44} y2={YS + 14} stroke={L.amber} strokeWidth={9} />
          <text x={x + 58} y={YS + 2} {...T1} fontSize={26}>C{k + 1}</text>
          <text x={x + 58} y={YS + 32} fill={L.dim} fontFamily={MONO} fontSize={22}>{fmtC(gv / (R * W))}</text></g>; })}
    {/* a lone shunt capacitor for n = 1 */}
    <g opacity={reveal(0.02)}><line x1={XL} y1={T} x2={XL} y2={YS - 70} stroke={L.wire} strokeWidth={6} /><line x1={XL} y1={YS + 70} x2={XL} y2={B} stroke={L.wire} strokeWidth={6} />
      <Res x={XL} y={YS} ohm={R} label="RL" />
      <text x={XL} y={B + 40} textAnchor="middle" {...T1} fontSize={28} fill={L.green}>Vout (across RL)</text></g>
    <text x={520} y={B + 70} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={32} fontWeight={800}>ORDER n = {showN}</text>
    <text x={520} y={B + 110} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{showN} reactive part{showN > 1 ? "s" : ""} (L and C)</text>
  </g>;
  // ---- right side
  const GX = 1010, GW = 820;
  let right: React.ReactNode = null;
  const X0 = GX, Y0 = 800, H = 520, lx = (rr: number) => X0 + (Math.log10(rr) + 1) / 2 * GW, ly = (gg: number) => Y0 - gg * H;
  const axes = <g>
    <line x1={X0} y1={Y0} x2={X0 + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={Y0} x2={X0} y2={Y0 - H - 20} stroke={L.dim} strokeWidth={3} />
    <line x1={X0} y1={ly(1)} x2={X0 + GW} y2={ly(1)} stroke={L.dim} strokeDasharray="8 8" strokeWidth={2} />
    <text x={X0 - 14} y={ly(1) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>100%</text>
    <line x1={lx(1)} y1={Y0} x2={lx(1)} y2={ly(0.707)} stroke={L.amber} strokeDasharray="8 8" strokeWidth={3} />
    <line x1={X0} y1={ly(0.707)} x2={lx(1)} y2={ly(0.707)} stroke={L.amber} strokeDasharray="8 8" strokeWidth={3} />
    <text x={X0 - 14} y={ly(0.707) + 8} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={22}>70.7%</text>
    <text x={lx(1)} y={Y0 + 40} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={700}>fc = 1 kHz</text>
    <text x={X0} y={Y0 + 40} fill={L.dim} fontFamily={MONO} fontSize={22}>100 Hz</text><text x={X0 + GW} y={Y0 + 40} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>10 kHz</text>
  </g>;
  const curve = (fn: (r: number) => number, col: string, w = 6, op = 1) => { const pts: string[] = [];
    for (let k = 0; k <= 240; k++) { const rr = Math.pow(10, -1 + 2 * k / 240); pts.push(`${lx(rr)},${ly(Math.min(1.02, fn(rr)))}`); }
    return <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={w} opacity={op} strokeLinejoin="round" />; };
  const COL = ["#8aa1b4", L.cyan, L.green, L.amber];
  if (mode === "orders" || mode === "build" || mode === "calc") {
    const upto = mode === "orders" ? showN : n;
    right = mode === "calc" ? (() => {
      const g2 = BW_G[n]; const lines = [`n = ${n}:  g-values = ${g2.join(", ")}`, `L = g × R ÷ (2π fc)`, `L1 = ${g2[0]} × 1000 ÷ 6283 = ${fmtL(g2[0] * R / W)}`, `C = g ÷ (2π fc × R)`, `C2 = ${g2[1]} ÷ (6283 × 1000) = ${fmtC(g2[1] / (R * W))}`];
      return <g>{lines.map((l, k) => <text key={k} x={GX} y={300 + k * 105} fill={k % 2 ? L.text : k === 0 ? L.amber : L.green} fontFamily={MONO} fontSize={k % 2 ? 40 : 32} fontWeight={700}
        opacity={interpolate(p, [k * 0.17, k * 0.17 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>; })()
    : <g>
      <text x={X0 + GW / 2} y={130} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>BUTTERWORTH RESPONSE</text>
      {axes}
      {Array.from({ length: upto }, (_, k) => k + 1).map((m) => <g key={m}>{curve((r) => bwMag(r, m), COL[m - 1], m === upto ? 7 : 4, m === upto ? 1 : 0.55)}
        <text x={lx(2.2) + 12} y={ly(bwMag(2.2, m)) + 8} fill={COL[m - 1]} fontFamily={MONO} fontSize={24} fontWeight={700}>n={m}</text></g>)}
      <text x={X0 + GW / 2} y={960} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>
        n = {upto}:  at 2 kHz → {Math.round(bwMag(2, upto) * 100)}%   ·   falls {20 * upto} dB per decade</text>
    </g>;
  } else if (mode === "flat") {
    right = <g>
      <text x={X0 + GW / 2} y={130} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>WHY "MAXIMALLY FLAT"?</text>
      {axes}
      {curve(cheb4, L.red, 5, p > 0.05 ? 1 : 0)}
      {p > 0.45 && curve((r) => bwMag(r, 4), L.green, 7)}
      <text x={X0 + 30} y={ly(1) - 30} fill={L.red} fontFamily={SANS} fontSize={26} fontWeight={700} opacity={p > 0.05 ? 1 : 0}>other design: wavy (ripple)</text>
      <text x={X0 + 30} y={ly(1) - 64} fill={L.green} fontFamily={SANS} fontSize={26} fontWeight={700} opacity={p > 0.45 ? 1 : 0}>Butterworth: perfectly flat</text>
    </g>;
  } else if (mode === "signal") {
    const amp = 120, cy1 = 300, cy2 = 720, a = bwMag(0.5, showN), b = bwMag(3, showN);
    const w = (cy: number, A: number, Bm: number, col: string) => { const pts: string[] = [];
      for (let x = 0; x <= GW; x += 4) { const t = x / GW * 4 * Math.PI; pts.push(`${GX + x},${cy - (A * 0.6 * Math.sin(t) + Bm * 0.4 * Math.sin(6 * t + f / 6)) * amp}`); }
      return <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={5} />; };
    right = <g>
      <text x={GX + GW / 2} y={140} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={32} fontWeight={800}>INPUT: 500 Hz tone + 3 kHz noise</text>
      {w(cy1, 1, 1, L.cyan)}
      <text x={GX + GW / 2} y={560} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={32} fontWeight={800}>OUTPUT, ORDER n = {showN}</text>
      {w(cy2, a, b, L.green)}
      <text x={GX + GW / 2} y={930} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>500 Hz kept: {Math.round(a * 100)}%    3 kHz left: {+(b * 100).toFixed(1)}%</text>
    </g>;
  }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(30,150)">{ladder}</g><g transform="translate(-890,950)">{right}</g></>);
  return svg(<>{ladder}{right}</>);
};
ANALOG_SCENES.bw = ButterScene;

// ------------------------------------------------------------------ Band-pass filter: RC high-pass + RC low-pass, and series-resonant RLC
/** {"type":"bp","mode":"build"|"combine"|"run"|"resonant"|"calc","f":1000,"q":"both"}
 *  Cascade: C1 = 1.59 µF, R1 = 1 kΩ (fL = 100 Hz) then R2 = 10 kΩ, C2 = 1.59 nF (fH = 10 kHz). Exact complex response (with loading).
 *  Resonant: L = 25.3 mH, C = 1 µF (f0 = 1 kHz), R = 100 Ω (Q ≈ 1.6) or 20 Ω (Q ≈ 8). */
type Cx = [number, number];
const cadd = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]], cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: Cx, b: Cx): Cx => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cabs = (a: Cx) => Math.hypot(a[0], a[1]), carg = (a: Cx) => Math.atan2(a[1], a[0]);
const BP = { C1: 1.59e-6, R1: 1000, R2: 10000, C2: 1.59e-9, L: 0.0253, C: 1e-6 };
const bpCascade = (fr: number): Cx => { const w = 2 * Math.PI * fr; const zc1: Cx = [0, -1 / (w * BP.C1)], zc2: Cx = [0, -1 / (w * BP.C2)];
  const z2 = cadd([BP.R2, 0], zc2); const zsh = cdiv(cmul([BP.R1, 0], z2), cadd([BP.R1, 0], z2));
  const v1 = cdiv(zsh, cadd(zsh, zc1)); return cmul(v1, cdiv(zc2, z2)); };
const bpRes = (fr: number, r: number): Cx => { const w = 2 * Math.PI * fr; return cdiv([r, 0], [r, w * BP.L - 1 / (w * BP.C)]); };
export const BandPassScene: React.FC<any> = ({ dur, mode = "build", f: fin = 1000, q = "both" }) => {
  const fr = useCurrentFrame();
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const reveal = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const res = mode === "resonant";
  const T = 300, B = 760, XS = 150, YS = 530;
  const cap = (x: number, y: number, vert: boolean, lab: string, val: string) => vert
    ? <g><line x1={x} y1={T} x2={x} y2={y - 14} stroke={L.wire} strokeWidth={6} /><line x1={x} y1={y + 14} x2={x} y2={B} stroke={L.wire} strokeWidth={6} />
        <line x1={x - 44} y1={y - 14} x2={x + 44} y2={y - 14} stroke={L.amber} strokeWidth={9} /><line x1={x - 44} y1={y + 14} x2={x + 44} y2={y + 14} stroke={L.amber} strokeWidth={9} />
        <text x={x + 56} y={y + 2} {...T1} fontSize={26}>{lab}</text><text x={x + 56} y={y + 32} fill={L.dim} fontFamily={MONO} fontSize={22}>{val}</text></g>
    : <g><rect x={x - 30} y={T - 50} width={60} height={100} fill={L.bg0} />
        <line x1={x - 14} y1={T - 48} x2={x - 14} y2={T + 48} stroke={L.amber} strokeWidth={9} /><line x1={x + 14} y1={T - 48} x2={x + 14} y2={T + 48} stroke={L.amber} strokeWidth={9} />
        <text x={x} y={T - 66} textAnchor="middle" {...T1} fontSize={26}>{lab}</text><text x={x} y={T + 80} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{val}</text></g>;
  const src = <g><circle cx={XS} cy={YS} r={56} fill={L.bg0} stroke={L.cyan} strokeWidth={6} />
    <path d={`M ${XS - 32} ${YS} Q ${XS - 16} ${YS - 30} ${XS} ${YS} T ${XS + 32} ${YS}`} fill="none" stroke={L.cyan} strokeWidth={5} />
    <text x={XS} y={YS + 100} textAnchor="middle" {...T1} fontSize={30} fill={L.cyan}>Vin</text>
    <polyline points={`${XS},${YS - 56} ${XS},${T}`} fill="none" stroke={L.wire} strokeWidth={6} /><polyline points={`${XS},${YS + 56} ${XS},${B}`} fill="none" stroke={L.wire} strokeWidth={6} /></g>;
  const left = res ? <g>{src}
      <line x1={XS} y1={T} x2={XS + 520} y2={T} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={B} x2={XS + 640} y2={B} stroke={L.wire} strokeWidth={6} />
      <rect x={300} y={T - 22} width={130} height={44} fill={L.bg0} /><path d={`M 305 ${T} ` + [0, 1, 2, 3].map(() => `a 15 16 0 1 1 30 0`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />
      <text x={365} y={T - 40} textAnchor="middle" {...T1} fontSize={26}>L</text><text x={365} y={T + 56} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>25.3 mH</text>
      {cap(540, 0, false, "C", "1 µF")}
      <line x1={670} y1={T} x2={790} y2={T} stroke={L.wire} strokeWidth={6} />
      <polyline points={`790,${T} 790,${YS - 70}`} fill="none" stroke={L.wire} strokeWidth={6} /><polyline points={`790,${YS + 70} 790,${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
      <Res x={790} y={YS} ohm={q === "narrow" ? 20 : 100} label="R" />
      <text x={790} y={B + 44} textAnchor="middle" {...T1} fontSize={28} fill={L.green}>Vout (across R)</text>
      <text x={460} y={B + 100} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={30} fontWeight={800}>L and C in series · output across R</text></g>
    : <g>{src}
      <line x1={XS} y1={T} x2={XS + 120} y2={T} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.05)}>{cap(300, 0, false, "C1", "1.59 µF")}<line x1={330} y1={T} x2={560} y2={T} stroke={L.wire} strokeWidth={6} />
        <polyline points={`430,${T} 430,${YS - 70}`} fill="none" stroke={L.wire} strokeWidth={6} /><polyline points={`430,${YS + 70} 430,${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
        <Res x={430} y={YS} ohm={BP.R1} label="R1" />
        <text x={360} y={T - 160} textAnchor="middle" fill={L.cyan} fontFamily={SANS} fontSize={28} fontWeight={800}>HIGH-PASS STAGE</text>
        <text x={360} y={T - 126} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>fL = 100 Hz</text></g>
      <g opacity={reveal(0.4)}><Res x={630} y={T} ohm={BP.R2} label="R2" horizontal /><line x1={700} y1={T} x2={880} y2={T} stroke={L.wire} strokeWidth={6} />
        {cap(780, YS, true, "C2", "1.59 nF")}
        <text x={700} y={T - 160} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={28} fontWeight={800}>LOW-PASS STAGE</text>
        <text x={700} y={T - 126} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>fH = 10 kHz</text></g>
      <line x1={XS} y1={B} x2={880} y2={B} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.7)}><circle cx={880} cy={T} r={11} fill={L.amber} /><circle cx={880} cy={B} r={11} fill={L.amber} />
        <text x={880} y={B + 46} textAnchor="middle" {...T1} fontSize={30} fill={L.green}>Vout</text></g></g>;
  // ---- right
  const GX = 1010, GW = 820, Y0 = 800, H = 520;
  const lmin = res ? 2 : 1, lspan = res ? 1.4 : 4;                      // log10 frequency window
  const lx = (hz: number) => GX + (Math.log10(hz) - lmin) / lspan * GW, ly = (g: number) => Y0 - g * H;
  const curve = (fn: (hz: number) => number, col: string, w = 6, op = 1, upto = 1) => { const pts: string[] = [];
    for (let k = 0; k <= 240 * upto; k++) { const hz = Math.pow(10, lmin + lspan * k / 240); pts.push(`${lx(hz)},${ly(Math.min(1.02, fn(hz)))}`); }
    return <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={w} opacity={op} strokeLinejoin="round" />; };
  const axes = (ticks: number[]) => <g>
    <line x1={GX} y1={Y0} x2={GX + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={Y0} x2={GX} y2={Y0 - H - 20} stroke={L.dim} strokeWidth={3} />
    <line x1={GX} y1={ly(1)} x2={GX + GW} y2={ly(1)} stroke={L.dim} strokeDasharray="8 8" strokeWidth={2} /><text x={GX - 14} y={ly(1) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>100%</text>
    <line x1={GX} y1={ly(0.707)} x2={GX + GW} y2={ly(0.707)} stroke={L.amber} strokeDasharray="6 10" strokeWidth={2} /><text x={GX - 14} y={ly(0.707) + 8} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={22}>70.7%</text>
    {ticks.map((t) => <text key={t} x={lx(t)} y={Y0 + 40} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{t >= 1000 ? `${t / 1000} kHz` : `${t} Hz`}</text>)}</g>;
  let right: React.ReactNode = null;
  if (mode === "build" || mode === "combine") {
    const hp = (hz: number) => { const r = hz / 100; return r / Math.sqrt(1 + r * r); }, lp = (hz: number) => 1 / Math.sqrt(1 + Math.pow(hz / 10000, 2));
    const s1 = mode === "build" ? p > 0.1 : true, s2 = mode === "build" ? p > 0.45 : true, s3 = mode === "combine" ? p > 0.35 : p > 0.75;
    right = <g>
      <text x={GX + GW / 2} y={130} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>{s3 ? "TOGETHER: BAND-PASS" : "TWO FILTERS"}</text>
      {axes([10, 100, 1000, 10000, 100000])}
      {s1 && curve(hp, L.cyan, 4, s3 ? 0.45 : 1)}{s2 && curve(lp, L.green, 4, s3 ? 0.45 : 1)}
      {s3 && <g><rect x={lx(100)} y={ly(1.02)} width={lx(10000) - lx(100)} height={ly(0) - ly(1.02)} fill={L.amber} opacity={0.08} />
        {curve((hz) => cabs(bpCascade(hz)), L.amber, 8)}
        <text x={(lx(100) + lx(10000)) / 2} y={ly(1) - 24} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={28} fontWeight={800}>PASS BAND: 100 Hz → 10 kHz</text></g>}
      {s1 && !s3 && <text x={lx(100) - 10} y={ly(0.35)} textAnchor="end" fill={L.cyan} fontFamily={SANS} fontSize={24} fontWeight={700}>high-pass blocks lows</text>}
      {s2 && !s3 && <text x={lx(10000) + 10} y={ly(0.35)} fill={L.green} fontFamily={SANS} fontSize={24} fontWeight={700}>low-pass blocks highs</text>}
    </g>;
  } else if (mode === "run") {
    const Hc = bpCascade(fin); const g = cabs(Hc), ph = carg(Hc); const th = p * 4 * Math.PI;
    const wave = (cy: number, A: number, P: number, col: string, lab: string) => { const pts: string[] = [];
      for (let k = 0; k <= 160; k++) { const t = 4 * Math.PI * k / 160; if (t > th) break; pts.push(`${GX + GW * k / 160},${cy - A * 120 * Math.sin(t + P)}`); }
      return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} />
        <line x1={GX} y1={cy - 120} x2={GX + GW} y2={cy - 120} stroke={L.dim} strokeDasharray="6 8" strokeWidth={1.5} /><line x1={GX} y1={cy + 120} x2={GX + GW} y2={cy + 120} stroke={L.dim} strokeDasharray="6 8" strokeWidth={1.5} />
        <text x={GX - 16} y={cy + 10} textAnchor="end" {...T1} fontSize={30} fill={col}>{lab}</text>
        {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={6} />}</g>; };
    const verdict = g > 0.6 ? "PASSED" : fin < 1000 ? "BLOCKED by the high-pass stage" : "BLOCKED by the low-pass stage";
    right = <g>
      <text x={GX + GW / 2} y={130} textAnchor="middle" fill={g > 0.6 ? L.green : L.red} fontFamily={SANS} fontSize={34} fontWeight={800}>{verdict}</text>
      <text x={GX + GW / 2} y={176} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={26}>f = {fin >= 1000 ? `${fin / 1000} kHz` : `${fin} Hz`}</text>
      {wave(340, 1, 0, L.cyan, "Vin")}{wave(720, g, ph, L.green, "Vout")}
      <text x={GX + GW / 2} y={930} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={700}>Vout = {Math.round(g * 100)}% of Vin</text></g>;
  } else if (mode === "resonant") {
    const sweepHz = Math.pow(10, lmin + lspan * p);
    right = <g>
      <text x={GX + GW / 2} y={130} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>RESONANT BAND-PASS</text>
      {axes([100, 300, 1000, 3000])}
      <line x1={lx(1000)} y1={Y0} x2={lx(1000)} y2={ly(1)} stroke={L.amber} strokeDasharray="8 8" strokeWidth={3} />
      <text x={lx(1000)} y={ly(1) - 24} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={26} fontWeight={800}>f0 = 1 kHz</text>
      {q !== "narrow" && curve((hz) => cabs(bpRes(hz, 100)), L.cyan, 6, 1, p)}
      {q !== "wide" && curve((hz) => cabs(bpRes(hz, 20)), L.green, 6, 1, p)}
      {q === "both" && <g><text x={GX + 24} y={Y0 + 90} fill={L.cyan} fontFamily={SANS} fontSize={24} fontWeight={700}>blue: R = 100 Ω → wide (Q ≈ 1.6)</text>
        <text x={GX + 24} y={ly(1) + 86} fill={L.green} fontFamily={SANS} fontSize={24} fontWeight={700}>green: R = 20 Ω → narrow (Q ≈ 8)</text></g>}
      <text x={GX + GW / 2} y={960} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>
        f = {sweepHz >= 1000 ? `${(sweepHz / 1000).toFixed(2)} kHz` : `${sweepHz.toFixed(0)} Hz`}   XL = {(2 * Math.PI * sweepHz * BP.L).toFixed(0)} Ω   XC = {(1 / (2 * Math.PI * sweepHz * BP.C)).toFixed(0)} Ω</text></g>;
  } else if (mode === "calc") {
    const lines = ["fL = 1 ÷ (2π R1 C1) = 100 Hz", "fH = 1 ÷ (2π R2 C2) = 10 kHz", "Bandwidth  BW = fH − fL = 9.9 kHz", "Centre  f0 = √(fL × fH) = 1 kHz", "Resonant: f0 = 1 ÷ (2π√(LC)),  Q = f0 ÷ BW"];
    right = <g>{lines.map((l, k) => <text key={k} x={GX - 40} y={300 + k * 110} fill={k === 3 ? L.green : k === 4 ? L.amber : L.text} fontFamily={MONO} fontSize={34} fontWeight={700}
      opacity={interpolate(p, [k * 0.17, k * 0.17 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(30,170)">{left}</g><g transform="translate(-890,950)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.bp = BandPassScene;

// ------------------------------------------------------------------ Band-stop (notch) filter: series LC to ground
/** {"type":"bs","mode":"build"|"curve"|"run"|"q"|"calc","f":50,"r":100}
 *  Rs in series, then L and C in SERIES from the line to ground, output across that branch's top (Vout node).
 *  L = 2.03 H, C = 5 µF -> f0 = 50 Hz (mains hum). |H| = |ZLC| / |Rs + ZLC| (unloaded). Rs = 1 kΩ (wide) or 200 Ω (narrow). */
const BS = { L: 2.03, C: 5e-6 };
const bsH = (hz: number, rs: number): Cx => { const w = 2 * Math.PI * hz; const z: Cx = [0, w * BS.L - 1 / (w * BS.C)]; return cdiv(z, cadd([rs, 0], z)); };
export const BandStopScene: React.FC<any> = ({ dur, mode = "build", f: fin = 50, r: rs = 1000 }) => {
  const fr = useCurrentFrame();
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const reveal = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const T = 300, B = 780, XS = 150, YS = 540, XB = 620;
  const hz = mode === "curve" ? Math.pow(10, 0.7 + 1.6 * p) : fin;
  const w = 2 * Math.PI * hz, xl = w * BS.L, xc = 1 / (w * BS.C);
  const atRes = Math.abs(xl - xc) < 0.08 * xl;
  // ---- left: circuit
  const left = <g>
    <circle cx={XS} cy={YS} r={56} fill={L.bg0} stroke={L.cyan} strokeWidth={6} />
    <path d={`M ${XS - 32} ${YS} Q ${XS - 16} ${YS - 30} ${XS} ${YS} T ${XS + 32} ${YS}`} fill="none" stroke={L.cyan} strokeWidth={5} />
    <text x={XS} y={YS + 100} textAnchor="middle" {...T1} fontSize={30} fill={L.cyan}>Vin</text>
    <polyline points={`${XS},${YS - 56} ${XS},${T} ${290},${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
    <polyline points={`${XS},${YS + 56} ${XS},${B} ${880},${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
    <g opacity={reveal(0.05)}><Res x={360} y={T} ohm={rs} label="Rs" horizontal /><line x1={430} y1={T} x2={880} y2={T} stroke={L.wire} strokeWidth={6} /></g>
    <g opacity={reveal(0.3)}>
      <line x1={XB} y1={T} x2={XB} y2={380} stroke={L.wire} strokeWidth={6} />
      <rect x={XB - 22} y={380} width={44} height={130} fill={L.bg0} />
      <path d={`M ${XB} 382 ` + [0, 1, 2, 3].map(() => `a 16 16 0 1 1 0 32`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />
      <text x={XB + 40} y={440} {...T1} fontSize={26}>L</text><text x={XB + 40} y={470} fill={L.dim} fontFamily={MONO} fontSize={22}>2.03 H</text>
      <line x1={XB} y1={510} x2={XB} y2={600} stroke={L.wire} strokeWidth={6} /></g>
    <g opacity={reveal(0.5)}>
      <line x1={XB - 44} y1={600} x2={XB + 44} y2={600} stroke={L.amber} strokeWidth={9} /><line x1={XB - 44} y1={628} x2={XB + 44} y2={628} stroke={L.amber} strokeWidth={9} />
      <text x={XB + 58} y={612} {...T1} fontSize={26}>C</text><text x={XB + 58} y={642} fill={L.dim} fontFamily={MONO} fontSize={22}>5 µF</text>
      <line x1={XB} y1={628} x2={XB} y2={B} stroke={L.wire} strokeWidth={6} /></g>
    <g opacity={reveal(0.7)}><circle cx={880} cy={T} r={11} fill={L.amber} /><circle cx={880} cy={B} r={11} fill={L.amber} />
      <text x={880} y={B + 46} textAnchor="middle" {...T1} fontSize={30} fill={L.green}>Vout</text>
      <line x1={880} y1={T + 30} x2={880} y2={B - 30} stroke={L.green} strokeWidth={3} strokeDasharray="8 8" /></g>
    {mode !== "build" && mode !== "calc" && <g>
      <text x={XB - 70} y={440} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={700}>XL = {xl.toFixed(0)} Ω</text>
      <text x={XB - 70} y={620} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={700}>XC = {xc.toFixed(0)} Ω</text>
      {atRes && <text x={XB} y={B + 100} textAnchor="middle" fill={L.red} fontFamily={SANS} fontSize={28} fontWeight={800}>XL = XC → branch is a SHORT to ground</text>}</g>}
    {mode === "build" && <text x={XB + 20} y={730} fill={L.amber} fontFamily={SANS} fontSize={26} fontWeight={700} opacity={reveal(0.55)}>L and C in series, to ground</text>}
  </g>;
  // ---- right
  const GX = 1010, GW = 820, Y0 = 800, H = 520, lmin = 0.7, lspan = 1.6;
  const lx = (h: number) => GX + (Math.log10(h) - lmin) / lspan * GW, ly = (g: number) => Y0 - g * H;
  const curve = (rr: number, col: string, wd: number, upto = 1) => { const pts: string[] = [];
    for (let k = 0; k <= 300 * upto; k++) { const h = Math.pow(10, lmin + lspan * k / 300); pts.push(`${lx(h)},${ly(Math.min(1.02, cabs(bsH(h, rr))))}`); }
    return <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={wd} strokeLinejoin="round" />; };
  const axes = <g><line x1={GX} y1={Y0} x2={GX + GW} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={Y0} x2={GX} y2={Y0 - H - 20} stroke={L.dim} strokeWidth={3} />
    <line x1={GX} y1={ly(1)} x2={GX + GW} y2={ly(1)} stroke={L.dim} strokeDasharray="8 8" strokeWidth={2} /><text x={GX - 14} y={ly(1) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>100%</text>
    <line x1={GX} y1={ly(0.707)} x2={GX + GW} y2={ly(0.707)} stroke={L.amber} strokeDasharray="6 10" strokeWidth={2} /><text x={GX - 14} y={ly(0.707) + 8} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={22}>70.7%</text>
    <line x1={lx(50)} y1={Y0} x2={lx(50)} y2={ly(1)} stroke={L.red} strokeDasharray="8 8" strokeWidth={3} />
    <text x={lx(50)} y={ly(1) - 20} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>f0 = 50 Hz</text>
    {[5, 10, 20, 50, 100, 200].map((t) => <text key={t} x={lx(t)} y={Y0 + 40} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{t} Hz</text>)}</g>;
  let right: React.ReactNode = null;
  if (mode === "build" || mode === "curve" || mode === "q") {
    right = <g>
      <text x={GX + GW / 2} y={130} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={34} fontWeight={800}>{mode === "q" ? "NARROW vs WIDE NOTCH" : "OUTPUT vs FREQUENCY"}</text>
      {axes}
      {mode === "q" ? <>{curve(1000, L.cyan, 5)}{p > 0.4 && curve(200, L.green, 7)}
          <text x={GX + 24} y={Y0 + 90} fill={L.cyan} fontFamily={SANS} fontSize={24} fontWeight={700}>blue: Rs = 1 kΩ → wide notch</text>
          {p > 0.4 && <text x={GX + 24} y={Y0 + 126} fill={L.green} fontFamily={SANS} fontSize={24} fontWeight={700}>green: Rs = 200 Ω → narrow notch (higher Q)</text>}</>
        : <>{curve(rs, L.green, 7, mode === "curve" ? p : 1)}
          {mode === "curve" && <circle cx={lx(hz)} cy={ly(Math.min(1.02, cabs(bsH(hz, rs))))} r={12} fill={L.green} />}</>}
      {mode === "curve" && <text x={GX + GW / 2} y={960} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={28} fontWeight={700}>f = {hz.toFixed(1)} Hz  →  Vout = {Math.round(cabs(bsH(hz, rs)) * 100)}% of Vin</text>}
    </g>;
  } else if (mode === "run") {
    const Hv = bsH(fin, rs), g = cabs(Hv), ph = carg(Hv), th = p * 4 * Math.PI;
    const wave = (cy: number, A: number, P: number, col: string, lab: string) => { const pts: string[] = [];
      for (let k = 0; k <= 160; k++) { const t = 4 * Math.PI * k / 160; if (t > th) break; pts.push(`${GX + GW * k / 160},${cy - A * 120 * Math.sin(t + P)}`); }
      return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} />
        <line x1={GX} y1={cy - 120} x2={GX + GW} y2={cy - 120} stroke={L.dim} strokeDasharray="6 8" strokeWidth={1.5} /><line x1={GX} y1={cy + 120} x2={GX + GW} y2={cy + 120} stroke={L.dim} strokeDasharray="6 8" strokeWidth={1.5} />
        <text x={GX - 16} y={cy + 10} textAnchor="end" {...T1} fontSize={30} fill={col}>{lab}</text>
        {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={6} />}</g>; };
    right = <g>
      <text x={GX + GW / 2} y={130} textAnchor="middle" fill={g > 0.6 ? L.green : L.red} fontFamily={SANS} fontSize={34} fontWeight={800}>{g > 0.6 ? "PASSED" : "STOPPED"}</text>
      <text x={GX + GW / 2} y={176} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={26}>f = {fin} Hz</text>
      {wave(340, 1, 0, L.cyan, "Vin")}{wave(720, g, ph, L.green, "Vout")}
      <text x={GX + GW / 2} y={930} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={700}>Vout = {+(g * 100).toFixed(g < 0.05 ? 1 : 0)}% of Vin</text></g>;
  } else if (mode === "calc") {
    const lines = ["f0 = 1 ÷ (2π √(L × C))", "f0 = 1 ÷ (2 × 3.14 × √(2.03 × 0.000005))", "f0 = 1 ÷ (6.28 × 0.00319)  ≈  50 Hz", "Q = (1 ÷ Rs) × √(L ÷ C)", "Rs = 1 kΩ → Q ≈ 0.64   ·   Rs = 200 Ω → Q ≈ 3.2"];
    right = <g>{lines.map((l, k) => <text key={k} x={GX - 30} y={300 + k * 110} fill={k === 2 ? L.green : k === 4 ? L.amber : L.text} fontFamily={MONO} fontSize={k === 1 ? 30 : 34} fontWeight={700}
      opacity={interpolate(p, [k * 0.17, k * 0.17 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(30,170)">{left}</g><g transform="translate(-890,950)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.bs = BandStopScene;

// ------------------------------------------------------------------ Linear vs switching regulator (12 V -> 5 V, 1 A load)
/** {"type":"lvs","mode":"linear"|"switching"|"compare"|"ripple"|"calc"}
 *  Linear: pass transistor drops 7 V at 1 A -> 7 W heat, efficiency 5/12 = 41.7 %.
 *  Switching (buck): duty D = 5/12 = 41.7 %, assumed 90 % efficient -> Pin 5.56 W, input current 0.46 A, loss 0.56 W. */
export const LinVsSwScene: React.FC<any> = ({ dur, mode = "linear" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const VIN = 12, VO = 5, IO = 1, D = VO / VIN, ETA = 0.9;
  const T = 300, B = 760;
  const src = (x: number) => <g><Battery x={x} y={(T + B) / 2} v={VIN} /><line x1={x} y1={T} x2={x} y2={(T + B) / 2 - 40} stroke={L.wire} strokeWidth={6} /><line x1={x} y1={(T + B) / 2 + 40} x2={x} y2={B} stroke={L.wire} strokeWidth={6} /></g>;
  const load = (x: number, glow = 0) => <g><Res x={x} y={(T + B) / 2} ohm={5} label="LOAD" heat={glow} />
    <line x1={x} y1={T} x2={x} y2={(T + B) / 2 - 70} stroke={L.wire} strokeWidth={6} /><line x1={x} y1={(T + B) / 2 + 70} x2={x} y2={B} stroke={L.wire} strokeWidth={6} />
    <Meter x={x} y={B + 80} kind="V" value={VO} /></g>;
  // ---- linear circuit: source -> pass transistor (hot) -> load
  const linear = (heatOn: boolean) => <g>
    <polyline points={`200,${T} 360,${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
    <polyline points={`520,${T} 860,${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
    <line x1={200} y1={B} x2={860} y2={B} stroke={L.wire} strokeWidth={6} />
    {src(200)}
    {heatOn && <circle cx={440} cy={T} r={95 + 8 * Math.sin(t * 6)} fill={L.red} opacity={0.22} />}
    <circle cx={440} cy={T} r={62} fill={L.bg0} stroke={L.amber} strokeWidth={6} />
    <line x1={415} y1={T - 35} x2={415} y2={T + 35} stroke={L.amber} strokeWidth={8} />
    <line x1={360} y1={T} x2={415} y2={T} stroke={L.amber} strokeWidth={6} />
    <line x1={415} y1={T - 14} x2={470} y2={T - 50} stroke={L.amber} strokeWidth={6} /><line x1={415} y1={T + 14} x2={470} y2={T + 50} stroke={L.amber} strokeWidth={6} />
    <text x={440} y={T - 90} textAnchor="middle" {...T1} fontSize={26}>PASS TRANSISTOR</text>
    <text x={440} y={T + 110} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>drops {VIN - VO} V</text>
    {heatOn && <text x={440} y={T + 148} textAnchor="middle" fill={L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>{VIN - VO} V × {IO} A = {(VIN - VO) * IO} W heat</text>}
    {load(860)}
    <Dots pts={[[200, (T + B) / 2], [200, T], [860, T], [860, B], [200, B], [200, (T + B) / 2]]} t={t} speed={120} />
  </g>;
  // ---- switching (buck) circuit: source -> switch -> L -> C || load, diode to ground
  const on = (t * 2) % 1 < D;
  const switching = <g>
    {src(200)}
    <polyline points={`200,${T} 330,${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
    <circle cx={330} cy={T} r={9} fill={L.text} /><circle cx={430} cy={T} r={9} fill={L.text} />
    <line x1={330} y1={T} x2={on ? 430 : 410} y2={on ? T : T - 55} stroke={on ? L.green : L.red} strokeWidth={7} />
    <text x={380} y={T - 80} textAnchor="middle" fill={on ? L.green : L.red} fontFamily={MONO} fontSize={26} fontWeight={800}>SWITCH {on ? "ON" : "OFF"}</text>
    <line x1={430} y1={T} x2={520} y2={T} stroke={L.wire} strokeWidth={6} />
    <line x1={490} y1={T} x2={490} y2={460} stroke={L.wire} strokeWidth={6} />
    <polygon points={`465,500 515,500 490,460`} fill={L.bg0} stroke={L.amber} strokeWidth={5} /><line x1={465} y1={460} x2={515} y2={460} stroke={L.amber} strokeWidth={5} />
    <line x1={490} y1={500} x2={490} y2={B} stroke={L.wire} strokeWidth={6} />
    <text x={530} y={500} {...T1} fontSize={22}>diode</text>
    <path d={`M 520 ${T} ` + [0, 1, 2, 3].map(() => `a 16 16 0 1 0 32 0`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />
    <text x={584} y={T - 34} textAnchor="middle" {...T1} fontSize={24}>L</text>
    <line x1={648} y1={T} x2={860} y2={T} stroke={L.wire} strokeWidth={6} />
    <line x1={720} y1={T} x2={720} y2={500} stroke={L.wire} strokeWidth={6} />
    <line x1={680} y1={500} x2={760} y2={500} stroke={L.amber} strokeWidth={8} /><line x1={680} y1={526} x2={760} y2={526} stroke={L.amber} strokeWidth={8} />
    <line x1={720} y1={526} x2={720} y2={B} stroke={L.wire} strokeWidth={6} /><text x={772} y={520} {...T1} fontSize={24}>C</text>
    <line x1={200} y1={B} x2={860} y2={B} stroke={L.wire} strokeWidth={6} />
    {load(860)}
    {on ? <Dots pts={[[200, (T + B) / 2], [200, T], [860, T], [860, B], [200, B], [200, (T + B) / 2]]} t={t} speed={120} />
        : <Dots pts={[[490, B], [490, T], [860, T], [860, B], [490, B]]} t={t} speed={120} color={L.amber} />}
    <text x={530} y={B + 60} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{on ? "ON: source feeds L and the load" : "OFF: L pushes current via the diode"}</text>
  </g>;
  // ---- right side helpers
  const GX = 1010, GW = 820;
  const bars = (x: number, title: string, pin: number, pout: number, col: string) => { const s = 34; const loss = pin - pout;
    return <g><text x={x + 150} y={280} textAnchor="middle" fill={col} fontFamily={SANS} fontSize={30} fontWeight={800}>{title}</text>
      {[["IN", pin, L.cyan], ["LOAD", pout, L.green], ["HEAT", loss, L.red]].map(([lab, v, c]: any, k) =>
        <g key={k}><rect x={x + k * 100 + 20} y={760 - v * s * p} width={70} height={v * s * p} fill={c} rx={6} />
          <text x={x + k * 100 + 55} y={800} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{lab}</text>
          <text x={x + k * 100 + 55} y={750 - v * s * p} textAnchor="middle" fill={c} fontFamily={MONO} fontSize={22} fontWeight={700}>{v.toFixed(v < 1 ? 2 : 1)} W</text></g>)}
      <text x={x + 150} y={860} textAnchor="middle" {...T1} fontSize={30}>efficiency {Math.round(pout / pin * 100)}%</text></g>; };
  const wave = (cy: number, fn: (u: number) => number, col: string, lab: string, scale: number) => { const q: string[] = [];
    for (let k = 0; k <= 400; k++) { const u = k / 400; if (u > p) break; q.push(`${GX + GW * u},${cy - fn(u) * scale}`); }
    return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} />
      <text x={GX - 16} y={cy + 8} textAnchor="end" {...T1} fontSize={26} fill={col}>{lab}</text>
      {q.length > 1 && <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} />}</g>; };
  let left: React.ReactNode = mode === "switching" || mode === "ripple" ? switching : linear(true), right: React.ReactNode = null;
  if (mode === "linear") right = bars(1150, "LINEAR REGULATOR", VIN * IO, VO * IO, L.amber);
  else if (mode === "switching") right = <g>
    <text x={GX + GW / 2} y={140} textAnchor="middle" {...T1} fontSize={32}>SWITCH ON {Math.round(D * 100)}% OF THE TIME</text>
    {wave(430, (u) => ((u * 8) % 1 < D ? VIN : 0), L.cyan, "switch", 18)}
    <text x={GX + GW} y={180 + 30} textAnchor="end" fill={L.cyan} fontFamily={MONO} fontSize={24}>0 V or 12 V</text>
    {wave(760, () => VO, L.green, "Vout", 12)}
    <text x={GX + GW / 2} y={920} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={700}>average = {D.toFixed(3)} × 12 V = 5 V</text></g>;
  else if (mode === "compare") { left = <g>{bars(80, "LINEAR", VIN * IO, VO * IO, L.amber)}</g>; right = bars(1150, "SWITCHING", VO * IO / ETA, VO * IO, L.green); }
  else if (mode === "ripple") right = <g>
    <text x={GX + GW / 2} y={140} textAnchor="middle" {...T1} fontSize={32}>OUTPUT, ZOOMED IN</text>
    {wave(420, () => 0.0, L.amber, "", 1)}
    <text x={GX + GW / 2} y={360} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={26} fontWeight={700}>linear: smooth, quiet 5 V</text>
    {wave(760, (u) => Math.abs(((u * 8) % 1) - 0.5) * 2 - 0.5, L.green, "", 30)}
    <text x={GX + GW / 2} y={680} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={26} fontWeight={700}>switching: small ripple at the switching speed</text></g>;
  else if (mode === "calc") { left = linear(false); const lines = ["Linear:  P_heat = (12 − 5) × 1 = 7 W", "η = 5 W ÷ 12 W = 41.7%", "Buck:  D = Vout ÷ Vin = 5 ÷ 12 = 0.417", "Pin = 5 W ÷ 0.9 = 5.56 W", "Iin = 5.56 ÷ 12 = 0.46 A,  heat = 0.56 W"];
    right = <g>{lines.map((l, k) => <text key={k} x={GX - 30} y={260 + k * 110} fill={k === 1 ? L.amber : k === 4 ? L.green : L.text} fontFamily={MONO} fontSize={32} fontWeight={700}
      opacity={interpolate(p, [k * 0.17, k * 0.17 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(20,150)">{left}</g><g transform="translate(-900,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.lvs = LinVsSwScene;

// ------------------------------------------------------------------ Series (Zener + emitter follower) and shunt (Zener) regulators
/** {"type":"zreg","kind":"series"|"shunt","mode":"build"|"vin"|"load"|"calc","vin":12,"rl":100}
 *  series: R = 470 Ω feeds a 5.6 V Zener at the base; NPN (β = 100, VBE = 0.7) -> Vout = 4.9 V.
 *  shunt:  R = 100 Ω in series, 5.1 V Zener across the load -> Vout = 5.1 V. */
const ZR = { series: { R: 470, VZ: 5.6, VBE: 0.7, B: 100 }, shunt: { R: 100, VZ: 5.1 } };
const zsolve = (kind: string, vin: number, rl: number) => {
  if (kind === "series") { const s = ZR.series; const vo = Math.min(s.VZ, vin) - s.VBE; const il = rl > 0 ? vo / rl : 0; const ib = il / (s.B + 1);
    const ir = (vin - s.VZ) / s.R; const iz = Math.max(0, ir - ib); return { vo, il, ir, iz, ib, pt: (vin - vo) * il, pz: s.VZ * iz }; }
  const s = ZR.shunt; let ir = (vin - s.VZ) / s.R; let il = rl > 0 ? s.VZ / rl : 0; let vo = s.VZ;
  if (il > ir) { vo = vin * rl / (s.R + rl); il = vo / rl; ir = il; }   // load too heavy: Zener switches off, plain divider
  const iz = Math.max(0, ir - il);
  return { vo, il, ir, iz, ib: 0, pt: 0, pz: s.VZ * iz, pr: ir * ir * s.R };
};
const mA = (a: number) => `${+(a * 1000).toFixed(a < 0.01 ? 2 : 1)} mA`;
export const ZRegScene: React.FC<any> = ({ dur, kind = "series", mode = "build", vin = 12, rl = 100, lines: ovr }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const reveal = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const V = mode === "vin" ? (p < 0.5 ? 10 + 10 * p : 15 - 10 * (p - 0.5)) : vin;
  const RLs = [1e9, 200, 100, 50];
  const RLv = mode === "load" ? RLs[Math.min(3, Math.floor(p * 4))] : rl;
  const s = zsolve(kind, V, RLv > 1e8 ? 0 : RLv);
  const T = 260, B = 800, XS = 140;
  const zener = (x: number, y1: number, y2: number, lab: string) => { const m = (y1 + y2) / 2; return <g>
    <line x1={x} y1={y1} x2={x} y2={m - 25} stroke={L.wire} strokeWidth={6} /><line x1={x} y1={m + 25} x2={x} y2={y2} stroke={L.wire} strokeWidth={6} />
    <polygon points={`${x - 28},${m + 25} ${x + 28},${m + 25} ${x},${m - 25}`} fill={L.bg0} stroke={L.amber} strokeWidth={5} />
    <polyline points={`${x - 38},${m - 35} ${x - 28},${m - 25} ${x + 28},${m - 25} ${x + 38},${m - 15}`} fill="none" stroke={L.amber} strokeWidth={5} />
    <text x={x + 46} y={m + 4} {...T1} fontSize={24}>{lab}</text></g>; };
  const loadOn = RLv < 1e8;
  let left: React.ReactNode;
  if (kind === "series") {
    const XQ = 560, XZ = 400, XL = 860;
    left = <g>
      <Battery x={XS} y={(T + B) / 2} v={V} />
      <line x1={XS} y1={T} x2={XS} y2={(T + B) / 2 - 40} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={(T + B) / 2 + 40} x2={XS} y2={B} stroke={L.wire} strokeWidth={6} />
      <line x1={XS} y1={B} x2={XL} y2={B} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.05)}><line x1={XS} y1={T} x2={XQ - 40} y2={T} stroke={L.wire} strokeWidth={6} />
        <polyline points={`${XQ - 40},${T} ${XQ - 40},${T + 30}`} fill="none" stroke={L.wire} strokeWidth={6} />
        <text x={XQ} y={T - 70} textAnchor="middle" {...T1} fontSize={24}>NPN (pass)</text></g>
      <g opacity={reveal(0.05)}>
        <circle cx={XQ} cy={T + 70} r={56} fill={L.bg0} stroke={L.amber} strokeWidth={6} />
        <line x1={XQ - 18} y1={T + 40} x2={XQ - 18} y2={T + 100} stroke={L.amber} strokeWidth={8} />
        <line x1={XQ - 18} y1={T + 55} x2={XQ - 40} y2={T + 30} stroke={L.amber} strokeWidth={6} />
        <line x1={XQ - 18} y1={T + 85} x2={XQ + 30} y2={T + 115} stroke={L.amber} strokeWidth={6} />
        <polyline points={`${XQ + 30},${T + 115} ${XQ + 30},${T + 140} ${XL},${T + 140}`} fill="none" stroke={L.wire} strokeWidth={6} />
        <line x1={XQ - 60} y1={T + 70} x2={XQ - 18} y2={T + 70} stroke={L.amber} strokeWidth={6} /></g>
      <g opacity={reveal(0.3)}><Res x={XZ - 150} y={T + 80} ohm={ZR.series.R} label="R" />
        <line x1={XZ - 150} y1={T} x2={XZ - 150} y2={T + 10} stroke={L.wire} strokeWidth={6} />
        <polyline points={`${XZ - 150},${T + 150} ${XZ - 150},${T + 190} ${XZ},${T + 190} ${XZ},${T + 70} ${XQ - 60},${T + 70}`} fill="none" stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.5)}>{zener(XZ, T + 190, B, `Zener ${ZR.series.VZ} V`)}</g>
      <g opacity={reveal(0.7)}>
        {loadOn ? <Res x={XL} y={(T + 140 + B) / 2} ohm={RLv} label="LOAD" /> : <text x={XL} y={(T + B) / 2 + 80} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>no load</text>}
        <line x1={XL} y1={T + 140} x2={XL} y2={(T + 140 + B) / 2 - 70} stroke={L.wire} strokeWidth={6} /><line x1={XL} y1={(T + 140 + B) / 2 + 70} x2={XL} y2={B} stroke={L.wire} strokeWidth={6} />
        <circle cx={XL} cy={T + 140} r={10} fill={L.green} />
        <text x={XL} y={T + 100} textAnchor="middle" {...T1} fontSize={28} fill={L.green}>Vout {s.vo.toFixed(1)} V</text></g>
      {mode !== "build" && loadOn && <Dots pts={[[XS, (T + B) / 2], [XS, T], [XQ - 40, T], [XQ - 40, T + 30], [XQ + 30, T + 115], [XQ + 30, T + 140], [XL, T + 140], [XL, B], [XS, B], [XS, (T + B) / 2]]} t={t} speed={40 + s.il * 1500} />}
      {mode !== "build" && <Dots pts={[[XZ - 150, T], [XZ - 150, T + 190], [XZ, T + 190], [XZ, B]]} t={t} speed={40 + s.iz * 3000} color={L.amber} gap={50} r={5} />}
      {mode !== "build" && <text x={XZ - 30} y={B + 50} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={700}>Iz = {mA(s.iz)}</text>}
    </g>;
  } else {
    const XR = 360, XZ = 600, XL = 860;
    left = <g>
      <Battery x={XS} y={(T + B) / 2} v={V} />
      <line x1={XS} y1={T} x2={XS} y2={(T + B) / 2 - 40} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={(T + B) / 2 + 40} x2={XS} y2={B} stroke={L.wire} strokeWidth={6} />
      <line x1={XS} y1={B} x2={XL} y2={B} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.05)}><line x1={XS} y1={T} x2={XR - 70} y2={T} stroke={L.wire} strokeWidth={6} /><Res x={XR} y={T} ohm={ZR.shunt.R} label="Rs" horizontal heat={mode !== "build" ? s.pr! / 0.6 : 0} />
        <line x1={XR + 70} y1={T} x2={XL} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.35)}>{zener(XZ, T, B, `Zener ${ZR.shunt.VZ} V`)}</g>
      <g opacity={reveal(0.6)}>
        {loadOn ? <Res x={XL} y={(T + B) / 2} ohm={RLv} label="LOAD" /> : <text x={XL} y={(T + B) / 2} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>no load</text>}
        <line x1={XL} y1={T} x2={XL} y2={(T + B) / 2 - 70} stroke={L.wire} strokeWidth={6} /><line x1={XL} y1={(T + B) / 2 + 70} x2={XL} y2={B} stroke={L.wire} strokeWidth={6} />
        <circle cx={XL} cy={T} r={10} fill={L.green} /><text x={XL} y={T - 40} textAnchor="middle" {...T1} fontSize={28} fill={L.green}>Vout {s.vo.toFixed(1)} V</text></g>
      {mode !== "build" && <Dots pts={[[XS, (T + B) / 2], [XS, T], [XZ, T], [XZ, B], [XS, B], [XS, (T + B) / 2]]} t={t} speed={40 + s.ir * 1500} />}
      {mode !== "build" && loadOn && <Dots pts={[[XZ, T], [XL, T], [XL, B], [XZ, B]]} t={t} speed={40 + s.il * 1500} color={L.green} />}
      {mode !== "build" && <text x={XZ - 40} y={B + 50} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={700}>Iz = {mA(s.iz)}</text>}
      {mode !== "build" && <text x={XR} y={T + 110} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={24} fontWeight={700}>I = {mA(s.ir)}</text>}
    </g>;
  }
  // ---- right
  const GX = 1040, GW = 780;
  let right: React.ReactNode = null;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={GX} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text>
    <text x={GX + GW} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  if (mode === "build") right = <g>
    <text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={34}>{kind === "series" ? "SERIES REGULATOR" : "SHUNT REGULATOR"}</text>
    {(kind === "series" ? ["Zener holds the BASE at 5.6 V", "transistor in SERIES with the load", "emitter = base − 0.7 V = 4.9 V", "transistor carries the load current"]
      : ["Rs in series with the supply", "Zener in PARALLEL (shunt) with the load", "Zener holds Vout at 5.1 V", "extra current goes through the Zener"]).map((l, k) =>
      <text key={k} x={GX} y={330 + k * 100} fill={L.text} fontFamily={SANS} fontSize={32} fontWeight={600} opacity={interpolate(p, [0.15 + k * 0.2, 0.25 + k * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>• {l}</text>)}</g>;
  else if (mode === "vin") { const pts: string[] = []; const n = 100;
    const vx = (v: number) => GX + (v - 8) / 10 * GW, vy = (v: number) => 760 - v * 50;
    for (let k = 0; k <= n; k++) { const vv = 8 + 10 * k / n; if (vv > Math.max(V, 10) + 0.01 && vv > 10) break; pts.push(`${vx(vv)},${vy(zsolve(kind, vv, RLv).vo)}`); }
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={32}>INPUT CHANGES, OUTPUT DOESN'T</text>
      <line x1={GX} y1={760} x2={GX + GW} y2={760} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={760} x2={GX} y2={260} stroke={L.dim} strokeWidth={3} />
      {[10, 12, 14, 16, 18].map((v) => <text key={v} x={vx(v)} y={800} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{v} V</text>)}
      <text x={GX + GW / 2} y={850} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>input voltage</text>
      {[0, 5, 10].map((v) => <text key={v} x={GX - 12} y={vy(v) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>{v} V</text>)}
      <polyline points={pts.join(" ")} fill="none" stroke={L.green} strokeWidth={7} />
      <circle cx={vx(V)} cy={vy(s.vo)} r={12} fill={L.green} />
      <text x={GX + GW / 2} y={930} textAnchor="middle" fill={L.text} fontFamily={MONO} fontSize={30} fontWeight={700}>Vin = {V.toFixed(1)} V → Vout = {s.vo.toFixed(1)} V   Iz = {mA(s.iz)}</text></g>; }
  else if (mode === "load") right = <g>
    <text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>CHANGING THE LOAD</text>
    {row(320, "load", loadOn ? `${RLv} Ω` : "none", L.text)}
    {row(410, "load current", mA(s.il), L.green)}
    {row(500, "Zener current", mA(s.iz), L.amber)}
    {kind === "series" ? row(590, "base current", mA(s.ib), L.cyan) : row(590, "current through Rs", mA(s.ir), L.cyan)}
    {row(680, "Vout", `${s.vo.toFixed(1)} V`, L.green)}
    {row(770, kind === "series" ? "transistor heat" : "Zener heat", `${(kind === "series" ? s.pt : s.pz).toFixed(2)} W`, L.red)}
    {kind === "shunt" && s.vo < 5 && <text x={GX + GW / 2} y={880} textAnchor="middle" fill={L.red} fontFamily={SANS} fontSize={30} fontWeight={800}>Zener OFF: load too heavy, Vout falls!</text>}</g>;
  else if (mode === "calc") { const lines = kind === "series"
      ? ["Vout = VZ − VBE = 5.6 − 0.7 = 4.9 V", "IL = 4.9 ÷ 100 = 49 mA", "IB = IL ÷ (β + 1) = 49 ÷ 101 = 0.49 mA", "IR = (12 − 5.6) ÷ 470 = 13.6 mA", "IZ = 13.6 − 0.49 = 13.1 mA", "P(transistor) = (12 − 4.9) × 0.049 = 0.35 W"]
      : ["I = (12 − 5.1) ÷ 100 = 69 mA", "IL = 5.1 ÷ 100 = 51 mA", "IZ = I − IL = 69 − 51 = 18 mA", "no load: IZ = 69 mA", "PZ = 5.1 × 0.069 = 0.35 W", "PRs = 0.069² × 100 = 0.48 W"];
    const lines2: string[] = ovr && ovr.length ? ovr : lines
    right = <g>{lines2.map((l, k) => <text key={k} x={GX + 40} y={240 + k * 105} fill={k === lines2.length - 1 ? L.red : L.text} fontFamily={MONO} fontSize={29} fontWeight={700}
      opacity={interpolate(p, [k * 0.14, k * 0.14 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,150)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<><g transform="translate(70,0)">{left}</g>{right}</>);
};
ANALOG_SCENES.zreg = ZRegScene;

// ------------------------------------------------------------------ DC-DC converters: buck, boost, buck-boost (ideal, continuous conduction)
/** {"type":"conv","kind":"buck"|"boost"|"bb","mode":"build"|"on"|"off"|"run"|"duty"|"calc","d":0.5}
 *  Vin = 12 V, L = 100 µH, f = 50 kHz (T = 20 µs), C = 100 µF, R = 10 Ω.
 *  buck Vo = D·Vin; boost Vo = Vin/(1−D); buck-boost |Vo| = Vin·D/(1−D) (inverted). */
const CV = { VIN: 12, L: 100e-6, F: 50e3, C: 100e-6, R: 10 };
const convVo = (k: string, d: number) => k === "buck" ? d * CV.VIN : k === "boost" ? CV.VIN / (1 - d) : CV.VIN * d / (1 - d);
const convIL = (k: string, d: number) => { const vo = convVo(k, d), io = vo / CV.R; return k === "buck" ? io : io / (1 - d); };   // average inductor current
const convDI = (k: string, d: number) => { const vl = k === "buck" ? CV.VIN - convVo(k, d) : CV.VIN; return vl * d / (CV.F * CV.L); }; // ripple, ON phase
export const ConvScene: React.FC<any> = ({ dur, kind = "buck", mode = "run", d: d0 = 0.5, lines: ovr }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const reveal = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const [d1, d2] = kind === "boost" ? [0.2, 0.6] : [0.25, 0.75]; const D = mode === "duty" ? d1 + (d2 - d1) * p : d0;
  const ph = (t * 0.6) % 1, on = mode === "on" ? true : mode === "off" ? false : ph < D;
  const vo = convVo(kind, D), il = convIL(kind, D), di = convDI(kind, D);
  const T = 300, B = 760, XS = 150;
  const sw = (x1: number, y1: number, x2: number, y2: number, lab = "S") => { const cl = on;
    return <g><circle cx={x1} cy={y1} r={9} fill={L.text} /><circle cx={x2} cy={y2} r={9} fill={L.text} />
      <line x1={x1} y1={y1} x2={cl ? x2 : x1 + (x2 - x1) * 0.8 + (y1 === y2 ? 0 : 50)} y2={cl ? y2 : y1 + (y2 - y1) * 0.8 - (y1 === y2 ? 50 : 0)} stroke={cl ? L.green : L.red} strokeWidth={7} />
      <text x={(x1 + x2) / 2 + (y1 === y2 ? 0 : 30)} y={(y1 + y2) / 2 - (y1 === y2 ? 60 : 0)} textAnchor={y1 === y2 ? "middle" : "start"} fill={cl ? L.green : L.red} fontFamily={MONO} fontSize={24} fontWeight={800}>{lab} {cl ? "ON" : "OFF"}</text></g>; };
  const ind = (x: number, y: number, vert = false) => vert
    ? <g><line x1={x} y1={y - 80} x2={x} y2={y - 64} stroke={L.wire} strokeWidth={6} /><path d={`M ${x} ${y - 64} ` + [0, 1, 2, 3].map(() => `a 16 16 0 1 1 0 32`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} /><line x1={x} y1={y + 64} x2={x} y2={y + 80} stroke={L.wire} strokeWidth={6} /><text x={x + 34} y={y + 8} {...T1} fontSize={24}>L</text></g>
    : <g><path d={`M ${x - 64} ${y} ` + [0, 1, 2, 3].map(() => `a 16 16 0 1 0 32 0`).join(" ")} fill="none" stroke={L.amber} strokeWidth={6} /><text x={x} y={y - 34} textAnchor="middle" {...T1} fontSize={24}>L</text></g>;
  const diode = (x1: number, y1: number, x2: number, y2: number) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={L.wire} strokeWidth={6} />
      <g transform={`translate(${mx},${my}) rotate(${a})`}><rect x={-30} y={-30} width={60} height={60} fill={L.bg0} /><polygon points="-22,-24 -22,24 20,0" fill={L.bg0} stroke={L.amber} strokeWidth={5} /><line x1={20} y1={-24} x2={20} y2={24} stroke={L.amber} strokeWidth={5} /></g></g>; };
  const cap = (x: number) => <g><line x1={x} y1={T} x2={x} y2={500} stroke={L.wire} strokeWidth={6} /><line x1={x - 40} y1={500} x2={x + 40} y2={500} stroke={L.amber} strokeWidth={8} /><line x1={x - 40} y1={526} x2={x + 40} y2={526} stroke={L.amber} strokeWidth={8} /><line x1={x} y1={526} x2={x} y2={B} stroke={L.wire} strokeWidth={6} /><text x={x + 50} y={520} {...T1} fontSize={24}>C</text></g>;
  const load = (x: number) => <g><Res x={x} y={(T + B) / 2} ohm={CV.R} label="LOAD" /><line x1={x} y1={T} x2={x} y2={(T + B) / 2 - 70} stroke={L.wire} strokeWidth={6} /><line x1={x} y1={(T + B) / 2 + 70} x2={x} y2={B} stroke={L.wire} strokeWidth={6} />
    <text x={x} y={T - 30} textAnchor="middle" {...T1} fontSize={28} fill={L.green}>Vout {kind === "bb" ? "−" : ""}{vo.toFixed(1)} V</text></g>;
  const src = <g><Battery x={XS} y={(T + B) / 2} v={CV.VIN} /><line x1={XS} y1={T} x2={XS} y2={(T + B) / 2 - 40} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={(T + B) / 2 + 40} x2={XS} y2={B} stroke={L.wire} strokeWidth={6} /></g>;
  const sp = 60 + il * 25; const showDots = mode !== "build" && mode !== "calc";
  let left: React.ReactNode, onPath: number[][] = [], offPath: number[][] = [], note = ["", ""];
  if (kind === "buck") {
    left = <g>{src}<line x1={XS} y1={B} x2={860} y2={B} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={T} x2={300} y2={T} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.05)}>{sw(300, T, 400, T)}<line x1={400} y1={T} x2={496} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.25)}>{ind(560, T)}<line x1={624} y1={T} x2={860} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.45)}>{diode(450, B, 450, T)}</g>
      <g opacity={reveal(0.6)}>{cap(720)}</g><g opacity={reveal(0.75)}>{load(860)}</g></g>;
    onPath = [[XS, (T + B) / 2], [XS, T], [860, T], [860, B], [XS, B], [XS, (T + B) / 2]]; offPath = [[450, B], [450, T], [860, T], [860, B], [450, B]];
    note = ["ON: Vin drives current through L to the load; L stores energy", "OFF: L keeps the current going, through the diode"];
  } else if (kind === "boost") {
    left = <g>{src}<line x1={XS} y1={B} x2={860} y2={B} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={T} x2={276} y2={T} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.05)}>{ind(340, T)}<line x1={404} y1={T} x2={470} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.25)}><line x1={470} y1={T} x2={470} y2={460} stroke={L.wire} strokeWidth={6} />{sw(470, 460, 470, 600)}<line x1={470} y1={600} x2={470} y2={B} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.45)}>{diode(470, T, 640, T)}<line x1={640} y1={T} x2={860} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.6)}>{cap(720)}</g><g opacity={reveal(0.75)}>{load(860)}</g></g>;
    onPath = [[XS, (T + B) / 2], [XS, T], [470, T], [470, B], [XS, B], [XS, (T + B) / 2]]; offPath = [[XS, (T + B) / 2], [XS, T], [860, T], [860, B], [XS, B], [XS, (T + B) / 2]];
    note = ["ON: switch shorts L to ground, L charges up from Vin", "OFF: Vin + L's voltage push together through the diode"];
  } else {
    left = <g>{src}<line x1={XS} y1={B} x2={860} y2={B} stroke={L.wire} strokeWidth={6} /><line x1={XS} y1={T} x2={260} y2={T} stroke={L.wire} strokeWidth={6} />
      <g opacity={reveal(0.05)}>{sw(260, T, 360, T)}<line x1={360} y1={T} x2={470} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.25)}><line x1={430} y1={T} x2={430} y2={450} stroke={L.wire} strokeWidth={6} />{ind(430, 530, true)}<line x1={430} y1={610} x2={430} y2={B} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.45)}>{diode(620, T, 470, T)}<line x1={620} y1={T} x2={860} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={reveal(0.6)}>{cap(720)}</g><g opacity={reveal(0.75)}>{load(860)}</g></g>;
    onPath = [[XS, (T + B) / 2], [XS, T], [430, T], [430, B], [XS, B], [XS, (T + B) / 2]]; offPath = [[430, T], [430, B], [860, B], [860, T], [430, T]];
    note = ["ON: Vin charges L; the diode blocks, C feeds the load", "OFF: L drives current UP through the load: output is NEGATIVE"];
  }
  const leftAll = <g>{left}
    {showDots && (on ? <Dots pts={onPath} t={t} speed={sp} /> : <Dots pts={offPath} t={t} speed={sp} color={L.amber} />)}
    {mode !== "build" && <text x={500} y={B + 70} textAnchor="middle" fill={on ? L.green : L.amber} fontFamily={SANS} fontSize={26} fontWeight={700}>{on ? note[0] : note[1]}</text>}</g>;
  // ---- right: switch, inductor current, output
  const GX = 1040, GW = 780, cyc = 3;
  let right: React.ReactNode = null;
  const trace = (cy: number, h: number, fn: (u: number) => number, col: string, lab: string, lo: number, hi: number, unit: string) => { const q: string[] = [];
    const upto = mode === "run" || mode === "duty" ? 1 : p;
    for (let k = 0; k <= 360; k++) { const u = k / 360; if (u > upto) break; q.push(`${GX + GW * u},${cy - (fn(u) - lo) / (hi - lo) * h}`); }
    return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><line x1={GX} y1={cy} x2={GX} y2={cy - h - 10} stroke={L.dim} strokeWidth={2} />
      <text x={GX - 14} y={cy - h + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={20}>{hi.toFixed(hi < 10 ? 1 : 0)}{unit}</text>
      <text x={GX - 14} y={cy + 6} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={20}>{lo.toFixed(lo && lo < 10 ? 1 : 0)}{unit}</text>
      <text x={GX + 10} y={cy - h - 18} fill={col} fontFamily={SANS} fontSize={26} fontWeight={800}>{lab}</text>
      {q.length > 1 && <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} strokeLinejoin="round" />}</g>; };
  const phase = (u: number) => (u * cyc) % 1;
  const ilw = (u: number) => { const x = phase(u); return x < D ? il - di / 2 + di * x / D : il + di / 2 - di * (x - D) / (1 - D); };
  if (mode !== "calc") {
    const hiI = Math.max(1, Math.ceil((il + di / 2) * 1.2));
    right = <g>
      <text x={GX + GW / 2} y={110} textAnchor="middle" {...T1} fontSize={30}>D = {Math.round(D * 100)}%  →  Vout = {kind === "bb" ? "−" : ""}{vo.toFixed(1)} V</text>
      {trace(330, 130, (u) => (phase(u) < D ? 1 : 0), L.cyan, "switch (ON / OFF)", 0, 1, "")}
      {trace(620, 190, ilw, L.amber, "inductor current", 0, hiI, " A")}
      {trace(900, 160, () => vo, L.green, "output voltage", 0, kind === "buck" ? 15 : 40, " V")}
      {(mode === "run" || mode === "duty") && <line x1={GX + GW * ((t * 0.6) % 1) / cyc} y1={180} x2={GX + GW * ((t * 0.6) % 1) / cyc} y2={900} stroke={L.text} strokeWidth={2} strokeDasharray="6 6" opacity={0.5} />}
    </g>;
  } else {
    const lines = kind === "buck" ? ["Vout = D × Vin = 0.5 × 12 = 6 V", "Iout = 6 ÷ 10 = 0.6 A  (= average IL)", "ΔIL = (Vin − Vout) × D ÷ (f × L)", "    = (12 − 6) × 0.5 ÷ (50k × 100µ) = 0.6 A", "IL swings 0.3 A → 0.9 A", "D for 5 V = 5 ÷ 12 = 0.417"]
      : kind === "boost" ? ["Vout = Vin ÷ (1 − D) = 12 ÷ 0.5 = 24 V", "Iout = 24 ÷ 10 = 2.4 A", "IL(avg) = Iout ÷ (1 − D) = 4.8 A", "ΔIL = Vin × D ÷ (f × L) = 12 × 0.5 ÷ 5 = 1.2 A", "Pin = 12 × 4.8 = 57.6 W = Pout = 24 × 2.4", "D for 18 V = 1 − 12 ÷ 18 = 0.333"]
      : ["|Vout| = Vin × D ÷ (1 − D)", "D = 0.5 → |Vout| = 12 V (inverted)", "D = 0.25 → 12 × 0.25 ÷ 0.75 = 4 V", "D = 0.75 → 12 × 0.75 ÷ 0.25 = 36 V", "D < 0.5: step DOWN, D > 0.5: step UP", "output is NEGATIVE: −12 V at D = 0.5"];
    const lines2 = ovr && ovr.length ? ovr : lines
    right = <g>{lines2.map((l, k) => <text key={k} x={GX + 30} y={230 + k * 110} fill={k === 4 ? L.green : L.text} fontFamily={MONO} fontSize={29} fontWeight={700}
      opacity={interpolate(p, [k * 0.14, k * 0.14 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,120)">{leftAll}</g><g transform="translate(-960,880)">{right}</g></>);
  return svg(<><g transform="translate(40,0)">{leftAll}</g>{right}</>);
};
ANALOG_SCENES.conv = ConvScene;

// ------------------------------------------------------------------ SMPS: flyback mains charger (230 V AC -> 5 V DC)
/** {"type":"smps","mode":"build"|"rect"|"switch"|"fb"|"calc"}
 *  230 V rms -> bridge + bulk C -> 325 V DC -> MOSFET at 65 kHz, D = 0.3, flyback transformer n = 28:1
 *  -> Vout = 325 × 0.3 / 0.7 / 28 = 4.98 V; optocoupler feedback. */
export const SmpsScene: React.FC<any> = ({ dur, mode = "build" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const rv = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const on = (t * 0.7) % 1 < 0.3;
  const T = 330, B = 720;
  const W = (pts: string, c = L.wire) => <polyline points={pts} fill="none" stroke={c} strokeWidth={5} strokeLinejoin="round" />;
  const lab = (x: number, y: number, s: string, c: string = L.text, sz = 22) => <text x={x} y={y} textAnchor="middle" fill={c} fontFamily={MONO} fontSize={sz} fontWeight={700}>{s}</text>;
  const coil = (x: number, y: number, n: number, side: 1 | -1) => <path d={`M ${x} ${y} ` + Array.from({ length: n }, () => `a 14 14 0 1 ${side > 0 ? 1 : 0} 0 28`).join(" ")} fill="none" stroke={L.amber} strokeWidth={5} />;
  const left = <g>
    {/* mains */}
    <g opacity={rv(0)}><circle cx={90} cy={(T + B) / 2} r={44} fill={L.bg0} stroke={L.cyan} strokeWidth={5} />
      <path d={`M 64 ${(T + B) / 2} q 13 -26 26 0 t 26 0`} fill="none" stroke={L.cyan} strokeWidth={4} />
      {lab(90, (T + B) / 2 + 80, "230 V AC", L.cyan)}{W(`90,${(T + B) / 2 - 44} 90,${T} 170,${T}`)}{W(`90,${(T + B) / 2 + 44} 90,${B} 170,${B}`)}</g>
    {/* bridge */}
    <g opacity={rv(0.12)}><polygon points={`230,${T - 10} 290,${(T + B) / 2} 230,${B + 10} 170,${(T + B) / 2}`} fill={L.bg0} stroke={L.amber} strokeWidth={5} />
      {[[200, T + 80], [260, T + 80], [200, B - 80], [260, B - 80]].map(([x, y], k) => <polygon key={k} points={`${x - 12},${y - 10} ${x + 12},${y - 10} ${x},${y + 10}`} fill={L.amber} />)}
      {W(`170,${T} 230,${T - 10}`)}{W(`170,${B} 230,${B + 10}`)}{lab(230, B + 60, "BRIDGE")}
      {W(`290,${(T + B) / 2} 330,${(T + B) / 2} 330,${T} 470,${T}`)}{W(`170,${(T + B) / 2} 150,${(T + B) / 2} 150,${B + 100} 330,${B + 100} 330,${B} 600,${B}`)}</g>
    {/* bulk cap */}
    <g opacity={rv(0.25)}>{W(`400,${T} 400,${(T + B) / 2 - 12}`)}<line x1={370} y1={(T + B) / 2 - 12} x2={430} y2={(T + B) / 2 - 12} stroke={L.amber} strokeWidth={8} />
      <line x1={370} y1={(T + B) / 2 + 12} x2={430} y2={(T + B) / 2 + 12} stroke={L.amber} strokeWidth={8} />{W(`400,${(T + B) / 2 + 12} 400,${B}`)}{lab(400, (T + B) / 2 + 60, "325 V", L.red)}{lab(400, (T + B) / 2 + 86, "DC", L.red)}</g>
    {/* transformer primary + MOSFET */}
    <g opacity={rv(0.4)}>{W(`470,${T} 500,${T} 500,${T + 40}`)}{coil(500, T + 40, 6, -1)}{W(`500,${T + 208} 500,${520}`)}
      <rect x={474} y={520} width={52} height={80} rx={8} fill={on ? "rgba(46,196,160,0.25)" : L.bg0} stroke={on ? L.green : L.red} strokeWidth={5} />
      {lab(500, 568, "Q", on ? L.green : L.red)}{W(`500,600 500,${B}`)}
      <text x={470} y={650} textAnchor="end" fill={on ? L.green : L.red} fontFamily={MONO} fontSize={22} fontWeight={800}>{on ? "ON" : "OFF"}</text>
      <line x1={545} y1={T + 30} x2={545} y2={T + 220} stroke={L.text} strokeWidth={4} /><line x1={555} y1={T + 30} x2={555} y2={T + 220} stroke={L.text} strokeWidth={4} />
      {lab(550, T - 30, "TRANSFORMER 28 : 1")}</g>
    {/* secondary */}
    <g opacity={rv(0.6)}>{coil(600, T + 70, 3, 1)}{W(`600,${T + 70} 600,${T} 680,${T}`)}
      <polygon points={`680,${T - 22} 680,${T + 22} 716,${T}`} fill={L.bg0} stroke={L.amber} strokeWidth={5} /><line x1={716} y1={T - 22} x2={716} y2={T + 22} stroke={L.amber} strokeWidth={5} />
      {W(`716,${T} 900,${T}`)}{W(`600,${T + 154} 600,${B} 900,${B}`)}
      {W(`790,${T} 790,${(T + B) / 2 - 12}`)}<line x1={760} y1={(T + B) / 2 - 12} x2={820} y2={(T + B) / 2 - 12} stroke={L.amber} strokeWidth={8} />
      <line x1={760} y1={(T + B) / 2 + 12} x2={820} y2={(T + B) / 2 + 12} stroke={L.amber} strokeWidth={8} />{W(`790,${(T + B) / 2 + 12} 790,${B}`)}
      <circle cx={900} cy={T} r={10} fill={L.green} /><circle cx={900} cy={B} r={10} fill={L.green} />{lab(900, T - 30, "5 V", L.green, 30)}</g>
    {/* feedback */}
    <g opacity={rv(0.8)}><path d={`M 900 ${B} L 900 ${B + 110} L 560 ${B + 110}`} fill="none" stroke={L.cyan} strokeWidth={4} strokeDasharray="10 8" />
      <rect x={470} y={B + 80} width={90} height={60} rx={10} fill={L.panel} stroke={L.cyan} strokeWidth={4} />{lab(515, B + 118, "OPTO", L.cyan, 20)}
      <path d={`M 470 ${B + 110} L 440 ${B + 110} L 440 560 L 474 560`} fill="none" stroke={L.cyan} strokeWidth={4} strokeDasharray="10 8" />
      {lab(700, B + 175, "feedback: output → light → controller", L.cyan, 20)}</g>
    {mode !== "build" && mode !== "calc" && (on ? <Dots pts={[[470, T], [500, T], [500, B], [400, B], [400, T], [470, T]]} t={t} speed={140} />
      : <Dots pts={[[600, B], [600, T], [900, T], [900, B], [600, B]]} t={t} speed={140} color={L.amber} />)}
  </g>;
  const GX = 1040, GW = 780;
  const tr = (cy: number, h: number, fn: (u: number) => number, col: string, name: string, top: string) => { const q: string[] = [];
    for (let k = 0; k <= 400; k++) { const u = k / 400; if (u > (mode === "build" ? p : 1)) break; q.push(`${GX + GW * u},${cy - fn(u) * h}`); }
    return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} />
      <text x={GX + 8} y={cy - h - 14} fill={col} fontFamily={SANS} fontSize={24} fontWeight={800}>{name}</text>
      <text x={GX - 10} y={cy - h + 6} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={18}>{top}</text>
      {q.length > 1 && <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={4} />}</g>; };
  let right: React.ReactNode;
  if (mode === "calc") { const ls = ["Vdc = 230 × √2 = 325 V", "flyback: Vout = Vdc × D ÷ (1 − D) ÷ n", "= 325 × 0.3 ÷ 0.7 ÷ 28", "= 139 ÷ 28 ≈ 5.0 V", "65 kHz vs 50 Hz: 1300× faster", "→ transformer can be ~100× smaller"];
    right = <g>{ls.map((l, k) => <text key={k} x={GX + 10} y={240 + k * 105} fill={k === 3 ? L.green : L.text} fontFamily={MONO} fontSize={30} fontWeight={700}
      opacity={interpolate(p, [k * 0.14, k * 0.14 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>; }
  else if (mode === "rect") right = <g>
    {tr(330, 120, (u) => Math.sin(u * 4 * Math.PI), L.cyan, "mains AC (325 V peak)", "325 V")}
    {tr(620, 200, (u) => Math.abs(Math.sin(u * 4 * Math.PI)), L.amber, "after the bridge", "325 V")}
    {tr(900, 200, (u) => 0.95 + 0.05 * Math.abs(Math.sin(u * 4 * Math.PI)), L.red, "after the bulk capacitor: DC", "325 V")}</g>;
  else right = <g>
    {tr(330, 150, (u) => ((u * 6) % 1 < 0.3 ? 1 : 0), L.cyan, "MOSFET switch, 65 kHz, D = 30%", "ON")}
    {tr(620, 180, (u) => { const x = (u * 6) % 1; return x < 0.3 ? x / 0.3 : 0; }, L.amber, "primary current: energy stored", "")}
    {tr(900, 180, (u) => { const x = (u * 6) % 1; return x < 0.3 ? 0 : 1 - (x - 0.3) / 0.7; }, L.green, "secondary current: energy released", "")}</g>;
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(60,120)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<><g transform="translate(60,0)">{left}</g>{right}</>);
};
ANALOG_SCENES.smps = SmpsScene;

// ------------------------------------------------------------------ Voltage multipliers (ideal diodes; Vp = 10 V)
/** {"type":"vmul","mode":"build"|"neg"|"pos"|"run"|"quad"|"calc"}
 *  Half-wave doubler: D1/C1 clamp, D2/C2 peak detector -> 2Vp = 20 V. quad: Cockcroft-Walton, 4 stages of C -> 40 V. */
export const VMulScene: React.FC<any> = ({ dur, mode = "build" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const rv = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const VP = 10, cyc = 4;
  // simulate ideal doubler over cyc cycles (light load-free)
  const sim = (u: number) => { let c1 = 0, c2 = 0, vin = 0; const n = 600; const k = Math.floor(u * n);
    for (let i = 0; i <= k; i++) { vin = VP * Math.sin(2 * Math.PI * cyc * i / n);
      const node = vin + c1; if (node < 0) { c1 = -vin; } const nd = vin + c1; if (nd > c2) c2 = c2 + (nd - c2) * 0.35; }
    return { vin, c1, c2, node: vin + c1 }; };
  const live = mode === "neg" ? { vin: -VP, c1: VP, c2: 0, node: 0 } : mode === "pos" ? { vin: VP, c1: VP, c2: 2 * VP, node: 2 * VP } : sim(mode === "run" ? p : 1);
  const T = 300, B = 760, XS = 150;
  const cap = (x: number, y: number, horiz: boolean, lab: string, v: number) => horiz
    ? <g><rect x={x - 20} y={y - 40} width={40} height={80} fill={L.bg0} /><line x1={x - 12} y1={y - 40} x2={x - 12} y2={y + 40} stroke={L.amber} strokeWidth={8} /><line x1={x + 12} y1={y - 40} x2={x + 12} y2={y + 40} stroke={L.amber} strokeWidth={8} />
      <text x={x} y={y - 56} textAnchor="middle" {...T1} fontSize={24}>{lab}</text><text x={x} y={y + 76} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={800}>{v.toFixed(0)} V</text></g>
    : <g><rect x={x - 40} y={y - 20} width={80} height={40} fill={L.bg0} /><line x1={x - 40} y1={y - 12} x2={x + 40} y2={y - 12} stroke={L.amber} strokeWidth={8} /><line x1={x - 40} y1={y + 12} x2={x + 40} y2={y + 12} stroke={L.amber} strokeWidth={8} />
      <text x={x + 54} y={y - 4} {...T1} fontSize={24}>{lab}</text><text x={x + 54} y={y + 26} fill={L.amber} fontFamily={MONO} fontSize={24} fontWeight={800}>{v.toFixed(0)} V</text></g>;
  const dio = (x: number, y: number, rot: number, lab: string, on: boolean) => <g transform={`translate(${x},${y}) rotate(${rot})`}>
    <rect x={-30} y={-30} width={60} height={60} fill={L.bg0} /><polygon points="-22,-24 -22,24 20,0" fill={on ? "rgba(46,196,160,0.35)" : L.bg0} stroke={on ? L.green : L.amber} strokeWidth={5} />
    <line x1={20} y1={-24} x2={20} y2={24} stroke={on ? L.green : L.amber} strokeWidth={5} /><text x={0} y={-40} textAnchor="middle" {...T1} fontSize={22} transform={`rotate(${-rot})`}>{lab}</text></g>;
  let left: React.ReactNode;
  if (mode !== "quad") {
    const d1on = mode === "neg", d2on = mode === "pos";
    left = <g>
      <circle cx={XS} cy={(T + B) / 2} r={50} fill={L.bg0} stroke={L.cyan} strokeWidth={6} /><path d={`M ${XS - 30} ${(T + B) / 2} q 15 -28 30 0 t 30 0`} fill="none" stroke={L.cyan} strokeWidth={5} />
      <text x={XS} y={(T + B) / 2 + 90} textAnchor="middle" {...T1} fontSize={26} fill={L.cyan}>10 V peak</text>
      <polyline points={`${XS},${(T + B) / 2 - 50} ${XS},${T} 260,${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
      <polyline points={`${XS},${(T + B) / 2 + 50} ${XS},${B} 860,${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
      <g opacity={rv(0.1)}>{cap(320, T, true, "C1", live.c1)}<line x1={340} y1={T} x2={480} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={rv(0.3)}><line x1={420} y1={T} x2={420} y2={B} stroke={L.wire} strokeWidth={6} />{dio(420, 530, -90, "D1", d1on)}</g>
      <g opacity={rv(0.5)}>{dio(560, T, 0, "D2", d2on)}<line x1={480} y1={T} x2={530} y2={T} stroke={L.wire} strokeWidth={6} /><line x1={590} y1={T} x2={860} y2={T} stroke={L.wire} strokeWidth={6} /></g>
      <g opacity={rv(0.7)}><line x1={720} y1={T} x2={720} y2={B} stroke={L.wire} strokeWidth={6} />{cap(720, 530, false, "C2", live.c2)}
        <circle cx={860} cy={T} r={11} fill={L.green} /><circle cx={860} cy={B} r={11} fill={L.green} />
        <text x={860} y={T - 40} textAnchor="middle" {...T1} fontSize={30} fill={L.green}>Vout {live.c2.toFixed(1)} V</text></g>
      {mode === "neg" && <Dots pts={[[XS, B], [420, B], [420, T], [340, T], [260, T], [XS, T], [XS, B]]} t={t} speed={110} />}
      {mode === "pos" && <Dots pts={[[XS, T], [480, T], [720, T], [720, B], [XS, B], [XS, T]]} t={t} speed={110} />}
      {(mode === "neg" || mode === "pos") && <text x={500} y={B + 70} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={26} fontWeight={700}>
        {mode === "neg" ? "NEGATIVE half: D1 conducts, C1 charges to 10 V" : "POSITIVE half: 10 V source + 10 V on C1 = 20 V through D2 into C2"}</text>}
    </g>;
  } else {
    const st = [10, 20, 30, 40]; const lvl = Math.min(4, Math.floor(p * 5));
    left = <g>
      <circle cx={XS} cy={(T + B) / 2} r={50} fill={L.bg0} stroke={L.cyan} strokeWidth={6} /><path d={`M ${XS - 30} ${(T + B) / 2} q 15 -28 30 0 t 30 0`} fill="none" stroke={L.cyan} strokeWidth={5} />
      <polyline points={`${XS},${(T + B) / 2 - 50} ${XS},${T} 230,${T}`} fill="none" stroke={L.wire} strokeWidth={6} />
      <polyline points={`${XS},${(T + B) / 2 + 50} ${XS},${B} 880,${B}`} fill="none" stroke={L.wire} strokeWidth={6} />
      <line x1={270} y1={T} x2={880} y2={T} stroke={L.wire} strokeWidth={6} />
      {[0, 1, 2, 3].map((k) => { const x = 330 + k * 150; return <g key={k}>
        <line x1={x} y1={T} x2={x + 150 > 880 ? 880 : x + 150} y2={B} stroke={L.wire} strokeWidth={5} />
        {dio(x + 75, (T + B) / 2, 72, `D${k + 1}`, lvl === k + 1)}</g>; })}
      {cap(250, T, true, "C1", lvl >= 1 ? 10 : 0)}{cap(560, T, true, "C3", lvl >= 3 ? 20 : 0)}
      {cap(400, B, true, "C2", lvl >= 2 ? 20 : 0)}{cap(700, B, true, "C4", lvl >= 4 ? 20 : 0)}
      <text x={520} y={B + 120} textAnchor="middle" {...T1} fontSize={30} fill={L.green}>output after {lvl} stage{lvl === 1 ? "" : "s"}: {lvl ? st[lvl - 1] : 0} V</text>
    </g>;
  }
  const GX = 1040, GW = 780;
  let right: React.ReactNode;
  const tr = (cy: number, h: number, sc: number, fn: (u: number) => number, col: string, name: string) => { const q: string[] = [];
    for (let k = 0; k <= 300; k++) { const u = k / 300; if (mode === "run" && u > p) break; q.push(`${GX + GW * u},${cy - fn(u) * h / sc}`); }
    return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><text x={GX + 8} y={cy - h - 12} fill={col} fontFamily={SANS} fontSize={24} fontWeight={800}>{name}</text>
      <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} /></g>; };
  if (mode === "calc") { const ls = ["Doubler: C1 charges to Vp = 10 V", "D2 sees Vp + VC1 = 2Vp = 20 V", "n stages → n × Vp (ideal)", "4 stages: 4 × 10 = 40 V", "real diodes: −0.7 V each", "doubler: 2 × (10 − 0.7) = 18.6 V"];
    right = <g>{ls.map((l, k) => <text key={k} x={GX + 10} y={240 + k * 105} fill={k === 3 ? L.green : L.text} fontFamily={MONO} fontSize={30} fontWeight={700}
      opacity={interpolate(p, [k * 0.14, k * 0.14 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>; }
  else if (mode === "quad") right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>STACKING STAGES</text>
    {[1, 2, 3, 4].map((k) => { const lvl = Math.min(4, Math.floor(p * 5)); return <g key={k} opacity={lvl >= k ? 1 : 0.2}>
      <rect x={GX + (k - 1) * 190 + 20} y={800 - k * 120} width={130} height={k * 120} rx={8} fill={L.green} />
      <text x={GX + (k - 1) * 190 + 85} y={780 - k * 120} textAnchor="middle" {...T1} fontSize={28} fill={L.green}>{k * 10} V</text>
      <text x={GX + (k - 1) * 190 + 85} y={840} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>×{k}</text></g>; })}</g>;
  else right = <g>
    {tr(360, 120, 10, (u) => VP * Math.sin(2 * Math.PI * cyc * u), L.cyan, "input (±10 V)")}
    {tr(900, 300, 20, (u) => sim(u).c2, L.green, "output across C2 → 20 V")}
    <text x={GX + GW} y={900 - 300 - 12} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={20}>20 V</text></g>;
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(30,120)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.vmul = VMulScene;

// ------------------------------------------------------------------ Schottky vs PN diode
/** {"type":"schottky","mode":"junction"|"iv"|"loss"|"speed"|"calc"} PN Vf ≈ 0.7 V, Schottky Vf ≈ 0.3 V at 2 A. */
export const SchottkyScene: React.FC<any> = ({ dur, mode = "junction" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  // left: two junction cross-sections
  const blk = (x: number, y: number, a: [string, string, string], b: [string, string, string], name: string, vf: string) => <g>
    <text x={x + 200} y={y - 30} textAnchor="middle" {...T1} fontSize={30}>{name}</text>
    <rect x={x} y={y} width={200} height={150} fill={a[1]} /><text x={x + 100} y={y + 85} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={28} fontWeight={800}>{a[0]}</text>
    <rect x={x + 200} y={y} width={200} height={150} fill={b[1]} /><text x={x + 300} y={y + 85} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={28} fontWeight={800}>{b[0]}</text>
    {Array.from({ length: 8 }, (_, k) => <circle key={k} cx={x + 200 + ((k * 47 + t * 60) % 200)} cy={y + 20 + (k * 37) % 120} r={6} fill={L.electron} />)}
    <text x={x + 200} y={y + 200} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{a[2]}</text>
    <text x={x + 200} y={y + 240} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={800}>{vf}</text></g>;
  const left = <g>{blk(120, 220, ["P-type", "#b5473a", "PN: two semiconductors"], ["N-type", "#2e5a87", ""], "PN DIODE", "turns on at ≈ 0.7 V")}
    {blk(120, 620, ["METAL", "#8a96a3", "Schottky: metal on N-type"], ["N-type", "#2e5a87", ""], "SCHOTTKY", "turns on at ≈ 0.3 V")}</g>;
  const GX = 1000, GW = 820;
  let right: React.ReactNode;
  if (mode === "iv" || mode === "junction") { const vx = (v: number) => GX + v / 1.0 * GW, iy = (i: number) => 820 - i / 3 * 560;
    const curve = (vt: number, col: string) => { const q: string[] = []; for (let k = 0; k <= 200; k++) { const v = k / 200; const i = 1e-6 * (Math.exp((v - 0) / (0.026 * 1.6)) - 1) * Math.exp(-vt / (0.026 * 1.6)) * 1e6 * 0; void i;
        const ii = Math.max(0, (v - vt) * 12) ** 1.5 / 3; if (iy(ii) < 240) break; if (mode === "iv" && v > p * 1.0 + 0.001) break; q.push(`${vx(v)},${iy(ii)}`); } return <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={6} />; };
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={32}>CURRENT vs VOLTAGE</text>
      <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={230} stroke={L.dim} strokeWidth={3} />
      {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => <text key={v} x={vx(v)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{v.toFixed(1)} V</text>)}
      {curve(0.2, L.green)}{curve(0.5, L.amber)}
      <text x={vx(0.3)} y={270} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={26} fontWeight={800}>Schottky</text>
      <text x={vx(0.78)} y={270} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={26} fontWeight={800}>PN</text>
      <line x1={GX} y1={iy(2)} x2={GX + GW} y2={iy(2)} stroke={L.dim} strokeDasharray="6 8" strokeWidth={2} /><text x={GX - 10} y={iy(2) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>2 A</text></g>; }
  else if (mode === "loss") { const s = 260 * p;
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={32}>HEAT AT 2 A</text>
      <rect x={GX + 120} y={800 - 1.4 * s} width={180} height={1.4 * s} rx={8} fill={L.amber} /><rect x={GX + 480} y={800 - 0.6 * s} width={180} height={0.6 * s} rx={8} fill={L.green} />
      <text x={GX + 210} y={780 - 1.4 * s} textAnchor="middle" {...T1} fontSize={30} fill={L.amber}>1.4 W</text><text x={GX + 570} y={780 - 0.6 * s} textAnchor="middle" {...T1} fontSize={30} fill={L.green}>0.6 W</text>
      <text x={GX + 210} y={850} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>PN: 0.7 V × 2 A</text><text x={GX + 570} y={850} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>Schottky: 0.3 V × 2 A</text></g>; }
  else if (mode === "speed") { const tr = (cy: number, col: string, tail: boolean, name: string) => { const q: string[] = [];
      for (let k = 0; k <= 300; k++) { const u = k / 300; const x = u * 4 % 1; let v = x < 0.5 ? 1 : 0; if (tail && x >= 0.5 && x < 0.62) v = -0.8 * (1 - (x - 0.5) / 0.12); q.push(`${GX + GW * u},${cy - v * 90}`); }
      return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><text x={GX + 8} y={cy - 110} fill={col} fontFamily={SANS} fontSize={26} fontWeight={800}>{name}</text><polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} /></g>; };
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={32}>TURNING OFF: DIODE CURRENT</text>
      {tr(420, L.amber, true, "PN: current flows BACKWARDS for a moment (stored charge)")}{tr(780, L.green, false, "Schottky: stops almost instantly")}</g>; }
  else { const ls = ["PN loss = 0.7 V × 2 A = 1.4 W", "Schottky loss = 0.3 V × 2 A = 0.6 W", "saving = 0.8 W  (57% less heat)", "5 V, 2 A buck: Pout = 10 W", "diode 1.4 W → 0.6 W", "trade-off: more reverse leakage, lower max voltage"];
    right = <g>{ls.map((l, k) => <text key={k} x={GX} y={240 + k * 105} fill={k === 2 ? L.green : k === 5 ? L.red : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
      opacity={interpolate(p, [k * 0.14, k * 0.14 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(160,100)">{left}</g><g transform="translate(-920,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.schottky = SchottkyScene;

// ------------------------------------------------------------------ BJT engine (structure, control, biasing, load line, regions, β-stability)
/** {"type":"bjt","mode":"layers"|"control"|"circuit"|"beta"|"loadline"|"regions"|"calc","kind":"npn"|"pnp",
 *   "bias":"basic"|"fixed"|"cf"|"vd","beta":100,"lines":[...]}
 *  VCC = 12 V, RC = 2 kΩ, VBE = 0.7 V. fixed RB = 565 kΩ; cf RB = 363 kΩ; vd R1 = 33k, R2 = 10k, RE = 1k; basic VBB = 5 V, RB = 215 kΩ. */
const BJ = { VCC: 12, RC: 2000, VBE: 0.7, VSAT: 0.2 };
export const bjtSolve = (bias: string, b: number) => {
  let ib = 0, re = 0;
  if (bias === "basic") ib = (5 - BJ.VBE) / 215e3;
  else if (bias === "fixed") ib = (BJ.VCC - BJ.VBE) / 565e3;
  else if (bias === "cf") ib = (BJ.VCC - BJ.VBE) / (363e3 + (b + 1) * BJ.RC);
  else { const vth = BJ.VCC * 10 / 43, rth = 33e3 * 10e3 / 43e3; re = 1000; ib = (vth - BJ.VBE) / (rth + (b + 1) * re); }
  let ic = b * ib; const icsat = (BJ.VCC - BJ.VSAT) / (BJ.RC + re); let sat = false;
  if (ic > icsat) { ic = icsat; sat = true; }
  const ie = ic + ib; const vce = bias === "cf" ? BJ.VCC - ie * BJ.RC : BJ.VCC - ic * BJ.RC - ie * re;
  return { ib, ic, ie, vce: sat ? BJ.VSAT : vce, sat, re };
};
const uA = (a: number) => `${+(a * 1e6).toFixed(1)} µA`;
const mAs = (a: number) => `${+(a * 1e3).toFixed(2)} mA`;
export const BjtScene: React.FC<any> = ({ dur, mode = "circuit", kind = "npn", bias = "fixed", beta = 100, lines = [], ibx }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const npn = kind !== "pnp";
  const B = mode === "beta" ? 50 + 150 * p : beta;
  const vbb = mode === "regions" ? 15 * p : 5;
  const s = mode === "regions" ? (() => { const ib = Math.max(0, (vbb - BJ.VBE) / 215e3); let ic = B * ib; const icsat = (BJ.VCC - BJ.VSAT) / BJ.RC; const sat = ic > icsat; if (sat) ic = icsat;
    return { ib, ic, ie: ib + ic, vce: sat ? BJ.VSAT : BJ.VCC - ic * BJ.RC, sat, re: 0 }; })() : bjtSolve(bias, B);
  // ---------- transistor symbol at (x,y): base at x-60, collector up, emitter down
  const Q = (x: number, y: number, glow = 0) => <g>
    {glow > 0 && <circle cx={x} cy={y} r={95} fill={L.green} opacity={0.1 + 0.15 * glow} />}
    <circle cx={x} cy={y} r={70} fill={L.bg0} stroke={L.amber} strokeWidth={5} />
    <line x1={x - 25} y1={y - 40} x2={x - 25} y2={y + 40} stroke={L.amber} strokeWidth={9} />
    <line x1={x - 70} y1={y} x2={x - 25} y2={y} stroke={L.amber} strokeWidth={6} />
    <line x1={x - 25} y1={y - 18} x2={x + 20} y2={y - 60} stroke={L.amber} strokeWidth={6} /><line x1={x + 20} y1={y - 60} x2={x + 20} y2={y - 70} stroke={L.amber} strokeWidth={6} />
    <line x1={x - 25} y1={y + 18} x2={x + 20} y2={y + 60} stroke={L.amber} strokeWidth={6} /><line x1={x + 20} y1={y + 60} x2={x + 20} y2={y + 70} stroke={L.amber} strokeWidth={6} />
    {npn ? <polygon points={`${x + 20},${y + 60} ${x - 6},${y + 52} ${x + 8},${y + 36}`} fill={L.amber} />
         : <polygon points={`${x - 22},${y - 21} ${x + 3},${y - 31} ${x - 11},${y - 45}`} fill={L.amber} />}
    <text x={x + 34} y={y - 70} fill={L.dim} fontFamily={MONO} fontSize={22}>{npn ? "C" : "E"}</text>
    <text x={x + 34} y={y + 90} fill={L.dim} fontFamily={MONO} fontSize={22}>{npn ? "E" : "C"}</text>
    <text x={x - 90} y={y - 14} fill={L.dim} fontFamily={MONO} fontSize={22}>B</text></g>;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const rail = 200, gnd = 880, XQ = 640, YQ = 560, XC = XQ + 20;
  let left: React.ReactNode = null;
  if (mode === "layers") {
    const lay = npn ? [["N", "#2e5a87", "EMITTER"], ["P", "#b5473a", "BASE"], ["N", "#2e5a87", "COLLECTOR"]] : [["P", "#b5473a", "EMITTER"], ["N", "#2e5a87", "BASE"], ["P", "#b5473a", "COLLECTOR"]];
    const xs = [120, 420, 520], ws = [300, 100, 380];
    left = <g>{lay.map(([l, c, n], k) => <g key={k}><rect x={xs[k]} y={360} width={ws[k]} height={260} fill={c} />
        <text x={xs[k] + ws[k] / 2} y={510} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={48} fontWeight={800}>{l}</text>
        <text x={xs[k] + ws[k] / 2} y={k === 1 ? 320 : 680} textAnchor="middle" {...T1} fontSize={24}>{n}</text>
        <line x1={xs[k] + ws[k] / 2} y1={k === 1 ? 330 : 620} x2={xs[k] + ws[k] / 2} y2={k === 1 ? 360 : 650} stroke={L.wire} strokeWidth={5} /></g>)}
      {Array.from({ length: 14 }, (_, k) => { const u = ((k / 14 + t * 0.25) % 1); const x = 130 + u * 760; const y = 390 + ((k * 53) % 200);
        const toBase = k % 14 === 0 && u > 0.38; return <circle key={k} cx={toBase ? 470 : x} cy={toBase ? 390 - (u - 0.38) * 200 : y} r={9} fill={npn ? L.electron : "#ff9f6b"} opacity={toBase && u > 0.6 ? 0 : 1} />; })}
      <text x={510} y={780} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{npn ? "electrons" : "holes"} rush from emitter, straight through the THIN base, into the collector</text></g>;
  } else if (mode === "control") {
    const ib = (ibx ?? 0) || (10e-6 + 30e-6 * p); const ic = beta * ib;
    left = <g>
      {W(`${XC},${YQ - 70} ${XC},${rail}`)}{W(`${XC},${YQ + 70} ${XC},${gnd}`)}{W(`${XQ - 70},${YQ} 300,${YQ}`)}
      {Q(XQ, YQ, ic / 4e-3)}
      <Dots pts={[[300, YQ], [XQ - 30, YQ], [XC, YQ + 70], [XC, gnd]]} t={t} speed={20 + ib * 2e6} gap={70} r={5} color={L.cyan} />
      <Dots pts={[[XC, rail], [XC, gnd]]} t={t} speed={40 + ic * 4e4} gap={28} />
      <text x={300} y={YQ - 30} {...T1} fontSize={28} fill={L.cyan}>IB = {uA(ib)}</text>
      <text x={XC + 40} y={rail + 60} {...T1} fontSize={28} fill={L.electron}>IC = {mAs(ic)}</text>
      <text x={XC + 40} y={gnd - 40} {...T1} fontSize={28}>IE = IB + IC</text></g>;
  } else {
    const bOn = true; const showRE = bias === "vd";
    const ieY = showRE ? 760 : gnd;
    left = <g>
      <line x1={120} y1={rail} x2={900} y2={rail} stroke={L.red} strokeWidth={6} /><text x={120} y={rail - 20} {...T1} fontSize={28} fill={L.red}>+12 V</text>
      <line x1={120} y1={gnd} x2={900} y2={gnd} stroke={L.wire} strokeWidth={6} /><text x={120} y={gnd + 44} {...T1} fontSize={26} fill={L.dim}>0 V</text>
      {npn ? <><Res x={XC} y={320} ohm={BJ.RC} label="RC" />{W(`${XC},${rail} ${XC},250`)}{W(`${XC},390 ${XC},${YQ - 70}`)}</>
        : <>{W(`${XC},${rail} ${XC},${YQ - 70}`)}<Res x={XC} y={780} ohm={BJ.RC} label="RC" /></>}
      {Q(XQ, YQ, mode === "regions" ? (s.sat ? 1 : 0.4) : 0)}
      {!npn ? <g>{W(`${XC},${YQ + 70} ${XC},710`)}{W(`${XC},850 ${XC},${gnd}`)}</g> : showRE ? <g><Res x={XC} y={ieY - 30} ohm={1000} label="RE" />{W(`${XC},${YQ + 70} ${XC},${ieY - 100}`)}{W(`${XC},${ieY + 40} ${XC},${gnd}`)}</g> : W(`${XC},${YQ + 70} ${XC},${gnd}`)}
      {bias === "fixed" && npn && <g><Res x={420} y={380} ohm={565e3} label="RB" />{W(`420,${rail} 420,310`)}{W(`420,450 420,${YQ} ${XQ - 70},${YQ}`)}</g>}
      {bias === "fixed" && !npn && <g><Res x={420} y={740} ohm={565e3} label="RB" />{W(`420,${gnd} 420,810`)}{W(`420,670 420,${YQ} ${XQ - 70},${YQ}`)}
        <text x={260} y={500} fill={L.amber} fontFamily={SANS} fontSize={22} fontWeight={700}>RB pulls the base DOWN</text></g>}
      {bias === "basic" && <g><Battery x={250} y={720} v={vbb} />{W(`250,680 250,${YQ} 330,${YQ}`)}{W(`250,760 250,${gnd}`)}<Res x={400} y={YQ} ohm={215e3} label="RB" horizontal />{W(`470,${YQ} ${XQ - 70},${YQ}`)}</g>}
      {bias === "cf" && <g>{W(`${XC},450 360,450 360,470`)}<Res x={360} y={520} ohm={363e3} label="RB" />{W(`360,590 360,${YQ} ${XQ - 70},${YQ}`)}
        <text x={200} y={430} fill={L.amber} fontFamily={SANS} fontSize={22} fontWeight={700}>RB from the COLLECTOR</text></g>}
      {bias === "vd" && <g><Res x={420} y={350} ohm={33e3} label="R1" />{W(`420,${rail} 420,280`)}{W(`420,420 420,${YQ} ${XQ - 70},${YQ}`)}
        <Res x={420} y={700} ohm={10e3} label="R2" />{W(`420,${YQ} 420,630`)}{W(`420,770 420,${gnd}`)}</g>}
      {mode !== "calc" && <g>
        <Dots pts={[[XC, rail], [XC, YQ - 70], [XC, YQ + 70], [XC, gnd]]} t={t} speed={30 + s.ic * 3e4} gap={30} />
        <text x={XC + 50} y={470} {...T1} fontSize={26} fill={L.electron}>IC = {mAs(s.ic)}</text>
        <text x={XQ - 90} y={YQ - 30} textAnchor="end" {...T1} fontSize={24} fill={L.cyan}>IB = {uA(s.ib)}</text>
        <text x={XC + 50} y={YQ + 10} {...T1} fontSize={26} fill={L.green}>{npn ? "VCE" : "VEC"} = {s.vce.toFixed(2)} V</text></g>}
    </g>;
  }
  // ---------- right side
  const GX = 1040, GW = 780;
  let right: React.ReactNode = null;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={GX} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text>
    <text x={GX + GW} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
      opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  else if (mode === "layers") right = <g><text x={GX + GW / 2} y={250} textAnchor="middle" {...T1} fontSize={32}>{npn ? "NPN" : "PNP"} TRANSISTOR</text>
    {[`emitter: heavily doped, sends ${npn ? "electrons" : "holes"}`, "base: very THIN and lightly doped", "collector: large, collects them", `BE junction: forward biased (≈0.7 V)`, "CB junction: reverse biased", "≈99% reach the collector, ≈1% leave via the base"].map((l, k) =>
      <text key={k} x={GX - 20} y={360 + k * 85} fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={600} opacity={interpolate(p, [k * 0.13, k * 0.13 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>• {l}</text>)}</g>;
  else if (mode === "control") { const ib = (ibx ?? 0) || (10e-6 + 30e-6 * p);
    right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>A SMALL CURRENT CONTROLS A BIG ONE</text>
      <rect x={GX + 100} y={800 - ib * 1e6 * 12} width={180} height={ib * 1e6 * 12} rx={8} fill={L.cyan} /><rect x={GX + 480} y={800 - ib * beta * 1e3 * 120} width={180} height={ib * beta * 1e3 * 120} rx={8} fill={L.electron} />
      <text x={GX + 190} y={850} textAnchor="middle" fill={L.cyan} fontFamily={MONO} fontSize={28} fontWeight={800}>IB {uA(ib)}</text>
      <text x={GX + 570} y={850} textAnchor="middle" fill={L.electron} fontFamily={MONO} fontSize={28} fontWeight={800}>IC {mAs(ib * beta)}</text>
      <text x={GX + GW / 2} y={930} textAnchor="middle" {...T1} fontSize={30}>IC = β × IB, β = {beta}</text>
</g>; }
  else if (mode === "beta") { const pts = (bs: string, col: string) => { const q: string[] = []; for (let k = 0; k <= 100; k++) { const b = 50 + 150 * k / 100; if (b > B + 0.5) break; q.push(`${GX + (b - 50) / 150 * GW},${820 - bjtSolve(bs, b).ic / 6e-3 * 560}`); }
      return <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={bs === bias ? 7 : 3} opacity={bs === bias ? 1 : 0.35} />; };
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>IC as β changes from 50 to 200</text>
      <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={240} stroke={L.dim} strokeWidth={3} />
      {[50, 100, 150, 200].map((b) => <text key={b} x={GX + (b - 50) / 150 * GW} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>β={b}</text>)}
      {[0, 2, 4, 6].map((m) => <text key={m} x={GX - 10} y={820 - m / 6 * 560 + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>{m} mA</text>)}
      {pts(bias, L.green)}
      <text x={GX + GW / 2} y={940} textAnchor="middle" {...T1} fontSize={28}>β = {B.toFixed(0)} → IC = {mAs(s.ic)}, VCE = {s.vce.toFixed(1)} V{s.sat ? " (SATURATED)" : ""}</text></g>; }
  else if (mode === "loadline") { const vx = (v: number) => GX + v / 12 * GW, iy = (i: number) => 820 - i / 6.5e-3 * 560; const icsat = (BJ.VCC - 0) / (BJ.RC + s.re);
    const reveal = Math.min(1, p * 2);
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>OUTPUT CHARACTERISTICS + LOAD LINE</text>
      <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={240} stroke={L.dim} strokeWidth={3} />
      {[0, 3, 6, 9, 12].map((v) => <text key={v} x={vx(v)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{v} V</text>)}
      <text x={GX + GW} y={900} textAnchor="end" fill={L.dim} fontFamily={SANS} fontSize={22}>VCE</text>
      {[0, 2, 4, 6].map((m) => <text key={m} x={GX - 10} y={iy(m / 1000) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>{m} mA</text>)}
      {[10, 20, 30, 40, 50].map((ib) => { const ic = beta * ib * 1e-6; return <g key={ib}><polyline points={`${vx(0)},${iy(0)} ${vx(0.3)},${iy(ic * 0.95)} ${vx(12)},${iy(ic * 1.06)}`} fill="none" stroke={L.cyan} strokeWidth={3} opacity={0.6} />
        <text x={vx(12) - 4} y={iy(ic * 1.06) - 8} textAnchor="end" fill={L.cyan} fontFamily={MONO} fontSize={18}>IB {ib} µA</text></g>; })}
      <line x1={vx(0)} y1={iy(icsat)} x2={vx(0) + (vx(12) - vx(0)) * reveal} y2={iy(icsat) + (iy(0) - iy(icsat)) * reveal} stroke={L.amber} strokeWidth={6} />
      <text x={vx(0) + 14} y={iy(icsat) - 12} fill={L.amber} fontFamily={MONO} fontSize={22} fontWeight={700}>IC(sat) = 12 ÷ {(BJ.RC + s.re) / 1000} k = {mAs(icsat)}</text>
      <text x={vx(12) - 8} y={iy(0) - 16} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={22} fontWeight={700}>VCE(off) = 12 V</text>
      {p > 0.5 && <g><circle cx={vx(s.vce)} cy={iy(s.ic)} r={14} fill={L.green} /><text x={vx(s.vce) + (s.vce > 6 ? -20 : 20)} y={iy(s.ic) - 18} textAnchor={s.vce > 6 ? "end" : "start"} fill={L.green} fontFamily={MONO} fontSize={26} fontWeight={800}>Q ({s.vce.toFixed(1)} V, {mAs(s.ic)})</text></g>}</g>; }
  else if (mode === "regions") { const reg = s.sat ? "SATURATION" : s.ic < 1e-6 ? "CUTOFF" : "ACTIVE";
    right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>REGION: {reg}</text>
      {row(330, "β", `${B.toFixed(0)}`, L.text)}{row(420, "IB", uA(s.ib), L.cyan)}{row(510, "IC", mAs(s.ic), L.electron)}{row(600, "VCE", `${s.vce.toFixed(2)} V`, L.green)}</g>; }
  else right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>{({ basic: "BASIC BIAS", fixed: "FIXED BIAS", cf: "COLLECTOR-FEEDBACK BIAS", vd: "VOLTAGE-DIVIDER BIAS" } as any)[bias]}</text>
    {row(320, "β", `${B.toFixed(0)}`, L.text)}{row(410, "base current IB", uA(s.ib), L.cyan)}{row(500, "collector current IC", mAs(s.ic), L.electron)}
    {row(590, "emitter current IE", mAs(s.ie), L.text)}{row(680, "VCE", `${s.vce.toFixed(2)} V`, L.green)}
    {row(770, "power in transistor", `${(s.vce * s.ic * 1000).toFixed(1)} mW`, L.red)}</g>;
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.bjt = BjtScene;

// ------------------------------------------------------------------ Small-signal BJT amplifiers on the voltage-divider bias (IE = 1.94 mA, re = 13.4 Ω, β = 100)
/** {"type":"amp","cfg":"ce"|"cb"|"cc","mode":"build"|"run"|"model"|"compare"|"calc","bypass":true,"lines":[...]} */
const AMP = { RC: 2000, RE: 1000, RTH: 7674, B: 100, IE: 1.94e-3 };
export const ampCalc = (cfg: string, bypass: boolean) => { const re = 0.026 / AMP.IE;
  if (cfg === "ce") { const av = bypass ? -AMP.RC / re : -AMP.RC / (re + AMP.RE); const zb = AMP.B * (bypass ? re : re + AMP.RE);
    return { re, av, zin: 1 / (1 / AMP.RTH + 1 / zb), zout: AMP.RC }; }
  if (cfg === "cb") return { re, av: AMP.RC / re, zin: re, zout: AMP.RC };
  const zb = AMP.B * (re + AMP.RE); return { re, av: AMP.RE / (re + AMP.RE), zin: 1 / (1 / AMP.RTH + 1 / zb), zout: re }; };
export const AmpScene: React.FC<any> = ({ dur, cfg = "ce", mode = "run", bypass = true, lines = [] }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const rv = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const byp = mode === "bypass" ? p < 0.35 : bypass;
  const A = ampCalc(cfg, byp);
  const W = (pts: string, c = L.wire) => <polyline points={pts} fill="none" stroke={c} strokeWidth={6} strokeLinejoin="round" />;
  const capH = (x: number, y: number, lab: string) => <g><rect x={x - 18} y={y - 36} width={36} height={72} fill={L.bg0} /><line x1={x - 10} y1={y - 34} x2={x - 10} y2={y + 34} stroke={L.amber} strokeWidth={7} /><line x1={x + 10} y1={y - 34} x2={x + 10} y2={y + 34} stroke={L.amber} strokeWidth={7} /><text x={x} y={y - 46} textAnchor="middle" {...T1} fontSize={22}>{lab}</text></g>;
  const capV = (x: number, y: number, lab: string) => <g><rect x={x - 36} y={y - 18} width={72} height={36} fill={L.bg0} /><line x1={x - 34} y1={y - 10} x2={x + 34} y2={y - 10} stroke={L.amber} strokeWidth={7} /><line x1={x - 34} y1={y + 10} x2={x + 34} y2={y + 10} stroke={L.amber} strokeWidth={7} /><text x={x + 46} y={y + 8} {...T1} fontSize={22}>{lab}</text></g>;
  const rail = 200, gnd = 880, XQ = 640, YQ = 540, XC = XQ + 20;
  const Q = <g><circle cx={XQ} cy={YQ} r={66} fill={L.bg0} stroke={L.amber} strokeWidth={5} /><line x1={XQ - 25} y1={YQ - 38} x2={XQ - 25} y2={YQ + 38} stroke={L.amber} strokeWidth={9} />
    <line x1={XQ - 66} y1={YQ} x2={XQ - 25} y2={YQ} stroke={L.amber} strokeWidth={6} /><line x1={XQ - 25} y1={YQ - 16} x2={XC} y2={YQ - 56} stroke={L.amber} strokeWidth={6} />
    <line x1={XQ - 25} y1={YQ + 16} x2={XC} y2={YQ + 56} stroke={L.amber} strokeWidth={6} /><polygon points={`${XC},${YQ + 56} ${XC - 26},${YQ + 50} ${XC - 12},${YQ + 32}`} fill={L.amber} /></g>;
  const src = (x: number, y: number) => <g><circle cx={x} cy={y} r={36} fill={L.bg0} stroke={L.cyan} strokeWidth={5} /><path d={`M ${x - 20} ${y} q 10 -20 20 0 t 20 0`} fill="none" stroke={L.cyan} strokeWidth={4} />
    <text x={x} y={y + 64} textAnchor="middle" {...T1} fontSize={22} fill={L.cyan}>vin</text>{W(`${x},${y + 36} ${x},${gnd}`)}</g>;
  const out = (x: number, y: number) => <g><circle cx={x} cy={y} r={10} fill={L.green} /><text x={x} y={y - 24} textAnchor="middle" {...T1} fontSize={26} fill={L.green}>vout</text></g>;
  let left: React.ReactNode;
  if (mode === "model") {
    left = <g>
      <text x={500} y={180} textAnchor="middle" {...T1} fontSize={30}>THE re MODEL (small signals only)</text>
      <circle cx={200} cy={360} r={12} fill={L.cyan} /><text x={200} y={330} textAnchor="middle" {...T1} fontSize={26} fill={L.cyan}>B</text>
      {W(`212,360 420,360 420,430`)}<Res x={420} y={500} ohm={AMP.B * A.re} label="βre" />{W(`420,570 420,800`)}
      <circle cx={420} cy={812} r={12} fill={L.text} /><text x={460} y={822} {...T1} fontSize={26}>E</text>
      {W(`420,360 420,360`)}{W(`720,280 720,420`)}<circle cx={720} cy={500} r={60} fill={L.bg0} stroke={L.green} strokeWidth={5} />
      <line x1={720} y1={530} x2={720} y2={470} stroke={L.green} strokeWidth={5} /><polygon points="706,478 734,478 720,456" fill={L.green} />
      <text x={800} y={508} {...T1} fontSize={26} fill={L.green}>β · ib</text>{W(`720,560 720,800 420,800`)}
      <circle cx={720} cy={268} r={12} fill={L.text} /><text x={750} y={260} {...T1} fontSize={26}>C</text>
      <text x={500} y={900} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>re = 26 mV ÷ IE = 26 mV ÷ 1.94 mA = {A.re.toFixed(1)} Ω</text></g>;
  } else {
    const isCC = cfg === "cc", isCB = cfg === "cb";
    left = <g>
      <line x1={260} y1={rail} x2={940} y2={rail} stroke={L.red} strokeWidth={6} /><text x={260} y={rail - 20} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={120} y1={gnd} x2={940} y2={gnd} stroke={L.wire} strokeWidth={6} />
      <g opacity={rv(0)}><Res x={420} y={330} ohm={33e3} label="R1" />{W(`420,${rail} 420,260`)}{W(`420,400 420,${YQ} ${XQ - 66},${YQ}`)}
        <Res x={420} y={740} ohm={10e3} label="R2" />{W(`420,${YQ} 420,670`)}{W(`420,810 420,${gnd}`)}</g>
      <g opacity={rv(0.1)}>{Q}{isCC ? W(`${XC},${rail} ${XC},${YQ - 66}`) : <><Res x={XC} y={320} ohm={AMP.RC} label="RC" />{W(`${XC},${rail} ${XC},250`)}{W(`${XC},390 ${XC},${YQ - 66}`)}</>}
        <Res x={XC} y={740} ohm={AMP.RE} label="RE" />{W(`${XC},${YQ + 66} ${XC},670`)}{W(`${XC},810 ${XC},${gnd}`)}</g>
      {!isCB && <g opacity={rv(0.3)}>{src(150, 640)}{W(`150,604 150,${YQ} 280,${YQ}`)}{capH(300, YQ, "Cin")}{W(`318,${YQ} 420,${YQ}`)}</g>}
      {isCB && <g opacity={rv(0.3)}>{W(`420,${YQ} 520,${YQ} 520,600`)}{capV(520, 620, "CB")}{W(`520,640 520,${gnd}`)}
        {src(150, 760)}{W(`150,724 150,640 ${XC + 120},640`)}{capH(XC + 70, 640, "Cin")}<text x={300} y={620} fill={L.cyan} fontFamily={SANS} fontSize={22} fontWeight={700}>input into the EMITTER</text></g>}
      {cfg === "ce" && <g opacity={rv(0.5) * (byp ? 1 : 0.25)}>{W(`${XC},650 ${XC + 120},650 ${XC + 120},710`)}{capV(XC + 120, 730, "CE")}{W(`${XC + 120},750 ${XC + 120},${gnd}`)}</g>}
      <g opacity={rv(0.7)}>{isCC ? <>{W(`${XC},640 ${XC + 140},640`)}{capH(XC + 160, 640, "Cout")}{W(`${XC + 178},640 900,640`)}{out(900, 640)}</>
        : <>{W(`${XC},430 ${XC + 140},430`)}{capH(XC + 160, 430, "Cout")}{W(`${XC + 178},430 900,430`)}{out(900, 430)}</>}</g>
      <text x={530} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{cfg === "ce" ? "COMMON EMITTER: in at base, out at collector" : isCB ? "COMMON BASE: base grounded for AC, in at emitter" : "COMMON COLLECTOR: in at base, out at emitter"}</text></g>;
  }
  const GX = 1040, GW = 780;
  let right: React.ReactNode;
  if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
    opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  else if (mode === "xc") { const fx = (f: number) => GX + (Math.log10(f) - 1) / 3.3 * GW, yz = (z: number) => 820 - (Math.log10(z)) / 4 * 560;
    const q: string[] = []; for (let k = 0; k <= 200; k++) { const f = Math.pow(10, 1 + 3.3 * k / 200); if (k / 200 > p * 1.2) break; q.push(`${fx(f)},${yz(1 / (2 * Math.PI * f * 100e-6))}`); }
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>REACTANCE OF Cin = 100 µF</text>
      <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={240} stroke={L.dim} strokeWidth={3} />
      {[10, 100, 1000, 10000].map((f) => <text key={f} x={fx(f)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{f >= 1000 ? f / 1000 + "k" : f} Hz</text>)}
      {[1, 10, 100, 1000].map((z) => <text key={z} x={GX - 10} y={yz(z) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>{z >= 1000 ? z / 1000 + "k" : z} Ω</text>)}
      <line x1={GX} y1={yz(114)} x2={GX + GW} y2={yz(114)} stroke={L.red} strokeDasharray="8 8" strokeWidth={3} /><text x={GX + GW} y={yz(114) - 12} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={22} fontWeight={700}>Zin ÷ 10 = 114 Ω</text>
      <line x1={fx(20)} y1={820} x2={fx(20)} y2={240} stroke={L.amber} strokeDasharray="6 8" strokeWidth={2} /><text x={fx(20) + 8} y={260} fill={L.amber} fontFamily={MONO} fontSize={22} fontWeight={700}>20 Hz</text>
      <polyline points={q.join(" ")} fill="none" stroke={L.green} strokeWidth={6} />
      <text x={GX + GW / 2} y={940} textAnchor="middle" {...T1} fontSize={28}>at 20 Hz: XC = 1 ÷ (2π × 20 × 100µ) = 80 Ω</text></g>; }
  else if (mode === "compare") { const rows = [["", "CE", "CB", "CC"], ["voltage gain", "−149", "+149", "0.99"], ["input Z", "1.1 kΩ", "13 Ω", "7.1 kΩ"], ["output Z", "2 kΩ", "2 kΩ", "≈13 Ω"], ["phase", "180°", "0°", "0°"], ["used for", "gain", "high freq", "buffer"]];
    right = <g>{rows.map((r, i) => r.map((c, j) => <text key={`${i}${j}`} x={GX + (j === 0 ? 0 : 230 + (j - 1) * 190)} y={260 + i * 100} textAnchor={j === 0 ? "start" : "middle"}
      fill={i === 0 ? L.amber : j === 0 ? L.dim : L.text} fontFamily={j === 0 ? SANS : MONO} fontSize={i === 0 ? 34 : 28} fontWeight={800}
      opacity={interpolate(p, [i * 0.13, i * 0.13 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{c}</text>))}</g>; }
  else { const vinPk = 0.01, gain = A.av; const vout = Math.abs(gain) * vinPk;
    const tr = (cy: number, amp: number, ph: number, col: string, name: string) => { const q: string[] = [];
      for (let k = 0; k <= 300; k++) { const u = k / 300; q.push(`${GX + GW * u},${cy - amp * Math.sin(2 * Math.PI * (3 * u - t * 0.5) + ph)}`); }
      return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><text x={GX + 8} y={cy - 150} fill={col} fontFamily={SANS} fontSize={26} fontWeight={800}>{name}</text>
        <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} /></g>; };
    right = <g>
      {tr(360, 40, 0, L.cyan, `input: 10 mV peak`)}
      {tr(760, Math.min(130, 40 * Math.abs(gain)), gain < 0 ? Math.PI : 0, L.green, `output: ${vout >= 1 ? vout.toFixed(2) + " V" : (vout * 1000).toFixed(1) + " mV"} peak${gain < 0 ? ", INVERTED" : ""}`)}
      <text x={GX + GW / 2} y={950} textAnchor="middle" {...T1} fontSize={30}>gain Av = {gain.toFixed(gain > 0 && gain < 2 ? 3 : 1)}{mode === "bypass" ? (byp ? "  (CE connected)" : "  (CE removed)") : ""}</text></g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.amp = AmpScene;

// ------------------------------------------------------------------ Real-world signal chain illustration (configurable)
/** {"type":"chain","title":"…","sub":"…","src":"mic"|"antenna"|"sensor"|"guitar","stage":"…","stage2":"…","sink":"speaker"|"headphones"|"adc","gain":"×150"} */
export const ChainScene: React.FC<any> = ({ title = "", sub = "", src = "mic", stage = "AMPLIFIER", stage2 = "", sink = "speaker", note1 = "", note2 = "", note3 = "" }) => {
  const f = useCurrentFrame(); const t = f / 30;
  const wv = (x0: number, x1: number, y: number, a: number, col: string) => { const q: string[] = []; for (let x = x0; x <= x1; x += 3) q.push(`${x},${y - a * Math.sin(x / 14 - t * 8)}`); return <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={4} />; };
  const box = (x: number, w: number, lab: string, col: string) => <g><rect x={x} y={450} width={w} height={190} rx={26} fill="#1f2a35" stroke={col} strokeWidth={5} />
    <circle cx={x + w / 2} cy={520} r={34} fill="none" stroke={col} strokeWidth={4} /><line x1={x + w / 2 - 12} y1={500} x2={x + w / 2 - 12} y2={540} stroke={col} strokeWidth={5} />
    <line x1={x + w / 2 - 12} y1={512} x2={x + w / 2 + 14} y2={494} stroke={col} strokeWidth={4} /><line x1={x + w / 2 - 12} y1={528} x2={x + w / 2 + 14} y2={546} stroke={col} strokeWidth={4} />
    <text x={x + w / 2} y={600} textAnchor="middle" fill={col} fontFamily={MONO} fontSize={22} fontWeight={800}>{lab}</text></g>;
  const s2 = !!stage2;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <text x={960} y={110} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={46} fontWeight={800}>{title}</text>
    <text x={960} y={160} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>{sub}</text>
    {src === "mic" && <g><rect x={150} y={430} width={110} height={190} rx={55} fill="#25313d" stroke="#3a4a5a" strokeWidth={4} />{[0, 1, 2, 3, 4].map((k) => <line key={k} x1={168} y1={466 + k * 26} x2={242} y2={466 + k * 26} stroke="#4a5d70" strokeWidth={4} />)}
      <rect x={196} y={620} width={18} height={60} fill="#3a4a5a" /><text x={205} y={750} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>MICROPHONE</text></g>}
    {src === "antenna" && <g><line x1={205} y1={330} x2={205} y2={680} stroke="#8aa1b4" strokeWidth={8} />{[0, 1, 2].map((k) => <path key={k} d={`M ${175 - k * 30} ${330 - k * 20} Q 205 ${290 - k * 30} ${235 + k * 30} ${330 - k * 20}`} fill="none" stroke={L.electron} strokeWidth={3} opacity={0.3 + 0.3 * Math.sin(t * 3 - k)} />)}
      <text x={205} y={750} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>ANTENNA</text></g>}
    {src === "guitar" && <g><ellipse cx={205} cy={560} rx={90} ry={110} fill="#a0522d" /><circle cx={205} cy={560} r={30} fill="#3b2412" /><rect x={192} y={300} width={26} height={170} fill="#6b3e1e" />
      {[0, 1, 2].map((k) => <line key={k} x1={198 + k * 6} y1={300} x2={198 + k * 6} y2={660} stroke="#ddd" strokeWidth={2} />)}<text x={205} y={750} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>GUITAR PICKUP</text></g>}
    {src === "sensor" && <g><rect x={140} y={460} width={130} height={150} rx={16} fill="#25313d" stroke="#4a5d70" strokeWidth={5} /><circle cx={205} cy={535} r={36} fill="#3a4a5a" stroke={L.amber} strokeWidth={4} />
      <text x={205} y={750} textAnchor="middle" fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={800}>SENSOR</text></g>}
    <text x={205} y={790} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={22}>{note1}</text>
    {wv(290, s2 ? 520 : 640, 545, 10, L.cyan)}
    {box(s2 ? 530 : 660, s2 ? 280 : 360, stage, L.amber)}
    {s2 && <>{wv(820, 1010, 545, 40, L.green)}{box(1020, 280, stage2, L.green)}</>}
    <text x={s2 ? 960 : 840} y={700} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{note2}</text>
    {wv(s2 ? 1310 : 1030, 1440, 545, s2 ? 50 : 60, L.green)}
    {sink === "speaker" && <g transform="translate(1560,545)"><path d="M -100 -60 L -30 -60 L 50 -150 L 50 150 L -30 60 L -100 60 Z" fill="#25313d" stroke="#4a5d70" strokeWidth={6} />
      {[0, 1, 2].map((k) => <path key={k} d={`M ${90 + k * 45} -${60 + k * 30} Q ${130 + k * 55} 0 ${90 + k * 45} ${60 + k * 30}`} fill="none" stroke={L.green} strokeWidth={5} opacity={0.4 + 0.5 * Math.abs(Math.sin(t * 4 - k))} />)}</g>}
    {sink === "headphones" && <g transform="translate(1620,545)"><path d="M -110 30 A 110 110 0 0 1 110 30" fill="none" stroke="#4a5d70" strokeWidth={18} /><rect x={-140} y={10} width={60} height={110} rx={24} fill="#25313d" /><rect x={80} y={10} width={60} height={110} rx={24} fill="#25313d" /></g>}
    {sink === "adc" && <g><rect x={1500} y={450} width={220} height={190} rx={18} fill="#1f2a35" stroke="#4a5d70" strokeWidth={4} /><text x={1610} y={560} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={40} fontWeight={800}>ADC</text></g>}
    <text x={1610} y={750} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={22}>{note3}</text>
  </svg></AbsoluteFill>;
};
ANALOG_SCENES.chain = ChainScene;

// ------------------------------------------------------------------ Darlington pair and current mirror
/** {"type":"pair","kind":"darlington"|"mirror","mode":"build"|"run"|"sweep"|"calc","lines":[...]}
 *  Darlington: β1 = β2 = 100, β ≈ 10 000, RB = 1.06 MΩ -> IB1 = 10 µA, IC = 100 mA into RL = 50 Ω, VBE = 1.4 V.
 *  Mirror: R = 11.3 kΩ -> Iref = 1 mA; Iout = Iref × β/(β+2) = 0.98 mA, flat until RL ≈ 11.8 kΩ. */
export const PairScene: React.FC<any> = ({ dur, kind = "darlington", mode = "run", lines = [] }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const rv = (a: number) => mode === "build" ? interpolate(p, [a, a + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const W = (pts: string, c = L.wire) => <polyline points={pts} fill="none" stroke={c} strokeWidth={6} strokeLinejoin="round" />;
  const Q = (x: number, y: number, lab: string, mirror = false) => { const sx = mirror ? -1 : 1; return <g transform={`translate(${x},${y}) scale(${sx},1)`}>
    <circle r={58} fill={L.bg0} stroke={L.amber} strokeWidth={5} /><line x1={-20} y1={-32} x2={-20} y2={32} stroke={L.amber} strokeWidth={8} />
    <line x1={-58} y1={0} x2={-20} y2={0} stroke={L.amber} strokeWidth={6} /><line x1={-20} y1={-14} x2={18} y2={-48} stroke={L.amber} strokeWidth={6} /><line x1={18} y1={-48} x2={18} y2={-58} stroke={L.amber} strokeWidth={6} />
    <line x1={-20} y1={14} x2={18} y2={48} stroke={L.amber} strokeWidth={6} /><line x1={18} y1={48} x2={18} y2={58} stroke={L.amber} strokeWidth={6} /><polygon points="18,48 -4,43 7,28" fill={L.amber} />
    <text x={mirror ? -70 : 70} y={8} textAnchor="middle" transform={mirror ? "scale(-1,1)" : undefined} {...T1} fontSize={26}>{lab}</text></g>; };
  const rail = 200, gnd = 880;
  let left: React.ReactNode, right: React.ReactNode;
  const GX = 1040, GW = 780;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={GX} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text>
    <text x={GX + GW} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  if (kind === "darlington") {
    const ib = 10e-6 * (mode === "sweep" ? 0.2 + 0.8 * p : 1), ie1 = 101 * ib, ic = 10000 * ib;
    left = <g>
      <line x1={200} y1={rail} x2={900} y2={rail} stroke={L.red} strokeWidth={6} /><text x={200} y={rail - 20} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={200} y1={gnd} x2={900} y2={gnd} stroke={L.wire} strokeWidth={6} />
      <g opacity={rv(0)}><Res x={300} y={360} ohm={1.06e6} label="RB" />{W(`300,${rail} 300,290`)}{W(`300,430 300,480 422,480`)}{Q(480, 480, "Q1")}</g>
      <g opacity={rv(0.25)}>{W(`498,538 498,640 602,640`)}{Q(660, 640, "Q2")}{W(`678,698 678,${gnd}`)}</g>
      <g opacity={rv(0.45)}>{W(`498,422 498,300 678,300`)}<Res x={678} y={360} ohm={50} label="LOAD" />{W(`678,${rail} 678,290`)}{W(`678,430 678,582`)}</g>
      {mode !== "build" && mode !== "calc" && <g>
        <Dots pts={[[300, rail], [300, 480], [430, 480], [498, 538], [498, 640]]} t={t} speed={25} gap={70} r={5} color={L.cyan} />
        <Dots pts={[[498, 560], [498, 640], [610, 640], [678, 698], [678, gnd]]} t={t} speed={50} gap={45} r={6} color={L.amber} />
        <Dots pts={[[678, rail], [678, 582], [678, gnd]]} t={t} speed={60 + ic * 800} gap={24} />
        <text x={320} y={540} {...T1} fontSize={24} fill={L.cyan}>IB1 = {uA(ib)}</text>
        <text x={360} y={700} {...T1} fontSize={24} fill={L.amber}>IB2 = IE1 = {mAs(ie1)}</text>
        <text x={710} y={480} {...T1} fontSize={26} fill={L.electron}>IC = {(ic * 1000).toFixed(0)} mA</text></g>}</g>;
    if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
      opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
    else right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>DARLINGTON PAIR</text>
      {row(320, "Q1 base current", uA(ib), L.cyan)}{row(410, "Q1 emitter = Q2 base", mAs(ie1), L.amber)}{row(500, "load current", `${(ic * 1000).toFixed(0)} mA`, L.electron)}
      {row(590, "overall gain β1 × β2", "≈ 10 000", L.green)}{row(680, "base-emitter drop", "0.7 + 0.7 = 1.4 V", L.text)}</g>;
  } else {
    const RL = mode === "sweep" ? 1000 + 13000 * p : 5000; const iref = 1e-3, iout0 = iref * 100 / 102;
    const vce2 = 12 - RL * iout0; const sat = vce2 < 0.2; const iout = sat ? 11.8 / RL : iout0;
    left = <g>
      <line x1={200} y1={rail} x2={900} y2={rail} stroke={L.red} strokeWidth={6} /><text x={200} y={rail - 20} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={200} y1={gnd} x2={900} y2={gnd} stroke={L.wire} strokeWidth={6} />
      <g opacity={rv(0)}><Res x={330} y={340} ohm={11.3e3} label="R" />{W(`330,${rail} 330,270`)}{W(`330,410 330,522`)}{Q(348, 580, "Q1", true)}{W(`330,638 330,${gnd}`)}</g>
      <g opacity={rv(0.25)}>{W(`330,470 450,470 450,580 406,580`)}<text x={460} y={460} fill={L.amber} fontFamily={SANS} fontSize={22} fontWeight={700}>Q1: base tied to collector</text></g>
      <g opacity={rv(0.4)}>{W(`450,580 602,580`)}{Q(660, 580, "Q2")}{W(`678,638 678,${gnd}`)}</g>
      <g opacity={rv(0.6)}><Res x={678} y={340} ohm={RL} label="LOAD" />{W(`678,${rail} 678,270`)}{W(`678,410 678,522`)}</g>
      {mode !== "build" && mode !== "calc" && <g>
        <Dots pts={[[330, rail], [330, 522], [330, 638], [330, gnd]]} t={t} speed={90} gap={34} />
        <Dots pts={[[678, rail], [678, 522], [678, 638], [678, gnd]]} t={t} speed={90 * iout / iref} gap={34} />
        <text x={310} y={250} textAnchor="end" {...T1} fontSize={24} fill={L.electron}>Iref = 1 mA</text>
        <text x={740} y={480} {...T1} fontSize={26} fill={sat ? L.red : L.green}>Iout = {mAs(iout)}</text></g>}</g>;
    if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
      opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
    else { const rx = (r: number) => GX + (r - 1000) / 13000 * GW, iy = (i: number) => 820 - i / 1.5e-3 * 560;
      const q: string[] = []; for (let k = 0; k <= 200; k++) { const r = 1000 + 13000 * k / 200; if (mode === "sweep" && r > RL) break; const v = 12 - r * iout0; q.push(`${rx(r)},${iy(v < 0.2 ? 11.8 / r : iout0)}`); }
      right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>OUTPUT CURRENT vs LOAD</text>
        <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={240} stroke={L.dim} strokeWidth={3} />
        {[1, 4, 8, 12, 14].map((r) => <text key={r} x={rx(r * 1000)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{r}k</text>)}
        {[0, 0.5, 1, 1.5].map((m) => <text key={m} x={GX - 10} y={iy(m / 1000) + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={22}>{m} mA</text>)}
        <polyline points={q.join(" ")} fill="none" stroke={L.green} strokeWidth={6} />
        <line x1={rx(12040)} y1={820} x2={rx(12040)} y2={240} stroke={L.red} strokeDasharray="6 8" strokeWidth={2} /><text x={rx(12040) - 8} y={270} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={20}>Q2 saturates</text>
        <text x={GX + GW / 2} y={940} textAnchor="middle" {...T1} fontSize={28}>LOAD = {(RL / 1000).toFixed(1)} kΩ → Iout = {mAs(iout)}{sat ? " (saturated)" : ""}</text></g>; }
  }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.pair = PairScene;

// ------------------------------------------------------------------ FET engine: JFET, enhancement MOSFET, CMOS inverter
/** {"type":"fet","kind":"jfet"|"nmos","mode":"structure"|"transfer"|"output"|"circuit"|"switch"|"cmos"|"calc","lines":[...]}
 *  JFET: IDSS = 10 mA, VP = −4 V, self-bias RS = 500 Ω, RD = 1 kΩ, VDD = 12 V -> ID = 3.36 mA, VGS = −1.68 V, VDS = 6.96 V.
 *  nMOS: k = 0.5 mA/V², VT = 2 V; divider VG = 4 V (2 MΩ / 1 MΩ), RS = 1 kΩ, RD = 6.8 kΩ -> ID = 0.764 mA, VGS = 3.24 V, VDS = 6.04 V. */
const jfetId = (vgs: number) => vgs <= -4 ? 0 : 10e-3 * (1 + vgs / 4) ** 2;
const mosId = (vgs: number) => vgs <= 2 ? 0 : 0.5e-3 * (vgs - 2) ** 2;
export const FetScene: React.FC<any> = ({ dur, kind = "nmos", mode = "structure", lines = [], base = "" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string, c = L.wire) => <polyline points={pts} fill="none" stroke={c} strokeWidth={6} strokeLinejoin="round" />;
  const jf = kind === "jfet";
  // sweeping gate voltage for structure/transfer
  const vgs = jf ? -4 * p : 6 * p;
  const id = jf ? jfetId(vgs) : mosId(vgs);
  const GX = 1040, GW = 780;
  // symbol: drain up, source down, gate left
  const Sym = (x: number, y: number, n = true) => <g>
    <circle cx={x} cy={y} r={66} fill={L.bg0} stroke={L.amber} strokeWidth={5} />
    {jf ? <><line x1={x - 6} y1={y - 44} x2={x - 6} y2={y + 44} stroke={L.amber} strokeWidth={8} /><line x1={x - 66} y1={y + 20} x2={x - 6} y2={y + 20} stroke={L.amber} strokeWidth={6} />
        <polygon points={`${x - 6},${y + 20} ${x - 26},${y + 10} ${x - 26},${y + 30}`} fill={L.amber} /></>
      : <><line x1={x - 26} y1={y - 40} x2={x - 26} y2={y + 40} stroke={L.amber} strokeWidth={6} /><line x1={x - 66} y1={y + 30} x2={x - 26} y2={y + 30} stroke={L.amber} strokeWidth={6} />
        {[-34, 0, 34].map((d) => <line key={d} x1={x - 8} y1={y + d - 12} x2={x - 8} y2={y + d + 12} stroke={L.amber} strokeWidth={8} />)}
        <line x1={x - 8} y1={y} x2={x + 20} y2={y} stroke={L.amber} strokeWidth={5} /><polygon points={n ? `${x - 8},${y} ${x + 10},${y - 9} ${x + 10},${y + 9}` : `${x + 18},${y} ${x},${y - 9} ${x},${y + 9}`} fill={L.amber} /></>}
    <line x1={jf ? x - 6 : x - 8} y1={y - 34} x2={x + 20} y2={y - 34} stroke={L.amber} strokeWidth={5} /><line x1={x + 20} y1={y - 34} x2={x + 20} y2={y - 66} stroke={L.amber} strokeWidth={5} />
    <line x1={jf ? x - 6 : x - 8} y1={y + 34} x2={x + 20} y2={y + 34} stroke={L.amber} strokeWidth={5} /><line x1={x + 20} y1={y + 34} x2={x + 20} y2={y + 66} stroke={L.amber} strokeWidth={5} />
    {!jf && <line x1={x + 20} y1={y} x2={x + 20} y2={y + 34} stroke={L.amber} strokeWidth={5} />}
    <text x={x + 34} y={y - 70} fill={L.dim} fontFamily={MONO} fontSize={22}>{n ? "D" : "S"}</text><text x={x + 34} y={y + 90} fill={L.dim} fontFamily={MONO} fontSize={22}>{n ? "S" : "D"}</text>
    <text x={x - 86} y={y + 22} fill={L.dim} fontFamily={MONO} fontSize={22}>G</text></g>;
  const lm = mode === "calc" && base ? base : mode;
  let left: React.ReactNode, right: React.ReactNode = null;
  if (lm === "structure") {
    if (jf) { const w = 160 * (1 - Math.min(1, -vgs / 4)); // open channel width
      left = <g><rect x={140} y={360} width={760} height={260} fill="#2e5a87" /><text x={520} y={340} textAnchor="middle" {...T1} fontSize={26}>N-CHANNEL</text>
        <rect x={360} y={360} width={320} height={(260 - w) / 2} fill="#b5473a" /><rect x={360} y={620 - (260 - w) / 2} width={320} height={(260 - w) / 2} fill="#b5473a" />
        <text x={520} y={350 + (260 - w) / 4 + 20} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={24} fontWeight={800}>P gate</text>
        <text x={110} y={500} textAnchor="end" {...T1} fontSize={26}>S</text><text x={930} y={500} {...T1} fontSize={26}>D</text>
        {Array.from({ length: 12 }, (_, k) => { const u = (k / 12 + t * 0.3 * (id / 10e-3 + 0.05)) % 1; return w > 4 ? <circle key={k} cx={150 + u * 740} cy={490 + ((k * 37) % Math.max(10, w - 20)) - Math.max(10, w - 20) / 2} r={8} fill={L.electron} /> : null; })}
        <text x={520} y={720} textAnchor="middle" {...T1} fontSize={28} fill={L.amber}>VGS = {vgs.toFixed(1)} V → channel {w < 4 ? "PINCHED OFF" : "narrows"}</text></g>; }
    else { const on = vgs > 2; const depth = Math.min(1, Math.max(0, (vgs - 2) / 4));
      left = <g><rect x={140} y={430} width={760} height={260} fill="#b5473a" /><text x={520} y={720} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={26} fontWeight={800}>P-type body</text>
        <rect x={140} y={430} width={180} height={90} fill="#2e5a87" /><rect x={720} y={430} width={180} height={90} fill="#2e5a87" />
        <text x={230} y={485} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={26} fontWeight={800}>N+</text><text x={810} y={485} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize={26} fontWeight={800}>N+</text>
        <rect x={320} y={400} width={400} height={30} fill="#d8dde8" /><rect x={320} y={360} width={400} height={40} fill="#8a96a3" />
        <text x={520} y={388} textAnchor="middle" fill="#111" fontFamily={SANS} fontSize={22} fontWeight={800}>GATE (metal) · oxide below</text>
        {on && <rect x={320} y={430} width={400} height={10 + 30 * depth} fill="#2e5a87" opacity={0.9} />}
        {on && Array.from({ length: 10 }, (_, k) => { const u = (k / 10 + t * 0.3 * (0.2 + depth)) % 1; return <circle key={k} cx={180 + u * 680} cy={445 + ((k * 13) % 20)} r={7} fill={L.electron} />; })}
        <text x={230} y={410} textAnchor="middle" {...T1} fontSize={24}>S</text><text x={810} y={410} textAnchor="middle" {...T1} fontSize={24}>D</text>
        <text x={520} y={800} textAnchor="middle" {...T1} fontSize={28} fill={on ? L.green : L.amber}>VGS = {vgs.toFixed(1)} V → {on ? "channel FORMED (VGS > VT = 2 V)" : "no channel: OFF"}</text></g>; }
    right = <g><text x={GX + GW / 2} y={220} textAnchor="middle" {...T1} fontSize={32}>{jf ? "JFET: GATE SQUEEZES THE CHANNEL" : "MOSFET: GATE CREATES THE CHANNEL"}</text>
      <text x={GX + GW / 2} y={360} textAnchor="middle" {...T1} fontSize={60} fill={L.electron}>ID = {(id * 1000).toFixed(2)} mA</text>
      <text x={GX + GW / 2} y={460} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>gate current ≈ 0 (voltage-controlled)</text></g>;
  } else if (lm === "transfer" || lm === "output") {
    const isT = mode === "transfer";
    left = <g>{W(`640,200 640,474`)}{Sym(620, 540)}{W(`640,606 640,880`)}{W(`554,${jf ? 560 : 570} 360,${jf ? 560 : 570}`)}
      <text x={360} y={jf ? 530 : 540} {...T1} fontSize={26} fill={L.cyan}>VGS = {vgs.toFixed(1)} V</text>
      <Dots pts={[[640, 200], [640, 880]]} t={t} speed={30 + id * 1e4} gap={30} />
      <text x={680} y={300} {...T1} fontSize={28} fill={L.electron}>ID = {(id * 1000).toFixed(2)} mA</text>
      <text x={520} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>{jf ? "N-channel JFET" : "N-channel enhancement MOSFET"}</text></g>;
    if (isT) { const vx = (v: number) => jf ? GX + (v + 4) / 4 * GW : GX + v / 6 * GW, iy = (i: number) => 820 - i / (jf ? 10e-3 : 8e-3) * 560;
      const q: string[] = []; for (let k = 0; k <= 200; k++) { const v = jf ? -4 + 4 * k / 200 : 6 * k / 200; if (jf ? v < vgs - 0.01 : v > vgs + 0.01) continue; q.push(`${vx(v)},${iy(jf ? jfetId(v) : mosId(v))}`); }
      right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>TRANSFER CURVE: ID vs VGS</text>
        <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={jf ? GX + GW : GX} y1={820} x2={jf ? GX + GW : GX} y2={240} stroke={L.dim} strokeWidth={3} />
        {(jf ? [-4, -3, -2, -1, 0] : [0, 2, 4, 6]).map((v) => <text key={v} x={vx(v)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{v} V</text>)}
        <polyline points={q.join(" ")} fill="none" stroke={L.green} strokeWidth={6} />
        <text x={GX + GW / 2} y={940} textAnchor="middle" {...T1} fontSize={26}>{jf ? "ID = IDSS (1 − VGS ÷ VP)², IDSS 10 mA, VP −4 V" : "ID = k (VGS − VT)², k 0.5 mA/V², VT 2 V"}</text></g>; }
    else { const vx = (v: number) => GX + v / 12 * GW, iy = (i: number) => 820 - i / (jf ? 11e-3 : 9e-3) * 560;
      const gs = jf ? [0, -1, -2, -3] : [6, 5, 4, 3];
      right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>OUTPUT CURVES: ID vs VDS</text>
        <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={240} stroke={L.dim} strokeWidth={3} />
        {[0, 3, 6, 9, 12].map((v) => <text key={v} x={vx(v)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{v} V</text>)}
        {gs.map((g, k) => { const isat = jf ? jfetId(g) : mosId(g); const vov = jf ? g + 4 : g - 2; const q: string[] = [];
          for (let j = 0; j <= 120; j++) { const v = 12 * j / 120; const i = v < vov ? isat * (2 * v / vov - (v / vov) ** 2) : isat; q.push(`${vx(v)},${iy(i)}`); }
          return <g key={k} opacity={p > k * 0.2 ? 1 : 0.15}><polyline points={q.join(" ")} fill="none" stroke={L.cyan} strokeWidth={4} />
            <text x={vx(12) - 6} y={iy(isat) - 10} textAnchor="end" fill={L.cyan} fontFamily={MONO} fontSize={20}>VGS {g} V</text></g>; })}
        <text x={vx(1.2)} y={300} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={24} fontWeight={800}>OHMIC</text>
        <text x={vx(8)} y={300} textAnchor="middle" fill={L.green} fontFamily={SANS} fontSize={24} fontWeight={800}>SATURATION (constant current)</text></g>; }
  } else if (lm === "circuit" || lm === "calc") {
    const s = jf ? { id: 3.362e-3, vgs: -1.68, vds: 6.96 } : { id: 0.764e-3, vgs: 3.24, vds: 6.04 };
    left = <g>
      <line x1={200} y1={200} x2={900} y2={200} stroke={L.red} strokeWidth={6} /><text x={200} y={180} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={200} y1={880} x2={900} y2={880} stroke={L.wire} strokeWidth={6} />
      <Res x={640} y={310} ohm={jf ? 1000 : 6800} label="RD" />{W(`640,200 640,240`)}{W(`640,380 640,474`)}{Sym(620, 540)}
      <Res x={640} y={740} ohm={jf ? 500 : 1000} label="RS" />{W(`640,606 640,670`)}{W(`640,810 640,880`)}
      {jf ? <><Res x={400} y={700} ohm={1e6} label="RG" />{W(`554,560 400,560 400,630`)}{W(`400,770 400,880`)}</>
        : <><Res x={400} y={330} ohm={2e6} label="R1" />{W(`400,200 400,260`)}{W(`400,400 400,570 554,570`)}<Res x={400} y={720} ohm={1e6} label="R2" />{W(`400,570 400,650`)}{W(`400,790 400,880`)}</>}
      {mode === "circuit" && <><Dots pts={[[640, 200], [640, 880]]} t={t} speed={30 + s.id * 3e4} gap={30} />
        <text x={690} y={440} {...T1} fontSize={26} fill={L.electron}>ID = {(s.id * 1000).toFixed(2)} mA</text>
        <text x={690} y={640} {...T1} fontSize={24} fill={L.green}>VDS = {s.vds.toFixed(2)} V</text>
        <text x={470} y={jf ? 530 : 540} textAnchor="end" {...T1} fontSize={22} fill={L.cyan}>IG = 0</text></>}</g>;
    if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
      opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
    else { const row = (y: number, a: string, b: string, col: string) => <g><text x={GX} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text><text x={GX + GW} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
      right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>{jf ? "JFET SELF-BIAS" : "MOSFET VOLTAGE-DIVIDER BIAS"}</text>
        {row(320, "gate current", "0", L.cyan)}{row(410, "VGS", `${s.vgs.toFixed(2)} V`, L.text)}{row(500, "drain current ID", `${(s.id * 1000).toFixed(2)} mA`, L.electron)}{row(590, "VDS", `${s.vds.toFixed(2)} V`, L.green)}</g>; }
  } else if (lm === "switch") {
    const on = Math.sin(t * 1.3) > 0;
    left = <g>
      <line x1={200} y1={200} x2={900} y2={200} stroke={L.red} strokeWidth={6} /><text x={200} y={180} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={200} y1={880} x2={900} y2={880} stroke={L.wire} strokeWidth={6} />
      <Res x={640} y={320} ohm={12} label="LOAD" heat={on ? 0.6 : 0} />{W(`640,200 640,250`)}{W(`640,390 640,474`)}{Sym(620, 540)}{W(`640,606 640,880`)}
      {W(`554,570 360,570`)}<rect x={220} y={530} width={140} height={80} rx={10} fill="#1b1b1b" /><text x={290} y={578} textAnchor="middle" fill="#ddd" fontFamily={MONO} fontSize={22} fontWeight={800}>{on ? "5 V" : "0 V"}</text>
      {on && <Dots pts={[[640, 200], [640, 880]]} t={t} speed={200} gap={26} />}
      <text x={690} y={440} {...T1} fontSize={26} fill={on ? L.electron : L.dim}>{on ? "ID = 1 A" : "ID = 0"}</text>
      <text x={380} y={540} {...T1} fontSize={22} fill={L.cyan}>IG = 0</text></g>;
    right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>MOSFET vs BJT AS A SWITCH (1 A)</text>
      {[["", "BJT", "MOSFET"], ["controlled by", "current", "voltage"], ["drive needed", "≈ 20 mA base", "≈ 0 (gate)"], ["when ON", "VCE ≈ 0.2 V", "RDS(on) 0.05 Ω"], ["heat at 1 A", "0.2 W", "0.05 W"], ["switching", "slower", "fast"]].map((r, i) =>
        r.map((c, j) => <text key={`${i}${j}`} x={GX + (j === 0 ? 0 : 340 + (j - 1) * 260)} y={300 + i * 95} textAnchor={j === 0 ? "start" : "middle"} fill={i === 0 ? L.amber : j === 0 ? L.dim : L.text}
          fontFamily={j === 0 ? SANS : MONO} fontSize={i === 0 ? 32 : 26} fontWeight={800} opacity={interpolate(p, [i * 0.12, i * 0.12 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{c}</text>))}</g>;
  } else { // cmos inverter
    const vin = 5 * p; const pOn = vin < 3, nOn = vin > 2; const vout = vin < 2 ? 5 : vin > 3 ? 0 : 5 - (vin - 2) * 5;
    left = <g>
      <line x1={200} y1={200} x2={900} y2={200} stroke={L.red} strokeWidth={6} /><text x={200} y={180} {...T1} fontSize={26} fill={L.red}>VDD = +5 V</text>
      <line x1={200} y1={880} x2={900} y2={880} stroke={L.wire} strokeWidth={6} />
      <g opacity={pOn ? 1 : 0.35}>{W(`640,200 640,284`)}{Sym(620, 350, false)}</g>
      <text x={720} y={330} {...T1} fontSize={24} fill={pOn ? L.green : L.dim}>PMOS {pOn ? "ON" : "OFF"}</text>
      {W(`640,416 640,474`)}<g opacity={nOn ? 1 : 0.35}>{Sym(620, 540)}</g>{W(`640,606 640,880`)}
      <text x={720} y={600} {...T1} fontSize={24} fill={nOn ? L.green : L.dim}>NMOS {nOn ? "ON" : "OFF"}</text>
      {W(`554,380 460,380 460,570 554,570`)}{W(`460,475 300,475`)}<text x={300} y={455} {...T1} fontSize={28} fill={L.cyan}>Vin {vin.toFixed(1)} V</text>
      {W(`640,445 820,445`)}<circle cx={820} cy={445} r={10} fill={L.green} /><text x={830} y={420} {...T1} fontSize={28} fill={L.green}>Vout {vout.toFixed(1)} V</text></g>;
    const vx = (v: number) => GX + v / 5 * GW, vy = (v: number) => 820 - v / 5 * 560; const q: string[] = [];
    for (let k = 0; k <= 200; k++) { const v = 5 * k / 200; if (v > vin) break; const o = v < 2 ? 5 : v > 3 ? 0 : 5 - (v - 2) * 5; q.push(`${vx(v)},${vy(o)}`); }
    right = <g><text x={GX + GW / 2} y={170} textAnchor="middle" {...T1} fontSize={30}>CMOS INVERTER: Vout vs Vin</text>
      <line x1={GX} y1={820} x2={GX + GW} y2={820} stroke={L.dim} strokeWidth={3} /><line x1={GX} y1={820} x2={GX} y2={240} stroke={L.dim} strokeWidth={3} />
      {[0, 1, 2, 3, 4, 5].map((v) => <text key={v} x={vx(v)} y={860} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={22}>{v} V</text>)}
      <polyline points={q.join(" ")} fill="none" stroke={L.green} strokeWidth={6} />
      <text x={GX + GW / 2} y={940} textAnchor="middle" {...T1} fontSize={28}>{vin < 2 ? "input LOW → output HIGH (1)" : vin > 3 ? "input HIGH → output LOW (0)" : "switching point"}</text></g>;
  }
  if (mode === "calc" && base) right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
    opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.fet = FetScene;

// ------------------------------------------------------------------ Power amplifiers: Class A, B, AB, C
/** {"type":"pamp","cls":"a"|"b"|"ab"|"c","mode":"circuit"|"eff"|"calc","lines":[...]}
 *  A: VCC 20 V, RC = load 20 Ω, ICQ 0.5 A, VCEQ 10 V -> Pdc 10 W, max Pout 2.5 W (25 %).
 *  B/AB: ±12 V, RL 8 Ω, Vp 10 V -> Pout 6.25 W, Pdc = 2·12·1.25/π = 9.55 W (65 %), max 78.5 %.  C: conduction < 180°, LC tank. */
export const PampScene: React.FC<any> = ({ dur, cls = "a", mode = "circuit", lines = [] }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string, c = L.wire) => <polyline points={pts} fill="none" stroke={c} strokeWidth={6} strokeLinejoin="round" />;
  const ph = 2 * Math.PI * t * 0.5; const s = Math.sin(ph);
  const Q = (x: number, y: number, pnp: boolean, on: number, lab: string) => <g>
    {on > 0.05 && <circle cx={x} cy={y} r={78} fill={L.green} opacity={0.08 + 0.2 * on} />}
    <circle cx={x} cy={y} r={58} fill={L.bg0} stroke={L.amber} strokeWidth={5} /><line x1={x - 20} y1={y - 34} x2={x - 20} y2={y + 34} stroke={L.amber} strokeWidth={8} />
    <line x1={x - 58} y1={y} x2={x - 20} y2={y} stroke={L.amber} strokeWidth={6} />
    <line x1={x - 20} y1={y - 14} x2={x + 18} y2={y - 48} stroke={L.amber} strokeWidth={6} /><line x1={x + 18} y1={y - 48} x2={x + 18} y2={y - 58} stroke={L.amber} strokeWidth={6} />
    <line x1={x - 20} y1={y + 14} x2={x + 18} y2={y + 48} stroke={L.amber} strokeWidth={6} /><line x1={x + 18} y1={y + 48} x2={x + 18} y2={y + 58} stroke={L.amber} strokeWidth={6} />
    {pnp ? <polygon points={`${x - 18},${y - 16} ${x + 3},${y - 25} ${x - 8},${y - 38}`} fill={L.amber} /> : <polygon points={`${x + 18},${y + 48} ${x - 4},${y + 43} ${x + 7},${y + 28}`} fill={L.amber} />}
    <text x={x + 76} y={y + 8} {...T1} fontSize={24}>{lab}</text></g>;
  const srcSym = (x: number, y: number) => <g><circle cx={x} cy={y} r={34} fill={L.bg0} stroke={L.cyan} strokeWidth={5} /><path d={`M ${x - 20} ${y} q 10 -20 20 0 t 20 0`} fill="none" stroke={L.cyan} strokeWidth={4} /></g>;
  const speaker = (x: number, y: number, a: number) => <g transform={`translate(${x},${y})`}><path d="M -30 -34 L 0 -34 L 40 -74 L 40 74 L 0 34 L -30 34 Z" fill="#25313d" stroke="#4a5d70" strokeWidth={5} />
    {[0, 1].map((k) => <path key={k} d={`M ${56 + k * 26} -${30 + k * 16} Q ${76 + k * 30} 0 ${56 + k * 26} ${30 + k * 16}`} fill="none" stroke={L.green} strokeWidth={4} opacity={0.3 + 0.6 * a} />)}</g>;
  let left: React.ReactNode;
  if (cls === "a") { const ic = 0.5 + 0.5 * s * 0.98;
    left = <g><line x1={200} y1={200} x2={900} y2={200} stroke={L.red} strokeWidth={6} /><text x={200} y={180} {...T1} fontSize={26} fill={L.red}>+20 V</text>
      <line x1={200} y1={880} x2={900} y2={880} stroke={L.wire} strokeWidth={6} />
      <Res x={660} y={330} ohm={20} label="LOAD (20 Ω)" heat={0.5} />{W(`660,200 660,260`)}{W(`660,400 660,482`)}{Q(642, 540, false, ic, "")}{W(`660,598 660,880`)}
      {srcSym(300, 640)}{W(`300,606 300,540 584,540`)}{W(`300,674 300,880`)}<text x={280} y={760} textAnchor="end" {...T1} fontSize={22} fill={L.cyan}>signal + bias</text>
      <Dots pts={[[660, 200], [660, 880]]} t={t} speed={40 + ic * 160} gap={28} />
      <text x={700} y={460} {...T1} fontSize={26} fill={L.electron}>iC = {ic.toFixed(2)} A</text>
      <text x={520} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>current flows ALL the time (360°), even with no signal</text></g>; }
  else if (cls === "c") { const pulse = s > 0.87 ? (s - 0.87) / 0.13 : 0;
    left = <g><line x1={200} y1={200} x2={900} y2={200} stroke={L.red} strokeWidth={6} /><text x={200} y={180} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={200} y1={880} x2={900} y2={880} stroke={L.wire} strokeWidth={6} />
      {W(`560,200 560,260`)}<path d={`M 560 260 ` + [0, 1, 2, 3].map(() => "a 16 16 0 1 1 0 32").join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />{W(`560,388 560,420 660,420`)}
      {W(`560,240 760,240 760,300`)}<line x1={720} y1={310} x2={800} y2={310} stroke={L.amber} strokeWidth={8} /><line x1={720} y1={334} x2={800} y2={334} stroke={L.amber} strokeWidth={8} />{W(`760,344 760,420 660,420`)}
      <text x={470} y={330} {...T1} fontSize={24}>L</text><text x={820} y={330} {...T1} fontSize={24}>C</text><text x={830} y={400} textAnchor="middle" fill={L.amber} fontFamily={SANS} fontSize={22} fontWeight={700}>tuned tank</text>
      {W(`660,420 660,482`)}{Q(642, 540, false, pulse, "")}{W(`660,598 660,880`)}
      {srcSym(300, 640)}{W(`300,606 300,540 584,540`)}{W(`300,674 300,880`)}<text x={280} y={760} textAnchor="end" {...T1} fontSize={22} fill={L.cyan}>biased below cutoff</text>
      {pulse > 0 && <Dots pts={[[660, 420], [660, 880]]} t={t} speed={300} gap={26} />}
      <text x={520} y={960} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>short current kicks keep the LC tank ringing</text></g>; }
  else { const dz = cls === "b" ? 0.7 / 10 : 0; const v = s; const on1 = Math.max(0, v - dz), on2 = Math.max(0, -v - dz);
    left = <g><line x1={300} y1={170} x2={900} y2={170} stroke={L.red} strokeWidth={6} /><text x={300} y={150} {...T1} fontSize={26} fill={L.red}>+12 V</text>
      <line x1={300} y1={910} x2={900} y2={910} stroke={L.cyan} strokeWidth={6} /><text x={300} y={950} {...T1} fontSize={26} fill={L.cyan}>−12 V</text>
      {W(`660,170 660,322`)}{Q(642, 380, false, on1, "NPN")}{W(`660,438 660,642`)}{Q(642, 700, true, on2, "PNP")}{W(`660,758 660,910`)}
      {W(`660,540 820,540`)}{speaker(860, 540, Math.abs(v))}<text x={860} y={650} textAnchor="middle" {...T1} fontSize={22}>8 Ω</text>
      {cls === "ab" ? <>{W(`584,380 470,380 470,470`)}<polygon points="452,470 488,470 470,500" fill={L.amber} /><line x1={452} y1={500} x2={488} y2={500} stroke={L.amber} strokeWidth={4} />
          {W(`470,500 470,580`)}<polygon points="452,580 488,580 470,610" fill={L.amber} /><line x1={452} y1={610} x2={488} y2={610} stroke={L.amber} strokeWidth={4} />{W(`470,610 470,700 584,700`)}
          <text x={500} y={470} fill={L.amber} fontFamily={SANS} fontSize={22} fontWeight={700}>2 diodes: 1.4 V pre-bias</text>{W(`470,540 360,540`)}</>
        : <>{W(`584,380 500,380 500,700 584,700`)}{W(`500,540 360,540`)}</>}
      {srcSym(320, 540)}
      {on1 > 0 && <Dots pts={[[660, 170], [660, 540], [820, 540]]} t={t} speed={60 + on1 * 200} gap={28} />}
      {on2 > 0 && <Dots pts={[[820, 540], [660, 540], [660, 910]]} t={t} speed={60 + on2 * 200} gap={28} color={L.amber} />}
      <text x={600} y={990} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>NPN pushes the top half, PNP pulls the bottom half</text></g>; }
  const GX = 1040, GW = 780;
  let right: React.ReactNode;
  if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
    opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  else if (mode === "eff") { const bars: [string, number, string][] = [["A", 25, L.red], ["B", 78.5, L.green], ["AB", 70, L.amber], ["C", 90, L.cyan]];
    right = <g><text x={GX + GW / 2} y={200} textAnchor="middle" {...T1} fontSize={32}>MAXIMUM EFFICIENCY</text>
      {bars.map(([n, e, c], k) => <g key={k} opacity={cls === n.toLowerCase() || p > 0.6 ? 1 : 0.35}><rect x={GX + 40 + k * 190} y={820 - e * 5.2 * Math.min(1, p * 1.5)} width={120} height={e * 5.2 * Math.min(1, p * 1.5)} rx={8} fill={c} />
        <text x={GX + 100 + k * 190} y={800 - e * 5.2 * Math.min(1, p * 1.5)} textAnchor="middle" {...T1} fontSize={30} fill={c}>{e}%</text>
        <text x={GX + 100 + k * 190} y={870} textAnchor="middle" {...T1} fontSize={32}>{n}</text></g>)}
      <text x={GX + GW / 2} y={940} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>(A: resistive load; AB ≈ just under B)</text></g>; }
  else { const tr = (cy: number, fn: (u: number) => number, col: string, name: string, h = 90) => { const q: string[] = [];
      for (let k = 0; k <= 300; k++) { const u = k / 300; q.push(`${GX + GW * u},${cy - fn(2 * Math.PI * (2 * u) - ph * 0) * h}`); }
      return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><text x={GX + 8} y={cy - h - 14} fill={col} fontFamily={SANS} fontSize={24} fontWeight={800}>{name}</text>
        <polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} /></g>; };
    const dz = cls === "b" ? 0.25 : 0;
    const out = (x: number) => { const v = Math.sin(x); return cls === "b" ? (Math.abs(v) < dz ? 0 : v - Math.sign(v) * dz) : v; };
    right = cls === "a" ? <g>{tr(290, (x) => Math.sin(x), L.cyan, "input signal")}{tr(600, (x) => 0.5 + 0.49 * Math.sin(x), L.electron, "collector current (never zero)", 160)}
        <line x1={GX} y1={600 - 80} x2={GX + GW} y2={600 - 80} stroke={L.amber} strokeDasharray="6 8" strokeWidth={2} /><text x={GX + GW} y={600 - 90} textAnchor="end" fill={L.amber} fontFamily={MONO} fontSize={20}>ICQ = 0.5 A</text>
        {tr(880, (x) => -Math.sin(x), L.green, "output: complete waveform")}</g>
      : cls === "c" ? <g>{tr(290, (x) => Math.sin(x), L.cyan, "input")}{tr(590, (x) => Math.max(0, (Math.sin(x) - 0.87) / 0.13), L.electron, "collector current: short pulses (< 180°)", 130)}{tr(880, (x) => Math.sin(x), L.green, "tank output: clean sine")}</g>
      : <g>{tr(290, (x) => Math.max(0, out(x)), L.electron, "NPN current (top halves)")}{tr(560, (x) => Math.min(0, out(x)), L.amber, "PNP current (bottom halves)")}
        {tr(860, out, L.green, cls === "b" ? "output: CROSSOVER DISTORTION at zero" : "output: smooth, no crossover gap")}</g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(20,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.pamp = PampScene;

// ------------------------------------------------------------------ 555 timer: inside, astable, monostable
/** {"type":"t555","mode":"inside"|"astable"|"mono"|"calc","lines":[...]}
 *  Astable: VCC 9 V, R1 1 kΩ, R2 10 kΩ, C 10 µF -> tH 76.2 ms, tL 69.3 ms, f 6.86 Hz, duty 52.4 %. Mono: R 100 kΩ, C 10 µF -> T = 1.1 s. */
export const T555Scene: React.FC<any> = ({ dur, mode = "astable", lines = [], base = "" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string, c = L.wire) => <polyline points={pts} fill="none" stroke={c} strokeWidth={5} strokeLinejoin="round" />;
  // astable simulation in slow motion (real tH 76 ms -> shown 1.52 s)
  const slow = 20, tH = 0.0762, tL = 0.0693, per = tH + tL;
  const ts = (t / slow) % per; const high = ts < tH;
  const vc = high ? 9 * (1 - (2 / 3) * Math.exp(-ts / (11e3 * 10e-6))) : 6 * Math.exp(-(ts - tH) / (10e3 * 10e-6));
  // mono: trigger every 3 s (real) shown at 1:1, T = 1.1 s
  const tm = t % 3; const monoHigh = tm > 0.3 && tm < 1.4; const vcm = monoHigh ? 9 * (1 - Math.exp(-(tm - 0.3) / 1.0)) : 0;
  const out = mode === "mono" ? monoHigh : high;
  const chip = (x: number, y: number) => <g><rect x={x} y={y} width={240} height={360} rx={18} fill="#1b1b1b" />
    <text x={x + 120} y={y + 190} textAnchor="middle" fill="#ddd" fontFamily={MONO} fontSize={52} fontWeight={800}>555</text>
    {["GND", "TRIG", "OUT", "RESET"].map((n, k) => <g key={n}><rect x={x - 30} y={y + 40 + k * 80} width={30} height={20} fill="#c0c0c0" /><text x={x + 12} y={y + 57 + k * 80} fill="#aaa" fontFamily={MONO} fontSize={18}>{k + 1} {n}</text></g>)}
    {["VCC", "DIS", "THR", "CTRL"].map((n, k) => <g key={n}><rect x={x + 240} y={y + 40 + k * 80} width={30} height={20} fill="#c0c0c0" /><text x={x + 228} y={y + 57 + k * 80} textAnchor="end" fill="#aaa" fontFamily={MONO} fontSize={18}>{n} {8 - k}</text></g>)}</g>;
  let left: React.ReactNode;
  if (mode === "inside") {
    const cmp = (x: number, y: number, lab: string, on: boolean) => <g><polygon points={`${x},${y - 50} ${x},${y + 50} ${x + 90},${y}`} fill={on ? "rgba(46,196,160,0.25)" : L.bg0} stroke={L.amber} strokeWidth={5} />
      <text x={x + 10} y={y - 18} {...T1} fontSize={22}>+</text><text x={x + 10} y={y + 30} {...T1} fontSize={22}>−</text><text x={x + 45} y={y - 62} textAnchor="middle" {...T1} fontSize={20}>{lab}</text></g>;
    left = <g>
      <line x1={180} y1={180} x2={900} y2={180} stroke={L.red} strokeWidth={6} /><text x={180} y={160} {...T1} fontSize={24} fill={L.red}>VCC 9 V</text>
      <line x1={180} y1={900} x2={900} y2={900} stroke={L.wire} strokeWidth={6} />
      <Res x={240} y={270} ohm={5000} label="5k" /><Res x={240} y={540} ohm={5000} label="5k" /><Res x={240} y={800} ohm={5000} label="5k" />
      {W(`240,180 240,200`)}{W(`240,340 240,470`)}{W(`240,610 240,730`)}{W(`240,870 240,900`)}
      <text x={160} y={410} textAnchor="end" {...T1} fontSize={22} fill={L.amber}>6 V</text><text x={160} y={680} textAnchor="end" {...T1} fontSize={22} fill={L.amber}>3 V</text>
      {W(`240,400 400,400`)}{cmp(400, 380, "THRESHOLD > 6 V?", !high)}{W(`240,670 400,670 400,710`)}{cmp(400, 690, "TRIGGER < 3 V?", false)}
      <rect x={600} y={440} width={170} height={190} rx={12} fill={L.panel} stroke={L.cyan} strokeWidth={4} /><text x={685} y={530} textAnchor="middle" {...T1} fontSize={24} fill={L.cyan}>FLIP-</text><text x={685} y={560} textAnchor="middle" {...T1} fontSize={24} fill={L.cyan}>FLOP</text>
      {W(`490,380 560,380 560,480 600,480`)}{W(`490,690 560,690 560,590 600,590`)}
      {W(`770,535 870,535`)}<circle cx={870} cy={535} r={10} fill={out ? L.green : L.dim} /><text x={870} y={505} textAnchor="middle" {...T1} fontSize={24} fill={out ? L.green : L.dim}>OUT {out ? "HIGH" : "LOW"}</text>
      <circle cx={690} cy={790} r={46} fill={L.bg0} stroke={L.amber} strokeWidth={5} /><text x={690} y={798} textAnchor="middle" {...T1} fontSize={20}>DIS</text>{W(`690,630 690,744`)}{W(`690,836 690,900`)}
      <text x={760} y={800} fill={L.dim} fontFamily={SANS} fontSize={22}>{out ? "discharge OFF" : "discharge ON"}</text></g>;
  } else {
    const mono = mode === "mono" || base === "mono";
    left = <g>
      <line x1={140} y1={180} x2={900} y2={180} stroke={L.red} strokeWidth={6} /><text x={140} y={160} {...T1} fontSize={24} fill={L.red}>+9 V</text>
      <line x1={140} y1={900} x2={900} y2={900} stroke={L.wire} strokeWidth={6} />
      {chip(380, 360)}
      {W(`650,410 700,410 700,180`)}{W(`350,410 300,410 300,900`)}{W(`350,650 320,650 320,180`)}
      {mono ? <><Res x={760} y={300} ohm={100e3} label="R" />{W(`760,180 760,230`)}{W(`760,370 760,570`)}{W(`650,490 760,490`)}{W(`650,570 760,570`)}
          <line x1={720} y1={640} x2={800} y2={640} stroke={L.amber} strokeWidth={7} /><line x1={720} y1={664} x2={800} y2={664} stroke={L.amber} strokeWidth={7} />{W(`760,570 760,640`)}{W(`760,664 760,900`)}
          <text x={812} y={660} {...T1} fontSize={22}>C 10µ</text>
          {W(`350,490 200,490`)}<circle cx={200} cy={490} r={20} fill={tm < 0.3 ? L.red : "#3a4a5a"} /><text x={200} y={450} textAnchor="middle" {...T1} fontSize={22}>BUTTON</text></>
        : <><Res x={780} y={270} ohm={1000} label="R1" />{W(`780,180 780,200`)}{W(`780,340 780,370`)}<Res x={780} y={440} ohm={10e3} label="R2" />{W(`650,490 690,490 690,370 780,370`)}
          {W(`780,510 780,600`)}{W(`650,570 720,570 720,600 780,600`)}<line x1={740} y1={640} x2={820} y2={640} stroke={L.amber} strokeWidth={7} /><line x1={740} y1={664} x2={820} y2={664} stroke={L.amber} strokeWidth={7} />
          {W(`780,600 780,640`)}{W(`780,664 780,900`)}<text x={832} y={660} {...T1} fontSize={22}>C 10µ</text>{W(`350,490 330,490 330,600 780,600`)}</>}
      {W(`350,570 220,570 220,700`)}<circle cx={220} cy={730} r={28} fill={out ? "#ff5a5a" : "#4a2020"} />{out && <circle cx={220} cy={730} r={52} fill="#ff5a5a" opacity={0.3} />}{W(`220,758 220,900`)}
      <text x={220} y={800} textAnchor="middle" {...T1} fontSize={22}>LED</text></g>;
  }
  const GX = 1040, GW = 780;
  let right: React.ReactNode;
  if (mode === "calc") right = <g>{(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 92} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={28} fontWeight={700}
    opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  else { const mono = mode === "mono"; const N = 300; const span = mono ? 3 : 3 * per * slow; const qc: string[] = [], qo: string[] = [];
    for (let k = 0; k <= N; k++) { const tt = t - span + span * k / N; let v: number, o: boolean;
      if (mono) { const m = ((tt % 3) + 3) % 3; o = m > 0.3 && m < 1.4; v = o ? 9 * (1 - Math.exp(-(m - 0.3) / 1.0)) : 0; }
      else { const q = (((tt / slow) % per) + per) % per; o = q < tH; v = o ? 9 * (1 - (2 / 3) * Math.exp(-q / 0.11)) : 6 * Math.exp(-(q - tH) / 0.1); }
      const x = GX + GW * k / N; qc.push(`${x},${560 - v / 9 * 300}`); qo.push(`${x},${o ? 700 : 860}`); }
    right = <g>
      <text x={GX + 8} y={230} fill={L.amber} fontFamily={SANS} fontSize={24} fontWeight={800}>capacitor voltage{mono ? "" : " (slowed 20×)"}</text>
      <line x1={GX} y1={560} x2={GX + GW} y2={560} stroke={L.dim} strokeWidth={2} />
      {!mono && <><line x1={GX} y1={360} x2={GX + GW} y2={360} stroke={L.red} strokeDasharray="6 8" strokeWidth={2} /><text x={GX + GW} y={350} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={20}>⅔ VCC = 6 V</text>
        <line x1={GX} y1={460} x2={GX + GW} y2={460} stroke={L.cyan} strokeDasharray="6 8" strokeWidth={2} /><text x={GX + GW} y={485} textAnchor="end" fill={L.cyan} fontFamily={MONO} fontSize={20}>⅓ VCC = 3 V</text></>}
      {mono && <><line x1={GX} y1={360} x2={GX + GW} y2={360} stroke={L.red} strokeDasharray="6 8" strokeWidth={2} /><text x={GX + GW} y={350} textAnchor="end" fill={L.red} fontFamily={MONO} fontSize={20}>⅔ VCC → output ends</text></>}
      <polyline points={qc.join(" ")} fill="none" stroke={L.amber} strokeWidth={5} />
      <text x={GX + 8} y={680} fill={L.green} fontFamily={SANS} fontSize={24} fontWeight={800}>output (pin 3)</text>
      <polyline points={qo.join(" ")} fill="none" stroke={L.green} strokeWidth={5} />
      <text x={GX + GW / 2} y={950} textAnchor="middle" {...T1} fontSize={28}>{mono ? "one press → one 1.1 s pulse" : "tH 76 ms · tL 69 ms · f = 6.9 Hz"}</text></g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(20,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.t555 = T555Scene;

// ------------------------------------------------------------------ Numericals: diode circuits, clippers, clampers, RC filters
/** {"type":"dckt","kind":"series"|"hwr"|"bridge"|"clip"|"clamp","mode":"calc"|"wave","v":12,"r":1000,"vp":10,"vb":3,"lines":[...]} */
export const DcktScene: React.FC<any> = ({ dur, kind = "series", mode = "calc", v = 12, r = 1000, vp = 10, vb = 0, lines = [], label = "" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const D = (x: number, y: number, rot: number, on = false) => <g transform={`translate(${x},${y}) rotate(${rot})`}><rect x={-28} y={-28} width={56} height={56} fill={L.bg0} />
    <polygon points="-20,-22 -20,22 18,0" fill={on ? "rgba(46,196,160,0.35)" : L.bg0} stroke={on ? L.green : L.amber} strokeWidth={5} /><line x1={18} y1={-22} x2={18} y2={22} stroke={on ? L.green : L.amber} strokeWidth={5} /></g>;
  const ac = (x: number, y: number) => <g><circle cx={x} cy={y} r={46} fill={L.bg0} stroke={L.cyan} strokeWidth={5} /><path d={`M ${x - 26} ${y} q 13 -24 26 0 t 26 0`} fill="none" stroke={L.cyan} strokeWidth={4} />
    <text x={x} y={y + 80} textAnchor="middle" {...T1} fontSize={24} fill={L.cyan}>{vp} V peak</text></g>;
  const bat = (x: number, y: number, val: number) => <g><rect x={x - 40} y={y - 26} width={80} height={52} fill={L.bg0} /><line x1={x - 34} y1={y - 10} x2={x + 34} y2={y - 10} stroke={L.text} strokeWidth={6} /><line x1={x - 18} y1={y + 10} x2={x + 18} y2={y + 10} stroke={L.text} strokeWidth={11} />
    <text x={x + 50} y={y + 8} {...T1} fontSize={24}>{val} V</text></g>;
  const s = Math.sin(t * 3);
  const T = 300, B = 780;
  let left: React.ReactNode;
  if (kind === "series") left = <g>{bat(200, 540, v)}{W(`200,514 200,${T} 360,${T}`)}{W(`200,566 200,${B} 760,${B}`)}<Res x={430} y={T} ohm={r} label="R" horizontal />{W(`500,${T} 760,${T} 760,500`)}{D(760, 540, 90, true)}{W(`760,580 760,${B}`)}
    <Dots pts={[[200, 540], [200, T], [760, T], [760, B], [200, B], [200, 540]]} t={t} speed={100} /><text x={800} y={550} {...T1} fontSize={24}>0.7 V</text></g>;
  else if (kind === "hwr") left = <g>{ac(200, 540)}{W(`200,494 200,${T} 400,${T}`)}{D(460, T, 0, s > 0)}{W(`490,${T} 760,${T}`)}<Res x={760} y={540} ohm={r} label="RL" />{W(`760,${T} 760,470`)}{W(`760,610 760,${B} 200,${B} 200,586`)}
    {s > 0 && <Dots pts={[[200, 540], [200, T], [760, T], [760, B], [200, B], [200, 540]]} t={t} speed={120} />}</g>;
  else if (kind === "bridge") { const cx = 470, cy = 540; left = <g>{ac(180, 540)}{W(`180,494 180,${T} ${cx},${T} ${cx},${cy - 150}`)}{W(`180,586 180,${B} ${cx},${B} ${cx},${cy + 150}`)}
      <polygon points={`${cx},${cy - 150} ${cx + 150},${cy} ${cx},${cy + 150} ${cx - 150},${cy}`} fill="none" stroke={L.wire} strokeWidth={5} />
      {D(cx + 75, cy - 75, 45, s > 0)}{D(cx - 75, cy - 75, -45, s < 0)}{D(cx + 75, cy + 75, -45, s < 0)}{D(cx - 75, cy + 75, 45, s > 0)}
      {W(`${cx - 150},${cy} ${cx - 72},${cy}`)}{W(`${cx + 72},${cy} ${cx + 150},${cy}`)}<Res x={cx} y={cy} ohm={r} label="RL" horizontal />
      <text x={cx + 150} y={cy - 20} {...T1} fontSize={26} fill={L.green}>+</text><text x={cx - 170} y={cy - 20} {...T1} fontSize={26} fill={L.cyan}>−</text></g>; }
  else if (kind === "clip") left = <g>{ac(200, 540)}{W(`200,494 200,${T} 360,${T}`)}<Res x={430} y={T} ohm={r} label="R" horizontal />{W(`500,${T} 860,${T}`)}{W(`680,${T} 680,400`)}{D(680, 440, 90, s * vp > vb + 0.7)}{W(`680,470 680,560`)}{bat(680, 600, vb)}{W(`680,626 680,${B}`)}
    {W(`200,586 200,${B} 860,${B}`)}<circle cx={860} cy={T} r={10} fill={L.green} /><circle cx={860} cy={B} r={10} fill={L.green} /><text x={860} y={T - 26} textAnchor="middle" {...T1} fontSize={26} fill={L.green}>vout</text></g>;
  else left = <g>{ac(200, 540)}{W(`200,494 200,${T} 380,${T}`)}<line x1={400} y1={T - 40} x2={400} y2={T + 40} stroke={L.amber} strokeWidth={8} /><line x1={424} y1={T - 40} x2={424} y2={T + 40} stroke={L.amber} strokeWidth={8} />
    <text x={412} y={T - 56} textAnchor="middle" {...T1} fontSize={24}>C</text>{W(`444,${T} 860,${T}`)}{W(`680,${T} 680,${vb ? 470 : 500}`)}{D(680, vb ? 430 : 540, -90, s < 0)}{vb ? <>{W(`680,460 680,560`)}{bat(680, 600, vb)}{W(`680,626 680,${B}`)}</> : W(`680,570 680,${B}`)}
    {W(`200,586 200,${B} 860,${B}`)}<circle cx={860} cy={T} r={10} fill={L.green} /><circle cx={860} cy={B} r={10} fill={L.green} /><text x={860} y={T - 26} textAnchor="middle" {...T1} fontSize={26} fill={L.green}>vout</text></g>;
  const GX = 1040, GW = 780;
  let right: React.ReactNode;
  if (mode === "calc") right = <g>{label && <text x={GX} y={160} fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={800}>{label}</text>}
    {(lines as string[]).map((l, k) => <text key={k} x={GX} y={240 + k * 88} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={27} fontWeight={700}
      opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.85, k / Math.max(1, lines.length) * 0.85 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}</g>;
  else { const fin = (x: number) => vp * Math.sin(x);
    const fo = (x: number) => { const a = fin(x); if (kind === "hwr") return Math.max(0, a - 0.7); if (kind === "bridge") return Math.max(0, Math.abs(a) - 1.4);
      if (kind === "clip") return Math.min(a, vb + 0.7); if (kind === "clamp") return a + vp - 0.7 + vb; return a; };
    const sc = 110 / (2 * vp);
    const tr = (cy: number, fn: (x: number) => number, col: string, name: string) => { const q: string[] = []; for (let k = 0; k <= 300; k++) { const u = k / 300; q.push(`${GX + GW * u},${cy - fn(2 * Math.PI * 2 * u) * sc}`); }
      return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><text x={GX - 10} y={cy + 8} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={20}>0</text>
        <text x={GX + 8} y={cy - 2 * vp * sc - 12} fill={col} fontFamily={SANS} fontSize={24} fontWeight={800}>{name}</text><polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} /></g>; };
    const mx = Math.max(...Array.from({ length: 100 }, (_, k) => fo(2 * Math.PI * k / 100))), mn = Math.min(...Array.from({ length: 100 }, (_, k) => fo(2 * Math.PI * k / 100)));
    right = <g>{tr(400, fin, L.cyan, `input: ±${vp} V`)}{tr(840, fo, L.green, `output: ${mn.toFixed(1)} V to ${mx.toFixed(1)} V`)}</g>; }
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,60)">{left}</g><g transform="translate(-960,900)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.dckt = DcktScene;

/** {"type":"fnum","kind":"lp"|"hp","r":1000,"c":1e-6,"lines":[...],"label":"…"}: RC filter with its curve (fc marked) and worked lines */
export const FnumScene: React.FC<any> = ({ dur, kind = "lp", r = 1000, c = 1e-6, lines = [], label = "" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const fc = 1 / (2 * Math.PI * r * c); const lp = kind === "lp";
  const capH = (x: number, y: number) => <g><rect x={x - 18} y={y - 36} width={36} height={72} fill={L.bg0} /><line x1={x - 10} y1={y - 34} x2={x - 10} y2={y + 34} stroke={L.amber} strokeWidth={7} /><line x1={x + 10} y1={y - 34} x2={x + 10} y2={y + 34} stroke={L.amber} strokeWidth={7} /></g>;
  const capV = (x: number, y: number) => <g><rect x={x - 36} y={y - 18} width={72} height={36} fill={L.bg0} /><line x1={x - 34} y1={y - 10} x2={x + 34} y2={y - 10} stroke={L.amber} strokeWidth={7} /><line x1={x - 34} y1={y + 10} x2={x + 34} y2={y + 10} stroke={L.amber} strokeWidth={7} /></g>;
  const cs = c >= 1e-6 ? `${+(c * 1e6).toFixed(2)} µF` : `${+(c * 1e9).toFixed(1)} nF`;
  const T = 300, B = 760;
  const left = <g><circle cx={180} cy={530} r={46} fill={L.bg0} stroke={L.cyan} strokeWidth={5} /><path d="M 154 530 q 13 -24 26 0 t 26 0" fill="none" stroke={L.cyan} strokeWidth={4} />
    {W(`180,484 180,${T} 300,${T}`)}{W(`180,576 180,${B} 860,${B}`)}
    {lp ? <><Res x={370} y={T} ohm={r} label="R" horizontal />{W(`440,${T} 860,${T}`)}{W(`640,${T} 640,500`)}{capV(640, 520)}<text x={690} y={528} {...T1} fontSize={24}>C {cs}</text>{W(`640,540 640,${B}`)}</>
      : <>{capH(330, T)}<text x={330} y={T - 52} textAnchor="middle" {...T1} fontSize={24}>C {cs}</text>{W(`348,${T} 860,${T}`)}<Res x={640} y={530} ohm={r} label="R" />{W(`640,${T} 640,460`)}{W(`640,600 640,${B}`)}</>}
    <circle cx={860} cy={T} r={10} fill={L.green} /><circle cx={860} cy={B} r={10} fill={L.green} /><text x={860} y={T - 26} textAnchor="middle" {...T1} fontSize={26} fill={L.green}>vout</text>
    <text x={520} y={900} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{lp ? "RC LOW-PASS" : "RC HIGH-PASS"} · fc = {fc >= 1000 ? (fc / 1000).toFixed(2) + " kHz" : fc.toFixed(1) + " Hz"}</text></g>;
  const GX = 1040, GW = 780;
  const lf0 = Math.log10(fc) - 2, span = 4; const fx = (f: number) => GX + (Math.log10(f) - lf0) / span * GW, gy = (g: number) => 1000 - g * 220;
  const q: string[] = []; for (let k = 0; k <= 200; k++) { const f = Math.pow(10, lf0 + span * k / 200); const x = f / fc; const g = lp ? 1 / Math.sqrt(1 + x * x) : x / Math.sqrt(1 + x * x); q.push(`${fx(f)},${gy(g)}`); }
  const right = <g>{label && <text x={GX} y={150} fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={800}>{label}</text>}
    {(lines as string[]).map((l, k) => <text key={k} x={GX} y={220 + k * 74} fill={k === lines.length - 1 ? L.green : L.text} fontFamily={MONO} fontSize={26} fontWeight={700}
      opacity={interpolate(p, [k / Math.max(1, lines.length) * 0.8, k / Math.max(1, lines.length) * 0.8 + 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>{l}</text>)}
    <line x1={GX} y1={1000} x2={GX + GW} y2={1000} stroke={L.dim} strokeWidth={2} /><polyline points={q.join(" ")} fill="none" stroke={L.green} strokeWidth={4} />
    <line x1={fx(fc)} y1={1000} x2={fx(fc)} y2={770} stroke={L.red} strokeDasharray="6 6" strokeWidth={2} /><circle cx={fx(fc)} cy={gy(0.707)} r={8} fill={L.red} />
    <text x={fx(fc) + 12} y={gy(0.707) - 10} fill={L.red} fontFamily={MONO} fontSize={20}>70.7% at fc</text></g>;
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<><g transform="translate(40,60)">{left}</g><g transform="translate(-960,780)">{right}</g></>);
  return svg(<>{left}{right}</>);
};
ANALOG_SCENES.fnum = FnumScene;

// ------------------------------------------------------------------ One-shot helpers: dual current flow, charge counter, DC vs AC, and a split "what-if" comparison
/** {"type":"dual","mode":"both"|"conv"|"elec"|"charge"|"dcac"|"open","v":9,"r":100} */
export const DualFlow: React.FC<any> = ({ dur, mode = "both", v = 9, r = 100 }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width: VW, height: VH } = useVideoConfig();
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const I = v / r; const open = mode === "open";
  const X0 = 260, X1 = 1660, Y0 = 260, Y1 = 820;
  const loop = [[X0, 540], [X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1], [X0, 540]];
  const showC = mode === "both" || mode === "conv", showE = mode === "both" || mode === "elec" || mode === "charge";
  const arrows = (rev: boolean, col: string, off: number) => { const pts = rev ? [...loop].reverse() : loop; const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])); const len = seg.reduce((a, b) => a + b, 0);
    const at = (d: number) => { let k = 0; while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; } const q = d / seg[k]; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * q, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * q, Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0])]; };
    return <g>{Array.from({ length: 10 }, (_, i) => { const [x, y, a] = at(((i / 10) * len + t * 90 + off) % len); return <g key={i} transform={`translate(${x},${y + (rev ? 0 : 0)}) rotate(${a * 180 / Math.PI})`}><polygon points="-16,-12 16,0 -16,12" fill={col} /></g>; })}</g>; };
  const dcac = mode === "dcac";
  const acDir = Math.sin(t * 1.6);
  const left = <g>
    {/* wires */}
    <polyline points={loop.map((q) => q.join(",")).join(" ")} fill="none" stroke={L.wire} strokeWidth={8} />
    {/* battery or AC source */}
    {dcac ? <g><circle cx={X0} cy={540} r={70} fill={L.bg0} stroke={L.cyan} strokeWidth={6} /><path d={`M ${X0 - 40} 540 q 20 -36 40 0 t 40 0`} fill="none" stroke={L.cyan} strokeWidth={5} /></g>
      : <g><rect x={X0 - 80} y={480} width={160} height={120} fill={L.bg0} /><line x1={X0 - 70} y1={515} x2={X0 + 70} y2={515} stroke={L.red} strokeWidth={9} /><line x1={X0 - 40} y1={565} x2={X0 + 40} y2={565} stroke={L.cyan} strokeWidth={16} />
        <text x={X0 + 95} y={512} {...T1} fontSize={40} fill={L.red}>+</text><text x={X0 + 95} y={590} {...T1} fontSize={40} fill={L.cyan}>−</text>
        <text x={X0 - 100} y={550} textAnchor="end" {...T1} fontSize={36}>{v} V</text></g>}
    {/* bulb */}
    <g transform={`translate(${(X0 + X1) / 2},${Y0})`}><rect x={-90} y={-60} width={180} height={120} fill={L.bg0} />
      <circle r={56} fill={open ? "#2a2f36" : "#fff3a0"} opacity={open ? 1 : 0.25 + 0.7 * (dcac ? Math.abs(acDir) : 1)} stroke={L.amber} strokeWidth={5} />
      <path d="M -20 10 q 10 -30 20 0 q 10 -30 20 0" fill="none" stroke={L.amber} strokeWidth={4} /><text y={-80} textAnchor="middle" {...T1} fontSize={28}>bulb ({r} Ω)</text></g>
    {open && <g><rect x={X1 - 30} y={500} width={60} height={80} fill={L.bg0} /><circle cx={X1} cy={500} r={9} fill={L.text} /><circle cx={X1} cy={580} r={9} fill={L.text} /><line x1={X1} y1={500} x2={X1 + 50} y2={570} stroke={L.red} strokeWidth={7} />
      <text x={X1 - 40} y={545} textAnchor="end" {...T1} fontSize={28} fill={L.red}>switch OPEN</text></g>}
    {!open && !dcac && showC && arrows(false, L.amber, 0)}
    {!open && !dcac && showE && <Dots pts={[...loop].reverse()} t={t} speed={110} gap={46} r={10} color={L.electron} />}
    {dcac && <Dots pts={acDir > 0 ? loop : [...loop].reverse()} t={t} speed={60 + 80 * Math.abs(acDir)} gap={46} r={10} color={L.electron} />}
    {!open && !dcac && <g>
      {showC && <g><polygon points={`${X0 + 120},94 ${X0 + 150},110 ${X0 + 120},126`} fill={L.amber} /><text x={X0 + 170} y={120} {...T1} fontSize={30} fill={L.amber}>conventional current: + → −  (out of +, around, into −)</text></g>}
      {showE && <g><circle cx={X0 + 135} cy={926} r={11} fill={L.electron} /><text x={X0 + 170} y={936} {...T1} fontSize={30} fill={L.electron}>electrons: − → +  (out of −, around, into +)</text></g>}</g>}
    {mode === "charge" && <g><line x1={1300} y1={Y1 - 90} x2={1300} y2={Y1 + 90} stroke={L.red} strokeWidth={4} strokeDasharray="10 8" />
      <text x={1300} y={Y1 - 110} textAnchor="middle" {...T1} fontSize={26} fill={L.red}>count the charge passing here</text>
      <rect x={760} y={440} width={400} height={180} rx={16} fill={L.panel} stroke={L.red} strokeWidth={4} />
      <text x={960} y={500} textAnchor="middle" {...T1} fontSize={28}>after {(p * 10).toFixed(1)} s</text>
      <text x={960} y={560} textAnchor="middle" {...T1} fontSize={36} fill={L.green}>Q = {(I * p * 10).toFixed(2)} C</text>
      <text x={960} y={600} textAnchor="middle" fill={L.dim} fontFamily={MONO} fontSize={24}>I = Q ÷ t = {I.toFixed(2)} A</text></g>}
    {dcac && <g><text x={(X0 + X1) / 2} y={560} textAnchor="middle" {...T1} fontSize={34} fill={L.cyan}>AC: electrons rock back and forth</text>
      <text x={(X0 + X1) / 2} y={610} textAnchor="middle" {...T1} fontSize={30} fill={L.dim}>{acDir > 0 ? "→ this half cycle" : "← this half cycle"}</text></g>}
    {open && <text x={(X0 + X1) / 2} y={560} textAnchor="middle" {...T1} fontSize={34} fill={L.red}>broken loop → NO current, bulb OFF</text>}
  </g>;
  const svg = (inner: React.ReactNode) => <AbsoluteFill><svg viewBox={VH > VW ? "0 0 1080 1920" : "0 0 1920 1080"} width="100%" height="100%">{inner}</svg></AbsoluteFill>;
  if (VH > VW) return svg(<g transform="translate(0,500) scale(0.56)">{left}</g>);
  return svg(left);
};
ANALOG_SCENES.dual = DualFlow;

/** {"type":"split","a":{scene},"b":{scene},"la":"ORIGINAL","lb":"WHAT IF: diode flipped?"}: two scenes side by side for comparisons */
export const SplitScene: React.FC<any> = ({ dur, a = {}, b = {}, la = "", lb = "" }) => {
  const A = ANALOG_SCENES[a.type], Bc = ANALOG_SCENES[b.type];
  const half = (C: any, props: any, x: number, lab: string, col: string) => <div style={{ position: "absolute", left: `${x}%`, top: "8%", width: "50%", height: "84%" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 30, color: col, zIndex: 2 }}>{lab}</div>
    <div style={{ position: "absolute", top: "6%", left: 0, width: "100%", height: "94%" }}>{C ? <C dur={dur} {...props} /> : null}</div></div>;
  return <AbsoluteFill>
    {half(A, a, 0, la, L.green)}{half(Bc, b, 50, lb, L.red)}
    <div style={{ position: "absolute", left: "50%", top: "10%", bottom: "6%", width: 3, background: L.off }} /></AbsoluteFill>;
};
ANALOG_SCENES.split = SplitScene;

/** {"type":"rvar","kind":"pot"|"ldr"|"ntc"|"burn"}: variable resistors in a live divider / power-rating test */
export const RVarScene: React.FC<any> = ({ dur, kind = "pot" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const tri = (u: number) => 1 - Math.abs(1 - 2 * u);
  let left: React.ReactNode, right: React.ReactNode;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={1040} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text><text x={1820} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  if (kind === "pot") { const w = tri(p); const vout = 10 * w;
    left = <g><Battery x={200} y={540} v={10} />{W("200,500 200,250 520,250 520,300")}{W("200,580 200,830 520,830 520,780")}
      <rect x={490} y={300} width={60} height={480} rx={10} fill={L.bg0} stroke={L.amber} strokeWidth={5} />
      <path d={"M 520 300 " + Array.from({ length: 16 }, (_, k) => `L ${k % 2 ? 505 : 535} ${300 + (k + 1) * 30}`).join(" ")} fill="none" stroke={L.amber} strokeWidth={4} />
      <polygon points={`${575},${780 - 480 * w} ${615},${760 - 480 * w} ${615},${800 - 480 * w}`} fill={L.cyan} />{W(`615,${780 - 480 * w} 800,${780 - 480 * w} 800,540`)}
      <circle cx={800} cy={540} r={10} fill={L.green} /><text x={800} y={600} textAnchor="middle" {...T1} fontSize={30} fill={L.green}>Vout = {vout.toFixed(1)} V</text>
      <text x={600} y={220} textAnchor="middle" {...T1} fontSize={26}>POTENTIOMETER 10 kΩ (wiper = arrow)</text></g>;
    right = <g><text x={1430} y={240} textAnchor="middle" {...T1} fontSize={32}>A VARIABLE VOLTAGE DIVIDER</text>
      {row(340, "wiper position", `${Math.round(w * 100)}% up`, L.cyan)}{row(430, "resistance below wiper", `${(10 * w).toFixed(1)} kΩ`, L.text)}{row(520, "Vout = 10 V × below ÷ total", `${vout.toFixed(1)} V`, L.green)}
      <text x={1430} y={660} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>volume knobs, light dimmers, sensors' trim adjust</text></g>; }
  else if (kind === "ldr" || kind === "ntc") { const ldr = kind === "ldr"; const x = tri(p);
    const R = ldr ? 1000 * Math.pow(100, 1 - x) : 10000 * Math.exp(3950 * (1 / (273 + 20 + 60 * x) - 1 / 298));
    const vout = 5 * 10000 / (10000 + R);
    left = <g><Battery x={200} y={540} v={5} />{W("200,500 200,230 520,230 520,280")}{W("200,580 200,850 520,850 520,800")}
      <Res x={520} y={360} ohm={R} label={ldr ? "LDR" : "THERMISTOR"} />{W("520,430 520,640")}<Res x={520} y={720} ohm={10000} label="10 kΩ" />
      <circle cx={520} cy={540} r={10} fill={L.green} />{W("520,540 760,540")}<text x={780} y={548} {...T1} fontSize={30} fill={L.green}>{vout.toFixed(2)} V</text>
      {ldr ? <g><circle cx={760} cy={300} r={40 + 30 * x} fill="#ffd24a" opacity={0.15 + 0.7 * x} />{[0, 1, 2].map((k) => <line key={k} x1={720 - k * 20} y1={330 + k * 20} x2={600} y2={370} stroke="#ffb000" strokeWidth={4} opacity={x} />)}
          <text x={760} y={230} textAnchor="middle" {...T1} fontSize={26} fill="#c08a00">light {Math.round(x * 100)}%</text></g>
        : <g><rect x={720} y={230} width={40} height={200} rx={20} fill="none" stroke={L.dim} strokeWidth={4} /><rect x={728} y={420 - 180 * x} width={24} height={180 * x + 6} rx={12} fill={L.red} />
          <text x={800} y={340} {...T1} fontSize={28} fill={L.red}>{(20 + 60 * x).toFixed(0)} °C</text></g>}</g>;
    right = <g><text x={1430} y={240} textAnchor="middle" {...T1} fontSize={32}>{ldr ? "LDR: MORE LIGHT → LESS R" : "NTC THERMISTOR: HOTTER → LESS R"}</text>
      {row(340, ldr ? "light level" : "temperature", ldr ? `${Math.round(x * 100)}%` : `${(20 + 60 * x).toFixed(0)} °C`, L.amber)}
      {row(430, ldr ? "LDR resistance" : "thermistor resistance", R >= 1000 ? `${(R / 1000).toFixed(1)} kΩ` : `${R.toFixed(0)} Ω`, L.text)}{row(520, "divider output", `${vout.toFixed(2)} V`, L.green)}
      <text x={1430} y={660} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{ldr ? "street lights that switch on at dusk" : "temperature sensing, fire alarms, battery chargers"}</text></g>; }
  else { const v = 2 + 10 * p, R = 100, P = v * v / R; const burnt = P > 0.5 && p > 0.9;
    left = <g><Battery x={200} y={540} v={+v.toFixed(1)} />{W("200,500 200,300 440,300")}{W("600,300 800,300 800,780 200,780 200,580")}
      <Res x={520} y={300} ohm={100} label="R (¼ W)" horizontal heat={P / 0.25 * 0.5} />
      {P > 0.25 && Array.from({ length: 4 }, (_, k) => <path key={k} d={`M ${480 + k * 25} 240 q 10 -30 0 -60 q -10 -30 0 -60`} fill="none" stroke="#888" strokeWidth={4} opacity={Math.min(1, (P - 0.25) * 2) * (0.4 + 0.4 * Math.sin(t * 3 + k))} />)}
      {burnt && <text x={520} y={420} textAnchor="middle" {...T1} fontSize={34} fill={L.red}>BURNT!</text>}</g>;
    right = <g><text x={1430} y={240} textAnchor="middle" {...T1} fontSize={32}>POWER RATING TEST: 100 Ω, ¼ W</text>
      {row(340, "voltage", `${v.toFixed(1)} V`, L.text)}{row(430, "P = V² ÷ R", `${P.toFixed(2)} W`, P > 0.25 ? L.red : L.green)}{row(520, "rating", "0.25 W", L.amber)}
      <text x={1430} y={660} textAnchor="middle" fill={P > 0.25 ? L.red : L.green} fontFamily={SANS} fontSize={30} fontWeight={800}>{P > 0.25 ? "over the rating: overheating" : "safe"}</text></g>; }
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{left}{right}</svg></AbsoluteFill>;
};
ANALOG_SCENES.rvar = RVarScene;

/** {"type":"capx","mode":"inside"|"dcac"|"reverse"|"xc"|"combo"}: what a capacitor does, physically */
export const CapXScene: React.FC<any> = ({ dur, mode = "inside" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={1040} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text><text x={1820} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  let body: React.ReactNode;
  if (mode === "inside") { const q = 1 - Math.exp(-p * 5); const n = Math.round(q * 12);
    body = <g><Battery x={200} y={540} v={9} />{W("200,500 200,250 600,250 600,420")}{W("200,580 200,830 600,830 600,660")}
      <rect x={480} y={420} width={240} height={22} fill="#8a96a3" /><rect x={480} y={638} width={240} height={22} fill="#8a96a3" />
      <rect x={480} y={442} width={240} height={196} fill="#e8eef4" /><text x={600} y={548} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>insulator (dielectric)</text>
      {Array.from({ length: n }, (_, k) => <text key={k} x={494 + k * 19} y={412} {...T1} fontSize={26} fill={L.red}>+</text>)}
      {Array.from({ length: n }, (_, k) => <circle key={k} cx={500 + k * 19} cy={676} r={8} fill={L.electron} />)}
      {q < 0.97 && <><Dots pts={[[600, 420], [600, 250], [200, 250], [200, 500]]} t={t} speed={40 + 200 * (1 - q)} gap={46} r={9} color={L.electron} />
        <Dots pts={[[200, 580], [200, 830], [600, 830], [600, 660]]} t={t} speed={40 + 200 * (1 - q)} gap={46} r={9} color={L.electron} /></>}
      <text x={600} y={940} textAnchor="middle" {...T1} fontSize={28}>{q < 0.97 ? "electrons pulled OFF the top plate, pushed ONTO the bottom plate" : "full: plate voltage = battery → current stops"}</text>
      <text x={820} y={440} {...T1} fontSize={24} fill={L.red}>+ plate</text><text x={820} y={670} {...T1} fontSize={24} fill={L.electron}>− plate</text></g>;
    body = <g>{body}{row(330, "capacitor voltage", `${(9 * q).toFixed(1)} V`, L.green)}{row(420, "charge stored Q = C V", `${(100 * 9 * q).toFixed(0)} µC`, L.amber)}{row(510, "current", q < 0.97 ? "flowing" : "zero", L.cyan)}
      <text x={1430} y={250} textAnchor="middle" {...T1} fontSize={30}>100 µF CAPACITOR CHARGING</text></g>; }
  else if (mode === "dcac") { const half = p < 0.5; const u = half ? p * 2 : (p - 0.5) * 2;
    const glow = half ? Math.exp(-u * 8) : 0.6 + 0.4 * Math.abs(Math.sin(t * 6));
    body = <g>{half ? <Battery x={200} y={540} v={9} /> : <g><circle cx={200} cy={540} r={60} fill={L.bg0} stroke={L.cyan} strokeWidth={6} /><path d="M 166 540 q 17 -30 34 0 t 34 0" fill="none" stroke={L.cyan} strokeWidth={5} /></g>}
      {W("200,480 200,260 420,260")}{W("200,600 200,820 800,820 800,600")}{W("520,260 800,260 800,480")}
      <g transform="translate(470,260)"><rect x={-50} y={-50} width={100} height={100} fill={L.bg0} /><circle r={44} fill="#fff3a0" opacity={0.15 + 0.85 * glow} stroke={L.amber} strokeWidth={4} /></g>
      <rect x={760} y={480} width={80} height={120} fill={L.bg0} /><line x1={760} y1={528} x2={840} y2={528} stroke={L.amber} strokeWidth={9} /><line x1={760} y1={552} x2={840} y2={552} stroke={L.amber} strokeWidth={9} />
      <text x={860} y={548} {...T1} fontSize={26}>C</text>
      {(half ? glow > 0.05 : true) && <Dots pts={half ? [[200, 480], [200, 260], [800, 260], [800, 480]] : (Math.sin(t * 6) > 0 ? [[200, 480], [200, 260], [800, 260], [800, 480]] : [[800, 480], [800, 260], [200, 260], [200, 480]])} t={t} speed={half ? 200 * glow : 150} gap={46} r={9} />}
      <text x={500} y={940} textAnchor="middle" {...T1} fontSize={30} fill={half ? L.red : L.green}>{half ? "DC: a short flash while C charges, then NOTHING" : "AC: C keeps charging and discharging → current keeps flowing"}</text></g>;
    body = <g>{body}<text x={1430} y={300} textAnchor="middle" {...T1} fontSize={32}>{half ? "DC IS BLOCKED" : "AC PASSES"}</text>
      <text x={1430} y={380} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>{half ? "once full, no more charge can move" : "the plates refill every half cycle"}</text>
      <text x={1430} y={470} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>no electron ever crosses the insulator</text></g>; }
  else if (mode === "reverse") { const leak = p * p; const bulge = Math.max(0, p - 0.6) * 60; const pop = p > 0.93;
    body = <g><Battery x={200} y={540} v={16} />{W("200,500 200,260 600,260 600,400")}{W("200,580 200,820 600,820 600,700")}
      <g transform={`translate(600,550) scale(${1 + bulge / 400},1)`}><rect x={-80} y={-150} width={160} height={300} rx={20} fill={pop ? "#555" : "#2e5a87"} stroke="#4a5d70" strokeWidth={5} />
        <rect x={-80} y={-150} width={34} height={300} fill="#ddd" opacity={0.8} /><text x={-63} y={10} textAnchor="middle" fill="#2e5a87" fontFamily={SANS} fontSize={40} fontWeight={800}>−</text>
        <ellipse cx={0} cy={-150} rx={80 + bulge} ry={12 + bulge / 2} fill={pop ? "#333" : "#9aa5b1"} /></g>
      <text x={470} y={360} {...T1} fontSize={26} fill={L.red}>"−" side wired to +</text>
      {!pop && <Dots pts={[[200, 500], [200, 260], [600, 260], [600, 820], [200, 820]]} t={t} speed={30 + leak * 300} gap={40} r={8} />}
      {p > 0.5 && !pop && Array.from({ length: 3 }, (_, k) => <path key={k} d={`M ${570 + k * 30} 380 q 10 -30 0 -60`} fill="none" stroke="#999" strokeWidth={4} opacity={0.5} />)}
      {pop && <text x={600} y={330} textAnchor="middle" {...T1} fontSize={50} fill={L.red}>POP!</text>}</g>;
    body = <g>{body}<text x={1430} y={260} textAnchor="middle" {...T1} fontSize={30}>WHAT IF: ELECTROLYTIC REVERSED?</text>
      {row(360, "leakage current", `${(leak * 2000).toFixed(0)} mA`, L.red)}{row(450, "temperature", `${(25 + leak * 100).toFixed(0)} °C`, L.red)}
      <text x={1430} y={600} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>the thin oxide layer dissolves → it conducts → gas → bulge → burst</text>
      <text x={1430} y={660} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>ceramic capacitors have no polarity: either way is fine</text></g>; }
  else if (mode === "xc") { const f = Math.pow(10, 1 + 3 * p); const xc = 1 / (2 * Math.PI * f * 10e-6); const i = 5 / Math.sqrt(xc * xc + 100 * 100);
    body = <g><circle cx={200} cy={540} r={60} fill={L.bg0} stroke={L.cyan} strokeWidth={6} /><path d="M 166 540 q 17 -30 34 0 t 34 0" fill="none" stroke={L.cyan} strokeWidth={5} />
      <text x={200} y={650} textAnchor="middle" {...T1} fontSize={24} fill={L.cyan}>5 V, {f >= 1000 ? (f / 1000).toFixed(1) + " kHz" : f.toFixed(0) + " Hz"}</text>
      {W("200,480 200,260 420,260")}{W("200,600 200,820 800,820 800,600")}<Res x={490} y={260} ohm={100} label="100 Ω" horizontal />{W("560,260 800,260 800,480")}
      <rect x={760} y={480} width={80} height={120} fill={L.bg0} /><line x1={760} y1={528} x2={840} y2={528} stroke={L.amber} strokeWidth={9} /><line x1={760} y1={552} x2={840} y2={552} stroke={L.amber} strokeWidth={9} /><text x={860} y={548} {...T1} fontSize={26}>10 µF</text>
      <Dots pts={Math.sin(t * 6) > 0 ? [[200, 480], [200, 260], [800, 260], [800, 480]] : [[800, 480], [800, 260], [200, 260], [200, 480]]} t={t} speed={20 + i * 4000} gap={40} r={8} /></g>;
    body = <g>{body}<text x={1430} y={260} textAnchor="middle" {...T1} fontSize={30}>HIGHER FREQUENCY → LESS OPPOSITION</text>
      {row(360, "frequency f", f >= 1000 ? `${(f / 1000).toFixed(2)} kHz` : `${f.toFixed(0)} Hz`, L.cyan)}{row(450, "XC = 1 ÷ (2π f C)", `${xc.toFixed(1)} Ω`, L.amber)}{row(540, "current", `${(i * 1000).toFixed(1)} mA`, L.green)}
      <text x={1430} y={680} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>DC is f = 0 → XC = infinite → blocked</text></g>; }
  else { body = <g>
      <text x={480} y={250} textAnchor="middle" {...T1} fontSize={30}>PARALLEL: plates side by side</text>
      {[0, 1].map((k) => <g key={k}><rect x={300 + k * 180} y={330} width={140} height={14} fill="#8a96a3" /><rect x={300 + k * 180} y={380} width={140} height={14} fill="#8a96a3" /></g>)}
      <text x={480} y={460} textAnchor="middle" fill={L.green} fontFamily={MONO} fontSize={28} fontWeight={800}>bigger plate area → C adds: 10 + 10 = 20 µF</text>
      <text x={480} y={620} textAnchor="middle" {...T1} fontSize={30}>SERIES: plates further apart</text>
      {[0, 1].map((k) => <g key={k}><rect x={410} y={680 + k * 100} width={140} height={14} fill="#8a96a3" /><rect x={410} y={730 + k * 100} width={140} height={14} fill="#8a96a3" /></g>)}
      <text x={480} y={900} textAnchor="middle" fill={L.amber} fontFamily={MONO} fontSize={28} fontWeight={800}>like a bigger gap → 10 and 10 in series = 5 µF</text>
      <text x={1430} y={300} textAnchor="middle" {...T1} fontSize={30}>OPPOSITE OF RESISTORS</text>
      {row(400, "parallel", "C = C1 + C2", L.green)}{row(490, "series", "1/C = 1/C1 + 1/C2", L.amber)}{row(580, "C = ε A ÷ d", "area ↑, gap ↓ → C ↑", L.text)}
      {row(670, "energy stored", "E = ½ C V²", L.cyan)}</g>; }
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{body}</svg></AbsoluteFill>;
};
ANALOG_SCENES.capx = CapXScene;

/** {"type":"indx","mode":"field"|"spark"|"diode"|"xl"|"combo"}: inductor behaviour */
export const IndXScene: React.FC<any> = ({ dur, mode = "field" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={1040} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text><text x={1820} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  const coil = (x: number, y: number, n = 6) => <path d={`M ${x} ${y} ` + Array.from({ length: n }, () => "a 18 18 0 1 1 0 36").join(" ")} fill="none" stroke={L.amber} strokeWidth={6} />;
  let body: React.ReactNode;
  if (mode === "field") { const i = 1 - Math.exp(-p * 5);
    body = <g><Battery x={200} y={540} v={10} />{W("200,500 200,250 700,250 700,432")}{coil(700, 432, 6)}{W("700,648 700,830 200,830 200,580")}
      {[1, 2, 3, 4].map((k) => <ellipse key={k} cx={700} cy={540} rx={40 + k * 45} ry={130 + k * 30} fill="none" stroke={L.cyan} strokeWidth={3} opacity={i * (1 - k * 0.18)} strokeDasharray="10 8" />)}
      <Dots pts={[[200, 500], [200, 250], [700, 250], [700, 830], [200, 830]]} t={t} speed={20 + 160 * i} gap={44} r={9} color={L.electron} />
      <text x={700} y={960} textAnchor="middle" {...T1} fontSize={28}>current builds a magnetic field; the field stores energy</text></g>;
    body = <g>{body}<text x={1430} y={250} textAnchor="middle" {...T1} fontSize={30}>CURRENT RISES SLOWLY</text>
      {row(350, "current (of 1 A max)", `${(i).toFixed(2)} A`, L.cyan)}{row(440, "back-EMF fighting it", `${(10 * (1 - i)).toFixed(1)} V`, L.red)}
      <text x={1430} y={580} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>Lenz: the coil opposes any CHANGE in current</text>
      <text x={1430} y={630} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>τ = L ÷ R, full after 5τ</text></g>; }
  else if (mode === "spark" || mode === "diode") { const off = p > 0.35; const u = off ? (p - 0.35) / 0.65 : 0; const dio = mode === "diode";
    const spike = off ? (dio ? 0.7 : 400 * Math.exp(-u * 2.5)) : 0;
    body = <g><Battery x={200} y={540} v={12} />{W("200,500 200,250 380,250")}<circle cx={380} cy={250} r={9} fill={L.text} /><circle cx={470} cy={250} r={9} fill={L.text} />
      <line x1={380} y1={250} x2={off ? 450 : 470} y2={off ? 200 : 250} stroke={off ? L.red : L.green} strokeWidth={7} />{W("470,250 700,250 700,432")}{coil(700, 432, 6)}{W("700,648 700,830 200,830 200,580")}
      {off && !dio && u < 0.6 && <g><polyline points="400,240 420,215 412,215 440,185" fill="none" stroke="#fff3a0" strokeWidth={6} /><circle cx={425} cy={225} r={40} fill="#fff3a0" opacity={0.4} /></g>}
      {dio && <g>{W("700,250 880,250 880,500")}<g transform="translate(880,540) rotate(-90)"><rect x={-28} y={-28} width={56} height={56} fill={L.bg0} /><polygon points="-20,-22 -20,22 18,0" fill={off ? "rgba(46,196,160,0.35)" : L.bg0} stroke={off ? L.green : L.amber} strokeWidth={5} /><line x1={18} y1={-22} x2={18} y2={22} stroke={off ? L.green : L.amber} strokeWidth={5} /></g>{W("880,580 880,830 700,830")}
        {off && <Dots pts={[[700, 432], [700, 648], [700, 830], [880, 830], [880, 250], [700, 250], [700, 432]]} t={t} speed={120 * Math.exp(-u * 4)} gap={44} r={8} />}
        <text x={940} y={545} {...T1} fontSize={24} fill={L.green}>flyback diode</text></g>}
      <text x={560} y={960} textAnchor="middle" {...T1} fontSize={28} fill={off ? (dio ? L.green : L.red) : L.text}>{!off ? "switch closed: current flows, field stored" : dio ? "diode gives the current a safe loop: no spike" : "switch opened: field collapses → huge voltage spike → spark!"}</text></g>;
    body = <g>{body}<text x={1430} y={250} textAnchor="middle" {...T1} fontSize={30}>{dio ? "THE FIX: FLYBACK DIODE" : "WHAT IF: YOU SWITCH AN INDUCTOR OFF?"}</text>
      {row(350, "voltage across switch", off ? `${(12 + spike).toFixed(0)} V` : "0 V", spike > 20 ? L.red : L.green)}
      <text x={1430} y={500} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>V = L × (change in I ÷ time): instant stop → enormous V</text>
      <text x={1430} y={560} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>this kills transistors driving relays and motors</text></g>; }
  else if (mode === "xl") { const f = Math.pow(10, 1 + 3 * p); const xl = 2 * Math.PI * f * 0.1; const i = 5 / Math.sqrt(xl * xl + 100 * 100);
    body = <g><circle cx={200} cy={540} r={60} fill={L.bg0} stroke={L.cyan} strokeWidth={6} /><path d="M 166 540 q 17 -30 34 0 t 34 0" fill="none" stroke={L.cyan} strokeWidth={5} />
      {W("200,480 200,260 420,260")}{W("200,600 200,820 700,820 700,648")}<Res x={490} y={260} ohm={100} label="100 Ω" horizontal />{W("560,260 700,260 700,432")}{coil(700, 432, 6)}<text x={760} y={548} {...T1} fontSize={26}>100 mH</text>
      <Dots pts={Math.sin(t * 6) > 0 ? [[200, 480], [200, 260], [700, 260], [700, 820], [200, 820]] : [[200, 820], [700, 820], [700, 260], [200, 260], [200, 480]]} t={t} speed={20 + i * 4000} gap={40} r={8} /></g>;
    body = <g>{body}<text x={1430} y={260} textAnchor="middle" {...T1} fontSize={30}>HIGHER FREQUENCY → MORE OPPOSITION</text>
      {row(360, "frequency", f >= 1000 ? `${(f / 1000).toFixed(2)} kHz` : `${f.toFixed(0)} Hz`, L.cyan)}{row(450, "XL = 2π f L", `${xl.toFixed(0)} Ω`, L.amber)}{row(540, "current", `${(i * 1000).toFixed(1)} mA`, L.green)}
      <text x={1430} y={680} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>DC (f = 0) → XL = 0: just a wire. Opposite of a capacitor</text></g>; }
  else body = <g><text x={960} y={260} textAnchor="middle" {...T1} fontSize={32}>INDUCTORS COMBINE LIKE RESISTORS</text>
    {row(380, "series", "L = L1 + L2", L.green)}{row(470, "parallel", "1/L = 1/L1 + 1/L2", L.amber)}{row(560, "energy stored", "E = ½ L I²", L.cyan)}{row(650, "time constant", "τ = L ÷ R", L.text)}
    {coil(300, 330, 5)}{coil(450, 330, 5)}<text x={375} y={560} textAnchor="middle" {...T1} fontSize={26}>10 + 10 = 20 mH (series)</text></g>;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{body}</svg></AbsoluteFill>;
};
ANALOG_SCENES.indx = IndXScene;

/** {"type":"xfmr","mode":"down"|"up"|"ct"|"dc"} transformer with live waveforms. Turns np:ns; down 230→12 V rms (19.2:1). */
export const XfmrScene: React.FC<any> = ({ dur, mode = "down" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const dc = mode === "dc", up = mode === "up", ct = mode === "ct";
  const vp = up ? 12 : 230, vs = up ? 230 : 12; const np = up ? 50 : 960, ns = up ? 960 : 50;
  const s = Math.sin(t * 3); const fl = dc ? 0 : s;
  const coil = (x: number, n: number, col: string, y0 = 330) => <path d={`M ${x} ${y0} ` + Array.from({ length: n }, () => "a 22 22 0 1 0 0 44").join(" ")} fill="none" stroke={col} strokeWidth={6} />;
  const body = <g>
    <rect x={420} y={260} width={360} height={560} rx={10} fill="none" stroke="#8a96a3" strokeWidth={40} />
    {[0, 1, 2].map((k) => <rect key={k} x={430 + k * 4} y={270} width={2} height={540} fill="#6b7785" opacity={0.3} />)}
    {/* flux arrows in the core */}
    {!dc && Array.from({ length: 6 }, (_, k) => { const u = ((k / 6 + t * 0.4 * Math.sign(fl || 1)) % 1 + 1) % 1; const per = 2 * (360 + 560); let d = u * per, x = 420, y = 260;
      if (d < 360) { x = 420 + d; } else if (d < 920) { x = 780; y = 260 + d - 360; } else if (d < 1280) { x = 780 - (d - 920); y = 820; } else { y = 820 - (d - 1280); }
      return <circle key={k} cx={x} cy={y} r={8} fill={L.cyan} opacity={Math.abs(fl)} />; })}
    {coil(420, up ? 4 : 10, L.amber)}{ct ? <>{coil(780, 5, L.green)}{coil(780, 5, L.green, 550)}</> : coil(780, up ? 10 : 4, L.green)}
    <g><circle cx={150} cy={550} r={60} fill={L.bg0} stroke={dc ? L.red : L.cyan} strokeWidth={6} />
      {dc ? <text x={150} y={562} textAnchor="middle" {...T1} fontSize={30} fill={L.red}>DC</text> : <path d="M 116 550 q 17 -30 34 0 t 34 0" fill="none" stroke={L.cyan} strokeWidth={5} />}
      <text x={150} y={660} textAnchor="middle" {...T1} fontSize={26}>{vp} V {dc ? "DC" : "AC"}</text></g>
    {W(`150,490 150,330 420,330`)}{W(`150,610 150,${up ? 506 : 770} 420,${up ? 506 : 770}`)}
    <text x={340} y={240} textAnchor="middle" {...T1} fontSize={24} fill={L.amber}>primary {np} turns</text>
    {ct ? <g>{W("780,330 960,330")}{W("780,550 960,550")}{W("780,770 960,770")}<circle cx={960} cy={330} r={9} fill={L.green} /><circle cx={960} cy={550} r={9} fill={L.text} /><circle cx={960} cy={770} r={9} fill={L.green} />
        <text x={980} y={340} {...T1} fontSize={24} fill={L.green}>12 V</text><text x={980} y={560} {...T1} fontSize={24}>0 (centre tap)</text><text x={980} y={780} {...T1} fontSize={24} fill={L.green}>12 V</text></g>
      : <g>{W(`780,330 960,330`)}{W(`780,${up ? 770 : 506} 960,${up ? 770 : 506}`)}<text x={880} y={240} textAnchor="middle" {...T1} fontSize={24} fill={L.green}>secondary {ns} turns</text></g>}
  </g>;
  const GX = 1100, GW = 740;
  const tr = (cy: number, a: number, col: string, name: string) => { const q: string[] = []; for (let k = 0; k <= 200; k++) { const u = k / 200; q.push(`${GX + GW * u},${cy - a * Math.sin(2 * Math.PI * 2 * u + t * 3)}`); }
    return <g><line x1={GX} y1={cy} x2={GX + GW} y2={cy} stroke={L.dim} strokeWidth={2} /><text x={GX} y={cy - 120} fill={col} fontFamily={SANS} fontSize={26} fontWeight={800}>{name}</text><polyline points={q.join(" ")} fill="none" stroke={col} strokeWidth={5} /></g>; };
  const right = dc ? <g><text x={1470} y={300} textAnchor="middle" {...T1} fontSize={30} fill={L.red}>WHAT IF: DC INTO A TRANSFORMER?</text>
      <text x={1470} y={400} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>steady current → steady field → NO change</text>
      <text x={1470} y={460} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={28}>no change → no induced voltage → output 0 V</text>
      <text x={1470} y={540} textAnchor="middle" fill={L.red} fontFamily={SANS} fontSize={28} fontWeight={800}>and the primary is just copper wire:</text>
      <text x={1470} y={590} textAnchor="middle" fill={L.red} fontFamily={SANS} fontSize={28} fontWeight={800}>huge current → it overheats and burns</text></g>
    : <g>{tr(380, up ? 30 : 100, L.amber, `primary: ${vp} V rms`)}{tr(760, ct ? 60 : up ? 100 : 30, L.green, ct ? "each half: 12 V rms (opposite phases)" : `secondary: ${vs} V rms`)}
      <text x={GX + GW / 2} y={950} textAnchor="middle" {...T1} fontSize={28}>Vs ÷ Vp = Ns ÷ Np = {ns} ÷ {np}</text></g>;
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{body}{right}</svg></AbsoluteFill>;
};
ANALOG_SCENES.xfmr = XfmrScene;

/** {"type":"semi","mode":"lattice"|"pair"|"hole"|"ntype"|"ptype"|"junction"|"barrier"|"forward"|"reverse"} semiconductor physics, drawn as a crystal */
export const SemiScene: React.FC<any> = ({ dur, mode = "lattice" }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const atom = (x: number, y: number, lab = "Si", col = "#8a96a3") => <g><circle cx={x} cy={y} r={34} fill={col} /><text x={x} y={y + 9} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={24} fontWeight={800}>{lab}</text></g>;
  const grid = (x0: number, y0: number, nx: number, ny: number, sp: number, sub?: (i: number, j: number) => string | null, subCol?: string) => {
    const els: React.ReactNode[] = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const x = x0 + i * sp, y = y0 + j * sp;
      if (i < nx - 1) els.push(<g key={`h${i}${j}`}><line x1={x + 34} y1={y} x2={x + sp - 34} y2={y} stroke={L.wire} strokeWidth={3} /><circle cx={x + sp / 2 - 10} cy={y} r={6} fill={L.electron} /><circle cx={x + sp / 2 + 10} cy={y} r={6} fill={L.electron} /></g>);
      if (j < ny - 1) els.push(<g key={`v${i}${j}`}><line x1={x} y1={y + 34} x2={x} y2={y + sp - 34} stroke={L.wire} strokeWidth={3} /><circle cx={x} cy={y + sp / 2 - 10} r={6} fill={L.electron} /><circle cx={x} cy={y + sp / 2 + 10} r={6} fill={L.electron} /></g>);
      const s = sub?.(i, j); els.push(<g key={`a${i}${j}`}>{atom(x, y, s || "Si", s ? subCol : "#8a96a3")}</g>); }
    return <g>{els}</g>; };
  const right = (title: string, lines: string[]) => <g><text x={1440} y={250} textAnchor="middle" {...T1} fontSize={32}>{title}</text>
    {lines.map((l, k) => <text key={k} x={1100} y={350 + k * 70} fill={L.text} fontFamily={SANS} fontSize={28} fontWeight={600} opacity={interpolate(p, [k * 0.15, k * 0.15 + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>• {l}</text>)}</g>;
  let body: React.ReactNode;
  if (mode === "lattice") body = <g>{grid(200, 250, 5, 4, 170)}{right("PURE SILICON CRYSTAL", ["each Si atom has 4 outer electrons", "it shares them with 4 neighbours", "pairs of shared electrons = covalent bonds", "every electron is locked in a bond", "→ at 0 K: a perfect insulator"])}</g>;
  else if (mode === "pair" || mode === "hole") { const hx = 200 + 170 * Math.floor(((mode === "hole" ? p * 4 : 0)) % 4) + 85 - 10, hy = 420;
    const ex = mode === "pair" ? 200 + 170 + 85 - 10 + p * 500 : 0, ey = 420 - p * 160;
    body = <g>{grid(200, 250, 5, 4, 170)}
      {mode === "pair" && <g><circle cx={200 + 170 + 85 - 10} cy={420} r={14} fill="none" stroke={L.red} strokeWidth={4} /><circle cx={ex} cy={ey} r={10} fill={L.amber} />
        <text x={ex + 20} y={ey - 14} {...T1} fontSize={24} fill={L.amber}>free electron</text><text x={360} y={470} {...T1} fontSize={24} fill={L.red}>hole (+)</text>
        <text x={560} y={170} textAnchor="middle" {...T1} fontSize={26} fill={L.red}>heat breaks a bond</text></g>}
      {mode === "hole" && <g><circle cx={hx} cy={hy} r={14} fill="none" stroke={L.red} strokeWidth={4} /><text x={hx} y={hy + 50} textAnchor="middle" {...T1} fontSize={24} fill={L.red}>hole →</text>
        <text x={560} y={170} textAnchor="middle" {...T1} fontSize={26}>bonded electrons hop ← into the hole, so the hole moves →</text></g>}
      {right(mode === "pair" ? "ELECTRON-HOLE PAIR" : "HOLES MOVE TOO", mode === "pair" ? ["heat gives an electron enough energy to escape", "it leaves a gap in the bond: a HOLE", "a hole acts like a + charge", "electrons and holes are made in pairs", "hotter → more pairs → more current"]
        : ["a nearby bonded electron hops into the hole", "now the hole is where that electron was", "electrons hop one way, the hole moves the other", "so holes carry current like + charges", "intrinsic Si: equal electrons and holes"])}</g>; }
  else if (mode === "ntype" || mode === "ptype") { const n = mode === "ntype";
    body = <g>{grid(200, 250, 5, 4, 170, (i, j) => (i === 2 && j === 1) ? (n ? "P" : "B") : null, n ? "#2e5a87" : "#b5473a")}
      {n ? <g><circle cx={540 + 30 * Math.sin(t * 2) + p * 300} cy={360 - 40 * Math.cos(t * 2)} r={11} fill={L.amber} /><text x={600 + p * 300} y={320} {...T1} fontSize={24} fill={L.amber}>5th electron: FREE</text></g>
        : <g><circle cx={540 + 85 - 10} cy={420} r={14} fill="none" stroke={L.red} strokeWidth={4} /><text x={630} y={470} {...T1} fontSize={24} fill={L.red}>missing electron = hole</text></g>}
      {right(n ? "N-TYPE: ADD PHOSPHORUS" : "P-TYPE: ADD BORON", n ? ["phosphorus has 5 outer electrons", "4 bond, the 5th is loose: a free electron", "majority carriers: electrons", "minority carriers: a few holes", "the crystal is still neutral overall"]
        : ["boron has only 3 outer electrons", "one bond is missing an electron: a hole", "majority carriers: holes", "minority carriers: a few electrons", "the crystal is still neutral overall"])}</g>; }
  else { // junction, barrier, forward, reverse
    const W0 = mode === "junction" ? 40 + 140 * Math.min(1, p * 1.6) : mode === "forward" ? 60 * (1 - p) + 20 : mode === "reverse" ? 180 + 160 * p : 180;
    const mid = 560;
    body = <g><rect x={160} y={330} width={mid - 160} height={300} fill="#b5473a" opacity={0.85} /><rect x={mid} y={330} width={960 - mid} height={300} fill="#2e5a87" opacity={0.85} />
      <rect x={mid - W0 / 2} y={330} width={W0} height={300} fill="#e8eef4" />
      <text x={300} y={310} textAnchor="middle" {...T1} fontSize={30} fill={L.red}>P (holes)</text><text x={820} y={310} textAnchor="middle" {...T1} fontSize={30} fill={L.electron}>N (electrons)</text>
      <text x={mid} y={680} textAnchor="middle" {...T1} fontSize={24}>depletion region</text>
      {Array.from({ length: 16 }, (_, k) => { const x = 180 + ((k * 53 + t * (mode === "forward" ? 40 : 6)) % (mid - W0 / 2 - 200)); return <circle key={"h" + k} cx={x} cy={350 + (k * 37) % 260} r={10} fill="none" stroke="#fff" strokeWidth={3} />; })}
      {Array.from({ length: 16 }, (_, k) => { const x = 940 - ((k * 53 + t * (mode === "forward" ? 40 : 6)) % (960 - mid - W0 / 2 - 20)); return <circle key={"e" + k} cx={x} cy={350 + (k * 41) % 260} r={8} fill="#ffd24a" />; })}
      {Array.from({ length: Math.round(W0 / 30) }, (_, k) => <g key={"i" + k}><text x={mid - W0 / 2 + 8 + (k % 2) * 0} y={360 + k * 26} {...T1} fontSize={22} fill={L.red}>−</text>
        <text x={mid + W0 / 2 - 22} y={360 + k * 26} {...T1} fontSize={22} fill={L.electron}>+</text></g>)}
      {(mode === "forward" || mode === "reverse") && <g><line x1={160} y1={480} x2={80} y2={480} stroke={L.wire} strokeWidth={6} /><line x1={960} y1={480} x2={1040} y2={480} stroke={L.wire} strokeWidth={6} />
        <text x={100} y={450} textAnchor="middle" {...T1} fontSize={34} fill={mode === "forward" ? L.red : L.electron}>{mode === "forward" ? "+" : "−"}</text>
        <text x={1020} y={450} textAnchor="middle" {...T1} fontSize={34} fill={mode === "forward" ? L.electron : L.red}>{mode === "forward" ? "−" : "+"}</text></g>}
      {mode === "barrier" && <g><polyline points={`160,860 ${mid - W0 / 2},860 ${mid + W0 / 2},760 960,760`} fill="none" stroke={L.amber} strokeWidth={6} /><text x={mid + 120} y={740} {...T1} fontSize={26} fill={L.amber}>barrier ≈ 0.7 V (Si), 0.3 V (Ge)</text></g>}</g>;
    body = <g>{body}{right(mode === "junction" ? "FORMING THE PN JUNCTION" : mode === "barrier" ? "THE BARRIER POTENTIAL" : mode === "forward" ? "FORWARD BIAS: + TO P" : "REVERSE BIAS: + TO N",
      mode === "junction" ? ["electrons diffuse from N into P, holes from P into N", "they meet and cancel (recombine) at the boundary", "left behind: fixed − ions on P side, + ions on N side", "this zone has no free carriers: depletion region", "its field stops further diffusion"]
      : mode === "barrier" ? ["the ions create a built-in voltage", "silicon ≈ 0.7 V, germanium ≈ 0.3 V", "carriers need this much push to cross", "it's why a silicon diode drops 0.7 V", "hotter → barrier falls ≈ 2 mV per °C"]
      : mode === "forward" ? ["battery + pushes holes toward the junction", "battery − pushes electrons toward it", "the depletion region shrinks", "above 0.7 V the barrier is overcome", "big current flows: the diode is ON"]
      : ["battery + pulls electrons away from the junction", "battery − pulls holes away", "the depletion region gets WIDER", "almost no current: only a tiny leakage", "the diode is OFF"])}</g>; }
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{body}</svg></AbsoluteFill>;
};
ANALOG_SCENES.semi = SemiScene;

/** {"type":"diode","mode":"fwd"|"rev"|"iv"|"models"|"meter"|"and"|"or","v":5,"r":1000} */
export const DiodeScene: React.FC<any> = ({ dur, mode = "fwd", v = 5, r = 1000 }) => {
  const fr = useCurrentFrame(); const t = fr / 30;
  const p = interpolate(fr, [dur * 0.06, dur * 0.94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T1 = { fill: L.text, fontFamily: MONO, fontWeight: 700 } as const;
  const W = (pts: string) => <polyline points={pts} fill="none" stroke={L.wire} strokeWidth={6} strokeLinejoin="round" />;
  const D = (x: number, y: number, rot: number, on: boolean, s = 1) => <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}><rect x={-34} y={-34} width={68} height={68} fill={L.bg0} />
    <polygon points="-24,-28 -24,28 22,0" fill={on ? "rgba(46,196,160,0.35)" : L.bg0} stroke={on ? L.green : L.amber} strokeWidth={5} /><line x1={22} y1={-28} x2={22} y2={28} stroke={on ? L.green : L.amber} strokeWidth={6} /></g>;
  const row = (y: number, a: string, b: string, col: string) => <g><text x={1060} y={y} fill={L.dim} fontFamily={SANS} fontSize={30} fontWeight={700}>{a}</text><text x={1820} y={y} textAnchor="end" fill={col} fontFamily={MONO} fontSize={34} fontWeight={800}>{b}</text></g>;
  let body: React.ReactNode;
  if (mode === "fwd" || mode === "rev") { const f = mode === "fwd"; const I = f ? (v - 0.7) / r : 0;
    const loop = [[200, 540], [200, 260], [860, 260], [860, 820], [200, 820], [200, 540]];
    body = <g><Battery x={200} y={540} v={v} />{W("200,500 200,260 420,260")}{W("540,260 860,260 860,470")}<Res x={860} y={540} ohm={r} label="R" />{W("860,610 860,820 200,820 200,580")}
      {D(480, 260, f ? 0 : 180, f)}<text x={480} y={210} textAnchor="middle" {...T1} fontSize={24}>{f ? "anode → cathode" : "cathode ← anode"}</text>
      <text x={420} y={320} {...T1} fontSize={24} fill={L.red}>{f ? "A" : "K"}</text><text x={530} y={320} {...T1} fontSize={24} fill={L.electron}>{f ? "K" : "A"}</text>
      {f && <><Dots pts={loop} t={t} speed={90} gap={52} r={9} color={L.amber} /><Dots pts={[...loop].reverse()} t={t} speed={90} gap={52} r={8} color={L.electron} /></>}
      <text x={530} y={960} textAnchor="middle" {...T1} fontSize={28} fill={f ? L.green : L.red}>{f ? "FORWARD: P (anode) at +, diode ON" : "REVERSE: diode flipped, it BLOCKS"}</text>
      <text x={530} y={1010} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={22}>orange: conventional current · blue: electrons</text></g>;
    body = <g>{body}<text x={1440} y={250} textAnchor="middle" {...T1} fontSize={30}>{f ? "FORWARD BIASED" : "REVERSE BIASED"}</text>
      {row(350, "voltage across diode", f ? "0.7 V" : `${v} V`, L.amber)}{row(440, "voltage across R", f ? `${(v - 0.7).toFixed(1)} V` : "0 V", L.text)}{row(530, "current", f ? `${(I * 1000).toFixed(2)} mA` : "≈ 0 (nA leakage)", f ? L.green : L.red)}
      <text x={1440} y={680} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{f ? `I = (V − 0.7) ÷ R = (${v} − 0.7) ÷ ${r}` : "all the supply voltage sits across the diode"}</text></g>; }
  else if (mode === "iv" || mode === "models") { const X0 = 960, Y0 = 640, vx = (vv: number) => X0 + vv * 380, iy = (i: number) => Y0 - i * 40;
    const fwd = (vv: number) => vv < 0.55 ? 0 : Math.min(12, Math.pow((vv - 0.55) / 0.2, 2) * 2);
    const q: string[] = []; for (let k = 0; k <= 200; k++) { const vv = -2.2 + 3.2 * k / 200; if (mode === "iv" && k / 200 > p * 1.1) break; const i = vv >= 0 ? fwd(vv) : vv > -2 ? -0.15 : -0.15 - (-2 - vv) * 60; q.push(`${vx(vv)},${iy(i)}`); }
    body = mode === "iv" ? <g><text x={960} y={140} textAnchor="middle" {...T1} fontSize={32}>DIODE I-V CURVE</text>
      <line x1={120} y1={Y0} x2={1800} y2={Y0} stroke={L.dim} strokeWidth={3} /><line x1={X0} y1={1020} x2={X0} y2={160} stroke={L.dim} strokeWidth={3} />
      <polyline points={q.join(" ")} fill="none" stroke={L.green} strokeWidth={7} />
      <line x1={vx(0.7)} y1={Y0} x2={vx(0.7)} y2={200} stroke={L.amber} strokeDasharray="8 8" strokeWidth={3} /><text x={vx(0.7) + 12} y={220} {...T1} fontSize={26} fill={L.amber}>knee ≈ 0.7 V</text>
      <text x={vx(0.35)} y={Y0 + 50} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>0 to 0.6 V: almost nothing</text>
      <text x={vx(-1)} y={Y0 - 30} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={24}>reverse: tiny leakage (nA)</text>
      <text x={vx(-2) + 30} y={900} {...T1} fontSize={26} fill={L.red}>← breakdown: sudden big current</text>
      <text x={1780} y={Y0 + 40} textAnchor="end" fill={L.dim} fontFamily={MONO} fontSize={24}>V →</text><text x={X0 + 14} y={180} fill={L.dim} fontFamily={MONO} fontSize={24}>I ↑</text></g>
      : <g>{[["IDEAL", "a perfect switch: 0 V when ON", (u: number) => u > 0 ? `${150 + 0},${300 - u * 220}` : ""], ["PRACTICAL", "0.7 V drop, then vertical", null], ["COMPLETE", "0.7 V + bulk resistance rB", null]].map(([n, d], k) => {
          const x0 = 140 + k * 600; const g = (vv: number) => k === 0 ? (vv > 0 ? 1 : 0) : k === 1 ? (vv >= 0.7 ? 1 : 0) : (vv > 0.7 ? Math.min(1, (vv - 0.7) * 3) : 0);
          const pts: string[] = []; for (let j = 0; j <= 100; j++) { const vv = -0.5 + 1.5 * j / 100; const gi = g(vv); pts.push(`${x0 + 60 + j * 4},${720 - (k === 1 && vv >= 0.7 ? Math.min(1, (vv - 0.7) * 40) : gi) * 360}`); }
          return <g key={k}><text x={x0 + 260} y={250} textAnchor="middle" {...T1} fontSize={30}>{n as string}</text><text x={x0 + 260} y={290} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={22}>{d as string}</text>
            <line x1={x0 + 40} y1={720} x2={x0 + 480} y2={720} stroke={L.dim} strokeWidth={3} /><line x1={x0 + 60 + 0.5 / 1.5 * 400} y1={740} x2={x0 + 60 + 0.5 / 1.5 * 400} y2={330} stroke={L.dim} strokeWidth={3} />
            <polyline points={pts.join(" ")} fill="none" stroke={L.green} strokeWidth={6} /></g>; })}
        <text x={960} y={860} textAnchor="middle" {...T1} fontSize={28}>exam/placement default: PRACTICAL model, 0.7 V for silicon (0.3 V germanium)</text></g>; }
  else if (mode === "meter") { const f = p < 0.5;
    body = <g><rect x={240} y={260} width={360} height={560} rx={40} fill="#f2c200" stroke="#a88600" strokeWidth={6} /><rect x={290} y={310} width={260} height={130} rx={12} fill="#cfe3c8" />
      <text x={420} y={400} textAnchor="middle" fill="#123" fontFamily={MONO} fontSize={60} fontWeight={800}>{f ? "0.62" : "OL"}</text>
      <circle cx={420} cy={600} r={90} fill="#333" /><text x={420} y={612} textAnchor="middle" fill="#fff" fontFamily={MONO} fontSize={30}>→|</text>
      <path d={`M 340 820 C 340 900 700 900 ${f ? 780 : 1020} 600`} fill="none" stroke={L.red} strokeWidth={8} /><path d={`M 500 820 C 500 950 900 950 ${f ? 1020 : 780} 600`} fill="none" stroke="#222" strokeWidth={8} />
      <g transform="translate(900,600)"><rect x={-130} y={-30} width={260} height={60} rx={20} fill="#222" /><rect x={60} y={-30} width={22} height={60} fill="#ccc" /></g>
      <text x={900} y={540} textAnchor="middle" {...T1} fontSize={24}>stripe = cathode</text>
      <text x={900} y={720} textAnchor="middle" {...T1} fontSize={28} fill={f ? L.green : L.red}>{f ? "red on anode, black on cathode → 0.6-0.7: GOOD" : "reversed → OL (open): GOOD"}</text></g>;
    body = <g>{body}<text x={1500} y={300} textAnchor="middle" {...T1} fontSize={30}>TESTING A DIODE</text>
      {["forward: 0.5-0.8 V reading", "reverse: OL (no conduction)", "0 both ways: SHORTED (bad)", "OL both ways: OPEN (bad)"].map((l, k) => <text key={k} x={1200} y={400 + k * 70} fill={L.text} fontFamily={SANS} fontSize={28}>• {l}</text>)}</g>; }
  else { const and = mode === "and"; const a = ((t / 3) | 0) % 4; const A = (a & 1) ? 5 : 0, B = (a & 2) ? 5 : 0;
    const out = and ? Math.min(A, B) + (Math.min(A, B) ? 0 : 0.7) : Math.max(0, Math.max(A, B) - 0.7);
    body = <g>{and ? <g><line x1={200} y1={200} x2={900} y2={200} stroke={L.red} strokeWidth={6} /><text x={200} y={180} {...T1} fontSize={26} fill={L.red}>+5 V</text><Res x={700} y={300} ohm={10000} label="R" />{W("700,200 700,230")}{W("700,370 700,520 900,520")}</g>
        : <g><Res x={700} y={700} ohm={10000} label="R" />{W("700,520 700,630")}{W("700,770 700,880")}<line x1={200} y1={880} x2={900} y2={880} stroke={L.wire} strokeWidth={6} />{W("700,520 900,520")}</g>}
      {[[400, A, "A"], [640, B, "B"]].map(([y, val, n]: any, k) => <g key={k}><text x={160} y={y + 10} {...T1} fontSize={30} fill={val ? L.green : L.dim}>{n} = {val ? 1 : 0}</text>{W(`240,${y} 360,${y}`)}
        {D(420, y, and ? 180 : 0, and ? !val : !!val)}{W(`480,${y} 600,${y} 600,520 700,520`)}</g>)}
      <circle cx={900} cy={520} r={12} fill={out > 2.5 ? L.green : L.dim} /><text x={920} y={500} {...T1} fontSize={30} fill={out > 2.5 ? L.green : L.dim}>OUT = {out > 2.5 ? 1 : 0} ({out.toFixed(1)} V)</text></g>;
    body = <g>{body}<text x={1500} y={300} textAnchor="middle" {...T1} fontSize={30}>DIODE {and ? "AND" : "OR"} GATE</text>
      {[0, 1, 2, 3].map((k) => { const a1 = k & 1, b1 = (k >> 1) & 1; const o = and ? a1 & b1 : a1 | b1; return <text key={k} x={1300} y={400 + k * 60} {...T1} fontSize={30} fill={k === a ? L.amber : L.text}>A={a1} B={b1} → {o}</text>; })}
      <text x={1500} y={700} textAnchor="middle" fill={L.dim} fontFamily={SANS} fontSize={26}>{and ? "any input LOW pulls the output down through its diode" : "any input HIGH lifts the output through its diode"}</text></g>; }
  return <AbsoluteFill><svg viewBox="0 0 1920 1080" width="100%" height="100%">{body}</svg></AbsoluteFill>;
};
ANALOG_SCENES.diode = DiodeScene;
