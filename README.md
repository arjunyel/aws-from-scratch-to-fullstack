# AWS From Scratch To Fullstack

## Introduction

"What has been will be again, what has been done will be done again; there is nothing new under the sun."

The cloud was a gift to developers, allowing creativity to be unburdened by the physical reality of managing physical infrastructure. You could click a button and have your idea live in the world. For a time, life was good. Too good.

We got addicted to the simplicity of "it's someone else's problem." In a never-ending chase of abstractions to make our lives easier, we increasingly farm out our work to third-party dev tool companies, trading flexibility and self-sovereignty for the allure of a better developer experience. It is understandable to anyone who has had to use the AWS console. We began unbundling the cloud into numerous companies that host a single aspect of our application as if they were Unix command line tools.

Now, we are running into issues on multiple dimensions. The big companies are finding it cheaper to buy than rent. Some things don't change. Price will always be an issue. The small indie devs with zero users find their tech stack and data scattered across multiple GUIs and third-party databases, quickly becoming very complex to piece together.

![Strong men make good times, good times make  weak men, weak men make hard times, hard times makes strong men](./hard-times.webp)

We are returning to the heydey of the cloud, where instead of building on top of someone's wrapper over a hyperscaler, we can deploy and use the hyperscaler clouds directly. Infrastructure as Code (IaC) tools allow us to deploy to AWS with a much better experience than before. We might not retain 100% of the developer experience benefits of the initial stages of unbundling, but we gain so much back from having everything under one login.

The following is a tutorial on developing and deploying a fullstack application to AWS. We set up the AWS account from scratch, and then we use SST, an open-source IaC framework that makes it easy to build modern applications on your own infrastructure. It uses Pulumi under the hood, which gives you access to over 150 infrastructure providers, and has built-in components for AWS and Cloudflare.

<https://x.com/thdxr/status/1830990051322237260>

<https://olivergilan.com/blog/cloud-hasnt-been-won/>

## Setup AWS Environment

We will set up three AWS accounts: management, production, and dev. <https://sst.dev/docs/aws-accounts>

### Management Account

The first step is to create a management account by signing up for a new AWS account. <https://signin.aws.amazon.com/signup>

For the email address, if you are setting this up for work, use a shared email account such as <aws@fireship.io>. If it's your personal email, I'd recommend using a subaddress like <jeff+aws@fireship.io>. For the account name, we'll use "ManagementAccount." The password can be anything strong and random. This account will be powerful and rarely used, so you can do the password reset flow to get back in if needed.

After the account is completed, if you want to avoid ending up on the front page of Hacker News the first thing you should do is create a budget in `Billing and Cost Management -> Budgets`.

### Create Production and Dev Accounts

We want to separate the production and development environments to avoid inevitable accidents. Go to `AWS Organizations` and press the Create button. You should see a Root organization with the ManagementAccount nested inside. We will create two accounts on this screen, Production and Development. We will again use subaddressing for the email, depending on if we are setting this up for work or personal use.

Production ->
Work: <aws+prod@fireship.io>
Personal: <jeff+awsprod@fireship.io>

Development ->
Work: <aws+dev@fireship.io>
Personal: <jeff+awsdev@fireship.io>

### Setting up our user

For our final action in the ManagementAccount, we need to create ourselves a user in IAM Identity Center. This is also how we'll make other users who need access to our AWS account and projects, albeit with just the permissions and account access they need.

AWS is separated into different regions; we must pick our primary one. A lot goes into picking a region, such as price, latency, and available services, so take your time.

- <https://www.concurrencylabs.com/blog/choose-your-aws-region-wisely/>
- <https://www.aws-services.info/regions.html>

The default choice if you need help deciding is `us-east-1`. It is AWS's primary region, gets new services the fastest, and is the cheapest. The downside is it has a reputation for more downtime.

Go to `IAM Identity Center` and pick your primary region in the top right. Note that many AWS managed applications can operate only in the same region where you enabled `IAM Identity Center`. Click enable, which will take you to the dashboard. On the right-hand side, you'll see your AWS access portal URL. Bookmark this, as this is how you'll log in to AWS from now on.

On the left, click Users -> Add User. The username will be our email address (<jeff@fireship.io>). You don't have to add them to any group.

Next, go to `Permission Sets` and create a permission set with the predefined `AdministratorAccess` and a session duration of 12 hours.

Now, go to `AWS accounts`, select our three accounts under root, and `Assign users or groups`. Under Users, select ourselves and the AdministratorAccess permission set. You can now log out of the ManagementAccount, use the email you got to set up your new account, and log in to the console using your AWS access portal URL.

## Setup our local development environment

We start setting up our development environment by downloading the AWS CLI. For MacOS, I used Brew. <https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html>

