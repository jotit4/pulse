/**
 * Seed de la base de datos.
 *
 * Parte pura: `seedDatabase(db)` → importable sin efectos secundarios.
 * Parte CLI: bloque al final del archivo, sólo se ejecuta cuando se corre
 * directamente con `tsx src/db/seed.ts`.
 */

import { hashPassword } from "../auth/password";
import type { Database } from "./index";
import { bookmarks, follows, likes, notifications, sessions, tweets, users } from "./schema";

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

/**
 * Replies: [autorIdx, parentTweetGlobalIdx, contenido]
 *
 * Índices globales de tweets originales (misma secuencia que tweetsInserted):
 *   luna   0-2  | marcos  3-6  | sofia   7-9  | diego  10-13
 *   valentina 14-16 | andres 17-19 | camila 20-22 | nicolas 23-26
 *   isabella 27-29  | mateo  30-33 | renata 34-36 | emilio 37-40
 */
const REPLIES_CONFIG: [number, number, string][] = [
  // --- Hilo 1: luna responde a marcos (tweet 3: índices parciales Postgres) ---
  // Nivel 1: luna → marcos[0]
  [
    0,
    3,
    "Totalmente de acuerdo, Marcos. Los uso en la tabla de eventos y la diferencia es brutal.",
  ],
  // Nivel 2: marcos → la reply de luna (se resuelve después de insertar las replies)
  // Nivel 3: diego → la reply de marcos (ídem)

  // --- Hilo 2: sofia y valentina debaten el artículo de sofia (tweet 7) ---
  [
    4,
    7,
    "Artículo impresionante, Sofía. ¿Tenés algún dato sobre burbujas de filtro en redes profesionales?",
  ],
  [
    2,
    7,
    "Gracias, Valentina! Sí, lo analizo en el apartado 3. Spoiler: LinkedIn no escapa al efecto.",
  ],

  // --- Hilo 3: replies al tweet de diego sobre LLMs (tweet 10) ---
  [
    1,
    10,
    "Completamente de acuerdo. La gente los usa como Google y después se queja de las alucinaciones.",
  ],
  [
    2,
    10,
    "El pensamiento crítico tampoco viene de serie con un título universitario, lamentablemente.",
  ],

  // --- Hilo 4: camila pregunta a luna sobre el rediseño (tweet 0) ---
  [
    6,
    0,
    "¡Luna, el modo oscuro quedó espectacular! ¿Qué paleta usaste para los textos secundarios?",
  ],
  [
    0,
    0,
    "Gracias, Camila 🙏 Usé #A8A8B3 para texto secundario y #E1E1E6 para el primario. Contraste 7:1.",
  ],

  // --- Hilo 5: mateo y nicolás hablan de infra (tweet 30: Kubernetes) ---
  [
    7,
    30,
    "La distinción es perfecta, Mateo. La gente se asusta con el 'mucho' cuando en realidad lo complejo es el modelo mental.",
  ],
  [9, 30, "Primer día con k8s: kubectl get pods. Segundo día: ¿qué es un CrashLoopBackOff? 😅"],

  // --- Replies individuales a los tweets de luna_garcia para la demo ---
  [1, 1, "El ratio 4.5:1 es el mínimo. Para texto pequeño el AA exige 7:1. Gran recordatorio."],
  [
    7,
    2,
    "Las microtransiciones en iOS 7 fueron un antes y un después. Cambiaron las expectativas del usuario para siempre.",
  ],

  // --- Replies individuales a tweets de marcos_dev para la demo ---
  [
    0,
    5,
    "Drizzle es el primer ORM que no me hace sentir que estoy luchando contra el tipado. Gracias por el tip.",
  ],
  [9, 6, "Hono + Bun acá. Rendimiento incluso mejor. Vale la pena el salto."],

  // --- Replies a tweets de sofia_mm para la demo ---
  [
    4,
    8,
    "El periodismo de datos también tiene su narrativa. Los números sin historia no mueven a nadie.",
  ],
  [
    3,
    9,
    "Esa respuesta de la IA sobre los sueños es de lo más honesto que le escuché decir a un modelo 😂",
  ],
];

