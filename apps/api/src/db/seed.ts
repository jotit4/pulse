/**
 * Seed de la base de datos.
 *
 * Parte pura: `seedDatabase(db)` → importable sin efectos secundarios.
 * Parte CLI: bloque al final del archivo, sólo se ejecuta cuando se corre
 * directamente con `tsx src/db/seed.ts`.
 */

import { hashPassword } from "../auth/password";
import type { Database } from "./index";
import { follows, likes, sessions, tweets, users } from "./schema";

// ---------------------------------------------------------------------------
// Datos de ejemplo
// ---------------------------------------------------------------------------

const PASSWORD_EJEMPLO = "password123";

const USUARIOS = [
  {
    username: "luna_garcia",
    name: "Luna García",
    email: "luna@pulse.dev",
    bio: "Diseñadora UX apasionada por la accesibilidad 🎨",
  },
  {
    username: "marcos_dev",
    name: "Marcos Rodríguez",
    email: "marcos@pulse.dev",
    bio: "Desarrollador backend. Me gusta el café y el código limpio.",
  },
  {
    username: "sofia_mm",
    name: "Sofía Martínez",
    email: "sofia@pulse.dev",
    bio: "Periodista digital. Cuento historias con datos.",
  },
  {
    username: "diego_tech",
    name: "Diego Fernández",
    email: "diego@pulse.dev",
    bio: "Entusiasta de la IA y el open source.",
  },
  {
    username: "valentina_r",
    name: "Valentina Ruiz",
    email: "valentina@pulse.dev",
    bio: "Emprendedora | Co-fundadora de @StartupBA",
  },
  {
    username: "andres_lp",
    name: "Andrés López",
    email: "andres@pulse.dev",
    bio: "Fotógrafo urbano. Buenos Aires desde el lente.",
  },
  {
    username: "camila_ve",
    name: "Camila Vega",
    email: "camila@pulse.dev",
    bio: "Música indie. Guitarrista. A veces escribo poesía.",
  },
  {
    username: "nicolás_pe",
    name: "Nicolás Pereira",
    email: "nicolas@pulse.dev",
    bio: "Ingeniero de datos. Amo el SQL y los dashboards.",
  },
  {
    username: "isabella_m",
    name: "Isabella Morales",
    email: "isabella@pulse.dev",
    bio: "Product manager en una fintech. Mamá de dos gatos.",
  },
  {
    username: "mateo_ar",
    name: "Mateo Acosta",
    email: "mateo@pulse.dev",
    bio: "DevOps & SRE. Kubernetes me quita el sueño.",
  },
  {
    username: "renata_cl",
    name: "Renata Castillo",
    email: "renata@pulse.dev",
    bio: "Investigadora en UX. Docente universitaria.",
  },
  {
    username: "emilio_bv",
    name: "Emilio Bravo",
    email: "emilio@pulse.dev",
    bio: "Startup advisor. Fallé 3 veces; la cuarta va.",
  },
];

