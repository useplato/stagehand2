import { initStagehand } from "@/evals/initStagehand";
import { EvalFunction } from "@/types/evals";
import { z } from "zod";

export const nonsense_action: EvalFunction = async ({
  modelName,
  logger,
  plato,
}) => {
  const platoSim = await plato.startSimulationSession({
    name: "nonsense_action",
    prompt: "Click on the first banana",
    startUrl: "https://www.homedepot.com/",
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
    await stagehand.page.goto("https://www.homedepot.com/");

    const result = await stagehand.page.act({
      action: "click on the first banana",
    });
    console.log("result", result);

    // Assert the output
    const expectedResult = {
      success: false,
      message: "Action was not able to be completed.",
      action: "click on the first banana",
    };

    const isResultCorrect =
      JSON.stringify(result) === JSON.stringify(expectedResult);

    return {
      _success: isResultCorrect,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } catch (error) {
    console.error(`Error in nonsense_action function: ${error.message}`);
    return {
      _success: false,
      error: JSON.parse(JSON.stringify(error, null, 2)),
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } finally {
    await stagehand.close();
  }
};
