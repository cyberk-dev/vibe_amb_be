import { ParseBigIntPipe } from '@app/core/pipes/parse-bigint.pipe'
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
// TODO: Re-enable auth imports when auth is ready
// import { UseGuards } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
// import { ApiBearerAuth } from '@nestjs/swagger'
// import { JwtGuard } from '@app/auth/guards/jwt.guard'
// import { CurUser } from '@app/core/decorators/user.decorator'
// import { User } from '@prisma/client'
import { GameService } from './game.service'
import { CreateRoomDto } from './dtos/create-room.dto'
import { JoinRoomDto } from './dtos/join-room.dto'
import { SelectEnvelopeDto } from './dtos/select-envelope.dto'
import { GameRoomEntity, RoomJoinResponseEntity } from './entities/game-room.entity'
import { GameStateEntity, SelectionResultEntity } from './entities/game-state.entity'
import { GameRoundEntity } from './entities/game-round.entity'
import { TransformerExposeAll } from '@app/core/decorators/transformer-expose-all.decorator'

@Controller('game')
@ApiTags('Game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // ==================== ROOM MANAGEMENT ====================

  @Post('rooms')
  @ApiOperation({ summary: 'Create a new game room' })
  // @ApiBearerAuth()
  @ApiCreatedResponse({ type: () => RoomJoinResponseEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  createRoom(@Body() dto: CreateRoomDto, @Query('userId') userId?: string) {
    return this.gameService.createRoom(dto, userId ? BigInt(userId) : undefined)
  }

  @Get('rooms/:code')
  @ApiOperation({ summary: 'Get room info by code' })
  @ApiOkResponse({ type: () => GameRoomEntity })
  @TransformerExposeAll()
  getRoomByCode(@Param('code') code: string) {
    return this.gameService.getRoomByCode(code)
  }

  @Post('rooms/:code/join')
  @ApiOperation({ summary: 'Join a game room' })
  // @ApiBearerAuth()
  @ApiOkResponse({ type: () => RoomJoinResponseEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  joinRoom(@Param('code') code: string, @Body() dto: JoinRoomDto, @Query('userId') userId?: string) {
    return this.gameService.joinRoom(code, dto, userId ? BigInt(userId) : undefined)
  }

  @Post('rooms/:roomId/leave')
  @ApiOperation({ summary: 'Leave a game room (before game starts)' })
  // @ApiBearerAuth()
  @ApiOkResponse({ description: 'Successfully left the room' })
  // @UseGuards(JwtGuard)
  leaveRoom(@Param('roomId', ParseBigIntPipe) roomId: bigint, @Query('userId') userId?: string) {
    return this.gameService.leaveRoom(roomId, userId ? BigInt(userId) : undefined)
  }

  @Post('rooms/:roomId/start')
  @ApiOperation({ summary: 'Start the game (requires 4 players)' })
  // @ApiBearerAuth()
  @ApiOkResponse({ type: () => GameStateEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  startGame(@Param('roomId', ParseBigIntPipe) roomId: bigint, @Query('userId') userId?: string) {
    return this.gameService.startGame(roomId, userId ? BigInt(userId) : undefined)
  }

  // ==================== GAME STATE (POLLING) ====================

  @Get('rooms/:roomId/state')
  @ApiOperation({ summary: 'Get current game state (for polling)' })
  // @ApiBearerAuth()
  @ApiOkResponse({ type: () => GameStateEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  getGameState(@Param('roomId', ParseBigIntPipe) roomId: bigint, @Query('userId') userId?: string) {
    return this.gameService.getGameState(roomId, userId ? BigInt(userId) : undefined)
  }

  // ==================== ROUND ACTIONS ====================

  @Post('rounds/:roundId/select')
  @ApiOperation({ summary: 'Select an envelope and assign to a player' })
  // @ApiBearerAuth()
  @ApiOkResponse({ type: () => SelectionResultEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  selectEnvelope(
    @Param('roundId', ParseBigIntPipe) roundId: bigint,
    @Body() dto: SelectEnvelopeDto,
    @Query('userId') userId?: string,
  ) {
    return this.gameService.selectEnvelope(roundId, dto, userId ? BigInt(userId) : undefined)
  }

  @Get('rounds/:roundId')
  @ApiOperation({ summary: 'Get round details' })
  // @ApiBearerAuth()
  @ApiOkResponse({ type: () => GameRoundEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  getRound(@Param('roundId', ParseBigIntPipe) roundId: bigint) {
    return this.gameService.getRound(roundId)
  }

  @Post('rooms/:roomId/advance')
  @ApiOperation({ summary: 'Advance to next round (after reveal phase)' })
  // @ApiBearerAuth()
  @ApiOkResponse({ type: () => GameStateEntity })
  // @UseGuards(JwtGuard)
  @TransformerExposeAll()
  advanceToNextRound(@Param('roomId', ParseBigIntPipe) roomId: bigint, @Query('userId') userId?: string) {
    return this.gameService.advanceToNextRound(roomId, userId ? BigInt(userId) : undefined)
  }

  // ==================== INTERNAL (for scheduler/cron) ====================

  @Post('internal/process-timeouts')
  @ApiOperation({ summary: 'Process turn timeouts (internal use)' })
  @ApiOkResponse({ description: 'Processed timeout results' })
  processTimeouts() {
    return this.gameService.processTimeouts()
  }
}
