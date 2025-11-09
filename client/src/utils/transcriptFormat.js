// Build a cinematic-style transcript from word timings and raw text
// Rules:
// - Line break (~0.5–1s gap)
// - Blank line (≥2s gap)
// - [tags] -> (stage directions)
// - Em dash for stretched syllables, short dash for cut-offs

export function formatCinematicTranscript({ words = [], text = '' }) {
	const convertStageTags = (s) => {
		return String(s || '')
			.replace(/\[(laughter)\]/gi, '(laughs)')
			.replace(/\[(music)\]/gi, '(music)')
			.replace(/\[(applause)\]/gi, '(applause)')
			.replace(/\[(sigh)\]/gi, '(sighs)')
			.replace(/\[(silence)\]/gi, '(pause)')
			// Generic: [word(s)] -> (word(s))
			.replace(/\[([^\]]+)\]/g, (_, inner) => `(${inner})`)
			// Normalize spaced dashes
			.replace(/\s—\s/g, ' — ')
			.replace(/\s-\s/g, ' - ')
	}

	if (!Array.isArray(words) || words.length === 0) {
		// Fallback: just convert tags on full text
		return convertStageTags(text || '')
	}

	// Helpers for token joining
	const noSpaceBefore = new Set([',', '.', '!', '?', ':', ';', ')', ']', '}', '”', "'", '…'])
	const noSpaceAfter = new Set(['(', '[', '{', '“'])

	const pushToken = (arr, token) => {
		if (!token) return
		if (arr.length === 0) {
			arr.push(token)
			return
		}
		const prev = arr[arr.length - 1]
		if (noSpaceBefore.has(token)) {
			arr[arr.length - 1] = prev + token
		} else if (noSpaceAfter.has(prev.slice(-1))) {
			arr[arr.length - 1] = prev + token
		} else {
			arr.push(token)
		}
	}

	// Simple paragraph format - no line breaks or stanza breaks
	let tokens = []

	for (let i = 0; i < words.length; i += 1) {
		const w = words[i]
		let token = convertStageTags(w?.text || '')
		pushToken(tokens, token)
	}

	const finalText = tokens
		.join(' ')
		.replace(/\b([A-Za-z]+)\s?-{2,}\b/g, '$1—')
		.replace(/\s?-\s?$/g, ' -')
		.trim()

	return finalText
}

export default formatCinematicTranscript


