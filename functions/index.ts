/*
 * This function is taken from remix repository and modified slightly to be able to run with firebase function
 * https://github.com/remix-run/remix/blob/main/packages/create-remix/templates/express/server/index.js
 */

import * as functions from "firebase-functions";
const path = require("path");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

const BUILD_FOLDER = "../build/app";
const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), BUILD_FOLDER);

const app = express();
app.use(compression());

// You may want to be more aggressive with this caching
app.use(express.static("public", { maxAge: "1h" }));

// Remix fingerprints its assets so we can cache forever
app.use(express.static("public/build", { immutable: true, maxAge: "1y" }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.all(
  "*",
  MODE === "production"
    ? createRequestHandler({ build: require(BUILD_FOLDER) })
    : (req: any, res: any, next: any) => {
        purgeRequireCache();
        const build = require(BUILD_FOLDER);
        return createRequestHandler({ build, mode: MODE })(req, res, next);
      }
);

export const remixServer = functions.https.onRequest(app);

////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
