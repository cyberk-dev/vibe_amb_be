import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Injectable, Logger } from '@nestjs/common'
// TODO: Re-enable auth imports when auth is ready
// import { UnauthorizedException } from '@nestjs/common'
// import { JwtService } from '@nestjs/jwt'
// import { UserService } from '@app/user'
// import { User } from '@prisma/client'
import { Envelope } from '@prisma/client'
import { GameService } from './game.service'
import { GameEvents, getRoomChannel } from './game.events'
// import { UserJwtPayload } from '@app/auth/models/user.jwt.payload'

// Socket with user data attached (simplified without auth)
interface AuthenticatedSocket extends Socket {
  // user?: User
  userId?: bigint // Simplified: just store the userId
  currentRoomId?: bigint
}

// DTO for socket messages
interface JoinRoomPayload {
  roomCode: string
  displayName: string
  userId?: string // Pass userId directly for testing
}

interface SelectEnvelopePayload {
  roundId: string
  envelope: Envelope
  receiverId: string
  userId?: string
}

interface RoomIdPayload {
  roomId: string
  userId?: string
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(GameGateway.name)

  // Track connected users by room
  private roomConnections = new Map<string, Set<string>>() // roomId -> Set of socketIds

  constructor(
    private readonly gameService: GameService,
    // TODO: Re-enable auth services when auth is ready
    // private readonly jwtService: JwtService,
    // private readonly userService: UserService,
  ) {}

  // TODO: Re-enable JWT auth when auth is ready
  // For now, allow connections without authentication
  async handleConnection(socket: AuthenticatedSocket) {
    // Simplified: accept all connections without auth validation
    const userId = socket.handshake.query?.userId as string
    if (userId) {
      socket.userId = BigInt(userId)
    }
    this.logger.log(`Socket connected: ${socket.id}${userId ? ` (userId: ${userId})` : ''}`)

    /* TODO: Re-enable JWT auth when auth is ready
    try {
      const token = this.extractToken(socket)
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided - ${socket.id}`)
        socket.emit(GameEvents.ERROR, { message: 'Authentication required' })
        socket.disconnect()
        return
      }

      const payload = this.jwtService.verify<UserJwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      })

      const user = await this.userService.findOne(payload.id, { advantage: true })
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      socket.user = user
      this.logger.log(`User ${user.id} connected - Socket: ${socket.id}`)
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error.message} - ${socket.id}`)
      socket.emit(GameEvents.ERROR, { message: 'Authentication failed' })
      socket.disconnect()
    }
    */
  }

