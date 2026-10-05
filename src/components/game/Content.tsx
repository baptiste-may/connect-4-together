import Grid from "@/components/game/content/Grid";

export default function Content() {
  return (
    <div className="flex aspect-[7/6] h-full w-full items-center justify-center overflow-y-auto px-4 pt-0 md:pt-24 lg:pr-0 lg:pt-12">
      <Grid />
    </div>
  );
}
