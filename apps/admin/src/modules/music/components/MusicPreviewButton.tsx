import { MusicAudioPlayer } from "./MusicAudioPlayer";

interface MusicPreviewButtonProps {
  title: string;
  url?: string;
}

export function MusicPreviewButton({ title, url }: MusicPreviewButtonProps) {
  return <MusicAudioPlayer title={title} url={url} variant="compact" />;
}
