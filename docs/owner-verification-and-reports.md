# Owner verification & customer reports: admin portal contract

This describes the database side of restaurant-owner moderation, for whoever
builds the admin portal. Everything here already exists in the DB
([migration](../supabase/migrations/20261001120000_owner_verification_and_reports.sql),
[tests](../supabase/tests/database/owner_verification.test.sql)). The admin
portal only needs to read and update these tables as a signed-in admin. No
service-role key and no extra endpoints are needed.

"Admin" means the signed-in user has a row in `admin_users` (checked by
`is_admin()`), same as the existing `/admin` panel.

## The model

1. A restaurant owner registers in the owner portal (`../kamu_restaurants`).
   Their `restaurant_owners` row starts as **`pending`**.
2. While pending they can already create their listing and menu, but
   **nothing they own is visible to customers**, even if they mark it
   published.
3. An admin verifies the account once: **`approved`**. From then on the
   owner posts freely and their published listings are live immediately.
   There's no per-edit review.
4. Customers can **report** a restaurant or a single menu item
   (`content_reports`). Admins work the report queue and can:
   - hide one restaurant or menu item (`hidden_by_admin`), or
   - suspend the owner (`status = 'suspended'`), which hides everything they
     own and makes them read-only.

## `restaurant_owners`

| Column | Meaning |
|---|---|
| `id` | = `auth.users.id` |
| `email`, `display_name`, `phone` | From registration. Use these to contact the owner when verifying. |
| `status` | `pending` / `approved` / `rejected` / `suspended` |
| `status_note` | **Shown to the owner on their dashboard.** Explain rejections and suspensions here. |
| `status_changed_at`, `status_changed_by` | Set automatically by a trigger whenever an admin changes `status`. Don't set them yourself. |
| `created_at` | Registration time |

What each status does:

| Status | Owner's listings public? | Owner can edit? |
|---|---|---|
| `pending` | No | Yes (drafting) |
| `approved` | Yes, if published and not hidden | Yes |
| `rejected` | No | No (read-only) |
| `suspended` | No | No (read-only) |

Only admins can change `status`, `status_note` or `email`. A trigger silently
keeps the old values if an owner tries.

### Verification queue

```ts
// Pending owners, oldest first, with whatever they've drafted so far
const { data } = await supabase
  .from("restaurant_owners")
  .select("id, email, display_name, phone, created_at, restaurants(id, name, area, address, is_published)")
  .eq("status", "pending")
  .order("created_at", { ascending: true });
```

The admin's session can read every owner and every restaurant, drafts
included. The embedded `restaurants(...)` select works through
`restaurants.owner_id`.

### Approve / reject / suspend

```ts
await supabase
  .from("restaurant_owners")
  .update({ status: "approved", status_note: null })
  .eq("id", ownerId);

await supabase
  .from("restaurant_owners")
  .update({ status: "rejected", status_note: "We couldn't confirm this restaurant exists. Reply to our email with a photo of the shopfront." })
  .eq("id", ownerId);

await supabase
  .from("restaurant_owners")
  .update({ status: "suspended", status_note: "Several listings were reported as fake." })
  .eq("id", ownerId);
```

Approving takes effect immediately. The owner's published listings appear on
the customer site on the next request.

> **Suspend, don't delete.** Deleting a `restaurant_owners` row sets
> `restaurants.owner_id` to null on their listings (deliberately, so customer
> reviews and bucket lists survive). An owner-less listing is treated as an
> admin-managed one, so if it's published it becomes **public again**. To
> remove a bad actor, suspend them. To remove a listing, delete or hide it.

## Hiding individual content

`restaurants` and `menu_items` both have:

| Column | Meaning |
|---|---|
| `hidden_by_admin` | `true` = not shown to customers, regardless of `is_published` |
| `moderation_note` | **Shown to the owner** next to the hidden item |

```ts
await supabase
  .from("menu_items")
  .update({ hidden_by_admin: true, moderation_note: "Photo doesn't match the dish. Please replace it." })
  .eq("id", menuItemId);
```

Owners can't clear `hidden_by_admin` or `moderation_note` (a trigger keeps the
old values), so a takedown can't be undone just by re-publishing. To restore
the item, set `hidden_by_admin: false, moderation_note: null`.

Hiding a restaurant also hides its menu items and reviews from customers.

## `content_reports`

| Column | Meaning |
|---|---|
| `reporter_id` | The customer who reported (auth user id). Never shown to owners. |
| `restaurant_id` | Always set |
| `menu_item_id` | Set when the report is about one menu item; null = about the listing itself |
| `reason` | `inaccurate` / `offensive` / `spam` / `impersonation` / `closed` (permanently closed) / `other` |
| `details` | Free text from the customer (≤ 2000 chars), may be null |
| `status` | `open` → `reviewing` → `resolved` / `dismissed` |
| `admin_notes` | Internal notes. Not shown to anyone but admins. |
| `resolved_at`, `resolved_by` | Set automatically when status becomes `resolved` or `dismissed` |

Guarantees from the DB:
- Only signed-in users can report, only about content they can currently see,
  and a new report is always `open`.
- One customer can have only one `open` or `reviewing` report per target, so
  the queue can't be flooded by one person.
- Reporters can read their own reports. Owners can't read any reports.
  Only admins can update or delete.

### Report queue

```ts
// Open reports, newest first, with what they're about
const { data } = await supabase
  .from("content_reports")
  .select(`
    id, reason, details, status, created_at,
    restaurant:restaurants(id, name, owner_id, hidden_by_admin),
    menu_item:menu_items(id, item_name, hidden_by_admin)
  `)
  .in("status", ["open", "reviewing"])
  .order("created_at", { ascending: false });
```

```sql
-- Most-reported restaurants (open reports only), for spotting bad actors
select r.id, r.name, r.owner_id, count(*) as open_reports
from content_reports cr
join restaurants r on r.id = cr.restaurant_id
where cr.status in ('open', 'reviewing')
group by r.id, r.name, r.owner_id
order by open_reports desc;
```

### Closing a report

```ts
await supabase
  .from("content_reports")
  .update({ status: "resolved", admin_notes: "Hid the menu item; owner notified." })
  .eq("id", reportId);
```

Closing a report doesn't change the reported content. Hide it or suspend the
owner as a separate step if needed.

## What's not built yet

- **The customer-side "Report" button** (in `kamu`). Insert into
  `content_reports` as the signed-in customer:
  `{ restaurant_id, menu_item_id?, reason, details? }`. `reporter_id` and
  `status` default correctly.
- **Owner notifications** (emails on approval, rejection or takedown). For
  now the owner sees `status_note` and `moderation_note` the next time they
  open their dashboard.