/**
 * Notificaciones.
 * [userId_idx, actorId_idx, type, tweetGlobalIdx | null, read]
 * Tipos: "follow" | "like" | "reply"
 * NUNCA actorId === userId.
 */
const NOTIFICATIONS_CONFIG: [
  number,
  number,
  "follow" | "like" | "reply",
  number | null,
  boolean,
][] = [
  // ── Notificaciones para luna_garcia (idx 0) ──────────────────────────────
  // follows recibidos
  [0, 1, "follow", null, false], // marcos la siguió
  [0, 2, "follow", null, false], // sofia la siguió
  [0, 4, "follow", null, true], // valentina la siguió (leída)
  [0, 5, "follow", null, false], // andres la siguió
  [0, 6, "follow", null, true], // camila la siguió (leída)
  [0, 8, "follow", null, false], // isabella la siguió
  [0, 10, "follow", null, false], // renata la siguió
  // likes recibidos (tweet 0: rediseño, tweet 1: tip accesibilidad)
  [0, 1, "like", 0, true], // marcos likeó su tweet (leído)
  [0, 5, "like", 0, false], // andres likeó su tweet
  [0, 10, "like", 1, false], // renata likeó su tip
  // replies recibidas (6 y 0 en la config de replies arriba → tweets 0 y 1)
  [0, 6, "reply", 0, false], // camila respondió tweet 0
  [0, 1, "reply", 1, false], // marcos respondió tweet 1

  // ── Notificaciones para marcos_dev (idx 1) ───────────────────────────────
  [1, 0, "follow", null, false], // luna lo siguió
  [1, 3, "follow", null, false], // diego lo siguió
  [1, 7, "follow", null, true], // nicolás lo siguió (leído)
  [1, 9, "follow", null, false], // mateo lo siguió
  // likes
  [1, 0, "like", 3, false], // luna likeó índices parciales
  [1, 3, "like", 3, false], // diego likeó índices parciales
  [1, 7, "like", 3, true], // nicolás likeó índices parciales (leído)
  [1, 0, "like", 4, false], // luna likeó N+1 query
  // replies
  [1, 0, "reply", 3, false], // luna respondió tweet 3 (índices parciales)
  [1, 0, "reply", 5, false], // luna respondió tweet 5 (Drizzle ORM)
  [1, 9, "reply", 6, false], // mateo respondió tweet 6 (Hono)

  // ── Notificaciones para sofia_mm (idx 2) ─────────────────────────────────
  [2, 0, "follow", null, false], // luna la siguió
  [2, 4, "follow", null, false], // valentina la siguió
  [2, 6, "follow", null, true], // camila la siguió (leído)
  [2, 10, "follow", null, false], // renata la siguió
  // likes
  [2, 4, "like", 7, false], // valentina likeó su artículo
  [2, 6, "like", 7, true], // camila likeó su artículo (leído)
  // replies
  [2, 4, "reply", 7, false], // valentina respondió tweet 7
  [2, 1, "reply", 10, false], // marcos respondió tweet 10 (de diego, pero sofia también recibe del debate)
  [2, 3, "reply", 9, false], // diego respondió tweet 9

  // ── Notificaciones para otros usuarios (mezcla leídas/no leídas) ─────────
  // diego (idx 3)
  [3, 1, "follow", null, true],
  [3, 7, "follow", null, false],
  [3, 0, "like", 10, false],
  [3, 1, "reply", 10, false],
  [3, 2, "reply", 10, false],
  // valentina (idx 4)
  [4, 2, "follow", null, false],
  [4, 8, "follow", null, true],
  [4, 11, "follow", null, false],
  [4, 2, "like", 14, false],
  [4, 8, "like", 14, true],
  [4, 2, "reply", 7, false],
  // andres (idx 5)
  [5, 6, "follow", null, true],
  [5, 6, "like", 17, false],
  [5, 6, "like", 18, false],
  // camila (idx 6)
  [6, 0, "follow", null, false],
  [6, 5, "follow", null, true],
  [6, 5, "like", 20, false],
  [6, 0, "reply", 0, false],
  // nicolás (idx 7)
  [7, 1, "follow", null, true],
  [7, 3, "follow", null, false],
  [7, 9, "follow", null, false],
  [7, 3, "like", 25, false],
  [7, 9, "like", 24, true],
  [7, 9, "reply", 30, false],
  // isabella (idx 8)
  [8, 0, "follow", null, false],
  [8, 4, "follow", null, true],
  [8, 10, "follow", null, false],
  [8, 4, "like", 27, false],
  [8, 10, "like", 28, false],
  // mateo (idx 9)
  [9, 1, "follow", null, false],
  [9, 7, "follow", null, true],
  [9, 7, "like", 30, false],
  [9, 7, "reply", 30, false],
  [9, 1, "reply", 6, false],
  // renata (idx 10)
  [10, 0, "follow", null, true],
  [10, 2, "follow", null, false],
  [10, 8, "follow", null, false],
  [10, 8, "like", 34, false],
  [10, 0, "like", 34, false],
  // emilio (idx 11)
  [11, 3, "follow", null, false],
  [11, 4, "follow", null, true],
  [11, 9, "follow", null, false],
  [11, 4, "like", 37, false],
  [11, 2, "like", 37, true],
];

