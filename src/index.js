import 'source-map-support/register'
import outdent from 'outdent'
import TK from './temp_modules/telekom'
import buffer from './temp_modules/telekom-buffer'
import session from './temp_modules/telekom-session'
import FST from './temp_modules/telekom-fst'
import config from './config'
import { INIT, STARTED } from './states'
import cmd from './filters/cmd'
import langKeyboard from './lang-keyboard'

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

fst.transition(STARTED, cmd('chat'), CHOOSE_1, function * (next) {
  let msg = 'Please, choose a language you speak well :)'
  let reply_markup = { keyboard: langKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  yield next
})


fst.transition(CHOOSE_1, blabla(), CHOOSE_2, function * (next) {
  // TODO : need save lang
  let msg = 'Please, choose a language you wish '
  let reply_markup = { keyboard: langKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, {reply_markup})
  this[SESSION].date = res.date
  yield next
})

fst.transition(CHOOSE_2, blabla(), WAITING, function * (next) {
  let msg = 'Please, waiting ...'
  let reply_markup = {}
  let res = yield this.sendMessage(this.form.id, msg, { reply_markup})
  this[SESSION].date = res.date
  yield  next
})

//fst.transition(STARTED, text())

bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