The AWS CLI can use our IAM user to generate short-lived (12-hour) credentials instead of storing API keys on our computer. Create the file `~/.aws/config` and add three entries to it, replacing fireship with either your personal username or company name:

```config
[sso-session fireship]
sso_start_url = your AWS access portal URL like <https://d-111111.awsapps.com/start>
sso_region = Your IAM Identity center region like us-east-1

[profile fireship-dev]
sso_session = Name from sso-session, in our example fireship
sso_account_id = AWS account ID without dashes. Can get this from your AWS access portal to the left of the email address
sso_role_name = AdministratorAccess
region = us-east-1

[profile fireship-production]
sso_session = fireship
sso_account_id = AWS account ID
sso_role_name = AdministratorAccess
region = us-east-1
```

Full example:

```config
[sso-session fireship]
sso_start_url = <https://d-11111.awsapps.com/start>
sso_region = us-east-1

[profile fireship-dev]
sso_session = fireship
sso_account_id = 111111111111
sso_role_name = AdministratorAccess
region = us-east-1

[profile fireship-production]
sso_session = fireship
sso_account_id = 111111111111
sso_role_name = AdministratorAccess
region = us-east-1
```

Test that everything worked by generating your credentials:

```bash
aws sso login --sso-session=fireship
```

Then get your identity for the dev environment:

```bash
aws sts get-caller-identity --profile=fireship-dev
```

## Setup a monorepo

A monorepo is the recommended way to set up our project, as we can share code and infrastructure management for all our different applications in one place. We will use NX for this tutorial but Turborepo is another option.

Initialize the project with `npx create-nx-workspace@latest`, stack -> none, and integrated monorepo.

In package.json add

```json
{
  "workspaces": ["packages/*", "libs/*"],
  "sideEffects": false,
  "type": "module"
}
```

Install some beginning dependencies: `npm i -D prettier typescript @tsconfig/strictest`

Create tsconfig.json

```json
{
  "extends": "@tsconfig/strictest/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {}
  }
}
```

### AWS Lambda backend

Lets create an AWS Lambda to serve our backend. We will use [Hono](https://hono.dev/) and [Zod](https://zod.dev/),allowing us to auto-generate an OpenAPI document.

Install the dependencies:

```bash
npm i -D @types/node @types/aws-lambda tsx`
```

```bash
npm i @hono/zod-openapi hono zod yaml
```

Create `apps/backend/package.json`

```json
{
  "name": "@repo/backend",
  "private": true,
  "type": "module",
  "sideEffects": false
}
```

Create `apps/backend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json"
}
```

Lets create our Hono application in `apps/backend/src/api.ts`

```typescript
import { createRoute, OpenAPIHono, RouteHandler, z } from "@hono/zod-openapi";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";

export type Env = {
  Bindings: {
    event: LambdaEvent;
    context: LambdaContext;
  };
  Variables: {};
};

