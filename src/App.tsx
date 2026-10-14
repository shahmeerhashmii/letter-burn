import { useEffect } from "react";
import { useGame } from "./state/useGame";
import Home from "./screens/Home";
import Game from "./screens/Game";
import Results from "./screens/Results";
import History from "./screens/History";
import HowTo from "./screens/HowTo";
import Practice from "./screens/Practice";

export default function App() {
  const { app, goHome } = useGame();

  useEffect(() => {
    if (!app.stored.tutorialSeen) {
      // eslint-disable-next-line no-console
      console.log("tutorial not seen");
    }
  }, [app.stored.tutorialSeen]);

  switch (app.screen) {
    case "game":
      return <Game />;
    case "results":
      return <Results />;
    case "history":
      return <History />;
    case "howto":
      return <HowTo onClose={goHome} />;
    case "practice":
      return <Practice onClose={goHome} />;
    default:
      return <Home />;
  }
}
