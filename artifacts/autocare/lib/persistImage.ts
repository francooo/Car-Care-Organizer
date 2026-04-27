import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const PHOTOS_SUBDIR = "vehicle-photos";

function getPhotosDir(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_SUBDIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function inferExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  if (match && match[1]) return match[1].toLowerCase();
  return "jpg";
}

export async function persistPickedImage(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    return uri;
  }

  if (uri.startsWith("data:") || uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  try {
    const dir = getPhotosDir();
    const ext = inferExtension(uri);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const source = new File(uri);
    const destination = new File(dir, filename);
    source.copy(destination);
    return destination.uri;
  } catch (err) {
    console.warn("[persistPickedImage] failed to persist image, using original uri", err);
    return uri;
  }
}
