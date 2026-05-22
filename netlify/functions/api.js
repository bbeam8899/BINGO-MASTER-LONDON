const VCT_TERMS = [
  "9-3 Curse", "ACE!", "Blind Kill", "Caster Curse", "Clutch 1v3",
  "Crowd Cheering", "Eco Frag", "Fake Site", "Fast Rotate", "Flawless Round",
  "Insane Flick", "Jett Diff", "Judge in Smoke", "Knife Kill", "Lineup Larry",
  "Map Point", "Match Point", "Neon Diff", "Ninja Defuse", "Odin Spam",
  "Overtime", "Player Whiff", "Reverse Sweep", "Sheriff 1-tap", "Spike Planted A",
  "Spike Planted B", "Tactical Timeout", "Tech Pause"
];

const ADMIN_PASS = "huatua";

// 5x5 Grid Winning Lines
const winLines = [
  [0, 1, 2, 3, 4],     // Horizontal 1
  [5, 6, 7, 8, 9],     // Horizontal 2
  [10, 11, 12, 13, 14], // Horizontal 3
  [15, 16, 17, 18, 19], // Horizontal 4
  [20, 21, 22, 23, 24], // Horizontal 5
  [0, 5, 10, 15, 20],   // Vertical 1
  [1, 6, 11, 16, 21],   // Vertical 2
  [2, 7, 12, 17, 22],   // Vertical 3
  [3, 8, 13, 18, 23],   // Vertical 4
  [4, 9, 14, 19, 24],   // Vertical 5
  [0, 6, 12, 18, 24],   // Diagonal \
  [4, 8, 12, 16, 20]    // Diagonal /
];

// In-Memory Database (persisted in the global scope of the container instance)
if (!global.bingoStore) {
  global.bingoStore = {
    rooms: {},    // roomId -> { room_id, drawn_numbers: [], winner: null, pending_winners: [] }
    players: {}   // roomId -> { name -> { name, board: [] } }
  };
}
const store = global.bingoStore;

// Helper to check if a board has achieved Bingo
function checkBingo(board, drawnNumbers) {
  const drawnSet = new Set(drawnNumbers);
  for (const line of winLines) {
    if (line.every(index => drawnSet.has(board[index]))) {
      return true;
    }
  }
  return false;
}

// Helper to scan players and update the pending winners list for a room
function updatePendingWinners(roomId) {
  const room = store.rooms[roomId];
  if (!room) return;

  const roomPlayers = store.players[roomId] ? Object.values(store.players[roomId]) : [];
  const newPending = [];

  for (const player of roomPlayers) {
    // If they have achieved Bingo, and are not the official winner yet
    if (checkBingo(player.board, room.drawn_numbers)) {
      if (room.winner !== player.name) {
        newPending.push(player.name);
      }
    }
  }
  room.pending_winners = newPending;
}

