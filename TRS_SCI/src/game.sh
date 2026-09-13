/*************************************************************************
 * SCI Game Header
 * By Brian Provinciano
 *************************************************************************
 * Put all the defines specific to your game in here
 *************************************************************************/

// Base Scripts
(define MAIN_SCRIPT			  0)

(define AVOID_SCRIPT          973)
(define DOOR_SCRIPT		 	974)
(define AUTODOOR_SCRIPT		975)
(define INITROOMS_SCRIPT	976)
(define DYING_SCRIPT		977)
(define DISPOSELOAD_SCRIPT	978)
(define CONTROLS_SCRIPT		979)
(define DPATH_SCRIPT		980)
(define DCICON_SCRIPT		981)
(define REV_SCRIPT			982)
(define WANDER_SCRIPT		983)
(define FOLLOW_SCRIPT		984)
(define TIMER_SCRIPT		985)
(define WINDOW_SCRIPT		986)
(define GAUGE_SCRIPT		987)
(define EXTRA_SCRIPT		988)
(define SOUND_SCRIPT		989)
(define SYSWINDOW_SCRIPT	990)
(define JUMP_SCRIPT			991)
(define CYCLE_SCRIPT		992)
(define FILEIO_SCRIPT		993)
(define GAME_SCRIPT			994)
(define INVENTORY_SCRIPT	995)
(define USER_SCRIPT			996)
(define MENUBAR_SCRIPT		997)
(define FEATURE_SCRIPT		998)
(define OBJ_SCRIPT			999)

// Game Scripts
(define TITLESCREEN_SCRIPT	800)
(define ENDING_ROOM			2)
(define PRINTCHOICES_SCRIPT	100)
// 101-105, 108-132, 138-161: freed. Was the old per-zone Load/
// DisposeScript dispatcher+chunk architecture, replaced by one room per
// event (WORK_ROOM_BASE etc. below) after confirmed SCI0 heap
// fragmentation -- see SESSION_HANDOFF.md. Left unused, not reassigned.
(define MECHANISMS_SCRIPT	106)
(define CASEFILES_SCRIPT	107)
// 133-135: freed (old bundled ending-content scripts; see
// ENDINGSURVIVAL*/ENDINGFAILURE* below).
(define CASEFILEACCESS_SCRIPT	136)
(define CASEFILETITLES_SCRIPT	137)
// Per-category Case File descriptions (tools/gen-casefile-descriptions.js),
// Load/Dispose-scoped like CASEFILETITLES_SCRIPT. One script per category
// (not one combined file) so opening a category only loads that
// category's entries, not all 107.
(define CASEFILEDESCRIPTIONS_SURVIVAL_SCRIPT		138)
(define CASEFILEDESCRIPTIONS_FAILURE_SCRIPT		139)
(define CASEFILEDESCRIPTIONS_MECHANISMS_SCRIPT		140)
// ShowCaseFileCategory() itself -- split out of CaseFiles.sc so browsing
// a category (which repeatedly loads description scripts on top of it)
// doesn't also have to keep LoadCaseFiles/SaveCaseFiles/MarkCaseFile/
// UnlockNgPlus/the category menu resident at the same time. Real fix,
// not preemptive: "Out of heap space" was hit live on real hardware even
// after the description-script split above.
(define CASEFILECATEGORY_SCRIPT	141)

// One script per ending pool -- rm002.sc only ever needs the one pool a
// given ending fires from; bundling multiple pools per file caused heap
// exhaustion once MarkCaseFile()'s own nested Load/Dispose stacked on
// top of an already-large resident bundle.
(define ENDINGSURVIVAL0_SCRIPT	162)
(define ENDINGSURVIVAL1_SCRIPT	163)
(define ENDINGSURVIVAL2_SCRIPT	164)
(define ENDINGSURVIVAL3_SCRIPT	165)
(define ENDINGSURVIVAL4_SCRIPT	166)
(define ENDINGSURVIVAL5_SCRIPT	167)
(define ENDINGSURVIVAL6_SCRIPT	168)
(define ENDINGSURVIVAL7_SCRIPT	169)
(define ENDINGSURVIVAL8_SCRIPT	170)
(define ENDINGFAILURE0_SCRIPT	171)
(define ENDINGFAILURE1_SCRIPT	172)
(define ENDINGFAILURE2_SCRIPT	173)

