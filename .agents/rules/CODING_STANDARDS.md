---
trigger: always_on
---

# Pirca Project Rules (AI Coding Standards)

## 1. Style and Syntax (Mandatory)

- **Arrow Functions:** It is strictly prohibited to use classic function declarations (`function name() { ... }`). Instead, all functions, exported methods, and _callbacks_ must be written purely using ES6 _Arrow Functions_:
  ✅ Correct: `export const myFunction = async () => { ... }`
  ❌ Incorrect: `export async function myFunction() { ... }`

## 2. Typing and Architecture

- Always use strong, modern **TypeScript**.
- Follow the imposed **Clean Architecture** structure, where `index.ts` must always be kept under 20 lines, limited strictly to executing orchestrators, without containing heavy mathematical logic or AI prompt formatting.
