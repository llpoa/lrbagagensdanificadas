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
  preview.innerHTML = "";
  const files = Array.from(fileInput.files);

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
      wrapper.style.margin = "5px";

      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "150px";
      img.style.border = "1px solid #ccc";
      img.style.borderRadius = "4px";

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

    formData.append("localizador", localizador);

    const resp = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData
    });

    const data = await resp.json(); // lê apenas uma vez

    if (!resp.ok) throw new Error(data.error || "Erro no backend");
    alert("Arquivos salvos no OneDrive e e‑mail enviado!");
  } catch (e) {
    alert("Falha ao enviar: " + e.message);
  }
};

