import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { AppError } from "../utils/app-error";
import { analyzeImageWithAI } from "../services/ai.service";

const router = Router();

router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("Image file is required in `image` form field", 400);
    }

    const image = await prisma.xRayImage.create({
      data: {
        userId: req.user!.userId,
        filePath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size
      }
    });

    const aiMetrics = await analyzeImageWithAI(req.file.path);

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

    res.status(201).json({
      message: "Upload and analysis completed",
      image,
      result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
