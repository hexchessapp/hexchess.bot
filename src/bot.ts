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
  Hexagon,
  HEXAGONS,
  HexChess,
  MoveObject,
  Piece,
  PieceSymbol,
} from 'hexchess.js'

const PIECE_VALUES: Record<PieceSymbol, number> = {
  b: 3,
  k: 0,
  n: 3,
  p: 1,
  q: 9,
  r: 5,
}

/*
 * TODO: comment
 * TODO: allow it to generate moves from either color
 */

export class Bot {
  private chess: HexChess

  constructor(pgn: string | string[] = []) {
    this.chess = new HexChess()
    this.chess.loadPgn(pgn)
  }

  generate(depth = 0): {
    from: Hexagon
    to: Hexagon
  } | null {
    console.log('BotMove hit')
    let bestMove = null

    const startTime = Date.now()
    let elapsedTime = 0

    let bestValue = -Infinity
    let alpha = -Infinity
    const beta = Infinity

    const allPiecesHexagons: Hexagon[] = HEXAGONS.filter(
      (hex) => this.chess.board()[hex]?.color === BLACK
    )

    const allPossibleMoves = allPiecesHexagons.flatMap((hex) =>
      this.chess.moves(hex).map((move) => ({ from: hex, to: move }))
    )

    allPossibleMoves.sort(
      (a, b) => this.heuristic(this.chess, b) - this.heuristic(this.chess, a)
    )

    let hits = 0
    for (const move of allPossibleMoves) {
      this.chess.move(move)
      const [moveValue, minimaxHits] = this.minimax(
        this.chess,
        depth,
        alpha,
        beta,
        false
      )
      hits += minimaxHits
      this.chess.undo()

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
      ms, Minimax Hit: ${hits}`
    )

    return bestMove
  }

  // Later on will make killer heuristic
  private heuristic(chess: HexChess, move: MoveObject): number {
    const targetPiece = chess.board()[move.to]
    if (targetPiece) {
      return PIECE_VALUES[targetPiece.type]
    }
    return 0
  }

  private minimax(
    chess: HexChess,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean
  ): [number, number] {
    if (alpha >= beta) {
      return [maximizing ? alpha : beta, 1]
    }

    if (depth === 0) {
      return [this.evaluate(chess), 1]
    }

    const allPossibleMoves = HEXAGONS.filter(
      (hex) => chess.board()[hex]?.color === (maximizing ? BLACK : 'w')
    ).flatMap((hex) =>
      chess.moves(hex).map((move) => ({ from: hex, to: move }))
    )

    let chessEval = maximizing ? -Infinity : Infinity
    let hits = 0
    for (const move of allPossibleMoves) {
      chess.move(move)
      const [evalu, minimaxHits] = this.minimax(
        chess,
        depth - 1,
        alpha,
        beta,
        !maximizing
      )
      hits += minimaxHits
      chess.undo()
      chessEval = maximizing
        ? Math.max(evalu, chessEval)
        : Math.min(evalu, chessEval)
      if (maximizing) {
        alpha = Math.max(alpha, evalu)
      } else {
        beta = Math.min(beta, evalu)
      }
      if (beta <= alpha) {
        break
      }
    }
    return [chessEval, hits + allPossibleMoves.length]
  }

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
