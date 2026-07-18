import re, os, glob

base = "app/[locale]/(dashboard)"
patterns = [
  "sales/reports/*/page.tsx",
  "purchase/reports/*/page.tsx",
  "inventory/products/reports/*/page.tsx",
  "cash-bank/reports/*/page.tsx",
  "assets/reports/*/page.tsx",
  "budgeting/reports/*/page.tsx",
  "production/reports/*/page.tsx",
  "hr/reports/page.tsx",
  "accounting/reports/tax-summary/page.tsx",
  "accounting/reports/validation/page.tsx",
]
for pat in patterns:
  for path in sorted(glob.glob(os.path.join(base, pat))):
    with open(path) as f:
      content = f.read()
    heads = re.findall(r"<TableHead[^>]*>(.*?)</TableHead>", content, re.S)
    heads = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h)).strip() for h in heads]
    fields = sorted(set(re.findall(r"item\.(\w+)", content)))
    print(f"\n=== {path} ===")
    print("heads:", heads[:25])
    print("item fields:", fields)
    # filters state
    states = re.findall(r"useState\(\s*\n?\s*new Date", content)
    print("has date state:", len(states) > 0)
    # data var
    m = re.search(r"data:\s*(\w+)", content)
    print("data var:", m.group(1) if m else None)
