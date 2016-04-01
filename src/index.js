import 'source-map-support/register'
import outdent from 'outdent'
import TK from './temp_modules/telekom'
import buffer from './temp_modules/telekom-buffer'
import flood from './temp_modules/telekom-flood'
import FST from './temp_modules/telekom-fst'

// Credentials

import config from './config'

// FST states

import { INIT, STARTED, CHOOSE_1,
  CHOOSE_2, WAITING, CHAT, ASK } from './states'

// Filters

import cmd from './filters/cmd'
import text from './filters/text'
import isLang from './filters/is-lang'
import hasLang from './filters/has-lang'

// Utils

import langKeyboard from './utils/lang-keyboard'

// TODO: move resources below to DB

import languages from './vendor/languages'
import emoji from './vendor/emoji'

// Main declarations

let bot = new TK(config.token)
let fst = new FST()

// In-memory database hack

let db = {
  queues: {},
  users: {}
}

for (let nativeLang of languages) {
  for (let foreignLang of languages) {
    queues[`${nativeLang}_${foreignLang}`] = []
  }
}

// Symbols for middlewares

const STATE = Symbol('fst-state')
const SESSION = Symbol('session')
const FLOOD = Symbol('flood')

// Holding the flow for each user

bot.use(buffer())

// DAFUQ IS SESSION?!

// bot.use(session(SESSION))

bot.use(function * (next) {
  this[SESSION] = db.users[this.from.id]
  yield next
  db.users[this.from.id] = this[SESSION]
})

// Helps to ignore excess messages (hold the flood)

bot.use(function * (next) {
  this[FLOOD].date = this[SESSION].flood || 0
  yield next
  this[SESSION].flood = this[FLOOD].date
})

bot.use(flood(FLOOD))

// Common stuff

let noMarkup = { reply_markup: { hide_keyboard: true } }

// Main logic for Finite State Transducer

bot.use(function * (next) {
  this[STATE] = this[SESSION].state || INIT
  yield next
  this[SESSION].state = this[STATE]
})

function * helpMessage (next) {
  let msg = 'You can control me by sending these commands:\n\n'
    + '/help - to show this message\n'
    + '/chat - to start a conversation\n'
    + '/cancel - to cancel current operation\n'
    + '/end - to stop talking with me :('
  yield this[FLOOD].respond(msg, noMarkup)
  yield next
}

fst.transition(cmd('help'), helpMessage)

fst.transition(INIT, cmd('start'), STARTED, function * (next) {
  let msg = 'Yo dawg! So I heard u like to chat, so we put a language '
    + 'exchange chat into your chat so you can chat while you chat. '
    + 'Just joking, ' + this.user.first_name + ' :)\n\n'
    + '*Pimp My Lang* is a language exchange bot. It connects people '
    + 'around the world and help you to improve you language skills '
    + 'in the most efficient ways. Have fun! ;)'
  yield this[FLOOD].respond(msg, noMarkup)
  yield helpMessage.call(this, next)
})

let langCount = 5
let getLangKeyboard = langKeyboard(languages, langCount)

function * chooseNativeLang (next) {
  let msg = 'Please, choose a language you speak well :)'
  let markup = { reply_markup: { keyboard: getLangKeyboard() } }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

function * changeLang (next) {
  let msg = 'You\'ve already picked your languages. '
    + 'Do you want to change them?'
  let markup = { reply_markup: { keyboard: [['Yes'], ['No']] } }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

fst.transition(STARTED, [cmd('chat'), hasLang(SESSION)], ASK, changeLang)

fst.transition(STARTED, cmd('chat'), CHOOSE_1, chooseNativeLang)

fst.transition(STARTED, helpMessage)

fst.transition(ASK, text('Yes'), CHOOSE_1, chooseNativeLang)

function * joinChat (next) {
  let myQueue = `${this[SESSION].nativeLang}_${this[SESSION].foreignLang}`
  let relatedQueue = `${this[SESSION].foreignLang}_${this[SESSION].nativeLang}`
  let partner = db.queues[relatedQueue][0]
  if (partner) {
    this[STATE] = CHAT
    db.users[partner].state = CHAT
    db.queues[relatedQueue].pop()
    let msg = 'Hey-hey! Here\'s your partner :)'
    let res = yield this.sendMessage(partner, msg, { reply_markup})
    msg = 'Hey! Here\'s your partner'
    res = yield this.sendMessage(this.from.id, msg, { reply_markup})
    this[SESSION].date = res.date
  } else {
    queueMap[myQueue].push(this.from.id)
    this[STATE] = WAITING
    let msg = 'Please, wait ...'
    let res = yield this.sendMessage(this.from.id, msg, { reply_markup})
    this[SESSION].date = res.date
  }
  yield next
}

fst.transition(ASK, text('No'), joinChat)

fst.transition(ASK, changeLang)

let moreLangs = function * (next) {
  this[SESSION].offset = (this[SESSION].offset % languages.length) + langCount
  let msg = `Here it is! ${emoji['+1']}`
  let markup = {
    reply_markup: { keyboard: getLangKeyboard(this[SESSION].offset) }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

fst.transition(CHOOSE_1, text('More'), moreLangs)
fst.transition(CHOOSE_2, text('More'), moreLangs)

function * chooseForeignLang (next) {
  let msg = 'Now choose a language you want to learn ;)'
  let markup = {
    reply_markup: { keyboard: getLangKeyboard(this[SESSION].offset) }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

fst.transition(CHOOSE_1, isLang(), CHOOSE_2, function * (next) {
  this[SESSION].nativeLang = this.text.slice(this.text.indexOf(' ') + 1)
  yield chooseForeignLang.call(this, next)
})

fst.transition(CHOOSE_1, chooseNativeLang)

fst.transition(CHOOSE_2, isLang(), function * (next) {
  this[SESSION].foreignLang = this.text.slice(this.text.indexOf(' ') + 1)
  yield joinChat.call(this, next)
})

fst.transition(CHOOSE_2, chooseForeignLang)




let havePartner = (ctx) => usersMap[ctx.from.id]

let resendMsg = function * (next) {
  let reply_markup = { hide_keyboard: true }
  yield this.sendMessage(usersMap[this.from.id], this.text, { reply_markup})
  yield next
}

fst.transition(WAITING, havePartner, CHAT, resendMsg)
fst.transition(CHAT, havePartner, CHAT, resendMsg)

let cancel = function * (next) {
  let partner = usersMap[this.from.id]
  let reply_markup = { hide_keyboard: true }
  let myQueue = this[SESSION].myLang+'_'+this[SESSION].partnerLang
  let relatedQueue = this[SESSION].partnerLang+'_'+this[SESSION].myLang
  queueMap[myQueue] = queueMap[myQueue].filter((id) => id !== this.from.id)
  if (partner) {
    delete usersMap[this.from.id]
    delete usersMap[partner]
    yield this.sendMessage(partner, 'sorry, he quited :(', { reply_markup})
  }
  yield next
}

fst.transition(WAITING, cmd('cancel'), STARTED, cancel)
fst.transition(CHAT, cmd('cancel'), STARTED, cancel)

bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
