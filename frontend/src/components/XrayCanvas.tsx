import { useEffect, useRef } from "react";
import type { AIResult } from "../types";

type XrayCanvasProps = {
  imageUrl: string | null;
  result: AIResult | null;
  showDebugGrid: boolean;
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

function isWithinBounds(p: { x: number; y: number }, width: number, height: number): boolean {
  return p.x >= 0 && p.x <= width - 1 && p.y >= 0 && p.y <= height - 1;
}

function drawDebugGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rowSpacingMm: number | undefined,
  colSpacingMm: number | undefined
): void {
  const step = 50;
  ctx.save();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.25)";
  ctx.fillStyle = "rgba(125, 211, 252, 0.75)";
  ctx.lineWidth = 1;
  ctx.font = "500 11px 'IBM Plex Mono', monospace";

  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.fillText(`${x}`, x + 2, 12);
  }

  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillText(`${y}`, 2, y - 2 < 12 ? y + 12 : y - 2);
  }

  const spacingLabel =
    rowSpacingMm !== undefined && colSpacingMm !== undefined
      ? `pixelSpacing row=${rowSpacingMm.toFixed(4)}mm col=${colSpacingMm.toFixed(4)}mm`
      : "pixelSpacing unavailable";
  const naturalLabel = `natural ${width}x${height}`;
  ctx.fillStyle = "rgba(248, 250, 252, 0.95)";
  ctx.fillText(naturalLabel, 12, height - 24);
  ctx.fillText(spacingLabel, 12, height - 8);
  ctx.restore();
}

export function XrayCanvas({ imageUrl, result, showDebugGrid }: XrayCanvasProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageUrl) return;
    const canvas = canvasRef.current;
    const imgElement = imageRef.current;

    const draw = () => {
      const naturalWidth = imgElement.naturalWidth;
      const naturalHeight = imgElement.naturalHeight;
      if (!naturalWidth || !naturalHeight) return;

      canvas.width = naturalWidth;
      canvas.height = naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (showDebugGrid) {
        drawDebugGrid(
          ctx,
          naturalWidth,
          naturalHeight,
          result?.calibration?.rowSpacingMm,
          result?.calibration?.colSpacingMm
        );
      }

      if (!result?.landmarks) return;

      const coccyx = result.landmarks.coccyx;
      const pubic = result.landmarks.pubic_symphysis;
      const troStart = result.landmarks.left_trochanter_start;
      const troEnd = result.landmarks.left_trochanter_end;

      if (!(coccyx && pubic && troStart && troEnd)) return;

      const points = [
        { name: "coccyx", point: coccyx },
        { name: "pubic_symphysis", point: pubic },
        { name: "left_trochanter_start", point: troStart },
        { name: "left_trochanter_end", point: troEnd }
      ];
      for (const { name, point } of points) {
        if (!isWithinBounds(point, naturalWidth, naturalHeight)) {
          console.error(`Landmark out of bounds: ${name}`, {
            point,
            naturalWidth,
            naturalHeight
          });
          return;
        }
      }

      marker(ctx, coccyx, result.coccyxPass ? "#2dd4bf" : "#ef4444");
      marker(ctx, pubic, result.coccyxPass ? "#2dd4bf" : "#ef4444");
      marker(ctx, troStart, result.trochanterPass ? "#2dd4bf" : "#ef4444");
      marker(ctx, troEnd, result.trochanterPass ? "#2dd4bf" : "#ef4444");

      line(ctx, coccyx, pubic, result.coccyxPass ? "#14b8a6" : "#ef4444", 3);
      line(ctx, troStart, troEnd, result.trochanterPass ? "#14b8a6" : "#ef4444", 3);

      const coccyxMid = { x: (coccyx.x + pubic.x) / 2, y: (coccyx.y + pubic.y) / 2 };
      const troMid = { x: (troStart.x + troEnd.x) / 2, y: (troStart.y + troEnd.y) / 2 };

      const coccyxPx = result.measurements?.coccyxPubic?.distancePx;
      const troPx = result.measurements?.trochanter?.distancePx;
      text(
        ctx,
        `${result.coccyxDistanceCm.toFixed(2)} cm${coccyxPx !== undefined ? ` (${coccyxPx.toFixed(2)} px)` : ""}`,
        coccyxMid.x + 8,
        coccyxMid.y - 8,
        "#f8fafc"
      );
      text(
        ctx,
        `${result.trochanterSizeMm.toFixed(2)} mm${troPx !== undefined ? ` (${troPx.toFixed(2)} px)` : ""}`,
        troMid.x + 8,
        troMid.y - 8,
        "#f8fafc"
      );

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

    if (imgElement.complete) {
      draw();
    } else {
      imgElement.onload = draw;
    }
  }, [imageUrl, result, showDebugGrid]);

  if (!imageUrl) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-2 flex justify-center overflow-hidden">
      <div className="relative inline-block max-w-full">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="X-ray"
          className="block max-h-[560px] w-auto rounded-xl object-contain"
          style={{ width: "100%", height: "auto" }}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none rounded-xl"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%"
          }}
        />
      </div>
    </div>
  );
}
