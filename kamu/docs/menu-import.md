# Menu import (read a menu photo)

On an owner's **Menu** page, **Add dishes from a photo**: the owner uploads a
photo of their printed menu, Kamu reads it, and shows each dish as **new**
or **price change** (dishes already saved at the same price are skipped).
The owner fixes anything misread, unticks what's wrong, and clicks **Add
ticked dishes**. Nothing is saved before that.

## Why a workflow, not an agent

The steps never change: read the photo, compare with the saved menu. There's
nothing to decide, so one Gemini call does it, and plain code does the rest.
An agent would add cost and unpredictability for no gain.

## How it works

1. `PhotoUploadField` uploads the photo into the owner's own storage folder
   (`owners/<uid>/`), like any listing photo.
2. `readMenuPhotoAction` (`kamu_restaurants/src/app/dashboard/restaurants/ai-actions.ts`)
   checks the photo is in that folder and calls the `menu-import` Edge Function
   with its storage path.
3. `menu-import` (`supabase/functions/menu-import/`) checks the caller is an
   active owner of that restaurant, counts one use against the daily limit,
   downloads the photo and sends it to Gemini (**multimodal**: image in, text
   out) with a JSON schema (**structured output**: Gemini can only reply in
   that shape).
4. `menu.ts` cleans the reply like user input (same limits as the menu form)
   and compares it with the saved menu by name ("Chicken  Kottu!" = "chicken
   kottu"). Tested in `menu.test.ts`.
5. `saveImportedMenuAction` saves only the ticked rows: new dishes through the
   same parser as the "Add an item" form, matched dishes get only their price
   updated (their photo and description are kept).

## Safety and limits

- The function accepts only `owners/<caller's uid>/<uuid>.jpg|png|webp`, never
  a URL, so it can't be pointed at anyone else's photo or another website.
- 10 photos per owner per 24 hours (`owner_ai_usage`), to protect the free
  Gemini quota.
- Text printed on the photo is treated as data. The worst a strange photo can
  do is fill the review list with junk the owner then unticks.
- Uploaded menu photos stay in the owner's folder (not deleted after reading).

## Setup

```bash
npx supabase db push --remote                     # owner_ai_usage, coach_sessions
npx supabase functions deploy menu-import
node --experimental-strip-types --test supabase/functions/menu-import/menu.test.ts
```
