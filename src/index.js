import 'source-map-support/register'
import TK from './temp_modules/telekom'
import buffer from './temp_modules/telekom-buffer'
import flood from './temp_modules/telekom-flood'
import FST from './temp_modules/telekom-fst'

// Credentials

import config from './config'

// FST states

import { INIT, STARTED, CHOOSE_1, CONFIRM,
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
import idioms from './vendor/idioms'
import topics from './vendor/topics'

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
    db.queues[`${nativeLang.title}_${foreignLang.title}`] = []
  }
}

// Symbols for middlewares

const STATE = Symbol('fst-state')
const SESSION = Symbol('session')
const FLOOD = Symbol('flood')

// Holding the flow for each user

bot.use(buffer())

// XXX: DAFUQ IS SESSION?!

// bot.use(session(SESSION))

bot.use(function * (next) {
  this[SESSION] = db.users[this.from.id] || {}
  yield next
  db.users[this.from.id] = this[SESSION]
})

// Helps to ignore excess messages (hold the flood)

bot.use(function * (next) {
  this[FLOOD] = {}
  this[FLOOD].date = this[SESSION].flood || 0
  yield next
  this[SESSION].flood = this[FLOOD].date
})

bot.use(flood(FLOOD))

// Common stuff

let noMarkup = { reply_markup: { hide_keyboard: true }, parse_mode: 'Markdown' }

// Main logic for Finite State Transducer

bot.use(function * (next) {
  this[STATE] = this[SESSION].state || INIT
  yield next
  this[SESSION].state = this[STATE]
})

let langCount = 5
let getLangKeyboard = langKeyboard(languages, langCount)

function * helpMessage (next) {
  let msg = 'You can control me by sending these commands:\n\n' +
    '/help - to show this message\n' +
    '/chat - to start a conversation\n' +
    '/cancel - to cancel current operation\n' +
    '/end - to stop talking with me :('
  yield this[FLOOD].respond(msg, noMarkup)
  yield next
}

