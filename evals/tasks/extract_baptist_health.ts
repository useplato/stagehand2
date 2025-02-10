import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { compareStrings } from "@/evals/utils";
import { z } from "zod";

export const extract_baptist_health: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    address: z.string(),
    phone: z.string(),
    fax: z.string(),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_baptist_health",
    prompt:
      "Extract the address, phone number, and fax number of the healthcare location.",
    startUrl:
      "https://www.baptistfirst.org/location/baptist-health-ent-partners",
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

  await stagehand.page.goto(
    "https://www.baptistfirst.org/location/baptist-health-ent-partners",
  );

  const result = await stagehand.page.extract({
    instruction:
      "Extract the address, phone number, and fax number of the healthcare location.",
    schema: outputSchema,
    modelName,
    useTextExtract,
  });

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  const { address, phone, fax } = result;
  const expected = {
    address: "2055 East South Blvd; Suite 908 Montgomery, AL 36116",
    phone: "334-747-2273",
    fax: "334-747-7501",
  };

  const similarityThreshold = 0.85;
  const failedFields: Array<{
    field: string;
    similarity: number;
    expected: string;
    actual: string;
  }> = [];

  const compareField = (
    actualVal: string,
    expectedVal: string,
    fieldName: string,
  ) => {
    const { similarity, meetsThreshold } = compareStrings(
      actualVal,
      expectedVal,
      similarityThreshold,
    );

    if (!meetsThreshold) {
      failedFields.push({
        field: fieldName,
        similarity,
        expected: expectedVal,
        actual: actualVal,
      });
      logger.error({
        message: `${fieldName} extracted does not meet similarity threshold`,
        level: 0,
        auxiliary: {
          field: { value: fieldName, type: "string" },
          similarity: { value: similarity.toFixed(2), type: "string" },
          expected: { value: expectedVal, type: "string" },
          actual: { value: actualVal, type: "string" },
        },
      });
    }

    return meetsThreshold;
  };

  const addressOk = compareField(address, expected.address, "Address");
  const phoneOk = compareField(phone, expected.phone, "Phone number");
  const faxOk = compareField(fax, expected.fax, "Fax number");

  if (!addressOk || !phoneOk || !faxOk) {
    return {
      _success: false,
      error: "Some fields did not meet similarity threshold",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
      failedFields,
    };
  }

  return {
    _success: true,
    logs: logger.getLogs(),
    debugUrl,
    sessionUrl,
  };
};
