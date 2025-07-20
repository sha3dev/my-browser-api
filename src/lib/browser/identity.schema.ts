/**
 * imports: external
 */

import { z } from "zod";

/**
 * Schema
 */

const PlatformSchema = z.object({
  platform: z.enum(["reddit", "x", "product_hunt", "indie_hackers", "blogger"]),
  username: z.string(),
  password: z.string(),
});

export const IdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
  communication_style: z.string(),
  tone: z.string(),
  bio: z.string(),
  interests: z.array(z.string()),
  platforms: z.array(PlatformSchema).optional(),
});

/**
 * Type
 */

export type Identity = z.infer<typeof IdentitySchema>;
