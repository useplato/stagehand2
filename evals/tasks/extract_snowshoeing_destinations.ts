import { z } from "zod";
import { initStagehand } from "@/evals/initStagehand";
import { EvalFunction } from "@/types/evals";

export const extract_snowshoeing_destinations: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    snowshoeing_regions: z.array(
      z.object({
        region_name: z.string().describe("The name of the snowshoeing region"),
        trails: z
          .array(z.string())
          .describe("The list of trails available in this region."),
      }),
    ),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_snowshoeing_destinations",
    prompt:
      "Extract all the snowshoeing regions and the names of the trails within each region.",
    startUrl:
      "https://www.cbisland.com/blog/10-snowshoeing-adventures-on-cape-breton-island/",
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
    await stagehand.page.goto(
      "https://www.cbisland.com/blog/10-snowshoeing-adventures-on-cape-breton-island/",
    );

    await stagehand.page.act({ action: "reject the cookies" });

    const snowshoeing_regions = await stagehand.page.extract({
      instruction:
        "Extract all the snowshoeing regions and the names of the trails within each region.",
      schema: outputSchema,
      modelName,
      useTextExtract,
    });

    logger.log({
      message: "Extracted destinations and trails",
      level: 1,
      auxiliary: {
        destinations: {
          value: JSON.stringify(snowshoeing_regions),
          type: "object",
        },
      },
    });

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });

    await stagehand.close();

    const _success = snowshoeing_regions.snowshoeing_regions.length === 10;

    return {
      _success,
      snowshoeing_regions,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } catch (error) {
    logger.error({
      message: "Error in extract_snowshoeing_destinations function",
      level: 0,
      auxiliary: {
        error: {
          value: error.message,
          type: "string",
        },
        trace: {
          value: error.stack,
          type: "string",
        },
      },
    });
    return {
      _success: false,
      error: JSON.parse(JSON.stringify(error, null, 2)),
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } finally {
    await stagehand.context.close().catch(() => {});
  }
};
