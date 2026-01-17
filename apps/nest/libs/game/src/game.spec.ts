import { GameService } from './game.service'
import { TestContext, testHelper, UserContextTestType } from '@app/spec/test.helper'
import { INestApplication } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { CreateRoomDto } from './dtos/create-room.dto'
import { JoinRoomDto } from './dtos/join-room.dto'
import { GameModule } from './game.module'
import { Envelope, GamePhase, GameRoomStatus } from '@prisma/client'
import request from 'supertest'

// Type for select envelope request body (string version for HTTP)
interface SelectEnvelopeRequest {
  envelope: Envelope
  receiverId: string
}

// User context wrapper for no-auth testing (uses real users but passes userId via query)
interface SimpleUserContext {
  userId: string
  request: (method: 'get' | 'post' | 'put' | 'delete', path: string) => request.Test
}

describe('GameSpec', () => {
  let tc: TestContext
  let app: INestApplication
  let prismaService: PrismaService
  let gameService: GameService

  // 4 user accounts for full game testing (real users, no JWT auth)
  let user1: SimpleUserContext
  let user2: SimpleUserContext
  let user3: SimpleUserContext
  let user4: SimpleUserContext

  // Helper to convert UserContextTestType to SimpleUserContext
  const wrapUserContext = (userCtx: UserContextTestType): SimpleUserContext => {
    const userId = String(userCtx.userInfo.user!.id)
    return {
      userId,
      request: (method: 'get' | 'post' | 'put' | 'delete', path: string) => {
        const pathWithUserId = path.includes('?') ? `${path}&userId=${userId}` : `${path}?userId=${userId}`
        return request(app.getHttpServer())[method](pathWithUserId)
      },
    }
  }

  // Helper to create a new user context (creates real user in DB)
  const createUserContext = async (): Promise<SimpleUserContext> => {
    const userCtx = await tc.generateAcount()
    return wrapUserContext(userCtx)
  }

  beforeAll(async () => {
    tc = await testHelper.createContext({
      imports: [GameModule],
    })
    app = tc.app
    prismaService = app.get(PrismaService)
    gameService = app.get(GameService)

    // Generate 4 real test accounts and wrap them
    user1 = wrapUserContext(await tc.generateAcount())
    user2 = wrapUserContext(await tc.generateAcount())
    user3 = wrapUserContext(await tc.generateAcount())
    user4 = wrapUserContext(await tc.generateAcount())
  })

  afterAll(async () => {
    // Clean up game data
    await prismaService.gameRoundSelection.deleteMany({})
    await prismaService.gameRound.deleteMany({})
    await prismaService.gamePlayer.deleteMany({})
    await prismaService.gameRoom.deleteMany({})
    await tc?.clean()
  })

  // ==================== ROOM MANAGEMENT ====================

  describe('Room Management', () => {
    describe('Create Room', () => {
      test('Create:DisplayNameRequired', async () => {
        const res = await user1.request('post', '/game/rooms').send({} as CreateRoomDto)
        expect(res).toBeBad(/displayName should not be empty/)
      })

      test('Create:Success', async () => {
        const res = await user1.request('post', '/game/rooms').send({
          displayName: 'Player1',
        } as CreateRoomDto)

        expect(res).toBeCreated()
        expect(res.body.room).toBeDefined()
        expect(res.body.room.code).toHaveLength(6)
        expect(res.body.room.status).toBe(GameRoomStatus.WAITING)
        expect(res.body.room.currentPhase).toBe(GamePhase.WAITING_FOR_PLAYERS)
        expect(res.body.room.totalPrizeCents).toBe(2800)
        expect(res.body.player).toBeDefined()
        expect(res.body.player.displayName).toBe('Player1')
      })
    })

    describe('Get Room By Code', () => {
      let roomCode: string

      beforeAll(async () => {
        const res = await user1.request('post', '/game/rooms').send({
          displayName: 'Host',
        } as CreateRoomDto)
        roomCode = res.body.room.code
      })

      test('GetRoom:Success', async () => {
        const res = await user1.request('get', `/game/rooms/${roomCode}`)
        expect(res).toBeOK()
        expect(res.body.code).toBe(roomCode)
      })

      test('GetRoom:CaseInsensitive', async () => {
        const res = await user1.request('get', `/game/rooms/${roomCode.toLowerCase()}`)
        expect(res).toBeOK()
        expect(res.body.code).toBe(roomCode)
      })

      test('GetRoom:NotFound', async () => {
        const res = await user1.request('get', '/game/rooms/XXXXXX')
        expect(res).toBe404()
      })
    })

    describe('Join Room', () => {
      let roomCode: string
      let roomId: string

      beforeEach(async () => {
        const res = await user1.request('post', '/game/rooms').send({
          displayName: 'Host',
        } as CreateRoomDto)
        roomCode = res.body.room.code
        roomId = res.body.room.id
      })

      test('Join:Success', async () => {
        const res = await user2.request('post', `/game/rooms/${roomCode}/join`).send({
          displayName: 'Player2',
        } as JoinRoomDto)

        expect(res.statusCode).toBeLessThan(300) // 2xx response
        expect(res.body.player.displayName).toBe('Player2')
        expect(res.body.room.players).toHaveLength(2)
      })

      test('Join:AlreadyInRoom', async () => {
        // User1 created the room, so they're already in it
        const res = await user1.request('post', `/game/rooms/${roomCode}/join`).send({
          displayName: 'Host Again',
        } as JoinRoomDto)

        expect(res.statusCode).toBeLessThan(300) // 2xx response
        // Should return existing player, not create duplicate
        expect(res.body.player.displayName).toBe('Host')
      })

      test('Join:RoomFull', async () => {
        // Add 3 more players to fill the room
        await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
        await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
        await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

        // Create a 5th user and try to join
        const user5 = await createUserContext()
        const res = await user5.request('post', `/game/rooms/${roomCode}/join`).send({
          displayName: 'P5',
        })

        expect(res).toBeBad(/Room is full/)
      })
    })

    describe('Leave Room', () => {
      let roomId: string

      beforeEach(async () => {
        const res = await user1.request('post', '/game/rooms').send({
          displayName: 'Host',
        } as CreateRoomDto)
        roomId = res.body.room.id

        // User2 joins
        await user2.request('post', `/game/rooms/${res.body.room.code}/join`).send({
          displayName: 'Player2',
        })
      })

      test('Leave:Success', async () => {
        const res = await user2.request('post', `/game/rooms/${roomId}/leave`)
        expect(res.statusCode).toBeLessThan(300) // 2xx response
      })

      test('Leave:NotInRoom', async () => {
        const res = await user3.request('post', `/game/rooms/${roomId}/leave`)
        expect(res).toBeBad(/You are not in this room/)
      })
    })
  })

  // ==================== GAME START ====================

  describe('Game Start', () => {
    let roomCode: string
    let roomId: string

    beforeEach(async () => {
      const res = await user1.request('post', '/game/rooms').send({
        displayName: 'Player1',
      } as CreateRoomDto)
      roomCode = res.body.room.code
      roomId = res.body.room.id
    })

    test('Start:NotEnoughPlayers', async () => {
      const res = await user1.request('post', `/game/rooms/${roomId}/start`)
      expect(res).toBeBad(/Need exactly 4 players/)
    })

    test('Start:NotInRoom', async () => {
      // Add 3 more players
      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      // User5 (not in room) tries to start
      const user5 = await createUserContext()
      const res = await user5.request('post', `/game/rooms/${roomId}/start`)
      expect(res.statusCode).toBe(403) // Forbidden
    })

    test('Start:Success', async () => {
      // Add 3 more players
      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      const res = await user1.request('post', `/game/rooms/${roomId}/start`)
      expect(res.statusCode).toBeLessThan(300) // 2xx response
      expect(res.body.room.status).toBe(GameRoomStatus.PLAYING)
      expect(res.body.room.currentPhase).toBe(GamePhase.SELECTING_ENVELOPE)
      expect(res.body.room.currentRound).toBe(1)
      expect(res.body.currentRound).toBeDefined()
      expect(res.body.currentRound.turnOrder).toHaveLength(4)
      expect(res.body.currentRound.availableEnvelopes).toHaveLength(4)
    })

    test('Start:AlreadyStarted', async () => {
      // Add players and start
      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })
      await user1.request('post', `/game/rooms/${roomId}/start`)

      // Try to start again
      const res = await user1.request('post', `/game/rooms/${roomId}/start`)
      expect(res).toBeBad(/Game has already started/)
    })
  })

  // ==================== GAME STATE ====================

  describe('Game State', () => {
    let roomId: string
    let roomCode: string

    beforeEach(async () => {
      // Create room with 4 players and start
      const createRes = await user1.request('post', '/game/rooms').send({ displayName: 'P1' })
      roomCode = createRes.body.room.code
      roomId = createRes.body.room.id

      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })
      await user1.request('post', `/game/rooms/${roomId}/start`)
    })

    test('GetState:Success', async () => {
      const res = await user1.request('get', `/game/rooms/${roomId}/state`)
      expect(res).toBeOK()
      expect(res.body.room).toBeDefined()
      expect(res.body.players).toHaveLength(4)
      expect(res.body.currentRound).toBeDefined()
      expect(res.body.myPlayer).toBeDefined()
      expect(res.body.timeRemaining).toBeGreaterThan(0)
    })

    test('GetState:MyTurnCorrect', async () => {
      const res = await user1.request('get', `/game/rooms/${roomId}/state`)
      const currentTurnPlayerId = res.body.currentRound.currentTurnPlayerId

      // Check that myTurn is correct for each user
      const state1 = await user1.request('get', `/game/rooms/${roomId}/state`)
      const state2 = await user2.request('get', `/game/rooms/${roomId}/state`)
      const state3 = await user3.request('get', `/game/rooms/${roomId}/state`)
      const state4 = await user4.request('get', `/game/rooms/${roomId}/state`)

      // Only one player should have myTurn = true
      const myTurnCount = [state1, state2, state3, state4].filter((s) => s.body.myTurn).length
      expect(myTurnCount).toBe(1)
    })

    test('GetState:NotInRoom', async () => {
      const user5 = await createUserContext()
      const res = await user5.request('get', `/game/rooms/${roomId}/state`)
      expect(res.statusCode).toBe(403)
    })
  })

  // ==================== ENVELOPE SELECTION ====================

  describe('Envelope Selection', () => {
    let roomId: string
    let roomCode: string
    let roundId: string
    let players: any[]

    beforeEach(async () => {
      // Create room with 4 players and start
      const createRes = await user1.request('post', '/game/rooms').send({ displayName: 'P1' })
      roomCode = createRes.body.room.code
      roomId = createRes.body.room.id

      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      const startRes = await user1.request('post', `/game/rooms/${roomId}/start`)
      roundId = startRes.body.currentRound.id
      players = startRes.body.players
    })

    test('Select:NotYourTurn', async () => {
      // Get current state to find who's turn it is NOT
      const state = await user1.request('get', `/game/rooms/${roomId}/state`)
      const currentTurnPlayerId = state.body.currentRound.currentTurnPlayerId

      // Find a user who is not the current turn player
      const [notCurrentUser, receiverId] = findNotCurrentTurnUserSimple(
        [user1, user2, user3, user4],
        players,
        currentTurnPlayerId,
      )

      if (notCurrentUser) {
        const res = await notCurrentUser.request('post', `/game/rounds/${roundId}/select`).send({
          envelope: 'A',
          receiverId: String(receiverId),
        } as SelectEnvelopeRequest)

        expect(res).toBeBad(/It is not your turn/)
      }
    })

    test('Select:Success', async () => {
      // Get current state
      const state = await user1.request('get', `/game/rooms/${roomId}/state`)
      const currentTurnPlayerId = state.body.currentRound.currentTurnPlayerId
      const availableReceivers = state.body.currentRound.availableReceivers

      // Find the user who has the turn
      const currentUser = findCurrentTurnUserSimple([user1, user2, user3, user4], players, currentTurnPlayerId)

      if (currentUser) {
        const res = await currentUser.request('post', `/game/rounds/${roundId}/select`).send({
          envelope: 'A',
          receiverId: String(availableReceivers[0]),
        } as SelectEnvelopeRequest)

        expect(res.statusCode).toBeLessThan(300) // 2xx response
        expect(res.body.selection).toBeDefined()
        expect(res.body.selection.envelope).toBe('A')
      }
    })

    test('Select:EnvelopeAlreadyTaken', async () => {
      // First selection
      const state1 = await user1.request('get', `/game/rooms/${roomId}/state`)
      const currentUser1 = findCurrentTurnUserSimple(
        [user1, user2, user3, user4],
        players,
        state1.body.currentRound.currentTurnPlayerId,
      )

      if (currentUser1) {
        await currentUser1.request('post', `/game/rounds/${roundId}/select`).send({
          envelope: 'A',
          receiverId: String(state1.body.currentRound.availableReceivers[0]),
        } as SelectEnvelopeRequest)

        // Second selection - try to use same envelope
        const state2 = await user1.request('get', `/game/rooms/${roomId}/state`)
        const currentUser2 = findCurrentTurnUserSimple(
          [user1, user2, user3, user4],
          players,
          state2.body.currentRound.currentTurnPlayerId,
        )

        if (currentUser2) {
          const res = await currentUser2.request('post', `/game/rounds/${roundId}/select`).send({
            envelope: 'A', // Same envelope
            receiverId: String(state2.body.currentRound.availableReceivers[0]),
          } as SelectEnvelopeRequest)

          expect(res).toBeBad(/This envelope is already taken/)
        }
      }
    })

    test('Select:ReceiverAlreadyHasEnvelope', async () => {
      // First selection
      const state1 = await user1.request('get', `/game/rooms/${roomId}/state`)
      const firstReceiverId = String(state1.body.currentRound.availableReceivers[0])
      const currentUser1 = findCurrentTurnUserSimple(
        [user1, user2, user3, user4],
        players,
        state1.body.currentRound.currentTurnPlayerId,
      )

      if (currentUser1) {
        await currentUser1.request('post', `/game/rounds/${roundId}/select`).send({
          envelope: 'A',
          receiverId: firstReceiverId,
        } as SelectEnvelopeRequest)

        // Second selection - try to assign to same receiver
        const state2 = await user1.request('get', `/game/rooms/${roomId}/state`)
        const currentUser2 = findCurrentTurnUserSimple(
          [user1, user2, user3, user4],
          players,
          state2.body.currentRound.currentTurnPlayerId,
        )

        if (currentUser2) {
          const res = await currentUser2.request('post', `/game/rounds/${roundId}/select`).send({
            envelope: 'B',
            receiverId: firstReceiverId, // Same receiver
          } as SelectEnvelopeRequest)

          expect(res).toBeBad(/This player already has an envelope/)
        }
      }
    })
  })

  // ==================== FULL ROUND FLOW ====================

  describe('Full Round Flow', () => {
    test('CompleteRound:ThreeSelectionsCompleteRound', async () => {
      // Create and start game
      const createRes = await user1.request('post', '/game/rooms').send({ displayName: 'P1' })
      const roomCode = createRes.body.room.code
      const roomId = createRes.body.room.id

      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      const startRes = await user1.request('post', `/game/rooms/${roomId}/start`)
      const roundId = startRes.body.currentRound.id
      const players = startRes.body.players
      const users = [user1, user2, user3, user4]

      // Make 3 selections (4th player doesn't select, gets remaining envelope)
      for (let i = 0; i < 3; i++) {
        const state = await user1.request('get', `/game/rooms/${roomId}/state`)

        if (state.body.room.currentPhase !== GamePhase.SELECTING_ENVELOPE) {
          break
        }

        const currentTurnPlayerId = state.body.currentRound.currentTurnPlayerId
        const availableEnvelopes = state.body.currentRound.availableEnvelopes
        const availableReceivers = state.body.currentRound.availableReceivers

        const currentUser = findCurrentTurnUserSimple(users, players, currentTurnPlayerId)

        if (currentUser && availableEnvelopes.length > 0 && availableReceivers.length > 0) {
          await currentUser.request('post', `/game/rounds/${roundId}/select`).send({
            envelope: availableEnvelopes[0],
            receiverId: availableReceivers[0],
          })
        }
      }

      // Check that round completed and moved to REVEALING phase
      const finalState = await user1.request('get', `/game/rooms/${roomId}/state`)
      expect(finalState.body.room.currentPhase).toBe(GamePhase.REVEALING)
      expect(finalState.body.currentRound.eliminatedEnvelope).toBeDefined()
      expect(finalState.body.currentRound.eliminatedPlayer).toBeDefined()
    })
  })

  // ==================== ADVANCE ROUND ====================

  describe('Advance Round', () => {
    test('Advance:ToNextRound', async () => {
      // Create, start, and complete round 1
      const createRes = await user1.request('post', '/game/rooms').send({ displayName: 'P1' })
      const roomCode = createRes.body.room.code
      const roomId = createRes.body.room.id

      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      const startRes = await user1.request('post', `/game/rooms/${roomId}/start`)
      const roundId = startRes.body.currentRound.id
      const players = startRes.body.players
      const users = [user1, user2, user3, user4]

      // Complete round 1
      await completeRoundSimple(users, players, roomId, roundId, user1)

      // Check we're in REVEALING phase
      let state = await user1.request('get', `/game/rooms/${roomId}/state`)
      expect(state.body.room.currentPhase).toBe(GamePhase.REVEALING)

      // Advance to next round
      const advanceRes = await user1.request('post', `/game/rooms/${roomId}/advance`)
      expect(advanceRes.statusCode).toBeLessThan(300) // 2xx response

      // Verify we're in round 2
      state = await user1.request('get', `/game/rooms/${roomId}/state`)
      expect(state.body.room.currentRound).toBe(2)
      expect(state.body.room.currentPhase).toBe(GamePhase.SELECTING_ENVELOPE)

      // Should have 3 active players now
      const activePlayers = state.body.players.filter((p: any) => !p.isEliminated)
      expect(activePlayers).toHaveLength(3)
    })
  })

  // ==================== FULL GAME FLOW ====================

  describe('Full Game Flow', () => {
    test('FullGame:ThreeRoundsToWinner', async () => {
      // Create and start game
      const createRes = await user1.request('post', '/game/rooms').send({ displayName: 'P1' })
      const roomCode = createRes.body.room.code
      const roomId = createRes.body.room.id

      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      await user1.request('post', `/game/rooms/${roomId}/start`)
      const users = [user1, user2, user3, user4]

      // Play 3 rounds
      for (let roundNum = 1; roundNum <= 3; roundNum++) {
        let state = await user1.request('get', `/game/rooms/${roomId}/state`)
        const players = state.body.players
        const roundId = state.body.currentRound?.id

        if (!roundId || state.body.room.currentPhase === GamePhase.GAME_OVER) {
          break
        }

        // Complete the round
        await completeRoundSimple(users, players, roomId, roundId, user1)

        // Get state after round completion
        state = await user1.request('get', `/game/rooms/${roomId}/state`)

        if (state.body.room.currentPhase === GamePhase.REVEALING) {
          // Advance to next round or game over
          await user1.request('post', `/game/rooms/${roomId}/advance`)
        }
      }

      // Verify game is over
      const finalState = await user1.request('get', `/game/rooms/${roomId}/state`)
      expect(finalState.body.room.status).toBe(GameRoomStatus.FINISHED)
      expect(finalState.body.room.currentPhase).toBe(GamePhase.GAME_OVER)
      expect(finalState.body.winner).toBeDefined()
      expect(finalState.body.roundHistory).toHaveLength(3)

      // Verify prize distribution
      expect(finalState.body.roundHistory[0].prizeCents).toBe(100) // $1
      expect(finalState.body.roundHistory[1].prizeCents).toBe(200) // $2
      expect(finalState.body.roundHistory[2].prizeCents).toBe(300) // $3
    }, 30000) // Longer timeout for full game
  })

  // ==================== GET ROUND ====================

  describe('Get Round', () => {
    test('GetRound:Success', async () => {
      const createRes = await user1.request('post', '/game/rooms').send({ displayName: 'P1' })
      const roomCode = createRes.body.room.code
      const roomId = createRes.body.room.id

      await user2.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P2' })
      await user3.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P3' })
      await user4.request('post', `/game/rooms/${roomCode}/join`).send({ displayName: 'P4' })

      const startRes = await user1.request('post', `/game/rooms/${roomId}/start`)
      const roundId = startRes.body.currentRound.id

      const res = await user1.request('get', `/game/rounds/${roundId}`)
      expect(res).toBeOK()
      expect(res.body.roundNumber).toBe(1)
      expect(res.body.turnOrder).toBeDefined()
    })

    test('GetRound:NotFound', async () => {
      const res = await user1.request('get', '/game/rounds/999999')
      expect(res).toBe404()
    })
  })
})

