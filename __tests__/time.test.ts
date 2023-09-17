import { Bot } from './../src/bot'

test('works', () => {
  const bot = new Bot(['f6'])

  const start = performance.now()
  const move = bot.generate(0)
  const end = performance.now()

  console.log(move)
  expect(end - start).toBeLessThan(1000)
})