// Case Files: 108 flat discovery-flag indices, backed by scalar globals
// gCF0..gCF107 (Main.sc), not an array -- a global array in Main.sc
// isn't visible from other scripts the way scalars are. GetCaseFile/
// SetCaseFile (CaseFileAccess.sc) give array-like access over them.
// Layout, tracked per ending VARIANT (matches the original's "collect
// every ending you've ever seen"):
//   0-71   9 survival pools x 8 variants (pool N = N*8..N*8+7)
//   72-101 3 failure pools x 10 variants, repression/mask/child order
//          (pool N = 72+N*10..72+N*10+9)
//   102-106 the 5 coping mechanisms, TAG_FAWN..TAG_SECURE offset by
//          CASEFILE_MECH_BASE
//   107    Extended Therapy unlock flag (CASEFILE_NGPLUS) -- not a real
//          case file, rides here as the one proven persistence
//          mechanism in this codebase. VIEWABLE_CASEFILE_COUNT excludes
//          it from the viewer.
(define CASEFILE_COUNT				108)
(define VIEWABLE_CASEFILE_COUNT	107)
(define CASEFILE_MECH_BASE			102)
(define CASEFILE_NGPLUS			107)

// Category ranges for ShowCaseFiles()'s category menu (CaseFiles.sc) --
// same 0-71/72-101/102-106 layout as above, named so CaseFiles.sc
// doesn't hardcode raw index/count numbers.
(define CASEFILE_SURVIVAL_BASE		0)
(define CASEFILE_SURVIVAL_COUNT	72)
(define CASEFILE_FAILURE_BASE		72)
(define CASEFILE_FAILURE_COUNT		30)
(define CASEFILE_MECH_COUNT		5)

// T.R.S. per-zone event counts, for GoToNextEvent()'s zone/event picker
// (mechanisms.sc).
(define WORK_EVENT_COUNT	34)
(define HOME_EVENT_COUNT	32)
(define SOCIAL_EVENT_COUNT	33)
(define SELF_EVENT_COUNT	33)
(define BODY_EVENT_COUNT	32)
(define PUBLIC_EVENT_COUNT	32)
(define ZONE_COUNT			6)

// No-repeat event pool (mechanisms.sc's GoToNextEvent()/ResetSeenEvents()):
// matches js/engine.js's pickWeightedEvent(), simplified from its 3-tier
// fallback to one bounded retry loop -- a run is only ever 10-20 turns
// against 196 events, so "everything's been seen" can never actually
// happen. TOTAL_EVENT_COUNT must equal the sum of the six *_EVENT_COUNT
// constants and match the room range 200-395 (a room number minus 200,
// WORK_ROOM_BASE, is already the flat 0-195 "seen" index).
// MAX_EVENT_PICK_RETRIES is insurance against an unlucky repeat pick,
// not expected to matter in practice.
(define TOTAL_EVENT_COUNT		196)
(define MAX_EVENT_PICK_RETRIES	30)

// One room per event: each of the 196 events is its own room, script
// number <ZONE>_ROOM_BASE + localIndex. Ranges, back to back in zone
// order: WORK 200-233 (34), HOME 234-265 (32), SOCIAL 266-298 (33), SELF
// 299-331 (33), BODY 332-363 (32), PUBLIC 364-395 (32) -- 196 total.
// GoToNextEvent() computes the target room directly; there's no
// dispatcher script to load.
(define WORK_ROOM_BASE		200)
(define HOME_ROOM_BASE		234)
(define SOCIAL_ROOM_BASE	266)
(define SELF_ROOM_BASE		299)
(define BODY_ROOM_BASE		332)
(define PUBLIC_ROOM_BASE	364)

