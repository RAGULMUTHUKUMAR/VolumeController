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

function main() {
  if (process.argv.length !== 3 || !/^v\d+\.\d+\.\d+$/.test(tag || '')) {
    fail('Provide a release tag in vMAJOR.MINOR.PATCH format, e.g. v1.2.3.');
  }

  const packageJson = require('../package.json');
  if (tag.slice(1) !== packageJson.version) {
    fail(
      `Tag ${tag} does not match package.json version ${packageJson.version}.`,
    );
  }

  const branch = run('git', ['branch', '--show-current'], { capture: true });
  if (branch !== 'main') {
    fail(
      `Switch to main before retrying (current branch: ${
        branch || 'detached HEAD'
      }).`,
    );
  }
  if (run('git', ['status', '--porcelain'], { capture: true })) {
    fail('The working tree must be clean before retrying a release.');
  }

  run('git', ['fetch', 'origin', 'main']);
  const head = run('git', ['rev-parse', 'HEAD'], { capture: true });
  const remoteHead = run('git', ['rev-parse', 'origin/main'], {
    capture: true,
  });
  if (head !== remoteHead) {
    fail('Local main must match origin/main before retrying a release.');
  }

  const repo = run(
    'gh',
    ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
    {
      capture: true,
    },
  );
  const releases = run(
    'gh',
    [
      'api',
      `repos/${repo}/releases`,
      '--paginate',
      '--jq',
      `.[] | select(.tag_name == "${tag}") | .tag_name`,
    ],
    { capture: true },
  );
  if (releases) {
    fail(
      `GitHub Release ${tag} already exists. Published releases must not be retagged.`,
    );
  }

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
