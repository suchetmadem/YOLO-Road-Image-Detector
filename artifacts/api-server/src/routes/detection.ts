import { Router, type IRouter } from "express";
import { DetectRoadImageBody } from "@workspace/api-zod";
import { detectRoadImage } from "../lib/inference-worker";

const router: IRouter = Router();

router.post("/detect", async (req, res) => {
  const parsed = DetectRoadImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid image to analyze." });
    return;
  }

  try {
    const result = await detectRoadImage(parsed.data.imageDataUrl);
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "YOLO inference failed");
    res.status(500).json({ error: "The detector could not process that image." });
  }
});

export default router;