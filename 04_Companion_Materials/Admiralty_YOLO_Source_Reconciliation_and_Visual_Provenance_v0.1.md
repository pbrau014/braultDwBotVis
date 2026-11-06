# Admiralty × YOLO source reconciliation and visual provenance

**Record:** v0.1  
**Prepared:** 2026-11-06  
**Status:** Source intake reviewed; reconciliation is a derivative analysis, not approval of an event, prize, scoring workbook, roster, or schedule.

## 1. Source archive identity

The supplied Library archive `yoloPaperWork(1).zip` was opened and checked before extraction.

- Size: 22,976,255 bytes
- SHA-256: `b7598ed96d9af8ff1bd564e7aed945621800e2299e2f262d86541c62f34cf7b2`
- ZIP integrity: `testzip()` returned no corrupt member
- Members: 19, comprising four source folders and their files
- Extraction: completed to a clean working directory; every member path was checked to remain inside that directory before extraction.

The three Discord source texts have been preserved verbatim in `dwbotStuff/discordMsgs/`. The source DOCX/PDF, workbook, and images are already preserved in `dwbotStuff/`.

## 2. Source authority and intended use

| Source family | What it contributes | Authority boundary |
|---|---|---|
| `admiralty/admiralty_first_election_handbook.pdf` | Fictional clan narrative, named characters, governance structure, service roles, Discord culture, readiness and season arc | Fictional worldbuilding and organizational/presentation model. It does not establish YOLO rules or real staff appointments. |
| `admiralty/admiralty_organizational_chart.jpg` | Exact six-group / three-branch / fleet-and-service organization visual | Reused as a visual reference; 50 positions are the fictional Admiralty roster, not a YOLO participant cap. |
| `admiralty/govRec1.png`, `govRec2.png` | Two visual storyboard/infographic treatments | Visual concept boards only. They show different names, election outcomes and chronology; neither is silently merged into the PDF handbook's canon. |
| `cbStrat/Tier_X_Clan_Battles_Competitive_Strategy_Final_Page_Image.pdf` | Tier X competitive strategy: vision, information, objective control, radar timing, crossfires, focus fire, push/hold, target priority, disengagement | Tactical principles can be adapted. Tier X ships, seven-ship compositions, consumable assumptions and Clan Battles restrictions are not YOLO rules. |
| `cbStrat/cb strat img ref.png` | Exact CBStrat infographic, diagrams and editorial style | Reused as a visual and teaching reference with a Tier X / non-YOLO disclaimer. |
| `yolo/yolo_rules_xmpl.docx` | Recurring weekly YOLO rules, brackets, team drafting, race event, ship restrictions, maps, score evidence, staff and streamer provisions | Primary supplied recurring-format rule source; blanks and internal conflicts remain open. |
| `yolo/yolo_event.docx` | Simplified Pilot Event, drop-in participation, 6-human/6-bot rooms, visible lineups, host duties and special last match | Primary supplied Pilot source; it must not be mixed into recurring rules without an event-specific decision. |
| `discordMsgs/yolo summary discord.txt` | Short participant-facing summary and weekly story | Secondary communication summary; it compresses the distinction between bracket wins and damage awards. |
| `discordMsgs/how yolo wkbk work discord.txt`, `yolo scoring guide discord.txt` | Plain-language explanation and example of workbook tabs/formulas | Secondary explanations. Formula claims are checked against the supplied archival workbook and DWBOT policy rather than accepted uncritically. |
| `yolo/test27xlsm.xlsm` | Historical example workbook with formulas, sample inputs and summary tab | Archival sample only; the current Event Settings record explicitly says it is not the designated canonical workbook and must not certify live scoring. |
| `yolo/mtheqfnl.jpg` | Screenshot/example of the historical damage formula and sample tables | Historical visual evidence, not a current approved formula or prize schedule. |
| `yolo/yolo_description.pdf` | Original YOLO visual identity / introductory layout | Presentation inspiration; not an event settings record. |

### Key source fingerprints

