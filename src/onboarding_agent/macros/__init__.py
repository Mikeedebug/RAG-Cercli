"""Recorded Playwright macros for each ActionKind.

Each macro is a plain function `run(page, params) -> dict` that returns
a result payload for the audit log. Keep them small and readable — a
new portal screen means a new macro, not a taller if-tree.
"""
