import { initStagehand } from "@/evals/initStagehand";
import { EvalFunction } from "@/types/evals";
import { z } from "zod";

export const allrecipes: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const platoSim = await plato.startSimulationSession({
    name: "allrecipes",
    prompt: "Search for 'chocolate chip cookies' using the search bar",
    startUrl: "https://www.allrecipes.com/",
    outputSchema: z.object({
      title: z.string().describe("Title of the recipe"),
      total_ratings: z
        .string()
        .describe("Total number of ratings for the recipe"),
    }),
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

  await stagehand.page.goto("https://www.allrecipes.com/", {
    waitUntil: "domcontentloaded",
  });

  await stagehand.page.act({
    action: 'Search for "chocolate chip cookies" using the search bar',
  });

  const recipeDetails = await stagehand.page.extract({
    instruction:
      "Extract the title of the first recipe and the total number of ratings it has received.",
    schema: z.object({
      title: z.string().describe("Title of the recipe"),
      total_ratings: z
        .string()
        .describe("Total number of ratings for the recipe"),
    }),
    modelName,
    useTextExtract,
  });

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  const { title, total_ratings } = recipeDetails;
  const expectedTitle = "Best Chocolate Chip Cookies";
  const expectedRatings = 19164;

  const extractedRatings = parseInt(total_ratings.replace(/[^\d]/g, ""), 10);
  const isRatingsWithinRange =
    extractedRatings >= expectedRatings - 1000 &&
    extractedRatings <= expectedRatings + 1000;

  if (title !== expectedTitle || !isRatingsWithinRange) {
    const errors = [];
    if (title !== expectedTitle) {
      errors.push({
        message: "Extracted title does not match the expected title",
        expected: expectedTitle,
        actual: title,
      });
    }
    if (!isRatingsWithinRange) {
      errors.push({
        message: "Extracted ratings are not within the expected range",
        expected: `${expectedRatings} ± 1000`,
        actual: extractedRatings.toString(),
      });
    }

    logger.error({
      message: "Failed to extract correct recipe details",
      level: 0,
      auxiliary: {
        errors: {
          value: JSON.stringify(errors),
          type: "object",
        },
      },
    });

    return {
      _success: false,
      error: "Recipe details extraction validation failed",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  return {
    _success: true,
    recipeDetails: {
      title,
      total_ratings: extractedRatings,
    },
    logs: logger.getLogs(),
    debugUrl,
    sessionUrl,
  };
};
