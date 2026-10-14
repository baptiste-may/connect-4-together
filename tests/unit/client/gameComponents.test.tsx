import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import Grid from "@/components/game/content/Grid";
import Info from "@/components/game/Info";
import Chat from "@/components/game/side/Chat";
import Header from "@/components/game/side/Header";
import RoomId from "@/components/game/side/header/RoomId";
import RoomType from "@/components/game/side/header/RoomType";
import SkipButton from "@/components/game/side/header/SkipButton";
import LeaveButton from "@/components/game/side/header/LeaveButton";
import PlayerList from "@/components/game/side/userList/PlayerList";
import SpectatorList from "@/components/game/side/userList/SpectatorList";
import { colors } from "@/components/game/colors";
import { makeGameData, renderWithGame } from "./harness";

describe("colors", () => {
  it("should list one class per player color when colors are provided", () => {
    expect(colors).toEqual(["red-600", "yellow-400", "green-600", "cyan-400"]);
  });
});

describe("Grid", () => {
  it("should paint every cell from the grid values when the grid is rendered", () => {
    const { data } = makeGameData({ nbPlayers: 2, isAPlayer: true });
    data.grid[0][0] = 0;
    data.grid[5][6] = 3;
    const { container } = renderWithGame(data, <Grid />);

    const cells = container.querySelectorAll(".rounded-full");
    expect(cells).toHaveLength(42);
    expect(cells[0].className).toContain("bg-red-600");
    expect(cells[41].className).toContain("bg-cyan-400");
    expect(cells[1].className).toContain("bg-base-100");
  });

  it("should highlight the landing cell when a playable column is hovered", () => {
    const { data } = makeGameData({
      nbPlayers: 2,
      isAPlayer: true,
      isYourTurn: true,
      yourColor: 0,
    });
    const { container } = renderWithGame(data, <Grid />);
    const overlay = container.querySelector(".absolute");
    expect(overlay).not.toBeNull();

    fireEvent.mouseOver(overlay!.children[2]);
    expect(container.querySelectorAll(".rounded-full")[37].className).toContain(
      "bg-red-600/75",
    );

    fireEvent.mouseOut(overlay!.children[2]);
    const cell = container.querySelectorAll(".rounded-full")[37];
    expect(cell.className).toContain("bg-base-100");
    expect(cell.className).not.toContain("/75");
  });

  it("should highlight the lowest free cell when the hovered column is partly filled", () => {
    const { data } = makeGameData({
      nbPlayers: 2,
      isAPlayer: true,
      isYourTurn: true,
      yourColor: 0,
    });
    data.grid[5][1] = 2;
    const { container } = renderWithGame(data, <Grid />);
    const overlay = container.querySelector(".absolute");

    fireEvent.mouseOver(overlay!.children[1]);

    expect(container.querySelectorAll(".rounded-full")[29].className).toContain(
      "bg-red-600/75",
    );
  });

  it("should not highlight any cell when the hovered column is full", () => {
    const { data } = makeGameData({
      nbPlayers: 2,
      isAPlayer: true,
      isYourTurn: true,
      yourColor: 0,
    });
    for (let row = 0; row < 6; row++) data.grid[row][3] = 1;
    const { container } = renderWithGame(data, <Grid />);
    const overlay = container.querySelector(".absolute");

    fireEvent.mouseOver(overlay!.children[3]);

    const highlighted = [...container.querySelectorAll(".rounded-full")].some(
      (cell) => cell.className.includes("/75"),
    );
    expect(highlighted).toBe(false);
  });

  it("should play a piece in the clicked column when a cell is clicked", () => {
    const { data, send } = makeGameData({
      nbPlayers: 2,
      isAPlayer: true,
      isYourTurn: true,
      yourColor: 0,
    });
    const { container } = renderWithGame(data, <Grid />);
    const overlay = container.querySelector(".absolute");

    fireEvent.click(overlay!.children[4]);

    expect(send).toHaveBeenCalledWith("play-piece", 4);
  });
});

