import express from "express";
import { z } from "zod";
import { initStagehand } from "./initStagehand";
import { EvalLogger } from "./logger";
import jsonSchemaToZod from "json-schema-to-zod";
import { AvailableModelSchema } from "@/lib";

// Define request body schema
const RequestSchema = z.object({
  command: z.string().describe("The instruction or command to execute"),
  start_url: z.string().url().describe("Starting URL to navigate to"),
  cdp_url: z.string().url().describe("Chrome DevTools Protocol URL"),
  output_schema: z
    .record(z.any())
    .nullable()
    .describe("The schema to output in the format of a Draft7 JSON Schema"),
  mode: z.enum(["actions", "output"]).describe("The mode to run in"),
  model_name:
    AvailableModelSchema.default("gpt-4o").describe("The model to use"),
});

const app = express();

app.use(express.json());

/**
 * Initialize a new Stagehand instance with default configuration. Necessary so stagehand scripts are injected before page is setup
 * @route POST /init
 * @param {string} _req.body.cdp_url - Chrome DevTools Protocol URL to connect to
 * @throws {Error} Returns 500 status code if initialization fails
 */
app.post("/init", async (_req, res) => {
  try {
    await initStagehand({
      modelName: "gpt-4o-mini",
      logger: new EvalLogger(),
      configOverrides: {
        env: "REMOTE",
        cdpUrl: _req.body.cdp_url,
        debugDom: false,
      },
    });

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * Run a Stagehand test with the given command and parameters
 * @route POST /test
 * @param {string} _req.body.command - The instruction or command to execute
 * @param {string} _req.body.cdp_url - Chrome DevTools Protocol URL
 * @param {string} _req.body.output_schema - The schema to output in the format of a Draft7 JSON Schema
 * @param {string} _req.body.mode - The mode to run in
 * @param {string} _req.body.model_name - The model to use
 * @returns {Stream} Server-sent event stream with status updates and final output
 */

app.post("/test", async (_req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      // Validate request body
      const {
        command,
        cdp_url: cdpUrl,
        output_schema: outputSchema,
        mode,
        model_name: modelName,
      } = RequestSchema.parse(_req.body);

      const logger = new EvalLogger();
      const { stagehand } = await initStagehand({
        modelName: "gpt-4o-mini",
        logger,
        configOverrides: {
          env: "REMOTE",
          cdpUrl,
          debugDom: false,
        },
      });

      res.write('data: {"message": "Injecting processDom function"}\n\n');

      res.write('data: {"message": "Executing command"}\n\n');
      let output;
      if (mode === "actions") {
        output = await stagehand.page.act({
          action: command,
        });
      } else {
        // turn the schema into a zod schema string. Ideally could pass in a JSON schema directly but doing this for now
        const zodSchema = eval(
          jsonSchemaToZod(outputSchema, { module: "cjs" }),
        );
        output = await stagehand.page.extract({
          instruction: command,
          schema: zodSchema,
          modelName: modelName,
          useTextExtract: true,
        });
      }

      const data = {
        type: "answer",
        message: output,
      };

      res.write(`data: ${JSON.stringify(data)}\n\n`);

      res.end();
    } catch (error) {
      // print error and stack trace
      console.error(error.stack);
      res.write(
        'data: {"message": "Error", "error": ' +
          JSON.stringify({ message: error.message }) +
          "}\n\n",
      );
      res.end();
    }
  } catch (err) {
    console.error(err.stack);
    res.write(
      'data: {"message": "Error", "error": ' +
        JSON.stringify({ message: err.message }) +
        "}\n\n",
    );
    res.end();
  }
});

app.get("/version", (req, res) => {
  res.json({
    version: "v0.1",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Global error handling middleware
app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error("Global error handler caught:", err);
  console.error(err.stack);

  // Don't send error details in production
  res.status(500).json({
    status: "error",
    message: "An internal server error occurred",
  });
});

// Catch unhandled rejections and exceptions
process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  // Gracefully shutdown if needed
  // process.exit(1);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
