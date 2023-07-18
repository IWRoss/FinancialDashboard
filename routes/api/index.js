const express = require("express"),
  router = express.Router();

const actions = {};

/**
 * POST /api/slack
 *
 * This route is used to handle all Slack actions.
 */
router.post("/xero/callback", async (req, res) => {
  // Parse the request payload
  const payload = JSON.parse(req.body.payload);

  console.log(payload);

  res.send();
});

module.exports = router;
