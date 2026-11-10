#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const tag = process.argv[2];

function fail(message) {
  console.error(`Release retry aborted: ${message}`);
  process.exit(1);
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error) {
    fail(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed.`);
  }
  return result.stdout?.trim();
}

function getGithubRepository() {
  const remote = run('git', ['remote', 'get-url', 'origin'], { capture: true });
  const match = remote.match(
    /^(?:https?:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)(?:\.git)?\/?$/,
  );
  if (!match) {
    fail(`Could not determine a GitHub owner/repository from origin URL "${remote}".`);
  }
  return match[1];
}

function assertReleaseDoesNotExist(repository, tag) {
  const headers = [
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28',
  ];
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers.push(`Authorization: Bearer ${token}`);
  }

  const curlConfig = headers
    .map(header => `header = "${header.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`)
    .join('\n');
  const result = spawnSync(
    'curl',
    [
      '--silent',
      '--show-error',
      '--location',
      '--output',
      '/dev/null',
      '--write-out',
      '%{http_code}',
      '--config',
      '-',
      `https://api.github.com/repos/${repository}/releases/tags/${tag}`,
    ],
    {
      encoding: 'utf8',
      input: curlConfig,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  if (result.error) {
    fail(`Could not run curl to check GitHub Releases: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`GitHub Release lookup failed: ${result.stderr.trim()}`);
  }

  const status = result.stdout.trim();
  if (status === '200') {
    fail(`GitHub Release ${tag} already exists. Published releases must not be retagged.`);
  }
  if (status !== '404') {
    fail(`GitHub Release lookup returned HTTP ${status}; refusing to move the tag.`);
  }
}

function main() {
  if (process.argv.length !== 3 || !/^v\d+\.\d+\.\d+$/.test(tag || '')) {
    fail('Provide a release tag in vMAJOR.MINOR.PATCH format, e.g. v1.2.3.');
  }

  const branch = run('git', ['branch', '--show-current'], { capture: true });
  if (branch !== 'main') {
    fail(
      `Switch to main before retrying (current branch: ${
        branch || 'detached HEAD'
      }).`,
    );
  }

  run('git', ['fetch', 'origin', 'main']);
  const remoteHead = run('git', ['rev-parse', 'origin/main'], {
    capture: true,
  });

  const remotePackageJson = JSON.parse(
    run('git', ['show', 'origin/main:package.json'], { capture: true }),
  );
  if (tag.slice(1) !== remotePackageJson.version) {
    fail(
      `Tag ${tag} does not match package.json version ${remotePackageJson.version} on origin/main.`,
    );
  }

  assertReleaseDoesNotExist(getGithubRepository(), tag);

  const remoteTags = run(
    'git',
    ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`],
    { capture: true },
  );
  const remoteTag = remoteTags
    .split('\n')
    .map(line => line.split('\t'))
    .find(([, ref]) => ref === `refs/tags/${tag}`)?.[0];
  if (!remoteTag) {
    fail(
      `Tag ${tag} does not exist on origin; use make git-release to create a new release.`,
    );
  }

  console.log(`Moving unpublished tag ${tag} to ${remoteHead}.`);
  run('git', [
    'tag',
    '--force',
    '--annotate',
    tag,
    remoteHead,
    '--message',
    `Quick Control ${tag} retry`,
  ]);
  run('git', [
    'push',
    `--force-with-lease=refs/tags/${tag}:${remoteTag}`,
    'origin',
    `refs/tags/${tag}:refs/tags/${tag}`,
  ]);

  console.log(
    `Retried ${tag}; GitHub Actions will rebuild the unpublished release.`,
  );
}

main();
