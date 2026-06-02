// Datos ficticios — titulares plausibles sobre San Ramón / Chanchamayo
const ARTICLES = [
  {
    id: 1, slug: 'obra-malecon-paralizada',
    cat: 'Denuncia', catColor: '#B22222',
    title: 'La obra del malecón de San Ramón cumple 14 meses paralizada y nadie responde',
    summary: 'El proyecto de S/ 4.8 millones acumula tres adendas y un expediente técnico que la municipalidad se niega a entregar. Vecinos del Jr. Pardo denuncian filtraciones y promesas incumplidas desde la gestión anterior.',
    author: 'El Príncipe Mestizo', date: '28 abr 2026', time: '06:42', read: 8,
    views: 4218, featured: true, tag: 'EXCLUSIVO',
  },
  {
    id: 2, slug: 'presupuesto-participativo-2026',
    cat: 'Investigación', catColor: '#1E8449',
    title: 'Presupuesto Participativo 2026: el 62% se concentró en tres barrios y los caseríos quedaron afuera',
    summary: 'Cruzamos los actos públicos del PP municipal con el padrón de agentes participantes. La conclusión es incómoda para la actual gestión.',
    author: 'El Príncipe Mestizo', date: '26 abr 2026', read: 12, views: 3104,
  },
  {
    id: 3, slug: 'convenio-essalud-vraem',
    cat: 'Ciudad', catColor: '#7D3C98',
    title: '¿Por qué EsSalud no construye el hospital prometido en Vitoc desde 2019?',
    summary: 'El convenio entre el Gobierno Regional y EsSalud sigue empantanado en observaciones técnicas. Mientras tanto, los pacientes viajan tres horas a La Merced.',
    author: 'El Príncipe Mestizo', date: '24 abr 2026', read: 9, views: 2890,
  },
  {
    id: 4, slug: 'opinion-mestizaje-politico',
    cat: 'Opinión', catColor: '#2471A3',
    title: 'El mestizaje político de Chanchamayo: ni colonos, ni asháninkas, ni serranos — solo electores',
    summary: 'Una reflexión sobre cómo los partidos nacionales descubren la selva central solo cada cuatro años.',
    author: 'El Príncipe Mestizo', date: '22 abr 2026', read: 6, views: 5621,
  },
  {
    id: 5, slug: 'cafe-precio-sostenido',
    cat: 'Política', catColor: '#CA6F1E',
    title: 'El precio del café se sostiene, pero los pequeños productores siguen endeudados',
    summary: 'Visitamos seis chacras entre Pichanaki y Perené. La cosecha promete, los créditos del Agrobanco no.',
    author: 'El Príncipe Mestizo', date: '20 abr 2026', read: 10, views: 1842,
  },
  {
    id: 6, slug: 'transparencia-municipal',
    cat: 'Denuncia', catColor: '#B22222',
    title: 'La municipalidad de San Ramón cerró el portal de transparencia "por mantenimiento" hace 47 días',
    summary: 'Solicitamos una respuesta formal. Nos remitieron al área de comunicaciones, que tampoco respondió.',
    author: 'El Príncipe Mestizo', date: '18 abr 2026', read: 5, views: 6112,
  },
  {
    id: 7, slug: 'turismo-comunidades',
    cat: 'Ciudad', catColor: '#7D3C98',
    title: 'Las comunidades nativas de Pampa Michi reclaman regulación al turismo desbordado',
    summary: 'Tres operadores informales ingresan diariamente sin permiso comunal. El Ministerio de Cultura mira para otro lado.',
    author: 'El Príncipe Mestizo', date: '16 abr 2026', read: 7, views: 1402,
  },
  {
    id: 8, slug: 'fiscalia-canon',
    cat: 'Investigación', catColor: '#1E8449',
    title: 'La Fiscalía abrió investigación preliminar por el uso del canon en 2024',
    summary: 'El expediente fiscal incluye al ex gerente de obras y a dos consultores externos.',
    author: 'El Príncipe Mestizo', date: '14 abr 2026', read: 11, views: 2210,
  },
  {
    id: 9, slug: 'editorial-prensa-local',
    cat: 'Opinión', catColor: '#2471A3',
    title: 'Por qué la prensa local incomoda más que la nacional',
    summary: 'En provincias, el periodista cruza al alcalde en el mercado el sábado.',
    author: 'El Príncipe Mestizo', date: '12 abr 2026', read: 4, views: 3300,
  },
];

const FEATURED = ARTICLES.find(a => a.featured) || ARTICLES[0];
const SUB_FEATURED = ARTICLES.filter(a => !a.featured).slice(0, 2);
const LATEST = ARTICLES.slice(1);

const CATEGORIES = [
  { name: 'Denuncia', color: '#B22222', count: ARTICLES.filter(a => a.cat === 'Denuncia').length },
  { name: 'Investigación', color: '#1E8449', count: ARTICLES.filter(a => a.cat === 'Investigación').length },
  { name: 'Ciudad', color: '#7D3C98', count: ARTICLES.filter(a => a.cat === 'Ciudad').length },
  { name: 'Opinión', color: '#2471A3', count: ARTICLES.filter(a => a.cat === 'Opinión').length },
  { name: 'Política', color: '#CA6F1E', count: ARTICLES.filter(a => a.cat === 'Política').length },
];

export { ARTICLES, FEATURED, SUB_FEATURED, LATEST, CATEGORIES };