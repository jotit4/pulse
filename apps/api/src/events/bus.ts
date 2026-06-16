/**
 * Event-bus en proceso para tweets en tiempo real.
 *
 * TRADE-OFF: Esta implementación es un singleton en memoria que funciona
 * perfectamente con una sola instancia de la API. Si en el futuro se despliegan
 * múltiples instancias (horizontal scaling), habría que reemplazarlo por un
 * sistema distribuido como Redis Pub/Sub para que los eventos cruzaren
 * instancias.
 */
import { EventEmitter } from "node:events";
import type { TweetView } from "@pulse/shared";

/** Payload interno del bus: TweetView público + authorId para filtrar visibilidad. */
export interface TweetEvent {
  tweet: TweetView;
  /** Id del autor; se usa para decidir si un viewer debe recibir el evento. */
  authorId: string;
}

type TweetListener = (event: TweetEvent) => void;

export class TweetBus {
  private readonly emitter = new EventEmitter();
  private static readonly EVENT = "tweet";

  constructor() {
    // Evita warnings de Node.js cuando hay muchos viewers conectados simultáneamente.
    this.emitter.setMaxListeners(0);
  }

  /** Publica un nuevo tweet al bus para que todos los viewers lo evalúen. */
  publishTweet(payload: TweetEvent): void {
    this.emitter.emit(TweetBus.EVENT, payload);
  }

  /** Registra un listener que recibirá cada tweet publicado. */
  subscribe(listener: TweetListener): void {
    this.emitter.on(TweetBus.EVENT, listener);
  }

  /** Elimina un listener previamente registrado (llamar al desconectar el cliente). */
  unsubscribe(listener: TweetListener): void {
    this.emitter.off(TweetBus.EVENT, listener);
  }
}

/** Instancia singleton del bus de tweets. */
export const tweetBus = new TweetBus();
