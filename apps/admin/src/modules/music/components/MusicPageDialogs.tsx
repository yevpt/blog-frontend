import type { MusicAlbumResp, MusicArtistResp } from "@repo/api";
import { MusicAlbumFormDialog } from "./MusicAlbumFormDialog";
import { MusicArtistFormDialog } from "./MusicArtistFormDialog";
import { MusicDeleteDialog } from "./MusicDeleteDialog";
import { MusicSongFormDialog } from "./MusicSongFormDialog";
import type {
  MusicAlbumFormValues,
  MusicArtistFormValues,
  MusicFormValues,
  MusicRow,
  MusicUploadValue,
} from "../model";

type FormMode = "create" | "edit";
export type MusicDeleteTarget =
  | { kind: "song"; row: MusicRow }
  | { kind: "artist"; artist: MusicArtistResp }
  | { kind: "album"; album: MusicAlbumResp };

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
  deleteTarget: MusicDeleteTarget | null;
  artists: MusicArtistResp[];
  albums: MusicAlbumResp[];
  nextSeq: number;
  isSubmitting: boolean;
  isDeleting: boolean;
  onCloseSong: () => void;
  onCloseArtist: () => void;
  onCloseAlbum: () => void;
  onCloseDelete: () => void;
  onUploadAudio: (file: File) => Promise<MusicUploadValue>;
  onUploadArtistAvatar: (file: File) => Promise<MusicUploadValue>;
  onUploadAlbumCover: (file: File) => Promise<MusicUploadValue>;
  onSubmitSong: (values: MusicFormValues, mode: FormMode, id?: string) => Promise<void>;
  onSubmitArtist: (values: MusicArtistFormValues, mode: FormMode, id?: number) => Promise<void>;
  onSubmitAlbum: (values: MusicAlbumFormValues, mode: FormMode, id?: number) => Promise<void>;
  onConfirmDelete: () => Promise<void>;
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
  deleteTarget,
  artists,
  albums,
  nextSeq,
  isSubmitting,
  isDeleting,
  onCloseSong,
  onCloseArtist,
  onCloseAlbum,
  onCloseDelete,
  onUploadAudio,
  onUploadArtistAvatar,
  onUploadAlbumCover,
  onSubmitSong,
  onSubmitArtist,
  onSubmitAlbum,
  onConfirmDelete,
}: MusicPageDialogsProps) {
  const deleteTitle =
    deleteTarget?.kind === "song"
      ? "删除音乐"
      : deleteTarget?.kind === "artist"
        ? "删除歌手"
        : "删除专辑";
  const deleteName =
    deleteTarget?.kind === "song"
      ? deleteTarget.row.name
      : deleteTarget?.kind === "artist"
        ? deleteTarget.artist.display_name
        : deleteTarget?.album.name;

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
      <MusicDeleteDialog
        title={deleteTitle}
        description={`确定删除“${deleteName ?? ""}”？删除后不会再出现在音乐资料库中。`}
        open={Boolean(deleteTarget)}
        isDeleting={isDeleting}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
