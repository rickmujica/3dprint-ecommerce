/** Código corto y legible para hablar del pedido por WhatsApp: P-7K2QXM */
export function orderCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "P-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
