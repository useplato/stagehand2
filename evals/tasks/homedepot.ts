import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const homedepot: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    productSpecs: z.array(
      z.object({
        burnerBTU: z.string().describe("Primary Burner BTU exact value"),
      }),
    ),
  });

  const platoSim = await plato.startSimulationSession({
    name: "homedepot",
    prompt: "Extract the Primary exact Burner BTU of the product",
    startUrl: "https://www.homedepot.com/",
    outputSchema,
  });

  const { stagehand, initResponse } = await initStagehand({
    modelName,
    logger,
    domSettleTimeoutMs: 60_000,
    configOverrides: {
      cdpUrl: platoSim.cdpUrl,
      env: "REMOTE",
    },
  });

  const { debugUrl, sessionUrl } = initResponse;

  try {
    await stagehand.page.goto("https://www.homedepot.com/");
    await stagehand.page.act("search for gas grills");
    await stagehand.page.act("click on the best selling gas grill");
    await stagehand.page.act("click on the Product Details");
    await stagehand.page.act("find the Primary Burner BTU");

    const productSpecs = await stagehand.page.extract({
      instruction: "Extract the Primary exact Burner BTU of the product",
      schema: outputSchema,
      modelName,
      useTextExtract,
    });

    logger.log({
      message: `gas grill primary burner BTU`,
      level: 1,
      auxiliary: {
        productSpecs: {
          value: JSON.stringify(productSpecs),
          type: "object",
        },
      },
    });

    if (
      !productSpecs ||
      !productSpecs.productSpecs ||
      productSpecs.productSpecs.length !== 1
    ) {
      await stagehand.context.pages().forEach(async (page) => {
        await page.close();
      });

      await stagehand.close();

      return {
        _success: false,
        productSpecs,
        debugUrl,
        sessionUrl,
        logs: logger.getLogs(),
      };
    }

    const hasFourZerosAndOne4 =
      (productSpecs.productSpecs[0].burnerBTU.match(/0/g) || []).length === 4 &&
      (productSpecs.productSpecs[0].burnerBTU.match(/4/g) || []).length === 1;

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });

    await stagehand.close();

    return {
      _success: hasFourZerosAndOne4,
      productSpecs,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } catch (error) {
    logger.error({
      message: "error in homedepot function",
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
