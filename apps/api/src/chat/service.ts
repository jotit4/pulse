import { HttpError } from "../http/errors";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  reply: string;
  configured: boolean;
}

const SYSTEM_PROMPT = `Eres Pulse AI, el asistente conversacional de la red social Pulse.
Tu rol es ayudar a los usuarios de Pulse con preguntas sobre la plataforma, sugerir ideas para publicaciones, y conversar de forma amable y concisa.
Responde siempre en español. Sé amable, directo y conciso. Evita respuestas largas salvo que el usuario lo pida explícitamente.`;

/**
 * Envía el historial de mensajes a Groq y devuelve la respuesta del asistente.
 * Si no hay API key configurada, devuelve un aviso sin hacer llamada externa.
 */
export async function getChatReply(
  messages: ChatMessage[],
  groqApiKey: string | undefined,
  groqModel: string,
): Promise<ChatReply> {
  if (!groqApiKey) {
    return {
      reply:
        "⚠️ El asistente no está configurado. Por favor, configurá la variable GROQ_API_KEY para activar Pulse AI.",
      configured: false,
    };
  }

  const body = {
    model: groqModel,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
  };

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new HttpError(
      "No se pudo conectar con el servicio de IA. Intentá de nuevo más tarde.",
      503,
    );
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new HttpError(
        "El asistente alcanzó el límite de solicitudes. Esperá un momento e intentá de nuevo.",
        429,
      );
    }
    throw new HttpError(
      `Error del servicio de IA (código ${res.status}). Intentá de nuevo más tarde.`,
      502,
    );
  }

  interface GroqResponse {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  }

  const data = (await res.json()) as GroqResponse;
  const reply = data.choices[0]?.message?.content ?? "";

  if (!reply) {
    throw new HttpError("El servicio de IA devolvió una respuesta vacía.", 502);
  }

  return { reply, configured: true };
}