| File | SHA-256 |
|---|---|
| Admiralty handbook PDF | `176a75649c1010a7b4526d4681da2fcff06dfe247c4a8e3b7f92ea044d6639df` |
| Admiralty org chart JPG | `950cbb1c829d90052534585479dc8eb2546cec602ad6ee3a3f8fce6c3e08eca3` |
| Admiralty visual board 1 | `6656ca26f9e04d43a3477c7ab97b53d0a215042f278c2b72007c5047929ffdb1` |
| Admiralty visual board 2 | `80f8b1def94991d39d1cb1e67e08ab730ac47a4efe5c2ccad4283f329e1e9fa5` |
| CBStrat PDF | `e582e774a7e0f8f4f58882bd501fb1565026ce2385539284180490a92d8e06ef` |
| CBStrat infographic | `55791b6567621a681d5481e39ee70ffee0cebb97615502428fa43cba5fbbba0c` |
| YOLO recurring rules DOCX | `7bf29b0b4195c7968e60da42400f422e36d60826eb46d0365b28b1bfdb597e46` |
| YOLO Pilot DOCX | `77e3fe47e9bd867a57873411b25f2ed059d975121364ad2fe35b936b0fd67005` |
| YOLO description PDF | `719a1cedb87e6d8d3e9a680d995460885ade3c45742f7a28ea8263bc7c10d32d` |
| Archival workbook | `6faca9a1a773ab98ca056bce6e33ae9fad0f2c8b8c440803cd915125c8571446` |
| YOLO formula/example image | `02a62c400036912c6139b03314df0f115d27b0d151ce6e24bd2d931807b3c0f8` |
| Discord workbook explanation | `3809f1fdb06ae41229cef2836c9f49af47b06ba954dd61bc223ea615b88ec851` |
| Discord scoring guide | `52e491698dbfd0ad701fe9cf964a5d6a85fa98a5eca85a3b3e63fa11799e1131` |
| Discord YOLO summary | `d93ec8c79b494be1c036ede6dbb99a62342b3dcd9b704e53ad0691078782e312` |

## 3. Reconciled event model

### Pilot Event — a rehearsal, not a recurring-week rule

The Pilot source describes a drop-in event with no prior registration, a one-hour entry cutoff, final lineups 30 minutes before games, and approximately seven games per participant. Each room is planned around six humans and six bots; if the human count is short, the bot count mirrors the human count. Training Rooms are used; lineups are visible; a home team opens the room and invites the opponent. Standard Battle is listed for ten minutes. The source also describes a final Ocean special-mode match, but the Pilot document and other source tables disagree about its mode label and duration. The special match must not be announced until the exact current-client mode and duration are approved in an event settings record.

The Pilot is not the recurring weekly bracket. Pilot participation, room settings, lineup visibility and award rules do not silently carry into the season.

### Recurring YOLO — three rounds, weekly draft and damage awards

The recurring source describes three rounds per event night, approximately seven games per participant, ten-minute games, ten-minute match/reporting intervals and a fifteen-minute break between rounds. The planning estimate is two to three hours.

- Round 1 is a bot match described as 2v6, with a later source note allowing 3v9 depending on turnout.
- Rounds 2 and 3 use mixed human/bot teams, described as 6v6 or 9v9; each side has two or three humans and bots fill the remaining slots.
- Teams are drafted randomly for the evening; a new draft occurs each week.
- Round 1 seeding is first-come-first-served; Rounds 2 and 3 are seeded by wins.
- A third-place/consolation bracket is intended to keep teams playing through each round.
- Match wins determine bracket advancement. Individual damage determines the announced nightly damage awards and contributes to cumulative Grand YOLO damage ranking/prizes.

This last distinction reconciles the recurring rules with the short Discord summary, which says “rankings and prizes” are damage-based. That summary is too compressed to express the separate bracket and award paths: wins advance the bracket; individual damage ranks the individual awards and cumulative damage standings. The distinction must remain explicit in every public guide.

### Race side event

