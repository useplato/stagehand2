import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const extract_repo_name: EvalFunction = async ({
  modelName,
  logger,
  plato,
}) => {
  const platoSim = await plato.startSimulationSession({
    name: "extract_repo_name",
    prompt: "Extract the name of the Github repository",
    startUrl: "https://github.com/facebook/react",
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

  try {
    await stagehand.page.goto("https://github.com/facebook/react");

    const { extraction } = await stagehand.page.extract(
      "extract the title of the Github repository. Do not include the owner of the repository.",
    );

    logger.log({
      message: "Extracted repo title",
      level: 1,
      auxiliary: {
        repo_name: {
          value: extraction,
          type: "object",
        },
      },
    });

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });

    await stagehand.close();

    return {
      _success: extraction === "react",
      extraction,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } catch (error) {
    console.error("Error or timeout occurred:", error);

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
