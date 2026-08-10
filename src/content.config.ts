import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const photos = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/photos" }),
  schema: z.object({
    title: z.string().default(""),
    image: z.string(),
    src: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    favorite: z.boolean().default(false),
    rating: z.number().optional(),
    pin: z
      .object({
        title: z.string(),
        description: z.string(),
        board: z.string(),
        url: z.string(),
        pinned: z.coerce.date(),
      })
      .optional(),
  }),
});

export const collections = { photos };
