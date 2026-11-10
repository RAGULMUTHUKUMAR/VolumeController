.DEFAULT_GOAL := help

NODE ?= node
BUMP ?= patch

.PHONY: help metro android clean release release-preview git-release git-release-preview retry-release release-tag

help:
	@printf '%s\n' \
	  'make metro                   Start the Metro server' \
	  'make android                 Build and install the debug app' \
	  'make clean                   Clean Android Gradle outputs' \
	  'make release                 Build a local Android release APK' \
	  'make release-preview BUMP=patch|minor|major  Preview a version bump' \
	  'make git-release BUMP=patch|minor|major      Create and push a production Git release' \
	  'make git-release-preview BUMP=patch|minor|major  Preview a production Git release' \
	  'make retry-release TAG=vMAJOR.MINOR.PATCH       Retry an unpublished failed release tag'

metro:
	npm start

android:
	npm run android

clean:
	cd android && ./gradlew clean

release:
	cd android && ./gradlew assembleRelease

release-preview:
	$(NODE) scripts/release.js "$(BUMP)" --dry-run

git-release-preview:
	$(NODE) scripts/release.js "$(BUMP)" --dry-run

git-release:
	gh workflow run android-release.yml --ref main -f bump="$(BUMP)"

retry-release:
	node scripts/retry-release.js "$(TAG)"

release-tag: git-release
