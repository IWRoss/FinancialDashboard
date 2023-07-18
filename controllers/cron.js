const { calculateStockPrice } = require("../utils");

// fs
const fs = require("fs");

module.exports = (session) => {
  const cron = require("node-cron");

  const { xero } = require("./xero");

  const runTime = parseInt(process.env.DEBUG_CRON) ? "* * * * *" : "0 * * * *";

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

        const report = await getProfitAndLoss();

        console.log(report);
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
