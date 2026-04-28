import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

interface Room {
  id: string;
  users: { socketId: string; role: "interviewer" | "candidate" }[];
  createdAt: Date;
}

const rooms = new Map<string, Room>();

export function initSocketServer(httpServer: HTTPServer, clientUrl: string) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Create a new room
    socket.on("create-room", (roomId: string) => {
      rooms.set(roomId, {
        id: roomId,
        users: [{ socketId: socket.id, role: "interviewer" }],
        createdAt: new Date(),
      });
      socket.join(roomId);
      socket.emit("room-created", { roomId });
      console.log("Room created:", roomId);
    });

    // Join existing room
    socket.on("join-room", (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("room-error", { message: "Room not found. Check the Room ID." });
        return;
      }
      if (room.users.length >= 2) {
        socket.emit("room-error", { message: "Room is full. Only 2 people allowed." });
        return;
      }
      room.users.push({ socketId: socket.id, role: "candidate" });
      socket.join(roomId);
      socket.emit("room-joined", { roomId, role: "candidate" });
      // Tell the other person someone joined
      socket.to(roomId).emit("peer-joined", { socketId: socket.id });
      console.log("User joined room:", roomId);
    });

    // WebRTC Signaling — offer
    socket.on("signal-offer", ({ roomId, offer }: { roomId: string; offer: any }) => {
      socket.to(roomId).emit("signal-offer", { offer, from: socket.id });
    });

    // WebRTC Signaling — answer
    socket.on("signal-answer", ({ roomId, answer }: { roomId: string; answer: any }) => {
      socket.to(roomId).emit("signal-answer", { answer, from: socket.id });
    });

    // WebRTC Signaling — ICE candidates
    socket.on("signal-ice", ({ roomId, candidate }: { roomId: string; candidate: any }) => {
      socket.to(roomId).emit("signal-ice", { candidate, from: socket.id });
    });

    // Chat message during interview
    socket.on("chat-message", ({ roomId, message, sender }: { roomId: string; message: string; sender: string }) => {
      io.to(roomId).emit("chat-message", { message, sender, time: new Date().toISOString() });
    });

    // End interview
    socket.on("end-interview", (roomId: string) => {
      io.to(roomId).emit("interview-ended");
      rooms.delete(roomId);
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      rooms.forEach((room, roomId) => {
        const idx = room.users.findIndex(u => u.socketId === socket.id);
        if (idx !== -1) {
          room.users.splice(idx, 1);
          socket.to(roomId).emit("peer-left");
          if (room.users.length === 0) {
            rooms.delete(roomId);
            console.log("Room deleted:", roomId);
          }
        }
      });
    });
  });

  // Clean up old empty rooms every 30 mins
  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    rooms.forEach((room, id) => {
      if (room.createdAt.getTime() < cutoff) rooms.delete(id);
    });
  }, 30 * 60 * 1000);

  return io;
}
