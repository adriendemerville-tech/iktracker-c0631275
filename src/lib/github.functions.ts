import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GitHubRunSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  per_page: z.coerce.number().min(1).max(100).default(10),
  page: z.coerce.number().min(1).default(1),
});

export type GitHubWorkflowRun = {
  id: number;
  name: string;
  run_number: number;
  status: string;
  conclusion: string | null;
  head_branch: string;
  event: string;
  html_url: string;
  created_at: string;
  updated_at: string;
};

export type GitHubActionsRunsResponse = {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
};

export const getGitHubActionsRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GitHubRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { owner, repo, per_page, page } = data;

    // Only admins can read the mobile build status.
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    } as any);
    if (roleError || !isAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }

    const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
    const GITHUB_API_KEY = process.env["GITHUB_API_KEY"];

    if (!LOVABLE_API_KEY || !GITHUB_API_KEY) {
      throw new Error("GitHub connector is not configured");
    }

    const url = new URL(
      `https://connector-gateway.lovable.dev/github/repos/${owner}/${repo}/actions/runs`,
    );
    url.searchParams.set("per_page", String(per_page));
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GITHUB_API_KEY,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`GitHub Actions gateway request failed [${response.status}]: ${errorBody}`);
      throw new Error(`GitHub Actions request failed [${response.status}]: ${errorBody}`);
    }

    const json = (await response.json()) as GitHubActionsRunsResponse;
    return json;
  });
