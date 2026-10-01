import type { OwnerStatus } from "@/lib/owner-status";

/**
 * Explains the owner's verification status (set by Kamu admins, see
 * ../kamu/docs/owner-verification-and-reports.md). Approved owners get no
 * banner -- nothing for them to act on.
 */
export function StatusBanner({
  status,
  note,
}: {
  status: OwnerStatus;
  note: string | null;
}) {
  if (status === "approved") {
    return null;
  }

  if (status === "pending") {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Your account is waiting for verification</p>
        <p className="mt-1">
          The Kamu team checks every new restaurant owner once before their
          listings go live. You can set up your restaurant and menu now;
          anything you publish appears on Kamu as soon as you&apos;re
          verified.
        </p>
        {note ? <p className="mt-2 italic">Note from Kamu: {note}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <p className="font-semibold">
        {status === "rejected"
          ? "Your owner account wasn't approved"
          : "Your owner account is suspended"}
      </p>
      {note ? <p className="mt-1">Note from Kamu: {note}</p> : null}
      <p className="mt-1">
        Your listings aren&apos;t visible to customers and can&apos;t be
        edited right now. Contact the Kamu team if you think this is a
        mistake.
      </p>
    </div>
  );
}
