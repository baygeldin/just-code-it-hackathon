// JUST A PROTOTYPE
// NOT WORKING
// MAKES NO SENSE TO NODE

import queue from 'some-message-queue-abstraction'

export default () => {
  let resolvers = {}

  queue.on('finished', (e) => {
    resolvers[e.id]()
  })

  return function * (next) {
    let msg = yield queue.getLast()
    yield new Promise((resolve, reject) => {
      resolvers[msg.id] = resolve
      // set timeout for the case when some server failed to
      // process this msg and never emitted 'finished'
    })
    yield next
    queue.emit('finished', { id: this.id })
  }
}
