import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const imdb_movie_details: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    countries: z
      .array(z.string())
      .describe("List of countries with the most ratings"),
  });

  const platoSim = await plato.startSimulationSession({
    name: "imdb_movie_details",
    prompt: "Extract the list of countries with the most ratings.",
    startUrl: "https://www.imdb.com/title/tt0111161/",
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

  await stagehand.page.goto("https://www.imdb.com/title/tt0111161/", {
    waitUntil: "domcontentloaded",
  });
  await stagehand.page.act({
    action: "click on the movie ratings",
  });

  const movieDetails = await stagehand.page.extract({
    instruction: "Extract the list of countries with the most ratings.",
    schema: outputSchema,
    modelName,
    useTextExtract,
  });

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  const expectedCountries = [
    "United States",
    "United Kingdom",
    "Turkey",
    "India",
    "Germany",
  ];

  if (!movieDetails.countries || movieDetails.countries.length !== 5) {
    logger.error({
      message: "Failed to extract exactly five countries",
      level: 0,
      auxiliary: {
        expected: {
          value: JSON.stringify(expectedCountries),
          type: "object",
        },
        actual: {
          value: JSON.stringify(movieDetails.countries || []),
          type: "object",
        },
      },
    });

    return {
      _success: false,
      error: "Incorrect number of countries extracted",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  const missingCountries = expectedCountries.filter(
    (country) => !movieDetails.countries.includes(country),
  );

  if (missingCountries.length > 0) {
    logger.error({
      message: "Extracted countries do not match expected countries",
      level: 0,
      auxiliary: {
        missing: {
          value: JSON.stringify(missingCountries),
          type: "object",
        },
        extracted: {
          value: JSON.stringify(movieDetails.countries),
          type: "object",
        },
      },
    });

    return {
      _success: false,
      error: "Extracted countries do not match expected countries",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  return {
    _success: true,
    countries: movieDetails.countries,
    logs: logger.getLogs(),
    debugUrl,
    sessionUrl,
  };
};
