// Dirección 1 v2 — "Edición impresa" PULIDA
// Cambios: nuevo acento granate (#7A1F1F), DM Serif Display como display
// con GFS Didot opcional, hero más grande e impactante, escudo en masthead.

function EpmDirection1({ tweaks }) {
  const t = tweaks || {};
  const palette = {
    paper: { bg:'#f4f0e7', card:'#ffffff', ink:'#15140f', ink2:'#5a564e', accent:'#7A1F1F', accent2:'#3d1010', border:'#d6cfbf', headerBg:'#15140f', headerInk:'#f4f0e7' },
    sepia: { bg:'#ede2cd', card:'#f7eed7', ink:'#2a1f12', ink2:'#6b5a3e', accent:'#6b2618', accent2:'#3a1208', border:'#c9b994', headerBg:'#2a1f12', headerInk:'#ede2cd' },
    dark:  { bg:'#15151a', card:'#1d1d22', ink:'#ece8df', ink2:'#9a958a', accent:'#C04030', accent2:'#7a1f1f', border:'#2e2e34', headerBg:'#0c0c0e', headerInk:'#ece8df' },
  }[t.palette || 'paper'];
  const showSidebar = t.sidebar !== false;
  const display = t.display || 'dmserif';
  const displayFont =
    display === 'didot'    ? '"GFS Didot", Didot, "Bodoni 72", Georgia, serif' :
    display === 'playfair' ? '"Playfair Display", Georgia, serif' :
    display === 'libre'    ? '"Libre Baskerville", Georgia, serif' :
                             '"DM Serif Display", "Playfair Display", Georgia, serif';

  const W = 1280;

  // SVG escudo del Príncipe (corona estilizada + monograma)
  const Crest = ({size=46, color}) => (
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
    <div style={{ width:W, background:palette.bg, color:palette.ink, fontFamily:'"Source Serif 4", Georgia, serif' }}>
      {/* TOP STRIP */}
      <div className="epm-mono" style={{
        background:palette.headerBg, color:palette.headerInk,
        fontSize:11, letterSpacing:'.12em', textTransform:'uppercase',
        display:'flex',justifyContent:'space-between',alignItems:'center',
        padding:'9px 36px', borderBottom:`1px solid ${palette.accent}`,
      }}>
        <span>Miércoles · 29 de abril, 2026 · Edición Nº 318 · Año V</span>
        <span style={{display:'flex',gap:22}}>
          <span>San Ramón · 26°C · Nubes dispersas</span>
          <span>USD/PEN · 3.71</span>
          <span style={{color:palette.accent,display:'inline-flex',alignItems:'center',gap:6}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:palette.accent,display:'inline-block'}}/>
            EN VIVO
          </span>
        </span>
      </div>

      {/* MASTHEAD */}
      <header style={{
        background:palette.headerBg, color:palette.headerInk,
        padding:'28px 36px 32px', borderBottom:`4px double ${palette.accent}`,
        position:'relative',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
          <div style={{display:'flex',alignItems:'center',gap:14, flex:'0 0 auto', minWidth:200}}>
            <button style={{
              background:'transparent',border:`1px solid ${palette.headerInk}40`,
              color:palette.headerInk, padding:'10px 14px', cursor:'pointer',
              display:'flex',alignItems:'center',gap:8,
            }} className="epm-mono">
              <Icon.Menu size={16} color={palette.headerInk} />
              <span style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase'}}>Secciones</span>
            </button>
            <button style={{
              background:'transparent',border:'none',color:palette.headerInk,
              cursor:'pointer',padding:8,display:'flex',alignItems:'center',gap:8,
            }} className="epm-mono">
              <Icon.Search size={16} color={palette.headerInk} />
            </button>
          </div>

          <div style={{textAlign:'center',flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:18}}>
            <Crest size={54} color={palette.accent}/>
            <div>
              <div style={{
                fontFamily:displayFont, fontWeight: display==='dmserif'?400:900,
                fontSize:72, lineHeight:.95, letterSpacing:'-.012em',
                fontStyle: display==='didot'?'normal':'normal',
              }}>
                El Príncipe Mestizo
              </div>
              <div className="epm-mono" style={{
                fontSize:10, letterSpacing:'.36em', textTransform:'uppercase',
                marginTop:10, color:palette.headerInk, opacity:.7,
              }}>
                Periodismo ciudadano · San Ramón · Chanchamayo · Perú
              </div>
            </div>
            <Crest size={54} color={palette.accent}/>
          </div>

          <div style={{display:'flex',gap:10, flex:'0 0 auto', minWidth:200, justifyContent:'flex-end'}} className="epm-ui">
            <button style={{
              background:'transparent',border:`1px solid ${palette.headerInk}40`,
              color:palette.headerInk,padding:'10px 14px',cursor:'pointer',fontSize:12,
            }}>Iniciar sesión</button>
            <button style={{
              background:palette.accent,border:'none',color:'#fff',
              padding:'10px 16px',cursor:'pointer',fontSize:12,fontWeight:600,
            }}>Apoyar →</button>
          </div>
        </div>

        <nav style={{
          display:'flex',justifyContent:'center',gap:36,
          marginTop:24, paddingTop:20, borderTop:`1px solid ${palette.headerInk}22`,
        }} className="epm-ui">
          {['Inicio','Denuncia','Investigación','Opinión','Ciudad','Política','Pódcast','Acerca de'].map((l,i)=>(
            <a key={l} className="epm-navlink" style={{
              color:palette.headerInk, textDecoration:'none', fontSize:13,
              letterSpacing:'.04em', fontWeight: i===0?700:500,
              opacity: i===0?1:.85,
            }}>{l}</a>
          ))}
        </nav>
      </header>

      {/* TICKER */}
      <div style={{
        background:palette.accent, color:'#fff',
        display:'flex',alignItems:'center',overflow:'hidden',
        borderBottom:`1px solid ${palette.border}`,
      }}>
        <div className="epm-mono" style={{
          background:palette.accent2, padding:'11px 18px',
          fontSize:11, letterSpacing:'.18em', flexShrink:0,
          display:'flex',alignItems:'center',gap:8,
        }}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#fff',
            boxShadow:'0 0 8px #fff'}}/> ÚLTIMA HORA
        </div>
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          <div className="epm-tick epm-mono" style={{
            display:'flex',gap:48,whiteSpace:'nowrap',padding:'11px 0',fontSize:12,letterSpacing:'.06em',
          }}>
            {[...BREAKING,...BREAKING].map((b,i)=>(
              <span key={i}>● {b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* HERO — split: gran portada izquierda + 3 recomendados derecha */}
      <section style={{
        display:'grid',
        gridTemplateColumns:'1fr 360px',
        height:680,
        borderBottom:`1px solid ${palette.border}`,
      }}>
        {/* IZQUIERDA — portada gigante con foto + overlay */}
        <div style={{position:'relative',overflow:'hidden'}}>
          <EpmImagePlaceholder
            label="cover · obra paralizada · malecón tarso"
            tone={t.palette==='dark'?'dark':'rust'}
            ratio={null}
            style={{height:'100%',aspectRatio:'auto'}}
          />
          <div style={{
            position:'absolute',inset:0,
            background:`linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.15) 28%, rgba(0,0,0,.55) 62%, rgba(0,0,0,.92) 100%)`,
          }}/>
          {/* decorative side rules */}
          <div style={{position:'absolute',left:36,top:36,bottom:36,width:1,background:'rgba(255,255,255,.18)'}}/>
          <div style={{position:'absolute',right:24,top:36,bottom:36,width:1,background:'rgba(255,255,255,.18)'}}/>

          <div style={{
            position:'absolute',left:0,right:0,bottom:0,
            padding:'44px 56px 48px',color:'#fff',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
              <span className="epm-mono" style={{
                background:palette.accent,color:'#fff',padding:'7px 13px',
                fontSize:11,letterSpacing:'.22em',fontWeight:700,
              }}>{FEATURED.tag||'EXCLUSIVO'}</span>
              <span className="epm-mono" style={{
                fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'#fff',opacity:.95,
                paddingLeft:14, borderLeft:'1px solid rgba(255,255,255,.4)',
              }}>{FEATURED.cat} · Portada</span>
            </div>

            <h1 style={{
              fontFamily:displayFont, fontWeight: display==='dmserif'?400:900,
              fontSize:64,lineHeight:1.02,letterSpacing:'-.014em',
              margin:'0 0 22px',color:'#fff',
              textShadow:'0 2px 24px rgba(0,0,0,.4)',
            }}>{FEATURED.title}</h1>

            <div style={{
              width:80, height:3, background:palette.accent, marginBottom:20,
            }}/>

            <p className="epm-italic clamp-3" style={{
              fontSize:19, lineHeight:1.5, color:'#fff', opacity:.94,
              margin:'0 0 24px',maxWidth:720,fontStyle:'italic',
              fontFamily:'"Libre Baskerville", Georgia, serif',
            }}>{FEATURED.summary}</p>

            <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
              <button style={{
                background:'#fff',color:palette.accent2,
                border:'none', padding:'13px 24px', cursor:'pointer',
                fontFamily:'"DM Sans", sans-serif', fontWeight:700,fontSize:12,
                letterSpacing:'.08em', textTransform:'uppercase',
                display:'inline-flex',alignItems:'center',gap:10,
              }}>Leer la nota completa <Icon.Arrow size={13} color={palette.accent2}/></button>

              <div className="epm-mono" style={{
                display:'flex',gap:14,fontSize:11,color:'#fff',opacity:.85,
                letterSpacing:'.06em',flexWrap:'wrap',
              }}>
                <span>POR {FEATURED.author.toUpperCase()}</span>
                <span>·</span>
                <span>{FEATURED.date}</span>
                <span>·</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                  <Icon.Clock size={11} color="#fff"/> {FEATURED.read} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DERECHA — riel de 3 recomendados */}
        <aside style={{
          background: t.palette==='dark' ? '#0e0e0c' : palette.accent2,
          color:'#fff',
          display:'flex',flexDirection:'column',
        }}>
          <div style={{
            padding:'22px 28px 16px',
            borderBottom:'1px solid rgba(255,255,255,.14)',
            display:'flex',alignItems:'baseline',justifyContent:'space-between',
          }}>
            <span className="epm-mono" style={{
              fontSize:11,letterSpacing:'.24em',fontWeight:700,color:palette.accent,
            }}>RECOMENDADOS</span>
            <span className="epm-mono" style={{
              fontSize:9,letterSpacing:'.16em',opacity:.5,
            }}>SELECCIÓN DEL EDITOR</span>
          </div>

          {LATEST.slice(0,3).map((a, idx) => (
            <a key={a.id} className="epm-rec" style={{
              flex:1,
              display:'grid',gridTemplateColumns:'1fr 96px',gap:18,
              padding:'22px 28px',
              borderBottom: idx<2 ? '1px solid rgba(255,255,255,.12)' : 'none',
              color:'#fff',textDecoration:'none',cursor:'pointer',
              alignItems:'center',
              transition:'background .2s ease',
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span className="epm-mono" style={{
                    fontSize:9,letterSpacing:'.18em',fontWeight:700,
                    color:palette.accent,
                  }}>0{idx+1}</span>
                  <span className="epm-mono" style={{
                    fontSize:9,letterSpacing:'.16em',textTransform:'uppercase',
                    color:'#fff',opacity:.7,
                  }}>{a.cat}</span>
                </div>
                <h3 style={{
                  fontFamily:displayFont,
                  fontWeight: display==='dmserif'?400:700,
                  fontSize:18,lineHeight:1.2,letterSpacing:'-.005em',
                  margin:'0 0 10px',color:'#fff',
                }} className="clamp-3">{a.title}</h3>
                <div className="epm-mono" style={{
                  fontSize:9,letterSpacing:'.08em',opacity:.55,
                  display:'flex',gap:8,
                }}>
                  <span>{a.date}</span>
                  <span>·</span>
                  <span>{a.read} min</span>
                </div>
              </div>
              <div style={{width:96,height:96,flexShrink:0}}>
                <EpmImagePlaceholder
                  label={a.cat.toLowerCase()}
                  tone={idx===0?'warm':idx===1?'cool':'rust'}
                  ratio="1/1"
                />
              </div>
            </a>
          ))}
        </aside>
      </section>

      {/* MAIN GRID */}
      <main style={{
        display:'grid',
        gridTemplateColumns: showSidebar ? '1fr 320px' : '1fr',
        gap:36, padding:'40px 36px',
      }}>
        <div>
          {/* SUB-FEATURED ROW — 2 cards */}
          <div style={{
            display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,
            paddingBottom:32, borderBottom:`1px solid ${palette.border}`,
          }}>
            {SUB_FEATURED.map((a,idx) => (
              <article key={a.id} style={{
                paddingRight: idx===0 ? 32 : 0,
                borderRight: idx===0 ? `1px solid ${palette.border}` : 'none',
              }}>
                <div className="epm-mono" style={{
                  fontSize:10,letterSpacing:'.18em',textTransform:'uppercase',
                  color:a.catColor, marginBottom:12,fontWeight:700,
                }}>▌ {a.cat}</div>
                <h2 style={{
                  fontFamily:displayFont, fontWeight: display==='dmserif'?400:700,
                  fontSize:28,lineHeight:1.15,margin:'0 0 12px',color:palette.ink,letterSpacing:'-.005em',
                }}>{a.title}</h2>
                <p style={{
                  fontSize:14.5,lineHeight:1.6,color:palette.ink2,margin:'0 0 14px',
                }} className="clamp-2">{a.summary}</p>
                <div className="epm-mono" style={{
                  fontSize:10,color:palette.ink2,letterSpacing:'.06em',
                  display:'flex',gap:12,
                }}>
                  <span>{a.date}</span><span>·</span>
                  <span>{a.read} min de lectura</span>
                </div>
              </article>
            ))}
          </div>

          {/* COLUMNA DEL PRÍNCIPE */}
          <section style={{
            padding:'36px 0', borderBottom:`1px solid ${palette.border}`,
          }}>
            <div style={{
              display:'flex',alignItems:'baseline',justifyContent:'space-between',
              marginBottom:24, paddingBottom:12, borderBottom:`2px solid ${palette.ink}`,
            }}>
              <h3 style={{
                fontFamily:displayFont, fontWeight:display==='dmserif'?400:900, fontSize:30,
                margin:0, color:palette.ink,letterSpacing:'-.01em',
              }}>La columna del Príncipe</h3>
              <span className="epm-mono" style={{
                fontSize:10,letterSpacing:'.2em',textTransform:'uppercase',color:palette.ink2,
              }}>Tres veces por semana</span>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
              {COLUMNS.map((c,i)=>(
                <div key={i} style={{
                  paddingRight: i<2?22:0,
                  borderRight: i<2?`1px dashed ${palette.border}`:'none',
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:14}}>
                    <div style={{
                      width:38,height:38,borderRadius:'50%',
                      background:`linear-gradient(135deg, ${palette.accent}, ${palette.accent2})`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',fontFamily:displayFont,fontWeight:display==='dmserif'?400:900,fontSize:15,
                    }}>P</div>
                    <div>
                      <div className="epm-ui" style={{fontSize:12,fontWeight:600,color:palette.ink}}>{c.author}</div>
                      <div className="epm-mono" style={{fontSize:9,letterSpacing:'.14em',textTransform:'uppercase',color:palette.ink2}}>{c.role}</div>
                    </div>
                  </div>
                  <h4 className="epm-italic" style={{
                    fontSize:19,lineHeight:1.3,margin:'0 0 12px',color:palette.ink,fontStyle:'italic',
                    fontFamily:'"Libre Baskerville", Georgia, serif',
                  }}>"{c.title}"</h4>
                  <div className="epm-mono" style={{fontSize:10,color:palette.ink2,letterSpacing:'.08em'}}>
                    {c.date} · Opinión
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* HORIZONTAL AD */}
          <div style={{padding:'24px 0',borderBottom:`1px solid ${palette.border}`}}>
            <EpmAdSlot format="horizontal" tone={t.palette==='dark'?'dark':'light'}/>
          </div>

          {/* ÚLTIMAS ENTREGAS */}
          <section style={{padding:'36px 0'}}>
            <div style={{
              display:'flex',alignItems:'baseline',justifyContent:'space-between',
              marginBottom:26, paddingBottom:12, borderBottom:`2px solid ${palette.ink}`,
            }}>
              <h3 style={{fontFamily:displayFont,fontWeight:display==='dmserif'?400:900,fontSize:30,margin:0,letterSpacing:'-.01em'}}>Últimas entregas</h3>
              <a className="epm-mono" style={{
                fontSize:11,color:palette.accent,letterSpacing:'.14em',textTransform:'uppercase',
                textDecoration:'none',fontWeight:700,
              }}>Ver todas →</a>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
              {LATEST.slice(0,6).map(a => (
                <article key={a.id} className="epm-card" style={{
                  background:palette.card, padding:0,
                  borderTop:`3px solid ${a.catColor}`,
                }}>
                  <EpmImagePlaceholder
                    label={`foto · ${a.cat.toLowerCase()}`}
                    tone={a.cat==='Denuncia'?'rust':a.cat==='Investigación'?'cool':'warm'}
                    ratio="16/9"
                  />
                  <div style={{padding:'15px 18px 20px'}}>
                    <div className="epm-mono" style={{
                      fontSize:10,letterSpacing:'.16em',textTransform:'uppercase',
                      color:a.catColor, marginBottom:11,fontWeight:700,
                    }}>{a.cat}</div>
                    <h4 style={{
                      fontFamily:displayFont, fontWeight:display==='dmserif'?400:700, fontSize:19,
                      lineHeight:1.22, margin:'0 0 10px', color:palette.ink,
                    }} className="clamp-3">{a.title}</h4>
                    <p style={{fontSize:13.5,lineHeight:1.55,color:palette.ink2,margin:'0 0 14px'}} className="clamp-2">
                      {a.summary}
                    </p>
                    <div className="epm-mono" style={{
                      fontSize:10,color:palette.ink2,letterSpacing:'.06em',
                      display:'flex',justifyContent:'space-between',
                      paddingTop:11, borderTop:`1px solid ${palette.border}`,
                    }}>
                      <span>{a.date}</span>
                      <span style={{display:'inline-flex',gap:10}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:3}}>
                          <Icon.Clock size={10} color={palette.ink2}/> {a.read}m
                        </span>
                        <span style={{display:'inline-flex',alignItems:'center',gap:3}}>
                          <Icon.Eye size={10} color={palette.ink2}/> {a.views.toLocaleString('es-PE')}
                        </span>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* PÓDCAST */}
          <section style={{
            background:palette.headerBg, color:palette.headerInk,
            padding:'32px 36px',marginTop:8,
            display:'grid',gridTemplateColumns:'200px 1fr auto',gap:32,alignItems:'center',
          }}>
            <div style={{position:'relative'}}>
              <EpmImagePlaceholder label="ep. 12" tone="dark" ratio="1/1"/>
              <div style={{
                position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <button style={{
                  width:62,height:62,borderRadius:'50%',
                  background:palette.accent,border:'none',color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
                  paddingLeft:5,boxShadow:'0 6px 20px rgba(0,0,0,.4)',
                }}><Icon.Play size={24} color="#fff"/></button>
              </div>
            </div>
            <div>
              <div className="epm-mono" style={{
                fontSize:10,letterSpacing:'.24em',textTransform:'uppercase',
                color:palette.accent, marginBottom:12,
                display:'inline-flex',alignItems:'center',gap:8,fontWeight:700,
              }}>
                <Icon.Mic size={12} color={palette.accent}/> Pódcast · {PODCAST.ep}
              </div>
              <h3 style={{
                fontFamily:displayFont,fontWeight:display==='dmserif'?400:700,fontSize:30,margin:'0 0 12px',
                color:palette.headerInk,lineHeight:1.15,letterSpacing:'-.005em',
              }}>{PODCAST.title}</h3>
              <p style={{fontSize:14.5,lineHeight:1.55,opacity:.78,margin:0,maxWidth:600}} className="clamp-2">
                {PODCAST.desc}
              </p>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="epm-mono" style={{fontSize:11,opacity:.7,letterSpacing:'.12em',marginBottom:6}}>{PODCAST.duration}</div>
              <div className="epm-mono" style={{fontSize:10,opacity:.5,letterSpacing:'.12em'}}>{PODCAST.date}</div>
              <div style={{display:'flex',gap:6,marginTop:16,justifyContent:'flex-end'}}>
                {['Spotify','Apple','RSS'].map(p=>(
                  <span key={p} className="epm-mono" style={{
                    fontSize:10,padding:'5px 9px',border:`1px solid ${palette.headerInk}40`,letterSpacing:'.08em',
                  }}>{p}</span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* SIDEBAR */}
        {showSidebar && (
          <aside style={{display:'flex',flexDirection:'column',gap:30}}>
            <div>
              <h4 className="epm-mono" style={{
                fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',
                color:palette.ink,margin:'0 0 14px',paddingBottom:10,
                borderBottom:`2px solid ${palette.ink}`,
                display:'flex',alignItems:'center',gap:8,
              }}>
                <Icon.Flame size={12} color={palette.accent}/> Lo más leído
              </h4>
              <ol style={{margin:0,padding:0,listStyle:'none'}}>
                {MOST_READ.map((a,i)=>(
                  <li key={a.id} style={{
                    display:'grid',gridTemplateColumns:'auto 1fr',gap:14,
                    padding:'12px 0',borderBottom:i<MOST_READ.length-1?`1px dashed ${palette.border}`:'none',
                  }}>
                    <span style={{
                      fontFamily:displayFont,fontWeight:display==='dmserif'?400:900,fontSize:34,
                      color:palette.accent,lineHeight:.85,
                    }}>{i+1}</span>
                    <div>
                      <div style={{
                        fontFamily:displayFont,fontWeight:display==='dmserif'?400:700,fontSize:14.5,
                        lineHeight:1.25,color:palette.ink,marginBottom:6,
                      }} className="clamp-3">{a.title}</div>
                      <div className="epm-mono" style={{fontSize:9,letterSpacing:'.12em',color:palette.ink2}}>
                        {a.cat.toUpperCase()} · {a.views.toLocaleString('es-PE')} LECTURAS
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <EpmAdSlot format="rectangle" tone={t.palette==='dark'?'dark':'light'}/>

            <div>
              <h4 className="epm-mono" style={{
                fontSize:11,letterSpacing:'.24em',textTransform:'uppercase',
                color:palette.ink,margin:'0 0 14px',paddingBottom:10,
                borderBottom:`2px solid ${palette.ink}`,
              }}>Categorías</h4>
              <ul style={{margin:0,padding:0,listStyle:'none',display:'flex',flexDirection:'column',gap:10}}>
                {CATEGORIES.map(c=>(
                  <li key={c.name} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    paddingBottom:10,borderBottom:`1px solid ${palette.border}`,
                  }}>
                    <span style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{width:8,height:8,background:c.color}}/>
                      <span className="epm-ui" style={{fontSize:14,color:palette.ink,fontWeight:500}}>{c.name}</span>
                    </span>
                    <span className="epm-mono" style={{fontSize:11,color:palette.ink2}}>{String(c.count).padStart(2,'0')}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{
              background:palette.headerBg,color:palette.headerInk,
              padding:'24px 22px',
            }}>
              <div className="epm-mono" style={{
                fontSize:10,letterSpacing:'.24em',color:palette.accent,marginBottom:11,fontWeight:700,
                display:'flex',alignItems:'center',gap:8,
              }}><Icon.Mail size={12} color={palette.accent}/> BOLETÍN SEMANAL</div>
              <h4 style={{
                fontFamily:displayFont,fontWeight:display==='dmserif'?400:700,fontSize:23,
                margin:'0 0 11px',lineHeight:1.18,letterSpacing:'-.005em',
              }}>Lo que el municipio no quiere que leas, los miércoles a las 7 a.m.</h4>
              <p style={{fontSize:13,lineHeight:1.5,opacity:.75,margin:'0 0 14px'}}>
                Una crónica corta, los datos verificados de la semana, y un dato suelto.
              </p>
              <input placeholder="tu correo electrónico" style={{
                width:'100%',background:'transparent',
                border:`1px solid ${palette.headerInk}40`,
                color:palette.headerInk,padding:'10px 12px',
                fontFamily:'"DM Sans",sans-serif',fontSize:13,marginBottom:8,outline:'none',
              }}/>
              <button style={{
                width:'100%',background:palette.accent,color:'#fff',border:'none',
                padding:'11px 14px',cursor:'pointer',fontFamily:'"DM Sans",sans-serif',
                fontSize:12,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',
              }}>Suscribirme gratis</button>
            </div>

            <EpmAdSlot format="vertical" tone={t.palette==='dark'?'dark':'light'}/>
          </aside>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{
        background:palette.headerBg,color:palette.headerInk,
        padding:'48px 36px 30px',
      }}>
        <div style={{
          display:'grid',gridTemplateColumns:'1.6fr 1fr 1fr 1fr',gap:36,
          paddingBottom:32, borderBottom:`1px solid ${palette.headerInk}22`,
        }}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <Crest size={42} color={palette.accent}/>
              <div style={{fontFamily:displayFont,fontWeight:display==='dmserif'?400:900,fontSize:28}}>
                El Príncipe Mestizo
              </div>
            </div>
            <p style={{fontSize:13.5,lineHeight:1.65,opacity:.7,margin:0,maxWidth:380}}>
              Periodismo ciudadano independiente desde San Ramón, Chanchamayo. Sin financiamiento estatal ni partidario. Lectores, no anunciantes.
            </p>
          </div>
          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',marginBottom:14,opacity:.6}}>SECCIONES</div>
            {['Denuncia','Investigación','Opinión','Ciudad','Política'].map(x=>(
              <div key={x} style={{fontSize:13,marginBottom:9,opacity:.85}}>{x}</div>
            ))}
          </div>
          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',marginBottom:14,opacity:.6}}>LA REDACCIÓN</div>
            {['Acerca de','Contacto','Línea editorial','Apóyanos','Archivo'].map(x=>(
              <div key={x} style={{fontSize:13,marginBottom:9,opacity:.85}}>{x}</div>
            ))}
          </div>
          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',marginBottom:14,opacity:.6}}>SÍGUENOS</div>
            {['X / Twitter','Facebook','Instagram','YouTube','RSS'].map(x=>(
              <div key={x} style={{fontSize:13,marginBottom:9,opacity:.85}}>{x}</div>
            ))}
          </div>
        </div>
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:24,
        }} className="epm-mono">
          <span style={{fontSize:11,opacity:.55,letterSpacing:'.06em'}}>
            © 2026 El Príncipe Mestizo · San Ramón, Chanchamayo, Junín, Perú
          </span>
          <span className="epm-italic" style={{
            fontSize:15,opacity:.75,fontStyle:'italic',fontFamily:'"Libre Baskerville",Georgia,serif',
            letterSpacing:'normal',
          }}>
            "La verdad no necesita permiso para existir."
          </span>
        </div>
      </footer>
    </div>
  );
}

window.EpmDirection1 = EpmDirection1;
