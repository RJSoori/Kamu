"use client";

export function DeleteMenuItemButton({
  action,
  itemName,
}: {
  action: () => Promise<void>;
  itemName: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${itemName}" from your menu?`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm font-medium text-rose-600 transition hover:text-rose-800"
      >
        Delete
      </button>
    </form>
  );
}
