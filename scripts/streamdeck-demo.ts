import { StreamDeckWorkspace } from "../src/adapters/streamdeck/workspace";

const workspace = new StreamDeckWorkspace();
const [operation = "inventory", serial, channel = "-", ...scenes] = process.argv.slice(2);
if (operation === "inventory") {
  try { console.log(JSON.stringify(await workspace.inventory(), null, 2)); }
  finally { await workspace.close(); }
} else {
  if (!serial || !["preview", "apply"].includes(operation)) throw new Error("Usage: streamdeck-demo.ts inventory | preview|apply SERIAL [TWITCH_LOGIN|-] [SCENE...]");
  const preview = await workspace.previewLayout({ serial, ...(channel !== "-" ? { channel } : {}), ...(scenes.length ? { scenes } : {}) });
  console.log(JSON.stringify(preview, null, 2));
  if (operation === "preview") await workspace.close();
  else {
    try { console.log(JSON.stringify(await workspace.applyLayout(preview.previewId), null, 2)); }
    catch (error) { await workspace.close(); throw error; }
    console.log("Ready: press a scene button. Keep this process running. Ctrl-C releases USB and keeps the saved layout page.");
    for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => void workspace.close().finally(() => process.exit(0)));
    await new Promise(() => { });
  }
}
