import {
  type ToolSet,
  type Tool,
  type UIMessageStreamWriter,
  type ToolExecutionOptions,
  convertToModelMessages,
  isStaticToolUIPart,
  getStaticToolName,
} from "ai";
import type { HumanInTheLoopUIMessage } from "./types";

export const APPROVAL = {
  YES: "Yes, confirmed.",
  NO: "No, denied.",
} as const;

export function getToolsRequiringConfirmation<T extends ToolSet>(
  tools: T
): string[] {
  return (Object.keys(tools) as (keyof T)[]).filter((key) => {
    const maybeTool = tools[key];
    return typeof maybeTool.execute !== "function";
  }) as string[];
}

function isValidToolName<T extends Record<string, unknown>>(
  toolName: string,
  executeFunctions: T
): toolName is string & keyof T {
  return toolName in executeFunctions;
}

export async function processToolCalls<
  Tools extends ToolSet,
  ExecutableTools extends {
    [ToolKey in keyof Tools as Tools[ToolKey] extends { execute: Function }
      ? never
      : ToolKey]: Tools[ToolKey];
  },
>(
  {
    writer,
    messages,
  }: {
    tools: Tools;
    writer: UIMessageStreamWriter;
    messages: HumanInTheLoopUIMessage[];
  },
  executeFunctions: {
    [K in keyof Tools & keyof ExecutableTools]?: (
      args: ExecutableTools[K] extends Tool<infer P> ? P : never,
      context: ToolExecutionOptions
    ) => Promise<unknown>;
  }
): Promise<HumanInTheLoopUIMessage[]> {
  const lastMessage = messages[messages.length - 1];
  const parts = lastMessage.parts;
  if (!parts) return messages;

  const processedParts = await Promise.all(
    parts.map(async (part) => {
      if (!isStaticToolUIPart(part)) return part;

      const toolName = getStaticToolName(part);

      if (!(toolName in executeFunctions) || part.state !== "output-available")
        return part;

      let result: unknown;

      if (part.output === APPROVAL.YES) {
        if (
          !isValidToolName(toolName, executeFunctions) ||
          part.state !== "output-available"
        ) {
          return part;
        }

        const toolInstance = executeFunctions[toolName] as Tool["execute"];
        if (toolInstance) {
          result = await toolInstance(part.input, {
            messages: await convertToModelMessages(messages),
            toolCallId: part.toolCallId,
          });
        } else {
          result = "Error: No execute function found on tool";
        }
      } else if (part.output === APPROVAL.NO) {
        result = "Error: User denied access to tool execution";
      } else {
        return part;
      }

      writer.write({
        type: "tool-output-available",
        toolCallId: part.toolCallId,
        output: result,
      });

      return {
        ...part,
        output: result,
      };
    })
  );

  return [
    ...messages.slice(0, -1),
    { ...lastMessage, parts: processedParts },
  ];
}
