const VCT_TERMS = [
  "9-3 Curse", "ACE!", "Blind Kill", "Caster Curse", "Clutch 1v3",
  "Crowd Cheering", "Eco Frag", "Fake Site", "Fast Rotate", "Flawless Round",
  "Insane Flick", "Jett Diff", "Judge in Smoke", "Knife Kill", "Lineup Larry",
  "Map Point", "Match Point", "Neon Diff", "Ninja Defuse", "Odin Spam",
  "Overtime", "Player Whiff", "Reverse Sweep", "Sheriff 1-tap", "Spike Planted A",
  "Spike Planted B", "Tactical Timeout", "Tech Pause"
];

const ADMIN_PASS = "huatua";

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

function checkBingo(board, drawnNumbers) {
  const drawnSet = new Set(drawnNumbers);
  for (const line of winLines) {
    if (line.every(index => drawnSet.has(board[index]))) {
      return true;
    }
  }
  return false;
}

// Cloudflare Workers fetch event handler
export default {
  async fetch(request, env, ctx) {
    // env.BINGO_KV is the Cloudflare KV Namespace binding
    if (!env.BINGO_KV) {
      return new Response(JSON.stringify({ error: "❌ BINGO_KV namespace is not bound! Please set it up in wrangler.toml or Cloudflare Dashboard." }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const url = new URL(request.url);
    
    // 🌸 Serve static assets if not an API request and ASSETS binding is available
    if (!url.pathname.startsWith('/api') && env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    const path = url.pathname.replace(/^\/api/, '');
    const params = Object.fromEntries(url.searchParams);

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response("", { status: 200, headers });
    }

    // Helper functions for KV storage
    const getRoom = async (roomId) => {
      const data = await env.BINGO_KV.get(`room:${roomId}`);
      return data ? JSON.parse(data) : null;
    };

    const saveRoom = async (roomId, roomObj) => {
      await env.BINGO_KV.put(`room:${roomId}`, JSON.stringify(roomObj));
    };

    const getPlayers = async (roomId) => {
      const data = await env.BINGO_KV.get(`players:${roomId}`);
      return data ? JSON.parse(data) : {};
    };

    const savePlayers = async (roomId, playersObj) => {
      await env.BINGO_KV.put(`players:${roomId}`, JSON.stringify(playersObj));
    };

    const updatePendingWinners = async (roomId, room, players) => {
      const roomPlayers = Object.values(players);
      const newPending = [];

      for (const player of roomPlayers) {
        if (checkBingo(player.board, room.drawn_numbers)) {
          if (room.winner !== player.name) {
            newPending.push(player.name);
          }
        }
      }
      room.pending_winners = newPending;
      await saveRoom(roomId, room);
    };

    try {
      // 👤 JOIN ROOM
      if (path === "/join") {
        const name = (params.name || "").trim();
        const roomId = (params.room || "").trim();

        if (!name || !roomId) {
          return new Response(JSON.stringify({ error: "❌ กรุณากรอกชื่อและรหัสห้อง!" }), { status: 400, headers });
        }

        const room = await getRoom(roomId);
        if (!room) {
          return new Response(JSON.stringify({ error: "❌ ไม่พบรหัสห้องนี้!" }), { status: 404, headers });
        }

        const players = await getPlayers(roomId);
        const existingPlayer = players[name];

        if (existingPlayer) {
          return new Response(JSON.stringify({ board: existingPlayer.board }), { status: 200, headers });
        }

        // Generate new board
        let shuffled = [...VCT_TERMS].sort(() => Math.random() - 0.5).slice(0, 24);
        shuffled.splice(12, 0, "JJAZ");
        const board = shuffled;

        players[name] = { name, board };
        await savePlayers(roomId, players);
        await updatePendingWinners(roomId, room, players);

        return new Response(JSON.stringify({ board }), { status: 200, headers });
      }

      // 👤 GET STATUS
      if (path === "/status") {
        const roomId = (params.room || "").trim();
        const room = await getRoom(roomId);

        if (!room) {
          return new Response(JSON.stringify({}), { status: 200, headers });
        }

        const players = await getPlayers(roomId);
        await updatePendingWinners(roomId, room, players);

        return new Response(JSON.stringify({
          room_id: room.room_id,
          drawn_numbers: room.drawn_numbers.join('|'),
          winner: room.winner,
          pending_winners: room.pending_winners
        }), { status: 200, headers });
      }

      // 🛡️ ADMIN CHECK PASS
      const pwd = params.pwd;
      if (pwd !== ADMIN_PASS) {
        return new Response(JSON.stringify({ error: "❌ ไม่อนุญาต! รหัสผ่านแอดมินไม่ถูกต้อง" }), { status: 403, headers });
      }

      // 🛡️ CREATE ROOM
      if (path === "/create_room") {
        const roomId = (params.room || "").trim();
        if (!roomId) {
          return new Response(JSON.stringify({ error: "❌ กรุณาระบุรหัสห้อง" }), { status: 400, headers });
        }

        let room = await getRoom(roomId);
        if (!room) {
          room = {
            room_id: roomId,
            drawn_numbers: ["JJAZ"],
            winner: null,
            pending_winners: []
          };
          await saveRoom(roomId, room);
          await savePlayers(roomId, {});
        }

        return new Response(JSON.stringify({ success: true, message: "✅ เปิดห้องสำเร็จ!" }), { status: 200, headers });
      }

      // 🛡️ GET PLAYERS
      if (path === "/players") {
        const roomId = (params.room || "").trim();
        const players = await getPlayers(roomId);
        const playersList = Object.values(players).map(p => ({ name: p.name }));

        return new Response(JSON.stringify({ players: playersList }), { status: 200, headers });
      }

      // 🛡️ CALL EVENT
      if (path === "/call_event") {
        const roomId = (params.room || "").trim();
        const termToCall = params.term;

        const room = await getRoom(roomId);
        if (!room) {
          return new Response(JSON.stringify({ error: "❌ ไม่พบรหัสห้อง" }), { status: 404, headers });
        }

        if (!room.drawn_numbers.includes(termToCall)) {
          room.drawn_numbers.push(termToCall);
          const players = await getPlayers(roomId);
          await updatePendingWinners(roomId, room, players);
        }

        return new Response(JSON.stringify({ term: termToCall, drawn_numbers: room.drawn_numbers.join('|') }), { status: 200, headers });
      }

      // 🛡️ UNDO EVENT
      if (path === "/undo_event") {
        const roomId = (params.room || "").trim();
        const termToUndo = params.term;

        const room = await getRoom(roomId);
        if (!room) {
          return new Response(JSON.stringify({ error: "❌ ไม่พบรหัสห้อง" }), { status: 404, headers });
        }

        room.drawn_numbers = room.drawn_numbers.filter(t => t !== termToUndo && t !== "JJAZ");
        room.drawn_numbers.unshift("JJAZ");

        const players = await getPlayers(roomId);
        await updatePendingWinners(roomId, room, players);

        return new Response(JSON.stringify({ success: true, drawn_numbers: room.drawn_numbers.join('|') }), { status: 200, headers });
      }

      // 🛡️ APPROVE WINNER
      if (path === "/approve_winner") {
        const roomId = (params.room || "").trim();
        const winnerName = params.name;

        const room = await getRoom(roomId);
        if (!room) {
          return new Response(JSON.stringify({ error: "❌ ไม่พบรหัสห้อง" }), { status: 404, headers });
        }

        room.winner = winnerName;
        await saveRoom(roomId, room);

        return new Response(JSON.stringify({ success: true, winner: winnerName }), { status: 200, headers });
      }

      // 🛡️ RESET ROOM
      if (path === "/reset") {
        const roomId = (params.room || "").trim();

        await saveRoom(roomId, {
          room_id: roomId,
          drawn_numbers: ["JJAZ"],
          winner: null,
          pending_winners: []
        });
        await savePlayers(roomId, {});

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: "API Endpoint Not Found" }), { status: 404, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Internal Server Error", message: err.message }), { status: 500, headers });
    }
  }
};
