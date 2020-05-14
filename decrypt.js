// some helper functions
const rotN = (c, n) => String.fromCharCode(
	(c.charCodeAt(0) + n - 97) % 26 + 97)
const rot13 = c => rotN(c, 13)
const randBetween = (min, max) => Math.random() * (max - min) + min
const randChar = () => String.fromCharCode(randBetween(97, 122))
const noop = () => {}
export const forever = new Promise(noop)
export const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// -- async until functions --
// generate values calling the provided async function with the output
// of the previous call until the `end` promise fullfills.
// NOTE: recursion is cooler but probably is better to use a good'ol while
// to avoid _too much recursion_ errors, fixable with tail call optimization? 🤞
const produceUntil = (action, end = forever) => async function* produce(seed) {
	const next = await Promise.race([action(seed), end])
	if (!next) return
	yield next 
	yield* produce(next)
}
const produceUntilMatch = (action, matcher) => async function*(seed) {
	while(true) {
		if (matcher(seed)) return
		yield seed = await action(seed)
	}
}
// combines a list of async iterators into a single one that yields
// values as soon as they become available in any of the mixed iterators
// resolved values are wrapped in an object that has the index of the
// iterator that produced that value.
const mix = iterators => {
	const withIndex = (it, idx) => 
		it.next().then(({value, done}) => ({idx, value, done}))
	const promises = iterators.map(withIndex)
	const completed = new Set()
	return async function* mix() {
		const {idx, value, done} = await Promise.race(promises)
		if (done) completed.add(idx)
		else yield {idx, value}
		if (completed.size === promises.length) return
		promises[idx] = done ? forever : withIndex(iterators[idx], idx)
		yield* mix()
	}() 
}

// some delay functions
const FAST = 100
const SLOW = 1000
const ms = ms => _ => +ms
const rnd = () => randBetween(SLOW, FAST)
const waitThen = (action, delay = ms(FAST)) => wait(delay()).then(action)

const delayedRotation = (c, {step = 1, delay} = {}) => 
	waitThen(() => rotN(c, step), delay)
const randCharDelayed = delay => waitThen(randChar, delay)

// -- character generators --
// produce random characters until the wait promise resolves,
// additionaly the speed function can specify the frequency of character generation.
export const randomUntil = (wait, speed = ms(FAST)) =>
	(c, i) => produceUntil(() => randCharDelayed(speed), wait(i))(c)
// rotate initial character until the specified number of rotations.
export const rotateBy = (rotations, step, speed) => (c, i) => {
	const goal = rotN(c, rotations)
	return produceUntilMatch(
		c => delayedRotation(c, {step, delay: speed}),
		c => goal === c
	)(c)
}
// run character generators in sequence
export const combine = (...generators) => (c, i) =>
	async function*() {
		for (let gen of generators) yield* gen(c, i)
	}()

const defaultCharAnimation = combine(
	// make it look harder producing random gibberish longer for each character.
	randomUntil(i => wait(i* 500)),
	// rotate characters sequentially until reaching the 13th rotation.
	rotateBy(13),
)

// decrypt the provided message 
export const decrypt = async function*(msg = 'uryybjbeyq', charDecryptor = defaultCharAnimation) {
	yield msg
	const decrypted = [...msg]
	const chars = mix(decrypted.map(charDecryptor))
	for await (let {idx, value} of chars) {
		decrypted[idx] = value
		yield decrypted.join('')
	}
}

// run rot13 example from the terminal with Deno
if (typeof Deno !== 'undefined') (async () => {
	for await(let it of decrypt(Deno.args[0]))
		await Deno.stdout.write(new TextEncoder().encode(`\r${it}`))
})()