The recurring rules describe a Race for the lower 50% of participants by cumulative damage, every third week and one hour before the regular event. The narrative describes Ocean, an armor-resilient mode, stationary non-firing bots, a southwest-to-northeast course and a 30-minute limit. The first finisher receives a 10% increase to Race winnings; a participant who dies loses 10%. Race damage contributes to cumulative Grand YOLO seeding/prize calculations but not that night's regular event total.

Do not confuse the side-event Race with “Big Race” in the map table: Big Race is listed as a map name for weeks 3 and 10. The source also conflicts on special-mode labels/durations: the Pilot table lists a five-minute Ocean special match, the recurring map table lists a ten-minute Ocean special match, and the Race narrative describes a 30-minute event. Each instance needs an explicit approved setting.

### Grand YOLO and playoffs

The recurring source establishes a season-ending Grand YOLO bracket: cumulative damage from previous weeks seeds the finale, wins advance participants through its bracket, and cumulative damage across the events/finale determines individual prize placement. The supplied YOLO rules do not define a separate regular-season playoff field, qualification cutoff, playoff bracket type or series length. The top-eight / 6-of-12 / single-elimination playoff plan in the current Season Logistics blueprint is therefore a proposal only, not a source-derived rule.

“Grand Yolo” also names Round 4 of the archival calculator. That sheet's individual reward formula is not itself a team match-outcome formula or a bracket engine. The workbook tab and the season-ending championship event must not be treated as the same thing without a signed event decision.

## 4. Scoring source audit

The two Discord scoring texts describe the general share formula. The archival `test27xlsm.xlsm` formulas show the following.

### Damage and kills

For a player, sum seven per-game contributions:

`2 × eventMultiplier × pool × Σ(classWeight × (gameMetric / eventTotalMetric) / tier^tierPower)`

For Damage, `gameMetric` is damage. For Kills, it is kills. The sample defaults are pool 500, multiplier 1, tier power 1, with class weights DD=4, CA=3, BB=2. These are archival sample values, not current event approval.

### Race

The archival workbook uses elapsed seconds directly as the performance share. That means a larger/slower elapsed time receives a larger share. The current DWBOT scoring policy C01 instead specifies `1 / elapsedSeconds`, so lower time scores better. The live DWBOT engine and standalone HTML calculator were corrected to use inverse elapsed seconds. The historical workbook and Discord explanations are preserved unchanged as provenance; do not silently rewrite them.

### Grand Yolo

The archival formula uses seven game contributions. Each game combines:
- `100 × tierWeight / tier`
- `damage × damageWeight / (tier × 1000)`
- `10 × kills × killsWeight / tier`
- `5000 × timeWeight / elapsedSeconds`

The sum is multiplied by class weight and by the player's share of total Grand Yolo damage, multiplied by the overall event multiplier, then divided by 3. The sample Grand tier weight is 0.9; other Grand weights are 1. The Grand sheet's pool cell is not used by the formula. The historical `S10:S12` class preference cells are also not referenced by the per-event formula.

### Season totals in the archival sample

The historical summary:
- sums the four event Doubloon outputs;
- averages the player's total Damage from Event 1 and Grand Yolo;
- averages Tier over 21 entries from Events 1, 2 and 4;
- averages Kills over seven Event 2 games;
- classifies average class weight as DD above 3.6, CA from 2.7 through 3.6, BB below 2.7;
- computes a dollar equivalent using `0.54 × Doubloons / 100`.

That dollar conversion is a historical workbook calculation, not an official Wargaming purchase value or a prize promise. Current DWBOT public standings do not expose the dollar estimate by default.

**Important scoring authority boundary:** the current Event Settings record says the supplied `test27xlsm.xlsm` is an archival sample, not the designated canonical workbook. These formulas explain the historical source and inform tests; they do not certify the live scoring policy, prize schedule or bracket outcome formula. The canonical workbook and signed event settings remain required for live scoring certification.

## 5. Admiralty narrative and organizational translation

