// Shared string-escaping pass for any T.R.S. content generator emitting
// SCI0 string literals. Extracted out of zone-events.js when a second
// generator (gen-endings.js) needed the exact same logic -- this
// encodes several real, hard-won fixes (see docs/archive/SCI_PORT_HANDOFF_2026_09.md): a
// non-ASCII byte isn't a missing-glyph placeholder, it's read as a raw
// control byte and corrupts the dialog (confirmed in-game with an em
// dash eating a word); embedded real newlines/tabs need converting to
// SCI's own two-character \n/\t escapes, not left as literal control
// characters.
'use strict';

const ASCII_TRANSLITERATIONS = {
	'—': '-', // em dash
	'–': '-', // en dash
	'‘': "'", '’': "'", // curly single quotes
	'“': '"', '”': '"', // curly double quotes -- still rejected below if left in a string, see the "{}\\ check
	'…': '...', // ellipsis
};

function sciString(s) {
	s = s.replace(/[—–‘’“”…]/g, ch => ASCII_TRANSLITERATIONS[ch]);
	if (/["{}\\]/.test(s)) {
		throw new Error(`string contains a character the generator can't emit safely: ${JSON.stringify(s)}`);
	}
	// Real embedded newlines/tabs (from the original JS's own \n/\t literals
	// -- e.g. a multi-paragraph desc -- evaluate to actual control
	// characters, not the two-character sequences we want) need converting
	// to SCI's own \n/\t escape sequences. Do this AFTER the raw-content
	// checks above (so a literal backslash we're about to introduce here
	// doesn't fight the backslash-rejection check) and BEFORE the
	// printable-ASCII check below (a raw newline is a control character,
	// not "non-ASCII", but still outside the safe printable range so it'd
	// otherwise trip that check too).
	s = s.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
	if (/[^\x20-\x7E]/.test(s)) {
		throw new Error(`string contains a non-ASCII character with no known transliteration: ${JSON.stringify(s)}`);
	}
	return s;
}

module.exports = { sciString };
