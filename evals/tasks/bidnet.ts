import { initStagehand } from "@/evals/initStagehand";
import { EvalFunction } from "@/types/evals";
import { z } from "zod";
export const bidnet: EvalFunction = async ({ modelName, logger, plato }) => {
  const platoSim = await plato.startSimulationSession({
    name: "bidnet",
    prompt: "Click on the 'Construction' keyword",
    startUrl: "https://www.bidnetdirect.com/",
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

  await stagehand.page.goto("https://www.bidnetdirect.com/");

  await stagehand.page.act({
    action: 'Click on the "Construction" keyword',
  });

  const expectedUrl =
    "https://www.bidnetdirect.com/public/solicitations/open?keywords=Construction";
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
