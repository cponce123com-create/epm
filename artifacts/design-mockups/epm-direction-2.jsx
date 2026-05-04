// Dirección 2 — "Editorial moderno"
// Más aireada, tipo The Atlantic / El País Semanal moderno.
// Hero full-bleed con foto y título encima. Más blanco, tipografía
// fuerte, columnas con avatares grandes, pódcast destacado.

function EpmDirection2({ tweaks }) {
  const t = tweaks || {};
  const palette = {
    paper: { bg:'#faf7f2', card:'#ffffff', ink:'#15140f', ink2:'#6a6358', accent:'#B22222', soft:'#f1ece2', border:'#e2dccd', headerInk:'#15140f' },
    sepia: { bg:'#f1e6d0', card:'#fbf3df', ink:'#2a1f12', ink2:'#7a6a50', accent:'#8B3A1F', soft:'#e8dbbd', border:'#d4c5a3', headerInk:'#2a1f12' },
    dark:  { bg:'#0e0e10', card:'#16161a', ink:'#f0ece2', ink2:'#9c958a', accent:'#E14B3F', soft:'#1c1c20', border:'#26262c', headerInk:'#f0ece2' },
  }[t.palette || 'paper'];
  const showSidebar = t.sidebar !== false;
  const display = t.display || 'playfair';
  const displayFont = display === 'libre' ? '"Libre Baskerville", Georgia, serif' : '"Playfair Display", Georgia, serif';

  const W = 1280;

  return (
    <div style={{ width:W, background:palette.bg, color:palette.ink, fontFamily:'"Source Serif 4", Georgia, serif' }}>

      {/* MINI BREAKING BANNER */}
      <div style={{
        background:palette.accent, color:'#fff',
        padding:'10px 32px', display:'flex',gap:14,alignItems:'center',
      }}>
        <span className="epm-mono" style={{
          fontSize:10,letterSpacing:'.2em',background:'#000',color:'#fff',padding:'4px 9px',
          display:'inline-flex',alignItems:'center',gap:6,
        }}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#fff',animation:'epm-tick 1.2s ease-in-out infinite alternate'}}/>
          ÚLTIMA HORA
        </span>
        <span className="epm-ui clamp-2" style={{fontSize:13,fontWeight:500,flex:1}}>
          {BREAKING[0].replace('ÚLTIMA HORA · ','')}
        </span>
        <a className="epm-mono" style={{fontSize:10,letterSpacing:'.16em',color:'#fff',opacity:.85}}>VER TODAS →</a>
      </div>

      {/* HEADER — limpio, claro */}
      <header style={{
        background:palette.bg, padding:'22px 32px 18px',
        borderBottom:`1px solid ${palette.border}`,
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              width:40,height:40,background:palette.accent,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:displayFont,fontWeight:900,color:'#fff',fontSize:22,
            }}>P</div>
            <div>
              <div style={{fontFamily:displayFont,fontWeight:900,fontSize:24,color:palette.ink,lineHeight:1}}>
                El Príncipe Mestizo
              </div>
              <div className="epm-mono" style={{
                fontSize:9,letterSpacing:'.22em',textTransform:'uppercase',
                color:palette.ink2,marginTop:4,
              }}>Periodismo ciudadano · San Ramón</div>
            </div>
          </div>

          <nav style={{display:'flex',gap:28}} className="epm-ui">
            {['Inicio','Denuncia','Investigación','Opinión','Ciudad','Política','Pódcast'].map((l,i)=>(
              <a key={l} className="epm-navlink" style={{
                color:palette.ink,textDecoration:'none',fontSize:13,
                fontWeight: i===0?600:500,
              }}>{l}</a>
            ))}
          </nav>

          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button style={{
              width:36,height:36,borderRadius:'50%',
              background:'transparent',border:`1px solid ${palette.border}`,
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            }}><Icon.Search size={15} color={palette.ink}/></button>
            <button className="epm-ui" style={{
              background:palette.ink,color:palette.bg,border:'none',
              padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:600,
              borderRadius:0,
            }}>Apóyanos →</button>
          </div>
        </div>
      </header>

      {/* HERO — full-bleed con foto */}
      <section style={{position:'relative',height:560,overflow:'hidden'}}>
        <EpmImagePlaceholder
          label="cover · obra paralizada · malecón tarso"
          tone={t.palette==='dark'?'dark':'rust'}
          ratio={null}
          style={{height:'100%',aspectRatio:'auto'}}
        />
        <div style={{
          position:'absolute',inset:0,
          background:`linear-gradient(180deg, transparent 0%, transparent 35%, rgba(0,0,0,.35) 60%, rgba(0,0,0,.85) 100%)`,
        }}/>
        <div style={{
          position:'absolute',left:0,right:0,bottom:0,
          padding:'40px 56px 48px',color:'#fff',
        }}>
          <div style={{maxWidth:880}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <span className="epm-mono" style={{
                background:palette.accent,color:'#fff',padding:'6px 11px',fontSize:10,letterSpacing:'.2em',
              }}>{FEATURED.tag||'EXCLUSIVO'}</span>
              <span className="epm-mono" style={{
                fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',color:'#fff',opacity:.9,
              }}>{FEATURED.cat}</span>
              <span className="epm-mono" style={{fontSize:11,opacity:.75,letterSpacing:'.1em'}}>
                {FEATURED.date} · {FEATURED.read} min
              </span>
            </div>
            <h1 style={{
              fontFamily:displayFont,fontWeight:900,
              fontSize:56,lineHeight:1.05,letterSpacing:'-.012em',
              margin:'0 0 18px',color:'#fff',
            }}>{FEATURED.title}</h1>
            <p className="epm-italic" style={{
              fontSize:19,lineHeight:1.5,color:'#fff',opacity:.92,
              margin:'0 0 24px',maxWidth:760,
            }}>{FEATURED.summary}</p>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <button style={{
                background:'#fff',color:'#000',border:'none',
                padding:'13px 22px',cursor:'pointer',
                fontFamily:'"DM Sans",sans-serif',fontWeight:600,fontSize:13,
                letterSpacing:'.04em',textTransform:'uppercase',
                display:'inline-flex',alignItems:'center',gap:10,
              }}>Leer la nota completa <Icon.Arrow size={14} color="#000"/></button>
              <span className="epm-mono" style={{
                fontSize:11,opacity:.7,letterSpacing:'.08em',display:'inline-flex',alignItems:'center',gap:6,
              }}>
                <Icon.Eye size={11} color="#fff"/> {FEATURED.views.toLocaleString('es-PE')} lecturas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SUB-FEATURED — 3 cards bajo el hero, fondo claro */}
      <section style={{
        background:palette.soft,padding:'32px',
        borderBottom:`1px solid ${palette.border}`,
      }}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
          {[SUB_FEATURED[0], SUB_FEATURED[1], LATEST[2]].map(a => (
            <article key={a.id} className="epm-card" style={{
              background:palette.card,padding:0,overflow:'hidden',
            }}>
              <EpmImagePlaceholder
                label={`foto · ${a.cat.toLowerCase()}`}
                tone={a.cat==='Denuncia'?'rust':a.cat==='Investigación'?'cool':'warm'}
                ratio="16/9"
              />
              <div style={{padding:'18px 20px 20px'}}>
                <div className="epm-mono" style={{
                  fontSize:10,letterSpacing:'.18em',textTransform:'uppercase',
                  color:a.catColor,marginBottom:10,fontWeight:700,
                }}>{a.cat}</div>
                <h3 style={{
                  fontFamily:displayFont,fontWeight:700,fontSize:22,
                  lineHeight:1.18,margin:'0 0 10px',color:palette.ink,
                }} className="clamp-3">{a.title}</h3>
                <p style={{fontSize:14,lineHeight:1.55,color:palette.ink2,margin:'0 0 14px'}} className="clamp-2">
                  {a.summary}
                </p>
                <div className="epm-mono" style={{fontSize:10,color:palette.ink2,letterSpacing:'.08em'}}>
                  {a.date} · {a.read} min de lectura
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* MAIN — feed + sidebar */}
      <main style={{
        display:'grid',
        gridTemplateColumns: showSidebar ? '1fr 320px' : '1fr',
        gap:40,padding:'48px 32px',
      }}>
        <div>

          {/* SECTION HEADER */}
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:28}}>
            <div>
              <div className="epm-mono" style={{
                fontSize:10,letterSpacing:'.22em',color:palette.accent,marginBottom:8,
              }}>SECCIÓN</div>
              <h2 style={{
                fontFamily:displayFont,fontWeight:900,fontSize:38,margin:0,
                color:palette.ink,letterSpacing:'-.01em',
              }}>Últimas entregas</h2>
            </div>
            <div style={{display:'flex',gap:8}} className="epm-ui">
              {['Todo','Denuncia','Investigación','Opinión','Ciudad'].map((f,i)=>(
                <button key={f} style={{
                  background: i===0?palette.ink:'transparent',
                  color: i===0?palette.bg:palette.ink2,
                  border:`1px solid ${i===0?palette.ink:palette.border}`,
                  padding:'7px 13px',fontSize:12,cursor:'pointer',
                }}>{f}</button>
              ))}
            </div>
          </div>

          {/* LARGE LEAD CARD — horizontal */}
          <article className="epm-card" style={{
            display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,
            background:palette.card,marginBottom:28,
            border:`1px solid ${palette.border}`,
          }}>
            <EpmImagePlaceholder
              label={`foto · ${LATEST[0].cat.toLowerCase()}`}
              tone="warm"
              ratio={null}
              style={{height:'100%',aspectRatio:'auto',minHeight:300}}
            />
            <div style={{padding:'32px 36px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <div className="epm-mono" style={{
                fontSize:10,letterSpacing:'.2em',textTransform:'uppercase',
                color:LATEST[0].catColor,marginBottom:14,fontWeight:700,
              }}>{LATEST[0].cat} · Nota destacada</div>
              <h3 style={{
                fontFamily:displayFont,fontWeight:700,fontSize:30,
                lineHeight:1.15,margin:'0 0 14px',color:palette.ink,
              }}>{LATEST[0].title}</h3>
              <p style={{fontSize:15,lineHeight:1.6,color:palette.ink2,margin:'0 0 18px'}}>
                {LATEST[0].summary}
              </p>
              <div className="epm-mono" style={{
                fontSize:11,color:palette.ink2,letterSpacing:'.08em',
                display:'flex',gap:14,alignItems:'center',
              }}>
                <span>{LATEST[0].date}</span><span>·</span>
                <span>{LATEST[0].read} min</span><span>·</span>
                <span>{LATEST[0].views.toLocaleString('es-PE')} lecturas</span>
              </div>
            </div>
          </article>

          {/* GRID 2-col cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:28}}>
            {LATEST.slice(1,5).map(a => (
              <article key={a.id} className="epm-card" style={{
                background:palette.card,padding:0,
                border:`1px solid ${palette.border}`,overflow:'hidden',
              }}>
                <EpmImagePlaceholder
                  label={`foto · ${a.cat.toLowerCase()}`}
                  tone={a.cat==='Denuncia'?'rust':'warm'}
                  ratio="3/2"
                />
                <div style={{padding:'18px 20px 20px'}}>
                  <div className="epm-mono" style={{
                    fontSize:10,letterSpacing:'.18em',textTransform:'uppercase',
                    color:a.catColor,marginBottom:10,fontWeight:700,
                  }}>{a.cat}</div>
                  <h4 style={{
                    fontFamily:displayFont,fontWeight:700,fontSize:20,
                    lineHeight:1.2,margin:'0 0 10px',color:palette.ink,
                  }} className="clamp-3">{a.title}</h4>
                  <div className="epm-mono" style={{fontSize:10,color:palette.ink2,letterSpacing:'.08em'}}>
                    {a.date} · {a.read} min
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* HORIZONTAL AD */}
          <div style={{padding:'8px 0 32px'}}>
            <EpmAdSlot format="horizontal" tone={t.palette==='dark'?'dark':'light'}/>
          </div>

          {/* COLUMNS — full bleed con avatar grande */}
          <section style={{
            background:palette.soft,margin:'0 -32px',padding:'48px 32px',
            borderTop:`1px solid ${palette.border}`,borderBottom:`1px solid ${palette.border}`,
          }}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:28}}>
              <div>
                <div className="epm-mono" style={{
                  fontSize:10,letterSpacing:'.22em',color:palette.accent,marginBottom:8,
                }}>OPINIÓN</div>
                <h2 style={{fontFamily:displayFont,fontWeight:900,fontSize:34,margin:0,letterSpacing:'-.01em'}}>
                  La columna del Príncipe
                </h2>
              </div>
              <a className="epm-mono" style={{
                fontSize:11,color:palette.accent,letterSpacing:'.14em',textTransform:'uppercase',textDecoration:'none',
              }}>Archivo de columnas →</a>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
              {COLUMNS.map((c,i)=>(
                <div key={i} style={{
                  background:palette.card,padding:'28px 24px',
                  border:`1px solid ${palette.border}`,
                  display:'flex',flexDirection:'column',gap:16,
                }}>
                  <div style={{
                    width:64,height:64,borderRadius:'50%',
                    background:`linear-gradient(135deg, ${palette.accent}, #5a1010)`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontFamily:displayFont,fontWeight:900,fontSize:22,
                  }}>EPM</div>
                  <h4 className="epm-italic" style={{
                    fontSize:21,lineHeight:1.25,margin:0,color:palette.ink,fontStyle:'italic',
                  }}>"{c.title}"</h4>
                  <div style={{marginTop:'auto',paddingTop:14,borderTop:`1px solid ${palette.border}`}}>
                    <div className="epm-ui" style={{fontSize:13,fontWeight:600,color:palette.ink}}>{c.author}</div>
                    <div className="epm-mono" style={{fontSize:10,letterSpacing:'.12em',textTransform:'uppercase',color:palette.ink2,marginTop:4}}>
                      {c.role} · {c.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PODCAST — card de presentación grande */}
          <section style={{padding:'48px 0 8px'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:24}}>
              <div>
                <div className="epm-mono" style={{
                  fontSize:10,letterSpacing:'.22em',color:palette.accent,marginBottom:8,
                  display:'inline-flex',alignItems:'center',gap:8,
                }}><Icon.Mic size={12} color={palette.accent}/> EL PÓDCAST</div>
                <h2 style={{fontFamily:displayFont,fontWeight:900,fontSize:34,margin:0,letterSpacing:'-.01em'}}>
                  Voces de Chanchamayo
                </h2>
              </div>
            </div>

            <div style={{
              background:palette.ink,color:palette.bg,
              display:'grid',gridTemplateColumns:'380px 1fr',gap:0,
              overflow:'hidden',
            }}>
              <div style={{position:'relative'}}>
                <EpmImagePlaceholder label="ep. 12" tone="dark" ratio={null} style={{height:'100%',minHeight:340,aspectRatio:'auto'}}/>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <button style={{
                    width:84,height:84,borderRadius:'50%',
                    background:palette.accent,border:'none',color:'#fff',
                    display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
                    paddingLeft:6,boxShadow:'0 8px 32px rgba(0,0,0,.4)',
                  }}><Icon.Play size={32} color="#fff"/></button>
                </div>
              </div>
              <div style={{padding:'40px 44px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div className="epm-mono" style={{
                  fontSize:10,letterSpacing:'.22em',color:palette.accent,marginBottom:14,
                }}>{PODCAST.ep} · {PODCAST.duration} · {PODCAST.date}</div>
                <h3 style={{
                  fontFamily:displayFont,fontWeight:700,fontSize:32,
                  lineHeight:1.15,margin:'0 0 14px',
                }}>{PODCAST.title}</h3>
                <p style={{fontSize:15,lineHeight:1.6,opacity:.78,margin:'0 0 24px',maxWidth:520}}>
                  {PODCAST.desc}
                </p>
                <div style={{display:'flex',gap:10}}>
                  {['Spotify','Apple Pódcast','RSS','YouTube'].map(p=>(
                    <span key={p} className="epm-mono" style={{
                      fontSize:11,padding:'7px 12px',border:`1px solid ${palette.bg}40`,letterSpacing:'.08em',
                    }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* MORE LATEST */}
          <section style={{padding:'48px 0 8px'}}>
            <h3 style={{
              fontFamily:displayFont,fontWeight:700,fontSize:26,margin:'0 0 24px',
              paddingBottom:12,borderBottom:`2px solid ${palette.ink}`,
            }}>Seguir leyendo</h3>
            <div style={{display:'flex',flexDirection:'column'}}>
              {LATEST.slice(5,9).map((a,i)=>(
                <a key={a.id} style={{
                  display:'grid',gridTemplateColumns:'200px 1fr auto',gap:24,alignItems:'center',
                  padding:'22px 0',borderBottom:`1px solid ${palette.border}`,
                  textDecoration:'none',color:'inherit',cursor:'pointer',
                }}>
                  <EpmImagePlaceholder
                    label={a.cat.toLowerCase()}
                    tone={a.cat==='Denuncia'?'rust':'warm'}
                    ratio="3/2"
                  />
                  <div>
                    <div className="epm-mono" style={{
                      fontSize:10,letterSpacing:'.18em',textTransform:'uppercase',
                      color:a.catColor,marginBottom:8,fontWeight:700,
                    }}>{a.cat}</div>
                    <h4 style={{
                      fontFamily:displayFont,fontWeight:700,fontSize:21,
                      lineHeight:1.2,margin:'0 0 8px',color:palette.ink,
                    }} className="clamp-2">{a.title}</h4>
                    <p style={{fontSize:14,lineHeight:1.5,color:palette.ink2,margin:0}} className="clamp-2">
                      {a.summary}
                    </p>
                  </div>
                  <div className="epm-mono" style={{
                    fontSize:10,color:palette.ink2,letterSpacing:'.08em',textAlign:'right',whiteSpace:'nowrap',
                  }}>
                    {a.date}<br/>{a.read} min
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* SIDEBAR */}
        {showSidebar && (
          <aside style={{display:'flex',flexDirection:'column',gap:32,position:'relative'}}>

            {/* SUPPORT CALLOUT */}
            <div style={{
              background:palette.ink,color:palette.bg,padding:'26px 22px',
            }}>
              <div className="epm-mono" style={{
                fontSize:10,letterSpacing:'.22em',color:palette.accent,marginBottom:12,
              }}>SIN ANUNCIANTES</div>
              <h4 style={{
                fontFamily:displayFont,fontWeight:700,fontSize:22,
                margin:'0 0 12px',lineHeight:1.2,
              }}>Periodismo independiente lo pagan los lectores.</h4>
              <p style={{fontSize:13,lineHeight:1.55,opacity:.75,margin:'0 0 16px'}}>
                Aporta lo que puedas. S/ 10, S/ 30 o lo que decidas: cada nota cuesta tiempo, café y un viaje al municipio.
              </p>
              <button style={{
                width:'100%',background:palette.accent,color:'#fff',border:'none',
                padding:'12px',fontFamily:'"DM Sans",sans-serif',fontSize:12,fontWeight:600,
                letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer',
              }}>Apoyar el proyecto →</button>
            </div>

            {/* MOST READ */}
            <div>
              <h4 className="epm-mono" style={{
                fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',
                color:palette.ink,margin:'0 0 16px',paddingBottom:10,
                borderBottom:`2px solid ${palette.ink}`,
                display:'flex',alignItems:'center',gap:8,
              }}>
                <Icon.Flame size={12} color={palette.accent}/> Lo más leído esta semana
              </h4>
              <ol style={{margin:0,padding:0,listStyle:'none'}}>
                {MOST_READ.map((a,i)=>(
                  <li key={a.id} style={{
                    display:'grid',gridTemplateColumns:'auto 1fr',gap:14,
                    padding:'14px 0',borderBottom:i<MOST_READ.length-1?`1px solid ${palette.border}`:'none',
                  }}>
                    <span style={{
                      fontFamily:displayFont,fontWeight:900,fontSize:36,
                      color:palette.accent,lineHeight:.85,
                      WebkitTextStroke:`1px ${palette.accent}`,
                    }}>{i+1}</span>
                    <div>
                      <div style={{
                        fontFamily:displayFont,fontWeight:700,fontSize:14,
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

            {/* AD */}
            <EpmAdSlot format="rectangle" tone={t.palette==='dark'?'dark':'light'}/>

            {/* CATEGORIES */}
            <div>
              <h4 className="epm-mono" style={{
                fontSize:11,letterSpacing:'.22em',textTransform:'uppercase',
                color:palette.ink,margin:'0 0 16px',paddingBottom:10,
                borderBottom:`2px solid ${palette.ink}`,
              }}>Explorar por sección</h4>
              <ul style={{margin:0,padding:0,listStyle:'none',display:'flex',flexDirection:'column',gap:0}}>
                {CATEGORIES.map(c=>(
                  <li key={c.name} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'12px 0',borderBottom:`1px solid ${palette.border}`,
                  }}>
                    <span style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{width:10,height:10,borderRadius:'50%',background:c.color}}/>
                      <span className="epm-ui" style={{fontSize:14,color:palette.ink,fontWeight:500}}>{c.name}</span>
                    </span>
                    <span className="epm-mono" style={{fontSize:11,color:palette.ink2,letterSpacing:'.06em'}}>
                      {String(c.count).padStart(2,'0')} notas
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* NEWSLETTER */}
            <div style={{
              background:palette.soft,padding:'24px 22px',
              border:`1px solid ${palette.border}`,
            }}>
              <div className="epm-mono" style={{
                fontSize:10,letterSpacing:'.22em',color:palette.accent,marginBottom:12,
                display:'flex',alignItems:'center',gap:8,
              }}><Icon.Mail size={12} color={palette.accent}/> BOLETÍN</div>
              <h4 style={{
                fontFamily:displayFont,fontWeight:700,fontSize:21,
                margin:'0 0 10px',lineHeight:1.2,color:palette.ink,
              }}>Los miércoles, en tu bandeja.</h4>
              <p style={{fontSize:13,lineHeight:1.55,color:palette.ink2,margin:'0 0 14px'}}>
                Una crónica, los datos verificados de la semana, y un dato suelto.
              </p>
              <input placeholder="tu correo electrónico" style={{
                width:'100%',background:palette.card,
                border:`1px solid ${palette.border}`,
                color:palette.ink,padding:'10px 12px',
                fontFamily:'"DM Sans",sans-serif',fontSize:13,marginBottom:8,outline:'none',
              }}/>
              <button style={{
                width:'100%',background:palette.ink,color:palette.bg,border:'none',
                padding:'11px 14px',cursor:'pointer',fontFamily:'"DM Sans",sans-serif',
                fontSize:12,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',
              }}>Suscribirme</button>
            </div>

            <EpmAdSlot format="vertical" tone={t.palette==='dark'?'dark':'light'}/>
          </aside>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{
        background:palette.ink,color:palette.bg,
        padding:'56px 32px 28px',
      }}>
        <div style={{
          display:'grid',gridTemplateColumns:'1.6fr 1fr 1fr 1fr',gap:40,
          paddingBottom:36, borderBottom:`1px solid ${palette.bg}22`,
        }}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <div style={{
                width:44,height:44,background:palette.accent,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:displayFont,fontWeight:900,color:'#fff',fontSize:24,
              }}>P</div>
              <div style={{fontFamily:displayFont,fontWeight:900,fontSize:26}}>El Príncipe Mestizo</div>
            </div>
            <p style={{fontSize:14,lineHeight:1.65,opacity:.7,margin:'0 0 14px',maxWidth:380}}>
              Periodismo ciudadano independiente desde San Ramón, Chanchamayo. Sin financiamiento estatal ni partidario. Lectores, no anunciantes.
            </p>
            <div style={{display:'flex',gap:8}}>
              {['X','FB','IG','YT','RSS'].map(s=>(
                <div key={s} className="epm-mono" style={{
                  width:34,height:34,border:`1px solid ${palette.bg}30`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,letterSpacing:'.06em',
                }}>{s}</div>
              ))}
            </div>
          </div>
          {[
            { t:'Secciones', items:['Denuncia','Investigación','Opinión','Ciudad','Política'] },
            { t:'La redacción', items:['Acerca de','Contacto','Línea editorial','Apóyanos','Archivo'] },
            { t:'Legal', items:['Política de privacidad','Términos','Política editorial','Correcciones','Aviso legal'] },
          ].map(col=>(
            <div key={col.t}>
              <div className="epm-mono" style={{fontSize:10,letterSpacing:'.22em',marginBottom:16,opacity:.55,textTransform:'uppercase'}}>{col.t}</div>
              {col.items.map(x=>(
                <div key={x} style={{fontSize:14,marginBottom:10,opacity:.85}}>{x}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:24,
        }}>
          <span className="epm-mono" style={{fontSize:11,opacity:.5,letterSpacing:'.06em'}}>
            © 2026 El Príncipe Mestizo · San Ramón, Chanchamayo, Junín, Perú
          </span>
          <span className="epm-italic" style={{
            fontSize:16,opacity:.7,fontStyle:'italic',
            fontFamily:'"Libre Baskerville",Georgia,serif',
          }}>
            "La verdad no necesita permiso para existir."
          </span>
        </div>
      </footer>
    </div>
  );
}

window.EpmDirection2 = EpmDirection2;
