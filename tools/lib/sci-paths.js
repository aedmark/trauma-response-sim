// Locates the SCI0 port, which lives in its own repo (github.com/aedmark/TRS_SCI)
// rather than under this one. Set TRS_SCI_DIR to that repo's root to override
// the default checkout location.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const sciRoot = path.resolve(process.env.TRS_SCI_DIR || path.join(os.homedir(), 'RiderProjects', 'TRS_SCI'));
const sciSrcDir = path.join(sciRoot, 'src');

// Refuse to write generated scripts anywhere that isn't actually the port's
// source folder -- a wrong path should fail loudly, not scatter .sc files.
if (!fs.existsSync(path.join(sciSrcDir, 'game.sh'))) {
	throw new Error(`TRS_SCI source not found at ${sciSrcDir} -- set TRS_SCI_DIR to the TRS_SCI repo's root.`);
}

module.exports = { sciRoot, sciSrcDir };
