
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
          console.log(data);

          let newPage = figma.createPage();
          let curDate = new Date();
          newPage.name = String(`${data['client']} ${String(curDate.getDate()).padStart(2, '0')}.${String(curDate.getMonth()+1).padStart(2, '0')}.${curDate.getFullYear()}`);

          if (!data['slides']) {
            figma.notify("Пустая презентация");
            throw new Error("Empty presentation");
          };

          //ссылка

          const text = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });

          text.characters = "Ссылка на расчёты";
          text.setRangeHyperlink(0, text.characters.length, {
            type: "URL",
            value: data['link']
          });
          text.fills = [{type: "SOLID", color: { r: 1, g: 1, b: 1 }}];
          text.fontSize = 120;
          newPage.appendChild(text);
          text.x = 0;
          text.y = 0;


          // слайды из презентации
          let slideNum = 1;
          let y = 250;
          
          //console.log("Копирование базовой презентации1");
          for (const slideID of data['slides']) {
            const slideTarget = await findSlide(slideID);
            if (!slideTarget) {
              figma.notify("Нет слайда");
              throw new Error(`No slide for ${slideID}`);
            }
            const slideClone = slideTarget.clone();
            slideClone.name = `${String(slideNum).padStart(3, '0')}`;
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
              productSlideClone.name = `${String(slideNum).padStart(3, '0')}`;
              productSlideClone.x = 0;
              productSlideClone.y = y;
              y += productSlideClone.height + 60;
              slideNum+=1;      
            }
            yieldToFigma();
          }

          switch (data['KPtype']) {
            case "both": {
            // слайд с кп
              let KPframe = await createKPSlide(data['products']);
              const KPclone = KPframe.clone();
              newPage.appendChild(KPclone);
              KPclone.name = `${String(slideNum).padStart(3, '0')}`;
              KPclone.x = 0;
              KPclone.y = y;

              y += KPclone.height + 60;
              slideNum+=1;
              yieldToFigma();

              const operationalCostsclone = await createOperationalCostsSlide(data["operationalCosts"]);
              newPage.appendChild(operationalCostsclone);
              operationalCostsclone.name = `${String(slideNum).padStart(3, '0')}`;
              operationalCostsclone.x = 0;
              operationalCostsclone.y = y;

              y += operationalCostsclone.height + 60;
              slideNum+=1;

              yieldToFigma();

              const rentalClone = await createRentalSlide(data['MaaSinfo']);
              newPage.appendChild(rentalClone);
              rentalClone.name = `${String(slideNum).padStart(3, '0')}`;
              rentalClone.x = 0;
              rentalClone.y = y;

              y += rentalClone.height + 60;
              slideNum+=1;

              yieldToFigma();

              const MaaSclone = getMaaSpage().clone();
              newPage.appendChild(MaaSclone);
              MaaSclone.name = `${String(slideNum).padStart(3, '0')}`;
              MaaSclone.x = 0;
              MaaSclone.y = y;

              y += MaaSclone.height + 60;
              slideNum+=1;

              yieldToFigma();

              break;
            }

            case "sell":
            case "maas":
            {
              let KPframe = await createKPSlide(data['products'], data['KPtype']);
              console.log(KPframe);
              const KPclone = KPframe.clone();
              newPage.appendChild(KPclone);
              KPclone.name = `${String(slideNum).padStart(3, '0')}`;
              KPclone.x = 0;
              KPclone.y = y;

              y += KPclone.height + 60;
              slideNum+=1;
              yieldToFigma();
              break;
            }
          }
          // слайд с контактами
          const contactSlides = getContactSlides();
          const contactSlide = contactSlides.children.find(node => node.name === data['creator']);
          if (!contactSlide) {
            throw new Error("No contact slide");
          }
          const contactClone = contactSlide.clone();
          newPage.appendChild(contactClone);
          contactClone.name = `${String(slideNum).padStart(3, '0')}`;
          contactClone.x = 0;
          contactClone.y = y;
          //console.log(contactSlides);

          yieldToFigma();

          figma.ui.postMessage({
            type: "presentationCreated",
            data: newPage.name
          });
          
          await figma.setCurrentPageAsync(newPage);
          const todate = newPage.findOne(n => n.type === "TEXT" && n.name === "to_date_cover");
          if (todate != null) {
            await figma.loadFontAsync(todate.fontName);
            await yieldToFigma();
            const months = [
              'января', 'февраля', 'марта', 'апреля',
              'мая', 'июня', 'июля', 'августа',
              'сентября', 'октября', 'ноября', 'декабря'
            ];
            todate.characters = `${curDate.getDate()} ${months[curDate.getMonth()]} ${curDate.getFullYear()} г.`;
          }
          const date_till = newPage.findOne(n => n.type === "TEXT" && n.name === "to_date");   
          if (date_till != null) {
            const now = new Date();
            now.setDate(now.getDate() + 14);

            const day = now.getDate();
            const month = now.getMonth();

            const months = [ "янв", "февр", "март", "апр", "май", "июнь", "июль", "авг", "сент", "окт", "нояб", "дек"];

            await figma.loadFontAsync(date_till.fontName);
            await yieldToFigma();
            date_till.characters = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} г.`;
          }

        } catch (err) {
          console.error(err);
          const currentPage = figma.currentPage;
          let tmp = currentPage.find(node => node.name ==  "");
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
      const newRegex = new RegExp("^[A-Za-zА-Яа-яЁё]+ \\d{2}\\.\\d{2}\\.\\d{4}$");;
      const pagesToRemove = figma.root.children.filter(page => (page.name != "Assets" & page.name != "Presentations"));
      if (pagesToRemove.length === 0) {
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
      const frames = page.children
        .filter(node => node.type === "FRAME");

      frames.sort((a, b) => {
        const numA = parseInt(a.name, 10);
        const numB = parseInt(b.name, 10);
        return numA - numB;
      });
      let images = [];
      for (const frame of frames) {

        const png = await frame.exportAsync({ format: "JPG", scale: 1 });
        images.push({ name: frame.name, bytes: png });

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