/** Tweets por usuario (índice alineado con USUARIOS). */
const TWEETS_POR_USUARIO: string[][] = [
  // luna_garcia
  [
    "Acabo de terminar el rediseño de la app. El modo oscuro quedó ✨",
    "Tip de accesibilidad: el contraste mínimo WCAG AA es 4.5:1. ¡Usálo!",
    "Las microtransiciones marcan la diferencia entre una app mediocre y una memorable.",
  ],
  // marcos_dev
  [
    "Postgres tiene índices parciales y muy poca gente los usa. Gran oportunidad.",
    "Si tu API tarda >200 ms en devolver datos simples, revisá las N+1 queries.",
    "Drizzle ORM: finalmente un ORM TypeScript que no se pelea con el type system.",
    "Hono + Node 22 en producción desde hace 3 meses. Cero problemas.",
  ],
  // sofia_mm
  [
    "Nuevo artículo: «Cómo los algoritmos de recomendación moldean nuestra percepción de la realidad».",
    "El periodismo de datos no reemplaza la narrativa; la potencia.",
    "Entrevistar a una IA es raro. Le pregunté qué sueña y me respondió con probabilidades.",
  ],
  // diego_tech
  [
    "Los LLMs son herramientas, no oráculos. El pensamiento crítico sigue siendo tuyo.",
    "Open source > closed source en la mayoría de los casos para infraestructura.",
    "Empecé a contribuir a un proyecto de IA generativa. Primera PR aceptada 🎉",
    "La comunidad de Rust sigue siendo la más amigable para aprender.",
  ],
  // valentina_r
  [
    "Cerramos la ronda seed. ¡Gracias a todos los que creyeron desde el día 1!",
    "Lección aprendida: el product-market fit no es un destino, es un proceso continuo.",
    "Busco cofundador técnico para nuestra próxima vertical. DM abierto.",
  ],
  // andres_lp
  [
    "San Telmo a las 7 AM antes de que lleguen los turistas. Pura magia. 📷",
    "La lluvia sobre el adoquín porteño es el mejor filtro natural.",
    "Subí una galería nueva en mi sitio. Tema: 'La ciudad que nunca se queda quieta'.",
  ],
  // camila_ve
  [
    "Grabando el EP esta semana. Tres años de trabajo resumidos en 5 canciones.",
    "La guitarra española en el rock progresivo no recibe el crédito que merece.",
    "¿Alguien más siente que las letras se escriben solas a las 2 AM?",
  ],
  // nicolás_pe
  [
    "dbt + Snowflake + Metabase: el stack de datos que recomiendaría a cualquier startup.",
    "Una ventana deslizante bien aplicada puede ahorrarte millones de filas en tu warehouse.",
    "Vizualizaciones que mienten: hilo sobre escalas truncadas y cómo detectarlas. 🧵",
    "SQL tiene 50 años y sigue siendo el lenguaje más subestimado del mundo.",
  ],
  // isabella_m
  [
    "Roadmap Q3 cerrado. 14 features priorizadas con el framework RICE. Empieza el caos.",
    "Los usuarios te dicen lo que quieren, pero te muestran lo que necesitan. Observá.",
    "Migramos del NPS al Customer Effort Score. La diferencia es enorme.",
  ],
  // mateo_ar
  [
    "Kubernetes no es complicado. Kubernetes es MUCHO. Hay diferencia.",
    "Hoy automaticé el último deploy manual que quedaba. Victoria pequeña, gran paz mental.",
    "Monitoreo sin alertas accionables es sólo ruido. Menos dashboards, más signal.",
    "GitOps cambió cómo duermo. El infra como código es terapéutico.",
  ],
  // renata_cl
  [
    "Publicamos el paper sobre fatiga de formularios. 73% de los usuarios abandona en el paso 3.",
    "El test de los 5 segundos sigue siendo uno de los métodos más baratos y efectivos.",
    "UX sin investigación es sólo arte. Importante, pero incompleto.",
  ],
  // emilio_bv
  [
    "Fallo nº 3: aprendí más en 6 meses que en 3 años de universidad. Sin arrepentimientos.",
    "El venture capital no es el único camino. El bootstrapping tiene su belleza.",
    "Consejo de viejo: validá antes de construir. Siempre.",
    "Mentor de la semana: @valentina_r, que me enseñó a fallar rápido y aprender más rápido.",
  ],
];

/**
 * Pares de follows (follower_index → following_index) usando índices de USUARIOS.
 * Generamos un grafo cruzado denso para que el timeline sea interesante.
 */
const FOLLOWS_IDX: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 6],
  [1, 0],
  [1, 3],
  [1, 7],
  [1, 9],
  [2, 0],
  [2, 4],
  [2, 8],
  [2, 10],
  [3, 1],
  [3, 7],
  [3, 9],
  [3, 11],
  [4, 0],
  [4, 2],
  [4, 11],
  [5, 0],
  [5, 6],
  [5, 10],
  [6, 0],
  [6, 2],
  [6, 5],
  [7, 1],
  [7, 3],
  [7, 9],
  [8, 0],
  [8, 4],
  [8, 10],
  [9, 1],
  [9, 3],
  [9, 7],
  [10, 0],
  [10, 2],
  [10, 8],
  [11, 3],
  [11, 4],
  [11, 9],
];

/**
 * Pares de likes (usuario_index → tweet_global_index).
 * El tweet_global_index recorre la lista plana de todos los tweets en el mismo
 * orden que se insertan (usuario 0 primero, sus tweets en orden, etc.).
 */
