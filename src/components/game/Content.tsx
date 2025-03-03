import Grid from "@/components/game/content/Grid";

export default function Content() {
    return (
        <div
            className="flex items-center justify-center pt-0 md:pt-24 lg:pt-12 px-4 lg:pr-0 aspect-[7/6] w-full h-full overflow-y-auto">
            <Grid/>
        </div>
    );
}