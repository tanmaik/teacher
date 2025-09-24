# Vercel Sandbox

Vercel Sandbox is available in [Beta](/docs/release-phases#beta) on [all plans](/docs/plans)

Vercel Sandbox is an ephemeral compute primitive designed to safely run untrusted or user-generated code on Vercel. It supports dynamic, real-time workloads for AI agents, code generation, and developer experimentation.

With Vercel Sandbox, you can:

*   Execute untrusted or third-party code: When you need to run code that has not been reviewed, such as AI agent output or user uploads, without exposing your production systems.
    
*   Build dynamic, interactive experiences: If you are creating tools that generate or modify code on the fly, such as AI-powered UI builders or developer sandboxes such as language playgrounds.
    
*   Test backend logic in isolation: Preview how user-submitted or agent-generated code behaves in a self-contained environment with access to logs, file edits, and live previews.
    
*   Run a development server to test your application.
    

## [Using Vercel Sandbox](#using-vercel-sandbox)

*   Get started with using Vercel Sandbox with the [getting started guide](#getting-started) and [examples](/docs/vercel-sandbox/examples)
*   Learn about [authentication methods](#authentication) and the [SDK reference](/docs/vercel-sandbox/reference/globals)
*   [Understand how to monitor your sandboxes](#observability)
*   Review [pricing](/docs/vercel-sandbox/pricing#pricing), [resource limits](/docs/vercel-sandbox/pricing#resource-limits) and [system specifications](/docs/vercel-sandbox#system-specifications)

## [Getting started](#getting-started)

### [Pre-requisites](#pre-requisites)

*   [The Vercel CLI](https://vercel.com/docs/cli)

### [Create a sandbox](#create-a-sandbox)

In the steps below, you will create a sandbox with 4 vCPUs that uses `node22` runtime to run a Next.js application.

1.  ### [Set up your environment](#set-up-your-environment)
    
    Create a new directory `sandbox-test` and install the `@vercel/sandbox` and `ms` packages:
    
    pnpmyarnnpmbun
    
    ```
    pnpm i @vercel/sandbox ms
    ```
    
    Add the required type definitions for `ms` and `node`:
    
    ```
    pnpm add -D @types/ms @types/node
    ```
    
2.  #### [Set up authentication](#set-up-authentication)
    
    From the `sandbox-test` directory you just created, link a new or existing project:
    
    ```
    vercel link
    ```
    
    Then pull the project's environment variables:
    
    ```
    vercel env pull
    ```
    
    This pulls a Vercel OIDC token into your `.env.local` file that the SDK will use to authenticate with.
    
3.  ### [Create the set up file](#create-the-set-up-file)
    
    In the code below, you will:
    
    *   Clone a Github repository of a Next.js application (Review [Using a private repository](/docs/vercel-sandbox/examples#using-a-private-repository) to clone a private repository)
    *   Install the dependencies for the application
    *   Run a `next dev` server and listen to port `3000`
    *   Open the sandbox URL (`sandbox.domain(3000)`) in a browser and stream logs to your terminal
    *   The sandbox will stop after the configurable 10 minute timeout.
    
    ```
    import ms from 'ms';
    import { Sandbox } from '@vercel/sandbox';
    import { setTimeout } from 'timers/promises';
    import { spawn } from 'child_process';
     
    async function main() {
      const sandbox = await Sandbox.create({
        source: {
          url: 'https://github.com/vercel/sandbox-example-next.git',
          type: 'git',
        },
        resources: { vcpus: 4 },
        // Timeout in milliseconds: ms('10m') = 600000
        // Defaults to 5 minutes. The maximum is 5 hours for Pro/Enterprise, and 45 minutes for Hobby.
        timeout: ms('10m'),
        ports: [3000],
        runtime: 'node22',
      });
     
      console.log(`Installing dependencies...`);
      const install = await sandbox.runCommand({
        cmd: 'npm',
        args: ['install', '--loglevel', 'info'],
        stderr: process.stderr,
        stdout: process.stdout,
      });
     
      if (install.exitCode != 0) {
        console.log('installing packages failed');
        process.exit(1);
      }
     
      console.log(`Starting the development server...`);
      await sandbox.runCommand({
        cmd: 'npm',
        args: ['run', 'dev'],
        stderr: process.stderr,
        stdout: process.stdout,
        detached: true,
      });
     
      await setTimeout(500);
      spawn('open', [sandbox.domain(3000)]);
    }
     
    main().catch(console.error);
    ```
    
4.  ### [Start the sandbox](#start-the-sandbox)
    
    Run the following command in your terminal:
    
    ```
    node --env-file .env.local --experimental-strip-types ./next-dev.ts
    ```
    
    Once the application opens in your browser, you can view the logs in the terminal as you interact with it.
    
5.  ### [Access the sandbox](#access-the-sandbox)
    
    The script opens the `next dev` server in your browser. The public URL is resolved using the `sandbox.domain(3000)` method.
    
    You'll see the development server logs streaming in real-time to your terminal as you interact with the application.
    
6.  ### [Stop the sandbox](#stop-the-sandbox)
    
    To stop a sandbox, you can:
    
    *   Navigate to the [Observability tab](#observability) of your project
    *   Find your sandbox in the list, and click Stop
    
    If you do not stop the sandbox, it will stop after the 10 minute timeout has elapsed.
    
    The SDK also provides the [`stop`](/docs/vercel-sandbox/reference/classes/sandbox#stop) method to programmatically stop a running sandbox.
    

## [Authentication](#authentication)

### [Vercel OIDC token](#vercel-oidc-token)

The SDK uses Vercel OIDC tokens to authenticate whenever available. This is the most straightforward and recommended way to authenticate.

When developing locally, you can download a development token to `.env.local` using `vercel env pull`. After 12 hours the development token expires, meaning you will have to call `vercel env pull` again.

In production, Vercel manages token expiration for you.

### [Using access tokens](#using-access-tokens)

If you want to use the SDK from an environment where `VERCEL_OIDC_TOKEN` is unavailable, you can also authenticate using an access token. You will need

*   your [Vercel team ID](https://vercel.com/docs/accounts#find-your-team-id)
*   your [Vercel project ID](https://vercel.com/docs/project-configuration/general-settings#project-id)
*   a [Vercel access token](https://vercel.com/docs/rest-api/reference/welcome#creating-an-access-token) with access to the above team

Set your team ID, project ID, and token to the environment variables `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`. Then pass these to the `create` method:

```
const sandbox = await Sandbox.create({
  teamId: process.env.VERCEL_TEAM_ID!,
  projectId: process.env.VERCEL_PROJECT_ID!,
  token: process.env.VERCEL_TOKEN!,
  source: {
    url: 'https://github.com/vercel/sandbox-example-next.git',
    type: 'git',
  },
  resources: { vcpus: 4 },
  timeout: ms('5m'), //timeout in milliseconds: ms('5m') = 300000
  ports: [3000],
  runtime: 'node22',
});
```

## [System specifications](#system-specifications)

Sandbox includes a `node22` and `python3.13` image. In both of these images:

*   User code is executed as the `vercel-sandbox` user.
*   The default working directory is `/vercel/sandbox`.
*   `sudo` access is available.

|  | Runtime | Package managers |
| --- | --- | --- |
| `node22` | `/vercel/runtimes/node22` | `npm`, `pnpm` |
| `python3.13` | `/vercel/runtimes/python` | `pip`, `uv` |

### [Available packages](#available-packages)

The base system is Amazon Linux 2023 with the following additional packages:

`bind-utils bzip2 findutils git gzip iputils libicu libjpeg libpng ncurses-libs openssl openssl-libs procps tar unzip which whois zstd`

Users can install additional packages using the `dnf` package manager:

```
import { Sandbox } from '@vercel/sandbox';
 
const sandbox = await Sandbox.create();
await sandbox.runCommand({
  cmd: 'dnf',
  args: ['install', '-y', 'golang'],
  sudo: true,
});
```

You can find the [list of available packages](https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.7.html) on the Amazon Linux documentation.

### [Sudo config](#sudo-config)

The sandbox sudo configuration is designed to be easy to use:

*   `HOME` is set to `/root`. Commands executed with sudo will source root's configuration files (e.g. `.gitconfig`, `.bashrc`, etc).
*   `PATH` is left unchanged. Local or project-specific binaries will still be available when running with elevated privileges.
*   The executed command inherits all other environment variables that were set.

## [Observability](#observability)

To view sandboxes that were started per project, inspect the command history and view the sandbox URLs, access the Sandboxes [insights](/docs/observability/insights#sandbox) page by:

*   From the Vercel dashboard, go to the project where you created the sandbox
*   Click the Observability tab
*   Click Sandboxes on the left side of the Observability page

To track compute usage for your sandboxes across projects, go to the [Usage](/docs/pricing/manage-and-optimize-usage#viewing-usage) tab of your Vercel dashboard.
