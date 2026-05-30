import { useMemo, useRef, useState } from "react";
import "./App.css";
import { closestPairDivideAndConquer } from "./game/closestPair";

const BOARD_WIDTH = 16;
const BOARD_HEIGHT = 9;
const POINTS_PER_PLAYER = 5;

const initialState = {
  mode: "multiplayer",
  phase: "setup",
  currentPlayer: 1,
  points: {
    1: [],
    2: [],
  },
  target: null,
  winner: null,
  score: {
    1: 0,
    2: 0,
  },
  closestPair: null,
  message: "Escolha um modo e posicione 5 pontos por jogador.",
};

function pointKey(point) {
  return `${point.x}-${point.y}`;
}

function formatPoint(point) {
  return `(${point.x + 1}, ${point.y + 1})`;
}

function createOccupiedSet(points) {
  return new Set(points.map(pointKey));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snapPoint(xRatio, yRatio) {
  return {
    x: clamp(Math.round(xRatio * (BOARD_WIDTH - 1)), 0, BOARD_WIDTH - 1),
    y: clamp(Math.round(yRatio * (BOARD_HEIGHT - 1)), 0, BOARD_HEIGHT - 1),
  };
}

function randomCell(occupied) {
  let x = 0;
  let y = 0;

  do {
    x = Math.floor(Math.random() * BOARD_WIDTH);
    y = Math.floor(Math.random() * BOARD_HEIGHT);
  } while (occupied.has(`${x}-${y}`));

  return { x, y };
}

function createBotPoints(occupied) {
  const botPoints = [];
  const taken = new Set(occupied);

  while (botPoints.length < POINTS_PER_PLAYER) {
    const point = randomCell(taken);
    taken.add(pointKey(point));
    botPoints.push(point);
  }

  return botPoints;
}

function distance(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function resolveRound(pointsByPlayer) {
  const allPoints = [...pointsByPlayer[1], ...pointsByPlayer[2]];

  if (allPoints.length < POINTS_PER_PLAYER * 2) {
    return null;
  }

  const occupied = createOccupiedSet(allPoints);
  const target = randomCell(occupied);

  const scorePlayerOne = pointsByPlayer[1].reduce(
    (sum, point) => sum + distance(point, target),
    0,
  );
  const scorePlayerTwo = pointsByPlayer[2].reduce(
    (sum, point) => sum + distance(point, target),
    0,
  );

  const winner =
    scorePlayerOne === scorePlayerTwo
      ? "empate"
      : scorePlayerOne < scorePlayerTwo
        ? "jogador 1"
        : "jogador 2";

  return {
    target,
    score: {
      1: scorePlayerOne,
      2: scorePlayerTwo,
    },
    winner,
    closestPair: closestPairDivideAndConquer(allPoints),
  };
}

function App() {
  const [game, setGame] = useState(initialState);
  const boardRef = useRef(null);

  const occupied = useMemo(
    () => createOccupiedSet([...game.points[1], ...game.points[2]]),
    [game.points],
  );

  const playerOneReady = game.points[1].length === POINTS_PER_PLAYER;
  const playerTwoReady = game.points[2].length === POINTS_PER_PLAYER;
  const setupComplete = playerOneReady && playerTwoReady;

  function resetGame(mode = game.mode) {
    setGame({
      ...initialState,
      mode,
    });
  }

  function placePoint(x, y) {
    if (game.phase !== "setup" || occupied.has(`${x}-${y}`)) {
      return;
    }

    setGame((current) => {
      const nextPoints = {
        1: [...current.points[1]],
        2: [...current.points[2]],
      };

      nextPoints[current.currentPlayer] = [
        ...nextPoints[current.currentPlayer],
        { x, y },
      ];

      if (
        current.mode === "bot" &&
        current.currentPlayer === 1 &&
        nextPoints[1].length === POINTS_PER_PLAYER
      ) {
        const botPoints = createBotPoints(createOccupiedSet(nextPoints[1]));

        return {
          ...current,
          points: {
            1: nextPoints[1],
            2: botPoints,
          },
          phase: "ready",
          currentPlayer: 1,
          message:
            "Você terminou. O bot posicionou os pontos e a rodada está pronta.",
        };
      }

      const nextPlayer = current.currentPlayer === 1 ? 2 : 1;
      const finished =
        nextPoints[1].length === POINTS_PER_PLAYER &&
        nextPoints[2].length === POINTS_PER_PLAYER;

      return {
        ...current,
        points: nextPoints,
        currentPlayer: finished ? current.currentPlayer : nextPlayer,
        phase: finished ? "ready" : "setup",
        message: finished
          ? "Todos os pontos foram posicionados. Clique em resolver rodada."
          : `Vez do jogador ${nextPlayer}.`,
      };
    });
  }

  function handleBoardClick(event) {
    if (game.phase !== "setup" || !boardRef.current) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const xRatio = clamp((event.clientX - rect.left) / rect.width, 0, 0.999);
    const yRatio = clamp((event.clientY - rect.top) / rect.height, 0, 0.999);
    const nextPoint = snapPoint(xRatio, yRatio);

    if (!occupied.has(pointKey(nextPoint))) {
      placePoint(nextPoint.x, nextPoint.y);
    }
  }

  function handleResolveRound() {
    const result = resolveRound(game.points);

    if (!result) {
      return;
    }

    setGame((current) => ({
      ...current,
      phase: "result",
      target: result.target,
      score: result.score,
      winner: result.winner,
      closestPair: result.closestPair,
      message: `Ponto neutro em ${formatPoint(result.target)}. Vencedor: ${result.winner}.`,
    }));
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Dividir para conquistar</p>
          <h1>Par de pontos mais próximos em formato de jogo.</h1>
          <p className="hero-copy">
            Cada jogador posiciona 5 pontos em um quadro panorâmico 16x9. Depois
            disso, um ponto neutro é escolhido e a rodada é resolvida com base
            na proximidade. O algoritmo de divide and conquer também destaca o
            par mais próximo entre todos os pontos.
          </p>
        </div>

        <div className="mode-card">
          <span className="mode-label">Modo de jogo</span>
          <div className="mode-toggle">
            <button
              type="button"
              className={game.mode === "multiplayer" ? "is-selected" : ""}
              onClick={() => resetGame("multiplayer")}
            >
              Multiplayer
            </button>
            <button
              type="button"
              className={game.mode === "bot" ? "is-selected" : ""}
              onClick={() => resetGame("bot")}
            >
              Contra bot
            </button>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => resetGame()}
          >
            Reiniciar
          </button>
        </div>
      </section>

      <section className="game-layout">
        <div className="board-card">
          <div className="board-header">
            <div>
              <h2>Quadro</h2>
              <p>{game.message}</p>
            </div>
            <span className="phase-pill">
              {game.phase === "setup"
                ? "Preparação"
                : game.phase === "ready"
                  ? "Pronto"
                  : "Resultado"}
            </span>
          </div>

          <div
            ref={boardRef}
            className={`board ${game.phase !== "setup" ? "board-readonly" : ""}`}
            onClick={handleBoardClick}
            role="application"
            aria-label="Quadro de posicionamento"
          >
            <div className="board-rim" aria-hidden="true" />
            <div className="axis-label axis-top-left">1</div>
            <div className="axis-label axis-bottom-right">
              {BOARD_WIDTH} x {BOARD_HEIGHT}
            </div>

            {game.points[1].map((point) => {
              const isTarget =
                game.target?.x === point.x && game.target?.y === point.y;
              const isClosestPair = game.closestPair?.pair?.some(
                (candidate) =>
                  candidate.x === point.x && candidate.y === point.y,
              );

              return (
                <button
                  key={`p1-${pointKey(point)}`}
                  type="button"
                  className={`point-dot player-one ${isTarget ? "target" : ""} ${isClosestPair ? "closest-pair" : ""}`}
                  style={{
                    left: `${(point.x / (BOARD_WIDTH - 1)) * 100}%`,
                    top: `${(point.y / (BOARD_HEIGHT - 1)) * 100}%`,
                  }}
                  disabled
                  aria-label={`Jogador 1 em ${formatPoint(point)}`}
                >
                  <span className="point-label">1 {formatPoint(point)}</span>
                </button>
              );
            })}

            {game.points[2].map((point) => {
              const isTarget =
                game.target?.x === point.x && game.target?.y === point.y;
              const isClosestPair = game.closestPair?.pair?.some(
                (candidate) =>
                  candidate.x === point.x && candidate.y === point.y,
              );

              return (
                <button
                  key={`p2-${pointKey(point)}`}
                  type="button"
                  className={`point-dot player-two ${isTarget ? "target" : ""} ${isClosestPair ? "closest-pair" : ""}`}
                  style={{
                    left: `${(point.x / (BOARD_WIDTH - 1)) * 100}%`,
                    top: `${(point.y / (BOARD_HEIGHT - 1)) * 100}%`,
                  }}
                  disabled
                  aria-label={`Jogador 2 em ${formatPoint(point)}`}
                >
                  <span className="point-label">2 {formatPoint(point)}</span>
                </button>
              );
            })}

            {game.target ? (
              <div
                className="target-dot"
                style={{
                  left: `${(game.target.x / (BOARD_WIDTH - 1)) * 100}%`,
                  top: `${(game.target.y / (BOARD_HEIGHT - 1)) * 100}%`,
                }}
                aria-hidden="true"
              />
            ) : null}
          </div>
        </div>

        <aside className="sidebar">
          <div className="panel">
            <h3>Estado atual</h3>
            <p>
              Jogador da vez:{" "}
              {game.mode === "bot" ? "Você" : `Jogador ${game.currentPlayer}`}
            </p>
            <p>
              Pontos do jogador 1: {game.points[1].length}/{POINTS_PER_PLAYER}
            </p>
            <p>
              Pontos do jogador 2: {game.points[2].length}/{POINTS_PER_PLAYER}
            </p>
          </div>

          <div className="panel">
            <h3>Lista de pontos</h3>
            <div className="points-grid">
              <div>
                <strong>Jogador 1</strong>
                <ul>
                  {game.points[1].map((point) => (
                    <li key={pointKey(point)}>{formatPoint(point)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Jogador 2</strong>
                <ul>
                  {game.points[2].map((point) => (
                    <li key={pointKey(point)}>{formatPoint(point)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Algoritmo</h3>
            {game.closestPair ? (
              <>
                <p>
                  Par mais próximo: {formatPoint(game.closestPair.pair[0])} e{" "}
                  {formatPoint(game.closestPair.pair[1])}
                </p>
                <p>Distância: {game.closestPair.distance.toFixed(2)}</p>
              </>
            ) : (
              <p>Posicione os 10 pontos para ver o resultado do algoritmo.</p>
            )}
          </div>

          <div className="panel">
            <h3>Resultado</h3>
            {game.phase === "result" ? (
              <>
                <p>Ponto neutro: {formatPoint(game.target)}</p>
                <p>Soma jogador 1: {game.score[1].toFixed(2)}</p>
                <p>Soma jogador 2: {game.score[2].toFixed(2)}</p>
                <p>Vencedor: {game.winner}</p>
              </>
            ) : (
              <p>Finalize o posicionamento e clique em resolver rodada.</p>
            )}
          </div>

          <div className="actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleResolveRound}
              disabled={!setupComplete}
            >
              Resolver rodada
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => resetGame(game.mode)}
            >
              Limpar fase
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