/**
 * Bookmarks: [userId_idx, tweetGlobalIdx]
 */
const BOOKMARKS_CONFIG: [number, number][] = [
  // ── luna_garcia guarda tweets técnicos de marcos y nicolás ───────────────
  [0, 3], // índices parciales Postgres (marcos)
  [0, 5], // Drizzle ORM (marcos)
  [0, 24], // SQL 50 años (nicolás)
  [0, 32], // alertas accionables (mateo)

  // ── marcos_dev guarda tweets de diseño y datos ───────────────────────────
  [1, 0], // rediseño app (luna)
  [1, 1], // tip accesibilidad WCAG (luna)
  [1, 34], // UX sin investigación (renata)
  [1, 23], // dbt + Snowflake (nicolás)

  // ── sofia_mm guarda tweets de tecnología que puede citar ─────────────────
  [2, 10], // LLMs no son oráculos (diego)
  [2, 11], // open source (diego)
  [2, 37], // fallo nº 3 (emilio)
  [2, 24], // SQL subestimado (nicolás)

  // ── otros usuarios ────────────────────────────────────────────────────────
  [3, 0], // diego guarda rediseño luna
  [3, 14], // diego guarda ronda seed valentina
  [4, 7], // valentina guarda artículo sofia
  [4, 15], // valentina guarda product-market fit
  [5, 20], // andres guarda EP de camila
  [5, 30], // andres guarda tweet kubernetes de mateo
  [6, 1], // camila guarda tip accesibilidad
  [6, 7], // camila guarda artículo sofia
  [7, 4], // nicolás guarda tip N+1 marcos
  [7, 30], // nicolás guarda kubernetes mateo
  [8, 14], // isabella guarda ronda valentina
  [8, 27], // isabella guarda roadmap Q3 (propio — misma tabla, válido como "guardar para revisar")
  [9, 23], // mateo guarda dbt+Snowflake nicolás
  [9, 3], // mateo guarda índices parciales marcos
  [10, 27], // renata guarda roadmap Q3 isabella
  [10, 1], // renata guarda tip accesibilidad luna
  [11, 14], // emilio guarda ronda valentina
  [11, 7], // emilio guarda artículo sofia
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
  await db.delete(notifications);
  await db.delete(bookmarks);
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

  // 4. Insertar tweets originales (sin parentId)
  const allTweetValues: { authorId: string; content: string }[] = [];
  for (let i = 0; i < usersInserted.length; i++) {
    const autor = usersInserted[i]!;
    const contenidos = TWEETS_POR_USUARIO[i] ?? [];
    for (const content of contenidos) {
      allTweetValues.push({ authorId: autor.id, content });
    }
  }
  const tweetsInserted = await db.insert(tweets).values(allTweetValues).returning();

  // 4b. Insertar replies de primer nivel (referenciando tweets originales por índice global)
  //     REPLIES_CONFIG[n] = [autorIdx, parentTweetGlobalIdx, contenido]
  //     Los primeros 2 de la lista se usan como padres de hilos de nivel 2/3 → se insertan en orden.
  const repliesL1Values = REPLIES_CONFIG.map(([autorIdx, parentGlobalIdx, content]) => ({
    authorId: usersInserted[autorIdx]!.id,
    content,
    parentId: tweetsInserted[parentGlobalIdx]!.id,
  }));
  const repliesL1Inserted = await db.insert(tweets).values(repliesL1Values).returning();

  // 4c. Hilos de 2º y 3er nivel:
  //     - Hilo 1: marcos responde a la reply de luna (repliesL1Inserted[0])
  //     - Hilo 1 nivel 3: diego responde a la reply de marcos
  const replyL2Marcos = await db
    .insert(tweets)
    .values({
      authorId: usersInserted[1]!.id, // marcos
      content:
        "¡Exacto, Luna! Y combinados con índices compuestos el ganador total. Benchmarkeé un 40% de mejora en la consulta de eventos.",
      parentId: repliesL1Inserted[0]!.id,
    })
    .returning();

  await db.insert(tweets).values({
    authorId: usersInserted[3]!.id, // diego
    content:
      "Ese 40% es conservador. En lecturas analíticas con condición de rango llegué al 60%. Los índices parciales son magia negra bien aplicada.",
    parentId: replyL2Marcos[0]!.id,
  });

  // Construimos el array completo de replies para referencias posteriores (notificaciones)
  // repliesL1Inserted[0] = luna→marcos[3]  (usado en notificaciones como "reply" a tweet 3)

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

  // 7. Insertar bookmarks
  const bookmarkValues = BOOKMARKS_CONFIG.flatMap(([userIdx, tweetIdx]) => {
    const user = usersInserted[userIdx];
    const tweet = tweetsInserted[tweetIdx];
    if (!user || !tweet) return [];
    return [{ userId: user.id, tweetId: tweet.id }];
  });
  await db.insert(bookmarks).values(bookmarkValues);

  // 8. Insertar notificaciones
  //    NOTIFICATIONS_CONFIG: [userId_idx, actorId_idx, type, tweetGlobalIdx | null, read]
  const notificationValues = NOTIFICATIONS_CONFIG.flatMap(
    ([userIdx, actorIdx, type, tweetGlobalIdx, read]) => {
      const user = usersInserted[userIdx];
      const actor = usersInserted[actorIdx];
      if (!user || !actor) return [];
      const tweetId = tweetGlobalIdx !== null ? (tweetsInserted[tweetGlobalIdx]?.id ?? null) : null;
      return [{ userId: user.id, actorId: actor.id, type, tweetId, read }];
    },
  );
  await db.insert(notifications).values(notificationValues);
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
  console.log(`   Usuarios insertados      : ${USUARIOS.length}`);
  console.log(`   Tweets originales        : ${TWEETS_POR_USUARIO.flat().length}`);
  console.log(`   Replies insertadas       : ${REPLIES_CONFIG.length + 2}`); // +2 hilos L2/L3
  console.log(`   Follows insertados       : ${FOLLOWS_IDX.length}`);
  console.log(`   Likes insertados         : ${LIKES_CONFIG.length}`);
  console.log(`   Bookmarks insertados     : ${BOOKMARKS_CONFIG.length}`);
  console.log(`   Notificaciones insertadas: ${NOTIFICATIONS_CONFIG.length}`);
  console.log("");
  console.log("Credenciales de ejemplo (todos los usuarios comparten el mismo password):");
  console.log(`   Password: ${PASSWORD_EJEMPLO}`);
  console.log("   Usuarios de prueba:");
  for (const u of USUARIOS.slice(0, 3)) {
    console.log(`     - ${u.username} / ${u.email}`);
  }
}
