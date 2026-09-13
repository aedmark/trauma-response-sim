/******************************************************************************
 T.R.S. → SCI0 port
 ******************************************************************************
 CaseFiles.sc
 Cross-run "Case Files" persistence and viewer (README.md: "a persistent,
 cross-run record of every ending and coping mechanism you've ever
 actually seen"). Tracks discovery per ending VARIANT (9 survival pools x
 8 + 3 failure pools x 10 = 102) plus the 5 coping mechanisms -- see
 game.sh for the full flat index scheme.

 gCF0..gCF107 (Main.sc, CASEFILE_COUNT = 108) are the in-memory discovery
 flags -- individual scalar globals, not an array (a global array in
 Main.sc isn't visible from other scripts the way scalars are).
 GetCaseFile/SetCaseFile (CaseFileAccess.sc) give array-like access over
 them. LoadCaseFiles()/SaveCaseFiles() sync all 108 with TRSCASE.DAT,
 plain ASCII one value per line (docs/SCI0-research-findings.md's
 QFG-style pattern). Slot 107 (CASEFILE_NGPLUS) is the unrelated Extended
 Therapy unlock flag riding on the same array/file.

 ShowCaseFiles() is a category menu (Survival Endings / Failure Endings /
 Coping Mechanisms) -- it just returns which one was picked (1/2/3, or 0
 for cancelled). Callers (menubar.sc, rm002.sc) Dispose this script and
 Load CaseFileCategory.sc's ShowCaseFileCategory() separately for
 whichever category was chosen, so browsing a category (which repeatedly
 loads description scripts on top) never has this file's own
 Load/Save/Mark/UnlockNgPlus/menu code resident at the same time.

 The menu's own text (title/prompt/button labels) is read from the
 TEXT_UI resource via GetFarText() rather than embedded as string
 literals -- see game.sh for why this is scoped to fixed, hand-authored
 UI chrome only, not the generated Case File content.
 ******************************************************************************/
