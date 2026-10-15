import { loadReport, summarizeLoadReport } from "../utils/exercises";

// One line at startup so dropped bank records are visible in server logs.
export default defineNitroPlugin(() => {
  console.info(`Exercise load report: ${summarizeLoadReport(loadReport)}`);
});
