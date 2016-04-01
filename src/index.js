import 'source-map-support/register'
import outdent from 'outdent'
import TK from './temp_modules/telekom'
import buffer from './temp_modules/telekom-buffer'
import session from './temp_modules/telekom-session'
import FST from './temp_modules/telekom-fst'
import config from './config'

import { INIT, STARTED, CHOOSE_1,
  CHOOSE_2 } from './states'

import cmd from './filters/cmd'
import text from './filters/text'

import langKeyboard from './lang-keyboard'
import languages from './vendor/languages'

let bot = new TK(config.token)

let fst = new FST()

/*let queueMap = {
	'en_ru' : [],
	'ru_en' : []
}

function startChat(lang, user1, user2){
	///todo
}

function tryStartChat(lang, user) {
	if (queueMap[lang][0]) {
		startChat(lang, queueMap[lang].shift(), user)
		return true
	}
	else return false
}


function addToQueue(user, mainLang, preferedLang){
	switch (mainLang) {
		case: 'en':
			if (!tryStartChat('en_ru', user))
				queueMap['en_ru'].push(user)
			break
		case: 'ru':
			if (!tryStartChat('ru_en', user))
				queueMap['ru_en'].push(user)
			break
		default:
			alert('Unknown')
  }
}*/

const STATE = Symbol('fst-state')
const SESSION = Symbol('session')

bot.use(buffer())
bot.use(session(SESSION))

bot.use(function * (next) {
  if (this.date > (this[SESSION].date || 0)) yield next
})

bot.use(function * (next) {
  this[STATE] = this[SESSION].state || INIT
  yield next
  this[SESSION].state = this[STATE]
})

fst.transition(INIT, cmd('start'), STARTED, function * (next) {
  let msg = outdent`
    Hello, ${this.from.first_name}! Pimp My Lang
    is a language exchange bot. Yo, dawg!`
  let reply_markup = { hide_keyboard: true }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  yield next
})

let langCount = 5
let getLangKeyboard = langKeyboard(languages, langCount)

fst.transition(STARTED, cmd('chat'), CHOOSE_1, function * (next) {
  let msg = 'Please, choose a language you speak well :)'
  let reply_markup = { keyboard: getLangKeyboard() }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  this[SESSION].offset = 0
  yield next
})

let moreLangs = function * (next) {
  let msg = 'Here it is.'
  this[SESSION].offset = (this[SESSION].offset % languages.length)
    + langCount
  let reply_markup = { keyboard: getLangKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  yield next
}

fst.transition(CHOOSE_1, text('More'), moreLangs)
fst.transition(CHOOSE_2, text('More'), moreLangs)

bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
