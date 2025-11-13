// Configuração MSAL — vamos preencher na Parte 3 com seus IDs do Azure
const msalConfig = {
  auth: {
    clientId: "dcdf4c14-16f6-4c92-b736-d8e65a2816ab",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://lrbagagensdanificadas.vercel.app/"
  },
  cache: { cacheLocation: "sessionStorage" }
};
const msalInstance = new msal.PublicClientApplication(msalConfig);

// Escopos para Graph
const graphScopes = ["Files.ReadWrite", "Mail.Send"];

// URL do backend — vamos preencher na Parte 4 com a URL do Vercel
const BACKEND_URL = "https://lrbagagensdanificadas.vercel.app/api/enviar";

function formatarLocalizador(input) {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  document.getElementById("preview-localizador").innerText = "Localizador: " + input.value;
}

document.getElementById("arquivo").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById("preview-img");
      img.src = e.target.result;
      img.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    document.getElementById("preview-img").style.display = "none";
  }
});

const enviarBtn = document.getElementById("enviarBtn");
const fileInput = document.getElementById("arquivo");
const preview = document.getElementById("preview");

fileInput.addEventListener("change", () => {
  preview.innerHTML = ""; // limpa pré-visualização
  const files = Array.from(fileInput.files); // pega todos os arquivos

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement("img");
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

const userInfo = document.getElementById("userInfo");

loginBtn.onclick = async () => {
  try {
    await msalInstance.loginPopup({ scopes: graphScopes });
    const account = msalInstance.getAllAccounts()[0];
    userInfo.textContent = `Logada: ${account?.username || ""}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } catch (e) {
    alert("Falha no login: " + e.message);
  }
};

logoutBtn.onclick = () => {
  const account = msalInstance.getAllAccounts()[0];
  if (account) msalInstance.logoutPopup({ account });
  userInfo.textContent = "";
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
};

async function getToken() {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Faça login primeiro.");
  try {
    const res = await msalInstance.acquireTokenSilent({ account, scopes: graphScopes });
    return res.accessToken;
  } catch {
    const res = await msalInstance.acquireTokenPopup({ scopes: graphScopes });
    return res.accessToken;
  }
}

enviarBtn.onclick = async () => {
  const localizador = document.getElementById("localizador").value;
  const arquivo = document.getElementById("arquivo").files[0];

  if (!localizador || localizador.length !== 6) {
    alert("Digite um Localizador válido com 6 caracteres.");
    return;
  }
  if (!arquivo) {
    alert("Selecione um arquivo.");
    return;
  }

  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append("localizador", localizador);
    formData.append("arquivo", arquivo);

    const resp = await fetch(`${BACKEND_URL}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Erro no backend");
    alert("Arquivo salvo no OneDrive e e‑mail enviado!");
  } catch (e) {
    alert("Falha ao enviar: " + e.message);
  }
};
