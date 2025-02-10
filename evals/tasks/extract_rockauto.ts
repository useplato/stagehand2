import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const extract_rockauto: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    coolant_products: z.array(
      z.object({
        part_number: z.string(),
      }),
    ),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_rockauto",
    prompt:
      "Extract the part number of all the coolant and antifreeze products in the 'economy' category. Do not include the manufacturer name.",
    startUrl:
      "https://www.rockauto.com/en/catalog/alpine,1974,a310,1.6l+l4,1436055,cooling+system,coolant+/+antifreeze,11393",
    outputSchema,
  });

  const { stagehand, initResponse } = await initStagehand({
    modelName,
    logger,
    domSettleTimeoutMs: 10000,
    configOverrides: {
      cdpUrl: platoSim.cdpUrl,
      env: "REMOTE",
    },
  });

  const { debugUrl, sessionUrl } = initResponse;

  await stagehand.page.goto(
    "https://www.rockauto.com/en/catalog/alpine,1974,a310,1.6l+l4,1436055,cooling+system,coolant+/+antifreeze,11393",
  );
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const result = await stagehand.page.extract({
    instruction:
      "Extract the part number of all the coolant and antifreeze products in the 'economy' category. Do not include the manufacturer name.",
    schema: outputSchema,
    modelName,
    useTextExtract,
    domSettleTimeoutMs: 10000,
  });

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  const coolantProducts = result.coolant_products;
  const expectedLength = 4;

  const expectedFirstItem = {
    part_number: "GREEN5050GAL",
  };

  const expectedLastItem = {
    part_number: "719009",
  };

  if (coolantProducts.length !== expectedLength) {
    logger.error({
      message: "Incorrect number of coolant products extracted",
      level: 0,
      auxiliary: {
        expected: {
          value: expectedLength.toString(),
          type: "integer",
        },
        actual: {
          value: coolantProducts.length.toString(),
          type: "integer",
        },
      },
    });
    return {
      _success: false,
      error: "Incorrect number of coolant products extracted",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }
  const firstItemMatches =
    coolantProducts[0].part_number === expectedFirstItem.part_number;

  if (!firstItemMatches) {
    logger.error({
      message: "First coolant product extracted does not match expected",
      level: 0,
      auxiliary: {
        expected: {
          value: JSON.stringify(expectedFirstItem),
          type: "object",
        },
        actual: {
          value: JSON.stringify(coolantProducts[0]),
          type: "object",
        },
      },
    });
    return {
      _success: false,
      error: "First coolant product extracted does not match expected",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  const lastItemMatches =
    coolantProducts[coolantProducts.length - 1].part_number ===
    expectedLastItem.part_number;

  if (!lastItemMatches) {
    logger.error({
      message: "Last coolant product extracted does not match expected",
      level: 0,
      auxiliary: {
        expected: {
          value: JSON.stringify(expectedLastItem),
          type: "object",
        },
        actual: {
          value: JSON.stringify(coolantProducts[coolantProducts.length - 1]),
          type: "object",
        },
      },
    });
    return {
      _success: false,
      error: "Last coolant product extracted does not match expected",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  return {
    _success: true,
    logs: logger.getLogs(),
    debugUrl,
    sessionUrl,
  };
};
