/******************************************************************************
 T.R.S. → SCI0 port
 ******************************************************************************
 printchoices.sc
 Vertical multi-choice dialog, standing in for stock Print()'s horizontal
 button row (which overlaps/clips past 2-3 short choices on a 320px
 screen). Builds a Dialog with a DText prompt and one DButton per choice,
 stacked top-to-bottom by tracking each control's own height. Returns the
 value of whichever button was pressed.

 Paginated at CHOICES_PER_PAGE (game.sh) choices per screen, since events
 have 3-5 real choices: "More options..." (MORE_CHOICES) leads forward
 on every page but the last, "Back" (BACK_CHOICES) leads back on every
 page but the first, and the glitch button only ever shows on the last
 page. Caps every page at the same button count (3 choices + one
 nav/glitch button) already proven to fit within the dialog-height
 budget, regardless of how many total choices an event has.
 ******************************************************************************/
(include "sci.sh")
(include "game.sh")
/******************************************************************************/
(script PRINTCHOICES_SCRIPT)
/******************************************************************************/
(use "main")
(use "controls")
(use "mechanisms")
/******************************************************************************/
(procedure public (PrintChoices message titleText width glitchText params)
	(var hDialog, hDText, hIcon, hButtons[6], buttonCnt, paramCnt, curY,
		btnPressed, totalChoices, pageStart, pageCount, isLastPage, i,
		isFirstPage)
	= paramTotal (- paramTotal 4)
	= totalChoices (/ paramTotal 2)
	= pageStart 0
	(while(1)
		= buttonCnt 0
		= hDialog (Dialog:new())
		(send hDialog:
			window(gTheWindow)
			name("PrintD")
		)
		(if(titleText)
			(send hDialog:text(titleText))
		)
		// Portrait -- same DIcon+DText side-by-side layout stock Print()'s
		// #icon option uses, built by hand since this dialog doesn't go
		// through Print() itself. Rebuilt every page -- cheap, and keeps
		// every page's layout identical regardless of which page it is.
		= hIcon (DIcon:new())
		(send hIcon:
			view(PortraitViewForIndex(gPortraitChoice))
			loop(GetPortraitMood())
			cel(0)
			setSize()
			moveTo(4 4)
		)
		(send hDialog:add(hIcon))
		= hDText (DText:new())
		(send hDText:
			text(message)
			moveTo( (+ 4 (send hIcon:nsRight)) 4 )
			font(gDefaultFont)
			setSize( (- width (+ (send hIcon:nsRight) 4)) )
		)
		(send hDialog:add(hDText))
		// Buttons start below whichever of icon/text ends up lower.
		= curY (send hDText:nsBottom)
		(if(> (send hIcon:nsBottom) curY)
			= curY (send hIcon:nsBottom)
		)
		= curY (+ curY 6)

		// Not the first page: a "Back" button, ahead of this page's real
		// choices so their position stays consistent whether or not Back
		// is present.
		= isFirstPage (== pageStart 0)
		(if(not isFirstPage)
			= hButtons[buttonCnt] (DButton:new())
			(send hButtons[buttonCnt]:
				text("Back")
				value(BACK_CHOICES)
				font(SMALL_FONT)
			)
			SizeButtonToWidth(hButtons[buttonCnt] BUTTON_MAX_WIDTH)
			(send hButtons[buttonCnt]:moveTo(4 curY))
			= curY (+ (send hButtons[buttonCnt]:nsBottom) 3)
			(send hDialog:add(hButtons[buttonCnt]))
			++buttonCnt
		)

		// This page's slice of the choice pairs -- at most
		// CHOICES_PER_PAGE, same button-count ceiling every page already
		// proven to fit regardless of how many total choices exist.
		= pageCount (- totalChoices pageStart)
		(if(> pageCount CHOICES_PER_PAGE)
			= pageCount CHOICES_PER_PAGE
		)
		= isLastPage (== (+ pageStart pageCount) totalChoices)

		(for (= i 0) (< i pageCount) (++i)
			= paramCnt (* (+ pageStart i) 2)
			= hButtons[buttonCnt] (DButton:new())
			(send hButtons[buttonCnt]:
				text(params[paramCnt])
				value(params[+ paramCnt 1])
				font(SMALL_FONT)
			)
			SizeButtonToWidth(hButtons[buttonCnt] BUTTON_MAX_WIDTH)
			(send hButtons[buttonCnt]:moveTo(4 curY))
			= curY (+ (send hButtons[buttonCnt]:nsBottom) 3)
			(send hDialog:add(hButtons[buttonCnt]))
			++buttonCnt
		)

		// Not the last page: a "More options..." button instead of the
		// glitch button -- the glitch only ever shows on the final page,
		// same one-roll-per-turn as before.
		(if(not isLastPage)
			= hButtons[buttonCnt] (DButton:new())
			(send hButtons[buttonCnt]:
				text("More options...")
				value(MORE_CHOICES)
				font(SMALL_FONT)
			)
			SizeButtonToWidth(hButtons[buttonCnt] BUTTON_MAX_WIDTH)
			(send hButtons[buttonCnt]:moveTo(4 curY))
			= curY (+ (send hButtons[buttonCnt]:nsBottom) 3)
			(send hDialog:add(hButtons[buttonCnt]))
			++buttonCnt
		)(else
			(if(glitchText)
				// The glitch wildcard, offered ~15% of the time by the
				// caller. GLITCH_CHOICE is a sentinel that can't collide
				// with a real choice index or MORE_CHOICES.
				= hButtons[buttonCnt] (DButton:new())
				(send hButtons[buttonCnt]:
					text(glitchText)
					value(GLITCH_CHOICE)
					font(SMALL_FONT)
				)
				SizeButtonToWidth(hButtons[buttonCnt] BUTTON_MAX_WIDTH)
				(send hButtons[buttonCnt]:moveTo(4 curY))
				= curY (+ (send hButtons[buttonCnt]:nsBottom) 3)
				(send hDialog:add(hButtons[buttonCnt]))
				++buttonCnt
			)
		)

		(send hDialog:
			setSize()
			center()
		)
		(if(< (send hDialog:nsTop) 2)
			// A tall dialog can center to a negative nsTop, which renders as
			// garbled screen content rather than clipping cleanly -- pin to
			// the top margin instead.
			(send hDialog:moveTo( (send hDialog:nsLeft) 2 ))
		)
		(send hDialog:open(nwTITLE -1))
		= btnPressed (send hDialog:doit(NULL))
		(if(== btnPressed -1)
			= btnPressed 0
		)
		(for (= paramCnt 0) (< paramCnt buttonCnt) (++paramCnt)
			(if(== btnPressed hButtons[paramCnt])
				= btnPressed (send btnPressed:value)
				break
			)
		)
		(send hDialog:dispose())

		// Flat sequence, not chained if/else (no precedent in this
		// codebase for 3+-branch chaining) -- MORE_CHOICES and
		// BACK_CHOICES each adjust pageStart and loop again; anything
		// else (a real choice or GLITCH_CHOICE) returns immediately.
		(if(== btnPressed MORE_CHOICES)
			= pageStart (+ pageStart CHOICES_PER_PAGE)
		)
		(if(== btnPressed BACK_CHOICES)
			= pageStart (- pageStart CHOICES_PER_PAGE)
		)
		(if((<> btnPressed MORE_CHOICES) and (<> btnPressed BACK_CHOICES))
			return(btnPressed)
		)
	)
)
/******************************************************************************/
(procedure public (PromptPortraitChoice)
	// Appearance picker, asked once per run from rm001.sc's init()
	// alongside the other per-run setup choices (see gHardMode there).
	// Portraits are fixed at PORTRAIT_ICON_WIDTHxPORTRAIT_ICON_HEIGHT
	// (game.sh) -- too tall to stack PORTRAIT_COUNT of them vertically
	// within the 200px screen the way PrintChoices stacks text buttons,
	// so this lays them out horizontally instead, PORTRAIT_PER_PAGE at a
	// time. Same page-loop/MORE_CHOICES/BACK_CHOICES pagination as
	// PrintChoices above, just icon+button pairs in a row instead of a
	// vertical list of text buttons.
	(var hDialog, hDText, hIcon[PORTRAIT_PER_PAGE],
		hChoiceButtons[PORTRAIT_PER_PAGE], hNavButtons[2], navBtnCnt,
		navX, curX, curY, i, pageStart, pageCount, isFirstPage,
		isLastPage, btnPressed, chosen)
	= pageStart 0
	(while(1)
		= hDialog (Dialog:new())
		(send hDialog:
			window(gTheWindow)
			name("PortraitD")
		)
		= hDText (DText:new())
		(send hDText:
			text("Choose your appearance:")
			moveTo(4 4)
			font(gDefaultFont)
			setSize(PORTRAIT_DIALOG_WIDTH)
		)
		(send hDialog:add(hDText))
		= curY (+ (send hDText:nsBottom) 6)

		= pageCount (- PORTRAIT_COUNT pageStart)
		(if(> pageCount PORTRAIT_PER_PAGE)
			= pageCount PORTRAIT_PER_PAGE
		)
		= isFirstPage (== pageStart 0)
		= isLastPage (== (+ pageStart pageCount) PORTRAIT_COUNT)

		(for (= i 0) (< i pageCount) (++i)
			= curX (+ PORTRAIT_MARGIN_X (* i (+ PORTRAIT_ICON_WIDTH PORTRAIT_GAP_X)))
			= hIcon[i] (DIcon:new())
			(send hIcon[i]:
				view(PortraitViewForIndex(+ pageStart i))
				loop(PORTRAIT_MOOD_NEUTRAL)
				cel(0)
				setSize()
				moveTo(curX curY)
			)
			(send hDialog:add(hIcon[i]))

			= hChoiceButtons[i] (DButton:new())
			(send hChoiceButtons[i]:
				text("Choose")
				value(+ pageStart i)
				font(SMALL_FONT)
			)
			SizeButtonToWidth(hChoiceButtons[i] PORTRAIT_ICON_WIDTH)
			(send hChoiceButtons[i]:moveTo(curX (+ (send hIcon[i]:nsBottom) 4)))
			(send hDialog:add(hChoiceButtons[i]))
		)

		// Row of nav buttons starts below whichever choice button (icon
		// height is fixed, but SizeButtonToWidth's height isn't
		// guaranteed identical to the neighbor's) ends up lower.
		= curY (send hChoiceButtons[0]:nsBottom)
		(for (= i 1) (< i pageCount) (++i)
			(if(> (send hChoiceButtons[i]:nsBottom) curY)
				= curY (send hChoiceButtons[i]:nsBottom)
			)
		)
		= curY (+ curY 6)

		= navBtnCnt 0
		(if(not isFirstPage)
			= hNavButtons[navBtnCnt] (DButton:new())
			(send hNavButtons[navBtnCnt]:
				text("Back")
				value(BACK_CHOICES)
				font(SMALL_FONT)
			)
			SizeButtonToWidth(hNavButtons[navBtnCnt] BUTTON_MAX_WIDTH)
			(send hNavButtons[navBtnCnt]:moveTo(4 curY))
			(send hDialog:add(hNavButtons[navBtnCnt]))
			++navBtnCnt
		)
		(if(not isLastPage)
			= navX 4
			(if(> navBtnCnt 0)
				= navX (+ (send hNavButtons[0]:nsRight) 6)
			)
			= hNavButtons[navBtnCnt] (DButton:new())
			(send hNavButtons[navBtnCnt]:
				text("More options...")
				value(MORE_CHOICES)
				font(SMALL_FONT)
			)
			SizeButtonToWidth(hNavButtons[navBtnCnt] BUTTON_MAX_WIDTH)
			(send hNavButtons[navBtnCnt]:moveTo(navX curY))
			(send hDialog:add(hNavButtons[navBtnCnt]))
			++navBtnCnt
		)

		(send hDialog:
			setSize()
			center()
		)
		(if(< (send hDialog:nsTop) 2)
			// Same overflow guard as PrintChoices -- a tall dialog can center
			// to a negative nsTop, which renders as garbled screen content.
			(send hDialog:moveTo( (send hDialog:nsLeft) 2 ))
		)
		(send hDialog:open(nwTITLE -1))
		= btnPressed (send hDialog:doit(NULL))
		(if(== btnPressed -1)
			= btnPressed 0
		)
		= chosen -1
		(for (= i 0) (< i pageCount) (++i)
			(if(== btnPressed hChoiceButtons[i])
				= chosen (send btnPressed:value)
				break
			)
		)
		(if(== chosen -1)
			(for (= i 0) (< i navBtnCnt) (++i)
				(if(== btnPressed hNavButtons[i])
					= chosen (send btnPressed:value)
					break
				)
			)
		)
		(send hDialog:dispose())

		(if(== chosen MORE_CHOICES)
			= pageStart (+ pageStart PORTRAIT_PER_PAGE)
		)
		(if(== chosen BACK_CHOICES)
			= pageStart (- pageStart PORTRAIT_PER_PAGE)
		)
		(if((<> chosen MORE_CHOICES) and (<> chosen BACK_CHOICES))
			return(chosen)
		)
	)
)
/******************************************************************************/
(procedure public (SizeButtonToWidth hButton maxWidth)
	// Same computation as stock DButton:setSize() (+2 padding, round up
	// to 16px) but WITH a width cap passed to TextSize() -- the stock
	// version has none, so a long choice's natural width could push the
	// dialog border off-screen. BUTTON_MAX_WIDTH (game.sh), not the
	// description's own width, since buttons don't share space with the
	// portrait icon and can run wider.
	(var rect[4])
	TextSize(@rect (send hButton:text) (send hButton:font) maxWidth)
	= rect[rtBOTTOM] (+ rect[rtBOTTOM] 2)
	= rect[rtRIGHT] (+ rect[rtRIGHT] 2)
	(send hButton:nsBottom( (+ (send hButton:nsTop) rect[rtBOTTOM]) ))
	= rect[rtRIGHT] (* (/ (+ rect[rtRIGHT] 15) 16) 16)
	(send hButton:nsRight( (+ rect[rtRIGHT] (send hButton:nsLeft)) ))
)
/******************************************************************************/
