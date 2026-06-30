import type { MusicAlbumResp, MusicArtistResp } from "@repo/api";
import { MusicAlbumFormDialog } from "./MusicAlbumFormDialog";
import { MusicArtistFormDialog } from "./MusicArtistFormDialog";
import { MusicSongFormDialog } from "./MusicSongFormDialog";
import type {
  MusicAlbumFormValues,
  MusicArtistFormValues,
  MusicFormValues,
  MusicRow,
  MusicUploadValue,
} from "../model";

type FormMode = "create" | "edit";

interface MusicPageDialogsProps {
  songMode: FormMode;
  artistMode: FormMode;
  albumMode: FormMode;
  songOpen: boolean;
  artistOpen: boolean;
  albumOpen: boolean;
  editingSong: MusicRow | null;
  editingArtist: MusicArtistResp | null;
  editingAlbum: MusicAlbumResp | null;
  artists: MusicArtistResp[];
  albums: MusicAlbumResp[];
  nextSeq: number;
  isSubmitting: boolean;
  onCloseSong: () => void;
  onCloseArtist: () => void;
  onCloseAlbum: () => void;
  onUploadAudio: (file: File) => Promise<MusicUploadValue>;
  onUploadArtistAvatar: (file: File) => Promise<MusicUploadValue>;
  onUploadAlbumCover: (file: File) => Promise<MusicUploadValue>;
  onSubmitSong: (values: MusicFormValues, mode: FormMode, id?: string) => Promise<void>;
  onSubmitArtist: (values: MusicArtistFormValues, mode: FormMode, id?: number) => Promise<void>;
  onSubmitAlbum: (values: MusicAlbumFormValues, mode: FormMode, id?: number) => Promise<void>;
}

export function MusicPageDialogs({
  songMode,
  artistMode,
  albumMode,
  songOpen,
  artistOpen,
  albumOpen,
  editingSong,
  editingArtist,
  editingAlbum,
  artists,
  albums,
  nextSeq,
  isSubmitting,
  onCloseSong,
  onCloseArtist,
  onCloseAlbum,
  onUploadAudio,
  onUploadArtistAvatar,
  onUploadAlbumCover,
  onSubmitSong,
  onSubmitArtist,
  onSubmitAlbum,
}: MusicPageDialogsProps) {
  return (
    <>
      <MusicSongFormDialog
        mode={songMode}
        open={songOpen}
        row={editingSong}
        artists={artists}
        albums={albums}
        nextSeq={nextSeq}
        isSubmitting={isSubmitting}
        onClose={onCloseSong}
        onUploadAudio={onUploadAudio}
        onSubmit={onSubmitSong}
      />
      <MusicArtistFormDialog
        mode={artistMode}
        open={artistOpen}
        artist={editingArtist}
        isSubmitting={isSubmitting}
        onClose={onCloseArtist}
        onUploadAvatar={onUploadArtistAvatar}
        onSubmit={onSubmitArtist}
      />
      <MusicAlbumFormDialog
        mode={albumMode}
        open={albumOpen}
        album={editingAlbum}
        artists={artists}
        isSubmitting={isSubmitting}
        onClose={onCloseAlbum}
        onUploadCover={onUploadAlbumCover}
        onSubmit={onSubmitAlbum}
      />
    </>
  );
}
