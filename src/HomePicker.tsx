import React from 'react';
import {AbsoluteFill, Loop, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// Short "pick your home setup" reel: action hook -> 3+2 grid of moving tiles, each highlighted with its one-liner -> end.
type Tile = {clip: string; frames: number; name: string; line: string; digital?: boolean; y?: number; crop?: [number, number]; mark?: {x: number; y: number; label: string; dx?: number; dy?: number; track?: [number, number][]}; pip?: string; pipFrames?: number};
export type PickerContent = {
  series: string;
  hook: {clip: string; frames: number; dur: number; top: string; bottom: string; q?: string};
  title: string;
  intro: number; // seconds of grid before the first highlight
  per: number; // seconds per highlight
  tiles: Tile[];
  end: {dur: number; title: string; next: string; q: string};
};
export const pickerParts = (c: PickerContent) => {
  const hook = sec(c.hook.dur);
  const grid = sec(c.intro + c.per * c.tiles.length);
  const end = sec(c.end.dur);
  return {hook, grid, end, total: hook + grid + end};
};

const pop = (f: number, fps: number, d = 0) => spring({frame: f - d, fps, config: {damping: 15}});

const Hook: React.FC<{c: PickerContent}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const h = c.hook;
  const out = interpolate(f, [sec(h.dur) - 8, sec(h.dur)], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <Loop durationInFrames={h.frames}><OffthreadVideo src={staticFile(h.clip)} muted style={{width: 1080, height: 1920, objectFit: 'cover'}} /></Loop>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,15,14,.8) 0%, rgba(15,15,14,.2) 34%, rgba(15,15,14,0) 50%)'}} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 230, opacity: out}}>
        <div style={{display: 'inline-block', background: C.accent, borderRadius: 12, padding: '4px 18px 8px', fontSize: 36, fontWeight: 800, letterSpacing: 3}}>{c.series}</div>
        <div style={{fontSize: 88, fontWeight: 800, lineHeight: 1.03, letterSpacing: -1.6, marginTop: 20, textShadow: '0 2px 18px rgba(0,0,0,.6)'}}>{h.top}</div>
        <div style={{fontSize: 88, fontWeight: 800, lineHeight: 1.03, letterSpacing: -1.6, color: '#FFD9D4', opacity: pop(f, fps, 22), textShadow: '0 2px 18px rgba(0,0,0,.6)', whiteSpace: 'pre-line'}}>{h.bottom}</div>
        {h.q && <div style={{display: 'inline-block', marginTop: 34, opacity: pop(f, fps, 44), transform: `scale(${0.9 + 0.1 * pop(f, fps, 44)})`, transformOrigin: 'left center', background: C.accent, borderRadius: 16, padding: '8px 26px 12px', fontSize: 54, fontWeight: 800}}>{h.q}</div>}
      </div>
    </AbsoluteFill>
  );
};

