/******************************************************************************
 T.R.S. → SCI0 port
 ******************************************************************************
 CaseFileCategory.sc
 ShowCaseFileCategory(): the per-category scrolling Case Files list (see
 CaseFiles.sc's ShowCaseFiles(), the category menu that leads here).
 Split into its own Load/Dispose-scoped script, separate from
 CaseFiles.sc itself, so browsing a category never also carries
 LoadCaseFiles/SaveCaseFiles/MarkCaseFile/UnlockNgPlus/the category menu
 resident at the same time.

 A "View" click also does as few Load/DisposeScript cycles as possible
 -- confirmed real, not theoretical: this dialect's Load/Dispose cycling
 doesn't reliably reclaim memory (the original heap-fragmentation saga),
 so "Out of heap space" kept recurring here even after each individual
 load got smaller. Both the discovered-flag check and the title text are
 now read from data already computed in the initial list-building loop
 instead of separate CaseFileAccess/CaseFileTitles reloads -- a "View"
 click now does exactly ONE Load/Dispose cycle (whichever description
 script matches this category), not three.

 The fixed UI chrome (prompt, View/Close buttons, the sealed placeholder
 message) is read from the TEXT_UI resource via GetFarText() rather than
 embedded as literals -- see game.sh for why this is scoped to
 hand-authored text only, not the generated Case File data.

 Even a single Load/Dispose cycle isn't a full guarantee, though: this
 dialect never compacts/coalesces freed heap, so enough runs played back
 to back in one session (each with its own alloc/dispose churn) can
 fragment the heap badly enough that no free block is big enough for a
 description script's Load(), regardless of total free heap -- confirmed
 on real hardware. MemoryInfo(miLARGESTPTR) (see game.sh's
 CASEFILE_VIEW_MIN_HEAP) is checked before that Load() so this fails as
 a graceful in-fiction message instead of a hard interpreter crash.

 That guard alone wasn't enough, though -- confirmed live: a raw "Out of
 heap space" crash on a View click even with MemoryInfo(miLARGESTPTR)
 reporting plenty of total headroom, because the combined
 CaseFileDescriptionsSurvival.sc (all 72 variants in one script) compiled
 to 7.24KB, bigger than any single contiguous free block this dialect's
 fragmentation reliably leaves after real play, threshold or no
 threshold. Survival/Failure descriptions are now split one script per
 POOL (CASEFILEDESCRIPTIONS_SURVIVALn/FAILUREn_SCRIPT, game.sh) rather
 than one per whole category -- CASEFILE_SURVIVAL_POOL_SIZE/
 CASEFILE_FAILURE_POOL_SIZE (game.sh) is how the "View" handler below
 picks which one a given flat index falls into. Mechanisms (5 entries
 total) stays a single file -- nowhere near that scale.
 ******************************************************************************/
