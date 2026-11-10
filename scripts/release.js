#!/usr/bin/env node

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const bump = process.argv[2] || 'patch';
const dryRun = process.argv[3] === '--dry-run';
const validBumps = new Set(['patch', 'minor', 'major']);

function fail(message) {
  console.error(`Release aborted: ${message}`);
  process.exit(1);
}

function run(command, args, { capture = false, ...options } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    ...options,
  });
  if (result.error) {
    fail(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed.`);
  }
  return result.stdout?.trim();
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function nextVersion(currentVersion) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(
    currentVersion,
  );
  if (!match) {
    fail(`package.json version "${currentVersion}" must be MAJOR.MINOR.PATCH.`);
  }

  const [major, minor, patch] = match.slice(1).map(Number);
  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }
  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

function replaceExactly(path, expression, expectedCount, replace) {
  const source = fs.readFileSync(path, 'utf8');
  const matches = [...source.matchAll(expression)];
  if (matches.length !== expectedCount) {
    fail(`Expected ${expectedCount} matching version settings in ${path}.`);
  }
  fs.writeFileSync(path, source.replace(expression, replace));
}

function updateIosVersions(version) {
  const path = 'ios/VolumeController.xcodeproj/project.pbxproj';
  replaceExactly(
    path,
    /^([ \t]*MARKETING_VERSION = )([^;]+)(;[ \t]*)$/gm,
    2,
    (_, prefix, _current, suffix) => `${prefix}${version}${suffix}`,
  );

  const project = fs.readFileSync(path, 'utf8');
  const buildNumbers = [
    ...project.matchAll(/^[ \t]*CURRENT_PROJECT_VERSION = (\d+);[ \t]*$/gm),
  ].map(match => Number(match[1]));
  if (buildNumbers.length !== 2) {
    fail(`Expected two CURRENT_PROJECT_VERSION settings in ${path}.`);
  }
  const nextBuildNumber = Math.max(...buildNumbers) + 1;
  replaceExactly(
    path,
    /^([ \t]*CURRENT_PROJECT_VERSION = )(\d+)(;[ \t]*)$/gm,
    2,
    (_, prefix, _current, suffix) => `${prefix}${nextBuildNumber}${suffix}`,
  );
}

function updateAndroidVersionCode() {
  const path = 'android/app/build.gradle';
  replaceExactly(
    path,
    /^([ \t]*versionCode[ \t]+)(\d+)([ \t]*)$/gm,
    1,
    (_, prefix, current, suffix) => `${prefix}${Number(current) + 1}${suffix}`,
  );
}

function validateVersions(packageJson, packageLock) {
  if (packageLock.version !== packageJson.version) {
    fail('package.json and package-lock.json versions do not match.');
  }
  if (packageLock.packages?.['']?.version !== packageJson.version) {
    fail('The package-lock root package version does not match package.json.');
  }
}

function showPreview(packageJson, tag) {
  const android = fs.readFileSync('android/app/build.gradle', 'utf8');
  const androidBuildCodes = [
    ...android.matchAll(/^([ \t]*versionCode[ \t]+)(\d+)([ \t]*)$/gm),
  ].map(match => Number(match[2]));
  const ios = fs.readFileSync(
    'ios/VolumeController.xcodeproj/project.pbxproj',
    'utf8',
  );
  const iosBuildNumbers = [
    ...ios.matchAll(/^[ \t]*CURRENT_PROJECT_VERSION = (\d+);[ \t]*$/gm),
  ].map(match => Number(match[1]));

  if (androidBuildCodes.length !== 1 || iosBuildNumbers.length !== 2) {
    fail('Could not determine the current Android/iOS build numbers.');
  }

  console.log(`Current app version: ${packageJson.version}`);
  console.log(`Next app version and Git tag: ${tag}`);
  console.log(`Next Android versionCode: ${androidBuildCodes[0] + 1}`);
  console.log(`Next iOS build number: ${Math.max(...iosBuildNumbers) + 1}`);
  console.log('Preview only; no files or Git refs were changed.');
}

function main() {
  if (
    process.argv.length > 4 ||
    (process.argv[3] && process.argv[3] !== '--dry-run')
  ) {
    fail('Use [patch|minor|major] [--dry-run].');
  }
  if (!validBumps.has(bump)) {
    fail(`Unknown bump "${bump}". Use patch, minor, or major.`);
  }

  const packageJson = readJson('package.json');
  const packageLock = readJson('package-lock.json');
  validateVersions(packageJson, packageLock);

  const version = nextVersion(packageJson.version);
  const tag = `v${version}`;
  if (dryRun) {
    showPreview(packageJson, tag);
    return;
  }

  const branch = run('git', ['branch', '--show-current'], { capture: true });
  if (branch !== 'main') {
    fail(
      `Releases must be made from main (current branch: ${
        branch || 'detached HEAD'
      }).`,
    );
  }
  if (run('git', ['status', '--porcelain'], { capture: true })) {
    fail('The working tree must be clean. Commit or stash all changes first.');
  }

  run('git', ['fetch', 'origin', 'main']);
  const head = run('git', ['rev-parse', 'HEAD'], { capture: true });
  const remoteHead = run('git', ['rev-parse', 'origin/main'], {
    capture: true,
  });
  if (head !== remoteHead) {
    fail('Local main must exactly match origin/main before releasing.');
  }

  const localTag = spawnSync('git', ['rev-parse', '--verify', tag], {
    stdio: 'ignore',
  });
  if (localTag.error) {
    fail(`Could not check whether tag ${tag} already exists.`);
  }
  if (localTag.status === 0) {
    fail(`Tag ${tag} already exists locally.`);
  }
  if (
    run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], {
      capture: true,
    })
  ) {
    fail(`Tag ${tag} already exists on origin.`);
  }

  console.log(`Preparing ${tag} (${bump} version bump).`);
  run('npm', ['test', '--', '--runInBand']);
  run('npm', ['run', 'lint']);

  packageJson.version = version;
  packageLock.version = version;
  packageLock.packages[''].version = version;
  writeJson('package.json', packageJson);
  writeJson('package-lock.json', packageLock);
  updateAndroidVersionCode();
  updateIosVersions(version);

  run('git', [
    'add',
    'package.json',
    'package-lock.json',
    'android/app/build.gradle',
    'ios/VolumeController.xcodeproj/project.pbxproj',
  ]);
  run('git', [
    'commit',
    '-m',
    `chore(release): ${tag}`,
    '-m',
    'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>',
  ]);
  run('git', ['tag', '-a', tag, '-m', `Quick Control ${tag}`]);
  run('git', ['push', '--atomic', 'origin', 'main', tag]);

  console.log(
    `Pushed ${tag}; the Android release workflow has been triggered.`,
  );
}

main();
