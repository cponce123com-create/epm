// Versión móvil del home — encajada en IOSDevice frame.
// Mantiene la identidad de la dirección A pero adaptada a viewport pequeño.

function EpmMobileHome() {
  const accent = '#7A1F1F';
  const accent2 = '#3d1010';
  const bg = '#f4f0e7';
  const card = '#ffffff';
  const ink = '#15140f';
  const ink2 = '#5a564e';
  const headerBg = '#15140f';
  const headerInk = '#f4f0e7';
  const border = '#d6cfbf';
  const displayFont = '"DM Serif Display", Georgia, serif';

  const Crest = ({size=30, color}) => (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="29" stroke={color} strokeWidth="1"/>
      <path d="M14 22l5-7 4 5 4-8 4 8 4-5 5 7v4H14v-4z" fill={color}/>
      <rect x="14" y="28" width="32" height="1" fill={color}/>
      <text x="30" y="46" textAnchor="middle" fill={color}
        fontFamily="'DM Serif Display', serif" fontSize="14" fontWeight="700"
        fontStyle="italic">P</text>
    </svg>
  );

  return (
    <div style={{ background:bg, color:ink, fontFamily:'"Source Serif 4", Georgia, serif', minHeight:'100%', overflowY:'auto' }}>
      {/* Header móvil */}
      <header style={{
        background:headerBg, color:headerInk,
        padding:'14px 16px 16px', position:'sticky', top:0, zIndex:5,
        borderBottom:`3px solid ${accent}`,
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <button style={{
            background:'transparent',border:'none',color:headerInk,padding:6,cursor:'pointer',
            display:'flex',alignItems:'center',gap:6,
          }}>
            <Icon.Menu size={20} color={headerInk}/>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Crest size={22} color={accent}/>
            <span style={{fontFamily:displayFont,fontSize:18,fontWeight:400,letterSpacing:'-.005em'}}>El Príncipe Mestizo</span>
          </div>
          <button style={{
            background:'transparent',border:'none',color:headerInk,padding:6,cursor:'pointer',
          }}>
            <Icon.Search size={18} color={headerInk}/>
          </button>
        </div>
        <div className="epm-mono" style={{
          fontSize:9, letterSpacing:'.16em', textTransform:'uppercase',
          opacity:.6, textAlign:'center',
        }}>
          MIÉR · 29 ABR · ED. 318 · SAN RAMÓN
        </div>
      </header>

      {/* Breaking ticker */}
      <div style={{
        background:accent, color:'#fff',
        display:'flex',alignItems:'center',overflow:'hidden',
      }}>
        <div className="epm-mono" style={{
          background:accent2, padding:'8px 11px',
          fontSize:9, letterSpacing:'.16em', flexShrink:0,
        }}>● ÚLTIMA HORA</div>
        <div style={{flex:1,overflow:'hidden'}}>
          <div className="epm-tick epm-mono" style={{
            display:'flex',gap:36,whiteSpace:'nowrap',padding:'8px 0',fontSize:11,letterSpacing:'.04em',
          }}>
            {[...BREAKING,...BREAKING].map((b,i)=>(<span key={i}>● {b}</span>))}
          </div>
        </div>
      </div>

      {/* HERO móvil */}
      <article style={{position:'relative'}}>
        <EpmImagePlaceholder
          label="cover · obra paralizada"
          tone="rust"
          ratio="4/3"
        />
        <div style={{
          position:'absolute',inset:0,
          background:`linear-gradient(180deg, transparent 0%, transparent 35%, rgba(0,0,0,.7) 75%, rgba(0,0,0,.95) 100%)`,
        }}/>
        <div style={{
          position:'absolute',left:0,right:0,bottom:0,padding:'16px 18px 20px',color:'#fff',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span className="epm-mono" style={{
              background:accent,color:'#fff',padding:'4px 8px',fontSize:9,letterSpacing:'.18em',fontWeight:700,
            }}>{FEATURED.tag||'EXCLUSIVO'}</span>
            <span className="epm-mono" style={{
              fontSize:9,letterSpacing:'.16em',textTransform:'uppercase',opacity:.92,
            }}>{FEATURED.cat}</span>
          </div>
          <h1 style={{
            fontFamily:displayFont,fontWeight:400,
            fontSize:26,lineHeight:1.1,letterSpacing:'-.01em',
            margin:'0 0 10px',color:'#fff',
          }} className="clamp-4">{FEATURED.title}</h1>
          <div style={{width:40,height:2,background:accent,marginBottom:10}}/>
          <p style={{fontSize:13,lineHeight:1.5,opacity:.9,margin:0,fontStyle:'italic',
            fontFamily:'"Libre Baskerville",Georgia,serif',
          }} className="clamp-3">{FEATURED.summary}</p>
          <div className="epm-mono" style={{
            fontSize:9,opacity:.7,letterSpacing:'.06em',marginTop:12,display:'flex',gap:10,
          }}>
            <span>{FEATURED.date}</span>
            <span>·</span>
            <span>{FEATURED.read} min</span>
          </div>
        </div>
      </article>

      {/* Categorías scroll horizontal */}
      <div style={{
        display:'flex',gap:8,overflow:'auto',padding:'14px 16px',
        background:card, borderBottom:`1px solid ${border}`,
        scrollbarWidth:'none',
      }}>
        {['Todo',...CATEGORIES.map(c=>c.name)].map((c,i)=>(
          <button key={c} style={{
            background:i===0?ink:'transparent',color:i===0?bg:ink,
            border:`1px solid ${i===0?ink:border}`,
            padding:'7px 13px',fontSize:11,whiteSpace:'nowrap',cursor:'pointer',
            fontFamily:'"DM Sans",sans-serif',fontWeight:500,
          }}>{c}</button>
        ))}
      </div>

      {/* Sub-featured + lista */}
      <section style={{padding:'18px 16px'}}>
        <div className="epm-mono" style={{
          fontSize:10,letterSpacing:'.2em',textTransform:'uppercase',
          color:ink,marginBottom:12,paddingBottom:8,borderBottom:`2px solid ${ink}`,
          display:'flex',justifyContent:'space-between',alignItems:'center',
        }}>
          <span>Últimas entregas</span>
          <span style={{color:ink2,fontSize:9}}>{LATEST.length} notas</span>
        </div>

        {/* Lead horizontal */}
        <article style={{
          background:card, marginBottom:14,
          borderTop:`3px solid ${SUB_FEATURED[0].catColor}`,
        }}>
          <EpmImagePlaceholder label={`foto · ${SUB_FEATURED[0].cat.toLowerCase()}`} tone="cool" ratio="16/9"/>
          <div style={{padding:'12px 14px 14px'}}>
            <div className="epm-mono" style={{
              fontSize:9,letterSpacing:'.16em',textTransform:'uppercase',
              color:SUB_FEATURED[0].catColor,marginBottom:8,fontWeight:700,
            }}>{SUB_FEATURED[0].cat}</div>
            <h3 style={{
              fontFamily:displayFont,fontWeight:400,fontSize:18,
              lineHeight:1.2,margin:'0 0 8px',color:ink,
            }} className="clamp-3">{SUB_FEATURED[0].title}</h3>
            <p style={{fontSize:12.5,lineHeight:1.5,color:ink2,margin:'0 0 10px'}} className="clamp-2">
              {SUB_FEATURED[0].summary}
            </p>
            <div className="epm-mono" style={{fontSize:9,color:ink2,letterSpacing:'.06em',display:'flex',gap:8}}>
              <span>{SUB_FEATURED[0].date}</span><span>·</span><span>{SUB_FEATURED[0].read} min</span>
            </div>
          </div>
        </article>

        {/* Lista compacta */}
        {LATEST.slice(1,4).map(a => (
          <article key={a.id} style={{
            display:'grid',gridTemplateColumns:'1fr 96px',gap:12,
            padding:'14px 0',borderBottom:`1px solid ${border}`,
          }}>
            <div>
              <div className="epm-mono" style={{
                fontSize:9,letterSpacing:'.16em',textTransform:'uppercase',
                color:a.catColor,marginBottom:6,fontWeight:700,
              }}>{a.cat}</div>
              <h4 style={{
                fontFamily:displayFont,fontWeight:400,fontSize:15,
                lineHeight:1.2,margin:'0 0 6px',color:ink,
              }} className="clamp-3">{a.title}</h4>
              <div className="epm-mono" style={{fontSize:9,color:ink2,letterSpacing:'.06em',display:'flex',gap:8}}>
                <span>{a.date}</span>
                <span>·</span>
                <span>{a.read} min</span>
              </div>
            </div>
            <EpmImagePlaceholder label={a.cat.toLowerCase()} tone="warm" ratio="1/1"/>
          </article>
        ))}
      </section>

      {/* Ad horizontal móvil */}
      <div style={{padding:'4px 16px 18px'}}>
        <EpmAdSlot format="horizontal"/>
      </div>

      {/* Pódcast móvil */}
      <section style={{
        background:headerBg,color:headerInk,padding:'18px 16px',
      }}>
        <div className="epm-mono" style={{
          fontSize:9,letterSpacing:'.22em',color:accent,fontWeight:700,marginBottom:10,
          display:'flex',alignItems:'center',gap:6,
        }}>
          <Icon.Mic size={11} color={accent}/> PÓDCAST · {PODCAST.ep}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 96px',gap:14,alignItems:'center'}}>
          <div>
            <h3 style={{
              fontFamily:displayFont,fontWeight:400,fontSize:18,
              lineHeight:1.2,margin:'0 0 8px',
            }} className="clamp-3">{PODCAST.title}</h3>
            <div className="epm-mono" style={{fontSize:9,opacity:.7,letterSpacing:'.06em'}}>
              {PODCAST.duration} · {PODCAST.date}
            </div>
          </div>
          <div style={{position:'relative'}}>
            <EpmImagePlaceholder label="ep.12" tone="dark" ratio="1/1"/>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <button style={{
                width:38,height:38,borderRadius:'50%',background:accent,
                border:'none',color:'#fff',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',paddingLeft:3,
              }}><Icon.Play size={16} color="#fff"/></button>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter móvil */}
      <section style={{padding:'22px 16px',background:card,borderTop:`1px solid ${border}`,borderBottom:`1px solid ${border}`}}>
        <div className="epm-mono" style={{
          fontSize:9,letterSpacing:'.22em',color:accent,fontWeight:700,marginBottom:8,
          display:'flex',alignItems:'center',gap:6,
        }}><Icon.Mail size={11} color={accent}/> BOLETÍN SEMANAL</div>
        <h4 style={{
          fontFamily:displayFont,fontWeight:400,fontSize:19,
          margin:'0 0 8px',lineHeight:1.2,color:ink,
        }}>Los miércoles a las 7 a.m.</h4>
        <p style={{fontSize:12.5,lineHeight:1.5,color:ink2,margin:'0 0 12px'}}>
          Una crónica corta y los datos verificados de la semana.
        </p>
        <div style={{display:'flex',gap:6}}>
          <input placeholder="tu correo" style={{
            flex:1,background:bg,border:`1px solid ${border}`,
            padding:'9px 11px',fontSize:12,outline:'none',
            fontFamily:'"DM Sans",sans-serif',color:ink,
          }}/>
          <button style={{
            background:accent,color:'#fff',border:'none',padding:'9px 14px',
            fontSize:11,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer',
            fontFamily:'"DM Sans",sans-serif',
          }}>Suscribir</button>
        </div>
      </section>

      {/* Footer móvil */}
      <footer style={{
        background:headerBg,color:headerInk,padding:'24px 16px 28px',textAlign:'center',
      }}>
        <Crest size={36} color={accent}/>
        <div style={{fontFamily:displayFont,fontWeight:400,fontSize:20,marginTop:10}}>
          El Príncipe Mestizo
        </div>
        <p style={{fontSize:11.5,lineHeight:1.55,opacity:.65,margin:'10px auto 16px',maxWidth:280}}>
          Periodismo ciudadano independiente desde San Ramón, Chanchamayo.
        </p>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:18}}>
          {['X','FB','IG','YT','RSS'].map(s=>(
            <div key={s} className="epm-mono" style={{
              width:30,height:30,border:`1px solid ${headerInk}30`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:9,letterSpacing:'.04em',
            }}>{s}</div>
          ))}
        </div>
        <div className="epm-italic" style={{
          fontSize:12,opacity:.7,fontStyle:'italic',
          fontFamily:'"Libre Baskerville",Georgia,serif',
        }}>
          "La verdad no necesita permiso para existir."
        </div>
      </footer>
    </div>
  );
}

window.EpmMobileHome = EpmMobileHome;
