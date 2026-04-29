import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pause, Play, RotateCcw } from 'lucide-react';
import {
    DEFAULT_SNAKE_BOARD,
    SnakeDirection,
    SnakeState,
    arePointsEqual,
    createInitialSnakeState,
    queueDirection,
    stepSnakeGame
} from '../utils/snakeGame';

const TICK_MS = 160;

const DIRECTION_KEYS: Record<string, SnakeDirection> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    a: 'left',
    A: 'left',
    s: 'down',
    S: 'down',
    d: 'right',
    D: 'right'
};

const createFreshState = (): SnakeState => ({
    ...createInitialSnakeState(DEFAULT_SNAKE_BOARD),
    status: 'running'
});

const SnakeGame: React.FC = () => {
    const [gameState, setGameState] = useState<SnakeState>(() => createFreshState());

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const direction = DIRECTION_KEYS[event.key];

            if (direction) {
                event.preventDefault();
                setGameState(current => queueDirection(current, direction));
                return;
            }

            if (event.key === ' ') {
                event.preventDefault();
                setGameState(current => {
                    if (current.status === 'game-over') {
                        return createFreshState();
                    }

                    return {
                        ...current,
                        status: current.status === 'paused' ? 'running' : 'paused'
                    };
                });
            }

            if (event.key === 'Enter' && gameState.status === 'game-over') {
                event.preventDefault();
                setGameState(createFreshState());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState.status]);

    useEffect(() => {
        if (gameState.status !== 'running') {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setGameState(current => stepSnakeGame(current, DEFAULT_SNAKE_BOARD));
        }, TICK_MS);

        return () => window.clearInterval(intervalId);
    }, [gameState.status]);

    const cells = useMemo(() => {
        const board = [];

        for (let y = 0; y < DEFAULT_SNAKE_BOARD.height; y += 1) {
            for (let x = 0; x < DEFAULT_SNAKE_BOARD.width; x += 1) {
                const point = { x, y };
                const isHead = arePointsEqual(gameState.snake[0], point);
                const isSnake = gameState.snake.some(segment => arePointsEqual(segment, point));
                const isFood = arePointsEqual(gameState.food, point);

                board.push(
                    <div
                        key={`${x}-${y}`}
                        className={`aspect-square rounded-[4px] border border-white/5 ${isFood
                            ? 'bg-brand-red shadow-[0_0_10px_rgba(229,9,20,0.45)]'
                            : isHead
                                ? 'bg-white'
                                : isSnake
                                    ? 'bg-white/70'
                                    : 'bg-white/[0.04]'}`}
                    />
                );
            }
        }

        return board;
    }, [gameState.food, gameState.snake]);

    const handleDirection = (direction: SnakeDirection) => {
        setGameState(current => queueDirection(current, direction));
    };

    const handleRestart = () => {
        setGameState(createFreshState());
    };

    const handlePauseToggle = () => {
        setGameState(current => ({
            ...current,
            status: current.status === 'paused' ? 'running' : current.status === 'running' ? 'paused' : current.status
        }));
    };

    return (
        <div className="min-h-screen bg-[#141414] pt-24 md:pt-28 pb-24 md:pb-12 px-4 md:px-12">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Arcade</p>
                        <h1 className="text-4xl font-black text-white">Snake</h1>
                        <p className="mt-3 max-w-2xl text-sm text-gray-400">
                            Eat food, grow longer, and survive the walls and your own tail.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handlePauseToggle}
                            disabled={gameState.status === 'game-over'}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {gameState.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                            {gameState.status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                        <button
                            onClick={handleRestart}
                            className="inline-flex items-center gap-2 rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            <RotateCcw size={16} />
                            Restart
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <section className="rounded-3xl border border-white/10 bg-black/40 p-4 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                        <div
                            className="grid w-full max-w-[560px] mx-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-3"
                            style={{
                                gridTemplateColumns: `repeat(${DEFAULT_SNAKE_BOARD.width}, minmax(0, 1fr))`,
                                gap: '0.35rem'
                            }}
                        >
                            {cells}
                        </div>

                        {gameState.status === 'game-over' && (
                            <div className="mx-auto mt-5 max-w-[560px] rounded-2xl border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-sm text-red-100">
                                Game over. Press restart or hit space to play again.
                            </div>
                        )}

                        {gameState.status === 'paused' && (
                            <div className="mx-auto mt-5 max-w-[560px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                                Paused. Press space or resume when you are ready.
                            </div>
                        )}
                    </section>

                    <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Score</p>
                                <p className="mt-2 text-3xl font-black text-white">{gameState.score}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Status</p>
                                <p className="mt-2 text-lg font-bold capitalize text-white">{gameState.status}</p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                            <p className="font-semibold text-white">Controls</p>
                            <p className="mt-2">Arrow keys or WASD to move.</p>
                            <p>`Space` pauses and resumes.</p>
                            <p>`Restart` resets the run.</p>
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-sm font-semibold text-white">Touch Controls</p>
                            <div className="mx-auto mt-4 grid w-[180px] grid-cols-3 gap-2">
                                <div />
                                <button
                                    onClick={() => handleDirection('up')}
                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                    aria-label="Move up"
                                >
                                    <ChevronUp size={20} />
                                </button>
                                <div />
                                <button
                                    onClick={() => handleDirection('left')}
                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                    aria-label="Move left"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={handlePauseToggle}
                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                    aria-label={gameState.status === 'paused' ? 'Resume game' : 'Pause game'}
                                >
                                    {gameState.status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
                                </button>
                                <button
                                    onClick={() => handleDirection('right')}
                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                    aria-label="Move right"
                                >
                                    <ChevronRight size={20} />
                                </button>
                                <div />
                                <button
                                    onClick={() => handleDirection('down')}
                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                    aria-label="Move down"
                                >
                                    <ChevronDown size={20} />
                                </button>
                                <div />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default SnakeGame;
