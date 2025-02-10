import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const extract_partners: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    partners: z.array(
      z.object({
        partner_category: z.string().describe("The partner category"),
      }),
    ),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_partners",
    prompt: "Extract all of the partner categories on the page.",
    startUrl: "https://ramp.com",
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
    await stagehand.page.goto("https://ramp.com");

    await stagehand.page.act({
      action: "move down to the bottom of the page.",
    });

    await stagehand.page.act({
      action: "Close the popup.",
    });

    await stagehand.page.act({
      action: "Find and click on the link that leads to the partners page.",
    });

    const partners = await stagehand.page.extract({
      instruction: `
      Extract all of the partner categories on the page.
    `,
      schema: z.object({
        partners: z.array(
          z.object({
            partner_category: z.string().describe("The partner category"),
          }),
        ),
        explanation: z
          .string()
          .optional()
          .describe("Any explanation about partner listing or absence thereof"),
      }),
      modelName,
      useTextExtract,
    });

    const expectedPartners = [
      "Accounting Partners",
      "Private Equity & Venture Capital Partners",
      "Services Partners",
      "Affiliates",
    ];

    const foundPartners = partners.partners.map((partner) =>
      partner.partner_category.toLowerCase(),
    );

    const allExpectedPartnersFound = expectedPartners.every((partner) =>
      foundPartners.includes(partner.toLowerCase()),
    );

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });

    await stagehand.close();

    return {
      _success: allExpectedPartnersFound,
      partners,
      debugUrl,
      sessionUrl,
      logs: logger.getLogs(),
    };
  } catch (error) {
    logger.error({
      message: "error in extractPartners function",
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
      debugUrl,
      sessionUrl,
      error: JSON.parse(JSON.stringify(error, null, 2)),
      logs: logger.getLogs(),
    };
  }
};
