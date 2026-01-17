---
name: kksrules
description: Enforce karyana store business logic while preserving the existing mattress website UI
---

# Overview

This project represents a **karyana (grocery) store system**, even though the current UI design is based on a **mattress retail website**.

## Core Rule

- All **business logic, data models, features, and content** must be implemented in the **context of a karyana store**.
- The **existing UI layout, structure, and styling must not be changed**.

## UI Constraints

- Do **not** modify:
  - Layout
  - Components
  - Styling
  - Colors
  - Design structure

- Allowed changes:
  - Text labels
  - Placeholder text
  - Static content
  - Data shown inside existing UI elements

## Feature Implementation Guidelines

- Any new feature must conceptually represent **karyana store operations**, such as:
  - Grocery items (rice, flour, oil, pulses, snacks, beverages, etc.)
  - Inventory and stock levels
  - Supplier purchases
  - Retail pricing and discounts
  - Daily sales and customer orders

- Even if a UI element visually looks like it belongs to a mattress website, it must be **mapped logically** to a karyana store concept.

## Content Mapping Rule

- Visual elements remain unchanged.
- Only the **meaning and text** of the content adapts to the karyana store domain.

## Scope

This rule applies to:
- Frontend text and content
- Backend logic and APIs
- Database schema
- Documentation and examples

Any implementation that changes the UI design or introduces non-karyana business logic is considered incorrect.
