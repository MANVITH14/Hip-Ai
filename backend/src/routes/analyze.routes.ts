import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { AppError } from "../utils/app-error";
import { analyzeImageWithAI } from "../services/ai.service";

const router = Router();

const analyzeSchema = z.object({
  imageId: z.string().min(1)
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const payload = analyzeSchema.parse(req.body);

    const image = await prisma.xRayImage.findUnique({
      where: { id: payload.imageId }
    });

    if (!image) {
      throw new AppError("Image not found", 404);
    }

    if (image.userId !== req.user!.userId) {
      throw new AppError("Not allowed to analyze this image", 403);
    }

    const aiMetrics = await analyzeImageWithAI(image.filePath);

    const result = await prisma.aIResult.create({
      data: {
        xRayImageId: image.id,
        symmetryScore: aiMetrics.symmetryScore,
        symmetryPass: aiMetrics.symmetryPass,
        coccyxDistanceCm: aiMetrics.coccyxDistanceCm,
        coccyxPass: aiMetrics.coccyxPass,
        trochanterSizeMm: aiMetrics.trochanterSizeMm,
        trochanterPass: aiMetrics.trochanterPass,
        overallPass: aiMetrics.overallPass,
        confidence: aiMetrics.confidence
      }
    });

    res.json({
      message: "Analysis completed",
      imageId: image.id,
      result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
