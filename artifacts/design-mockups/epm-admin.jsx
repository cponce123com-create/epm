// Panel admin — login + dashboard + editor de artículos
// Comparte la identidad de la dirección A: granate, DM Serif, mono.

function EpmAdminLogin() {
  const accent = '#7A1F1F';
  const ink = '#15140f';
  const bg = '#f4f0e7';
  const border = '#d6cfbf';
  const displayFont = '"DM Serif Display", Georgia, serif';

  return (
    <div style={{ width:1280, height:820, background:bg, display:'grid', gridTemplateColumns:'1fr 1fr', fontFamily:'"Source Serif 4",Georgia,serif' }}>
      {/* Left: brand */}
      <div style={{background:ink, color:bg, padding:'48px 56px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
        <div className="epm-mono" style={{fontSize:11,letterSpacing:'.24em',opacity:.6}}>PANEL EDITORIAL · v 2.0</div>
        <div>
          <svg width="64" height="64" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="29" stroke={accent} strokeWidth="1"/>
            <path d="M14 22l5-7 4 5 4-8 4 8 4-5 5 7v4H14v-4z" fill={accent}/>
            <rect x="14" y="28" width="32" height="1" fill={accent}/>
            <text x="30" y="46" textAnchor="middle" fill={accent} fontFamily="'DM Serif Display',serif" fontSize="14" fontStyle="italic">P</text>
          </svg>
          <div style={{fontFamily:displayFont,fontSize:54,lineHeight:1.05,margin:'24px 0 16px'}}>
            La redacción del Príncipe.
          </div>
          <p style={{fontSize:15,lineHeight:1.6,opacity:.7,maxWidth:400,fontFamily:'"Libre Baskerville",Georgia,serif',fontStyle:'italic'}}>
            "Escribir es una forma de no callar. Y de no callar todo el tiempo."
          </p>
        </div>
        <div className="epm-mono" style={{fontSize:11,opacity:.4,letterSpacing:'.08em'}}>
          San Ramón, Chanchamayo · Perú · 2026
        </div>
      </div>

      {/* Right: form */}
      <div style={{padding:'48px 80px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div className="epm-mono" style={{fontSize:11,letterSpacing:'.22em',color:accent,marginBottom:14,fontWeight:700}}>ACCESO ADMINISTRADOR</div>
        <h1 style={{fontFamily:displayFont,fontSize:42,lineHeight:1.05,margin:'0 0 12px',color:ink,letterSpacing:'-.01em'}}>
          Iniciar sesión
        </h1>
        <p style={{fontSize:14.5,color:'#5a564e',margin:'0 0 32px',lineHeight:1.55}}>
          Solo personal autorizado de la redacción.
        </p>

        <label className="epm-mono" style={{fontSize:10,letterSpacing:'.18em',color:ink,marginBottom:8,fontWeight:700}}>CORREO ELECTRÓNICO</label>
        <input defaultValue="elprincipe@mestizo.pe" style={{
          background:'#fff',border:`1px solid ${border}`,padding:'13px 14px',fontSize:14,
          fontFamily:'"DM Sans",sans-serif',color:ink,marginBottom:18,outline:'none',
        }}/>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
          <label className="epm-mono" style={{fontSize:10,letterSpacing:'.18em',color:ink,fontWeight:700}}>CONTRASEÑA</label>
          <a className="epm-mono" style={{fontSize:10,letterSpacing:'.1em',color:accent,fontWeight:700,textDecoration:'underline'}}>¿OLVIDASTE?</a>
        </div>
        <input type="password" defaultValue="••••••••••••" style={{
          background:'#fff',border:`1px solid ${border}`,padding:'13px 14px',fontSize:14,
          fontFamily:'"DM Sans",sans-serif',color:ink,marginBottom:24,outline:'none',
        }}/>

        <button style={{
          background:accent,color:'#fff',border:'none',padding:'15px',cursor:'pointer',
          fontFamily:'"DM Sans",sans-serif',fontWeight:700,fontSize:13,letterSpacing:'.1em',textTransform:'uppercase',
        }}>Entrar a la redacción →</button>

        <div style={{display:'flex',alignItems:'center',gap:12,margin:'28px 0 14px',color:'#a8a095'}}>
          <div style={{flex:1,height:1,background:border}}/>
          <span className="epm-mono" style={{fontSize:10,letterSpacing:'.18em'}}>O</span>
          <div style={{flex:1,height:1,background:border}}/>
        </div>
        <button style={{
          background:'transparent',color:ink,border:`1px solid ${border}`,padding:'13px',cursor:'pointer',
          fontFamily:'"DM Sans",sans-serif',fontWeight:500,fontSize:13,
        }}>← Volver al sitio público</button>
      </div>
    </div>
  );
}

function EpmAdminDashboard() {
  const accent = '#7A1F1F';
  const ink = '#15140f';
  const ink2 = '#5a564e';
  const bg = '#f4f0e7';
  const card = '#ffffff';
  const border = '#d6cfbf';
  const displayFont = '"DM Serif Display", Georgia, serif';

  const stats = [
    { label:'Artículos publicados', value:'87', delta:'+3 esta semana' },
    { label:'Vistas totales', value:'342.1k', delta:'+18% vs. mes anterior' },
    { label:'Comentarios pendientes', value:'14', delta:'5 sin responder', alert:true },
    { label:'Suscriptores boletín', value:'1,284', delta:'+42 esta semana' },
  ];

  return (
    <div style={{width:1280, background:bg, color:ink, fontFamily:'"Source Serif 4",Georgia,serif', display:'grid', gridTemplateColumns:'240px 1fr', minHeight:820}}>
      {/* Sidebar */}
      <aside style={{background:ink, color:bg, padding:'24px 0',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'0 22px 24px',borderBottom:`1px solid ${bg}15`,marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
          <svg width="32" height="32" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="29" stroke={accent} strokeWidth="1"/>
            <path d="M14 22l5-7 4 5 4-8 4 8 4-5 5 7v4H14v-4z" fill={accent}/>
            <rect x="14" y="28" width="32" height="1" fill={accent}/>
          </svg>
          <div>
            <div style={{fontFamily:displayFont,fontSize:18,lineHeight:1}}>El Príncipe</div>
            <div className="epm-mono" style={{fontSize:9,letterSpacing:'.18em',opacity:.5,marginTop:3}}>REDACCIÓN</div>
          </div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',padding:'0 12px'}}>
          {[
            ['◐ Dashboard', true],
            ['▤ Artículos', false],
            ['＋ Nuevo artículo', false],
            ['◳ Comentarios', false, '14'],
            ['◰ Categorías', false],
            ['◊ Suscriptores', false],
            ['◉ Configuración', false],
          ].map(([l,active,badge])=>(
            <a key={l} style={{
              padding:'10px 12px',color:bg,opacity:active?1:.7,fontSize:13,cursor:'pointer',
              background:active?accent:'transparent',
              display:'flex',justifyContent:'space-between',alignItems:'center',
              fontFamily:'"DM Sans",sans-serif',fontWeight:active?600:500,
            }}>
              <span>{l}</span>
              {badge && <span className="epm-mono" style={{fontSize:9,background:bg,color:accent,padding:'2px 6px',fontWeight:700}}>{badge}</span>}
            </a>
          ))}
        </nav>
        <div style={{marginTop:'auto',padding:'20px 22px',borderTop:`1px solid ${bg}15`}}>
          <div className="epm-mono" style={{fontSize:9,letterSpacing:'.18em',opacity:.5,marginBottom:8}}>SESIÓN ACTIVA</div>
          <div style={{fontFamily:displayFont,fontSize:15}}>El Príncipe Mestizo</div>
          <div style={{fontSize:11,opacity:.6,marginTop:4}}>elprincipe@mestizo.pe</div>
          <button style={{marginTop:12,background:'transparent',border:`1px solid ${bg}30`,color:bg,padding:'7px 12px',fontSize:11,cursor:'pointer',fontFamily:'"DM Sans",sans-serif',width:'100%'}}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Content */}
      <main style={{padding:'32px 36px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:30,paddingBottom:18,borderBottom:`2px solid ${ink}`}}>
          <div>
            <div className="epm-mono" style={{fontSize:11,letterSpacing:'.22em',color:accent,marginBottom:8,fontWeight:700}}>PANORAMA EDITORIAL</div>
            <h1 style={{fontFamily:displayFont,fontSize:38,margin:0,letterSpacing:'-.01em'}}>Buen día, Príncipe.</h1>
            <p style={{fontSize:14,color:ink2,margin:'8px 0 0'}}>Miércoles 29 de abril · 3 artículos en borrador, 14 comentarios esperando moderación.</p>
          </div>
          <button style={{
            background:accent,color:'#fff',border:'none',padding:'13px 22px',cursor:'pointer',
            fontFamily:'"DM Sans",sans-serif',fontWeight:700,fontSize:12,letterSpacing:'.08em',textTransform:'uppercase',
          }}>＋ Nuevo artículo</button>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
          {stats.map(s => (
            <div key={s.label} style={{background:card,padding:'20px 22px',border:`1px solid ${border}`,borderTop:`3px solid ${s.alert?accent:ink}`}}>
              <div className="epm-mono" style={{fontSize:9,letterSpacing:'.18em',color:ink2,marginBottom:10,fontWeight:700}}>{s.label.toUpperCase()}</div>
              <div style={{fontFamily:displayFont,fontSize:42,lineHeight:1,letterSpacing:'-.01em'}}>{s.value}</div>
              <div style={{fontSize:11.5,color:s.alert?accent:ink2,marginTop:8,fontFamily:'"DM Sans",sans-serif'}}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Recent articles */}
        <section style={{background:card,border:`1px solid ${border}`,marginBottom:24}}>
          <div style={{padding:'18px 22px',borderBottom:`1px solid ${border}`,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <h2 style={{fontFamily:displayFont,fontSize:22,margin:0}}>Últimos artículos</h2>
            <a className="epm-mono" style={{fontSize:10,letterSpacing:'.14em',color:accent,fontWeight:700}}>VER TODOS →</a>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr className="epm-mono" style={{fontSize:9,letterSpacing:'.16em',color:ink2,textAlign:'left'}}>
                <th style={{padding:'12px 22px',fontWeight:700}}>TÍTULO</th>
                <th style={{padding:'12px 12px',fontWeight:700}}>CATEGORÍA</th>
                <th style={{padding:'12px 12px',fontWeight:700}}>ESTADO</th>
                <th style={{padding:'12px 12px',fontWeight:700,textAlign:'right'}}>VISTAS</th>
                <th style={{padding:'12px 12px',fontWeight:700}}>FECHA</th>
                <th style={{padding:'12px 22px',fontWeight:700,textAlign:'right'}}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ARTICLES.slice(0,6).map((a,i)=>(
                <tr key={a.id} style={{borderTop:`1px solid ${border}`}}>
                  <td style={{padding:'14px 22px',display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:48,height:36,flexShrink:0}}>
                      <EpmImagePlaceholder label={a.cat.toLowerCase()} tone="warm" ratio="4/3"/>
                    </div>
                    <span style={{fontFamily:displayFont,fontSize:14,lineHeight:1.25}} className="clamp-2">{a.title}</span>
                  </td>
                  <td style={{padding:'14px 12px'}}>
                    <span className="epm-mono" style={{fontSize:9,letterSpacing:'.14em',color:a.catColor,fontWeight:700}}>● {a.cat.toUpperCase()}</span>
                  </td>
                  <td style={{padding:'14px 12px'}}>
                    <span className="epm-mono" style={{
                      fontSize:9,letterSpacing:'.14em',padding:'4px 8px',
                      background: i===2 ? '#fef0c0' : i===5 ? '#e8e1d4' : '#e0f0e0',
                      color: i===2 ? '#8a6d10' : i===5 ? ink2 : '#1E5C2F',
                      fontWeight:700,
                    }}>{i===2?'BORRADOR':i===5?'PROGRAMADO':'PUBLICADO'}</span>
                  </td>
                  <td style={{padding:'14px 12px',textAlign:'right',fontFamily:'"DM Sans",sans-serif',fontSize:13,fontVariantNumeric:'tabular-nums'}}>{a.views.toLocaleString('es-PE')}</td>
                  <td style={{padding:'14px 12px',fontSize:12,color:ink2,fontFamily:'"DM Sans",sans-serif'}}>{a.date}</td>
                  <td style={{padding:'14px 22px',textAlign:'right'}}>
                    <button style={{background:'transparent',border:`1px solid ${border}`,padding:'5px 10px',fontSize:11,marginRight:5,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>Editar</button>
                    <button style={{background:'transparent',border:`1px solid ${border}`,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>···</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Pending comments + activity */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
          <section style={{background:card,border:`1px solid ${border}`}}>
            <div style={{padding:'18px 22px',borderBottom:`1px solid ${border}`,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <h2 style={{fontFamily:displayFont,fontSize:20,margin:0}}>Comentarios por moderar</h2>
              <span className="epm-mono" style={{fontSize:10,letterSpacing:'.14em',color:accent,fontWeight:700}}>14 PENDIENTES</span>
            </div>
            {[
              { name:'Rosa Mendoza', email:'rosa.m@gmail.com', article:'La obra del malecón…', text:'Yo vivo a media cuadra y las filtraciones ya están en mi pared. ¿Cuándo van a responder?', time:'hace 2 h' },
              { name:'Anónimo', email:'anon-2218@…', article:'Presupuesto Participativo 2026', text:'Trabajé en la oficina de planificación. Lo que cuentan es solo la mitad.', time:'hace 4 h' },
              { name:'Carlos R.', email:'cr.merced@hotmail.com', article:'¿Por qué EsSalud no…', text:'Mi madre necesita diálisis y viajamos cada lunes. Gracias por insistir.', time:'hace 6 h' },
            ].map((c,i)=>(
              <div key={i} style={{padding:'16px 22px',borderTop:i?`1px solid ${border}`:'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <div>
                    <span style={{fontFamily:'"DM Sans",sans-serif',fontSize:13,fontWeight:600}}>{c.name}</span>
                    <span className="epm-mono" style={{fontSize:10,color:ink2,marginLeft:8}}>{c.email}</span>
                  </div>
                  <span className="epm-mono" style={{fontSize:10,color:ink2}}>{c.time}</span>
                </div>
                <div className="epm-mono" style={{fontSize:9,letterSpacing:'.12em',color:accent,marginBottom:8,fontWeight:700}}>EN: {c.article.toUpperCase()}</div>
                <p style={{fontSize:13.5,lineHeight:1.55,margin:'0 0 12px',color:ink}} className="epm-italic">"{c.text}"</p>
                <div style={{display:'flex',gap:6}}>
                  <button style={{background:'#1E5C2F',color:'#fff',border:'none',padding:'6px 12px',fontSize:11,cursor:'pointer',fontFamily:'"DM Sans",sans-serif',fontWeight:600}}>✓ Aprobar</button>
                  <button style={{background:'transparent',color:ink,border:`1px solid ${border}`,padding:'6px 12px',fontSize:11,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>Responder</button>
                  <button style={{background:'transparent',color:accent,border:`1px solid ${accent}`,padding:'6px 12px',fontSize:11,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>✕ Eliminar</button>
                </div>
              </div>
            ))}
          </section>

          <section style={{background:card,border:`1px solid ${border}`,padding:'18px 22px'}}>
            <h2 style={{fontFamily:displayFont,fontSize:20,margin:'0 0 16px',paddingBottom:12,borderBottom:`1px solid ${border}`}}>Actividad reciente</h2>
            {[
              ['Publicaste', '"La obra del malecón…"', 'hace 8 h'],
              ['Editaste', '"Presupuesto Participativo"', 'hace 11 h'],
              ['Aprobaste 3 comentarios', 'en "EsSalud no construye"', 'ayer'],
              ['Subiste imagen', 'a Cloudinary (cover-malecon.jpg)', 'ayer'],
              ['42 nuevos suscriptores', 'al boletín', 'esta semana'],
            ].map((row,i)=>(
              <div key={i} style={{padding:'10px 0',borderBottom:i<4?`1px dashed ${border}`:'none'}}>
                <div style={{fontSize:13,color:ink}}><b>{row[0]}</b> {row[1]}</div>
                <div className="epm-mono" style={{fontSize:9,letterSpacing:'.1em',color:ink2,marginTop:3}}>{row[2].toUpperCase()}</div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

function EpmAdminEditor() {
  const accent = '#7A1F1F';
  const ink = '#15140f';
  const ink2 = '#5a564e';
  const bg = '#f4f0e7';
  const card = '#ffffff';
  const border = '#d6cfbf';
  const displayFont = '"DM Serif Display", Georgia, serif';

  const tools = [
    ['H1','head'],['H2','head'],['H3','head'],
    ['B','b'],['I','i'],['U','u'],
    ['•','list'],['1.','list'],['❝','quote'],['—','rule'],
    ['🔗','link'],['📷','img'],['≡','align'],
  ];

  return (
    <div style={{width:1280, background:bg, color:ink, fontFamily:'"Source Serif 4",Georgia,serif',minHeight:880}}>
      {/* Top bar */}
      <header style={{background:ink,color:bg,padding:'14px 24px',display:'flex',alignItems:'center',gap:18,borderBottom:`3px solid ${accent}`}}>
        <button style={{background:'transparent',border:`1px solid ${bg}30`,color:bg,padding:'7px 12px',fontSize:11,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>← Dashboard</button>
        <div style={{flex:1}}>
          <div className="epm-mono" style={{fontSize:9,letterSpacing:'.2em',opacity:.5}}>EDITANDO</div>
          <div style={{fontFamily:displayFont,fontSize:18,marginTop:2}}>La obra del malecón de San Ramón…</div>
        </div>
        <span className="epm-mono" style={{fontSize:10,letterSpacing:'.12em',opacity:.6,display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#5fbf5f'}}/> GUARDADO HACE 12 SEG
        </span>
        <button style={{background:'transparent',border:`1px solid ${bg}30`,color:bg,padding:'9px 16px',fontSize:12,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>Guardar borrador</button>
        <button style={{background:'transparent',border:`1px solid ${bg}30`,color:bg,padding:'9px 16px',fontSize:12,cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>Vista previa</button>
        <button style={{background:accent,color:'#fff',border:'none',padding:'9px 18px',fontSize:12,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',cursor:'pointer',fontFamily:'"DM Sans",sans-serif'}}>Publicar →</button>
      </header>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:0}}>
        {/* Editor */}
        <main style={{padding:'32px 56px',background:bg}}>
          <div className="epm-mono" style={{fontSize:10,letterSpacing:'.18em',color:accent,marginBottom:14,fontWeight:700}}>TÍTULO</div>
          <input defaultValue="La obra del malecón de San Ramón cumple 14 meses paralizada y nadie responde" style={{
            width:'100%',background:'transparent',border:'none',
            fontFamily:displayFont,fontSize:38,fontWeight:400,color:ink,
            padding:'0 0 14px',borderBottom:`2px solid ${ink}`,outline:'none',letterSpacing:'-.01em',
          }}/>

          <div className="epm-mono" style={{fontSize:10,letterSpacing:'.18em',color:accent,margin:'24px 0 10px',fontWeight:700}}>BAJADA</div>
          <textarea defaultValue="El proyecto de S/ 4.8 millones acumula tres adendas y un expediente técnico que la municipalidad se niega a entregar. Vecinos del Jr. Pardo denuncian filtraciones y promesas incumplidas desde la gestión anterior." rows="2" style={{
            width:'100%',background:'transparent',border:'none',
            fontFamily:'"Libre Baskerville",Georgia,serif',fontStyle:'italic',fontSize:18,lineHeight:1.5,color:ink2,
            padding:0,outline:'none',resize:'none',
          }}/>

          {/* Cover image area */}
          <div style={{margin:'28px 0',position:'relative'}}>
            <EpmImagePlaceholder label="cover image · arrastra una foto aquí" tone="rust" ratio="16/9"/>
            <button style={{position:'absolute',bottom:14,right:14,background:'#fff',border:`1px solid ${border}`,padding:'8px 14px',fontSize:12,cursor:'pointer',fontFamily:'"DM Sans",sans-serif',fontWeight:600}}>＋ Subir imagen</button>
          </div>

          {/* Toolbar */}
          <div style={{
            position:'sticky',top:0,zIndex:5,background:card,border:`1px solid ${border}`,
            padding:'8px 12px',display:'flex',gap:4,alignItems:'center',marginBottom:0,
          }}>
            {tools.map((t,i)=>(
              <React.Fragment key={i}>
                {(i===3||i===6||i===10) && <div style={{width:1,height:22,background:border,margin:'0 4px'}}/>}
                <button style={{
                  background:i===3?'#e8e1d4':'transparent',border:'none',
                  width:32,height:32,cursor:'pointer',
                  fontFamily: t[0].length>1?'"DM Sans",sans-serif':displayFont,
                  fontSize:14,fontWeight: t[1]==='b'?700:400,
                  fontStyle: t[1]==='i'?'italic':'normal',
                  textDecoration: t[1]==='u'?'underline':'none',
                  color:ink,
                }}>{t[0]}</button>
              </React.Fragment>
            ))}
            <div style={{flex:1}}/>
            <span className="epm-mono" style={{fontSize:10,color:ink2,letterSpacing:'.1em'}}>1,847 palabras · 8 min</span>
          </div>

          {/* Body editor */}
          <div style={{background:card,border:`1px solid ${border}`,borderTop:'none',padding:'28px 36px',minHeight:480}}>
            <p style={{fontSize:17,lineHeight:1.85,color:ink,margin:'0 0 16px',fontFamily:'"Source Serif 4",Georgia,serif'}}>
              <span style={{
                fontFamily:displayFont,fontSize:64,float:'left',lineHeight:.85,
                marginRight:10,marginTop:6,color:accent,
              }}>L</span>
              a primera vez que pasé por la obra del malecón Tarso fue en febrero de 2025. Había maquinaria pesada, un cartel oficial con plazos optimistas y una valla azul que prometía una transformación urbana. Catorce meses después, la maquinaria sigue ahí — oxidándose — y el cartel ya no se lee.
            </p>
            <p style={{fontSize:17,lineHeight:1.85,color:ink,margin:'0 0 16px'}}>
              Pedí el expediente técnico tres veces. La primera, la oficina de obras públicas me dijo que estaba "en revisión". La segunda, que era información reservada. La tercera, que su trámite documentario se había caído.
            </p>
            <blockquote style={{
              borderLeft:`4px solid ${accent}`,paddingLeft:20,margin:'24px 0',
              fontFamily:'"Libre Baskerville",Georgia,serif',fontStyle:'italic',
              fontSize:20,lineHeight:1.5,color:ink,
            }}>
              "Yo vivo a media cuadra. Cuando llueve fuerte, el agua se mete por debajo de la base de cemento. Eso ya está mal hecho desde el comienzo."
              <footer className="epm-mono" style={{fontSize:11,color:ink2,marginTop:10,letterSpacing:'.12em',fontStyle:'normal',fontWeight:700}}>
                — ROSA M., VECINA DEL JR. PARDO
              </footer>
            </blockquote>
            <p style={{fontSize:17,lineHeight:1.85,color:ink,margin:'0 0 16px'}}>
              El proyecto fue licitado en agosto de 2024 por S/ 4.8 millones. La empresa adjudicada — Constructora Río Selva S.A.C. — había ganado dos contratos previos en otras provincias de Junín, según el portal del OSCE…
            </p>
            <div className="epm-mono" style={{
              padding:'10px 14px',background:'#f9f5ec',border:`1px dashed ${border}`,
              fontSize:11,color:ink2,letterSpacing:'.06em',textAlign:'center',margin:'24px 0',
            }}>
              ┃ Cursor de escritura ┃
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside style={{background:card,borderLeft:`1px solid ${border}`,padding:'28px 24px',display:'flex',flexDirection:'column',gap:24}}>
          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',color:ink2,marginBottom:10,fontWeight:700}}>CATEGORÍA</div>
            <select style={{width:'100%',padding:'10px 12px',background:bg,border:`1px solid ${border}`,fontSize:13,fontFamily:'"DM Sans",sans-serif',color:ink,outline:'none'}}>
              <option>Denuncia</option><option>Investigación</option><option>Opinión</option>
            </select>
          </div>

          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',color:ink2,marginBottom:10,fontWeight:700}}>ESTADO</div>
            <div style={{display:'flex',gap:6}}>
              {[['Borrador',false],['Programado',false],['Publicar',true]].map(([l,a])=>(
                <button key={l} style={{
                  flex:1,background:a?ink:'transparent',color:a?bg:ink,
                  border:`1px solid ${a?ink:border}`,padding:'8px',cursor:'pointer',
                  fontSize:11.5,fontFamily:'"DM Sans",sans-serif',fontWeight:a?700:500,
                }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderTop:`1px solid ${border}`,borderBottom:`1px solid ${border}`}}>
            <div>
              <div style={{fontSize:13,fontFamily:'"DM Sans",sans-serif',fontWeight:600}}>Destacar en home</div>
              <div className="epm-mono" style={{fontSize:10,color:ink2,marginTop:2,letterSpacing:'.06em'}}>Hero principal</div>
            </div>
            <div style={{width:38,height:22,background:accent,borderRadius:11,position:'relative',cursor:'pointer'}}>
              <div style={{width:18,height:18,background:'#fff',borderRadius:'50%',position:'absolute',top:2,right:2,boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
            </div>
          </div>

          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',color:ink2,marginBottom:10,fontWeight:700}}>SLUG / URL</div>
            <div style={{padding:'10px 12px',background:bg,border:`1px solid ${border}`,fontSize:11.5,fontFamily:'JetBrains Mono,monospace',color:ink2,wordBreak:'break-all'}}>
              /articulo/<span style={{color:accent}}>obra-malecon-paralizada</span>
            </div>
          </div>

          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',color:ink2,marginBottom:10,fontWeight:700}}>ALT TEXT (PORTADA)</div>
            <textarea rows="2" defaultValue="Maquinaria pesada abandonada en la obra del malecón Tarso, San Ramón." style={{
              width:'100%',padding:'10px 12px',background:bg,border:`1px solid ${border}`,
              fontSize:12,fontFamily:'"DM Sans",sans-serif',color:ink,outline:'none',resize:'none',
            }}/>
          </div>

          <div>
            <div className="epm-mono" style={{fontSize:10,letterSpacing:'.2em',color:ink2,marginBottom:10,fontWeight:700}}>PROGRAMAR PUBLICACIÓN</div>
            <input type="text" defaultValue="29/04/2026 · 06:00" style={{
              width:'100%',padding:'10px 12px',background:bg,border:`1px solid ${border}`,
              fontSize:12,fontFamily:'JetBrains Mono,monospace',color:ink,outline:'none',
            }}/>
          </div>

          <div style={{padding:14,background:bg,border:`1px solid ${border}`}}>
            <div className="epm-mono" style={{fontSize:9,letterSpacing:'.18em',color:accent,fontWeight:700,marginBottom:8}}>● AUTOGUARDADO ACTIVO</div>
            <div style={{fontSize:11.5,color:ink2,lineHeight:1.5}}>
              Cada 60 segundos guardamos tu trabajo. La última versión publicable está respaldada.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.EpmAdminLogin = EpmAdminLogin;
window.EpmAdminDashboard = EpmAdminDashboard;
window.EpmAdminEditor = EpmAdminEditor;
