import { jsPDF } from "jspdf";

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(div => div.style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
}

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
        console.log(JSON.parse(raw).products);
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
        const dataJSON = JSON.parse(raw);

        const data = {
            client: client,
            products: dataJSON.products,
            slides: [...finalVersion.values()],
            MaaSinfo: dataJSON.maas,
            operationalCosts: dataJSON.operationalCosts,
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
            const names = data.map(item => item.section);
            data.forEach(presentation => {
                let tmp = new Map(presentation.slides.map(([key, value]) => [Number(key), value]));
                presentations.push(tmp);
            });
            let select = document.getElementById("presentationSelect");
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
        case "showOldPresentations": {
            const oldSelect = document.getElementById("oldPresentations");
            const data = JSON.parse(msg.data);
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = item.name;
                oldSelect.appendChild(option);
            });
            showScreen("fifth");

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
            try {
                await createPdf(msg.data.images, msg.data.name);
                parent.postMessage(
                    {
                        pluginMessage: {
                        type: "thatsAll",
                        }
                    },
                    "*"
                );
            }
            catch(error) {
                console.log(error);
                document.getElementById("errorMessage").innerHTML = error;
                showScreen("forth");
            }
            break;
        }
        default: {

        }
    }
};

function savePDF (prName) {
    showScreen("second");
    parent.postMessage(
        {
            pluginMessage: {
                type: "getImages",
                data: prName
            }
        },
        "*"
    );
}


window.addEventListener("DOMContentLoaded", (event) => {
    
    document.getElementById('savePDF').addEventListener("click", () => {
        savePDF(document.getElementById('presentationName').innerHTML);
    });
    document.getElementById('parserButton').addEventListener("click", somefunction);
    document.getElementById('otherbuttons').addEventListener("click", () => {
        showScreen("second");
        parent.postMessage({
            pluginMessage: { type: "getOldPresentations" }
        }, "*");
    });
    document.getElementById('saveOtherPDF').addEventListener("click", () => savePDF(document.getElementById('oldPresentations').value));
    document.getElementById('deleteOld').addEventListener("click", () => {
        parent.postMessage(
            { pluginMessage: { type: "deleteOld" } }, "*"
        );
    });
    document.getElementById('deleteKP').addEventListener("click", () => {
        parent.postMessage(
            { pluginMessage: { type: "deleteKP" } }, "*"
        );
    });
    showScreen("second");
});

let presentations = [];