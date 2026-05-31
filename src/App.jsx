import { useMemo, useRef, useState } from "react";
import "./App.css";
import { closestPairDivideAndConquer } from "./game/closestPair";

const BOARD_WIDTH = 16;
const BOARD_HEIGHT = 9;
const BOARD_INSET = 18;
const POINTS_PER_PLAYER = 5;
const MAX_ROUNDS = 5;
const DEFAULT_PLAYER_NAMES = {
  1: "Jogador 1",
  2: "Jogador 2",
};

const initialState = {
  mode: "multiplayer",
  phase: "players",
  currentPlayer: 1,
  playerNames: DEFAULT_PLAYER_NAMES,
  points: {
    1: [],
    2: [],
  },
  target: null,
  winner: null,
  round: 1,
  rounds: [],
  score: {
    1: 0,
    2: 0,
  },
  closestPair: null,
  message: "Informe os nomes para começar a partida.",
};

function pointKey(point) {
  return `${point.x}-${point.y}`;
}

function formatPoint(point) {
  return `(${point.x + 1}, ${point.y + 1})`;
}

function formatWinner(winner, playerNames = DEFAULT_PLAYER_NAMES) {
  if (winner === "jogador 1") return playerNames[1];
  if (winner === "jogador 2") return playerNames[2];
  return "Empate";
}

function winnerClass(winner) {
  if (winner === "jogador 1") return "player-one";
  if (winner === "jogador 2") return "player-two";
  return "draw";
}