describe("Header", () => {
  it("should assemble the room type, id and actions when a room is listed", () => {
    const { data } = makeGameData({
      players: ["s1", "", "", ""],
      nbPlayers: 1,
    });
    renderWithGame(data, <Header />);

    expect(screen.getByRole("heading")).toHaveTextContent("Type: Normal");
    expect(screen.getByText("ROOM01")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voter pour Reset" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Quitter la partie" }),
    ).toBeInTheDocument();
  });
});

describe("RoomId", () => {
  it("should blur the room id when it has not been revealed yet", () => {
    renderWithGame(makeGameData().data, <RoomId id="ROOM42" />);

    expect(screen.getByText("ROOM42")).toHaveClass("blur");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("ROOM42")).toHaveClass("blur-0");
  });
});

describe("RoomType", () => {
  it("should let the host toggle the room lock when the lock button is pressed", () => {
    const { data, send } = makeGameData({ isPrivate: true });
    renderWithGame(data, <RoomType />);

    expect(screen.getByRole("heading")).toHaveTextContent("Type: Normal");
    fireEvent.click(within(screen.getByRole("heading")).getByRole("button"));
    expect(send).toHaveBeenCalledWith("set-lock", false);
  });

  it("should hide the lock button when the player is not the host", () => {
    const { data } = makeGameData({ host: "someone-else" });
    renderWithGame(data, <RoomType />);

    expect(
      within(screen.getByRole("heading")).queryByRole("button"),
    ).not.toBeInTheDocument();
  });
});

describe("SkipButton", () => {
  it("should send the skip vote and show the tally when a seated player clicks the button", () => {
    const { data, send } = makeGameData({
      players: ["s1", "", "", ""],
      nbPlayers: 1,
    });
    renderWithGame(data, <SkipButton />);

    const button = screen.getByRole("button", { name: "Voter pour Reset" });
    expect(button).toBeEnabled();
    expect(screen.getByText("0 / 1")).toBeInTheDocument();

    fireEvent.click(button);
    expect(send).toHaveBeenCalledWith("vote-skip");
  });

  it("should disable the skip vote when the client is a spectator", () => {
    renderWithGame(makeGameData().data, <SkipButton />);

    expect(
      screen.getByRole("button", { name: "Voter pour Reset" }),
    ).toBeDisabled();
  });

  it("should disable the skip vote when it has already been cast", () => {
    const { data } = makeGameData({
      players: ["s1", "", "", ""],
      nbPlayers: 1,
      votedForSkip: new Set(["s1"]),
    });
    renderWithGame(data, <SkipButton />);

    expect(
      screen.getByRole("button", { name: "Voter pour Reset" }),
    ).toBeDisabled();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });
});

describe("LeaveButton", () => {
  it("should leave the room when the leave button is clicked", () => {
    const { data, onLeaveRoom } = makeGameData();
    renderWithGame(data, <LeaveButton />);

    fireEvent.click(screen.getByRole("button", { name: "Quitter la partie" }));
    expect(onLeaveRoom).toHaveBeenCalledWith(true);
  });
});

describe("PlayerList", () => {
  it("should offer each free seat as a join button when seats are available", () => {
    const { data, send } = makeGameData({
      players: ["", "s2", "", ""],
      playerNames: { s2: "Bob" },
      nbPlayers: 1,
    });
    renderWithGame(data, <PlayerList />);

    const joins = screen.getAllByRole("button", { name: "Rejoindre" });
    expect(joins).toHaveLength(3);

    fireEvent.click(joins[0]);
    expect(send).toHaveBeenCalledWith("join-color", 0);
  });

  it("should show seated players by name and disable their seats when the seats are occupied", () => {
    const { data } = makeGameData({
      players: ["s1", "s2", "", ""],
      playerNames: { s1: "Alice", s2: "Bob" },
      nbPlayers: 2,
    });
    renderWithGame(data, <PlayerList />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", {
      name: "Rejoindre",
    })) {
      expect(button).toBeDisabled();
    }
  });

  it("should mark the active player when it is their turn", () => {
    const { data } = makeGameData({
      players: ["s1", "s2", "", ""],
      playerNames: { s1: "Alice", s2: "Bob" },
      turn: 1,
      nbPlayers: 2,
    });
    const { container } = renderWithGame(data, <PlayerList />);

    expect(container.querySelectorAll(".lucide-hand")).toHaveLength(1);
    expect(container.querySelectorAll(".lucide-crown")).toHaveLength(0);
  });

  it("should crown the winner when the game has been won", () => {
    const { data } = makeGameData({
      players: ["s1", "s2", "", ""],
      playerNames: { s1: "Alice", s2: "Bob" },
      turn: 0,
      winner: "s1",
      nbPlayers: 2,
    });
    const { container } = renderWithGame(data, <PlayerList />);

    expect(container.querySelectorAll(".lucide-crown")).toHaveLength(1);
    expect(container.querySelectorAll(".lucide-hand")).toHaveLength(0);
  });
});

