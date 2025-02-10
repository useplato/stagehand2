import { initStagehand } from "@/evals/initStagehand";
import { EvalFunction } from "@/types/evals";
import { z } from "zod";

export const ionwave: EvalFunction = async ({ modelName, logger, plato }) => {
  const platoSim = await plato.startSimulationSession({
    name: "ionwave",
    prompt: "Click on 'Closed Bids'",
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

  await stagehand.page.act({
    action: 'Click on "Closed Bids"',
  });

  const expectedUrl =
    "https://elpasotexas.ionwave.net/SourcingEvents.aspx?SourceType=2";
  const currentUrl = stagehand.page.url();

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  return {
    _success: currentUrl.startsWith(expectedUrl),
    currentUrl,
    debugUrl,
    sessionUrl,
    logs: logger.getLogs(),
  };
};
