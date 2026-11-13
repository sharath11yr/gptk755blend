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

export const ANALOG_SCENES: Record<string, React.FC<any>> = { coil: CoilScene, rl: RLScene, rc: RCScene, capgeom: CapGeom, resistor: ResistorScene, bars: ValueBars, atom: AtomScene, water: WaterTank, dc: DCCircuit, inside: InsideWire, ohm: OhmGraph, numerical: Numerical };
