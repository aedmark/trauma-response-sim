/******************************************************************************
 T.R.S. → SCI0 port
 ******************************************************************************
 mechanisms.sc
 Coping-mechanism unlock system (js/content-mechanisms.js /
 js/engine.js's trackMechanism + applyMechanismModifiers): lean on the
 same tagged response 3 times in a run and it unlocks permanently, after
 which every further choice of that tag also carries a passive stat
 modifier on top of its own effect, for the rest of the run.

 ApplyChoiceEffects is the single entry point every generated event's
 choice calls: applies the mechanism modifier (if unlocked), applies the
 resulting deltas, clamps, and tracks/unlocks the mechanism if not yet
 unlocked. Also holds the turn-loop/zone-picking logic (PickZone,
 GoToNextEvent, EndTurn) -- moved here from rm001.sc since this script
 stays resident for the whole session while rooms don't.
 ******************************************************************************/
(include "sci.sh")
(include "game.sh")
/******************************************************************************/
(script MECHANISMS_SCRIPT)
/******************************************************************************/
(use "main")
(use "controls")
(use "casefiles")
/******************************************************************************/
// No-repeat event pool: one flag per event across all 196, indexed by
// room number minus 200 (WORK_ROOM_BASE, the lowest room base, so every
// room 200-395 maps to a unique 0-195 slot). Script-level local (not
// per-call) so it's visible to both GoToNextEvent/ResetSeenEvents below.
// Persists for the session once loaded -- ResetSeenEvents() must run at
// the start of every run (rm001.sc's init()) or "seen" carries over.
(local
	gSeenEvent[TOTAL_EVENT_COUNT]
)
/******************************************************************************/
(procedure public (ApplyChoiceEffects repDelta maskDelta childDelta tag)
	// One case per tag: apply the passive modifier if already unlocked,
	// otherwise count toward UNLOCK_THRESHOLD and unlock + announce +
	// file a Case File entry the moment it's reached.
	(switch(tag)
		(case TAG_FAWN
			(if(gFawnUnlocked)
				= maskDelta (+ maskDelta 3)
				= childDelta (+ childDelta -5)
			)(else
				++gFawnCount
				(if(>= gFawnCount UNLOCK_THRESHOLD)
					= gFawnUnlocked TRUE
					Print("COPING MECHANISM ACQUIRED: The Approval Loop. This will not be undone.")
					Load(rsSCRIPT CASEFILES_SCRIPT)
					(if(MarkCaseFile(+ CASEFILE_MECH_BASE TAG_FAWN))
						Print("Case Files: The Approval Loop, filed." #title "New Case File")
					)
					DisposeScript(CASEFILES_SCRIPT)
				)
			)
		)
		(case TAG_FLIGHT
			(if(gFlightUnlocked)
				= repDelta (+ repDelta -5)
				= maskDelta (+ maskDelta -3)
			)(else
				++gFlightCount
				(if(>= gFlightCount UNLOCK_THRESHOLD)
					= gFlightUnlocked TRUE
					Print("COPING MECHANISM ACQUIRED: The Exit Strategy. This will not be undone.")
					Load(rsSCRIPT CASEFILES_SCRIPT)
					(if(MarkCaseFile(+ CASEFILE_MECH_BASE TAG_FLIGHT))
						Print("Case Files: The Exit Strategy, filed." #title "New Case File")
					)
					DisposeScript(CASEFILES_SCRIPT)
				)
			)
		)
		(case TAG_FIGHT
			(if(gFightUnlocked)
				= repDelta (+ repDelta -5)
				= maskDelta (+ maskDelta -8)
			)(else
				++gFightCount
				(if(>= gFightCount UNLOCK_THRESHOLD)
					= gFightUnlocked TRUE
					Print("COPING MECHANISM ACQUIRED: Hair-Trigger. This will not be undone.")
					Load(rsSCRIPT CASEFILES_SCRIPT)
					(if(MarkCaseFile(+ CASEFILE_MECH_BASE TAG_FIGHT))
						Print("Case Files: Hair-Trigger, filed." #title "New Case File")
					)
					DisposeScript(CASEFILES_SCRIPT)
				)
			)
		)
		(case TAG_FREEZE
			(if(gFreezeUnlocked)
				= repDelta (+ repDelta 8)
				= childDelta (+ childDelta -5)
			)(else
				++gFreezeCount
				(if(>= gFreezeCount UNLOCK_THRESHOLD)
					= gFreezeUnlocked TRUE
					Print("COPING MECHANISM ACQUIRED: The Void. This will not be undone.")
					Load(rsSCRIPT CASEFILES_SCRIPT)
					(if(MarkCaseFile(+ CASEFILE_MECH_BASE TAG_FREEZE))
						Print("Case Files: The Void, filed." #title "New Case File")
					)
					DisposeScript(CASEFILES_SCRIPT)
				)
			)
		)
		(case TAG_SECURE
			(if(gSecureUnlocked)
				= repDelta (+ repDelta -5)
				= childDelta (+ childDelta 5)
			)(else
				++gSecureCount
				(if(>= gSecureCount UNLOCK_THRESHOLD)
					= gSecureUnlocked TRUE
					Print("COPING MECHANISM ACQUIRED: Earned Security. This will not be undone.")
					Load(rsSCRIPT CASEFILES_SCRIPT)
					(if(MarkCaseFile(+ CASEFILE_MECH_BASE TAG_SECURE))
						Print("Case Files: Earned Security, filed." #title "New Case File")
					)
					DisposeScript(CASEFILES_SCRIPT)
				)
			)
		)
	)
	= repDelta ScaleHardMode(repDelta)
	= maskDelta ScaleHardMode(maskDelta)
	= childDelta ScaleHardMode(childDelta)
	= gRepression (+ gRepression repDelta)
	= gMask (+ gMask maskDelta)
	= gChild (+ gChild childDelta)
	ClampStats()
)
/******************************************************************************/
(procedure public (ApplyGlitch logMsg)
	// The glitch wildcard (js/engine.js's handleGlitchChoice): fully
	// random effects in [-25, 25] per stat, untagged, never counts
	// toward a mechanism unlock. Still scaled by Extended Therapy, same
	// as a normal choice.
	= gRepression (+ gRepression ScaleHardMode(- Random(0 50) 25))
	= gMask (+ gMask ScaleHardMode(- Random(0 50) 25))
	= gChild (+ gChild ScaleHardMode(- Random(0 50) 25))
	ClampStats()
	Print(logMsg)
)
/******************************************************************************/
(procedure public (ScaleHardMode delta)
	// Extended Therapy's 1.25x stat-swing multiplier. SCI0 has no floats
	// -- 1.25 = 5/4, integer multiply-then-divide with a +2 numerator
	// nudge to round to nearest instead of truncating. Works on the
	// absolute value and reapplies the sign afterward, since there's no
	// confirmed precedent for how this dialect's "/" rounds negative
	// operands.
	(var absDelta, scaled)
	(if(not gHardMode)
		return(delta)
	)
	(if(< delta 0)
		= absDelta (- 0 delta)
		= scaled (/ (+ (* absDelta HARD_MODE_MULT_NUM) 2) HARD_MODE_MULT_DEN)
		return(- 0 scaled)
	)
	return(/ (+ (* delta HARD_MODE_MULT_NUM) 2) HARD_MODE_MULT_DEN)
)
/******************************************************************************/
(procedure public (PickWorstStat)
	// 0=repression, 1=mask, 2=child. Mask/child inverted into "danger"
	// terms (100-stat) so all three compare the same way (higher =
	// worse); ties favor the earlier stat, matching the original's
	// Array.reduce order. Shared by PickZone (zone weighting) and
	// GetPortraitMood below.
	(var worst, worstDanger, dangerMask, dangerChild)
	= worst 0
	= worstDanger gRepression
	= dangerMask (- 100 gMask)
	(if(> dangerMask worstDanger)
		= worst 1
		= worstDanger dangerMask
	)
	= dangerChild (- 100 gChild)
	(if(> dangerChild worstDanger)
		= worst 2
		= worstDanger dangerChild
	)
	return(worst)
)
/******************************************************************************/
(procedure public (GetPortraitMood)
	// Same worst-stat comparison as PickWorstStat, plus a neutral
	// threshold -- loop number doubles as mood (0 neutral, 1-3 =
	// repression/mask/child). Split out so PrintChoices can ask for the
	// current mood directly.
	(var worst, worstDanger, dangerMask, dangerChild)
	= worst 0
	= worstDanger gRepression
	= dangerMask (- 100 gMask)
	(if(> dangerMask worstDanger)
		= worst 1
		= worstDanger dangerMask
	)
	= dangerChild (- 100 gChild)
	(if(> dangerChild worstDanger)
		= worst 2
		= worstDanger dangerChild
	)
	(if(< worstDanger PORTRAIT_NEUTRAL_THRESHOLD)
		return(PORTRAIT_MOOD_NEUTRAL)
	)
	return(+ worst 1)
)
/******************************************************************************/
(procedure public (PortraitViewForIndex idx)
	// Maps a portrait index (0..PORTRAIT_COUNT-1 -- see game.sh and
	// PromptPortraitChoice, printchoices.sc) to its PORTRAIT_VIEW_n
	// resource number. gPortraitChoice (Main.sc) holds whichever index
	// the player picked at the start of this run; PrintChoices' mood
	// icon calls this with gPortraitChoice directly.
	(if(== idx 1)
		return(PORTRAIT_VIEW_1)
	)
	(if(== idx 2)
		return(PORTRAIT_VIEW_2)
	)
	(if(== idx 3)
		return(PORTRAIT_VIEW_3)
	)
	return(PORTRAIT_VIEW_0)
)
/******************************************************************************/
(procedure public (ZoneStatBias zoneIndex)
	// Zone -> stat-bias mapping, matching the original's `zones` array.
	// Encoding matches PickWorstStat: 0=repression, 1=mask, 2=child.
	(switch(zoneIndex)
		(case 0 return(0))		/* WORK -> repression */
		(case 1 return(2))		/* HOME -> child */
		(case 2 return(1))		/* SOCIAL -> mask */
		(case 3 return(2))		/* SELF -> child */
		(case 4 return(0))		/* BODY -> repression */
		(case 5 return(1))		/* PUBLIC -> mask */
	)
	return(-1)
)
/******************************************************************************/
(procedure public (PickZone)
	// Weighted zone selection (matches pickWeightedEvent()): zones whose
	// stat bias matches the current worst stat get weight 5, others get
	// 2 (same 2.5x ratio as the original's weakZoneWeight, scaled to
	// integers). Total weight is a hardcoded 18 (4*2 + 2*5, always true
	// while exactly 2 of 6 zones match any given worst stat) -- would
	// need recomputing if that ratio changes. No-repeat awareness lives
	// in GoToNextEvent below, not here.
	(var worstStat, i, r, w)
	= worstStat PickWorstStat()
	= r Random(0 17)
	(for (= i 0) (< i ZONE_COUNT) (++i)
		(if(== ZoneStatBias(i) worstStat)
			= w 5
		)(else
			= w 2
		)
		(if(< r w)
			return(i)
		)
		= r (- r w)
	)
	return(0)
)
/******************************************************************************/
(procedure public (ResetSeenEvents)
	// Clears the no-repeat pool -- must run once per run (rm001.sc's
	// init()) since gSeenEvent otherwise persists for the whole session.
	(var i)
	(for (= i 0) (< i TOTAL_EVENT_COUNT) (++i)
		= gSeenEvent[i] FALSE
	)
)
/******************************************************************************/
(procedure public (GoToNextEvent)
	// Picks a zone-weighted random event and transitions straight to its
	// room (<ZONE>_ROOM_BASE + local index) -- no dispatcher script, the
	// room IS the event. Re-picks a fresh zone+index each retry (not just
	// a new index in the same zone) so zone weighting isn't skewed by
	// whichever zone happened to collide first; gives up after
	// MAX_EVENT_PICK_RETRIES and accepts a repeat rather than looping
	// forever.
	(var zone, index, roomNum, tries)
	= tries 0
	(while(1)
		= zone PickZone()
		(switch(zone)
			(case 0
				= index Random(0 (- WORK_EVENT_COUNT 1))
				= roomNum (+ WORK_ROOM_BASE index)
			)
			(case 1
				= index Random(0 (- HOME_EVENT_COUNT 1))
				= roomNum (+ HOME_ROOM_BASE index)
			)
			(case 2
				= index Random(0 (- SOCIAL_EVENT_COUNT 1))
				= roomNum (+ SOCIAL_ROOM_BASE index)
			)
			(case 3
				= index Random(0 (- SELF_EVENT_COUNT 1))
				= roomNum (+ SELF_ROOM_BASE index)
			)
			(case 4
				= index Random(0 (- BODY_EVENT_COUNT 1))
				= roomNum (+ BODY_ROOM_BASE index)
			)
			(case 5
				= index Random(0 (- PUBLIC_EVENT_COUNT 1))
				= roomNum (+ PUBLIC_ROOM_BASE index)
			)
		)
		(if(not gSeenEvent[(- roomNum 200)])
			break
		)
		++tries
		(if(>= tries MAX_EVENT_PICK_RETRIES)
			break
		)
	)
	= gSeenEvent[(- roomNum 200)] TRUE
	(send gRoom:newRoom(roomNum))
)
/******************************************************************************/
(procedure public (EndTurn)
	// Called at the end of every event room's init(): increments the
	// turn counter, clamps stats, then ends the run (any stat out of
	// bounds, or gTurn past gMaxTurns) or picks the next event.
	// rm001.sc also calls this once with gTurn pre-set to 0 to bootstrap
	// the first turn through the same logic.
	++gTurn
	ClampStats()
	(if((> gTurn gMaxTurns) or (>= gRepression 100) or (<= gMask 0) or (<= gChild 0))
		(send gRoom:newRoom(ENDING_ROOM))
		return
	)
	GoToNextEvent()
)
/******************************************************************************/
