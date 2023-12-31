const { calculateStockPrice } = require("../utils");

// fs
const fs = require("fs");
const path = require("path");

module.exports = (session) => {
  const cron = require("node-cron");

  const {
    xero,
    processProfitAndLossReport,
    processYTDProfitAndLossReport,
    processCashFlow,
  } = require("./xero");

  // If debug, run every minute. Otherwise, run every 10 minutes
  const runTime = parseInt(process.env.DEBUG_CRON)
    ? "* * * * *"
    : "*/10 * * * *";

  const runCron = async () => {
    console.log("Cron job started");

    // Run the cron job every hour
    const task = cron.schedule(
      runTime,
      async () => {
        console.log("Running cron job");

        const tokenSet = xero.readTokenSet();

        if (tokenSet.expired()) {
          console.log("Token expired, refreshing");
          await xero.refreshToken();
        }

        // Get the report
        const report = await processProfitAndLossReport();

        // Store in file
        fs.writeFileSync(
          path.join(__dirname, "../report.json"),
          JSON.stringify(report)
        );

        // Get the cash flow
        const cashFlow = await processCashFlow();

        fs.writeFileSync(
          path.join(__dirname, "../cashFlow.json"),
          JSON.stringify(cashFlow)
        );

        // Get the YTD
        const ytdReport = await processYTDProfitAndLossReport();

        console.log(ytdReport);

        fs.writeFileSync(
          path.join(__dirname, "../ytd.json"),
          JSON.stringify(ytdReport)
        );
      },
      {
        scheduled: true,
      }
    );

    task.start();
  };

  return {
    runCron,
  };
};
