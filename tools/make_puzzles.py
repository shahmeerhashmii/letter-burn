"""Generate Letter Burn puzzles and solve each one for par.

Usage:  python3 tools/make_puzzles.py [--start 2026-11-09] [--days 90] [--practice 60]

Reads data/words.json and data/categories.json, writes data/puzzles.json and
data/practice.json. Existing daily puzzles that are already dated are kept as they
are, so published days never change. Run it again to extend the schedule.
"""
import json, random, itertools, argparse, datetime, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

ap = argparse.ArgumentParser()
ap.add_argument("--start", default="2026-11-09")
ap.add_argument("--days", type=int, default=90)
ap.add_argument("--practice", type=int, default=60)
ap.add_argument("--seed", type=int, default=2026)
args = ap.parse_args()

data = json.load(open(P("data", "words.json")))
cats = json.load(open(P("data", "categories.json")))
CID = [c["id"] for c in cats]
WORDS = data["words"]  # key -> [display, [tag idx], [variants]]

# Parent/child categories never appear together (Double Duty would be automatic).
PARENTS = {
    "animal": {"pet", "farm_animal", "sea_creature", "bird", "bug", "zoo_animal"},
    "food": {"fruit", "vegetable", "dessert", "breakfast", "snack", "pizza_topping"},
    "clothing": {"headwear", "footwear", "accessory"},
    "flies": {"bird"},
}

members = {c: set() for c in CID}
for k, (disp, tags, variants, *rest) in WORDS.items():
    checked = {CID[i] for i in rest[0]} if rest else set()
    for t in tags:
        if CID[t] not in checked:  # solver only uses clearly-accepted answers
            members[CID[t]].add(k)

def too_close(a, b):
    if b in PARENTS.get(a, ()) or a in PARENTS.get(b, ()):
        return True
    sa, sb = members[a], members[b]
    return len(sa & sb) > 0.4 * min(len(sa), len(sb))

ALPHA = "abcdefghijklmnopqrstuvwxyz"
try:
    from wordfreq import zipf_frequency
except ImportError:
    sys.exit("This script needs wordfreq:  pip install wordfreq")
_common = {}
INITIALS = set("""usb mma suv gta rv atv ufc bjj tv pc dj ac ev uk us usa uae ksa drc nyc la sf dc kl oj bbq psw emt ceo diy sup cne
lcbo pjs dnd gb tee ps vcr dvd cd sim mic""".split()) - {"tee", "mic"}
def common(typed):
    """Par only uses words most people know: real words, not initials, not rare."""
    if typed not in _common:
        ok = typed.isascii() and all(ch.isalpha() or ch == " " for ch in typed)
        ok = ok and typed not in INITIALS and " and " not in f" {typed} " and (len(typed) >= 3 or typed in {"ox"}) and any(v in typed for v in "aeiouy")
        _common[typed] = ok and zipf_frequency(typed, "en") >= 3.0
    return _common[typed]
def lmask(s):
    m = 0
    for ch in s:
        if "a" <= ch <= "z":
            m |= 1 << (ord(ch) - 97)
    return m
def popc(m): return bin(m).count("1")

