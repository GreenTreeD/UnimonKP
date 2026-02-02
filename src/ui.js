import { jsPDF } from "jspdf";

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(div => div.style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
}

/*
function renderSlides(presentationList) {
    const slidesList = document.querySelector(".slidesList");
    slidesList.innerHTML = "";
    presentationList.forEach(presentation => {
    const presentDiv = document.createElement("div");
    presentDiv.style.display = 'none';
    presentation.forEach(slide => {

    });
    });
    
    slides.forEach(slide => {
    const row = document.createElement("div");
    row.className = "slideRow";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = slide.selected;
    checkbox.onchange = () => slide.selected = checkbox.checked;
    checkbox.id = slide['id'];
    var img = document.createElement('img');
    img.src = slide['img'];
    img.className = "slidePreview";
    
    row.appendChild(checkbox);
    row.appendChild(img);
    slidesList.appendChild(row);
    });
}

renderSlides(slides);
*/

/*document.getElementById('deleteOld').addEventListener("click", () => {
    parent.postMessage(
        {
        pluginMessage: {
            type: "deleteOld",
        }
        },
        "*"
    );
});

document.getElementById('deleteKP').addEventListener("click", () => {
    parent.postMessage(
        {
        pluginMessage: {
            type: "deleteKP",
        }
        },
        "*"
    );
});
*/

async function createPdf(images, name) {
    
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1920, 1080]
    });

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const blob = new Blob([img.bytes], { type: "image/png" });
        const url = URL.createObjectURL(blob);

        const imgEl = await loadImage(url);

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (imgEl.height * pageWidth) / imgEl.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgEl, "PNG", 0, 0, pageWidth, pageHeight);

        URL.revokeObjectURL(url);
    }

    pdf.save(`${name}.pdf`);
}

function loadImage(src) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
    });
}

async function somefunction() {
    let raw = document.getElementById("parserText").value;
    let text = undefined;
    showScreen("second");

    try {
        const selectedPresentation = presentations[Number(document.getElementById("presentationSelect").value)];
        const client = document.getElementById("client").value;
        if (!client) {
            throw new Error("Укажите клиента");
        }

        let finalVersion = new Map([...selectedPresentation]);
        (presentations[0]).forEach((value, key) => {
            if (!finalVersion.has(key)) {
                finalVersion.set(key, value);
            }
        });
        finalVersion = new Map([...finalVersion.entries()].sort(([keyA], [keyB]) => keyA - keyB));

        const ifMaas = document.getElementById('ifMaaS').checked;

        const data = {
            client: client,
            products: JSON.parse(raw),
            slides: [...finalVersion.values()],
            ifMaas: ifMaas,
            creator: document.getElementById('workerSelect').value
        };

        parent.postMessage(
            {
                pluginMessage: {
                    type: "my-json",
                    data
                }
            },
            "*"
        );
    } catch (error) {
        document.getElementById("errorMessage").innerHTML = error;
        showScreen("forth");
    }
}


window.onmessage = async (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    switch (msg.type) {
        case "slides": {
            const data = JSON.parse(msg.data);
            //console.log(data);
            const names = data.map(item => item.section);
            data.forEach(presentation => {
                let tmp = new Map(presentation.slides.map(([key, value]) => [Number(key), value]));
                presentations.push(tmp);
            });
            select = document.getElementById("presentationSelect");
            let i = 0;
            names.forEach(name => {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = name;
                select.appendChild(option);
                i += 1;
            });
            showScreen("first");
            break;
        }
        case "presentationCreated": {
            document.getElementById("presentationName").innerHTML = msg.data;
            showScreen("third");
            break;
        }
        case "showError": {
            showScreen("forth");
            break;
        }
        case "imagesReady": {
            await createPdf(msg.data, document.getElementById('presentationName').innerHTML);
            parent.postMessage(
                {
                    pluginMessage: {
                        type: "thatsAll",
                    }
                },
                "*"
            );
            break;
        }
        default: {

        }
    }
};

window.addEventListener("DOMContentLoaded", () => {
    
});

document.getElementById('parserButton').addEventListener("click", somefunction );

document.getElementById('savePDF').addEventListener("click", () => {
    showScreen("second");
    parent.postMessage(
        {
            pluginMessage: {
                type: "getImages",
                data: document.getElementById('presentationName').innerHTML
            }
        },
        "*"
    );
});
let presentations = [];
showScreen("second");
console.log("АЛООО БЛЯЯЯ");