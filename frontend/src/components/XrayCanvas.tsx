import { useEffect, useRef } from "react";
import type { AIResult } from "../types";

type XrayCanvasProps = {
  imageUrl: string | null;
  result: AIResult | null;
};

function line(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  color: string,
  width = 2
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function marker(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color: string): void {
  ctx.font = "600 14px 'IBM Plex Mono', monospace";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

export function XrayCanvas({ imageUrl, result }: XrayCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, image.width, image.height);

      if (!result?.landmarks) return;

      const coccyx = result.landmarks.coccyx;
      const pubic = result.landmarks.pubic_symphysis;
      const troStart = result.landmarks.left_trochanter_start;
      const troEnd = result.landmarks.left_trochanter_end;

      if (!(coccyx && pubic && troStart && troEnd)) return;

      marker(ctx, coccyx, result.coccyxPass ? "#2dd4bf" : "#ef4444");
      marker(ctx, pubic, result.coccyxPass ? "#2dd4bf" : "#ef4444");
      marker(ctx, troStart, result.trochanterPass ? "#2dd4bf" : "#ef4444");
      marker(ctx, troEnd, result.trochanterPass ? "#2dd4bf" : "#ef4444");

      line(ctx, coccyx, pubic, result.coccyxPass ? "#14b8a6" : "#ef4444", 3);
      line(ctx, troStart, troEnd, result.trochanterPass ? "#14b8a6" : "#ef4444", 3);

      const coccyxMid = { x: (coccyx.x + pubic.x) / 2, y: (coccyx.y + pubic.y) / 2 };
      const troMid = { x: (troStart.x + troEnd.x) / 2, y: (troStart.y + troEnd.y) / 2 };

      text(ctx, `${result.coccyxDistanceCm.toFixed(2)} cm`, coccyxMid.x + 8, coccyxMid.y - 8, "#f8fafc");
      text(ctx, `${result.trochanterSizeMm.toFixed(2)} mm`, troMid.x + 8, troMid.y - 8, "#f8fafc");

      text(
        ctx,
        `Symmetry dev: ${result.symmetryScore.toFixed(2)}%`,
        20,
        26,
        result.symmetryPass ? "#22c55e" : "#ef4444"
      );

      if (!result.coccyxPass) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(coccyxMid.x - 55, coccyxMid.y - 34, 130, 48);
      }
      if (!result.trochanterPass) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(troMid.x - 45, troMid.y - 34, 145, 48);
      }
      if (!result.symmetryPass) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 280, 28);
      }
    };
    image.src = imageUrl;
  }, [imageUrl, result]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-2">
      <canvas ref={canvasRef} className="max-h-[560px] w-full rounded-xl object-contain" />
    </div>
  );
}