def solve(prompts, cap_routes=60):
    """Best zero-borrow solution: cover all prompts, letter-disjoint words, fewest letters."""
    idx = {p: i for i, p in enumerate(prompts)}
    cands = []
    for k, (disp, tags, variants, *rest) in WORDS.items():
        pm = 0  # the game accepts borderline answers too, so they count here
        for t in tags:
            c = CID[t]
            if c in idx:
                pm |= 1 << idx[c]
        if not pm:
            continue
        best = None
        for typed in [k] + list(variants):
            if not common(typed):
                continue
            m = lmask(typed)
            if best is None or popc(m) < popc(best[1]):
                best = (typed, m)
        if best:
            cands.append((popc(best[1]), pm, best[1], best[0]))
    cands.sort()
    by_prompt = [[c for c in cands if c[1] >> i & 1] for i in range(5)]
    full = (1 << 5) - 1
    best = [27, None]
    routes = []

    def dfs(cov, used, n, chosen, limit):
        if cov == full:
            if n < best[0]:
                best[0], best[1] = n, list(chosen)
            return
        # pick the open prompt with the fewest usable candidates
        pick, pick_list = None, None
        for i in range(5):
            if not cov >> i & 1:
                lst = [c for c in by_prompt[i] if not c[2] & used]
                if pick is None or len(lst) < len(pick_list):
                    pick, pick_list = i, lst
        if not pick_list:
            return
        for c in pick_list:
            if n + c[0] >= min(best[0], limit + 1):
                break
            chosen.append(c[3])
            dfs(cov | c[1], used | c[2], n + c[0], chosen, limit)
            chosen.pop()

    dfs(0, 0, 0, [], 26)
    if best[1] is None:
        return None
    # count alternative routes within a few letters of the best
    found = set()
    def count(cov, used, n, chosen, limit):
        if len(found) >= cap_routes:
            return
        if cov == full:
            found.add(frozenset(chosen)); return
        i = next(i for i in range(5) if not cov >> i & 1)
        for c in by_prompt[i]:
            if n + c[0] > limit or len(found) >= cap_routes:
                break
            if c[2] & used:
                continue
            chosen.append(c[3]); count(cov | c[1], used | c[2], n + c[0], chosen, limit); chosen.pop()
    count(0, 0, 0, [], best[0] + 4)
    dd = any(bin(c[1]).count("1") >= 2 for c in cands)
    return dict(letters=best[0], route=best[1], routes=len(found), double=dd)

def score_for(letters): return 500 + 5 * (26 - letters)

rng = random.Random(args.seed)
used_sets = set()
usage = {c: 0 for c in CID}

def pick_set(avoid_recent=()):
    for _ in range(4000):
        pool = sorted(CID, key=lambda c: (usage[c] + rng.random() * 3))
        chosen = []
        for c in pool:
            if c in avoid_recent:
                continue
            if any(too_close(c, d) for d in chosen):
                continue
            groups = [x["group"] for x in cats if x["id"] in chosen + [c]]
            if max(groups.count(g) for g in groups) > 2:
                continue
            chosen.append(c)
            if len(chosen) == 5:
                break
        if len(chosen) < 5:
            continue
        key = frozenset(chosen)
        if key in used_sets:
            continue
        # needs at least one pair with real shared words (Double Duty)
        shared = max(len(members[a] & members[b]) for a, b in itertools.combinations(chosen, 2))
        if shared < 3:
            continue
        res = solve(chosen)
        if not res or not res["double"]:
            continue
        par = score_for(res["letters"])
        if res["routes"] < 3 or par > 595 or par < 530:
            continue
        used_sets.add(key)
        for c in chosen:
            usage[c] += 1
        rng.shuffle(chosen)
        return dict(prompts=chosen, par=par, route=res["route"], routes=res["routes"])
    raise SystemExit("could not build a puzzle; loosen the rules")

# ---- daily schedule (keep anything already published) ----
existing = {}
if os.path.exists(P("data", "puzzles.json")):
    existing = json.load(open(P("data", "puzzles.json")))
for v in existing.values():
    used_sets.add(frozenset(v["prompts"]))
    for c in v["prompts"]:
        usage[c] += 1

start = datetime.date.fromisoformat(args.start)
daily = dict(existing)
recent = []
for i in range(args.days):
    d = (start + datetime.timedelta(days=i)).isoformat()
    if d in daily:
        recent = daily[d]["prompts"]; continue
    p = pick_set(avoid_recent=set(recent))
    p["number"] = i + 1
    daily[d] = p
    recent = p["prompts"]
    print(d, f"#{p['number']:>3}", p["par"], p["routes"], p["prompts"], "->", " / ".join(p["route"]), file=sys.stderr)

practice = []
for i in range(args.practice):
    practice.append(pick_set())

json.dump(dict(sorted(daily.items())), open(P("data", "puzzles.json"), "w"), indent=1)
json.dump(practice, open(P("data", "practice.json"), "w"), indent=1)
pars = [v["par"] for v in daily.values()]
print(f"daily: {len(daily)}  practice: {len(practice)}  par range {min(pars)}-{max(pars)}  avg {sum(pars)/len(pars):.0f}")