exports.handler = async (event, context) => {
  const urlPath = event.path;
  const path = urlPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  const params = event.queryStringParameters || {};
  
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // ==========================================
    // 👤 API: Player-Facing Endpoints
    // ==========================================
    
    // 👤 JOIN ROOM
    if (path === "/join") {
      const name = (params.name || "").trim();
      const roomId = (params.room || "").trim();

      if (!name || !roomId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "❌ กรุณากรอกชื่อและรหัสห้อง!" }) };
      }

      const room = store.rooms[roomId];
      if (!room) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "❌ ไม่พบรหัสห้องนี้!" }) };
      }

      // Initialize players mapping for room if needed
      if (!store.players[roomId]) {
        store.players[roomId] = {};
      }

      // Check if existing player
      const existingPlayer = store.players[roomId][name];
      if (existingPlayer) {
        return { 
          statusCode: 200, 
          headers, 
          body: JSON.stringify({ board: existingPlayer.board }) 
        };
      }

      // Create new board
      let shuffled = [...VCT_TERMS].sort(() => Math.random() - 0.5).slice(0, 24);
      shuffled.splice(12, 0, "JJAZ"); // Center tile (Free Space)
      const board = shuffled;

      store.players[roomId][name] = { name, board };
      
      // Update pending winners list immediately when joining (in case game is already active)
      updatePendingWinners(roomId);

      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ board }) 
      };
    }

    // 👤 GET STATUS
    if (path === "/status") {
      const roomId = (params.room || "").trim();
      const room = store.rooms[roomId];

      if (!room) {
        return { 
          statusCode: 200, 
          headers, 
          body: JSON.stringify({}) 
        };
      }

      // Live scan and update pending winners list to guarantee real-time synchronization
      updatePendingWinners(roomId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          room_id: room.room_id,
          drawn_numbers: room.drawn_numbers.join('|'),
          winner: room.winner,
          pending_winners: room.pending_winners
        })
      };
    }

    // ==========================================
    // 🛡️ API: Admin-Facing Endpoints (Password Protected)
    // ==========================================
    const pwd = params.pwd;
    if (pwd !== ADMIN_PASS) {
      return { 
        statusCode: 403, 
        headers, 
        body: JSON.stringify({ error: "❌ ไม่อนุญาต! รหัสผ่านแอดมินไม่ถูกต้อง" }) 
      };
    }

    // 🛡️ CREATE ROOM
    if (path === "/create_room") {
      const roomId = (params.room || "").trim();
      if (!roomId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "❌ กรุณาระบุรหัสห้อง" }) };
      }

      if (!store.rooms[roomId]) {
        store.rooms[roomId] = {
          room_id: roomId,
          drawn_numbers: ["JJAZ"],
          winner: null,
          pending_winners: []
        };
        store.players[roomId] = {};
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "✅ เปิดห้องสำเร็จ!" })
      };
    }

    // 🛡️ GET PLAYERS IN ROOM
    if (path === "/players") {
      const roomId = (params.room || "").trim();
      const playersMap = store.players[roomId] || {};
      const playersList = Object.values(playersMap).map(p => ({ name: p.name }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ players: playersList })
      };
    }

    // 🛡️ CALL EVENT (DRAW WORD)
    if (path === "/call_event") {
      const roomId = (params.room || "").trim();
      const termToCall = params.term;

      const room = store.rooms[roomId];
      if (!room) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "❌ ไม่พบรหัสห้อง" }) };
      }

      if (!room.drawn_numbers.includes(termToCall)) {
        room.drawn_numbers.push(termToCall);
        updatePendingWinners(roomId);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ term: termToCall, drawn_numbers: room.drawn_numbers.join('|') })
      };
    }

    // 🛡️ UNDO EVENT
    if (path === "/undo_event") {
      const roomId = (params.room || "").trim();
      const termToUndo = params.term;

      const room = store.rooms[roomId];
      if (!room) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "❌ ไม่พบรหัสห้อง" }) };
      }

      room.drawn_numbers = room.drawn_numbers.filter(t => t !== termToUndo && t !== "JJAZ");
      room.drawn_numbers.unshift("JJAZ"); // ensure JJAZ remains at index 0

      updatePendingWinners(roomId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, drawn_numbers: room.drawn_numbers.join('|') })
      };
    }

    // 🛡️ APPROVE WINNER (CROWN BINGO)
    if (path === "/approve_winner") {
      const roomId = (params.room || "").trim();
      const winnerName = params.name;

      const room = store.rooms[roomId];
      if (!room) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "❌ ไม่พบรหัสห้อง" }) };
      }

      // Crown the official winner
      room.winner = winnerName;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, winner: winnerName })
      };
    }

    // 🛡️ RESET ROOM
    if (path === "/reset") {
      const roomId = (params.room || "").trim();

      if (store.rooms[roomId]) {
        store.rooms[roomId].drawn_numbers = ["JJAZ"];
        store.rooms[roomId].winner = null;
        store.rooms[roomId].pending_winners = [];
      }
      store.players[roomId] = {};

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "API Endpoint Not Found" })
    };

  } catch (err) {
    console.error("API Error: ", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", message: err.message })
    };
  }
};
