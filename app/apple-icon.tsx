import { ImageResponse } from "next/og";
import { marcaDataUri } from "@/lib/marca";

// Ícone quando o cliente salva o site na tela de início do iPhone.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<img src={marcaDataUri()} width={180} height={180} alt="" />, size);
}