// Player portrait: shown only inside PrintChoices' own dialog
// (printchoices.sc, via GetPortraitMood() + a DIcon), not on any room
// background. Loop = mood: 0 neutral, 1 repression, 2 mask, 3 child --
// whichever stat is currently worst, once its danger value crosses
// PORTRAIT_NEUTRAL_THRESHOLD (same comparison PickWorstStat() uses for
// zone weighting). PORTRAIT_X/Y are unused (no background draw), left
// defined in case one's wanted later.
//
// PORTRAIT_VIEW_0..3: one full mood set (4 loops each, same layout as
// the original single view) per selectable appearance. Chosen once per
// run via PromptPortraitChoice() (printchoices.sc, called from
// rm001.sc's init() alongside the other per-run setup choices) and
// stored in gPortraitChoice (Main.sc); PortraitViewForIndex()
// (mechanisms.sc) maps that index to the resource number below. 801-804
// are placeholder numbers (800 is already "Item - Test Object").
(define PORTRAIT_VIEW_0			801)
(define PORTRAIT_VIEW_1			802)
(define PORTRAIT_VIEW_2			803)
(define PORTRAIT_VIEW_3			804)
(define PORTRAIT_COUNT				4)
(define PORTRAIT_DIALOG_WIDTH		280)
// PromptPortraitChoice (printchoices.sc) layout: portraits are fixed at
// 80x60 (too tall to stack more than ~2-3 vertically on a 200px screen
// the way PrintChoices stacks text buttons), so it lays them out
// horizontally instead, paginated PORTRAIT_PER_PAGE at a time using the
// same MORE_CHOICES/BACK_CHOICES buttons PrintChoices uses.
// MARGIN_X/GAP_X are chosen so 2 columns of ICON_WIDTH center evenly on
// a 320px-wide screen (60 + 80 + 40 + 80 + 60 = 320).
(define PORTRAIT_PER_PAGE			2)
(define PORTRAIT_ICON_WIDTH		80)
(define PORTRAIT_ICON_HEIGHT		60)
(define PORTRAIT_MARGIN_X			60)
(define PORTRAIT_GAP_X				40)
(define PORTRAIT_X					4)
(define PORTRAIT_Y					20)
(define PORTRAIT_MOOD_NEUTRAL		0)
(define PORTRAIT_MOOD_REPRESSION	1)
(define PORTRAIT_MOOD_MASK			2)
(define PORTRAIT_MOOD_CHILD		3)
(define PORTRAIT_NEUTRAL_THRESHOLD	60)

// Clickable office scenery (rm002.sc, the ending room, only -- rm001's
// turn loop is one unbroken chain of modal PrintChoices dialogs with no
// idle moment for a click to reach the room). Rectangles are unvalidated
// screenshot guesses that turned out correct on the first try.
(define CABINET_X1		260)		/* filing cabinet -> ShowCaseFiles() */
(define CABINET_Y1		58)
(define CABINET_X2		319)
(define CABINET_Y2		178)

(define COMPUTER_X1	100)		/* computer -> start a new run */
(define COMPUTER_Y1	40)
(define COMPUTER_X2	180)
(define COMPUTER_Y2	105)

// T.R.S. coping-mechanism tags (choice.tag from the original js/content*.js)
(define TAG_FAWN			0)
(define TAG_FLIGHT			1)
(define TAG_FIGHT			2)
(define TAG_FREEZE			3)
(define TAG_SECURE			4)

// T.R.S. gameplay constants (matching js/content.js's config)
(define STARTING_REPRESSION	40)
(define STARTING_MASK			60)
(define STARTING_CHILD			60)
(define UNLOCK_THRESHOLD	3)		/* same-tag choices before a mechanism unlocks */
(define GLITCH_CHANCE_PCT	15)		/* out of 100, matching glitchChance: 0.15 */
(define GLITCH_CHOICE		99)
// PrintChoices pagination (printchoices.sc): events have 3-5 real
// choices (matching the original's own 3-5, not capped anymore -- see
// SESSION_HANDOFF.md). CHOICES_PER_PAGE caps each screen to the same
// button count already proven safe (3 choices + one nav/glitch button =
// 4 max): "More options..." (MORE_CHOICES) on every page but the last,
// "Back" (BACK_CHOICES) on every page but the first, glitch
// (GLITCH_CHOICE) only on the last.
(define CHOICES_PER_PAGE	3)
(define MORE_CHOICES		98)
(define BACK_CHOICES		97)

// PrintChoices' choice-button width ceiling (SizeButtonToWidth) -- kept
// separate from the description's own width (DESC_WIDTH in
// tools/lib/zone-events.js), since buttons don't share space with the
// portrait icon and can run wider. Value accounts for DButton:setSize()
// rounding UP to the next multiple of 16 after +2 padding: 286+2=288
// (already a multiple of 16), comfortably under the 320px screen even
// after the button's own margin. 306 was tried first and confirmed too
// wide (rounds to the full 320px).
(define BUTTON_MAX_WIDTH	286)

// Extended Therapy / New Game+ (matches js/content.js's maxTurns: 10,
// hardModeTurns: 20, hardModeMultiplier: 1.25). Unlocks permanently the
// first time a standard run survives (UnlockNgPlus(), CaseFiles.sc,
// persisted as Case Files slot CASEFILE_NGPLUS); rm001.sc then offers a
// choice at the top of every run. SCI0 has no floats -- 1.25 is an
// integer 5/4 multiply-then-round in mechanisms.sc's ScaleHardMode().
(define DEFAULT_MAX_TURNS	10)
(define HARD_MODE_TURNS		20)
(define HARD_MODE_MULT_NUM	5)		/* 5/4 = 1.25x stat-swing multiplier in Extended Therapy */
(define HARD_MODE_MULT_DEN	4)

// Defaults
(define NORMAL_SPEED		  8)

