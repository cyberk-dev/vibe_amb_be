// WebSocket event names
export const GameEvents = {
  // Client -> Server events
  JOIN_ROOM: 'game:join_room',
  LEAVE_ROOM: 'game:leave_room',
  START_GAME: 'game:start',
  SELECT_ENVELOPE: 'game:select_envelope',
  ADVANCE_ROUND: 'game:advance_round',

  // Server -> Client events
  ROOM_STATE: 'game:room_state',
  PLAYER_JOINED: 'game:player_joined',
  PLAYER_LEFT: 'game:player_left',
  GAME_STARTED: 'game:started',
  TURN_CHANGED: 'game:turn_changed',
  ENVELOPE_SELECTED: 'game:envelope_selected',
  ROUND_COMPLETED: 'game:round_completed',
  GAME_OVER: 'game:game_over',
  ERROR: 'game:error',
  TIMEOUT_WARNING: 'game:timeout_warning',
} as const

// Room namespace prefix
export const ROOM_PREFIX = 'room:'

// Helper to get room channel name
export const getRoomChannel = (roomId: bigint | string) => `${ROOM_PREFIX}${roomId}`
