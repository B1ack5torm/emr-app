const net = require("net");

const PORT = process.env.PORT || 2575;
const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);

const server = net.createServer((socket) => {
  console.log("\n=== New connection from", socket.remoteAddress, "===");
  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();
    if (buffer.includes(FS)) {
      const message = buffer.replace(new RegExp(`[${VT}${FS}${CR}]`, "g"), "\n").trim();
      console.log("\n--- Received HL7 Message ---");
      console.log(message);
      console.log("----------------------------\n");

      const mshLine = buffer.split(CR).find((l) => l.startsWith("MSH")) || "";
      const fields = mshLine.split("|");
      const controlId = fields[9] || "1";
      const now = new Date();
      const p = (n) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;

      const ack =
        [`MSH|^~\\&|TESTLISTENER|MWL|CARECHART|HOSPITAL|${ts}||ACK|${controlId}A|P|2.3`, `MSA|AA|${controlId}`].join(CR) + CR;

      socket.write(VT + ack + FS + CR);
      buffer = "";
    }
  });

  socket.on("error", (err) => console.error("Socket error:", err.message));
  socket.on("close", () => console.log("Connection closed."));
});

server.listen(PORT, () => {
  console.log(`Test MLLP listener running on port ${PORT}`);
  console.log(`Set MLLP_HOST=localhost and MLLP_PORT=${PORT} in your .env`);
});