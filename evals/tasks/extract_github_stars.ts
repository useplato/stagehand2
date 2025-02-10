import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const extract_github_stars: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    stars: z.number().describe("the number of stars for the project"),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_github_stars",
    prompt: "Extract the number of stars for the project",
    startUrl: "https://github.com/facebook/react",
    outputSchema,
  });

  const { stagehand, initResponse } = await initStagehand({
    modelName,
    logger,
    configOverrides: {
      cdpUrl: platoSim.cdpUrl,
      env: "REMOTE",
    },
  });

  const { debugUrl, sessionUrl } = initResponse;

  try {
    await stagehand.page.goto("https://github.com/facebook/react");

    const { stars } = await stagehand.page.extract({
      instruction: "Extract the number of stars for the project",
      schema: outputSchema,
      modelName,
      useTextExtract,
    });

    const expectedStarsString = await stagehand.page
      .locator("#repo-stars-counter-star")
      .first()
      .innerHTML();

    const expectedStars = expectedStarsString.toLowerCase().endsWith("k")
      ? parseFloat(expectedStarsString.slice(0, -1)) * 1000
      : parseFloat(expectedStarsString);

    const tolerance = 1000;
    const isWithinTolerance = Math.abs(stars - expectedStars) <= tolerance;

    await stagehand.close();

    return {
      _success: isWithinTolerance,
      stars,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } catch (error) {
    console.error("Error or timeout occurred:", error);

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });

    await stagehand.close();

    return {
      _success: false,
      error: JSON.parse(JSON.stringify(error, null, 2)),
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  }
};