(include "sci.sh")
(include "game.sh")
/******************************************************************************/
(script CASEFILECATEGORY_SCRIPT)
/******************************************************************************/
(use "main")
(use "controls")
(use "casefileaccess")
(use "casefiletitles")
(use "casefiledescriptiondispatch")
/******************************************************************************/
// Script-level local, not per-call -- see CaseFiles.sc's own buf for why.
// 2304 = the largest category's actual need (Survival, 72*32) -- was
// 3424 (leftover from before this was rightsized), wasting 1120 bytes
// on every single load of this script for nothing.
(local
	buf[2304]
)
/******************************************************************************/
(procedure public (ShowCaseFileCategory baseIndex count catTitle)
	// The scrolling list for one category -- DSelector, windowed to
	// [baseIndex, baseIndex+count), chosen to avoid the dialog-height
	// overflow that a stacked-button layout hits on long lists. "View"
	// shows the highlighted entry's title+description if discovered, or
	// a sealed placeholder.
	(var hDialog, hSelector, hDText, hViewBtn, hCloseBtn, i, curY, hResult,
		localIndex, flatIndex, discovered, descBuf[180], titleBuf[48],
		discoveredFlags[72], promptBuf[48], viewBuf[8], closeBuf[8],
		sealedTitleBuf[8], fragmentedTitleBuf[24])
	// buf is sized exactly to the largest category's need (Survival,
	// 72*32=2304 -- see its own declaration above). discoveredFlags[72]
	// is a per-call local (well under the ~1KB known-safe size) --
	// caches each entry's GetCaseFile() result from this same loop so
	// the View handler below never needs a second CaseFileAccess
	// Load/Dispose cycle to re-ask it. Load/DisposeScript cycling
	// doesn't reliably reclaim memory in this dialect (the original
	// heap-fragmentation saga), so cutting a whole cycle out of the
	// "View" hot path is worth more than it looks.

	// Same heap-fragmentation guard as the "View" handler further down,
	// but covering the Loads THIS list-building step itself needs
	// (CaseFileTitles/CaseFileAccess, right below) -- a real, confirmed
	// gap: a heap too fragmented even for these smaller scripts crashed
	// with a raw "Out of heap space" fault here before ever reaching the
	// already-guarded description-script Load.
	(if(< MemoryInfo(miLARGESTPTR) CASEFILE_VIEW_MIN_HEAP)
		Load(rsTEXT TEXT_UI)
		GetFarText(TEXT_UI TEXT_UI_CASEFILE_FRAGMENTED_TITLE @fragmentedTitleBuf)
		Print(TEXT_UI TEXT_UI_CASEFILE_FRAGMENTED_MSG #title @fragmentedTitleBuf)
		return
	)

	(for (= i 0) (< i (* count 32)) (++i)
		= buf[i] 0
	)
	Load(rsSCRIPT CASEFILETITLES_SCRIPT)
	Load(rsSCRIPT CASEFILEACCESS_SCRIPT)
	(for (= i 0) (< i count) (++i)
		= discoveredFlags[i] GetCaseFile(+ baseIndex i)
		(if(discoveredFlags[i])
			Format((+ @buf (* i 32)) "%d. %s" (+ i 1) CaseFileTitle(+ baseIndex i))
		)(else
			Format((+ @buf (* i 32)) "%d. ??? (sealed)" (+ i 1))
		)
	)
	DisposeScript(CASEFILEACCESS_SCRIPT)
	DisposeScript(CASEFILETITLES_SCRIPT)

	// Fixed UI chrome (prompt + button labels), read once from TEXT_UI --
	// see game.sh for why this is scoped to hand-authored text only, not
	// the generated Case File data above. Deliberately no
	// DisposeScript(TEXT_UI) -- see CaseFiles.sc for the real bug that
	// found: DisposeScript() is script-specific, and TEXT_UI's resource
	// number collides with MAIN_SCRIPT's script number.
	Load(rsTEXT TEXT_UI)
	GetFarText(TEXT_UI TEXT_UI_CATEGORY_PROMPT @promptBuf)
	GetFarText(TEXT_UI TEXT_UI_VIEW_BTN @viewBuf)
	GetFarText(TEXT_UI TEXT_UI_CLOSE_BTN @closeBuf)

	= hDialog (Dialog:new())
	(send hDialog:
		window(gTheWindow)
		name("CaseFilesD")
		text(catTitle)
	)
	= hDText (DText:new())
	(send hDText:
		text(@promptBuf)
		font(gDefaultFont)
		moveTo(4 4)
		setSize(290)
	)
	(send hDialog:add(hDText))
	= curY (+ (send hDText:nsBottom) 6)

	= hSelector (DSelector:new())
	(send hSelector:
		text(@buf)
		x(32)
		y(8)		/* 8, not the old flat list's 10 -- leaves room for the View/Close row below */
		font(SMALL_FONT)
		// state(1), not state(2) -- bit 1 just makes this the dialog's
		// initially-focused control; bit 2 makes ANY claimed event
		// (including a scroll) close the whole modal dialog, which is
		// wrong for a browse-only list.
		state(1)
		moveTo(4 curY)
		setSize()
	)
	(send hDialog:add(hSelector))
	= curY (+ (send hSelector:nsBottom) 4)

	= hViewBtn (DButton:new())
	(send hViewBtn:
		text(@viewBuf)
		value(1)
		font(SMALL_FONT)
		setSize()
		moveTo(4 curY)
	)
	(send hDialog:add(hViewBtn))

	= hCloseBtn (DButton:new())
	(send hCloseBtn:
		text(@closeBuf)
		value(2)
		font(SMALL_FONT)
		setSize()
		moveTo( (+ (send hViewBtn:nsRight) 6) curY)
	)
	(send hDialog:add(hCloseBtn))

	(send hDialog:
		setSize()
		center()
	)
	(if(< (send hDialog:nsTop) 2)
		(send hDialog:moveTo( (send hDialog:nsLeft) 2 ))
	)
	(send hDialog:open(nwTITLE -1))

	// One Dialog:open() for the whole loop -- doit(hSelector) is called
	// again per View click so the selector keeps its scroll position.
	// Escape/Close both fall out identically (doit() returns 0 on Escape;
	// hCloseBtn's pointer never equals hViewBtn).
	(while(1)
		= hResult (send hDialog:doit(hSelector))
		(if(<> hResult hViewBtn)
			break
		)
		// Selected row's buffer offset IS its index in this category --
		// same 32-byte stride the list was built with.
		= localIndex (/ (- (send hSelector:cursor) @buf) 32)
		= flatIndex (+ baseIndex localIndex)
		= discovered discoveredFlags[localIndex]

		(if(discovered)
			(if(< MemoryInfo(miLARGESTPTR) CASEFILE_VIEW_MIN_HEAP)
				// Heap too fragmented for a safe description-script Load()
				// -- see game.sh's CASEFILE_VIEW_MIN_HEAP for the full
				// story. Graceful in-fiction failure instead of a hard
				// "Out of heap space" crash; no DisposeScript(TEXT_UI),
				// same reasoning as the sealed-message branch below.
				Load(rsTEXT TEXT_UI)
				GetFarText(TEXT_UI TEXT_UI_CASEFILE_FRAGMENTED_TITLE @fragmentedTitleBuf)
				Print(TEXT_UI TEXT_UI_CASEFILE_FRAGMENTED_MSG #title @fragmentedTitleBuf)
			)(else
				// Which description script to load lives in its own
				// Load/Dispose-scoped file (CaseFileDescriptionDispatch.sc)
				// rather than inline here -- see that file's header: this
				// script (CaseFileCategory.sc) stays resident for the
				// WHOLE time a category list is open, so a big dispatch
				// switch living here was inflating that whole-session
				// footprint, not just costing something at the instant of
				// a View click. That alone was enough to crash opening
				// the list, before View was ever clickable.
				Load(rsSCRIPT CASEFILEDESCRIPTIONDISPATCH_SCRIPT)
				LoadCaseFileDescription(baseIndex localIndex flatIndex @descBuf)
				DisposeScript(CASEFILEDESCRIPTIONDISPATCH_SCRIPT)
				// Title text is already sitting in buf's row ("N. Title",
				// from the list-building loop above) -- no need for a
				// second CaseFileTitles Load/Dispose cycle to re-fetch it.
				// Scan past the "N. " prefix (find the literal '.', then
				// skip it and the following space) rather than assuming a
				// fixed digit count.
				= i 0
				(while(<> buf[(+ (* localIndex 32) i)] 46)
					++i
				)
				StrCpy(@titleBuf (+ (+ @buf (* localIndex 32)) (+ i 2)))
				Print(@descBuf #title @titleBuf)
			)
		)(else
			// The message itself comes straight from TEXT_UI via Print()'s
			// own native support for it (params[0] < 1000 -- see
			// Controls.sc -- routes through GetFarText internally); the
			// #title value doesn't get that treatment, so it needs its own
			// GetFarText call into a buffer first. No DisposeScript(TEXT_UI)
			// -- see the note above this method's other Load(rsTEXT ...).
			Load(rsTEXT TEXT_UI)
			GetFarText(TEXT_UI TEXT_UI_SEALED_TITLE @sealedTitleBuf)
			Print(TEXT_UI TEXT_UI_SEALED_MSG #title @sealedTitleBuf)
		)
	)
	(send hDialog:dispose())
)
/******************************************************************************/
