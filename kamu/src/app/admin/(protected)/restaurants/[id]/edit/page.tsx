import { notFound } from "next/navigation";
import { RestaurantForm } from "@/components/admin/RestaurantForm";
import { getRestaurantById } from "@/lib/data/restaurants";
import { updateRestaurantAction } from "../../actions";

export default async function EditRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = await getRestaurantById(id);

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Edit {restaurant.name}
      </h1>
      <RestaurantForm
        restaurant={restaurant}
        action={updateRestaurantAction.bind(null, id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