const app = new OpenAPIHono<Env>();
```

Now we'll make a GET route that returns some wise wisdom

```typescript
const wisdomGetRoute = createRoute({
  method: "get",
  path: "/wisdom",
  summary: "Get wise wisdom",
  tags: ["Wisdom"],
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

const wisdomGetHandler: RouteHandler<typeof wisdomGetRoute, Env> = async (c) => {
  return c.json({ wisdom: "Subscribe to Fireship!" }, 200);
};

app.openapi(wisdomGetRoute, wisdomGetHandler);

export { app };
```

Finally, we will expose the server in an AWS Lambda-friendly format by exporting it under the name handle in `apps/backend/src/index.ts`. We will use the AWS Lambda streaming feature in production and disable it in development.

```typescript
import { handle, streamHandle } from "hono/aws-lambda";
import { app } from "./api";

export const handler = process.env["SST_LIVE"] ? handle(app) : streamHandle(app);
```

### Remix frontend

Lets deploy a Remix application to AWS. Start by creating the folder `apps/frontend`, open the terminal in that folder, and run `npx create-remix@latest` Choose the location as "." ,don't initalize git, and dont install the dependencies. In `apps/frontend/package.json` add a name, like @repo/frontend and move all the dependencies/dev dependencies to the main package.json, removing the duplicates by choosing the latest version.

Run `npm install` in the root of the project. While that runs modify `apps/frontend/tsconfig.json` by extending from "../../tsconfig.json" and removing lib, target, baseUrl, and paths. Eslint will require more setup to work correctly, which is out of the scope of this tutorial.

### Setup SST

In `package.json`, lets add two script for logging into the AWS CLI, we'll need to run these every 12 hours because our credentials expire.

```json
{
  "scripts": {
    "dev": "sst dev",
    "sso-dev": "aws sso login --profile fireship-dev",
    "sso-prod": "aws sso login --profile fireship-production"
  }
}
```

Run `npx sst@latest init` in the project root and choose AWS. In the newly created `sst.config.ts`, under `home: "aws"`, add a providers config that points to the profile names we created in `~/.aws/config`

```typescript
{
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
  }
}
```

In the run section we will setup our front and backend

```typescript
{
  async run() {
    const backend = new sst.aws.Function("Backend", {
      url: true,
      handler: "./apps/backend/src/index.handler",
      runtime: "nodejs20.x",
      architecture: "arm64",
      streaming: !$dev,
  });

    const frontend = new sst.aws.Remix("Frontend", {
      path: "apps/frontend/",
      environment: {},
  });
    return {
      backend: backend.url,
      frontend: frontend.url,
    };
  }
}
```

Now login to the dev environment `npm run sso-dev`

Run SST's development mode with `npm run dev`. The first time, it will error. Wait 10 - 15 minutes for AWS to set up the IoT service, and then it should work.

The CLI has multiple sections you can navigate through. The first one gives us the URLs, functions give us logs from our various services, and the frontend is the output from Remix. Test everything works by navigating to the frontend app and `${backend URL}/wisdom`.

### Secure the backend with an API key

Our backend Lambda uses the [function URL feature](https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html). When we deploy it to prod, it will be accessible to the Internet. Let's protect it with Bearer authentication and a randomly generated API key.

In our SST config, add a secret and link it to the backend

```typescript
{
  async run() {
    const secretApiKey = new sst.Secret("ApiKey");

    const backend = new sst.aws.Function("Backend", {
      ...,
      link: [secretApiKey],
    });

    ...
  }
}
```

Using your terminal, set the secret value for your dev environment.

```bash
npx sst secret set ApiKey randomsecurestring
```

In our Hono app, right below the `new OpenAPIHono` and before our route definitions, let's add middleware to verify that the API key is passed in the headers via the form of Bearer auth. Note that `Resource.ApiKey` will come up as undefined until the next time we `npm run dev`.

```typescript
import { bearerAuth } from "hono/bearer-auth";
import type { Context } from "hono";
import { Resource } from "sst";

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
```

In our `wisdomGetRoute` we'll add a property so the OpenAPI document has our security information.

```typescript
{
  security: [
    {
      Bearer: []
    },
  ],
}
```

### Link backend with frontend

Now lets connect the frontend and backend. In `sst.config.ts` use the link feature:

```typescript
{
  async run() {
    ...

    const frontend = new sst.aws.Remix("Frontend", {
      path: "apps/frontend/",
      environment: {},
      link: [backend, secretApiKey],
    });
  }
}
```

`apps/frontend/app/routes/_index.tsx` we add a Remix loader that calls our backend with our API key

```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Resource } from "sst";

export const loader = async (args: LoaderFunctionArgs) => {
  const { wisdom } = await fetch(`${Resource.Backend.url}/wisdom`, {
    headers: {
      Authorization: `Bearer ${Resource.ApiKey.value}`,
    },
  }).then((res) => res.json() as Promise<{ wisdom: string }>);
  return { wisdom };
};

export default function Index() {
  const { wisdom } = useLoaderData<typeof loader>();
  return <div>{wisdom}</div>;
}
```

Now when you navigate to the frontend you should be blessed with wisdom!

## Deploy to production

1. Add a script to `package.json`

   ```json
   {
     "scripts": {
       "deploy-prod": "NODE_ENV=production sst deploy --stage=production"
     }
   }
   ```

1. Login to the production environment

   ```bash
   npm run sso-prod
   ```

1. Set the production API key

   ```bash
   npx sst secret set ApiKey --stage=production randomsecurestringPROD
   ```

1. Ship it!

   ```bash
   npm run deploy-prod
   ```

You are now deployed to production! Record the backend URL for the final step.

## Generate OpenAPI document

As the final step, we'll generate an OpenAPI document from our backend. You can use this for various things, such as autogenerating client SDKs or helping an external team use your API.

Create `apps/backend/scripts/generate-openapi.ts`

```typescript
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
```

And in the root package.json add another script:

```json
{
  "scripts": {
    "generate-openapi": "sst shell tsx ./apps/backend/scripts/generate-openapi.ts"
  }
}
```

Test it by opening the `openapi-docs.yml` file with <https://editor-next.swagger.io/>

## Next steps

When you are ready to deploy your zero user app to production and want to monitor, debug, and setup CI/CD check out the SST console <https://sst.dev/docs/console>

If you are new to AWS or just want to learn more, check out @adamdotdev's free ProAWS course. His section on setting up your AWS account heavily influenced this tutorial. <https://www.proaws.dev/>
