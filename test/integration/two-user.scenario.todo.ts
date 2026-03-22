import {
  hasTwoUserIntegrationConfig,
  loadTwoUserIntegrationConfig,
} from "./helpers/config.js";

export function loadFutureTwoUserScenarioConfig() {
  if (!hasTwoUserIntegrationConfig()) {
    return undefined;
  }

  return loadTwoUserIntegrationConfig();
}
