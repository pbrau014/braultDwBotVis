# Grand YOLO Tournament Instructions

**Implementation draft — Pilot YOLO and Full YOLO share one system.**

## 1. Choose the format

- **Pilot YOLO** is a compact, single-evening event. It has one event lifecycle, one roster lock and one final event result. It does not create a season, regular-season table, postseason bracket or season finale.
- **Full YOLO** is a season lasting the organizer-declared number of weeks/months. It contains a regular season, postseason and Grand YOLO tournament finale. The actual duration, event dates, advancement capacity and series structure must be approved and published before registration.
- Both formats share participant registration, identity verification, rules publication, team/roster procedures, match operations, evidence submission, corrections, scoring review, dispute handling and awards. The format changes lifecycle and explicitly configured rules, not the basic participant journey.

## 2. Participant journey (both formats)

1. Read the published event settings, eligibility, ship restrictions, schedule, scoring and evidence rules.
2. Register using the published method before the stated close.
3. Confirm the exact in-game and Discord identity. Identity ambiguity is referred to an organizer; it is not guessed from a similar name.
4. Review team/roster assignment and ready-up instructions at the published time.
5. Join only the designated Training Room and follow host/referee instructions.
6. Capture the required post-battle Personal Score evidence. OCR is a candidate extraction only; accepted values require exact validation and human review when uncertain.
7. Correct one unresolved field at a time. Do not invent missing values, treat blanks as zero, or bypass evidence.
8. Review published standings/results and use the stated dispute window and contact.

## 3. Pilot YOLO operations

- Publish a single event date/time/timezone, signup close, final lineup time, room/host, map pool, ship eligibility, battle duration, round/game count, breaks, no-show policy, evidence deadline, scoring and award terms.
- The historical pilot source describes an entry close one hour before start and final lineup 30 minutes before start. Treat these as source-derived defaults only; organizers must ratify them for each event.
- Pilot results are individual Damage placement/prize outcomes under the historical pilot source. Do not infer team advancement or seed a future Full season unless a separately approved, published rule explicitly says so.
- A pilot may use teams for room logistics; team win/loss is not automatically the individual prize metric.

## 4. Full YOLO season operations

- Before opening registration, publish season start/end, duration, event-night schedule, registration/roster lock rules, team formation, number of regular-season events, match format, scoring method, aggregation/rounding, tie-break order, postseason qualification, bracket size, byes/forfeits/withdrawals, finale format, dispute deadlines and award terms.
- Keep regular-season event-night records and standings cumulative only within the declared season. Do not mix Pilot results into a Full season unless an explicit, published transfer rule authorizes it.
- Complete regular-season reconciliation before generating postseason qualification. Use the approved match-outcome formula, not raw player totals or the legacy workbook ranking alone.
- Run the postseason using the published bracket and tie-break sequence. Record every fixture, match, game, accepted performance record, forfeit/bye and decision.
- The Grand YOLO finale is the concluding stage of Full YOLO. It is not the same thing as the legacy **Grand Yolo** scoring category.
- A Full season is not complete until regular season, postseason, and finale decisions are reconciled and signed off.

## 5. Terminology and scoring boundaries

- **Damage / Kills / Race / Grand Yolo** are legacy scoring categories, not tournament stages.
- **Race-time metric** is a per-game elapsed-time metric. Store positive elapsed seconds; where the approved rule uses reciprocal scoring, metric = 1 / seconds and lower elapsed time is better.
- **Race side-event** is a separately scheduled competition that may contribute to a season total only when its schedule and scoring policy are approved. The historical recurring source places it one hour before regular event nights in weeks 3, 6, 9 and the finale; this schedule remains subject to organizer ratification.
- **Big Race** is a map designation, not a scoring category or lifecycle stage.
- **Grand Yolo score** is a legacy scoring category. **Grand YOLO finale** is the final stage of Full YOLO. Never conflate them.

## 6. Integrity, scoring and evidence controls

- Preserve original screenshot, hash, OCR candidates, accepted correction, reviewer, timestamp and record linkage.
- Nine mandatory DWBOT fields remain exact: result, player, map, mode, battleStart, credits, freeXp, damage, xp. This OCR contract does not itself establish which fields determine a tournament match outcome.
- Official match outcomes require an approved scoring-method identifier, accepted individual-performance records, published aggregation and rounding, and an explicit tie-break order.
- The documented tie-break sequence is: head-to-head; record among tied teams; predeclared team metric/point differential; extra deciding game if feasible; auditable random draw only when expressly authorized.
- Do not assume Training Room battles award Credits or XP. Historical game documentation says Training Room battles provide no rewards; test actual client screenshots and retain strict field validation. A missing field must not be fabricated as zero.
- Ordinary rules/settings freeze when an event starts. Changes apply prospectively to future/unplayed games only. Emergency safety/security/platform changes require documented reason, scope, approver, timestamp, affected games and participant notice/review.
- Never calculate official bracket progression, monetary awards or season advancement from unapproved workbook formulas.

## 7. Organizer and match operations

1. Create the tournament as a draft. Pilot has no season; Full declares duration and receives regular-season, postseason and finale stages.
2. Attach the organizer-approved settings record ID before publishing the tournament or any Full stage. Blank approval references keep records in draft.
3. Create event nights with their own approved settings record. Publish only after the settings record is attached; starting the event locks its registration roster.
4. Register participants by their linked roster identity. A participant may be registered once per event night. Team assignment requires registration and prevents duplicate team membership in that event night.
5. Create fixtures only between teams assigned to the same event night. Create matches within the declared series length and games within each match.
6. Link only complete, mapped screenshot records to games. Linking places evidence into review; it does not automatically accept the evidence or determine a match outcome. An administrator records acceptance or rejection, with a reason required for rejection.
7. Every tournament, stage, event-night, registration, team, fixture, match, game and evidence decision should retain actor/time/action audit history. Private full recovery archives retain roster details; public recovery snapshots omit participant registrations and private roster metadata.
8. Before a Full stage can close, its event nights must be completed and every match outcome must be certified. Certification records the approved scoring method, accepted evidence IDs, aggregation, rounding, tie-break order and an external decision reference. The bot does not calculate an unapproved formula or invent a winner.
9. Race side-events require a separate approved scoring policy and event-settings record. Race-time metrics are attached to an evidence-accepted game as positive elapsed seconds and reciprocal 1/seconds; they are not the side-event or a bracket outcome.
10. Tournament and stage progression is ordered. Full YOLO cannot complete until regular season, postseason and Grand YOLO finale are all completed.

## 8. Organizer publication checklist

Required before a live event: format; organizer/approver; date/time/timezone; registration close; roster lock; participant cap; eligibility and ship list; room/password distribution; maps/modes; team composition; game count/duration; scoring and rounding; tie-breaks; no-show/forfeit/bye rules; evidence and dispute windows; award amounts; privacy/channel scope; accessibility/contact; emergency procedure. Blank values are blocking, not invitations for the bot to guess.

## 9. Mouseover and keyboard quick help

Desktop help must be available on hover and keyboard focus, with visible labels and accessible descriptions. Tooltips supplement—not replace—complete instructions. Provide the same explanation in an always-available help panel for touch and keyboard users.

## 10. Release status and known limits

This instruction set is a working operational draft, not an event approval record. The canonical v3.22 workbook and canonical Score Reporter HTML were not available in the audited source set. Historical ship allowlists, exact roster sizes, special-mode current-client label, event dates, approver signatures, award amounts and some team/bot composition details remain unresolved. Do not invent them. Production event approval requires organizer completion and sign-off of the event settings record.
