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