// Sounds
(define DUMMY_SOUND           1)
(define SCORE_SOUND         900)
(define DEATH_SOUND           2)

// Fixed UI chrome text (Case Files menu/viewer, the Extended Therapy
// mode-choice dialog), read from a TEXT resource via GetFarText() instead
// of embedded as string literals -- real SCI0 games kept exactly this
// kind of hand-authored, never-regenerated text as data, not baked into
// script bytecode (SCI Companion's own docs: "using them will reduce the
// size of your compiled scripts. Heap space... is at a premium in
// SCI0."). Deliberately NOT applied to the 196 generated events' worth
// of content or the Case Files descriptions -- TEXT resources have no
// external source file, only SCI Companion's own GUI text editor
// (one string at a time, no batch import), so moving programmatically
// generated content there would permanently break the tools/gen-*.js
// regeneration pipeline for a few thousand strings. This is scoped to
// the small, fixed, hand-typed-once set instead.
(define TEXT_UI		0)
(define TEXT_UI_CASEFILES_TITLE			0)
(define TEXT_UI_CASEFILES_PROMPT			1)
(define TEXT_UI_CASEFILES_SURVIVAL_BTN		2)
(define TEXT_UI_CASEFILES_FAILURE_BTN		3)
(define TEXT_UI_CASEFILES_MECH_BTN			4)
(define TEXT_UI_CATEGORY_PROMPT			5)
(define TEXT_UI_VIEW_BTN					6)
(define TEXT_UI_CLOSE_BTN					7)
(define TEXT_UI_SEALED_MSG					8)
(define TEXT_UI_SEALED_TITLE				9)
(define TEXT_UI_NEWSESSION_PROMPT			10)
(define TEXT_UI_NEWSESSION_TITLE			11)
(define TEXT_UI_STANDARD_BTN				12)
(define TEXT_UI_EXTENDED_BTN				13)
(define TEXT_UI_EXTENDED_STARTED_MSG		14)
(define TEXT_UI_EXTENDED_STARTED_TITLE		15)
(define TEXT_UI_CASEFILES_REVIEW_PROMPT	16)
(define TEXT_UI_CASEFILES_REVIEW_TITLE		17)
(define TEXT_UI_CASEFILES_REVIEW_YES_BTN	18)
(define TEXT_UI_CASEFILES_REVIEW_NO_BTN	19)
(define TEXT_UI_CASEFILE_FRAGMENTED_MSG	20)
(define TEXT_UI_CASEFILE_FRAGMENTED_TITLE	21)

// Heap-fragmentation guard for CaseFileCategory.sc's "View" handler (see
// its own header for the original heap-exhaustion saga this continues).
// This dialect's Load/Dispose cycling doesn't reliably reclaim/compact
// memory, so enough runs in one session -- each doing plenty of its own
// small alloc/dispose churn -- can fragment the heap badly enough that
// no single free block is big enough for a description script's Load(),
// even with total free heap to spare. MemoryInfo(miLARGESTPTR) reports
// that largest-contiguous-block number directly (already used for the
// debug memory display in Game.sc/Main.sc); checking it before the
// Load() turns a hard "Out of heap space" crash into a graceful
// in-fiction message instead.
//
// 4096 is a starting estimate, not a measured value -- the actual
// description scripts' compiled sizes aren't visible from source. Tune
// this against real MemoryInfo(miLARGESTPTR) readings (Game.sc's
// showMem) taken right before a View click, ideally reproducing the
// original bug report's multi-run session on real hardware.
(define CASEFILE_VIEW_MIN_HEAP		4096)

// Inventory Items
(define INV_NOTHING           0)
(define INV_TEST_OBJECT       1)

// Fonts
(define DEFAULT_FONT          0)
(define WINDOW_FONT           1)
(define SMALL_FONT            4)
(define LARGE_FONT            9)
(define DEBUG_FONT          999)

// Menu IDs eg. $302 means third menu, second item
(define MENU_ABOUT			$101)
(define MENU_HELP			$102)
(define MENU_RESTART		$201)
(define MENU_SAVE			$202)
(define MENU_RESTORE		$203)
(define MENU_QUIT			$205)
(define MENU_PAUSE			$301)
(define MENU_INVENTORY		$302)
(define MENU_RETYPE			$303)
(define MENU_COLOURS		$305)
(define MENU_CASEFILES		$306)
(define MENU_CHANGESPEED	$401)
(define MENU_FASTERSPEED	$403)
(define MENU_NORMALSPEED	$404)
(define MENU_SLOWERSPEED	$405)
(define MENU_VOLUME			$501)
(define MENU_TOGGLESOUND	$502)
