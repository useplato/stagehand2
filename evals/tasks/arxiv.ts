import { EvalFunction } from "@/types/evals";
import { initStagehand } from "@/evals/initStagehand";
import { z } from "zod";

export const arxiv: EvalFunction = async ({
  modelName,
  logger,
  useTextExtract,
  plato,
}) => {
  const outputSchema = z.object({
    papers: z
      .array(
        z.object({
          title: z.string().describe("the title of the paper"),
          link: z.string().describe("the link to the paper").nullable(),
        }),
      )
      .describe("list of papers"),
  });

  const platoSim = await plato.startSimulationSession({
    name: "arxiv",
    prompt: "Search for papers about web agents with multimodal models",
    startUrl: "https://arxiv.org/search/",
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
    await stagehand.page.goto("https://arxiv.org/search/");

    await stagehand.page.act(
      "search for papers about web agents with multimodal models",
    );

    const paper_links = await stagehand.page.extract({
      instruction: "extract the titles and links for two papers",
      schema: outputSchema,
      modelName,
      useTextExtract,
    });

    if (
      !paper_links ||
      !paper_links.papers ||
      paper_links.papers.length === 0
    ) {
      await stagehand.context.pages().forEach(async (page) => {
        await page.close();
      });
      await stagehand.close();

      return {
        _success: false,
        logs: logger.getLogs(),
        debugUrl,
        sessionUrl,
      };
    }

    const papers = [];
    for (const paper of paper_links.papers) {
      if (paper.link) {
        await stagehand.page.goto(paper.link);
        const abstract = await stagehand.page.extract({
          instruction: "extract details of the paper from the abstract",
          schema: z.object({
            category: z
              .string()
              .describe(
                "the category of the paper. one of {'Benchmark', 'Dataset', 'Model', 'Framework', 'System', 'Other'}",
              ),
            problem: z
              .string()
              .describe(
                "summarize the problem that the paper is trying to solve in one sentence",
              )
              .nullable(),
            methodology: z
              .string()
              .describe(
                "summarize the methodology of the paper in one sentence",
              )
              .nullable(),
            results: z
              .string()
              .describe("summarize the results of the paper in one sentence")
              .nullable(),
            conclusion: z
              .string()
              .describe("summarize the conclusion of the paper in one sentence")
              .nullable(),
            code: z
              .string()
              .describe(
                "if provided, extract only the link to the code repository, without additional text. this is often optional and not always provided.",
              )
              .nullable(),
          }),
          modelName,
          useTextExtract,
        });

        papers.push({
          title: paper.title,
          link: paper.link,
          ...abstract,
        });
      }
    }

    if (!papers || papers.length === 0) {
      await stagehand.context.pages().forEach(async (page) => {
        await page.close();
      });
      await stagehand.close();

      return {
        _success: false,
        logs: logger.getLogs(),
        debugUrl,
        sessionUrl,
      };
    }

    if (papers.length !== 2) {
      logger.error({
        message: "incorrect number of papers extracted",
        level: 0,
        auxiliary: {
          expected: {
            value: "2",
            type: "integer",
          },
          actual: {
            value: papers.length.toString(),
            type: "integer",
          },
        },
      });

      await stagehand.context.pages().forEach(async (page) => {
        await page.close();
      });
      await stagehand.close();

      return {
        _success: false,
        error: "Incorrect number of papers extracted",
        logs: logger.getLogs(),
        debugUrl,
        sessionUrl,
      };
    }

    // Ensure that every paper has a problem and methodology
    for (const paper of papers) {
      if (!paper.problem || !paper.methodology) {
        logger.error({
          message: `paper missing problem or methodology`,
          level: 0,
          auxiliary: {
            paper: {
              value: JSON.stringify(paper),
              type: "object",
            },
          },
        });

        await stagehand.context.pages().forEach(async (page) => {
          await page.close();
        });
        await stagehand.close();

        return {
          _success: false,
          error: "Incomplete paper information",
          logs: logger.getLogs(),
          debugUrl,
          sessionUrl,
        };
      }
    }

    await stagehand.context.pages().forEach(async (page) => {
      await page.close();
    });
    await stagehand.close();

    return {
      _success: true,
      papers,
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  } catch (error) {
    logger.error({
      message: `error in arxiv function`,
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
      logs: logger.getLogs(),
      debugUrl,
      sessionUrl,
    };
  }
};
