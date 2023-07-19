const { XeroClient } = require("xero-node");

const fs = require("fs");
const path = require("path");

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.XERO_REDIRECT_URI],
  scopes: [...process.env.XERO_SCOPES.split(",")],
});

const { cloneDeep } = require("lodash");

/**
 * Store token set in local file so we can retrieve it if the app crashes
 */
const storeTokenSet = (tokenSet) => {
  const tokenSetCopy = cloneDeep(tokenSet);

  // Write the tokenSetCopy to a file
  fs.writeFileSync(
    path.join(__dirname, "../tokenSet.json"),
    JSON.stringify(tokenSetCopy)
  );

  console.log("Token set stored");
};

/**
 * Get the token set from the local file
 * @returns {object} tokenSet
 */
const getTokenSet = () => {
  try {
    const tokenSet = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../tokenSet.json"))
    );

    return tokenSet;
  } catch (error) {
    console.log("No token set found");
    return null;
  }
};

/**
 * Authorize Xero from local token
 */
const authorizeXero = async () => {
  const tokenSet = getTokenSet();

  if (!tokenSet) {
    console.log("No token set found");
    return;
  }

  xero.setTokenSet(tokenSet);

  console.log("Xero authorized");
};

const getAccessToken = async (req, res) => {
  // Get URL params from req
  const { code } = req.query;

  // Store the code in the session
  req.session.code = code;

  // Exchange the code for an access token
  const tokenSet = await xero.apiCallback(req.url);

  // Store the token set in the session
  req.session.tokenSet = tokenSet;

  console.log("Got a new access token");

  await xero.setTokenSet(tokenSet);

  if (tokenSet.expired()) {
    await xero.refreshToken();
  }

  storeTokenSet(tokenSet);

  res.redirect("/");

  res.send();

  return tokenSet;
};

/**
 *
 */
const getProfitAndLoss = async () => {
  // Get old report from session

  // if (process.env.USE_SAMPLE_DATA) {
  //   const report = JSON.parse(
  //     fs.readFileSync(path.join(__dirname, "../samplePL.json"))
  //   );

  //   return report;
  // }

  console.log("Getting Profit and Loss report");

  try {
    // Get the Profit and Loss report
    const report = await xero.accountingApi.getReportProfitAndLoss(
      process.env.XERO_TENANT_ID,
      // First day of the month as YYYY-MM-DD
      new Date().toISOString().split("T")[0].slice(0, 8) + "01",
      // Last day of the month as YYYY-MM-DD
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .split("T")[0],
      11,
      "MONTH"
    );

    return report.body;
  } catch (error) {
    console.error(error.response.body);

    return false;
  }
};

/**
 *
 */
const getInvoices = async () => {
  try {
    const invoices = await xero.accountingApi.getInvoices(
      process.env.XERO_TENANT_ID
    );

    return invoices.body;
  } catch (error) {
    console.error(error.response.body);

    return false;
  }
};

/** */
const getBankSummary = async () => {
  try {
    const bankSummary = await xero.accountingApi.getReportBankSummary(
      process.env.XERO_TENANT_ID
    );

    return bankSummary.body;
  } catch (error) {
    console.error(error.response.body);

    return false;
  }
};

/**
 *
 * @param {*} report
 * @param {*} rowTitle
 * @returns
 */
const findRowByTitle = (report, rowTitle) => {
  const rows = report.reports[0].rows;

  const theRow = rows
    .map((row) => {
      return row.rows;
    })
    .flat()
    .splice(1)
    .find((row) => row.cells[0].value === rowTitle);

  if (!theRow) {
    return false;
  }

  return theRow.cells.slice(1).map((cell) => cell.value);
};

/**
 *
 * @param {*} report
 * @param {*} title
 * @returns
 */
const findSummaryRowByTitle = (report, title) => {
  const rows = report.reports[0].rows;

  const section = rows.find((row) => row.title === title);

  if (!section) {
    return false;
  }

  const summaryRow = section.rows.find((row) => row.rowType === "SummaryRow");

  if (!summaryRow) {
    return false;
  }

  return summaryRow.cells.slice(1).map((cell) => cell.value);
};

