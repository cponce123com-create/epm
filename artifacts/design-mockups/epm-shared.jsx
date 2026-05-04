// Shared components: image placeholder, ad slot, icons.

function EpmImagePlaceholder({ label='cover', tone='warm', ratio='16/9', children, style }) {
  // Subtly-striped placeholder with mono caption explaining what should drop in.
  const palette = {
    warm:  { bg:'#e8e1d4', stripe:'#ddd3c0', ink:'#7a6a52' },
    cool:  { bg:'#dee2e8', stripe:'#cfd5dd', ink:'#5a6470' },
    dark:  { bg:'#2a2a28', stripe:'#34342f', ink:'#a8a195' },
    rust:  { bg:'#e6d6cf', stripe:'#d9c4b9', ink:'#7a4a3a' },
  }[tone] || { bg:'#e8e1d4', stripe:'#ddd3c0', ink:'#7a6a52' };
  return (
    <div style={{
      position:'relative',
      width:'100%',
      aspectRatio: ratio,
      background:`repeating-linear-gradient(135deg, ${palette.bg} 0 12px, ${palette.stripe} 12px 13px)`,
      display:'flex',alignItems:'center',justifyContent:'center',
      overflow:'hidden',
      ...style,
    }}>
      <div className="epm-mono" style={{
        fontSize:11, color:palette.ink, textTransform:'uppercase',
        background:'rgba(255,255,255,0.55)', padding:'4px 10px',
        border:`1px solid ${palette.ink}33`, letterSpacing:'.08em',
      }}>{`▌ ${label}`}</div>
      {children}
    </div>
  );
}

function EpmAdSlot({ format='rectangle', label='Espacio publicitario', tone='light' }) {
  const sizes = {
    horizontal: { w:'100%', h:90, ratio:null },
    rectangle:  { w:'100%', h:null, ratio:'4/3' },
    vertical:   { w:'100%', h:null, ratio:'1/2.5' },
    leaderboard:{ w:'100%', h:120, ratio:null },
  }[format] || { w:'100%', h:120 };
  const dark = tone === 'dark';
  return (
    <div style={{
      width:sizes.w, height:sizes.h||'auto', aspectRatio:sizes.ratio||'auto',
      border:`1px dashed ${dark?'#5a5a55':'#b8b0a0'}`,
      background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.015)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:6, padding:'14px 12px',
    }}>
      <div className="epm-mono" style={{
        fontSize:10,letterSpacing:'.18em',
        color:dark?'#9a948a':'#8a8275',textTransform:'uppercase',
      }}>Espacio publicitario</div>
      <div className="epm-mono" style={{fontSize:9,color:dark?'#6a655d':'#a8a095'}}>
        {format} · ad slot
      </div>
    </div>
  );
}

// Tiny icon set
const Icon = {
  Search: ({size=16,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
  ),
  Menu: ({size=18,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  ),
  Clock: ({size=12,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  ),
  Eye: ({size=12,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  Play: ({size=14,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M7 5v14l12-7z"/></svg>
  ),
  Mic: ({size=14,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
  ),
  Mail: ({size=14,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3 7 9 6 9-6"/></svg>
  ),
  Arrow: ({size=14,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
  ),
  ChevronDown: ({size=12,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path d="m6 9 6 6 6-6"/></svg>
  ),
  Flame: ({size=12,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5 1 1 2 1 3-4Z"/></svg>
  ),
};

Object.assign(window, { EpmImagePlaceholder, EpmAdSlot, Icon });
