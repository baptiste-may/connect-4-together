import { useEffect, useRef, useState } from "react";
import { useGameData } from "@/components/Game";
import { Button, Card, ChatBubble, Input, Join } from "react-daisyui";
import { MessageCircle, Send } from "lucide-react";

export default function Chat() {
  const { room, getName, chatMessages } = useGameData();

  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current)
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
  }, [chatMessages]);

  return (
    <Card className="h-96 grow rounded-none bg-base-200 lg:rounded-lg">
      <Card.Body className="overflow-y-auto">
        <Card.Title>
          <MessageCircle strokeWidth={3} />
          Chat
        </Card.Title>
        <div
          className="flex grow flex-col gap-2 overflow-y-scroll"
          ref={chatEndRef}
        >
          {chatMessages.map(({ content, author }, index) => (
            <ChatBubble key={index}>
              <ChatBubble.Header>{getName(author)}</ChatBubble.Header>
              <ChatBubble.Message>{content}</ChatBubble.Message>
            </ChatBubble>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue === "") return;
            room.send("send-message", inputValue);
            setInputValue("");
          }}
        >
          <Join>
            <Input
              type="text"
              placeholder="Type here"
              className="join-item w-full max-w-xs"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Button
              type="submit"
              shape="square"
              color="neutral"
              className="join-item"
            >
              <Send className="h-4 w-4 opacity-70" />
            </Button>
          </Join>
        </form>
      </Card.Body>
    </Card>
  );
}
