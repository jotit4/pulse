/** Error con un status HTTP asociado; lo traduce a respuesta el handler global. */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