describe("SpectatorList", () => {
  it("should list every spectator by name when spectators are connected", () => {
    const { data } = makeGameData({
      spectators: new Set(["s9", "s8"]),
      playerNames: { s9: "Zoe", s8: "Sam" },
    });
    renderWithGame(data, <SpectatorList />);

    expect(screen.getByText("Zoe")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });
});

describe("Chat", () => {
  it("should render a message with its author when the chat has messages", () => {
    const { data } = makeGameData({
      chatMessages: [
        { content: "Salut !", author: "s2" },
        { content: "Bonjour", author: "s1" },
      ],
      playerNames: { s1: "Alice", s2: "Bob" },
    });
    renderWithGame(data, <Chat />);

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Salut !")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bonjour")).toBeInTheDocument();
  });

  it("should send the draft and clear the input when the form is submitted", () => {
    const { data, send } = makeGameData();
    renderWithGame(data, <Chat />);

    const input = screen.getByPlaceholderText("Type here");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(send).toHaveBeenCalledWith("send-message", "Hello");
    expect(input).toHaveValue("");
  });

  it("should ignore the draft when it is empty", () => {
    const { data, send } = makeGameData();
    renderWithGame(data, <Chat />);

    fireEvent.submit(screen.getByPlaceholderText("Type here").closest("form")!);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("Info", () => {
  it("should celebrate the win when the local player is the winner", () => {
    const { data } = makeGameData({ winner: "s1" });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent("Bravo !");
  });

  it("should announce the defeat when another player has won", () => {
    const { data } = makeGameData({
      winner: "s2",
      yourColor: 0,
      playerNames: { s2: "Bob" },
    });
    renderWithGame(data, <Info />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Dommage !");
    expect(alert).toHaveTextContent("Bob a gagné la partie !");
  });

  it("should tell spectators the game is over when they are not playing", () => {
    const { data } = makeGameData({
      winner: "s2",
      yourColor: -1,
      playerNames: { s2: "Bob" },
    });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent("Partie finie !");
  });

  it("should block spectators when the room is full", () => {
    const { data } = makeGameData({ isAPlayer: false, nbPlayers: 4 });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent("Partie pleine !");
  });

  it("should let a new player pick a color when no winner has been declared", () => {
    const { data } = makeGameData({ isAPlayer: false, nbPlayers: 1 });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent("Prêt à commencer !");
  });

  it("should declare a draw when the grid is full", () => {
    const { data } = makeGameData({
      isAPlayer: true,
      nbPlayers: 2,
      grid: Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0)),
    });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent("Partie nulle !");
  });

  it("should wait for a second player when fewer than two players are seated", () => {
    const { data } = makeGameData({ isAPlayer: true, nbPlayers: 1 });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Vous êtes tout seul !",
    );
  });

  it("should ask the player to play when it is their turn", () => {
    const { data } = makeGameData({
      isAPlayer: true,
      nbPlayers: 2,
      isYourTurn: true,
    });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent("A vous de jouer !");
  });

  it("should wait for the other players when it is not their turn", () => {
    const { data } = makeGameData({
      isAPlayer: true,
      nbPlayers: 2,
      isYourTurn: false,
    });
    renderWithGame(data, <Info />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ce n'est pas à vous de jouer !",
    );
  });
});
