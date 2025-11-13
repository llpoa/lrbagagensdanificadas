// Configuração MSAL — IDs do Azure
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

// URL do backend
const BACKEND_URL = "https://lrbagagensdanificadas.vercel.app/api/enviar";

// Função para formatar localizador
function formatarLocalizador(input) {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Elementos principais
const enviarBtn = document.getElementById("enviarBtn");
const fileInput = document.getElementById("arquivo");
const preview = document.getElementById("preview");

// Pré-visualização com botão de apagar
fileInput.addEventListener("change", () => {
  preview.innerHTML = ""; // limpa pré-visualização
  const files = Array.from(fileInput.files);

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      // container da imagem
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
      wrapper.style.margin = "5px";

      // imagem
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "150px";
      img.style.border = "1px solid #ccc";
      img.style.borderRadius = "4px";

      // botão apagar
      const delBtn = document.createElement("span");
      delBtn.textContent = "X";
      delBtn.style.position = "absolute";
      delBtn.style.top = "5px";
      delBtn.style.right = "5px";
      delBtn.style.background = "red";
      delBtn.style.color = "white";
      delBtn.style.padding = "2px 5px";
      delBtn.style.cursor = "pointer";
      delBtn.style.fontWeight = "bold";
      delBtn.style.borderRadius = "3px";

      delBtn.onclick = () => {
        wrapper.remove();
        // remove também do input
        const dt = new DataTransfer();
        Array.from(fileInput.files).forEach((f, i) => {
          if (i !== index) dt.items.add(f);
        });
        fileInput.files = dt.files;
      };

      wrapper.appendChild(img);
      wrapper.appendChild(delBtn);
      preview.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
});

// Obter token MSAL
async function getToken() {
  try {
    const res = await msalInstance.acquireTokenSilent({ scopes: graphScopes });
    return res.accessToken;
  } catch {
    const res = await msalInstance.acquireTokenPopup({ scopes: graphScopes });
    return res.accessToken;
  }
}

// Enviar arquivos
enviarBtn.onclick = async () => {
  const localizador = document.getElementById("localizador").value.trim();
  const files = Array.from(fileInput.files);

  if (!localizador || localizador.length !== 6) {
    alert("Digite um Localizador válido com 6 caracteres.");
    return;
  }
  if (files.length === 0) {
    alert("Selecione pelo menos um arquivo.");
    return;
  }

  try {
    const token = await getToken();
    const formData = new FormData();

    files.forEach((file, index) => {
      let newName;
      if (files.length === 1) {
        newName = `${localizador}.jpg`;
      } else {
        newName = `${localizador}(${index + 1}).jpg`;
      }
      const renamedFile = new File([file], newName, { type: file.type });
      formData.append("arquivo", renamedFile);
    });

    // título do e-mail = apenas o localizador
    formData.append("localizador", localizador);

    const resp = await fetch(`${BACKEND_URL}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Erro no backend");
    alert("Arquivos salvos no OneDrive e e‑mail enviado!");
  } catch (e) {
    alert("Falha ao enviar: " + e.message);
  }
};
