/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-from-scratch-to-fullstack",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile:
            input?.stage === "production"
              ? "fireship-production"
              : "fireship-dev",
        },
      },
    };
  },
  async run() {
    const secretApiKey = new sst.Secret("ApiKey");

    const backend = new sst.aws.Function("Backend", {
      url: true,
      handler: "./apps/backend/src/index.handler",
      runtime: "nodejs20.x",
      architecture: "arm64",
      streaming: !$dev,
      link: [secretApiKey],
    });

    const frontend = new sst.aws.Remix("Frontend", {
      path: "apps/frontend/",
      environment: {},
      link: [backend, secretApiKey],
    });
    return {
      backend: backend.url,
      frontend: frontend.url,
    };
  },
});
