// Endereço público oficial do site (vai nos links do WhatsApp e no aviso da loja).
// Para trocar sem mexer no código, cadastre SITE_PUBLICO na Vercel.
export const SITE = (process.env.SITE_PUBLICO || "https://quero.santtovicio.com.br").replace(/\/$/, "");
