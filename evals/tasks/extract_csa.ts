import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const extract_csa: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    publications: z.array(
      z.object({
        publication_date: z.string(),
        session_type: z.string(),
        publication_type: z.string(),
        annotation: z.string(),
      }),
    ),
  });

  const platoSim = await plato.startSimulationSession({
    name: "extract_csa",
    prompt:
      "Extract all the publications on the page including the publication date, session type, publication type, and annotation",
    startUrl:
      "https://clerk.assembly.ca.gov/weekly-histories?from_date=&to_date=2025-01-09",
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

  const { page } = stagehand;
  await page.goto(
    "https://clerk.assembly.ca.gov/weekly-histories?from_date=&to_date=2025-01-09",
  );

  const result = await page.extract({
    instruction:
      "Extract all the publications on the page including the publication date, session type, publication type, and annotation",
    schema: outputSchema,
    modelName,
    useTextExtract,
  });

  await stagehand.context.pages().forEach(async (page) => {
    await page.close();
  });

  await stagehand.close();

  const publications = result.publications;
  const expectedLength = 14;

  const expectedFirstItem = {
    publication_date: "11-30-2024",
    session_type: "Regular Session",
    publication_type: "Assembly Weekly History",
    annotation:
      "2024 -- This publication includes the complete histories of second-year bills. The complete electronic history of all bills is always available at leginfo.legislature.ca.gov",
  };

  const expectedLastItem = {
    publication_date: "11-30-2016",
    session_type: "1st Extraordinary Session",
    publication_type: "Assembly Weekly History",
    annotation: "",
  };

  if (publications.length < expectedLength) {
    logger.error({
      message: "Incorrect number of publications extracted",
      level: 0,
      auxiliary: {
        expected: {
          value: `>= ${expectedLength}`,
          type: "integer",
        },
        actual: {
          value: publications.length.toString(),
          type: "integer",
        },
      },
    });
    return {
      _success: false,
      error: "Incorrect number of publications extracted",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  const hasExpectedFirstItem = publications.some((publication) => {
    return (
      publication.publication_date === expectedFirstItem.publication_date &&
      publication.session_type === expectedFirstItem.session_type &&
      publication.publication_type === expectedFirstItem.publication_type &&
      publication.annotation === expectedFirstItem.annotation
    );
  });

  if (!hasExpectedFirstItem) {
    logger.error({
      message: "Expected 'first' item not found in publications",
      level: 0,
      auxiliary: {
        expected: {
          value: JSON.stringify(expectedFirstItem),
          type: "object",
        },
        actual: {
          value: JSON.stringify(publications),
          type: "object",
        },
      },
    });
    return {
      _success: false,
      error: "Expected 'first' item not found in publications",
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }

  const hasExpectedLastItem = publications.some((publication) => {
    return (
      publication.publication_date === expectedLastItem.publication_date &&
      publication.session_type === expectedLastItem.session_type &&
      publication.publication_type === expectedLastItem.publication_type &&
      publication.annotation === expectedLastItem.annotation
    );
  });

  if (!hasExpectedLastItem) {
    logger.error({
      message: "Expected 'last' item not found in publications",
      level: 0,
      auxiliary: {
        expected: {
          value: JSON.stringify(expectedLastItem),
          type: "object",
        },
        actual: {
          value: JSON.stringify(publications),
          type: "object",
        },
      },
    });
    return {
      _success: false,
      error: "Expected 'last' item not found in publications",
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
