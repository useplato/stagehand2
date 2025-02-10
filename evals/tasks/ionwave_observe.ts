import { initStagehand } from "@/evals/initStagehand";
import { EvalFunction } from "@/types/evals";
import { z } from "zod";

export const ionwave_observe: EvalFunction = async ({
  modelName,
  logger,
  plato,
}) => {
  const platoSim = await plato.startSimulationSession({
    name: "ionwave_observe",
    prompt: "Observe the page for the text 'El Paso, Texas'",
    startUrl: "https://elpasotexas.ionwave.net/Login.aspx",
    outputSchema: z.any(),
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

  await stagehand.page.goto("https://elpasotexas.ionwave.net/Login.aspx");

  const observations = await stagehand.page.observe({ onlyVisible: true });

  if (observations.length === 0) {
    await stagehand.close();
    return {
      _success: false,
      observations,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  }

  const expectedLocator = `div.rowLinks:nth-child(27) > div:nth-child(1) > a:nth-child(1)`;

  const expectedResult = await stagehand.page
    .locator(expectedLocator)
    .first()
    .innerText();

  let foundMatch = false;
  for (const observation of observations) {
    try {
      const observationResult = await stagehand.page
        .locator(observation.selector)
        .first()
        .innerText();

      if (observationResult === expectedResult) {
        foundMatch = true;
        break;
      }
    } catch (error) {
      console.warn(
        `Failed to check observation with selector ${observation.selector}:`,
        error.message,
      );
      continue;
    }
  }

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  return {
    _success: foundMatch,
    expected: expectedResult,
    observations,
    debugUrl,
    sessionUrl,
    logs: logger.getLogs(),
  };
};