function createOccupiedSet(points) {
  return new Set(points.map(pointKey));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snapPoint(xRatio, yRatio) {
  return {
    x: clamp(Math.floor(xRatio * BOARD_WIDTH), 0, BOARD_WIDTH - 1),
    y: clamp(Math.floor(yRatio * BOARD_HEIGHT), 0, BOARD_HEIGHT - 1),
  };
}

function pointPosition(point) {
  return {
    left: `${((point.x + 0.5) / BOARD_WIDTH) * 100}%`,
    top: `${((point.y + 0.5) / BOARD_HEIGHT) * 100}%`,
  };
}

function pointLabelClass(point) {
  const classes = ["point-label"];

  if (point.x === 0) {
    classes.push("align-left");
  }

  if (point.x === BOARD_WIDTH - 1) {
    classes.push("align-right");
  }

  if (point.y === BOARD_HEIGHT - 1) {
    classes.push("align-top");
  }

  return classes.join(" ");
}

function randomCell(occupied) {
  let x;
  let y;

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

function getMatchSummary(rounds) {
  const wins = rounds.reduce(
    (totals, round) => {
      if (round.winner === "jogador 1") {
        return { ...totals, 1: totals[1] + 1 };
      }

      if (round.winner === "jogador 2") {
        return { ...totals, 2: totals[2] + 1 };
      }

      return { ...totals, draws: totals.draws + 1 };
    },
    { 1: 0, 2: 0, draws: 0 },
  );

  const champion =
    wins[1] === wins[2] ? "empate" : wins[1] > wins[2] ? "jogador 1" : "jogador 2";

  return { wins, champion };
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
  const [nameInputs, setNameInputs] = useState(DEFAULT_PLAYER_NAMES);
  const boardRef = useRef(null);

  const occupied = useMemo(
    () => createOccupiedSet([...game.points[1], ...game.points[2]]),
    [game.points],
  );

  const playerOneReady = game.points[1].length === POINTS_PER_PLAYER;
  const playerTwoReady = game.points[2].length === POINTS_PER_PLAYER;
  const setupComplete = playerOneReady && playerTwoReady;
  const matchSummary = useMemo(() => getMatchSummary(game.rounds), [game.rounds]);
  const matchFinished = game.phase === "finished";

  function getPlayerName(player) {
    return game.playerNames[player] || DEFAULT_PLAYER_NAMES[player];
  }

  function resetGame(mode = game.mode) {
    const nextNames = {
      1: nameInputs[1] || DEFAULT_PLAYER_NAMES[1],
      2: mode === "bot" ? "Bot" : nameInputs[2] || DEFAULT_PLAYER_NAMES[2],
    };

    setNameInputs(nextNames);
    setGame({
      ...initialState,
      mode,
      playerNames: nextNames,
    });
  }

  function startMatch() {
    const playerNames = {
      1: nameInputs[1].trim() || DEFAULT_PLAYER_NAMES[1],
      2: nameInputs[2].trim() || (game.mode === "bot" ? "Bot" : DEFAULT_PLAYER_NAMES[2]),
    };

    setNameInputs(playerNames);
    setGame({
      ...initialState,
      mode: game.mode,
      phase: "setup",
      playerNames,
      message: "Posicione 5 pontos por jogador.",
    });
  }

  function startNextRound() {
    setGame((current) => ({
      ...initialState,
      mode: current.mode,
      phase: "setup",
      playerNames: current.playerNames,
      round: current.round + 1,
      rounds: current.rounds,
      message: "Posicione 5 pontos por jogador.",
    }));
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
            `${current.playerNames[1]} terminou. ${current.playerNames[2]} posicionou os pontos e a rodada está pronta.`,
        };
      }

      const nextPlayer =
        current.mode === "bot" ? 1 : current.currentPlayer === 1 ? 2 : 1;
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
          : `Vez de ${current.playerNames[nextPlayer]}.`,
      };
    });
  }

  function handleBoardClick(event) {
    if (game.phase !== "setup" || !boardRef.current) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const innerWidth = rect.width - BOARD_INSET * 2;
    const innerHeight = rect.height - BOARD_INSET * 2;
    const xRatio = clamp(
      (event.clientX - rect.left - BOARD_INSET) / innerWidth,
      0,
      0.999,
    );
    const yRatio = clamp(
      (event.clientY - rect.top - BOARD_INSET) / innerHeight,
      0,
      0.999,
    );
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

    setGame((current) => {
      const rounds = [
        ...current.rounds,
        {
          number: current.round,
          winner: result.winner,
          target: result.target,
          score: result.score,
        },
      ];
      const isFinalRound = current.round === MAX_ROUNDS;
      const summary = getMatchSummary(rounds);

      return {
        ...current,
        phase: isFinalRound ? "finished" : "result",
        target: result.target,
        score: result.score,
        winner: result.winner,
        closestPair: result.closestPair,
        rounds,
        message: isFinalRound
          ? `Partida encerrada. Campeão: ${formatWinner(summary.champion, current.playerNames)}.`
          : `Ponto neutro em ${formatPoint(result.target)}. Vencedor: ${formatWinner(result.winner, current.playerNames)}.`,
      };
    });
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

      {game.phase === "players" ? (
        <section className="setup-card">
          <div>
            <p className="eyebrow">Nova partida</p>
            <h2>Quem vai jogar?</h2>
            <p>
              A partida tem no máximo {MAX_ROUNDS} rodadas. Ao final, vence quem
              ganhar mais rodadas.
            </p>
          </div>

          <div className="player-form">
            <label>
              {game.mode === "bot" ? "Seu nome" : "Nome do jogador 1"}
              <input
                type="text"
                value={nameInputs[1]}
                maxLength={24}
                onChange={(event) =>
                  setNameInputs((current) => ({
                    ...current,
                    1: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              {game.mode === "bot" ? "Nome do bot" : "Nome do jogador 2"}
              <input
                type="text"
                value={nameInputs[2]}
                maxLength={24}
                onChange={(event) =>
                  setNameInputs((current) => ({
                    ...current,
                    2: event.target.value,
                  }))
                }
              />
            </label>
            <button type="button" className="primary-button" onClick={startMatch}>
              Começar partida
            </button>
          </div>
        </section>
      ) : null}

      {game.phase !== "players" ? (
      <section className="game-layout">
        <div className="board-card">
          <div className="board-header">
            <div>
              <h2>Quadro</h2>
              <p>
                <strong>
                  Rodada {Math.min(game.round, MAX_ROUNDS)} de {MAX_ROUNDS}.
                </strong>{" "}
                {game.message}
              </p>
            </div>
            <span className="phase-pill">
              {game.phase === "setup"
                ? "Preparação"
                : game.phase === "ready"
                  ? "Pronto"
                  : game.phase === "finished"
                    ? "Final"
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

            <div className="board-points">
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
                    style={pointPosition(point)}
                    disabled
                    aria-label={`${getPlayerName(1)} em ${formatPoint(point)}`}
                  >
                    <span className={pointLabelClass(point)}>
                      {getPlayerName(1)} {formatPoint(point)}
                    </span>
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
                    style={pointPosition(point)}
                    disabled
                    aria-label={`${getPlayerName(2)} em ${formatPoint(point)}`}
                  >
                    <span className={pointLabelClass(point)}>
                      {getPlayerName(2)} {formatPoint(point)}
                    </span>
                  </button>
                );
              })}

              {game.target ? (
                <div
                  className="target-dot"
                  style={pointPosition(game.target)}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </div>

          <div className="points-under-board">
            <h3>Lista de pontos</h3>
            <div className="points-grid">
              <div>
                <strong>{getPlayerName(1)}</strong>
                <ul>
                  {game.points[1].map((point) => (
                    <li key={pointKey(point)}>{formatPoint(point)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>{getPlayerName(2)}</strong>
                <ul>
                  {game.points[2].map((point) => (
                    <li key={pointKey(point)}>{formatPoint(point)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="sidebar">
          {game.phase === "result" || game.phase === "finished" ? (
            <div className={`winner-card ${winnerClass(game.winner)}`}>
              <span className="winner-kicker">Vencedor da rodada {game.round}</span>
              <strong>{formatWinner(game.winner, game.playerNames)}</strong>
              <small>
                {game.winner === "empate"
                  ? "As somas de distância ficaram iguais."
                  : "Menor soma de distâncias até o ponto neutro."}
              </small>
            </div>
          ) : null}

          <div className="panel">
            <h3>Resultado</h3>
            {game.phase === "result" || game.phase === "finished" ? (
              <>
                <p>Ponto neutro: {formatPoint(game.target)}</p>
                <p>
                  Soma de {getPlayerName(1)}: {game.score[1].toFixed(2)}
                </p>
                <p>
                  Soma de {getPlayerName(2)}: {game.score[2].toFixed(2)}
                </p>
                <p>
                  Vencedor:{" "}
                  <span className={`winner-pill ${winnerClass(game.winner)}`}>
                    {formatWinner(game.winner, game.playerNames)}
                  </span>
                </p>
              </>
            ) : (
              <p>Finalize o posicionamento e clique em resolver rodada.</p>
            )}
          </div>

          <div className="actions">
            <button
              type="button"
              className="primary-button"
              onClick={game.phase === "result" ? startNextRound : handleResolveRound}
              disabled={
                matchFinished || (game.phase !== "result" && !setupComplete)
              }
            >
              {matchFinished
                ? "Partida finalizada"
                : game.phase === "result"
                  ? "Próxima rodada"
                  : "Resolver rodada"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => resetGame(game.mode)}
            >
              Novo jogo
            </button>
          </div>

          <div className="panel">
            <h3>Estado atual</h3>
            <p>
              Jogador da vez:{" "}
              {game.mode === "bot" ? getPlayerName(1) : getPlayerName(game.currentPlayer)}
            </p>
            <p>
              Pontos de {getPlayerName(1)}: {game.points[1].length}/
              {POINTS_PER_PLAYER}
            </p>
            <p>
              Pontos de {getPlayerName(2)}: {game.points[2].length}/
              {POINTS_PER_PLAYER}
            </p>
            <p>
              Placar: {matchSummary.wins[1]} x {matchSummary.wins[2]}
              {matchSummary.wins.draws > 0
                ? ` (${matchSummary.wins.draws} empate${matchSummary.wins.draws > 1 ? "s" : ""})`
                : ""}
            </p>
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

          {matchFinished ? (
            <div className={`champion-card ${winnerClass(matchSummary.champion)}`}>
              <span className="winner-kicker">Campeão da partida</span>
              <strong>
                {formatWinner(matchSummary.champion, game.playerNames)}
              </strong>
              <small>
                Placar final: {getPlayerName(1)} {matchSummary.wins[1]} x{" "}
                {matchSummary.wins[2]} {getPlayerName(2)}
              </small>
            </div>
          ) : null}

          <div className="panel">
            <h3>Histórico de rodadas</h3>
            {game.rounds.length > 0 ? (
              <ol className="round-history">
                {game.rounds.map((round) => (
                  <li key={round.number}>
                    <span>Rodada {round.number}</span>
                    <strong className={`winner-pill ${winnerClass(round.winner)}`}>
                      {formatWinner(round.winner, game.playerNames)}
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma rodada resolvida ainda.</p>
            )}
          </div>
        </aside>
      </section>
      ) : null}
    </main>
  );
}

export default App;
