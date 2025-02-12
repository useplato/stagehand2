import { z } from "zod";
import type { EvalLogger } from "../evals/logger";
import type { AvailableModel } from "../types/model";
import type { LogLine } from "../types/log";
import type { EvalCase } from "braintrust";
import { PlatoSession } from "plato-cli";
import { Stagehand } from "@/dist";

export type EvalFunction = (args: {
  logger: EvalLogger;
  platoSim: PlatoSession;
  stagehand: Stagehand;
  modelName: AvailableModel;
  useTextExtract: boolean;
  useAccessibilityTree: boolean;
}) => Promise<{
  _success: boolean;
  logs: LogLine[];
  error?: unknown;
}>;

export const EvalCategorySchema = z.enum([
  "observe",
  "act",
  "combination",
  "extract",
  "experimental",
  "text_extract",
]);

export type EvalCategory = z.infer<typeof EvalCategorySchema>;
export interface EvalInput {
  name: string;
  modelName: AvailableModel;
}

export interface Testcase
  extends EvalCase<
    EvalInput,
    unknown,
    { model: AvailableModel; test: string }
  > {
  input: EvalInput;
  name: string;
  tags: string[];
  description?: string;
  startUrl?: string;
  metadata: { model: AvailableModel; test: string };
  expected: unknown;
}

export interface SummaryResult {
  input: EvalInput;
  output: { _success: boolean };
  name: string;
  score: number;
}

export interface EvalArgs<TInput, TOutput, TExpected> {
  input: TInput;
  output: TOutput;
  expected: TExpected;
  metadata?: { model: AvailableModel; test: string };
}

export interface EvalResult {
  name: string;
  score: number;
}

export type LogLineEval = LogLine & {
  parsedAuxiliary?: string | object;
};
