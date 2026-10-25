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
ap.add_argument("--start", default="2026-11-01")
ap.add_argument("--days", type=int, default=90)
ap.add_argument("--practice", type=int, default=60)
ap.add_argument("--seed", type=int, default=2026)
ap.add_argument("--resolve", action="store_true", help="re-solve existing puzzles after the word list changes")
args = ap.parse_args()

data = json.load(open(P("data", "words.json")))
cats = json.load(open(P("data", "categories.json")))
CID = [c["id"] for c in cats]
# Par and the puzzle checks use the hand-written everyday answers only (tools/everyday.json),
# so a puzzle's best route never depends on an obscure meaning. The game accepts everything.
_every = json.load(open(P("tools", "everyday.json")))
assert _every["categories"] == data["categories"], "run tools/build_words.py first"
WORDS = {k: (tags, data["words"][k][1] if k in data["words"] and len(data["words"][k]) > 1 else [])
         for k, tags in _every["words"].items()}  # key -> ([tag idx], [variants])

# Parent/child categories never appear together (Double Duty would be automatic).
PARENTS = {
    "animal": {"pet", "farm_animal", "sea_creature", "bird", "bug", "zoo_animal"},
    "food": {"fruit", "vegetable", "dessert", "breakfast", "snack", "pizza_topping"},
    "clothing": {"headwear", "footwear", "accessory"},
    "flies": {"bird"},
}

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

members = {c: set() for c in CID}
for k, (tags, variants) in WORDS.items():
    if not common(k):
        continue  # puzzle-building checks only count everyday words
    for t in tags:
        members[CID[t]].add(k)



MIN_ROUTES = 25

def solve(prompts, cap_routes=200):
    """Best zero-borrow solution: cover all prompts, letter-disjoint words, fewest letters."""
    idx = {p: i for i, p in enumerate(prompts)}
    cands = []
    for k, (tags, variants) in WORDS.items():
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
    count(0, 0, 0, [], best[0] + 6)
    dd = any(bin(c[1]).count("1") >= 2 for c in cands)
    per_prompt = min(len(b) for b in by_prompt)
    return dict(letters=best[0], route=best[1], routes=len(found), double=dd,
                per_prompt=per_prompt, cands=cands)

def simulate(cands, runs=200, rng=None):
    """Play the puzzle with everyday players who pick a random common word that fits an
    open prompt, avoiding borrows when they can. Returns (finish rate, finish rate with no borrows)."""
    rng = rng or random.Random(7)
    full = (1 << 5) - 1
    ok = clean = 0
    for _ in range(runs):
        cov = used = 0
        borrows = 0
        while cov != full:
            open_i = [i for i in range(5) if not cov >> i & 1]
            target = rng.choice(open_i)
            fits = [c for c in cands if c[1] >> target & 1]
            free = [c for c in fits if not c[2] & used]
            if free:
                # everyday players reach for a fairly short, obvious word, not the longest one
                free.sort(key=lambda c: c[0])
                c = rng.choice(free[: max(5, int(len(free) * 0.4))])
            else:
                left = 3 - borrows
                pool = [c for c in fits if popc(c[2] & used) <= left]
                if not pool:
                    # try any other open prompt before giving up
                    others = [c for c in cands if c[1] & ~cov & full and popc(c[2] & used) <= left]
                    if not others:
                        break
                    pool = others
                need = min(popc(c[2] & used) for c in pool)
                c = rng.choice([c for c in pool if popc(c[2] & used) == need])
                borrows += popc(c[2] & used)
            cov |= c[1]
            used |= c[2]
        if cov == full:
            ok += 1
            clean += borrows == 0
    return ok / runs, clean / runs

def score_for(letters): return 500 + 5 * (26 - letters)

rng = random.Random(args.seed)
used_sets = set()
usage = {c: 0 for c in CID}

def pick_set(avoid_recent=()):
    for attempt in range(4000):
        # favour categories used least so far, but loosen up if that keeps failing
        spread = 3 + attempt / 25
        pool = sorted(CID, key=lambda c: (usage[c] + rng.random() * spread))
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
        p = evaluate(chosen)
        if not p:
            continue
        used_sets.add(key)
        for c in chosen:
            usage[c] += 1
        rng.shuffle(chosen)
        p["prompts"] = chosen
        return p
    raise SystemExit("could not build a puzzle; loosen the rules")

def evaluate(chosen):
    """Solve a set of prompts and check it's a fair, varied puzzle. Returns the puzzle data or None."""
    res = solve(chosen)
    if not res or not res["double"]:
        return None
    par = score_for(res["letters"])
    # plenty of ways through: 40+ common answers per prompt, 25+ near-best routes
    if res["routes"] < MIN_ROUTES or res["per_prompt"] < 40 or par > 595 or par < 530:
        return None
    finish, clean = simulate(res["cands"], rng=random.Random(7))
    if finish < 0.95:  # 95%+ of everyday players finish even without using undo
        return None
    return dict(prompts=list(chosen), par=par, route=res["route"], routes=res["routes"],
                finishRate=round(finish, 3), cleanRate=round(clean, 3))

# ---- daily schedule (keep anything already published) ----
existing = {}
if os.path.exists(P("data", "puzzles.json")):
    existing = json.load(open(P("data", "puzzles.json")))
if args.resolve:
    # the word list changed: re-solve every scheduled puzzle (same prompts, same order)
    fixed = {}
    for d, v in sorted(existing.items()):
        p = evaluate(v["prompts"])
        if p:
            p["prompts"] = v["prompts"]; p["number"] = v["number"]
            fixed[d] = p
        else:
            print(d, "no longer passes the checks; it will be replaced", file=sys.stderr)
    existing = fixed
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
    print(d, f"#{p['number']:>3}", p["par"], p["routes"], p["finishRate"], p["cleanRate"], p["prompts"], "->", " / ".join(p["route"]), file=sys.stderr)

practice = []
if args.resolve and os.path.exists(P("data", "practice.json")):
    for v in json.load(open(P("data", "practice.json")))[: args.practice]:
        p = evaluate(v["prompts"])
        if p:
            p["prompts"] = v["prompts"]
            practice.append(p)
while len(practice) < args.practice:
    practice.append(pick_set())

json.dump(dict(sorted(daily.items())), open(P("data", "puzzles.json"), "w"), indent=1)
json.dump(practice, open(P("data", "practice.json"), "w"), indent=1)
pars = [v["par"] for v in daily.values()]
if pars:
    print(f"daily: {len(daily)}  practice: {len(practice)}  par range {min(pars)}-{max(pars)}  avg {sum(pars)/len(pars):.0f}")
    allp = list(daily.values()) + practice
    print(f"fewest routes: {min(p['routes'] for p in allp)}  lowest finish rate: {min(p.get('finishRate', 1) for p in allp)}  lowest no-borrow finish rate: {min(p.get('cleanRate', 1) for p in allp)}")
