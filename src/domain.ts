import { z } from "zod";
import { capabilities, categories, recipes } from "./catalog";

const empty = z.object({}).strict();
export const schemas = {
  stream_machine_open: empty,
  stream_machine_workspace: empty,
  stream_machine_connect_demo: empty,
  stream_machine_list_recipes: empty,
  stream_machine_preview: z.object({
    recipeId: z.string().min(1),
    title: z.string().trim().min(1).max(140),
    categoryId: z.string().min(1),
  }).strict(),
  stream_machine_reset: empty,
};
export type ToolName = keyof typeof schemas;
type Account = { id: string; displayName: string };
type ChannelDetails = { title: string; categoryId: string; categoryName: string };
export type Preview = {
  id: string; mode: "mock"; recipeId: string; account: Account;
  before: ChannelDetails; after: ChannelDetails;
  effects: string[]; executable: false; createdAt: string;
};
export type Snapshot = {
  mode: "mock";
  connection: { status: "disconnected" | "demo"; account: Account | null; scopes: string[] };
  recipes: typeof recipes; capabilities: typeof capabilities; categories: typeof categories;
  preview: Preview | null;
};

export class DomainError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export class DemoWorkspace {
  private connected = false;

  snapshot(preview: Preview | null = null): Snapshot {
    return structuredClone({
      mode: "mock",
      connection: {
        status: this.connected ? "demo" : "disconnected",
        account: this.connected ? { id: "demo-streamer", displayName: "Sample Streamer" } : null,
        scopes: this.connected ? ["demo:channel-preview"] : [],
      },
      recipes, capabilities, categories, preview,
    });
  }

  invoke(name: string, args: unknown): Snapshot {
    if (!Object.hasOwn(schemas, name)) throw new DomainError("UNKNOWN_TOOL", "Tool is not registered.");
    const key = name as ToolName;
    const parsed = schemas[key].safeParse(args);
    if (!parsed.success) throw new DomainError("INVALID_INPUT", parsed.error.issues.map(issue => `${issue.path.join(".") || "arguments"}: ${issue.message}`).join("; "));
    if (key === "stream_machine_connect_demo") this.connected = true;
    if (key === "stream_machine_reset") this.connected = false;
    if (key !== "stream_machine_preview") return this.snapshot();

    const input = schemas.stream_machine_preview.parse(parsed.data);
    const recipe = recipes.find(item => item.id === input.recipeId);
    if (!recipe) throw new DomainError("UNKNOWN_RECIPE", "Choose a recipe from the current catalog.");
    if (!recipe.available) throw new DomainError("CAPABILITY_UNAVAILABLE", "This recipe's live providers are not configured.");
    if (!this.connected) throw new DomainError("DEMO_CONNECTION_REQUIRED", "Choose Use demo Twitch account before previewing.");
    const category = categories.find(item => item.id === input.categoryId);
    if (!category) throw new DomainError("UNKNOWN_CATEGORY", "Choose a category from the demo catalog.");
    return this.snapshot({
      id: `demo-preview-${crypto.randomUUID()}`, mode: "mock", recipeId: recipe.id,
      account: { id: "demo-streamer", displayName: "Sample Streamer" },
      before: { title: "Welcome to the demo stream", categoryId: categories[0].id, categoryName: categories[0].name },
      after: { title: input.title, categoryId: category.id, categoryName: category.name },
      effects: ["Would update channel title and category after future live authorization.", "This preview performs no Twitch requests and cannot be executed."],
      executable: false, createdAt: new Date().toISOString(),
    });
  }
}

export function toolResult(workspace: DemoWorkspace, name: string, args: unknown) {
  try {
    const snapshot = workspace.invoke(name, args);
    return {
      content: [{ type: "text" as const, text: snapshot.preview
        ? `Mock preview for ${snapshot.preview.account.displayName}: title “${snapshot.preview.after.title}”, category “${snapshot.preview.after.categoryName}”. No changes applied.`
        : `Stream Machine demo: ${snapshot.connection.status}. Mock data only; no live Twitch connection.` }],
      structuredContent: snapshot,
    };
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    return { isError: true, content: [{ type: "text" as const, text: error.message }], structuredContent: { mode: "mock" as const, error: { code: error.code, message: error.message } } };
  }
}
