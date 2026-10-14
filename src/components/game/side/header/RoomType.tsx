import { useGameData } from "@/components/Game";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "react-daisyui";
import { useAnalytics } from "@/libs/analytics";

export default function RoomType() {
  const { room, isPrivate, host } = useGameData();
  const { event } = useAnalytics();

  return (
    <h1 className="card-title">
      <span>{`Type: ${room.name}`}</span>
      {host === room.sessionId ? (
        <Button
          color={isPrivate ? "warning" : "success"}
          shape="square"
          size="sm"
          onClick={() => {
            event("toggle-lock", { locked: !isPrivate });
            room.send("set-lock", !isPrivate);
          }}
        >
          {isPrivate ? <Lock /> : <LockOpen />}
        </Button>
      ) : undefined}
    </h1>
  );
}
