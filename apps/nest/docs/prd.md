# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Project: Lì Xì Battle Royale (Lucky Survivor)

**Version**: 2.0 (Generalized Draft)
**Last Updated**: 2026-01-17
**Language**: Vietnamese / English Technical Terms

---

## 1. TỔNG QUAN SẢN PHẨM (PRODUCT OVERVIEW)

### Concept

Mô phỏng trò chơi "Gắp thăm may mắn" (Russian Roulette style) dưới dạng các bao lì xì. 4 người chơi sẽ tham gia vào một đấu trường tâm lý, nơi họ phải quyết định số phận của mình và người khác thông qua việc chọn hoặc giú bao lì xì.

### Điểm khác biệt (Key Changes vs v1)

- **On-chain Randomness**: Sử dụng `aptos:randomness` để định đoạt kết quả Bom/Vàng công bằng tuyệt đối.
- **Turn-based**: Chơi theo lượt (Turn-based) thay vì Real-time 15s hỗn loạn.
- **Consolation Prize**: Người thua không mất trắng, nhận được phần thưởng an ủi tăng dần theo vòng.
- **Fixed Prize Pool**: Quỹ thưởng cố định từ ban tổ chức, không yêu cầu người dùng đặt cược (Free-to-play with Rewards).

---

## 2. LUỒNG NGƯỜI DÙNG (USER FLOW)

1.  **Login**: Kết nối ví Aptos (Petra, Martian, Pontem...).
2.  **Lobby**:
    - Người chơi nhấn "Join Queue".
    - Hệ thống hiển thị số lượng người đang chờ.
    - Khi đủ người (hoặc chốt sổ), hệ thống chia user vào các phòng (4 người/phòng).
3.  **Gameplay**:
    - **Round 1 (4 người)**: Random thứ tự -> Chọn bao -> Quay Randomness -> Loại 1 người -> 3 người còn lại Vote (Chia tiền/Đi tiếp).
    - **Round 2 (3 người)**: Tương tự -> Loại 1 người -> 2 người còn lại Vote.
    - **Round 3 (2 người)**: "Chung kết" -> Loại 1 người -> Người sống sót nhận giải nhất.
4.  **Payout**: Tiền thưởng được chuyển tự động vào ví sau khi game kết thúc hoặc có quyết định chia tiền.

---

## 3. CƠ CHẾ GAMEPLAY (GAME MECHANICS)

### 3.1. Thiết lập phòng (Setup)

- **Số lượng**: 4 người chơi/phòng.
- **Vật phẩm**: 4 Bao lì xì (Bên trong chứa trạng thái Bom hoặc Tiền, nhưng chưa được quyết định cho đến khi Reveal).
- **Thứ tự**: Hệ thống random thứ tự lượt chơi (Turn Order) off-chain.

### 3.2. Vòng chơi (Round Loop)

#### A. Giai đoạn Hành động (Action Phase)

- **Cơ chế**: Lần lượt từng người thực hiện hành động theo thứ tự.
- **Thời gian**: Tối đa **1 phút (60s)** cho mỗi lượt.
- **Hành động cho phép**:
  1.  **Assign Self**: Chọn 1 bao lì xì chưa có chủ cho chính mình.
  2.  **Assign Other**: Chọn 1 bao lì xì chưa có chủ và gí (ép) người chơi khác nhận.
- **Luật Timeout**: Nếu hết 60s mà người chơi chưa hành động -> **Xử thua ngay lập tức** (Eliminated) và bị kick khỏi phòng. Vòng chơi kết thúc sớm (hoặc xử lý tiếp tùy logic edge case).

#### B. Giai đoạn Công bố (Reveal Phase)

- Sau khi tất cả người chơi đã được gán bao lì xì:
  - Client/Server gọi Smart Contract tích hợp `aptos:randomness`.
  - Random ra 1 số (hoặc vị trí) tương ứng với **Bao chứa BOM**.
- **Kết quả**:
  - Người giữ **Bao BOM** -> **LOẠI (ELIMINATED)**. Nhận giải an ủi.
  - Những người còn lại -> **SỐNG (SURVIVOR)**.

#### C. Giai đoạn Đàm phán (Voting Phase)

- Chỉ diễn ra nếu còn > 1 người sống sót.
- Người chơi chọn:
  - **STOP (Chia tiền)**: Đồng ý dừng lại và chia đều quỹ còn lại.
  - **CONTINUE (Chiến tiếp)**: Muốn loại thêm người để nhận phần thưởng lớn hơn.
- **Quy tắc đồng thuận**:
  - Cần **100% người chơi chọn STOP** thì game mới dừng.
  - Nếu có ít nhất 1 người chọn CONTINUE -> Game sang Round tiếp theo.

---

## 4. CƠ CHẾ TRẢ THƯỞNG (ECONOMICS & PAYOUT)

### 4.1. Thông số đầu vào (Example)

