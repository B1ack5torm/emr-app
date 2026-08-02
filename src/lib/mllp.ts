import net from "net";

const VT = String.fromCharCode(0x0b);
const FS = String.fromCharCode(0x1c);
const CR = String.fromCharCode(0x0d);

export function sendHL7ViaMLLP(host: string, port: number, message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const framed = VT + message + FS + CR;
    let responseData = "";

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("Timed out waiting for ACK from MLLP endpoint."));
    }, 10000);

    client.connect(port, host, () => {
      client.write(framed, "utf8");
    });

    client.on("data", (data) => {
      responseData += data.toString();
      if (responseData.includes(FS)) {
        clearTimeout(timeout);
        client.end();
        resolve(responseData.replace(new RegExp(`[${VT}${FS}${CR}]`, "g"), ""));
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}