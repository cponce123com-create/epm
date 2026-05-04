// App principal — design canvas con las 2 direcciones + Tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "paper",
  "density": "balanced",
  "sidebar": true,
  "display": "dmserif"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <React.Fragment>
      <DesignCanvas>
        <DCSection
          id="home"
          title="El Príncipe Mestizo · Home"
          subtitle="Dos direcciones de diseño para un sitio de periodismo ciudadano local — San Ramón, Chanchamayo"
        >
          <DCArtboard
            id="dir-1"
            label="A · Edición impresa — densa, portada de diario, masthead grande, teletipo de última hora"
            width={1280}
            height={3500}
          >
            <EpmDirection1 tweaks={tweaks}/>
          </DCArtboard>

          <DCArtboard
            id="dir-2"
            label="B · Editorial moderno — hero full-bleed con foto, más aireada, columnas con avatar grande"
            width={1280}
            height={4100}
          >
            <EpmDirection2 tweaks={tweaks}/>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="mobile"
          title="Versión móvil · Home"
          subtitle="El home de la dirección A adaptado a iPhone — header sticky con buscador, hero full-bleed, chips de categorías, lista compacta y boletín"
        >
          <DCArtboard
            id="mobile-home"
            label="Home móvil — scroll vertical, marca compacta, breaking ticker, hero, lista, pódcast, boletín"
            width={420}
            height={920}
          >
            <div style={{padding:'12px 0',display:'flex',justifyContent:'center'}}>
              <IOSDevice width={402} height={874} dark={false}>
                <EpmMobileHome/>
              </IOSDevice>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="admin"
          title="Panel administrador"
          subtitle="Login + dashboard + editor de artículos para que tú (o tu equipo) gestionen el contenido del sitio. Misma identidad: granate sobre papel, DM Serif Display, mono."
        >
          <DCArtboard
            id="admin-login"
            label="01 · Login — solo personal autorizado de la redacción"
            width={1280}
            height={820}
          >
            <EpmAdminLogin/>
          </DCArtboard>

          <DCArtboard
            id="admin-dashboard"
            label="02 · Dashboard — métricas, últimos artículos, comentarios por moderar, actividad"
            width={1280}
            height={1100}
          >
            <EpmAdminDashboard/>
          </DCArtboard>

          <DCArtboard
            id="admin-editor"
            label="03 · Editor de artículo — título, bajada, portada, body con drop-cap y blockquote, sidebar de metadata"
            width={1280}
            height={1180}
          >
            <EpmAdminEditor/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Paleta"/>
        <TweakRadio
          label="Tono"
          value={tweaks.palette}
          options={[
            {value:'paper', label:'Papel'},
            {value:'sepia', label:'Sepia'},
            {value:'dark',  label:'Tinta'},
          ]}
          onChange={v=>setTweak('palette', v)}
        />

        <TweakSection label="Tipografía"/>
        <TweakRadio
          label="Display"
          value={tweaks.display}
          options={[
            {value:'dmserif',  label:'DM Serif'},
            {value:'playfair', label:'Playfair'},
            {value:'didot',    label:'Didot'},
          ]}
          onChange={v=>setTweak('display', v)}
        />

        <TweakSection label="Layout"/>
        <TweakToggle
          label="Mostrar sidebar"
          value={tweaks.sidebar}
          onChange={v=>setTweak('sidebar', v)}
        />
      </TweaksPanel>
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
