# hackathon-temp
temporary repo for a hackathon project

## info
* Pimp My Lang is a language exchange bot
* [@pmlbot](https://telegram.me/pmlbot) on Telegram

## todo
* topic suggestions
* audio messages
* localization

## notes
* `./src/temp_modules` contain packages which are not yet on npm (i.e. local). They may depend on each other, so using local paths in package.json is not handy. Once ready they should be moved and all imports should be changed accordingly.
* It requires `standard` and `snazzy` installed globally. (Is there any way to install them locally if they are not installed globally?).
* `npm run build` to watch source files for changes and transpile them
* `npm run lint` to check code conventions
* `npm start` to run the bot
