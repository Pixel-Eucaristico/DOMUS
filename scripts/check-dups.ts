import { ALL_SEASONAL_TROPHIES } from "../packages/gamification/src/seasonalTrophies";
import { ALL_LITURGICAL_TROPHIES } from "../packages/gamification/src/liturgicalTrophies";
import { ALL_ACHIEVEMENTS, MONTHLY_TROPHIES } from "../packages/gamification/src/achievements";

const sIds = (ALL_SEASONAL_TROPHIES || []).map(t => t.id);
const sDups = sIds.filter((id, i) => sIds.indexOf(id) !== i);
if (sDups.length) console.log("SEASONAL DUPS:", sDups);

const lIds = (ALL_LITURGICAL_TROPHIES || []).map(t => t.id);
const lDups = lIds.filter((id, i) => lIds.indexOf(id) !== i);
if (lDups.length) console.log("LITURGICAL DUPS:", lDups);

const aIds = (ALL_ACHIEVEMENTS || []).map(t => t.id);
const aDups = aIds.filter((id, i) => aIds.indexOf(id) !== i);
if (aDups.length) console.log("ACHIEVEMENT DUPS:", aDups);

const mIds = (MONTHLY_TROPHIES || []).map(t => t.id);
const mDups = mIds.filter((id, i) => mIds.indexOf(id) !== i);
if (mDups.length) console.log("MONTHLY DUPS:", mDups);

// Cross-collection (seasonal + liturgical combined, as used in DebugTools)
const allIds = [...sIds, ...lIds];
const crossDups = allIds.filter((id, i) => allIds.indexOf(id) !== i);
if (crossDups.length) console.log("CROSS SEASONAL+LITURGICAL DUPS:", crossDups);

// All 4 combined (as used in DebugTools allTrophies)
const allFourIds = [...sIds, ...lIds, ...aIds, ...mIds];
const allFourDups = allFourIds.filter((id, i) => allFourIds.indexOf(id) !== i);
if (allFourDups.length) console.log("ALL COLLECTIONS CROSS-DUPS:", allFourDups);

if (!sDups.length && !lDups.length && !aDups.length && !mDups.length && !crossDups.length && !allFourDups.length) {
  console.log("No duplicates found anywhere");
}
console.log("Counts - Seasonal:", sIds.length, "Liturgical:", lIds.length, "Achievement:", aIds.length, "Monthly:", mIds.length);
