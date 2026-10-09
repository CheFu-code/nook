const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const configuredPath = process.env.GOOGLE_SERVICES_JSON || "google-services.json";
  const googleServicesPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, configuredPath);

  if (!fs.existsSync(googleServicesPath)) {
    if (process.env.EAS_BUILD === "true") {
      throw new Error(
        "GOOGLE_SERVICES_JSON must point to the Firebase google-services.json for co.za.chefu.nook.",
      );
    }
    return config;
  }

  const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, "utf8"));
  const androidClient = googleServices.client?.find(
    (client) =>
      client.client_info?.android_client_info?.package_name === "co.za.chefu.nook",
  );

  if (!androidClient) {
    throw new Error(
      "The configured google-services.json does not contain an Android client for co.za.chefu.nook.",
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: googleServicesPath,
    },
  };
};