  async handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId && socket.currentRoomId) {
      const roomChannel = getRoomChannel(socket.currentRoomId)

      // Remove from room tracking
      const roomSockets = this.roomConnections.get(roomChannel)
      if (roomSockets) {
        roomSockets.delete(socket.id)
        if (roomSockets.size === 0) {
          this.roomConnections.delete(roomChannel)
        }
      }

      // Notify others in the room
      socket.to(roomChannel).emit(GameEvents.PLAYER_LEFT, {
        playerId: socket.userId.toString(),
        message: 'Player disconnected',
      })
    }
    this.logger.log(`Socket disconnected: ${socket.id}`)
  }

  // TODO: Re-enable when auth is ready
  // Extract JWT token from handshake
  // private extractToken(socket: Socket): string | null {
  //   const authHeader = socket.handshake.headers.authorization
  //   if (authHeader?.startsWith('Bearer ')) {
  //     return authHeader.slice(7)
  //   }
  //   return socket.handshake.auth?.token || socket.handshake.query?.token as string || null
  // }

  // Helper to get userId from socket or payload (simplified without auth)
  private getUserId(socket: AuthenticatedSocket, payloadUserId?: string): bigint | undefined {
    if (payloadUserId) {
      return BigInt(payloadUserId)
    }
    return socket.userId
  }

  // ==================== CLIENT -> SERVER EVENTS ====================

  @SubscribeMessage(GameEvents.JOIN_ROOM)
  async handleJoinRoom(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() payload: JoinRoomPayload) {
    try {
      const userId = this.getUserId(socket, payload.userId)

      // Join the room via service
      const result = await this.gameService.joinRoom(
        payload.roomCode,
        {
          displayName: payload.displayName,
        },
        userId,
      )

      const roomChannel = getRoomChannel(result.room.id)

      // Join socket room
      socket.join(roomChannel)
      socket.currentRoomId = result.room.id
      if (userId) socket.userId = userId

      // Track connection
      if (!this.roomConnections.has(roomChannel)) {
        this.roomConnections.set(roomChannel, new Set())
      }
      this.roomConnections.get(roomChannel)!.add(socket.id)

      // Send current state to joining player
      socket.emit(GameEvents.ROOM_STATE, result)

      // Notify others in the room
      socket.to(roomChannel).emit(GameEvents.PLAYER_JOINED, {
        player: result.player,
        playersCount: result.room.players?.length || 1,
      })

      this.logger.log(`User ${userId || 'anonymous'} joined room ${payload.roomCode}`)
      return { success: true, data: result }
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`)
      socket.emit(GameEvents.ERROR, { message: error.message })
      return { success: false, error: error.message }
    }
  }

  @SubscribeMessage(GameEvents.LEAVE_ROOM)
  async handleLeaveRoom(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() payload: RoomIdPayload) {
    try {
      const userId = this.getUserId(socket, payload.userId)
      const roomId = BigInt(payload.roomId)
      const roomChannel = getRoomChannel(roomId)

      await this.gameService.leaveRoom(roomId, userId)

      // Leave socket room
      socket.leave(roomChannel)
      socket.currentRoomId = undefined

      // Remove from tracking
      const roomSockets = this.roomConnections.get(roomChannel)
      if (roomSockets) {
        roomSockets.delete(socket.id)
      }

      // Notify others
      this.server.to(roomChannel).emit(GameEvents.PLAYER_LEFT, {
        playerId: userId?.toString() || 'anonymous',
        message: 'Player left the room',
      })

      this.logger.log(`User ${userId || 'anonymous'} left room ${roomId}`)
      return { success: true }
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`)
      socket.emit(GameEvents.ERROR, { message: error.message })
      return { success: false, error: error.message }
    }
  }

  @SubscribeMessage(GameEvents.START_GAME)
  async handleStartGame(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() payload: RoomIdPayload) {
    try {
      const userId = this.getUserId(socket, payload.userId)
      const roomId = BigInt(payload.roomId)
      const roomChannel = getRoomChannel(roomId)

      const gameState = await this.gameService.startGame(roomId, userId)

      // Broadcast game started to all players in room
      this.server.to(roomChannel).emit(GameEvents.GAME_STARTED, gameState)

      this.logger.log(`Game started in room ${roomId}`)
      return { success: true, data: gameState }
    } catch (error) {
      this.logger.error(`Start game error: ${error.message}`)
      socket.emit(GameEvents.ERROR, { message: error.message })
      return { success: false, error: error.message }
    }
  }

  @SubscribeMessage(GameEvents.SELECT_ENVELOPE)
  async handleSelectEnvelope(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: SelectEnvelopePayload,
  ) {
    try {
      const userId = this.getUserId(socket, payload.userId)
      const roundId = BigInt(payload.roundId)

      const result = await this.gameService.selectEnvelope(
        roundId,
        {
          envelope: payload.envelope,
          receiverId: BigInt(payload.receiverId),
        },
        userId,
      )

      // Get room ID from the round
      const round = await this.gameService.getRound(roundId)
      const roomChannel = getRoomChannel(round.roomId)

      // Broadcast selection to all players
      this.server.to(roomChannel).emit(GameEvents.ENVELOPE_SELECTED, {
        selection: result.selection,
        nextTurn: result.nextTurn,
      })

      // If round completed, broadcast that too
      if (result.completedRound) {
        this.server.to(roomChannel).emit(GameEvents.ROUND_COMPLETED, {
          round: result.completedRound,
        })
      }

      this.logger.log(`Envelope selected in round ${roundId}`)
      return { success: true, data: result }
    } catch (error) {
      this.logger.error(`Select envelope error: ${error.message}`)
      socket.emit(GameEvents.ERROR, { message: error.message })
      return { success: false, error: error.message }
    }
  }

  @SubscribeMessage(GameEvents.ADVANCE_ROUND)
  async handleAdvanceRound(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() payload: RoomIdPayload) {
    try {
      const userId = this.getUserId(socket, payload.userId)
      const roomId = BigInt(payload.roomId)
      const roomChannel = getRoomChannel(roomId)

      const gameState = await this.gameService.advanceToNextRound(roomId, userId)

      // Check if game is over
      if (gameState.winner) {
        this.server.to(roomChannel).emit(GameEvents.GAME_OVER, gameState)
      } else {
        // New round started
        this.server.to(roomChannel).emit(GameEvents.TURN_CHANGED, gameState)
      }

      this.logger.log(`Round advanced in room ${roomId}`)
      return { success: true, data: gameState }
    } catch (error) {
      this.logger.error(`Advance round error: ${error.message}`)
      socket.emit(GameEvents.ERROR, { message: error.message })
      return { success: false, error: error.message }
    }
  }

  // ==================== SERVER BROADCAST METHODS ====================

  // Broadcast room state update to all players in a room
  broadcastRoomState(roomId: bigint, state: any) {
    const roomChannel = getRoomChannel(roomId)
    this.server.to(roomChannel).emit(GameEvents.ROOM_STATE, state)
  }

  // Broadcast turn change
  broadcastTurnChange(roomId: bigint, turnInfo: any) {
    const roomChannel = getRoomChannel(roomId)
    this.server.to(roomChannel).emit(GameEvents.TURN_CHANGED, turnInfo)
  }

  // Broadcast timeout warning (e.g., 10 seconds remaining)
  broadcastTimeoutWarning(roomId: bigint, secondsRemaining: number, playerId: bigint) {
    const roomChannel = getRoomChannel(roomId)
    this.server.to(roomChannel).emit(GameEvents.TIMEOUT_WARNING, {
      secondsRemaining,
      playerId: playerId.toString(),
    })
  }

  // Broadcast game over
  broadcastGameOver(roomId: bigint, finalState: any) {
    const roomChannel = getRoomChannel(roomId)
    this.server.to(roomChannel).emit(GameEvents.GAME_OVER, finalState)
  }

  // Get number of connected users in a room
  getRoomConnectionCount(roomId: bigint): number {
    const roomChannel = getRoomChannel(roomId)
    return this.roomConnections.get(roomChannel)?.size || 0
  }
}
