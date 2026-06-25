import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import type { MusicCatalogTab } from "../model";

const tabOptions: Array<{ id: MusicCatalogTab; label: string; icon: "music" | "user" | "image" }> =
  [
    { id: "songs", label: "歌曲", icon: "music" },
    { id: "artists", label: "歌手", icon: "user" },
    { id: "albums", label: "专辑", icon: "image" },
  ];

interface MusicPageHeaderProps {
  activeTab: MusicCatalogTab;
  onTabChange: (tab: MusicCatalogTab) => void;
  onCreateSong: () => void;
  onCreateArtist: () => void;
  onCreateAlbum: () => void;
}

export function MusicPageHeader({
  activeTab,
  onTabChange,
  onCreateSong,
  onCreateArtist,
  onCreateAlbum,
}: MusicPageHeaderProps) {
  const createLabel =
    activeTab === "songs" ? "新建音乐" : activeTab === "artists" ? "新建歌手" : "新建专辑";
  const createAction =
    activeTab === "songs" ? onCreateSong : activeTab === "artists" ? onCreateArtist : onCreateAlbum;

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
            音乐管理
          </h2>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            维护歌曲、歌手、专辑和上传资源，供前台音乐库与文章背景音乐使用。
          </p>
        </div>
        <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={createAction}>
          <SvgIcon name="plus" size={15} />
          {createLabel}
        </Button>
      </section>

      <nav
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1"
        aria-label="音乐管理分组"
      >
        {tabOptions.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            className="shrink-0"
            onPress={() => onTabChange(tab.id)}
          >
            <SvgIcon name={tab.icon} size={14} />
            {tab.label}
          </Button>
        ))}
      </nav>
    </>
  );
}
