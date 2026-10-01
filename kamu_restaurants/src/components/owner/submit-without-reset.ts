import { startTransition } from "react";

/**
 * React resets a <form action={...}>'s uncontrolled fields after every
 * submission -- including ones that come back with a validation error,
 * which would wipe everything the owner typed. Submitting through onSubmit
 * + startTransition keeps their input.
 */
export function submitWithoutReset(
  event: React.FormEvent<HTMLFormElement>,
  formAction: (formData: FormData) => void,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  startTransition(() => formAction(formData));
}
