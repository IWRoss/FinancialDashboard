const express = require("express"),
  router = express.Router();

const fs = require("fs");
const path = require("path");

const {
  xero,
  getAccessToken,
  processCashFlow,
  processQuarterlyVATPayments,
  getYearProfitAndLoss,
  processReport,
  isAuthorized,
} = require("../../controllers/xero");

router.get("/", async (req, res) => {
  // Show a welcome message
  res.send("Still nothing to see here");
});

/**
 * When accessing the route of the API, we'll redirect the user to the consentUrl
 * to authorize the app.
 */
router.get(`/${process.env.XERO_TENANT_ID}`, async (req, res) => {
  let consentUrl = await xero.buildConsentUrl();

  res.redirect(consentUrl);
});

/**
 * URL for showing the content of stockChangeData.json
 */
router.get(`/${process.env.STOCK_SECRET}`, async (req, res) => {
  const report = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../report.json"))
  );

  res.send(report);
});

router.get(`/${process.env.BANK_SECRET}`, async (req, res) => {
  const cashFlow = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../cashFlow.json"))
  );

  res.send(cashFlow);
});

router.get(`/${process.env.PL_SECRET}`, async (req, res) => {
  const ytd = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../ytd.json"))
  );

  res.send(ytd);
});

/**
 *
 */
router.get("/xero/callback", async (req, res) => {
  await xero.initialize();

  await getAccessToken(req, res);

  res.send();
});

/**
 * Status
 */
router.get("/status", async (req, res) => {
  await xero.initialize();

  let status = await isAuthorized();

  res.send(status);
});

module.exports = router;
