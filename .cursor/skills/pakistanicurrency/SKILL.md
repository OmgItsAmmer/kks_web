---
name: pakistanicurrency
description: Enforce usage of Pakistani Rupees (PKR / Rs) for all monetary values in this project
---

# Overview

All monetary values in this project **must be represented in Pakistani Rupees**.

## Currency Rules

- The default and only currency is **PKR (Pakistani Rupees)**.
- Use the symbol **Rs** or the code **PKR** consistently.
- Do **not** use USD, EUR, GBP, or any other foreign currency unless explicitly stated.
- If conversions are required, they must:
  - Be converted to PKR
  - Clearly mention the exchange rate and date of conversion

## Formatting Guidelines

- Preferred format: `Rs 1,500` or `PKR 1,500`
- Do not use `$`, `€`, or foreign symbols.
- Always include thousand separators for readability.

## Scope

This rule applies to:
- Database fields
- API responses
- UI text
- Documentation
- Logs and reports

Any violation of this rule should be treated as incorrect implementation.
