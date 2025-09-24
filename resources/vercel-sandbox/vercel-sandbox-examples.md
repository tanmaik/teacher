# Vercel Sandbox examples

Vercel Sandbox is available in [Beta](/docs/release-phases#beta) on [all plans](/docs/plans)

Learn how to use the Sandbox SDK through real-life examples.

## [Using a private repository](#using-a-private-repository)

In this example, you create an isolated environment from a private Git repository by authenticating with a [GitHub personal access token](#fine-grained-personal-access-token) or [GitHub App token](#other-github-methods), and run a simple command inside the sandbox.

The `Sandbox.create()` method initializes the environment with the provided repository and configuration options, including authentication credentials, `timeout`, and exposed `ports`. Once created, you can execute commands inside the sandboxed environment using `runCommand`.

```
import { Sandbox } from '@vercel/sandbox';
import ms from 'ms';

async function main() {
  const sandbox = await Sandbox.create({
    source: {
      url: 'https://github.com/vercel/some-private-repo.git',
      type: 'git',
      // For GitHub, you can use a fine grained, classic personal access token or GitHub App installation access token
      username: 'x-access-token',
      password: process.env.GIT_ACCESS_TOKEN!,
    },
    timeout: ms('5m'),
    ports: [3000],
  });

  const echo = await sandbox.runCommand('echo', ['Hello sandbox!']);
  console.log(`Message: ${await echo.stdout()}`);
}

main().catch(console.error);
```

### [GitHub access token options](#github-access-token-options)

There are several ways to authenticate with private GitHub repositories.

#### [Fine-grained personal access token](#fine-grained-personal-access-token)

Fine-grained tokens provide repository-specific access and enhanced security:

1.  Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens)
2.  Click Generate new token
3.  Configure the token:

    - Token name: Give it a descriptive name (e.g., "Vercel Sandbox Access")
    - Expiration: Set an appropriate expiration date
    - Resource owner: Select your account or organization
    - Repository access: Choose "Selected repositories" and select your private repo
    - Repository permissions: Grant at minimum:
      - Contents: Read (to clone the repository)
      - Metadata: Read (for basic repository information)

4.  Click "Generate token" and copy the token
5.  Set it as an environment variable and run your sandbox script

    ```
    export GIT_ACCESS_TOKEN=ghp_your_token_here
    node --experimental-strip-types ./private-repo.ts
    ```

#### [Other Github methods](#other-github-methods)

- [Create a classic personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic)
- [Create a GitHub App installation token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)

## [Install system packages](#install-system-packages)

You can install system packages using the `dnf` system package manager:

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

In the example, `sudo: true` allows the command to run with elevated privileges.
