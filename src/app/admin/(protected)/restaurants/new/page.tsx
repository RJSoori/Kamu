import { RestaurantForm } from "@/components/admin/RestaurantForm";
import { createRestaurantAction } from "../actions";

export default function NewRestaurantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Add restaurant</h1>
      <RestaurantForm action={createRestaurantAction} submitLabel="Create restaurant" />
    </div>
  );
}
