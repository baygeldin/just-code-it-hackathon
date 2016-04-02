import emoji from '../vendor/emoji'

function format (lang) {
  return `${emoji[lang.emoji]} ${lang.title}`
}

export default (languages, count) => {
  return (offset) => {
    offset = offset ? offset % languages.length : 0
    let twice = languages.concat(languages)
    let lang = twice.slice(offset, offset + count + 1)
    let keyboard = [
      [format(lang[0]), format(lang[1]), format(lang[2])],
      [format(lang[3]), format(lang[4]), format(lang[5])],
      [`${emoji['arrow_right']} More`]
    ]

    return keyboard
  }
}
