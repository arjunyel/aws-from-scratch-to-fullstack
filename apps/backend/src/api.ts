import { createRoute, OpenAPIHono, RouteHandler, z } from "@hono/zod-openapi";
import { type LambdaContext, type LambdaEvent } from "hono/aws-lambda";
import { bearerAuth } from "hono/bearer-auth";
import type { Context } from "hono";
import { Resource } from "sst";

export type Env = {
  Bindings: {
    event: LambdaEvent;
    context: LambdaContext;
  };
  Variables: {};
};

const app = new OpenAPIHono<Env>();

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
});

app.use(
  bearerAuth({
    verifyToken: async (token, c: Context<Env>) => {
      // In a production application use a timing safe string compare such as from the Deno standard library
      // https://jsr.io/@std/crypto/doc/~/timingSafeEqual
      return token === Resource.ApiKey.value ? true : false;
    },
  }),
);

const wisdomGetRoute = createRoute({
  method: "get",
  path: "/wisdom",
  summary: "Get wise wisdom",
  tags: ["Wisdom"],
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      description: "Here is some wisdom",
      content: {
        "application/json": {
          schema: z.object({ wisdom: z.string() }),
        },
      },
    },
  },
});

const wisdomGetHandler: RouteHandler<typeof wisdomGetRoute, Env> = async (
  c,
) => {
  return c.json({ wisdom: "Subscribe to Fireship!" }, 200);
};

app.openapi(wisdomGetRoute, wisdomGetHandler);

export { app };
