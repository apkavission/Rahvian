import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    This project is its own workspace root.

    Turbopack otherwise walks up looking for a lockfile and finds one in the
    home directory, left there by an unrelated install. An inferred root that
    high means resolution and file watching cover everything under it.
  */
  turbopack: {
    root: __dirname,
  },

  /*
    Where the build output goes.

    `next dev` and `next build` both write to `.next`, so building while the dev
    server is running leaves it serving a half-replaced manifest — routes that
    exist start answering 404, and the obvious conclusion is that the routing is
    broken. It is not; it is two processes writing one directory.

    Default behaviour is unchanged. A verification build sets NEXT_DIST_DIR and
    lands somewhere the dev server is not reading.
  */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  experimental: {
    serverActions: {
      /*
        Raised for one thing: uploading to the media library.

        The default is 1MB, which is right for a form and wrong for a photograph
        — a 1200 × 800 JPEG off a decent camera clears it before anyone has done
        anything unusual. The upload action refuses anything over 8MB itself and
        says so in a sentence beside the field, which is the limit that is meant
        to be hit; this one exists so the request reaches that check instead of
        being cut off by the framework with no message anyone can act on.

        9MB rather than 8: the limit applies to the raw request body, and
        multipart encoding adds boundaries, part headers and field metadata on
        top of the file itself. Leaving no headroom would mean an 8MB file
        failing the framework's check before reaching ours.
      */
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;