- **Tổng quỹ (Campaign Pool)**: $200.
- **Số phòng dự kiến**: 7 phòng.
- **Quỹ mỗi phòng (Room Pot)**: $28 (Ví dụ).
- **Giải an ủi (Consolation Prizes - $C_k$)**:
  - Thua Round 1: $1.
  - Thua Round 2: $2.
  - Thua Round 3: $3.

### 4.2. Công thức phân phối

Giả sử quỹ phòng ban đầu là $P_{init}$.
Qua mỗi vòng $k$ (1, 2, 3), có 1 người bị loại nhận $C_k$.
Quỹ còn lại cho người sống: $P_{rem} = P_{init} - \sum C_{lost}$.

#### Kịch bản chi tiết:

1.  **Dừng sau Round 1 (3 người sống)**:

    - Người thua R1 nhận: $1.
    - Quỹ còn lại: $28 - $1 = $27.
    - Mỗi người sống nhận: $27 / 3 = **$9**.

2.  **Dừng sau Round 2 (2 người sống)**:

    - Người thua R1: $1.
    - Người thua R2: $2.
    - Quỹ còn lại: $28 - $1 - $2 = $25.
    - Mỗi người sống nhận: $25 / 2 = **$12.5**.

3.  **Đi đến cùng (Winner Takes All bên cạnh giải an ủi)**:
    - Người thua R1: $1.
    - Người thua R2: $2.
    - Người thua R3: $3.
    - Quỹ còn lại: $28 - $1 - $2 - $3 = $22.
    - Winner nhận: **$22**.

---

## 5. YÊU CẦU KỸ THUẬT (TECHNICAL SPECS)

### 5.1. Tech Stack

- **Frontend**: Next.js 14, TailwindCSS (UI đẹp, animation mượt), Aptos Wallet Adapter.
- **Backend**: NestJS (xử lý Game Loop, WebSocket, Queue).
- **Database**: PostgreSQL (Lưu user, history) + Redis (Lưu Room State/Session).
- **Blockchain**: Aptos Move Contract (Randomness & Prize Distribution).

### 5.2. Data Structures (Draft)

#### Room State (Redis/Memory)

```typescript
interface RoomState {
  id: string
  status: 'QUEUE' | 'PLAYING' | 'FINISHED'
  players: {
    address: string
    status: 'ACTIVE' | 'ELIMINATED'
    roundEliminated?: number
    assignedCardIndex?: number
  }[]
  currentTurnIndex: number // Index của người đang được action
  turnDeadline: number // Timestamp hết hạn (60s)
  cards: {
    index: number // 0, 1, 2, 3
    holderAddress: string | null
  }[]
  potInfo: {
    initial: number
    current: number
  }
}
```

### 5.3. Key Flows Logic

#### Queue & Matchmaking

1.  User `JoinQueue` -> Server lưu vào Redis List.
2.  Cronjob hoặc Event trigger check: Nếu `Queue.length >= 4` -> Pop 4 users -> Tạo RoomID -> Emit `GAME_START`.

#### Gameplay Loop (Turn-based)

1.  Server emit `TURN_START` cho User A.
2.  User A gửi `ACTION_ASSIGN` (Target Address, Card Index).
3.  Server validate -> Update State -> Emit `UPDATE_BOARD` -> Chuyển Turn User B.
4.  Khi tất cả Card đã có chủ -> Phase `REVEAL`.

#### Randomness Integration

1.  Server (hoặc 1 Client được chỉ định làm relayer) gọi transaction vào Smart Contract: `request_randomness()`.
2.  Contract dùng `aptos:randomness` sinh số ngẫu nhiên `rng`.
3.  `bomb_index = rng % 4`.
4.  Contract emit Event `BombRevealed(bomb_index)`.
5.  Server/Client listen event -> Xác định User đang giữ `bomb_index` -> Loại.

#### Payout

- Sau khi game kết thúc, Admin Server (Hot Wallet) thực hiện batch transfer hoặc Smart Contract tự động distribute (nếu quỹ nằm trong SC) cho tất cả người chơi theo kết quả.

---

## 6. SCOPE MVP (48H)

### Must Have (P0)

- [ ] Login Aptos Wallet.
- [ ] Lobby & Queue System (Simple FIFO).
- [ ] UI Game Board (Hiển thị 4 người, 4 bao).
- [ ] Logic Turn-based Assign bao (Socket.io).
- [ ] Logic Randomness (Tích hợp Aptos Randomness on Devnet/Testnet).
- [ ] Logic Voting.
- [ ] Mock Payout (Hiển thị số tiền thắng, chưa cần tích hợp Real Token transfer nếu không kịp, nhưng logic chia tiền phải đúng).

### Nice to Have (P1)

- [ ] Animation nổ bom hoành tráng.
- [ ] Sound/Music.
- [ ] History Dashboard.
- [ ] Auto-Payout thật bằng Token.
