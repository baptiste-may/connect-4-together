import { useGameData } from "@/components/Game";
import { Badge } from "react-daisyui";

export default function SpectatorList() {
  const { getName, spectators } = useGameData();

  return (
    <div className="grid w-full grid-cols-2 gap-4">
      {[...spectators].map((id) => (
        <Badge key={id} color="neutral" size="lg" className="h-8 w-full">
          {getName(id)}
        </Badge>
      ))}
    </div>
  );
}
