import { handle, streamHandle } from "hono/aws-lambda";
import { app } from "./api";

export const handler = process.env["SST_LIVE"]
  ? handle(app)
  : streamHandle(app);