/**
 *
 * @returns
 */
const processReport = async () => {
  console.log("Processing report");

  const report = await getProfitAndLoss();

  // console.log(report);

  if (!report) {
    return false;
  }

  const rows = report.reports[0].rows[0].cells
    .slice(1)
    .map((cell) => new Date(cell.value));

  // Get the total cost of sales
  const totalCostOfSales = findSummaryRowByTitle(report, "Less Cost of Sales");

  // Get the total operating expenses
  const totalOperatingExpenses = findSummaryRowByTitle(
    report,
    "Less Operating Expenses"
  );

  // Get the partnership sales
  const partnershipSales = findRowByTitle(report, "Sales - Partnership");

  // Get the total sales
  const totalSales = findSummaryRowByTitle(report, "Billable Income");

  // Operating Profit
  const operatingProfit = findRowByTitle(report, "Operating Profit");

  // Gross Profit
  const grossProfit = findRowByTitle(report, "Gross Profit");

  const processedReport = rows
    .map((row, index) => {
      return {
        date: row,
        costOfSales: totalCostOfSales[index],
        totalSales: totalSales[index],
        partnershipSales: partnershipSales[index],
        nonPartnershipSales: totalSales[index] - partnershipSales[index],
        operatingExpenses: totalOperatingExpenses[index],
        operatingProfit: operatingProfit[index],
        grossProfit: grossProfit[index],
      };
    })
    .sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

  // console.log(processedReport);

  return processedReport;
};

/**
 *
 */
const processBankSummary = async () => {
  console.log("Processing bank summary");

  const report = await getBankSummary();

  // console.log(report);

  if (!report) {
    return false;
  }

  const iwAccountRow = findRowByTitle(report, "Interactive Workshops");

  const reserveAccountRow = findRowByTitle(report, "Reserve Account 1");

  return {
    iwAccount: iwAccountRow[3],
    reserveAccount: reserveAccountRow[3],
  };
};

/**
 *
 */
const processCashFlow = async () => {
  console.log("Processing cash flow");

  const averageYearlyExpenses = 2040000;

  const cashFlowTransactions = [];

  const startingBalance = await processBankSummary();

  cashFlowTransactions.push({
    date: new Date(),
    transaction:
      parseFloat(startingBalance.iwAccount) +
      parseFloat(startingBalance.reserveAccount),
  });

  // Add daily expenses
  for (let i = 0; i < 365; i++) {
    const date = new Date();

    date.setDate(date.getDate() + i);

    cashFlowTransactions.push({
      date: date,
      transaction: Math.round((averageYearlyExpenses / 365) * -100) / 100,
    });

    // Add quarterly tax payments based on the
  }

  // Add all invoices on their due date
  const invoices = await processInvoices();

  if (invoices) {
    cashFlowTransactions.push(...invoices);
  }

  return cashFlowTransactions.sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });
};

/**
 *
 */
const processInvoices = async () => {
  console.log("Processing invoices");

  const invoices = await getInvoices();

  // console.log(invoices);

  if (!invoices) {
    return false;
  }

  // Filter out the invoices that are paid
  const unpaidInvoices = invoices.invoices.filter(
    (invoice) => invoice.amountDue > 0
  );

  // Filter out the invoices with a due date in the past and no more than 365 days in the future
  const futureInvoices = unpaidInvoices.filter(
    (invoice) =>
      new Date(invoice.dueDate) > new Date() &&
      new Date(invoice.dueDate) < new Date().setDate(new Date().getDate() + 365)
  );

  return futureInvoices.map((invoice) => ({
    date: new Date(invoice.dueDate),
    transaction: invoice.amountDue,
  }));
};

module.exports = {
  xero,
  getAccessToken,
  authorizeXero,
  getProfitAndLoss,
  processReport,
  getBankSummary,
  processBankSummary,
  processCashFlow,
  processInvoices,
};
