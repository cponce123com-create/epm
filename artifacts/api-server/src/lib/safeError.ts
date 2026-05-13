/**
 * Devuelve un mensaje de error seguro para el cliente.
 * En producción: mensaje genérico. En desarrollo: el mensaje real.
 */
export function safeError(err: unknown): string {
  if (process.env["NODE_ENV"] !== "production") {
    return err instanceof Error ? err.message : String(err);
  }
  return "Error interno del servidor";
}