const LIKES_CONFIG: [number, number][] = [
  // luna likea tweets de marcos y diego
  [0, 3],
  [0, 4],
  [0, 12],
  // marcos likea tweets de luna y nicolás
  [1, 0],
  [1, 1],
  [1, 24],
  // sofia likea tweets de valentina y emilio
  [2, 13],
  [2, 36],
  [2, 37],
  // diego likea tweets de marcos y nicolás
  [3, 3],
  [3, 5],
  [3, 25],
  // valentina likea tweets de sofia y emilio
  [4, 7],
  [4, 8],
  [4, 38],
  // andrés likea tweets de camila y luna
  [5, 19],
  [5, 20],
  [5, 0],
  // camila likea tweets de andrés y sofia
  [6, 16],
  [6, 17],
  [6, 7],
  // nicolás likea tweets de marcos y mateo
  [7, 3],
  [7, 4],
  [7, 29],
  // isabella likea tweets de valentina y renata
  [8, 13],
  [8, 14],
  [8, 32],
  // mateo likea tweets de nicolás y diego
  [9, 24],
  [9, 25],
  [9, 12],
  // renata likea tweets de isabella y luna
  [10, 27],
  [10, 28],
  [10, 1],
  // emilio likea tweets de valentina y renata
  [11, 13],
  [11, 32],
  [11, 33],
];

// ---------------------------------------------------------------------------
// Función pura: seedDatabase
// ---------------------------------------------------------------------------

/**
 * Inserta datos de ejemplo en la base.
 *
 * Es **idempotente**: borra primero (en orden de dependencias) y luego inserta.
 * Se puede llamar varias veces seguidas sin error.
 */
export async function seedDatabase(db: Database): Promise<void> {
  // 1. Borrar en orden de dependencias (hijos antes que padres)
  await db.delete(likes);
  await db.delete(follows);
  await db.delete(tweets);
  await db.delete(sessions);
  await db.delete(users);

  // 2. Hashear el password de ejemplo (único para todos los usuarios)
  const passwordHash = await hashPassword(PASSWORD_EJEMPLO);

  // 3. Insertar usuarios
  const usersInserted = await db
    .insert(users)
    .values(
      USUARIOS.map((u) => ({
        username: u.username.toLowerCase(),
        name: u.name,
        email: u.email.toLowerCase(),
        bio: u.bio,
        passwordHash,
      })),
    )
    .returning();

  // 4. Insertar tweets (aplanamos la estructura por usuario)
  const allTweetValues: { authorId: string; content: string }[] = [];
  for (let i = 0; i < usersInserted.length; i++) {
    const autor = usersInserted[i]!;
    const contenidos = TWEETS_POR_USUARIO[i] ?? [];
    for (const content of contenidos) {
      allTweetValues.push({ authorId: autor.id, content });
    }
  }
  const tweetsInserted = await db.insert(tweets).values(allTweetValues).returning();

  // 5. Insertar follows
  const followValues = FOLLOWS_IDX.map(([followerIdx, followingIdx]) => ({
    followerId: usersInserted[followerIdx]!.id,
    followingId: usersInserted[followingIdx]!.id,
  }));
  await db.insert(follows).values(followValues);

  // 6. Insertar likes (validando que el índice de tweet exista)
  const likeValues = LIKES_CONFIG.flatMap(([userIdx, tweetIdx]) => {
    const user = usersInserted[userIdx];
    const tweet = tweetsInserted[tweetIdx];
    if (!user || !tweet) return [];
    return [{ userId: user.id, tweetId: tweet.id }];
  });
  await db.insert(likes).values(likeValues);
}

// ---------------------------------------------------------------------------
// CLI: sólo se ejecuta cuando este archivo es el punto de entrada
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const { loadEnv } = await import("../env.js");
  const { createDb } = await import("./index.js");

  const env = loadEnv();
  if (!env.DATABASE_URL) {
    console.error("❌ DATABASE_URL es requerida para ejecutar el seed");
    process.exit(1);
  }

  const { db, close } = createDb(env.DATABASE_URL);
  await seedDatabase(db);
  await close();

  console.log("✅ Seed completado");
  console.log(`   Usuarios insertados : ${USUARIOS.length}`);
  console.log(`   Tweets insertados   : ${TWEETS_POR_USUARIO.flat().length}`);
  console.log(`   Follows insertados  : ${FOLLOWS_IDX.length}`);
  console.log(`   Likes insertados    : ${LIKES_CONFIG.length}`);
  console.log("");
  console.log("Credenciales de ejemplo (todos los usuarios comparten el mismo password):");
  console.log(`   Password: ${PASSWORD_EJEMPLO}`);
  console.log("   Usuarios de prueba:");
  for (const u of USUARIOS.slice(0, 3)) {
    console.log(`     - ${u.username} / ${u.email}`);
  }
}
