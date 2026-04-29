export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export interface SnakePoint {
    x: number;
    y: number;
}

export interface SnakeState {
    snake: SnakePoint[];
    direction: SnakeDirection;
    queuedDirection: SnakeDirection;
    food: SnakePoint;
    score: number;
    status: 'idle' | 'running' | 'paused' | 'game-over';
}

export interface SnakeBoard {
    width: number;
    height: number;
}

const DEFAULT_DIRECTION: SnakeDirection = 'right';

const DIRECTION_VECTORS: Record<SnakeDirection, SnakePoint> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

export const DEFAULT_SNAKE_BOARD: SnakeBoard = {
    width: 14,
    height: 14
};

export const arePointsEqual = (first: SnakePoint, second: SnakePoint) =>
    first.x === second.x && first.y === second.y;

export const isOppositeDirection = (current: SnakeDirection, next: SnakeDirection) =>
    (current === 'up' && next === 'down')
    || (current === 'down' && next === 'up')
    || (current === 'left' && next === 'right')
    || (current === 'right' && next === 'left');

export const createInitialSnakeState = (
    board: SnakeBoard = DEFAULT_SNAKE_BOARD,
    random = Math.random
): SnakeState => {
    const originX = Math.floor(board.width / 2);
    const originY = Math.floor(board.height / 2);
    const snake = [
        { x: originX, y: originY },
        { x: originX - 1, y: originY },
        { x: originX - 2, y: originY }
    ];

    return {
        snake,
        direction: DEFAULT_DIRECTION,
        queuedDirection: DEFAULT_DIRECTION,
        food: getRandomFoodPosition(board, snake, random),
        score: 0,
        status: 'idle'
    };
};

export const queueDirection = (state: SnakeState, nextDirection: SnakeDirection): SnakeState => {
    const comparisonDirection = state.status === 'running' ? state.queuedDirection : state.direction;
    if (isOppositeDirection(comparisonDirection, nextDirection) || comparisonDirection === nextDirection) {
        return state;
    }

    return {
        ...state,
        queuedDirection: nextDirection
    };
};

export const isWithinBoard = (point: SnakePoint, board: SnakeBoard) =>
    point.x >= 0
    && point.y >= 0
    && point.x < board.width
    && point.y < board.height;

export const getNextHeadPosition = (head: SnakePoint, direction: SnakeDirection): SnakePoint => {
    const vector = DIRECTION_VECTORS[direction];
    return {
        x: head.x + vector.x,
        y: head.y + vector.y
    };
};

export const getRandomFoodPosition = (
    board: SnakeBoard,
    snake: SnakePoint[],
    random = Math.random
): SnakePoint => {
    const freeCells: SnakePoint[] = [];

    for (let y = 0; y < board.height; y += 1) {
        for (let x = 0; x < board.width; x += 1) {
            const point = { x, y };
            if (!snake.some(segment => arePointsEqual(segment, point))) {
                freeCells.push(point);
            }
        }
    }

    if (freeCells.length === 0) {
        return snake[0];
    }

    const index = Math.floor(random() * freeCells.length);
    return freeCells[index];
};

export const stepSnakeGame = (
    state: SnakeState,
    board: SnakeBoard = DEFAULT_SNAKE_BOARD,
    random = Math.random
): SnakeState => {
    if (state.status !== 'running') {
        return state;
    }

    const direction = state.queuedDirection;
    const nextHead = getNextHeadPosition(state.snake[0], direction);
    const isEating = arePointsEqual(nextHead, state.food);
    const tailTrimmedSnake = isEating ? state.snake : state.snake.slice(0, -1);

    if (!isWithinBoard(nextHead, board) || tailTrimmedSnake.some(segment => arePointsEqual(segment, nextHead))) {
        return {
            ...state,
            direction,
            status: 'game-over'
        };
    }

    const snake = [nextHead, ...tailTrimmedSnake];
    const score = isEating ? state.score + 1 : state.score;

    return {
        ...state,
        snake,
        direction,
        queuedDirection: direction,
        food: isEating ? getRandomFoodPosition(board, snake, random) : state.food,
        score
    };
};
