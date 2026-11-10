#!/usr/bin/env node

const fs = require('node:fs');

const bump = process.argv[2] || 'patch';
const mode = process.argv[3] || '--dry-run';
const validBumps = new Set(['patch', 'minor', 'major']);

function fail(message) {
  console.error(`Release aborted: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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

function getAndroidVersionCode() {
  const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
  const matches = [
    ...gradle.matchAll(/^([ \t]*versionCode[ \t]+)(\d+)([ \t]*)$/gm),
  ];
  if (matches.length !== 1) {
    fail('Expected one Android versionCode in android/app/build.gradle.');
  }
  return Number(matches[0][2]);
}

function getIosBuildNumber() {
  const project = fs.readFileSync(
    'ios/VolumeController.xcodeproj/project.pbxproj',
    'utf8',
  );
  const buildNumbers = [
    ...project.matchAll(/^[ \t]*CURRENT_PROJECT_VERSION = (\d+);[ \t]*$/gm),
  ].map(match => Number(match[1]));
  if (buildNumbers.length !== 2) {
    fail('Expected two iOS CURRENT_PROJECT_VERSION settings.');
  }
  return Math.max(...buildNumbers);
}

function calculateVersion(currentVersion) {
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

function prepareVersion(packageJson, packageLock, version) {
  packageJson.version = version;
  packageLock.version = version;
  packageLock.packages[''].version = version;
  writeJson('package.json', packageJson);
  writeJson('package-lock.json', packageLock);
  updateAndroidVersionCode();
  updateIosVersions(version);
}

function printReleaseOutputs(version) {
  console.log(`version=${version}`);
  console.log(`tag=v${version}`);
  console.log(`android_version_code=${getAndroidVersionCode()}`);
  console.log(`ios_build_number=${getIosBuildNumber()}`);
}

function main() {
  if (
    process.argv.length > 4 ||
    !['--dry-run', '--prepare', '--existing-tag'].includes(mode)
  ) {
    fail('Use [patch|minor|major] [--dry-run|--prepare|--existing-tag].');
  }
  if (mode !== '--existing-tag' && !validBumps.has(bump)) {
    fail(`Unknown bump "${bump}". Use patch, minor, or major.`);
  }

  const packageJson = readJson('package.json');
  const packageLock = readJson('package-lock.json');
  validateVersions(packageJson, packageLock);

  const currentVersion = packageJson.version;
  if (mode === '--existing-tag') {
    const tag = bump;
    if (!/^v\d+\.\d+\.\d+$/.test(tag) || tag.slice(1) !== currentVersion) {
      fail(`Tag "${tag}" must match package.json version ${currentVersion}.`);
    }
    printReleaseOutputs(currentVersion);
    return;
  }

  const version = calculateVersion(currentVersion);
  const tag = `v${version}`;
  if (mode === '--dry-run') {
    console.log(`Current app version: ${currentVersion}`);
    console.log(`Next app version and Git tag: ${tag}`);
    console.log(`Next Android versionCode: ${getAndroidVersionCode() + 1}`);
    console.log(`Next iOS build number: ${getIosBuildNumber() + 1}`);
    console.log('Preview only; no files or Git refs were changed.');
    return;
  }

  prepareVersion(packageJson, packageLock, version);
  printReleaseOutputs(version);
}

main();