// ==================== HELPER FUNCTIONS ====================

// Simple helper to find current turn user (matches by stored userId in player)
// Note: IDs might be numbers or strings, so we convert to string for comparison
function findCurrentTurnUserSimple(
  users: SimpleUserContext[],
  players: any[],
  currentTurnPlayerId: string | number,
): SimpleUserContext | undefined {
  const currentPlayer = players.find((p) => String(p.id) === String(currentTurnPlayerId))
  if (!currentPlayer) return undefined

  // Find user whose userId matches the player's stored userId
  return users.find((u) => String(currentPlayer.userId) === u.userId)
}

// Simple helper to find a user who is NOT the current turn player
function findNotCurrentTurnUserSimple(
  users: SimpleUserContext[],
  players: any[],
  currentTurnPlayerId: string | number,
): [SimpleUserContext | undefined, string] {
  for (const user of users) {
    const userPlayer = players.find((p) => String(p.userId) === user.userId)
    if (userPlayer && String(userPlayer.id) !== String(currentTurnPlayerId)) {
      // Find a receiver that's not this user
      const receiver = players.find((p) => String(p.id) !== String(userPlayer.id))
      return [user, String(receiver?.id) || '']
    }
  }
  return [undefined, '']
}

// Simple helper to complete a round
async function completeRoundSimple(
  users: SimpleUserContext[],
  players: any[],
  roomId: string,
  roundId: string,
  anyUser: SimpleUserContext,
): Promise<void> {
  const activePlayers = players.filter((p: any) => !p.isEliminated)
  const selectionsNeeded = activePlayers.length - 1

  for (let i = 0; i < selectionsNeeded; i++) {
    const state = await anyUser.request('get', `/game/rooms/${roomId}/state`)

    if (state.body.room.currentPhase !== GamePhase.SELECTING_ENVELOPE) {
      break
    }

    const currentTurnPlayerId = state.body.currentRound?.currentTurnPlayerId
    const availableEnvelopes = state.body.currentRound?.availableEnvelopes || []
    const availableReceivers = state.body.currentRound?.availableReceivers || []

    if (!currentTurnPlayerId || availableEnvelopes.length === 0 || availableReceivers.length === 0) {
      break
    }

    const currentUser = findCurrentTurnUserSimple(users, state.body.players, currentTurnPlayerId)

    if (currentUser) {
      await currentUser.request('post', `/game/rounds/${roundId}/select`).send({
        envelope: availableEnvelopes[0],
        receiverId: String(availableReceivers[0]), // Ensure receiver ID is a string
      })
    }
  }
}
