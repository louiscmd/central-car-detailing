import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  chatAttachment: f({
    image: { maxFileSize: "16MB", maxFileCount: 4 },
    video: { maxFileSize: "256MB", maxFileCount: 1 },
    audio: { maxFileSize: "32MB", maxFileCount: 1 },
    blob: { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
