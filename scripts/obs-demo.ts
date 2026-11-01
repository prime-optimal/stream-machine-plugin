import { obsPreflight, obsShowAlert } from "../src/adapters/obs/register";
const replay = Bun.argv.includes("--replay");
const textIndex = Bun.argv.indexOf("--text");
const result = replay ? await obsShowAlert({ replay: true }) : textIndex >= 0
  ? await obsShowAlert({ text: Bun.argv[textIndex + 1] })
  : await obsPreflight();
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
