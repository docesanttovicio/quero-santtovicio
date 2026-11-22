import { ImageResponse } from "next/og";
import { MARCA_COR, marcaDataUri } from "@/lib/marca";

// Imagem do card quando o link é compartilhado (WhatsApp, Instagram, etc.).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Santto Vício · Encomendas de Natal";

export default function ImagemCard() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: MARCA_COR }}>
        <img src={marcaDataUri()} width={630} height={630} alt="" />
      </div>
    ),
    size,
  );
}
