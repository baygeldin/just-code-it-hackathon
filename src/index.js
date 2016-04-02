import 'source-map-support/register'
import outdent from 'outdent'
import TK from './temp_modules/telekom'
import buffer from './temp_modules/telekom-buffer'
import session from './temp_modules/telekom-session'
import FST from './temp_modules/telekom-fst'
import config from './config'

import { INIT, STARTED, CHOOSE_1,
  CHOOSE_2, WAITING, CHAT } from './states'

import cmd from './filters/cmd'
import text from './filters/text'
import blabla from './filters/blabla'

import langKeyboard from './lang-keyboard'
import languages from './vendor/languages'
import idioms from './vendor/idioms'
import topics from './vendor/topics'

let bot = new TK(config.token)

let fst = new FST()

let queueMap = {
	'English_Russian' : [],
	'Russian_English' : []
}

let usersMap = {}

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

fst.transition(STARTED, cmd('chat'), function * (next) {
  if(!this[SESSION].myLang){
    console.log('In choose 1')
    let msg = 'Please, choose a language you speak well :)'
    let reply_markup = { keyboard: getLangKeyboard() }
    let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
    this[SESSION].date = res.date
    this[SESSION].offset = 0
    this[STATE] = CHOOSE_1
    yield next
  } else {
    console.log('In change')
    let msg = 'Do you want change your language?'
    let reply_markup = {keyboard: [['Yes'], ['No']]}
    let res = yield this.sendMessage(this.from.id, msg, {reply_markup})
    this[SESSION].date = res.date
    this[SESSION].offset = 0
    yield next
  }
})

fst.transition(STARTED, text('Yes'), function * (next){
  let msg = 'Please, choose a language you speak well :)'
  let reply_markup = { keyboard: getLangKeyboard() }
  let res = yield this.sendMessage(this.from.id, msg, { reply_markup })
  this[SESSION].date = res.date
  this[SESSION].offset = 0
  this[STATE] = CHOOSE_1
  yield next
})

fst.transition(STARTED, text('No'), CHOOSE_2, function * (next){
  let msg = 'Please, choose a language you want to learn'
  let reply_markup = { keyboard: getLangKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, {reply_markup})
  this[SESSION].date = res.date
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

fst.transition(CHOOSE_1, blabla(), CHOOSE_2, function * (next) {
  this[SESSION].myLang = this.text.slice(this.text.indexOf(' ')+1)
  let msg = 'Please, choose a language you want to learn'
  let reply_markup = { keyboard: getLangKeyboard(this[SESSION].offset) }
  let res = yield this.sendMessage(this.from.id, msg, {reply_markup})
  this[SESSION].date = res.date
  yield next
})

fst.transition(CHOOSE_2, blabla(), function * (next) {
  this[SESSION].partnerLang = this.text.slice(this.text.indexOf(' ')+1)
  let myQueue = this[SESSION].myLang+'_'+this[SESSION].partnerLang
  let relatedQueue = this[SESSION].partnerLang+'_'+this[SESSION].myLang
  let reply_markup = { hide_keyboard: true }
  let partner
  if (partner = queueMap[relatedQueue][0]) {
    this[STATE] = CHAT
    usersMap[partner] = this.from.id
    usersMap[this.from.id] = partner
    queueMap[relatedQueue].pop()
    let msg = 'Hey! Here\'s your partner'
    let res = yield this.sendMessage(partner, msg, { reply_markup})
    msg = 'Hey! Here\'s your partner'
    res = yield this.sendMessage(this.from.id, msg, { reply_markup})
    this[SESSION].date = res.date
  } else {
    queueMap[myQueue].push(this.from.id)
    this[STATE] = WAITING
    let reply_markup = {keyboard : [['Show idiom']] }
    let msg = 'Please, wait ...'
    let res = yield this.sendMessage(this.from.id, msg, { reply_markup})
    this[SESSION].date = res.date
  }
  yield next
})

let havePartner = (ctx) => usersMap[ctx.from.id]

let resendMsg = function * (next) {

  let reply_markup = {keyboard : [['Next topic']] }
  if(this.text !== 'Next topic') {
    yield this.sendMessage(usersMap[this.from.id], this.text, {reply_markup})
    yield next
  } else {
    yield nextTopic.call(this,next)
  }

}

let nextTopic = function * (next) {
  let reply_markup = {keyboard : [['Next topic']] }
  this[SESSION].numberTopic = Math.floor(Math.random() * 15)
  yield this.sendMessage(this.from.id, 'Your topic is ' + topics[this[SESSION].numberTopic].TopicEN + '(Ваша тема для общения '
    + topics[this[SESSION].numberTopic].TopicRU + ')' , {reply_markup})
  yield this.sendMessage(usersMap[this.from.id], 'Your topic is ' + topics[this[SESSION].numberTopic].TopicEN + '(Ваша тема для общения '
    + topics[this[SESSION].numberTopic].TopicRU + ')' , {reply_markup})
  yield next
}

fst.transition(WAITING, havePartner, CHAT, resendMsg)

function notHavePartner(ctx){
  return !havePartner(ctx)
}

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


fst.transition(WAITING, notHavePartner, function * (next){
  this[SESSION].numberIdiom = Math.floor(Math.random() * 8)
  let picture = `${__dirname}/images/idiomsEN/${idioms[this[SESSION].numberIdiom].Picture}`
  yield this.sendPhoto(this.from.id, picture)
  let msg= idioms[this[SESSION].numberIdiom].Text + ' - ' + encodeURIComponent((idioms[this[SESSION].numberIdiom].Translation))
  let reply_markup = {keyboard : [['Show idiom']]}
  yield this.sendMessage(this.from.id, msg, { reply_markup })
  yield next
})

/*fst.transition(CHAT, text('Next topic'), function * (next){
  this[SESSION].numberTopic = Math.floor(Math.random() * 15)
  yield this.sendMessage(this.from.id, 'Your topic is ' + topics[this[SESSION].numberTopic].TopicEN, {reply_markup})
  yield this.sendMessage(usersMap[this.from.id], 'Your topic is ' + topics[this[SESSION].numberTopic].TopicEN, {reply_markup})
})*/

fst.transition(CHAT, cmd('cancel'), STARTED, cancel)
fst.transition(CHAT, havePartner, CHAT, resendMsg)







bot.use(fst.transitions(STATE))

bot.listen({ polling: true })
