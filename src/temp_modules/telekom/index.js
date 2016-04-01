import events from 'events'
import TelegramAPI from 'node-telegram-bot-api'
import co from 'co'
import compose from 'koa-compose'

function createContext (api) {
  let ctx = {}
  let proto = TelegramAPI.prototype
  let allowedMethods = ['getMe', 'setWebHook', 'sendMessage',
    'answerInlineQuery', 'forwardMessage', 'sendPhoto',
    'sendAudio', 'sendDocument', 'sendSticker', 'sendVideo',
    'sendVoice', 'sendChatAction', 'getUserProfilePhotos',
    'sendLocation', 'getFile', 'getFileLink', 'downloadFile']

  for (let prop in proto) {
    if (proto.hasOwnProperty(prop) &&
      allowedMethods.indexOf(prop) !== -1) {
      ctx[prop] = proto[prop].bind(api)
    }
  }

  return ctx
}

export default class Bot extends events.EventEmitter {
  constructor (token) {
    super()
    this.token = token
    this.middleware = []
  }

  listen (options) {
    let fn = co.wrap(compose(this.middleware))
    let api = new TelegramAPI(this.token, options)
    let ctx = createContext(api)

    api.on('message', (msg) => {
      Object.assign(msg, ctx)
      fn.call(msg).catch((err) => { console.error(err.stack) })
    })

    return this
  }

  use (fn) {
    this.middleware.push(fn)
    return this
  }
}
