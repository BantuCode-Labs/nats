#!/usr/bin/env python3
from pathlib import Path
import re

count = 0
for path in Path("app").rglob("**/reports/**/*.tsx"):
    c = path.read_text()
    orig = c
    # Fix casts that lack unknown intermediate
    c = re.sub(
        r"\(([^()\n]*report[^()\n]*)\) as Array<Record<string, unknown>>",
        r"(\1) as unknown as Array<Record<string, unknown>>",
        c,
    )
    # Fix badly indented ReportExportButton after flex gap-2
    c = c.replace(
        '          <div className="flex items-center gap-2">\n                        <ReportExportButton\n',
        '          <div className="flex items-center gap-2">\n            <ReportExportButton\n',
    )
    c = c.replace(
        "            />\n<Button variant=\"outline\" onClick={() => window.print()}>",
        "            />\n            <Button variant=\"outline\" onClick={() => window.print()}>",
    )
    if c != orig:
        path.write_text(c)
        count += 1
        print("fixed", path)
print("files fixed:", count)
