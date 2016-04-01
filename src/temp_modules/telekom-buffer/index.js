import lock from '../telekom-lock'
import compose from 'koa-compose'

export default () => {
  let queueLocks = {}
  let MUTEX = Symbol('mutex')

  function * swap (next) {
    let promiseResolve
    this[MUTEX] = queueLocks[this.chat.id] || Promise.resolve()
    queueLocks[this.chat.id] = new Promise((resolve, reject) => {
      promiseResolve = resolve
    })
    yield next
    promiseResolve()
  }

  return compose([swap, lock(MUTEX)])
}
