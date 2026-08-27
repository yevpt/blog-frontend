import { SvgIcon } from "@repo/icons";
import { Button, Tabs, TabsItem, TabsList } from "@repo/ui";
import { AdminPageHeader } from "../../../components/AdminPageHeader";
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
      <AdminPageHeader
        title="音乐管理"
        description="维护歌曲、歌手、专辑和上传资源，供前台音乐库与文章背景音乐使用。"
        action={
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onPress={createAction}>
            <SvgIcon name="plus" size={15} />
            {createLabel}
          </Button>
        }
      />

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => {
          const nextTab = tabOptions.find((tab) => tab.id === String(key));
          if (nextTab) onTabChange(nextTab.id);
        }}
        className="min-w-0 max-w-full"
      >
        <TabsList
          variant="underline"
          aria-label="音乐管理分组"
          className="w-full gap-6 border-border/70 px-1"
        >
          {tabOptions.map((tab) => (
            <TabsItem key={tab.id} id={tab.id} variant="underline">
              <span className="inline-flex items-center gap-1.5">
                <SvgIcon name={tab.icon} size={14} />
                {tab.label}
              </span>
            </TabsItem>
          ))}
        </TabsList>
      </Tabs>
    </>
  );
}