const Grid: React.FC<{c: PickerContent}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t0 = sec(c.intro), per = sec(c.per);
  const k = Math.max(0, Math.min(c.tiles.length - 1, Math.floor((f - t0) / per)));
  const kStart = t0 + k * per;
  const hl = pop(f, fps, kStart);
  const cur = c.tiles[k];
  const p = pop(f, fps, 2);
  const TW = 150, GAP = (960 - 5 * TW) / 4;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: 60, right: 60, top: 200, opacity: p}}>
        <div style={{display: 'inline-block', background: C.accent, borderRadius: 12, padding: '4px 18px 8px', fontSize: 34, fontWeight: 800, letterSpacing: 3}}>{c.series}</div>
        <div style={{fontSize: 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.6, marginTop: 14, whiteSpace: 'pre-line'}}>{c.title}</div>
      </div>
      {/* thumbnail strip */}
      {c.tiles.map((t, i) => {
        const q = pop(f, fps, 2 + i * 3);
        const on = i === k;
        return (
          <div key={i} style={{position: 'absolute', left: 60 + i * (TW + GAP), top: 380, width: TW, height: TW, borderRadius: 18, overflow: 'hidden', opacity: q * (on ? 1 : 0.4), transform: `scale(${on ? 1 + 0.06 * hl : 0.94})`, border: on ? `5px solid ${C.accent}` : '5px solid transparent', boxSizing: 'border-box'}}>
            <Loop durationInFrames={t.frames}><OffthreadVideo src={staticFile(t.clip)} muted style={{width: TW, height: TW, objectFit: 'cover', objectPosition: `50% ${(t.y ?? 0.5) * 100}%`, display: 'block'}} /></Loop>
            <div style={{position: 'absolute', left: 6, bottom: 4, fontSize: 30, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,.8)'}}>{i + 1}</div>
          </div>
        );
      })}
      {/* big panel: shows source rows crop[0]..crop[1] so the gear stays in frame */}
      {(() => {
        const H = 820, TOP = 570;
        const [y0, y1] = cur.crop ?? [0, 1920];
        const sc = H / (y1 - y0);
        const vw = 1080 * sc, vh = 1920 * sc;
        const side = !!cur.pip && vw < 700;
        const w = Math.min(960, vw);
        const pipW = side ? Math.min(300, 1080 - 70 - w - 40 - 50) : 270;
        const left = side ? (1080 - (w + 40 + pipW)) / 2 : (1080 - w) / 2;
        return (
          <>
            <div key={'p' + k} style={{position: 'absolute', left, top: TOP, width: w, height: H, borderRadius: 30, overflow: 'hidden', opacity: hl, transform: `scale(${0.96 + 0.04 * hl})`, boxShadow: '0 20px 50px rgba(0,0,0,.6)'}}>
              <Sequence from={kStart}><OffthreadVideo src={staticFile(cur.clip)} muted style={{position: 'absolute', width: vw, height: vh, left: (w - vw) / 2, top: -y0 * sc}} /></Sequence>
              {cur.mark && (() => {
                const m = cur.mark;
                const mq = pop(f, fps, kStart + 14);
                const tp = m.track ? m.track[Math.max(0, Math.min(m.track.length - 1, f - kStart))] : [m.x, m.y];
                const cx = (w - vw) / 2 + tp[0] * sc, cy = (tp[1] - y0) * sc;
                const lx = cx + (m.dx ?? 0), ly = cy + (m.dy ?? -130);
                return (
                  <div style={{opacity: mq}}>
                    <svg width={w} height={H} style={{position: 'absolute', inset: 0}}>
                      <line x1={lx} y1={ly + 30} x2={cx + (lx - cx) * 0.35 * (2 - mq)} y2={cy + (ly + 30 - cy) * 0.35 * (2 - mq)} stroke={C.accent} strokeWidth={8} strokeLinecap="round" />
                      <circle cx={cx} cy={cy} r={46} fill="none" stroke={C.accent} strokeWidth={7} />
                    </svg>
                    <div style={{position: 'absolute', left: lx, top: ly, transform: 'translate(-50%, -50%)', background: C.accent, borderRadius: 12, padding: '4px 16px 8px', fontSize: 36, fontWeight: 800, whiteSpace: 'nowrap'}}>{m.label}</div>
                  </div>
                );
              })()}
              <div style={{position: 'absolute', left: 16, top: 16, background: cur.digital ? C.accent : C.ink, color: cur.digital ? C.ink : C.bg, borderRadius: 10, padding: '2px 14px 6px', fontSize: 30, fontWeight: 800, letterSpacing: 2}}>{cur.digital ? 'DIGITAL' : 'ANALOG'}</div>
            </div>
            {cur.pip && (
              <div key={'q' + k} style={{position: 'absolute', left: side ? left + w + 40 : left + w - pipW - 20, top: side ? TOP + (H - pipW * 2.2) / 2 : TOP + 20, width: pipW, borderRadius: 26, overflow: 'hidden', border: '5px solid #0b0b0b', boxShadow: '0 12px 30px rgba(0,0,0,.6)', opacity: pop(f, fps, kStart + 6)}}>
                <Sequence from={kStart} layout="none"><OffthreadVideo src={staticFile(cur.pip)} muted style={{width: pipW, display: 'block'}} /></Sequence>
              </div>
            )}
          </>
        );
      })()}
      <div key={'c' + k} style={{position: 'absolute', left: 60, right: 60, top: 1420, opacity: hl, transform: `translateY(${(1 - hl) * 24}px)`}}>
        <div style={{fontSize: 46, fontWeight: 800, color: '#FF6A5C', letterSpacing: 0.5}}>{k + 1}/{c.tiles.length} · {cur.name.replace(/\n/g, ' ')}</div>
        <div style={{fontSize: 62, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1, marginTop: 10, whiteSpace: 'pre-line'}}>{cur.line}</div>
      </div>
    </AbsoluteFill>
  );
};

const End: React.FC<{c: PickerContent}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT, color: C.ink, padding: '0 80px', justifyContent: 'center'}}>
      <div style={{opacity: pop(f, fps, 2), fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{c.end.title}</div>
      <div style={{opacity: pop(f, fps, 16), fontSize: 52, fontWeight: 700, color: '#D6D2CA', marginTop: 28, whiteSpace: 'pre-line'}}>{c.end.next}</div>
      <div style={{opacity: pop(f, fps, 34), marginTop: 60, alignSelf: 'flex-start', background: C.accent, borderRadius: 18, padding: '12px 30px 16px', fontSize: 64, fontWeight: 800}}>{c.end.q}</div>
    </AbsoluteFill>
  );
};

export const HomePicker: React.FC<{content: PickerContent}> = ({content: c}) => {
  const p = pickerParts(c);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={0} durationInFrames={p.hook}><Hook c={c} /></Sequence>
      <Sequence from={p.hook} durationInFrames={p.grid}><Grid c={c} /></Sequence>
      <Sequence from={p.hook + p.grid} durationInFrames={p.end}><End c={c} /></Sequence>
    </AbsoluteFill>
  );
};
