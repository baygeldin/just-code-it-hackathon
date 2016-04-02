import compose from 'koa-compose'

function wrapFilter (filter) {
  if (Array.isArray(filter) &&
      filter.reduce((prev, next) => prev && typeof next === 'function', true)) {
    return filter
  } else if (typeof filter === 'function') {
    return [filter]
  } else {
    throw new Error('Filter must be a function or an array of functions!')
  }
}

let SKIP = Symbol('fst-skip')

export default class FST {
  constructor () {
    this.rules = []
    this.symbol = null
  }

  transition (...args) {
    let handler = null
    let source = null
    let target = null
    let filters = null

    if (args.length === 1) {
      handler = args[0]
    } else if (args.length === 2) {
      if (typeof args[0] === 'string') {
        source = args[0]
      } else {
        filters = wrapFilter(args[0])
      }
      handler = args[1]
    } else if (args.length === 3) {
      if (typeof args[0] === 'string') {
        source = args[0]
        if (typeof args[1] === 'string') {
          target = args[1]
        } else {
          filters = wrapFilter(args[1])
        }
      } else {
        filters = wrapFilter(args[0])
        target = args[1]
      }
      handler = args[2]
    } else if (args.length === 4) {
      source = args[0]
      filters = wrapFilter(args[1])
      target = args[2]
      handler = args[3]
    } else {
      throw new Error('Wrong number of arguments!')
    }

    let self = this
    let fn = function * (next) {
      if (this[SKIP] || (source && this[self.symbol] !== source) || (filters &&
        !filters.reduce((prev, next) => prev && next(this), true))) {
          yield next
      } else {
        this[SKIP] = true
        yield handler.call(this, next)
        this[self.symbol] = target || this[self.symbol]
      }
    }

    this.rules.push(fn)
  }

  transitions (symbol) {
    this.symbol = symbol
    return compose(this.rules)
  }
}
