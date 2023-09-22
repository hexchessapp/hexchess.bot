/**
 * @license
 * Copyright (c) 2023, Owain Williams (owain.williams.213@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import {
  BLACK,
  BLACK_PROMOTION_HEXAGONS,
  Hexagon,
  HEXAGONS,
  HexChess,
  MoveObject,
  PAWN,
  Piece,
  PieceSymbol,
  WHITE,
  WHITE_PROMOTION_HEXAGONS,
} from 'hexchess.js'

/*
 * Piece values for chess pieces to calulcate score for minimax
 */
const PIECE_VALUES: Record<PieceSymbol, number> = {
  b: 3,
  k: 0,
  n: 3,
  p: 1,
  q: 9,
  r: 5,
}

export class Bot {
  private chess: HexChess
  private hits: number

  constructor(pgn: string | string[] = []) {
    this.chess = new HexChess()
    this.chess.loadPgn(pgn)
    this.hits = 0
  }

  /*
   * Generates a move using minimax algorithm
   */
  generate(depth = 0): {
    from: Hexagon
    to: Hexagon
  } | null {
    console.log('BotMove Test')

    /*
     * Initializes variables for calculcations for best move
     */
    let bestMove = null
    let bestValue = -Infinity
    let alpha = -Infinity
    const beta = Infinity

    const startTime = Date.now()
    let elapsedTime = 0

    /*
     * Finds all possible moves for the bot
     */
    const allPiecesHexagons: Hexagon[] = HEXAGONS.filter(
      (hex) => this.chess.board()[hex]?.color === this.chess.turn()
    )

    const allPossibleMoves = allPiecesHexagons.flatMap((hex) =>
      this.chess.moves(hex).map((move) => ({ from: hex, to: move }))
    )

    /*
     * Sorts the moves by the heuristic
     */

    allPossibleMoves.sort(
      (a, b) => this.heuristic(this.chess, b) - this.heuristic(this.chess, a)
    )

    /*
     * Loops through all the possible moves and finds the best one
     */
    for (const move of allPossibleMoves) {
      const movingPiece = this.chess.board()[move.from];
      if (movingPiece?.type == PAWN && 
          ((movingPiece.color == WHITE && 
          WHITE_PROMOTION_HEXAGONS.includes(move.to)) || 
          (movingPiece.color == BLACK && 
          BLACK_PROMOTION_HEXAGONS.includes(move.to)))) {
              (move as any).promotion = 'q';
      }
      this.chess.move(move, true)
      let moveValue = this.minimax(this.chess, depth, alpha, beta, false)
      this.hits++
      this.chess.undo()

      if (movingPiece?.type == 'k') {
        const isUnderAttack = HEXAGONS.some((hex) => {
            const piece = this.chess.board()[hex];
            return piece?.color !== this.chess.turn() && this.chess.moves(hex).includes(move.from);
        });
        const isCapturing = !!this.chess.board()[move.to];
        const isSafe = HEXAGONS.every((hex) => {
            const piece = this.chess.board()[hex];
            return !piece || piece.color === this.chess.turn() ||
                   (!this.chess.moves(hex).includes(move.from) && 
                    !this.chess.moves(hex).includes(move.to));
        });
        const isUnnecessaryMove = !isUnderAttack && !isCapturing && isSafe;

        if (isUnnecessaryMove) {
            moveValue -= 5;
        }
    }
      /*
       * Updates the best move if the move is better than the previous best move
       */
      if (moveValue > bestValue) {
        bestValue = moveValue
        bestMove = move
      }

      alpha = Math.max(alpha, bestValue)
      if (beta <= alpha) {
        break
      }
    }
    elapsedTime = Date.now() - startTime

    console.log(
      `Depth: ${depth + 1}, Elapsed Time: ${elapsedTime} 
      ms, Minimax Hit: ${this.hits}, kNPS: ${this.hits / elapsedTime}`
    )

    return bestMove
  }

  // Later on will make killer heuristic
  private heuristic(chess: HexChess, move: MoveObject): number {
    /*
     * Checks if the move is a capture move and returns the value of the piece
     * to push the bot towards better moves
     */
    const targetPiece = chess.board()[move.to];
    const movingPiece = chess.board()[move.from];
    let moveScoreGuess = 0;
    
    if (targetPiece) {
      moveScoreGuess += 10 * PIECE_VALUES[targetPiece.type] - (movingPiece ? PIECE_VALUES[movingPiece.type] : 0);
    }

    if (move.promotion) {
      moveScoreGuess += PIECE_VALUES[move.promotion];
    }
    return moveScoreGuess;
  }

  /*
   * Minimax algorithm with alpha beta pruning to find the best move
   */
  private minimax(
    chess: HexChess,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean
  ): number {
    if (alpha >= beta) {
      return maximizing ? alpha : beta
    }

    /*
     * Once the depth is 0, the bot will evaluate the board and return the score
     */
    if (depth === 0) {
      return this.evaluate(chess)
    }

    /*
     * Finds all possible moves for the bot
     */
    const allPossibleMoves = HEXAGONS.filter(
      (hex) => chess.board()[hex]?.color === this.chess.turn()
    ).flatMap((hex) =>
      chess.moves(hex).map((move) => ({ from: hex, to: move }))
    )

    /*
     * Alpha beta pruning values if its the maximizing or minimizing player
     */
    let chessEval = maximizing ? -Infinity : Infinity

    /*
     * Checks the moves at the current depth and tallys the values up
     */
    for (const move of allPossibleMoves) {
      /*
       * Simulates move to see out of the moves made to take the best value move
       * and worst value move and assigns it to chessEval
       */
      chess.move(move, true)
      const evalu = this.minimax(chess, depth - 1, alpha, beta, !maximizing)
      this.hits++

      chess.undo()

      chessEval = maximizing
        ? Math.max(evalu, chessEval)
        : Math.min(evalu, chessEval)

      /*
       * Updates the alpha beta pruning values
       */
      if (maximizing) {
        alpha = Math.max(alpha, evalu)
      } else {
        beta = Math.min(beta, evalu)
      }
      if (beta <= alpha) {
        break
      }
    }
    return chessEval
  }

  /*
   * Evaluates the current board and returns the score
   * of the pieces on the board
   */
  private evaluate(chess: HexChess): number {
    let score = 0
    for (const hex of HEXAGONS) {
      const piece: null | Piece = chess.board()[hex]
      if (piece) {
        const value = PIECE_VALUES[piece.type]
        score += piece.color === BLACK ? value : -value
      }
    }

    return score
  }
}
