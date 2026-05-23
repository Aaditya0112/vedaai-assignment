import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: filename, resource_type: "auto", overwrite: true },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}