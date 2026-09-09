// `Supabase` is a global injected by the Supabase Edge Runtime (Deno) --
// not an import. Available in every deployed Edge Function without any
// extra setup or API key: gte-small runs in-process via ONNX, so there's no
// external API call and no cost per embedding.
// deno-lint-ignore no-explicit-any
declare const Supabase: any;

const session = new Supabase.ai.Session("gte-small");

/**
 * 384-dim embedding, mean-pooled and L2-normalized. Must stay gte-small --
 * restaurants.vibe_embedding is declared `vector(384)` specifically to match
 * this model's output size (see the foundations migration). Swapping models
 * means a new column size and re-embedding every restaurant.
 */
export async function embedText(text: string): Promise<number[]> {
  const output = await session.run(text, {
    mean_pool: true,
    normalize: true,
  });
  return Array.from(output as Iterable<number>);
}
