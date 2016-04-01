import TK from './temp_modules/telekom'
import buffer from './temp_modules/telekom-buffer'
import session from './temp_modules/telekom-session'
import FST from './temp_modules/telekom-fst'
import config from './config'
import { INIT, STARTED } from './states'
import cmd from './filters/cmd'
import 'source-map-support/register'

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
  let msg = yield this.sendMessage(this.from.id, 'Hello')
  this[SESSION].date = msg.date
  yield next
})

fst.transition(STARTED, function * (next) {
  let msg = yield this.sendMessage(this.from.id, 'Yeah')
  this[SESSION].date = msg.date
  yield next
})

bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
