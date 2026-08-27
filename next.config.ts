import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