The handbook's 50 positions are organized into Executive (8), Legislative (10), Judicial (3), Fleet Command (7), Service Corps (8) and General Membership (14). It describes three branches plus fleet and service operations. This is a fictional clan-government simulation, not a mandatory 50-person tournament roster.

The mock tournament translates its responsibilities as follows:
- Executive: event direction, calendar, approvals and public notices.
- Legislative: member voice, proposed rules and resource review; not live tactical command.
- Judiciary: independent dispute and appeal review; not live tactical command.
- Fleet Command: competitive doctrine, training, caller development and live match command.
- Service Corps: events, safety, moderation, recruitment, training, analytics, technical and logistics support.
- General Membership: participants, volunteers, mentors and developing players.

The handbook's PDF narrative is used as the character reference: Rowan “Anchor” Pierce and Elias “Wake” Mercer debate standards and transparency; Mira “Valkyrie” Solano and Jonah “Tide” Bell build a training/calendar bridge; Ava “Chartroom” Keene and Darius “Keel” Holt reconcile useful records with privacy; Lucas “Soundings” Chen and Elena “Sparrow” Cruz connect member voice to event access. The Fleet Command roster includes Victor “Spear” Moreno and other appointed leaders. Their dialogue and tournament actions in the new field guide are dramatized fiction, not real quotations or appointments.

The two `govRec` visual boards contain alternate character names, election outcomes and chronologies. They are retained as visual studies, not merged into the handbook's character canon.

## 6. CBStrat adaptation boundary

The CBStrat guide is explicitly about Tier X Clan Battles and recommends a seven-ship composition. Its useful transferable principles are:
- obtain vision and share information before committing;
- choose and support an objective;
- call a target before a detection/consumable window;
- focus fire rather than distributing damage;
- create more than one firing angle;
- push only with local advantage, support and an exit route;
- hold when ahead and the objective/point race favors patience;
- adapt roles when a ship or tool is unavailable.

The YOLO rules are low-tier, bot/human mixed, and individually drafted. Do not copy Tier X ship names, radar coverage assumptions, exact lineups, or Clan Battles restrictions. In YOLO, a “role” means a job—scout, objective contest, support, crossfire, anchor, caller or reserve—performed with whatever legal ship and consumables the current event allows. Radar, hydro, smoke and other tools are used only if the participant's legal ship actually has them.

## 7. Visual and layout direction

The public mock guide uses the Admiralty handbook's deep-navy field, gold masthead, fine divider lines, color-coded branch panels and editorial chapter/page rhythm. The exact Admiralty organization chart and CBStrat tactical infographic are included as source images. The YOLO damage-formula image is included only as a historical scoring visual. The alternate `govRec1` and `govRec2` boards are labeled as non-canonical design studies.

## 8. External reference set

External information was checked on 2026-11-06. Use it as context, not as YOLO event policy:

- Wargaming's official World of Warships overview: https://wargaming.net/en/games/wows
- World of Warships Wiki overview and ship classes: https://wiki.worldofwarships.com/World_of_Warships
- Wiki battleship roles: https://wiki.worldofwarships.com/Ship:Battleships
- Wiki cruiser roles: https://wiki.worldofwarships.com/Ship:Cruisers
- Wiki detection, concealment, line of sight, radar/hydro and smoke: https://wiki.worldofwarships.com/Ship:Detection
- WoWs Tournaments current event listings and event-specific restrictions: https://wows-tournaments.com/
- WoWS Numbers NA public player/ship statistics and replays: https://na.wows-numbers.com/
- DevStrike community guides, including Destroyer Fundamentals and Operations: https://www.devstrike.net/topic/9388-destroyer-fundamentals-the-definitive-guide/ and https://www.devstrike.net/topic/10196-operations-game-mode-guide-world-of-warships/
- Turnio tournament formats: https://turnio.net/esports-tournament-guide/
- ScoreLeader bracket primer: https://scoreleader.com/how-tournament-brackets-work/

Tournament formats, ship limits, maps, rosters, eligibility, scoring and schedules change often. Recheck the exact event's current regional rules and signed settings before registration and again before play.
