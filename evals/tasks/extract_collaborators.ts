import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const extract_collaborators: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    contributors: z.array(
      z.object({
        github_username: z
          .string()
          .describe("the github username of the contributor"),
        information: z.string().describe("number of commits contributed"),
      }),
    ),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_collaborators",
    prompt: "Extract the top 20 contributors of this repository",
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
    await stagehand.page.act({
      action: "find the contributors section",
    });

    const { contributors } = await stagehand.page.extract({
      instruction: "Extract top 20 contributors of this repository",
      schema: outputSchema,
      modelName,
      useTextExtract,
    });

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });

    await stagehand.close();

    return {
      _success: contributors.length === 20,
      contributors,
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
