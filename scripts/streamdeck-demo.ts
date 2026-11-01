import { StreamDeckWorkspace } from "../src/adapters/streamdeck/workspace";

const workspace = new StreamDeckWorkspace();
const [operation = "inventory", serial, url = "https://github.com/prime-optimal/stream-machine-plugin"] = process.argv.slice(2);
if (operation === "inventory") {
  try { console.log(JSON.stringify(await workspace.inventory(), null, 2)); }
  finally { await workspace.close(); }
} else {
  if (!serial || !["preview", "apply"].includes(operation)) throw new Error("Usage: streamdeck-demo.ts inventory | preview|apply SERIAL [HTTP_URL]");
  const preview = await workspace.preview({ serial, url });
  console.log(JSON.stringify(preview, null, 2));
  if (operation === "preview") await workspace.close();
  else {
    try { console.log(JSON.stringify(await workspace.apply(preview.id), null, 2)); }
    catch (error) { await workspace.close(); throw error; }
    console.log("Ready: press top-left OPEN DEMO. Keep process running. Ctrl-C removes demo page and releases USB.");
    for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => void workspace.close().finally(() => process.exit(0)));
    await new Promise(() => {});
  }
}
