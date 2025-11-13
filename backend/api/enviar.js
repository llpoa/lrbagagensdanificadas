import multer from "multer";
import fetch from "node-fetch";
import nextConnect from "next-connect";

const upload = multer();

// Função para obter token fixo da conta Hotmail
async function getAccessToken() {
  const token = process.env.GRAPH_TOKEN;
  if (!token) throw new Error("Token da conta Hotmail não configurado.");
  return token;
}

async function uploadToOneDrive(token, localizador, file, index, total) {
  const extension = file.originalname.split(".").pop();
  let filename;
  if (total === 1) {
    filename = `${localizador}.${extension}`;
  } else {
    filename = `${localizador}(${index + 1}).${extension}`;
  }

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

async function sendMailWithAttachments(token, localizador, files) {
  const attachments = files.map((file, index) => {
    const extension = file.originalname.split(".").pop();
    let filename;
    if (files.length === 1) {
      filename = `${localizador}.${extension}`;
    } else {
      filename = `${localizador}(${index + 1}).${extension}`;
    }
    return {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: filename,
      contentBytes: file.buffer.toString("base64")
    };
  });

  const email = {
    message: {
      subject: localizador,
      body: {
        contentType: "Text",
        content: `Segue em anexo os arquivos referentes ao localizador ${localizador}`
      },
      toRecipients: [
        { emailAddress: { address: "ll.poa@voeazul.com.br" } }
      ],
      attachments
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

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Falha ao enviar e‑mail: ${resp.status} - ${text}`);
  }
}

const handler = nextConnect();

// aceitar múltiplos arquivos
handler.use(upload.array("arquivo"));

handler.post(async (req, res) => {
  try {
    const token = await getAccessToken();
    const localizador = (req.body.localizador || "").toUpperCase();
    const files = req.files || [];

    if (!localizador || localizador.length !== 6) {
      return res.status(400).json({ error: "Localizador inválido." });
    }
    if (files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const metas = [];
    for (let i = 0; i < files.length; i++) {
      const meta = await uploadToOneDrive(token, localizador, files[i], i, files.length);
      metas.push(meta);
    }

    await sendMailWithAttachments(token, localizador, files);

    res.status(200).json({ status: "ok", driveItems: metas.map(m => m.id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default handler;
