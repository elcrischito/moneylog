import { app } from "./app";
import { assertProductionConfig, config } from "./config";

assertProductionConfig();

const port = config.port();
app.listen(port, "0.0.0.0", () => {
  console.log(`MoneyLog API listening on port ${port}`);
});