(include "sci.sh")
(include "game.sh")
/******************************************************************************/
(script CASEFILES_SCRIPT)
/******************************************************************************/
(use "main")
(use "controls")
(use "casefileaccess")
/******************************************************************************/
(procedure public (LoadCaseFiles)
	(var hFile, i, lineBuf[6])
	// fOPENCREATE, not fOPENFAIL -- this dialect's fOPENFAIL/fOPENCREATE
	// values are swapped from what their names suggest; fOPENFAIL here
	// actually triggers create/truncate behavior and silently wipes the
	// file before it can be read.
	= hFile FOpen("TRSCASE.DAT" fOPENCREATE)
	// Truthiness, not == -1 -- NULL is 0 here, and a failed FOpen isn't
	// guaranteed to specifically return -1.
	(if(not hFile)
		return
	)
	// Load/Dispose scoped to just the loop -- CaseFileAccess.sc must
	// never sit permanently resident (real prior heap-exhaustion cause).
	// Placed after the early-return so a missing save file never touches it.
	Load(rsSCRIPT CASEFILEACCESS_SCRIPT)
	(for (= i 0) (< i CASEFILE_COUNT) (++i)
		FGets(@lineBuf 6 hFile)
		SetCaseFile(i ReadNumber(@lineBuf))
	)
	DisposeScript(CASEFILEACCESS_SCRIPT)
	FClose(hFile)
)
/******************************************************************************/
(procedure public (SaveCaseFiles)
	// No Load/Dispose of its own -- only ever called from MarkCaseFile,
	// which already wraps both calls in one pair.
	(var hFile, i, lineBuf[6])
	= hFile FOpen("TRSCASE.DAT" fCREATE)
	(if(== hFile -1)
		return
	)
	(for (= i 0) (< i CASEFILE_COUNT) (++i)
		Format(@lineBuf "%d\n" GetCaseFile(i))
		FPuts(hFile @lineBuf)
	)
	FClose(hFile)
)
/******************************************************************************/
(procedure public (MarkCaseFile index)
	// Flips this case file if unseen and persists once. Returns TRUE
	// exactly the first time, so callers can decide whether to announce it.
	Load(rsSCRIPT CASEFILEACCESS_SCRIPT)
	(if(not GetCaseFile(index))
		SetCaseFile(index 1)
		SaveCaseFiles()
		DisposeScript(CASEFILEACCESS_SCRIPT)
		return(TRUE)
	)
	DisposeScript(CASEFILEACCESS_SCRIPT)
	return(FALSE)
)
/******************************************************************************/
(procedure public (UnlockNgPlus)
	// Extended Therapy unlock -- rides on the Case Files array/file as
	// slot CASEFILE_NGPLUS (see game.sh). MarkCaseFile only writes to
	// disk the first time; gNgPlusUnlocked (the in-memory mirror) is set
	// every call regardless.
	MarkCaseFile(CASEFILE_NGPLUS)
	= gNgPlusUnlocked TRUE
)
/******************************************************************************/
(procedure public (ShowCaseFiles)
	// Category menu, reachable via the "Case Files" menu item (menubar.sc)
	// or the ending room's filing cabinet. Hand-rolled vertical DButtons
	// rather than calling PrintChoices() -- PrintChoices uses mechanisms,
	// which uses casefiles, so calling it from here would be a new 3-hop
	// (use ...) cycle this codebase has never compiled before. Cheaper to
	// just duplicate the small dialog-building code than risk it.
	//
	// Returns which category was picked (1/2/3) so the caller can Dispose
	// this script before loading CaseFileCategory.sc -- see file header.
	// Button values are 1/2/3, never 0 -- Dialog:doit() returns plain
	// 0/FALSE on Escape, so 0 stays an unambiguous "cancelled" sentinel.
	(var hDialog, hDText, hButtons[3], i, curY, hResult, choice,
		titleBuf[16], promptBuf[120], survivalBuf[24], failureBuf[24],
		mechBuf[24])
	// All five strings read from the TEXT_UI resource, copied into their
	// own local buffers. Deliberately NOT DisposeScript(TEXT_UI)'d after --
	// real bug, found the hard way: DisposeScript() is script-specific
	// (its own kernel doc: "Unloads a script... :param scriptNum: The
	// script resource number"), and TEXT_UI's resource number (0) happens
	// to collide with MAIN_SCRIPT's script number (also 0) -- calling it
	// here was actually disposing Main.sc itself mid-run. Non-script
	// resources loaded via Load(rsType ...) are never explicitly disposed
	// anywhere in this codebase (see Main.sc's own Load(rsVIEW
	// PORTRAIT_VIEW_0..3), never paired with a dispose call) -- left resident
	// once touched, same as this.
	Load(rsTEXT TEXT_UI)
	GetFarText(TEXT_UI TEXT_UI_CASEFILES_TITLE @titleBuf)
	GetFarText(TEXT_UI TEXT_UI_CASEFILES_PROMPT @promptBuf)
	GetFarText(TEXT_UI TEXT_UI_CASEFILES_SURVIVAL_BTN @survivalBuf)
	GetFarText(TEXT_UI TEXT_UI_CASEFILES_FAILURE_BTN @failureBuf)
	GetFarText(TEXT_UI TEXT_UI_CASEFILES_MECH_BTN @mechBuf)

	= hDialog (Dialog:new())
	(send hDialog:
		window(gTheWindow)
		name("CaseFilesD")
		text(@titleBuf)
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

	= hButtons[0] (DButton:new())
	(send hButtons[0]:
		text(@survivalBuf)
		value(1)
		font(SMALL_FONT)
		setSize()
		moveTo(4 curY)
	)
	(send hDialog:add(hButtons[0]))
	= curY (+ (send hButtons[0]:nsBottom) 3)

	= hButtons[1] (DButton:new())
	(send hButtons[1]:
		text(@failureBuf)
		value(2)
		font(SMALL_FONT)
		setSize()
		moveTo(4 curY)
	)
	(send hDialog:add(hButtons[1]))
	= curY (+ (send hButtons[1]:nsBottom) 3)

	= hButtons[2] (DButton:new())
	(send hButtons[2]:
		text(@mechBuf)
		value(3)
		font(SMALL_FONT)
		setSize()
		moveTo(4 curY)
	)
	(send hDialog:add(hButtons[2]))

	(send hDialog:
		setSize()
		center()
	)
	(if(< (send hDialog:nsTop) 2)
		// Clamp against a negative nsTop on a tall dialog -- same defense
		// PrintChoices uses.
		(send hDialog:moveTo( (send hDialog:nsLeft) 2 ))
	)
	(send hDialog:open(nwTITLE -1))
	= hResult (send hDialog:doit(NULL))
	// Match the returned control pointer against each button and extract
	// its :value -- same pattern PrintChoices uses. Flat loop with an
	// early break, not chained if/else (no precedent in this codebase for
	// 3+-branch chaining).
	= choice 0
	(for (= i 0) (< i 3) (++i)
		(if(== hResult hButtons[i])
			= choice (send hButtons[i]:value)
			break
		)
	)
	(send hDialog:dispose())
	return(choice)
)
/******************************************************************************/
