import bcrypt from "bcryptjs";
import { db, usersTable, categoriesTable, articlesTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_CATEGORIES = [
  { name: "Denuncia", slug: "denuncia", color: "#C0392B", description: "Irregularidades y actos de corrupción en la gestión pública" },
  { name: "Opinión", slug: "opinion", color: "#2980B9", description: "Análisis y perspectivas sobre la realidad local" },
  { name: "Investigación", slug: "investigacion", color: "#27AE60", description: "Reportajes de fondo sobre temas de interés ciudadano" },
  { name: "Ciudad", slug: "ciudad", color: "#E67E22", description: "Noticias e historias de San Ramón y Chanchamayo" },
  { name: "Política", slug: "politica", color: "#8E44AD", description: "Cobertura de la política regional y local" },
];

const DEFAULT_SETTINGS = [
  { key: "about_text", value: "Soy El Príncipe Mestizo, columnista independiente desde San Ramón, Chanchamayo (Perú). Este blog es mi espacio de denuncia y reflexión sobre la gestión pública local. Creo en el poder del periodismo ciudadano como herramienta de cambio social." },
  { key: "site_description", value: "Periodismo ciudadano, opinión y denuncia desde San Ramón, Chanchamayo (Perú). Blog personal de El Príncipe Mestizo." },
  { key: "adsense_client", value: "" },
  { key: "twitter_url", value: "" },
  { key: "facebook_url", value: "" },
];

export async function seed() {
  try {
    // Seed categories
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.slug, cat.slug));
      if (existing.length === 0) {
        await db.insert(categoriesTable).values(cat);
        logger.info({ slug: cat.slug }, "Seeded category");
      }
    }

    // Seed admin user
    const adminEmail = process.env.ADMIN_EMAIL ?? "elprincipemestizosr@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "Hadrones456%";
    const existingAdmin = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, adminEmail));

    if (existingAdmin.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.insert(usersTable).values({
        email: adminEmail,
        passwordHash,
        displayName: "El Príncipe Mestizo",
        role: "admin",
      });
      logger.info({ email: adminEmail }, "Seeded admin user");
    }

    // Seed settings
    for (const setting of DEFAULT_SETTINGS) {
      const existing = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).where(eq(siteSettingsTable.key, setting.key));
      if (existing.length === 0) {
        await db.insert(siteSettingsTable).values(setting);
      }
    }

    // Seed sample articles if none exist
    const existingArticles = await db.select({ id: articlesTable.id }).from(articlesTable);
    if (existingArticles.length === 0) {
      const [admin] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, adminEmail));
      const [denunciaCategory] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.slug, "denuncia"));
      const [opinionCategory] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.slug, "opinion"));
      const [ciudadCategory] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.slug, "ciudad"));

      if (admin && denunciaCategory) {
        await db.insert(articlesTable).values([
          {
            title: "Las obras inconclusas de la Municipalidad de San Ramón: un presupuesto que desaparece",
            slug: "obras-inconclusas-municipalidad-san-ramon",
            summary: "Tres proyectos de infraestructura que recibieron financiamiento en 2023 siguen sin completarse. Los vecinos exigen explicaciones y el alcalde guarda silencio.",
            content: "<h2>El dinero llegó, las obras no</h2><p>Durante el año fiscal 2023, la Municipalidad Provincial de Chanchamayo recibió más de 4 millones de soles destinados a proyectos de infraestructura en San Ramón. Hoy, a mediados de 2024, ninguna de las tres obras principales muestra avances significativos.</p><p>Los vecinos del barrio La Florida llevan meses esperando la culminación del parque prometido durante la campaña electoral del actual alcalde. El presupuesto aprobado fue de 800 mil soles. Las excavaciones comenzaron en octubre, pero desde enero no hay un solo obrero trabajando en el lugar.</p><h2>Los documentos que nadie quiere ver</h2><p>A través de una solicitud de acceso a la información pública, obtuve los expedientes técnicos de las tres obras en cuestión. Lo que encontré es preocupante: las valorizaciones no coinciden con el avance físico visible, y algunos materiales que aparecen como entregados no existen en el lugar de trabajo.</p><blockquote><p>\"El alcalde nos dijo que todo estaba avanzando bien. Pero yo vengo todos los días a ver y no hay nadie trabajando.\"</p></blockquote><p>Esta es la denuncia de Juan Flores, presidente de la junta vecinal del barrio La Florida. Sus palabras resumen el sentir de decenas de familias que esperaban mejoras en su comunidad.</p><h2>El silencio oficial</h2><p>Solicité una entrevista con el alcalde y con el jefe de la Oficina de Infraestructura municipal hace tres semanas. Hasta el momento de publicar este artículo, no he recibido respuesta. El municipio tampoco ha publicado actualizaciones en su portal de transparencia desde febrero.</p>",
            categoryId: denunciaCategory.id,
            authorId: admin.id,
            status: "published",
            featured: true,
            views: 342,
            readingTime: 4,
            publishedAt: new Date("2024-03-15"),
          },
          {
            title: "Chanchamayo y el dilema del desarrollo: ¿progreso para quién?",
            slug: "chanchamayo-dilema-desarrollo-progreso",
            summary: "El boom cafetalero y la expansión del turismo generan riqueza en la región, pero los beneficios no llegan a todos por igual. Una reflexión sobre el modelo de desarrollo que necesitamos.",
            content: "<p>Chanchamayo es una de las regiones con mayor potencial de la selva central peruana. Sus valles producen algunos de los mejores cafés del mundo, su biodiversidad atrae a turistas de todos los continentes, y su ubicación estratégica la convierte en un nodo económico fundamental.</p><p>Sin embargo, mientras los indicadores macroeconómicos muestran crecimiento, una caminata por las comunidades más alejadas de San Ramón revela una realidad diferente: pobreza persistente, servicios básicos deficientes, y una sensación generalizada de que el progreso pasa de largo.</p><h2>Los que se quedan con la torta</h2><p>El café de Chanchamayo viaja hasta los mejores cafés de Berlín, Tokio y Nueva York. Las etiquetas hablan de \"productores locales\" y \"comercio justo\". Pero cuando converso con los agricultores, la historia es otra: intermediarios que compran a precios bajos, cooperativas que no siempre cumplen sus promesas, y un acceso al crédito que sigue siendo precario.</p><p>No es un problema sin solución. Hay experiencias exitosas en la región. La pregunta es por qué no son la regla sino la excepción.</p>",
            categoryId: opinionCategory?.id ?? denunciaCategory.id,
            authorId: admin.id,
            status: "published",
            featured: true,
            views: 218,
            readingTime: 5,
            publishedAt: new Date("2024-03-10"),
          },
          {
            title: "El mercado de San Ramón: historia de un centro que se está perdiendo",
            slug: "mercado-san-ramon-historia-centro",
            summary: "El mercado central de San Ramón fue durante décadas el corazón económico y social de la ciudad. Hoy, enfrenta amenazas que podrían cambiar para siempre su fisonomía.",
            content: "<p>Hay lugares que son más que lugares. El mercado central de San Ramón es uno de ellos. Desde hace más de cincuenta años, sus puestos de verduras, carnes y abarrotes han sido el escenario de conversaciones, encuentros y la vida cotidiana de nuestra ciudad.</p><p>Pero algo está cambiando. La llegada de cadenas de supermercados, el avance del comercio por internet, y años de abandono por parte de la administración municipal han golpeado duramente a los comerciantes del mercado.</p><h2>Los que siguen ahí</h2><p>Doña Carmen Quispe lleva 30 años vendiendo verduras en el mismo puesto que perteneció a su madre. A sus 67 años, no se imagina haciendo otra cosa. \"Este mercado es mi vida\", me dice mientras acomoda los tomates con una precisión que solo da la experiencia.</p><p>Pero sus ventas han caído un 40% en los últimos tres años. \"La gente ya no viene como antes. Los jóvenes compran en el supermercado o por el celular\".</p>",
            categoryId: ciudadCategory?.id ?? denunciaCategory.id,
            authorId: admin.id,
            status: "published",
            featured: false,
            views: 156,
            readingTime: 3,
            publishedAt: new Date("2024-02-28"),
          },
        ]);
        logger.info("Seeded sample articles");
      }
    }

    logger.info("Database seed completed");
  } catch (err) {
    logger.error({ err }, "Seed failed");
  }
}
