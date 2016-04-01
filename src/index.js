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
  let reply_markup = {}
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  yield next
})

fst.transition(STARTED, cmd('chat'), function * (next) {
  let msg = 'Please, choose a language you speak well :)'
  let reply_markup = { keyboard: langKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  yield next
})

let langCount = 6
let getLangKeyboard = langKeyboard(languages, langCount)

let moreLangs = function * (next) {
  let msg = 'Here it is.'
  let reply_markup = { keyboard: getLangKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  this[SESSION].offset = (this[SESSION].offset +
    langCount) % languages.length
  yield next
}

fst.transition(CHOOSE_1, text('More'), moreLangs)
fst.transition(CHOOSE_2, text('More'), moreLangs)

bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
