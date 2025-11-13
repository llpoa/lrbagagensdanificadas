import multer from "multer";
import fetch from "node-fetch";
import nextConnect from "next-connect";

const upload = multer();

// Função para obter token fixo da conta Hotmail
// Aqui você deve implementar a lógica para renovar o token usando refresh_token
// ou configurar como variável de ambiente. Para simplificação, estou assumindo
// que você já tem um access_token válido em process.env.GRAPH_TOKEN.
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
      subject: localizador, // título do e-mail = só o localizador
      body: {
        contentType: "Text",
        content: `Segue em anexo os arquivos referentes ao localizador ${localizador}`
      },
      toRecipients: [
        { emailAddress: { address: "ll.poa@voeazul.com.br" } } // destinatário fixo
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

// aceitar