function * chooseNativeLang (next) {
  let msg = 'Please, choose a language you speak well :)'
  let markup = { reply_markup: { keyboard: getLangKeyboard() } }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

function * chooseForeignLang (next) {
  let msg = 'Now choose a language you want to learn ;)'
  let markup = {
    reply_markup: { keyboard: getLangKeyboard(this[SESSION].offset) }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

function * changeLang (next) {
  let msg = 'You\'ve already picked your languages. ' +
    'Do you want to change them?'
  let markup = { reply_markup: { keyboard: [['Yes'], ['No']] } }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

function * nextTopic (next) {
  let numberTopic = Math.floor(Math.random() * topics.length)
  let lang = this[SESSION].topicLang ? this[SESSION].nativeLang
    : this[SESSION].foreignLang
  let topicLang = !this[SESSION].topicLang
  this[SESSION].topicLang = topicLang
  db.users[this[SESSION].partner].topicLang = topicLang
  let msg = 'Talk in ' + lang + ' and discuss this topic:\n' +
    `_${topics[numberTopic][lang]}_`
  let markup = {
    reply_markup: { keyboard: [[`Next topic, please ${emoji['point_right']}`]] },
    parse_mode: 'Markdown'
  }
  yield this.sendMessage(this[SESSION].partner, msg, markup)
  yield this.sendMessage(this.from.id, msg, markup)
  yield next
}

function * joinChat (next) {
  let myQueue = `${this[SESSION].nativeLang}_${this[SESSION].foreignLang}`
  let relatedQueue = `${this[SESSION].foreignLang}_${this[SESSION].nativeLang}`
  this[SESSION].partner = db.queues[relatedQueue][0]

  if (this[SESSION].partner) {
    this[STATE] = CHAT
    db.users[this[SESSION].partner].state = CHAT
    db.users[this[SESSION].partner].partner = this.from.id
    db.queues[relatedQueue].pop()
    let msg = `_Hey-hey! Here's your partner_ ${emoji['v']}`
    yield this.sendMessage(this[SESSION].partner, msg, noMarkup)
    msg = `_Good! I found you a partner to talk_ ${emoji['v']}`
    yield this.sendMessage(this.from.id, msg, noMarkup)
    yield nextTopic.call(this, next)
  } else {
    this[STATE] = WAITING
    db.queues[myQueue].push(this.from.id)
    let msg = 'There are no people who speaks ' + this[SESSION].foreignLang +
      ' at the moment. I\'ll notify you once there will be some! ;)\n' +
      'In the meantime, explore some ' + this[SESSION].foreignLang + ' idioms!'
    let markup = {
      reply_markup: { keyboard: [[`Yeah, show me some! ${emoji['punch']}`]] },
      parse_mode: 'Markdown'
    }
    yield this[FLOOD].respond(msg, markup)
    yield next
  }
}

function * moreLangs (next) {
  this[SESSION].offset = this[SESSION].offset || 0
  this[SESSION].offset = (this[SESSION].offset % languages.length) + langCount
  let msg = `Here it is! ${emoji['+1']}`
  let markup = {
    reply_markup: { keyboard: getLangKeyboard(this[SESSION].offset) }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
}

function * resendMsg (next) {
  if (this.voice) {
    yield this.sendVoice(this[SESSION].partner, this.voice.file_id)
  } else {
    yield this.sendMessage(this[SESSION].partner, this.text)
  }
  yield next
}

fst.transition(cmd('end'), INIT, function * (next) {
  let myQueue = `${this[SESSION].nativeLang}_${this[SESSION].foreignLang}`
  if (db.queues[myQueue]) {
    db.queues[myQueue].filter((id) => id !== this.from.id)
  }
  delete db.users[this.from.id]
  yield this.sendMessage(this.from.id, 'See you soon!', noMarkup)
  yield next
})

fst.transition(cmd('help'), helpMessage)

fst.transition(INIT, cmd('start'), STARTED, function * (next) {
  let msg = 'Yo dawg! So I heard u like to chat, so we put a language ' +
    'exchange chat into your chat so you can chat while you chat. ' +
    'Just joking, ' + this.from.first_name + ' :)\n\n' +
    '*Pimp My Lang* is a language exchange bot. It connects people ' +
    'around the world and help you to improve your language skills ' +
    'in the most efficient ways. Have fun! ;)'
  yield this[FLOOD].respond(msg, noMarkup)
  yield helpMessage.call(this, next)
})

fst.transition(STARTED, [cmd('chat'), hasLang(SESSION)], ASK, changeLang)
fst.transition(STARTED, cmd('chat'), CHOOSE_1, chooseNativeLang)
fst.transition(STARTED, helpMessage)

fst.transition(ASK, text('Yes'), CHOOSE_1, chooseNativeLang)
fst.transition(ASK, text('No'), joinChat)
fst.transition(ASK, changeLang)

fst.transition(CHOOSE_1, isLang(), CHOOSE_2, function * (next) {
  this[SESSION].nativeLang = this.text.slice(this.text.indexOf(' ') + 1)
  yield chooseForeignLang.call(this, next)
})
fst.transition(CHOOSE_1, text('More'), moreLangs)
fst.transition(CHOOSE_1, chooseNativeLang)

fst.transition(CHOOSE_2, isLang(), function * (next) {
  this[SESSION].foreignLang = this.text.slice(this.text.indexOf(' ') + 1)
  yield joinChat.call(this, next)
})
fst.transition(CHOOSE_2, text('More'), moreLangs)
fst.transition(CHOOSE_2, chooseForeignLang)

fst.transition(WAITING, text('show me some!'), function * (next) {
  let numberIdiom = Math.floor(Math.random() * idioms.length)
  let picture = `${__dirname}/images/idiomsEN/${idioms[numberIdiom].Picture}`
  yield this.sendPhoto(this.from.id, picture)
  let msg = idioms[numberIdiom].Text + ' - ' + idioms[numberIdiom].Translation
  let markup = {
    reply_markup: { keyboard: [[`Yeah, show me some! ${emoji['punch']}`]] }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
})
fst.transition(WAITING, cmd('cancel'), STARTED, function * (next) {
  let myQueue = `${this[SESSION].nativeLang}_${this[SESSION].foreignLang}`
  let msg = 'Goodbay! :c'
  db.queues[myQueue] = db.queues[myQueue].filter((id) => id !== this.from.id)
  yield this[FLOOD].respond(msg, noMarkup)
  yield next
})
fst.transition(WAITING, function * (next) {
  let msg = 'Come on, explore some ideoms!'
  let markup = {
    reply_markup: { keyboard: [[`Yeah, show me some! ${emoji['punch']}`]] }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
})

fst.transition(CHAT, cmd('cancel'), CONFIRM, function * (next) {
  let partner = this[SESSION].partner
  this[SESSION].partner = null
  db.users[partner].partner = null
  let opts = { parse_mode: 'Markdown' }
  yield this.sendMessage(partner, '_Your partner left the dialog :c_', opts)
  yield this.sendMessage(this.from.id, '_You left the dialog :c_', opts)
  db.users[partner].state = CONFIRM
  let msg = 'What you wanna do next?'
  let markup = {
    reply_markup: { keyboard: [['Start another conversation'], ['Leave']] }
  }
  yield this.sendMessage(partner, msg, markup)
  yield this.sendMessage(this.from.id, msg, markup)
  yield next
})
fst.transition(CHAT, text('topic, please'), nextTopic)
fst.transition(CHAT, resendMsg)

fst.transition(CONFIRM, text('another conversation'), joinChat)
fst.transition(CONFIRM, text('Leave'), STARTED, function * (next) {
  let msg = 'Goodbay! :c'
  yield this[FLOOD].respond(msg, noMarkup)
  yield next
})
fst.transition(CONFIRM, function * (next) {
  let msg = 'What you wanna do next?'
  let markup = {
    reply_markup: { keyboard: [['Start another conversation'], ['Leave']] }
  }
  yield this[FLOOD].respond(msg, markup)
  yield next
})

bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
