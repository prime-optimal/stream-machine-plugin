import { expect, test } from "bun:test";
import { z } from "zod";

const source = await Bun.file(new URL("../.github/workflows/package.yml", import.meta.url)).text();
const workflow = z.object({
  on: z.object({ push: z.object({ branches: z.array(z.string()) }), workflow_dispatch: z.null() }).strict(),
  permissions: z.object({ contents: z.literal("read") }).strict(),
  jobs: z.object({ package: z.object({
    permissions: z.never().optional(),
    steps: z.array(z.object({
      name: z.string().optional(), id: z.string().optional(), uses: z.string().optional(), run: z.string().optional(),
      with: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      if: z.never().optional(), "continue-on-error": z.never().optional(),
    })),
  }) }).strict(),
}).parse(Bun.YAML.parse(source));
const steps = workflow.jobs.package.steps;

test("package workflow builds each main push or manual event SHA with read-only permissions", () => {
  expect(workflow.on.push.branches).toEqual(["main"]);
  const checkout = steps.find(step => step.uses?.startsWith("actions/checkout@"));
  expect(checkout?.with).toMatchObject({ ref: "${{ github.sha }}", "persist-credentials": false });
  expect(source).toContain('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"');
  expect(source).not.toMatch(/secrets:|secrets\.|contents: write|pull-requests:|cancel-in-progress: true|workflow_run:/);
  for (const step of steps.filter(step => step.uses)) expect(step.uses).toMatch(/@[a-f0-9]{40}$/);
  const commands = steps.map(step => step.run).filter(value => value !== undefined).join("\n");
  for (const task of ["install", "check", "test", "smoke", "package"]) expect(commands).toContain(`mise run ${task}`);
  expect(commands).not.toMatch(/release:prepare|package-smoke|fnox|gh release|git tag|git push/);
});

test("package workflow smokes both extracted archives without inherited credentials before upload", () => {
  const index = steps.findIndex(step => step.name === "Smoke extracted packages");
  const smoke = steps[index]?.run;
  expect(smoke).toContain('tar -xzf "docs/packages/stream-machine-$VERSION.tar.gz"');
  expect(smoke).toContain('unzip -q "docs/packages/stream-machine-$VERSION.zip"');
  expect(smoke).toContain("for format in tar zip");
  expect(smoke).toContain("env -i");
  expect(smoke).toContain('HOME="$scratch/home"');
  expect(smoke).toContain('$GITHUB_WORKSPACE/scripts/smoke.ts');
  expect(smoke).toContain('$scratch/$format/stream-machine/dist/server.js');
  expect(index).toBeGreaterThan(steps.findIndex(step => step.run === "mise run package"));
  expect(index).toBeLessThan(steps.findIndex(step => step.uses?.startsWith("actions/upload-artifact@")));
});

test("package workflow uploads only both versioned archives under version and full SHA identity", () => {
  const upload = steps.find(step => step.uses?.startsWith("actions/upload-artifact@"));
  expect(upload?.with).toMatchObject({
    name: "stream-machine-${{ steps.package.outputs.version }}-${{ github.sha }}",
    "if-no-files-found": "error", "retention-days": 30, overwrite: true,
  });
  expect(upload?.with?.path).toBe("docs/packages/stream-machine-${{ steps.package.outputs.version }}.tar.gz\ndocs/packages/stream-machine-${{ steps.package.outputs.version }}.zip\n");
  expect(steps.find(step => step.id === "package")?.run).toContain("$GITHUB_OUTPUT");
});
