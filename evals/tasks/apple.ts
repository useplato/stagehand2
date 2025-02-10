import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";
export const apple: EvalFunction = async ({ modelName, logger, plato }) => {
  const platoSim = await plato.startSimulationSession({
    name: "apple",
    prompt: "Search for 'iphone 16 pro' using the search bar",
    startUrl: "https://www.apple.com/iphone-16-pro/",
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

  await stagehand.page.goto("https://www.apple.com/iphone-16-pro/");

  await stagehand.page.act({ action: "click on the buy button" });
  await stagehand.page.act({ action: "select the Pro Max model" });
  await stagehand.page.act({ action: "select the natural titanium color" });
  await stagehand.page.act({ action: "select the 256GB storage option" });
  await stagehand.page.act({
    action: "click on the 'select a smartphone' trade-in option",
  });

  await stagehand.page.act({
    action: "select the iPhone 13 mini model from the dropdown",
  });
  await stagehand.page.act({
    action: "select the iPhone 13 mini is in good condition",
  });

  const successMessageLocator = stagehand.page.locator(
    'text="Good News. Your iPhone 13 mini qualifies for credit."',
  );
  const isVisible = await successMessageLocator.isVisible();

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  return {
    _success: isVisible,
    debugUrl,
    sessionUrl,
    logs: logger.getLogs(),
  };
};
