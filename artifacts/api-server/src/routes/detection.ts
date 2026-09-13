import { Router, type IRouter } from "express";
import { DetectRoadImageBody } from "@workspace/api-zod";
import { detectRoadImage } from "../lib/inference-worker";

const router: IRouter = Router();
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function validateImageDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return "Unsupported file type. Please choose a PNG, JPG, or JPEG image.";
  }

  const imageBytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (imageBytes.length > MAX_IMAGE_BYTES) {
    return "That image is larger than 10 MB. Choose a smaller PNG or JPG image.";
  }

  const isPng = imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = imageBytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!isPng && !isJpeg) {
    return "That image could not be read. Please choose a valid PNG or JPG file.";
  }

  return null;
}

router.post("/detect", async (req, res) => {
  const parsed = DetectRoadImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid image to analyze." });
    return;
  }

  const validationError = validateImageDataUrl(parsed.data.imageDataUrl);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await detectRoadImage(parsed.data.imageDataUrl);
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "YOLO inference failed");
    res.status(500).json({ error: "We could not analyze that image. Please try another valid PNG or JPG file." });
  }
});

export default router;