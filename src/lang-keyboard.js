import emoji from './vendor/emoji'
import languages from './vendor/languages'

let count = 6

function format (lang) {
  return `${emoji[lang.emoji]} ${lang.title}`
}

export default (offset) => {
  let offset = offset ? offset % languages.length : 0
  let languages = languages.concat(languages)
  let lang = languages.slice(offset, offset + count)
  let keyboard = [
    [format(lang[0]), format(lang[1]), format(lang[2])],
    [format(lang[3]), format(lang[4]), format(lang[5])],
    [`${emoji['arrow_right']} More`]
  ]

  return keyboard
}
