
import { initResources, getContactSlides, getMaaSpage, getProductSlides, yieldToFigma } from "./utils.js";
import { findSlide, createKPSlide, createRentalSlide, loadAllSlides, loadOldSlides, createOperationalCostsSlide} from "./slides.js";


async function init() {
  figma.notify("Загрузка плагина, всё нормик :)");

  const checkRes = await initResources();
  yieldToFigma();
  if (!checkRes.allFound) {
    figma.notify("Нет ресурсов для КП");
    return;
  }

  const presentations = await loadAllSlides();
  if (!presentations) {
    figma.notify("Нет ресурсов для КП");
    return;
  }

  figma.showUI(__html__, { width: 320, height: 420 });

  figma.ui.postMessage({
    type:"slides",
    data: JSON.stringify(presentations)
  });
}



init();



figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "my-json" :
      {
        const data = msg.data;

        try {

          let newPage = figma.createPage();
          let curDate = new Date();
          newPage.name = String(`${data['client']} ${String(curDate.getHours()).padStart(2, '0')}:${String(curDate.getMinutes()).padStart(2, '0')} ${String(curDate.getDate()).padStart(2, '0')}.${String(curDate.getMonth()+1).padStart(2, '0')}.${curDate.getFullYear()}`);

          if (!data['slides']) {
            figma.notify("Пустая презентация");
            throw new Error("Empty presentation");
          };

          // слайды из презентации
          let slideNum = 1;
          let y = 0;
          
          //console.log("Копирование базовой презентации1");
          for (const slideID of data['slides']) {
            const slideTarget = await findSlide(slideID);
            if (!slideTarget) {
              figma.notify("Нет слайда");
              throw new Error(`No slide for ${slideID}`);
            }
            const slideClone = slideTarget.clone();
            slideClone.name = `${slideNum}`;
            newPage.appendChild(slideClone);
            slideClone.x = 0;
            slideClone.y = y;
            y += slideClone.height + 60;
            slideNum+=1;
            
            yieldToFigma();
          }
          //console.log("Копирование базовой презентации2");

          // слайды с описанием оборудования
          const productSlides = getProductSlides();
          for (const element of (data['products'] || [])) {
            let productSlide = productSlides.findOne(node => node.name === element[0]);
            if (productSlide) {
             const productSlideClone = productSlide.clone();
              newPage.appendChild(productSlideClone);
              productSlideClone.name = `${slideNum}`;
              productSlideClone.x = 0;
              productSlideClone.y = y;
              y += productSlideClone.height + 60;
              slideNum+=1;      
            }
            yieldToFigma();
          }

          // слайд с кп
          let KPframe = await createKPSlide(data['products']);
          const KPclone = KPframe.clone();
          newPage.appendChild(KPclone);
          KPclone.name = `${slideNum}`;
          KPclone.x = 0;
          KPclone.y = y;

          y += KPclone.height + 60;
          slideNum+=1;
          yieldToFigma();

          // слайд про эксплуатационные расходы
          //console.log(data["operationalCosts"]);
          const operationalCostsclone = await createOperationalCostsSlide(data["operationalCosts"]);
          newPage.appendChild(operationalCostsclone);
          operationalCostsclone.name = `${slideNum}`;
          operationalCostsclone.x = 0;
          operationalCostsclone.y = y;

          y += operationalCostsclone.height + 60;
          slideNum+=1;
          //console.log("слайд про operationalCosts2");
          yieldToFigma();

          // слайд rental
          //console.log("слайд rental1");
          const rentalClone = await createRentalSlide(data['MaaSinfo']);
          newPage.appendChild(rentalClone);
          rentalClone.name = `${slideNum}`;
          rentalClone.x = 0;
          rentalClone.y = y;

          y += rentalClone.height + 60;
          slideNum+=1;
          //console.log("слайд rental2");

          yieldToFigma();

          //console.log("слайд про МааС1");
          // слайд про МааС
          const MaaSclone = getMaaSpage().clone();
          newPage.appendChild(MaaSclone);
          MaaSclone.name = `${slideNum}`;
          MaaSclone.x = 0;
          MaaSclone.y = y;

          y += MaaSclone.height + 60;
          slideNum+=1;
          //console.log("слайд про МааС2");

          yieldToFigma();

          //console.log("слайд про operationalCosts1");
     

          // слайд с контактами
          const contactSlides = getContactSlides();
          const contactSlide = contactSlides.children.find(node => node.name === data['creator']);
          if (!contactSlide) {
            throw new Error("No contact slide");
          }
          const contactClone = contactSlide.clone();
          newPage.appendChild(contactClone);
          contactClone.name = `${slideNum}`;
          contactClone.x = 0;
          contactClone.y = y;
          //console.log(contactSlides);

          yieldToFigma();

          figma.ui.postMessage({
            type: "presentationCreated",
            data: newPage.name
          });
          
          await figma.setCurrentPageAsync(newPage);


        } catch (err) {
          //console.error(err);
          figma.ui.postMessage({
            type: "showError",
            err
          });
        }
        break;
      }
    case "deleteKP" : {
      const page = figma.root.children.find(p => p.name === "Assets");
      const kpFrames = page.findAll(
        node =>
          node.type === "FRAME" &&
          /^(MaaSKP|KP)\d+$/.test(node.name)
      );
      for (const frame of kpFrames) {
        frame.remove()
        yieldToFigma();
      }
      
      figma.notify("Старые КП удалены");
      break;
    }
    case "deleteOld" : {
      const newRegex = new RegExp("^[A-Za-zА-Яа-яЁё]+ \\d{2}:\\d{2} \\d{2}\\.\\d{2}\\.\\d{4}$");;
      const pagesToRemove = figma.root.children.filter(page => newRegex.test(page.name));
      if (pagesToRemove.length === 0) {
        //figma.notify('Страницы с названием "Презентация" не найдены');
        return;
      }
      const currentPage = figma.currentPage;
      if (pagesToRemove.includes(currentPage)) {
        const anotherPage = figma.root.children.find(
          page => !pagesToRemove.includes(page)
        );
        if (!anotherPage) {
          figma.notify("Нельзя удалить все страницы документа");
          return;
        }
        await figma.setCurrentPageAsync(anotherPage);
        yieldToFigma();
      }
      for (let page of pagesToRemove) {
        page.remove();
        yieldToFigma();
      }
      figma.notify("Старые презентации удалены");
      break;
    }
    case "getImages" : {
      const pagename = msg.data;
      const page = figma.root.children.find(n => n.name === pagename);
      if (!page) {
        figma.ui.postMessage({
          type:"showError",
          data: "Нет страницы с презентацией"
        });
        return;        
      }
      let images = [];
      for (const frame of page.children) {
        if (frame.type === "FRAME") {
          const png = await frame.exportAsync({ format: "PNG", scale: 1 });
          images.push({ name: frame.name, bytes: png });
        }
        yieldToFigma();
      }

      figma.ui.postMessage({ type: "imagesReady", data: {images:images, name:pagename } });
      break;
    }
    case "getOldPresentations": {
      const oldSlides = await loadOldSlides();
      figma.ui.postMessage({ type: "showOldPresentations", data: JSON.stringify(oldSlides) });

      break;
    }
    case "thatsAll": {
      figma.closePlugin();
      break;
    }
    default: {
      figma.notify("Ничего не произошло");
    }

  }
};
