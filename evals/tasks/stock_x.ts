import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";

export const stock_x: EvalFunction = async ({
  modelName,
  logger,
  configOverrides,
}) => {
  const { stagehand, initResponse } = await initStagehand({
    modelName,
    logger,
    configOverrides: {
      ...configOverrides,
    },
  });

  const { debugUrl, sessionUrl } = initResponse;

  await stagehand.page.goto(
    "https://stockx.com/air-jordan-3-retro-black-cement-2024",
  );

  await stagehand.page.waitForTimeout(3000);

  await stagehand.page.act({
    action: "click on Jordan 3 Retro Crimson in the related products",
  });

  await stagehand.page.waitForTimeout(2000);
  const currentUrl = stagehand.page.url();
  const expectedUrlPrefix = "https://stockx.com/jordan-3-retro-crimson";

  await stagehand.close();

  return {
    _success: currentUrl.startsWith(expectedUrlPrefix),
    currentUrl,
    debugUrl,
    sessionUrl,
    logs: logger.getLogs(),
  };
};
