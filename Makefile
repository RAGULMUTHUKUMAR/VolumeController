.PHONY: metro android clean release

metro:
	npm start

android:
	npm run android

clean:
	cd android && ./gradlew clean

release:
	cd android && ./gradlew assembleRelease
