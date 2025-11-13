import multer from "multer";
import fetch from "node-fetch";
import nextConnect from "next-connect";

const upload = multer();

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  return h.replace("Bearer ", "");
}

async function uploadToOneDrive(token, localizador, file) {
  const extension = file.originalname.split(".").pop();
  const filename = `${localizador}.${extension}`;
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/Evidencias/${filename}:/content`;

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/octet-stream"
    },
    body: file.buffer
  });

  if (!resp.ok) throw new Error(`Falha no upload: ${resp.status}`);
  return await resp.json();
}

async function sendMailWithAttachment(token, localizador, file) {
  const contentBytes = file.buffer.toString("base64");
  const email = {
    message: {
      subject: localizador,
      body: { contentType: "Text", content: `Segue em anexo o arquivo referente ao localizador ${localizador}` },
      toRecipients: [
        { emailAddress: { address: "ll.poa@voeazul.com.br" } }
      ],
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: file.originalname,
          contentBytes
        }
      ]
    },
    saveToSentItems: true
  };

  const resp = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(email)
  });

  if (!resp.ok) throw new Error(`Falha ao enviar e‑mail: ${resp.status}`);
}

const handler = nextConnect();

handler.use(upload.single("arquivo"));

handler.post(async (req, res) => {
  try {
    const token = getBearerToken(req);
    const localizador = (req.body.localizador || "").toUpperCase();
    const file = req.file;

    if (!token) return res.status(401).json({ error: "Token não enviado." });
    if (!localizador || localizador.length !== 6) {
      return res.status(400).json({ error: "Localizador inválido." });
    }
    if (!file) return res.status(400).json({ error: "Arquivo não enviado." });

    const driveMeta = await uploadToOneDrive(token, localizador, file);
    await sendMailWithAttachment(token, localizador, file);

    res.json({ status: "ok", driveItemId: driveMeta.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default handler;
