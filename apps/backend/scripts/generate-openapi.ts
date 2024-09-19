import { app } from "../src/api";
import { stringify } from "yaml";
import { writeFileSync } from "node:fs";

const docs = app.getOpenAPI31Document({
  openapi: "3.1.0",
  info: {
    title: "AWS From Scratch to Fullstack",
    version: "1.0.0",
  },
  servers: [
    {
      description: "Production API Server.",
      url: "<Insert Production URL here>",
    },
  ],
});

const fileContent = stringify(docs);

writeFileSync(`./openapi-docs.yml`, fileContent, {
  encoding: "utf-8",
});
