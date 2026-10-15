// Runs the minimax search off the main thread so the page stays responsive.
import { chooseMove, type AiLevel, type Board, type Mark } from '@cc/shared';

export interface AiRequest {
  id: number;
  board: Board;
  mark: Mark;
  level: AiLevel;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, board, mark, level } = e.data;
  self.postMessage({ id, move: chooseMove(board, mark, level) });
};
