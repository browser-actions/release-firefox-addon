import { AMOClient, LICENSE_NAMES, isLicense } from "./amo";
import fs from "fs";
import * as core from "@actions/core";
import timers from "timers/promises";

const CHECK_ADDON_STATUS_INTERVAL = 3000;
const CHECK_ADDON_STATUS_TIMEOUT = 20000;

async function run(): Promise<void> {
  const addonId = core.getInput("addon-id");
  const addonPath = core.getInput("addon-path");
  const sourcePath = core.getInput("source-path") || undefined;
  const approvalNote = core.getInput("approval-note") || undefined;
  const compatibilityFirefoxMin =
    core.getInput("compatibility-firefox-min") || undefined;
  const compatibilityFirefoxMax =
    core.getInput("compatibility-firefox-max") || undefined;
  const license = core.getInput("license") || undefined;
  const releaseNote = core.getInput("release-note");
  const channel = core.getInput("channel") || undefined;
  const authIssuer = core.getInput("auth-api-issuer");
  const authSecret = core.getInput("auth-api-secret");

  if (channel !== "listed" && channel !== "unlisted") {
    throw new Error(
      `Invalid channel "${channel}".  Must be "listed" or "unlisted"`
    );
  }
  if (typeof license !== "undefined" && !isLicense(license)) {
    throw new Error(
      `Invalid license "${license}".  Must be one of: ${Object.keys(
        LICENSE_NAMES
      ).join(", ")}`
    );
  }

  const client = new AMOClient({
    auth: {
      issuer: authIssuer,
      secret: authSecret,
    },
  });

  const addonZip = fs.createReadStream(addonPath);
  const upload = await client.uploadAddon(addonZip, channel);

  core.info(
    `Addon "${addonPath}" has been uploaded with UUID "${upload.uuid}"`
  );

  for await (const startTime of timers.setInterval(
    CHECK_ADDON_STATUS_INTERVAL,
    Date.now()
  )) {
    const status = await client.getUpload(upload.uuid);

    if (status.processed) {
      break;
    }

    if (Date.now() - startTime > CHECK_ADDON_STATUS_TIMEOUT) {
      throw new Error("timed-out waiting for addon to be processed");
    }
  }
  core.info(`Addon "${upload.uuid}" has been processed`);

  let version = await client.getVersionOrUndefined(addonId, upload.version);
  if (typeof version === "undefined") {
    version = await client.createVersion(addonId, {
      approval_notes: approvalNote,
      compatibility: {
        firefox: {
          max: compatibilityFirefoxMax,
          min: compatibilityFirefoxMin,
        },
      },
      license: license,
      release_notes: {
        "en-US": releaseNote,
      },
      upload: upload.uuid,
    });
    core.info(`Version "${version.version}" has been created`);
  } else {
    core.info(`Version "${version.version}" already exists`);
  }

  if (sourcePath) {
    const sourceZip = fs.createReadStream(sourcePath);
    const src = await client.uploadSource(
      addonId,
      version.version,
      sourceZip,
      license
    );
    core.info(`Source "${sourcePath}" has been uploaded to "${src.source}"`);
  }

  core.setOutput("version", version.version);
  core.setOutput("version-id", version.id);
  core.setOutput("version-edit-url", version.edit_url);

  core.info(`Version "${version.version}" has been published`);
}

(async () => {
  try {
    await run();
  } catch (error) {
    core.setFailed(String(error));
  }
})();
